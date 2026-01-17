"""Assessment API routes for MCQ generation and open-ended question evaluation."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
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
    OpenEndedQuestionListResponse,
    OpenEndedEvaluationRequest,
    OpenEndedEvaluationResponse,
    EvaluationDetails,
    FindMistakeRequest,
    FindMistakeResponse,
    FindMistakeListResponse,
    CaseBasedRequest,
    CaseBasedResponse,
    CaseBasedListResponse,
    CaseBasedQuestion,
)
from app.utils.dependencies import get_current_user
from app.services.assessment.mcq_generator import generate_mcq
from app.services.assessment.open_ended_evaluator import (
    generate_open_ended_question,
    evaluate_open_ended_answer,
)
from app.services.assessment.find_mistake_generator import generate_find_mistake
from app.services.assessment.case_based_generator import generate_case_based

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["assessment"])


async def validate_document_ids(
    course_uuid: uuid.UUID,
    document_ids: Optional[List[str]],
    db: AsyncSession,
) -> List[uuid.UUID]:
    """
    Validate that document_ids belong to the course and are processed/ready.
    
    Args:
        course_uuid: UUID of the course
        document_ids: Optional list of document ID strings
        db: Database session
        
    Returns:
        List of valid document UUIDs
        
    Raises:
        ValueError: If no valid documents found or documents not processed
    """
    if not document_ids:
        # If no document_ids provided, get all processed documents for the course
        result = await db.execute(
            select(Document)
            .where(Document.course_id == course_uuid)
            .where(Document.processing_status == "completed")
        )
        documents = result.scalars().all()
        if not documents:
            raise ValueError("No processed documents found for this course. Please upload and process documents first.")
        return [doc.id for doc in documents]
    
    # Validate provided document_ids
    valid_uuids = []
    for doc_id_str in document_ids:
        try:
            doc_uuid = uuid.UUID(doc_id_str)
            valid_uuids.append(doc_uuid)
        except ValueError:
            logger.warning(f"Invalid document_id format: {doc_id_str}")
            continue
    
    if not valid_uuids:
        raise ValueError("No valid document IDs provided. Please provide valid document IDs.")
    
    # Check documents belong to course and are processed
    result = await db.execute(
        select(Document)
        .where(Document.id.in_(valid_uuids))
        .where(Document.course_id == course_uuid)
        .where(Document.processing_status == "completed")
    )
    valid_documents = result.scalars().all()
    valid_doc_ids = {doc.id for doc in valid_documents}
    
    # Check if all requested documents are valid
    missing_ids = [str(doc_id) for doc_id in valid_uuids if doc_id not in valid_doc_ids]
    if missing_ids:
        raise ValueError(
            f"The following document IDs do not belong to this course or are not processed: {', '.join(missing_ids)}"
        )
    
    if not valid_doc_ids:
        raise ValueError("No valid processed documents found. Please ensure documents belong to this course and are processed.")
    
    return list(valid_doc_ids)


@router.get("/assessments/test-api")
async def test_api_status(
    current_user: User = Depends(get_current_user),
):
    """
    Test endpoint to check Gemini API status and quota.
    Returns API connection status and any errors.
    """
    try:
        from app.services.integrations.gemini_client import get_gemini_client
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
            document_ids=request.document_ids,
            difficulty=request.difficulty,
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
    response_model=OpenEndedQuestionListResponse,
)
async def generate_open_ended_question_endpoint(
    course_id: str,
    request: OpenEndedQuestionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate open-ended questions based on course materials."""
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
        # Generate questions
        questions_data = await generate_open_ended_question(
            course_id=str(course_uuid),
            topic=request.topic,
            num_questions=request.num_questions if request.num_questions else 1,
            document_ids=request.document_ids,
            difficulty=request.difficulty,
        )

        # Ensure questions_data is a list
        if not isinstance(questions_data, list):
            questions_data = [questions_data]

        # Fetch document names from all questions
        document_ids = set()
        for question_data in questions_data:
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

        # Format questions with source references
        formatted_questions = []
        for question_data in questions_data:
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

            formatted_questions.append(
                OpenEndedQuestionResponse(
                    question=question_data.get("question", ""),
                    source_references=source_refs,
                )
            )

        return OpenEndedQuestionListResponse(questions=formatted_questions)

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


@router.post(
    "/courses/{course_id}/assessments/find-mistake/generate",
    response_model=FindMistakeListResponse,
)
async def generate_find_mistake_endpoint(
    course_id: str,
    request: FindMistakeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate 'find the mistake' assessment items based on course materials."""
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

    # Validate and enforce num_questions cap
    num_questions = min(request.num_questions, 50)
    if num_questions < 1:
        num_questions = 1

    # Validate document_ids
    try:
        valid_doc_ids = await validate_document_ids(course_uuid, request.document_ids, db)
        document_ids_str = [str(doc_id) for doc_id in valid_doc_ids] if request.document_ids else None
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )

    try:
        # Generate find_mistake items
        items_data = await generate_find_mistake(
            course_id=str(course_uuid),
            num_questions=num_questions,
            document_ids=document_ids_str,
            difficulty=request.difficulty or "medium",
        )

        # Fetch document names
        document_ids = set()
        for item_data in items_data:
            for ref in item_data.get("sources", []):
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

        # Format items with source references
        formatted_items = []
        for item_data in items_data:
            source_refs = [
                SourceReference(
                    document_id=ref.get("document_id", ""),
                    document_name=document_map.get(
                        ref.get("document_id", ""), ref.get("document_name", "Unknown Document")
                    ),
                    page=ref.get("page", 0),
                )
                for ref in item_data.get("sources", [])
            ]

            formatted_items.append(
                FindMistakeResponse(
                    type=item_data.get("type", "find_mistake"),
                    id=item_data.get("id", ""),
                    prompt=item_data.get("prompt", ""),
                    incorrect_solution=item_data.get("incorrect_solution", ""),
                    expected_correction=item_data.get("expected_correction", ""),
                    explanation=item_data.get("explanation", ""),
                    sources=source_refs,
                )
            )

        return FindMistakeListResponse(items=formatted_items)

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
            logger.error(f"Error generating find_mistake assessment: {error_msg}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error_msg,
            )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error generating find_mistake assessment: {error_msg}", exc_info=True)
        logger.error(f"Exception type: {type(e).__name__}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate find_mistake assessment: {error_msg}",
        )


@router.post(
    "/courses/{course_id}/assessments/case-based/generate",
    response_model=CaseBasedListResponse,
)
async def generate_case_based_endpoint(
    course_id: str,
    request: CaseBasedRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate case-based assessment bundles based on course materials."""
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

    # Validate and enforce num_questions cap
    num_questions = min(request.num_questions, 50)
    if num_questions < 1:
        num_questions = 1

    # Validate document_ids
    try:
        valid_doc_ids = await validate_document_ids(course_uuid, request.document_ids, db)
        document_ids_str = [str(doc_id) for doc_id in valid_doc_ids] if request.document_ids else None
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )

    try:
        # Generate case-based assessments
        cases_data = await generate_case_based(
            course_id=str(course_uuid),
            num_questions=num_questions,
            document_ids=document_ids_str,
            difficulty=request.difficulty or "medium",
        )

        # Fetch document names from all cases and questions
        document_ids = set()
        for case_data in cases_data:
            for ref in case_data.get("sources", []):
                doc_id = ref.get("document_id", "")
                if doc_id:
                    document_ids.add(doc_id)
            # Also check question-level sources
            for question in case_data.get("questions", []):
                for ref in question.get("sources", []):
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

        # Format cases with source references
        formatted_cases = []
        for case_data in cases_data:
            # Format case-level sources
            case_source_refs = [
                SourceReference(
                    document_id=ref.get("document_id", ""),
                    document_name=document_map.get(
                        ref.get("document_id", ""), ref.get("document_name", "Unknown Document")
                    ),
                    page=ref.get("page", 0),
                )
                for ref in case_data.get("sources", [])
            ]

            # Format questions
            formatted_questions = []
            for question_data in case_data.get("questions", []):
                question_kind = question_data.get("kind", "")
                
                # Format question-level sources
                question_source_refs = [
                    SourceReference(
                        document_id=ref.get("document_id", ""),
                        document_name=document_map.get(
                            ref.get("document_id", ""), ref.get("document_name", "Unknown Document")
                        ),
                        page=ref.get("page", 0),
                    )
                    for ref in question_data.get("sources", [])
                ]

                if question_kind == "mcq":
                    formatted_questions.append(
                        CaseBasedQuestion(
                            kind="mcq",
                            question=question_data.get("question", ""),
                            options=question_data.get("options", []),
                            answer_index=question_data.get("answer_index", 0),
                            hint=question_data.get("hint", ""),
                            sources=question_source_refs,
                        )
                    )
                elif question_kind == "open_ended":
                    formatted_questions.append(
                        CaseBasedQuestion(
                            kind="open_ended",
                            question=question_data.get("question", ""),
                            expected_answer=question_data.get("expected_answer", ""),
                            rubric=question_data.get("rubric", []),
                            sources=question_source_refs,
                        )
                    )

            formatted_cases.append(
                CaseBasedResponse(
                    type=case_data.get("type", "case_based"),
                    id=case_data.get("id", ""),
                    case_title=case_data.get("case_title", ""),
                    case_description=case_data.get("case_description", ""),
                    questions=formatted_questions,
                    sources=case_source_refs,
                )
            )

        return CaseBasedListResponse(cases=formatted_cases)

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
            logger.error(f"Error generating case_based assessment: {error_msg}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error_msg,
            )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error generating case_based assessment: {error_msg}", exc_info=True)
        logger.error(f"Exception type: {type(e).__name__}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate case_based assessment: {error_msg}",
        )
