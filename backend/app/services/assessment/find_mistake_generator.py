"""
Find Mistake Assessment Generator service.
Generates "find the mistake" assessment items based on course materials.
"""

from typing import Dict, List, Optional
import asyncio
import logging
import json
import uuid

from google import genai
from google.genai import types
from google.genai.errors import ClientError

from app.services.integrations.embeddings import create_embedding
from app.services.integrations.pinecone_store import query_vectors
from app.services.integrations.gemini_client import get_gemini_client
from app.config.ai import ai_config
from app.config.services import service_config
from app.services.assessment.prompts import FIND_MISTAKE_GENERATION_PROMPT

logger = logging.getLogger(__name__)

_GEMINI_CLIENT = get_gemini_client()


async def generate_find_mistake(
    course_id: str,
    num_questions: int = 1,
    document_ids: Optional[List[str]] = None,
    difficulty: Optional[str] = "medium",
) -> List[Dict]:
    """
    Generate "find the mistake" assessment items based on course materials.

    Args:
        course_id: UUID of the course
        num_questions: Number of items to generate (default: 1, max: 50)
        document_ids: Optional list of document IDs to limit generation to
        difficulty: Optional difficulty level ('easy', 'medium', 'hard', default: 'medium')

    Returns:
        List of dictionaries, each with find_mistake assessment item data
    """
    try:
        # Build query for retrieval
        query = "Generate find the mistake assessments about key concepts and common errors in this course material"

        # 1. Embed query
        query_embedding = await create_embedding(query)

        # 2. Retrieve relevant chunks
        top_k = service_config.RAG_TOP_K * 2
        matches = await query_vectors(
            vector=query_embedding,
            course_id=course_id,
            top_k=top_k,
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
                difficulty_instruction = "- Difficulty: EASY - Focus on basic mistakes in fundamental concepts\n"
            elif difficulty_lower == "medium":
                difficulty_instruction = "- Difficulty: MEDIUM - Require identifying mistakes in applied concepts\n"
            elif difficulty_lower == "hard":
                difficulty_instruction = "- Difficulty: HARD - Require identifying subtle mistakes in complex reasoning\n"

        # Log for observability
        docs_count = len(set(s.get("document_id", "") for s in sources if s.get("document_id")))
        logger.info(
            f"Generating find_mistake assessment: course_id={course_id}, "
            f"num_questions={num_questions}, difficulty={difficulty}, "
            f"docs_count={docs_count}, retrieval_top_k={top_k}"
        )

        # 5. Generate items
        items = []
        for i in range(num_questions):
            prompt = FIND_MISTAKE_GENERATION_PROMPT.format(
                context_str=context,
                difficulty_instruction=difficulty_instruction,
            )
            
            # Generate answer using Gemini
            loop = asyncio.get_running_loop()
            try:
                response_text = await asyncio.wait_for(
                    loop.run_in_executor(None, _generate_content_sync, prompt),
                    timeout=30.0
                )
            except asyncio.TimeoutError:
                logger.error("Find mistake generation timed out after 30 seconds")
                raise RuntimeError("Find mistake generation timed out. Please try again.")

            # Parse JSON response
            try:
                item_data = _parse_json_response(response_text)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse find_mistake JSON: {e}")
                logger.error(f"Response text: {response_text[:500]}")
                raise ValueError("Failed to generate valid find_mistake item. Please try again.")

            # Ensure ID is present
            if "id" not in item_data:
                item_data["id"] = str(uuid.uuid4())

            # Add source references from retrieved chunks
            item_data["sources"] = _extract_source_references(sources)
            item_data["type"] = "find_mistake"
            
            items.append(item_data)

        return items

    except Exception as e:
        logger.exception("Find mistake generation failed")
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
            raise RuntimeError(f"Failed to generate find_mistake assessment: {e}") from e


def _generate_content_sync(prompt: str) -> str:
    """
    Blocking Gemini call for content generation.
    Must be run in a thread executor.
    Tries JSON response first, falls back to text if JSON not supported.
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

