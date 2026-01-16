"""
Open-Ended Question Evaluation service.
Generates open-ended questions and evaluates student answers.
"""

from typing import Dict, List, Optional
import asyncio
import logging
import json

from google import genai
from google.genai import types
from google.genai.errors import ClientError

from app.services.integrations.embeddings import create_embedding
from app.services.integrations.pinecone_store import query_vectors
from app.services.integrations.gemini_client import get_gemini_client
from app.config.ai import ai_config
from app.config.services import service_config
from app.services.assessment.prompts import (
    OPEN_ENDED_QUESTION_GENERATION_PROMPT,
    OPEN_ENDED_EVALUATION_PROMPT,
)

logger = logging.getLogger(__name__)

_GEMINI_CLIENT = get_gemini_client()


async def generate_open_ended_question(
    course_id: str,
    topic: str = None,
) -> Dict:
    """
    Generate an open-ended question based on course materials.

    Args:
        course_id: UUID of the course
        topic: Optional topic to focus on (if None, generates from general course material)

    Returns:
        Dictionary with question and source references
    """
    try:
        # Build query for retrieval
        if topic:
            query = f"Generate questions about: {topic}"
        else:
            query = "Generate questions about key concepts in this course material"

        # 1. Embed query
        query_embedding = await create_embedding(query)

        # 2. Retrieve relevant chunks
        matches = await query_vectors(
            vector=query_embedding,
            course_id=course_id,
            top_k=service_config.RAG_TOP_K * 2,  # Get more context
        )

        if not matches:
            raise ValueError("No course material found for this course. Please upload documents first.")

        # 3. Build context
        sources = _format_sources(matches)
        context = "\n\n".join(
            f"[Page {s['page']}]\n{s['text']}"
            for s in sources
        )

        # 4. Generate question
        prompt = OPEN_ENDED_QUESTION_GENERATION_PROMPT.format(context_str=context)

        loop = asyncio.get_running_loop()
        try:
            response_text = await asyncio.wait_for(
                loop.run_in_executor(None, _generate_content_sync, prompt),
                timeout=30.0
            )
        except asyncio.TimeoutError:
            logger.error("Question generation timed out after 30 seconds")
            raise RuntimeError("Question generation timed out. Please try again.")

        # Parse JSON response
        try:
            question_data = _parse_json_response(response_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse question JSON: {e}")
            logger.error(f"Response text: {response_text[:500]}")
            raise ValueError("Failed to generate valid question. Please try again.")

        # Add source references from retrieved chunks
        question_data["source_references"] = _extract_source_references(sources)

        return question_data

    except Exception as e:
        logger.exception("Open-ended question generation failed")
        # Check for specific API errors
        error_str = str(e).lower()
        if "quota" in error_str or "rate limit" in error_str or "429" in error_str:
            raise RuntimeError(
                "API quota or rate limit exceeded. Please check your Gemini API quota or try again later."
            ) from e
        elif "403" in error_str or "forbidden" in error_str:
            raise RuntimeError(
                "API access forbidden. Please check your Gemini API key and permissions."
            ) from e
        elif "401" in error_str or "unauthorized" in error_str:
            raise RuntimeError(
                "API authentication failed. Please check your Gemini API key."
            ) from e
        else:
            raise RuntimeError(f"Failed to generate question: {e}") from e


async def evaluate_open_ended_answer(
    course_id: str,
    question: str,
    student_answer: str,
) -> Dict:
    """
    Evaluate a student's answer to an open-ended question.

    Args:
        course_id: UUID of the course
        question: The open-ended question
        student_answer: The student's answer to evaluate

    Returns:
        Dictionary with reference answer, evaluation, feedback, and source references
    """
    try:
        # 1. Embed question for retrieval
        query_embedding = await create_embedding(question)

        # 2. Retrieve relevant chunks
        matches = await query_vectors(
            vector=query_embedding,
            course_id=course_id,
            top_k=service_config.RAG_TOP_K * 2,  # Get more context for evaluation
        )

        if not matches:
            raise ValueError("No course material found for this course. Please upload documents first.")

        # 3. Build context
        sources = _format_sources(matches)
        context = "\n\n".join(
            f"[Page {s['page']}]\n{s['text']}"
            for s in sources
        )

        # 4. Generate evaluation
        prompt = OPEN_ENDED_EVALUATION_PROMPT.format(
            context_str=context,
            question=question,
            student_answer=student_answer,
        )

        loop = asyncio.get_running_loop()
        try:
            response_text = await asyncio.wait_for(
                loop.run_in_executor(None, _generate_content_sync, prompt),
                timeout=30.0
            )
        except asyncio.TimeoutError:
            logger.error("Answer evaluation timed out after 30 seconds")
            raise RuntimeError("Answer evaluation timed out. Please try again.")

        # Parse JSON response
        try:
            evaluation_data = _parse_json_response(response_text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse evaluation JSON: {e}")
            logger.error(f"Response text: {response_text[:500]}")
            raise ValueError("Failed to generate valid evaluation. Please try again.")

        # Add source references from retrieved chunks
        evaluation_data["source_references"] = _extract_source_references(sources)

        return evaluation_data

    except Exception as e:
        logger.exception("Open-ended answer evaluation failed")
        # Check for specific API errors
        error_str = str(e).lower()
        if "quota" in error_str or "rate limit" in error_str or "429" in error_str:
            raise RuntimeError(
                "API quota or rate limit exceeded. Please check your Gemini API quota or try again later."
            ) from e
        elif "403" in error_str or "forbidden" in error_str:
            raise RuntimeError(
                "API access forbidden. Please check your Gemini API key and permissions."
            ) from e
        elif "401" in error_str or "unauthorized" in error_str:
            raise RuntimeError(
                "API authentication failed. Please check your Gemini API key."
            ) from e
        else:
            raise RuntimeError(f"Failed to evaluate answer: {e}") from e


def _generate_content_sync(prompt: str) -> str:
    """
    Blocking Gemini call for content generation.
    Must be run in a thread executor.
    Tries JSON response first, falls back to text if JSON not supported.
    Uses same model selection logic as RAG service.
    """
    model = ai_config.GEMINI_MODEL
    
    # Try with JSON first
    try:
        response = _GEMINI_CLIENT.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=service_config.RAG_MAX_TOKENS,
                response_mime_type="application/json",
            ),
        )
        if not response.text:
            raise ValueError("Empty response from model")
        return response.text
    except (ClientError, ValueError) as e:
        error_details = str(e)
        if hasattr(e, 'status_code'):
            error_details += f" (Status: {e.status_code})"
        logger.debug(f"Model {model} failed with JSON mode: {error_details}")
        
        # Try without JSON
        try:
            response = _GEMINI_CLIENT.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    max_output_tokens=service_config.RAG_MAX_TOKENS,
                ),
            )
            if not response.text:
                raise ValueError("Empty response from model")
            return response.text
        except (ClientError, ValueError) as e2:
            logger.error(f"Model {model} failed: {e2}")
            raise


def _format_sources(matches: List[dict]) -> List[dict]:
    """Format sources from vector matches."""
    return [
        {
            "text": m["text"],
            "page": m["page"],
            "chunk_id": m["chunk_id"],
            "similarity": m["similarity"],
            "document_id": m.get("document_id", ""),
        }
        for m in matches
    ]


def _parse_json_response(response_text: str) -> Dict:
    """Parse JSON response, handling potential markdown code blocks."""
    # Remove markdown code blocks if present
    text = response_text.strip()
    if text.startswith("```json"):
        text = text[7:]  # Remove ```json
    elif text.startswith("```"):
        text = text[3:]  # Remove ```
    if text.endswith("```"):
        text = text[:-3]  # Remove closing ```
    
    text = text.strip()
    return json.loads(text)


def _extract_source_references(sources: List[dict]) -> List[dict]:
    """Extract unique source references from retrieved chunks."""
    # Group by document_id and page
    seen = set()
    references = []
    
    for source in sources:
        doc_id = source.get("document_id", "")
        page = source.get("page", 0)
        key = (doc_id, page)
        
        if key not in seen and doc_id:
            seen.add(key)
            references.append({
                "document_id": doc_id,
                "document_name": source.get("document_name", "Unknown Document"),
                "page": page,
            })
    
    return references

