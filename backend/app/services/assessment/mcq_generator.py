"""
Multiple Choice Question (MCQ) Generator service.
Generates MCQs based on course materials with structured output.
"""

from typing import Dict, List, Optional
import asyncio
import logging
import json

from google import genai
from google.genai import types
from google.genai.errors import ClientError, ServerError

from app.services.integrations.embeddings import create_embedding
from app.services.integrations.pinecone_store import query_vectors
from app.services.integrations.gemini_client import get_gemini_client
from app.config.ai import ai_config
from app.config.services import service_config
from app.services.assessment.prompts import MCQ_GENERATION_PROMPT

logger = logging.getLogger(__name__)

_GEMINI_CLIENT = get_gemini_client()


async def generate_mcq(
    course_id: str,
    topic: str = None,
    num_questions: int = 1,
    document_ids: Optional[List[str]] = None,
    difficulty: Optional[str] = None,
) -> List[Dict]:
    """
    Generate multiple-choice questions based on course materials.

    Args:
        course_id: UUID of the course
        topic: Optional topic to focus on (if None, generates from general course material)
        num_questions: Number of MCQs to generate (default: 1)
        document_ids: Optional list of document IDs to limit question generation to
        difficulty: Optional difficulty level ('easy', 'medium', 'hard')

    Returns:
        List of MCQ dictionaries with question, options, hint, and source references
    """
    try:
        # Build query for retrieval
        if topic:
            query = f"Generate questions about: {topic}"
        else:
            query = "Generate questions about key concepts in this course material"

        # 1. Embed query
        query_embedding = await create_embedding(query)

        # 2. Retrieve relevant chunks (get more chunks for better context)
        matches = await query_vectors(
            vector=query_embedding,
            course_id=course_id,
            top_k=service_config.RAG_TOP_K * 2,  # Get more context for question generation
            document_ids=document_ids,
        )

        if not matches:
            if document_ids:
                raise ValueError("No course material found in the selected documents. Please ensure documents are processed and contain content.")
            else:
                raise ValueError("No course material found for this course. Please upload documents first.")

        # 3. Build context
        sources = _format_sources(matches)
        context = "\n\n".join(
            f"[Page {s['page']}]\n{s['text']}"
            for s in sources
        )

        # 4. Build difficulty instruction
        difficulty_instruction = ""
        if difficulty:
            difficulty_lower = difficulty.lower()
            if difficulty_lower == "easy":
                difficulty_instruction = "- Difficulty: EASY - Focus on basic recall and understanding of fundamental concepts\n"
            elif difficulty_lower == "medium":
                difficulty_instruction = "- Difficulty: MEDIUM - Require application and analysis of concepts\n"
            elif difficulty_lower == "hard":
                difficulty_instruction = "- Difficulty: HARD - Require synthesis, evaluation, and critical thinking\n"

        # 5. Generate MCQs
        mcqs = []
        for i in range(num_questions):
            prompt = MCQ_GENERATION_PROMPT.format(
                context_str=context,
                difficulty_instruction=difficulty_instruction,
            )
            
            # Generate answer using Gemini
            loop = asyncio.get_running_loop()
            try:
                response_text = await asyncio.wait_for(
                    loop.run_in_executor(None, _generate_mcq_sync, prompt),
                    timeout=30.0
                )
            except asyncio.TimeoutError:
                logger.error("MCQ generation timed out after 30 seconds")
                raise RuntimeError("MCQ generation timed out. Please try again.")

            # Parse JSON response
            try:
                mcq_data = _parse_json_response(response_text)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse MCQ JSON: {e}")
                logger.error(f"Response text: {response_text[:500]}")
                raise ValueError("Failed to generate valid MCQ. Please try again.")

            # Add source references from retrieved chunks
            mcq_data["source_references"] = _extract_source_references(sources)
            
            mcqs.append(mcq_data)

        return mcqs

    except ServerError as e:
        # Handle server-side errors (503, 500, etc.)
        error_str = str(e).lower()
        status_code = getattr(e, 'status_code', None)
        
        if status_code == 503 or "overloaded" in error_str or "unavailable" in error_str:
            logger.warning(f"Gemini API is overloaded (503): {e}")
            raise RuntimeError(
                "The AI model service is temporarily overloaded. Please wait a moment and try again."
            ) from e
        elif status_code == 500:
            logger.error(f"Gemini API server error (500): {e}")
            raise RuntimeError(
                "The AI service encountered an internal error. Please try again in a few moments."
            ) from e
        else:
            logger.error(f"Gemini API server error ({status_code}): {e}")
            raise RuntimeError(
                f"The AI service is experiencing issues. Please try again later. Error: {str(e)}"
            ) from e
    except ClientError as e:
        # Handle client-side errors (400, 401, 403, 429, etc.)
        error_str = str(e).lower()
        status_code = getattr(e, 'status_code', None)
        
        if "quota" in error_str or "rate limit" in error_str or status_code == 429:
            raise RuntimeError(
                "API quota or rate limit exceeded. Please check your Gemini API quota or try again later."
            ) from e
        elif status_code == 403 or "forbidden" in error_str:
            raise RuntimeError(
                "API access forbidden. Please check your Gemini API key and permissions."
            ) from e
        elif status_code == 401 or "unauthorized" in error_str:
            raise RuntimeError(
                "API authentication failed. Please check your Gemini API key."
            ) from e
        else:
            logger.error(f"Gemini API client error ({status_code}): {e}")
            raise RuntimeError(f"Failed to generate MCQ: {e}") from e
    except Exception as e:
        logger.exception("MCQ generation failed")
        # Check for specific API errors in string representation
        error_str = str(e).lower()
        if "quota" in error_str or "rate limit" in error_str or "429" in error_str:
            raise RuntimeError(
                "API quota or rate limit exceeded. Please check your Gemini API quota or try again later."
            ) from e
        elif "503" in error_str or "overloaded" in error_str or "unavailable" in error_str:
            raise RuntimeError(
                "The AI model service is temporarily overloaded. Please wait a moment and try again."
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
            raise RuntimeError(f"Failed to generate MCQ: {e}") from e


def _generate_mcq_sync(prompt: str) -> str:
    """
    Blocking Gemini call for MCQ generation.
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
    except (ClientError, ServerError, ValueError) as e:
        error_details = str(e)
        status_code = getattr(e, 'status_code', None)
        if status_code:
            error_details += f" (Status: {status_code})"
        logger.debug(f"Model {model} failed with JSON mode: {error_details}")
        
        # Don't retry without JSON for server errors (503, 500) - they'll fail again
        if isinstance(e, ServerError) and status_code in (503, 500):
            raise
        
        # Try without JSON for client errors
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
        except (ClientError, ServerError, ValueError) as e2:
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

