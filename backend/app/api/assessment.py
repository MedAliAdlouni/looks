"""Assessment API routes for MCQ generation and open-ended question evaluation."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid
import logging

from app.db import get_db
from app.models.user import User
from app.models.course import Course
from app.models.document import Document
from app.schemas.assessment import (
    MCQRequest,
    MCQResponse,
    MCQListResponse,
    MCQOption,
    SourceReference,
    OpenEndedQuestionRequest,
    OpenEndedQuestionResponse,
    OpenEndedEvaluationRequest,
    OpenEndedEvaluationResponse,
    EvaluationDetails,
)
from app.utils.dependencies import get_current_user
from app.services.assessment.mcq_generator import generate_mcq
from app.services.assessment.open_ended_evaluator import (
    generate_open_ended_question,
    evaluate_open_ended_answer,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["assessment"])


@router.get("/assessments/test-api")
async def test_api_status(
    current_user: User = Depends(get_current_user),
):
    """
    Test endpoint to check Gemini API status and quota.
    Returns API connection status and any errors.
    """
    try:
        from app.services.rag_service import get_gemini_client
        from google.genai import types
        from google.genai.errors import ClientError
        
        client = get_gemini_client()
        
        # Try a simple API call
        try:
            response = client.models.generate_content(
                model="gemini-1.5-flash-002",
                contents="Say 'API test successful' in one sentence.",
                config=types.GenerateContentConfig(
                    max_output_tokens=50,
                ),
            )
            
            if response.text:
                return {
                    "status": "success",
                    "message": "API is working correctly",
                    "test_response": response.text[:100],
                }
            else:
                return {
                    "status": "warning",
                    "message": "API responded but returned empty text",
                }
        except ClientError as e:
            error_str = str(e)
            error_lower = error_str.lower()
            
            # Check for specific error types
            if "429" in error_str or "rate limit" in error_lower or "quota" in error_lower:
                return {
                    "status": "error",
                    "message": "API quota or rate limit exceeded",
                    "error": error_str,
                    "suggestion": "Check your Gemini API quota at https://aistudio.google.com/app/apikey",
                }
            elif "403" in error_str or "forbidden" in error_lower:
                return {
                    "status": "error",
                    "message": "API access forbidden",
                    "error": error_str,
                    "suggestion": "Check your API key permissions and billing status",
                }
            elif "401" in error_str or "unauthorized" in error_lower:
                return {
                    "status": "error",
                    "message": "API authentication failed",
                    "error": error_str,
                    "suggestion": "Check your GEMINI_API_KEY in environment variables",
                }
            else:
                return {
                    "status": "error",
                    "message": "API call failed",
                    "error": error_str,
                }
    except Exception as e:
        logger.exception("API test failed")
        return {
            "status": "error",
            "message": "Failed to test API",
            "error": str(e),
        }


@router.post(
    "/courses/{course_id}/assessments/mcq/generate",
    response_model=MCQListResponse,
)
async def generate_mcq_endpoint(
    course_id: str,
    request: MCQRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate multiple-choice questions based on course materials."""
    try:
        course_uuid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid course ID format"
        )

    # Verify course exists and user owns it
    result = await db.execute(select(Course).where(Course.id == course_uuid))
    course = result.scalar_one_or_none()

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    if course.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this course",
        )

    try:
        # Generate MCQs
        mcqs_data = await generate_mcq(
            course_id=str(course_uuid),
            topic=request.topic,
            num_questions=request.num_questions,
        )

        # Fetch document names for all unique document_ids
        document_ids = set()
        for mcq in mcqs_data:
            for ref in mcq.get("source_references", []):
                doc_id = ref.get("document_id", "")
                if doc_id:
                    document_ids.add(doc_id)

        document_map = {}
        if document_ids:
            try:
                valid_uuids = []
                for doc_id in document_ids:
                    try:
                        valid_uuids.append(uuid.UUID(doc_id))
                    except (ValueError, AttributeError):
                        logger.warning(f"Invalid document_id format: {doc_id}")
                        continue

                if valid_uuids:
                    result = await db.execute(
                        select(Document).where(Document.id.in_(valid_uuids))
                    )
                    documents = result.scalars().all()
                    document_map = {str(doc.id): doc.filename for doc in documents}
            except Exception as e:
                logger.warning(f"Error fetching document names: {str(e)}")

        # Format MCQs with proper source references
        formatted_mcqs = []
        for mcq_data in mcqs_data:
            # Format options
            options = [
                MCQOption(
                    id=opt["id"],
                    text=opt["text"],
                    is_correct=opt["is_correct"],
                    justification=opt["justification"],
                )
                for opt in mcq_data.get("options", [])
            ]

            # Format source references
            source_refs = [
                SourceReference(
                    document_id=ref.get("document_id", ""),
                    document_name=document_map.get(
                        ref.get("document_id", ""), ref.get("document_name", "Unknown Document")
                    ),
                    page=ref.get("page", 0),
                )
                for ref in mcq_data.get("source_references", [])
            ]

            formatted_mcqs.append(
                MCQResponse(
                    question=mcq_data.get("question", ""),
                    options=options,
                    hint=mcq_data.get("hint", ""),
                    source_references=source_refs,
                )
            )

        return MCQListResponse(mcqs=formatted_mcqs)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except RuntimeError as e:
        error_msg = str(e)
        # Check if it's a quota/rate limit error
        if "quota" in error_msg.lower() or "rate limit" in error_msg.lower():
            logger.error(f"API quota/rate limit error: {error_msg}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=error_msg,
            )
        else:
            logger.error(f"Error generating MCQs: {error_msg}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error_msg,
            )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error generating MCQs: {error_msg}", exc_info=True)
        # Log full exception details for debugging
        logger.error(f"Exception type: {type(e).__name__}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate MCQs: {error_msg}",
        )


@router.post(
    "/courses/{course_id}/assessments/open-ended/generate",
    response_model=OpenEndedQuestionResponse,
)
async def generate_open_ended_question_endpoint(
    course_id: str,
    request: OpenEndedQuestionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate an open-ended question based on course materials."""
    try:
        course_uuid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid course ID format"
        )

    # Verify course exists and user owns it
    result = await db.execute(select(Course).where(Course.id == course_uuid))
    course = result.scalar_one_or_none()

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    if course.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this course",
        )

    try:
        # Generate question
        question_data = await generate_open_ended_question(
            course_id=str(course_uuid),
            topic=request.topic,
        )

        # Fetch document names
        document_ids = set()
        for ref in question_data.get("source_references", []):
            doc_id = ref.get("document_id", "")
            if doc_id:
                document_ids.add(doc_id)

        document_map = {}
        if document_ids:
            try:
                valid_uuids = []
                for doc_id in document_ids:
                    try:
                        valid_uuids.append(uuid.UUID(doc_id))
                    except (ValueError, AttributeError):
                        logger.warning(f"Invalid document_id format: {doc_id}")
                        continue

                if valid_uuids:
                    result = await db.execute(
                        select(Document).where(Document.id.in_(valid_uuids))
                    )
                    documents = result.scalars().all()
                    document_map = {str(doc.id): doc.filename for doc in documents}
            except Exception as e:
                logger.warning(f"Error fetching document names: {str(e)}")

        # Format source references
        source_refs = [
            SourceReference(
                document_id=ref.get("document_id", ""),
                document_name=document_map.get(
                    ref.get("document_id", ""), ref.get("document_name", "Unknown Document")
                ),
                page=ref.get("page", 0),
            )
            for ref in question_data.get("source_references", [])
        ]

        return OpenEndedQuestionResponse(
            question=question_data.get("question", ""),
            source_references=source_refs,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except RuntimeError as e:
        error_msg = str(e)
        # Check if it's a quota/rate limit error
        if "quota" in error_msg.lower() or "rate limit" in error_msg.lower():
            logger.error(f"API quota/rate limit error: {error_msg}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=error_msg,
            )
        else:
            logger.error(f"Error generating question: {error_msg}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error_msg,
            )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error generating question: {error_msg}", exc_info=True)
        # Log full exception details for debugging
        logger.error(f"Exception type: {type(e).__name__}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate question: {error_msg}",
        )


@router.post(
    "/courses/{course_id}/assessments/open-ended/evaluate",
    response_model=OpenEndedEvaluationResponse,
)
async def evaluate_open_ended_answer_endpoint(
    course_id: str,
    request: OpenEndedEvaluationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Evaluate a student's answer to an open-ended question."""
    try:
        course_uuid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid course ID format"
        )

    # Verify course exists and user owns it
    result = await db.execute(select(Course).where(Course.id == course_uuid))
    course = result.scalar_one_or_none()

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    if course.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this course",
        )

    try:
        # Evaluate answer
        evaluation_data = await evaluate_open_ended_answer(
            course_id=str(course_uuid),
            question=request.question,
            student_answer=request.student_answer,
        )

        # Fetch document names
        document_ids = set()
        for ref in evaluation_data.get("source_references", []):
            doc_id = ref.get("document_id", "")
            if doc_id:
                document_ids.add(doc_id)

        document_map = {}
        if document_ids:
            try:
                valid_uuids = []
                for doc_id in document_ids:
                    try:
                        valid_uuids.append(uuid.UUID(doc_id))
                    except (ValueError, AttributeError):
                        logger.warning(f"Invalid document_id format: {doc_id}")
                        continue

                if valid_uuids:
                    result = await db.execute(
                        select(Document).where(Document.id.in_(valid_uuids))
                    )
                    documents = result.scalars().all()
                    document_map = {str(doc.id): doc.filename for doc in documents}
            except Exception as e:
                logger.warning(f"Error fetching document names: {str(e)}")

        # Format evaluation details
        eval_details = evaluation_data.get("evaluation", {})
        evaluation = EvaluationDetails(
            score_explanation=eval_details.get("score_explanation", ""),
            correct_aspects=eval_details.get("correct_aspects", []),
            missing_aspects=eval_details.get("missing_aspects", []),
            incorrect_aspects=eval_details.get("incorrect_aspects", []),
        )

        # Format source references
        source_refs = [
            SourceReference(
                document_id=ref.get("document_id", ""),
                document_name=document_map.get(
                    ref.get("document_id", ""), ref.get("document_name", "Unknown Document")
                ),
                page=ref.get("page", 0),
            )
            for ref in evaluation_data.get("source_references", [])
        ]

        return OpenEndedEvaluationResponse(
            reference_answer=evaluation_data.get("reference_answer", ""),
            evaluation=evaluation,
            feedback=evaluation_data.get("feedback", ""),
            source_references=source_refs,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except RuntimeError as e:
        error_msg = str(e)
        # Check if it's a quota/rate limit error
        if "quota" in error_msg.lower() or "rate limit" in error_msg.lower():
            logger.error(f"API quota/rate limit error: {error_msg}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=error_msg,
            )
        else:
            logger.error(f"Error evaluating answer: {error_msg}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error_msg,
            )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error evaluating answer: {error_msg}", exc_info=True)
        # Log full exception details for debugging
        logger.error(f"Exception type: {type(e).__name__}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to evaluate answer: {error_msg}",
        )
