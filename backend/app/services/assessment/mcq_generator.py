"""
Multiple Choice Question (MCQ) Generator service.
Generates MCQs based on course materials with structured output.
"""

from typing import Dict, List
import asyncio
import logging
import json

from google import genai
from google.genai import types
from google.genai.errors import ClientError

from app.services.embedding_service import create_embedding
from app.services.vector_service import query_vectors
from app.services.rag_service import get_gemini_client
from app.config.ai import ai_config
from app.config.services import service_config
from app.services.assessment.prompts import MCQ_GENERATION_PROMPT

logger = logging.getLogger(__name__)

_GEMINI_CLIENT = get_gemini_client()


async def generate_mcq(
    course_id: str,
    topic: str = None,
    num_questions: int = 1,
) -> List[Dict]:
    """
    Generate multiple-choice questions based on course materials.

    Args:
        course_id: UUID of the course
        topic: Optional topic to focus on (if None, generates from general course material)
        num_questions: Number of MCQs to generate (default: 1)

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
        )

        if not matches:
            raise ValueError("No course material found for this course. Please upload documents first.")

        # 3. Build context
        sources = _format_sources(matches)
        context = "\n\n".join(
            f"[Page {s['page']}]\n{s['text']}"
            for s in sources
        )

        # 4. Generate MCQs
        mcqs = []
        for i in range(num_questions):
            prompt = MCQ_GENERATION_PROMPT.format(context_str=context)
            
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

    except Exception as e:
        logger.exception("MCQ generation failed")
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
            raise RuntimeError(f"Failed to generate MCQ: {e}") from e


def _generate_mcq_sync(prompt: str) -> str:
    """
    Blocking Gemini call for MCQ generation.
    Must be run in a thread executor.
    Tries JSON response first, falls back to text if JSON not supported.
    Uses same model selection logic as RAG service.
    """
    from app.services.rag_service import _list_available_models
    
    primary_model = ai_config.GEMINI_MODEL
    primary_variants = [primary_model]
    if not primary_model.startswith("models/"):
        primary_variants.append(f"models/{primary_model}")
    else:
        primary_variants.append(primary_model.replace("models/", ""))

    # Try primary model first with JSON, then without
    for variant in primary_variants:
        # First try with JSON response type
        try:
            response = _GEMINI_CLIENT.models.generate_content(
                model=variant,
                contents=prompt,
                config=types.GenerateContentConfig(
                    max_output_tokens=service_config.RAG_MAX_TOKENS,
                    response_mime_type="application/json",
                ),
            )
            if not response.text:
                raise ValueError(f"Empty response from model {variant}")
            return response.text
        except (ClientError, ValueError) as e:
            # Log the full error details for debugging
            error_details = str(e)
            if hasattr(e, 'status_code'):
                error_details += f" (Status: {e.status_code})"
            logger.debug(f"Model {variant} failed with JSON mode: {error_details}")
            
            # Check if it's a quota/rate limit error
            error_str = error_details.lower()
            if "quota" in error_str or "rate limit" in error_str or "429" in error_str:
                logger.error(f"API quota/rate limit error for model {variant}: {error_details}")
                raise RuntimeError(
                    f"API quota or rate limit exceeded. Error: {error_details}"
                ) from e
            
            # If JSON not supported, try without JSON response type
            try:
                logger.debug(f"JSON response type not supported for {variant}, trying without JSON mode")
                response = _GEMINI_CLIENT.models.generate_content(
                    model=variant,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        max_output_tokens=service_config.RAG_MAX_TOKENS,
                    ),
                )
                if not response.text:
                    raise ValueError(f"Empty response from model {variant}")
                return response.text
            except (ClientError, ValueError) as e2:
                error_details2 = str(e2)
                if hasattr(e2, 'status_code'):
                    error_details2 += f" (Status: {e2.status_code})"
                if variant == primary_variants[-1]:
                    logger.warning(f"Primary model {variant} failed: {error_details2}")
                continue

    # Get fallback models - use same logic as RAG service
    fallback_models = []
    
    # First, try to use cached available models
    available_models = _list_available_models()
    if available_models:
        # Extract model names (remove "models/" prefix if present)
        clean_available = []
        for avail in available_models:
            clean_name = avail.replace("models/", "") if avail.startswith("models/") else avail
            # Only include if it's not the primary model
            if clean_name != primary_model:
                clean_available.append(clean_name)
        fallback_models.extend(clean_available)
    
    # Add known working fallback models (only if not already in list)
    known_fallbacks = [
        "gemini-1.5-flash-002",
        "gemini-1.5-flash-001",
        "gemini-1.5-pro-002",
        "gemini-1.5-pro-001",
        "gemini-1.5-flash",
    ]
    
    for fb in known_fallbacks:
        if fb != primary_model and fb not in fallback_models:
            fallback_models.append(fb)
    
    # Remove primary model from fallback list if it's already there
    fallback_models = [m for m in fallback_models if m != primary_model]
    
    if not fallback_models:
        raise RuntimeError(f"Primary model {primary_model} failed and no fallback models available")
    
    last_error: ClientError | None = None
    for model_name in fallback_models:
        model_variants = [model_name]
        if not model_name.startswith("models/"):
            model_variants.append(f"models/{model_name}")
        else:
            model_variants.append(model_name.replace("models/", ""))
        
        for variant in model_variants:
            # Try with JSON first
            try:
                response = _GEMINI_CLIENT.models.generate_content(
                    model=variant,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        max_output_tokens=service_config.RAG_MAX_TOKENS,
                        response_mime_type="application/json",
                    ),
                )
                logger.info(f"Using fallback model {variant} for MCQ generation")
                if not response.text:
                    raise ValueError(f"Empty response from model {variant}")
                return response.text
            except (ClientError, ValueError) as e:
                last_error = e
                # Log the full error details for debugging
                error_details = str(e)
                if hasattr(e, 'status_code'):
                    error_details += f" (Status: {e.status_code})"
                logger.debug(f"Fallback model {variant} failed with JSON mode: {error_details}")
                
                # Check if it's a quota/rate limit error
                error_str = error_details.lower()
                if "quota" in error_str or "rate limit" in error_str or "429" in error_str:
                    logger.error(f"API quota/rate limit error for model {variant}: {error_details}")
                    raise RuntimeError(
                        f"API quota or rate limit exceeded. Error: {error_details}"
                    ) from e
                
                # Try without JSON response type
                try:
                    logger.debug(f"JSON response type not supported for {variant}, trying without JSON mode")
                    response = _GEMINI_CLIENT.models.generate_content(
                        model=variant,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            max_output_tokens=service_config.RAG_MAX_TOKENS,
                        ),
                    )
                    logger.info(f"Using fallback model {variant} (without JSON mode) for MCQ generation")
                    if not response.text:
                        raise ValueError(f"Empty response from model {variant}")
                    return response.text
                except (ClientError, ValueError) as e2:
                    last_error = e2
                    error_details2 = str(e2)
                    if hasattr(e2, 'status_code'):
                        error_details2 += f" (Status: {e2.status_code})"
                    # Log only first few failures to avoid spam
                    if fallback_models.index(model_name) < 2:
                        logger.debug(f"Fallback model {variant} failed: {error_details2}")
                    continue
    
    # If all models failed, raise the last error
    if last_error:
        logger.error(f"All Gemini models failed for MCQ generation. Last error: {last_error}")
        raise last_error
    else:
        raise RuntimeError("All Gemini models failed for MCQ generation and no error was captured")


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

