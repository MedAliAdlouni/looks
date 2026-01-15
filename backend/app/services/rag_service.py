"""
RAG (Retrieval-Augmented Generation) service.
Clean, explicit, and production-ready.
"""

from typing import Dict, List
import asyncio
import logging

from google import genai
from google.genai import types
from google.genai.errors import ClientError

from app.services.embedding_service import create_embedding
from app.services.vector_service import query_vectors
from app.config.ai import ai_config
from app.config.services import service_config

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------
# Gemini client (single, explicit, no fallback)
# ---------------------------------------------------------------------

def get_gemini_client() -> genai.Client:
    if not ai_config.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    # Don't specify api_version - let SDK use default (usually v1beta for newer models)
    client = genai.Client(
        api_key=ai_config.GEMINI_API_KEY,
    )
    return client


_GEMINI_CLIENT = get_gemini_client()

# Cache for available models (lazy initialization)
_cached_available_models: List[str] | None = None
_models_list_attempted = False


# ---------------------------------------------------------------------
# RAG pipeline
# ---------------------------------------------------------------------

async def answer_question(course_id: str, question: str, mode: str = "strict", verbosity: str = "normal") -> Dict:
    """
    Answer a question using a RAG pipeline.

    Args:
        course_id: UUID of the course
        question: User question
        mode: "strict" (only course material) or "hybrid" (course material + general knowledge)

    Returns:
        {
            "answer": str,
            "sources": List[dict]
        }
    """

    try:
        # 1. Embed question
        question_embedding = await create_embedding(question)

        # 2. Retrieve relevant chunks
        matches = await query_vectors(
            vector=question_embedding,
            course_id=course_id,
            top_k=service_config.RAG_TOP_K,
        )

        if not matches:
            return {
                "answer": "I could not find relevant course material to answer this question.",
                "sources": [],
            }

        # 3. Build context
        sources = _format_sources(matches)
        # Choose prompt template based on mode
        if mode == "hybrid":
            prompt = _build_prompt_hybrid(sources, question, verbosity)
        else:
            prompt = _build_prompt(sources, question, verbosity)

        # 4. Generate answer (Gemini is sync → run in executor with timeout)
        loop = asyncio.get_running_loop()
        # Set timeout to 30 seconds for generation (should be plenty)
        try:
            answer = await asyncio.wait_for(
                loop.run_in_executor(None, _generate_answer_sync, prompt),
                timeout=30.0
            )
        except asyncio.TimeoutError:
            logger.error("Gemini API call timed out after 30 seconds")
            raise RuntimeError("AI response generation timed out. Please try again.")

        return {
            "answer": answer,
            "sources": sources,
        }

    except Exception as e:
        logger.exception("RAG pipeline failed")
        raise RuntimeError(f"Failed to answer question: {e}") from e


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------

def _format_sources(matches: List[dict]) -> List[dict]:
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


def _get_verbosity_instruction(verbosity: str) -> str:
    """Get verbosity instruction based on verbosity level."""
    verbosity_map = {
        "concise": "Be concise and brief - provide only essential information without extra details",
        "normal": "Provide a balanced response with adequate detail - explain concepts clearly but avoid unnecessary elaboration",
        "detailed": "Be thorough and comprehensive - explain concepts fully, provide context, examples, and detailed explanations",
    }
    return verbosity_map.get(verbosity, verbosity_map["normal"])


def _build_prompt(sources: List[dict], question: str, verbosity: str = "normal") -> str:
    context = "\n\n".join(
        f"[Page {s['page']}]\n{s['text']}"
        for s in sources
    )
    
    verbosity_instruction = _get_verbosity_instruction(verbosity)

    return ai_config.RAG_PROMPT_TEMPLATE.format(
        context_str=context,
        question=question,
        verbosity_instruction=verbosity_instruction,
    )


def _build_prompt_hybrid(sources: List[dict], question: str, verbosity: str = "normal") -> str:
    """Build prompt for hybrid mode (course material + general knowledge)."""
    context = "\n\n".join(
        f"[Page {s['page']}]\n{s['text']}"
        for s in sources
    )
    
    verbosity_instruction = _get_verbosity_instruction(verbosity)

    return ai_config.RAG_PROMPT_TEMPLATE_HYBRID.format(
        context_str=context,
        question=question,
        verbosity_instruction=verbosity_instruction,
    )


def _list_available_models() -> List[str]:
    """
    List available Gemini models that support generateContent.
    Returns cached list of model names (only queries API once).
    """
    global _cached_available_models, _models_list_attempted
    
    # Return cached result if available
    if _cached_available_models is not None:
        return _cached_available_models
    
    # Only attempt to list models once
    if _models_list_attempted:
        return []
    
    _models_list_attempted = True
    
    try:
        models = _GEMINI_CLIENT.models.list()
        available = []
        for model in models:
            # Check if model supports generateContent
            methods = getattr(model, 'supported_generation_methods', None)
            if methods and isinstance(methods, (list, tuple, set)):
                if 'generateContent' in methods:
                    available.append(model.name)
            elif hasattr(model, 'name'):
                # If we can't check methods, just add the name
                available.append(model.name)
        logger.info(f"Available models: {available}")
        _cached_available_models = available
        return available
    except Exception as e:
        logger.warning(f"Could not list models: {e}")
        _cached_available_models = []
        return []


def _generate_answer_sync(prompt: str) -> str:
    """
    Blocking Gemini call.
    Must be run in a thread executor.
    Optimized to try primary model first, only fallback if needed.
    """
    # Primary model - try this first (fast path)
    primary_model = ai_config.GEMINI_MODEL
    primary_variants = [primary_model]
    if not primary_model.startswith("models/"):
        primary_variants.append(f"models/{primary_model}")
    else:
        primary_variants.append(primary_model.replace("models/", ""))
    
    # Try primary model first (most common case)
    for variant in primary_variants:
        try:
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
        except ClientError as e:
            # Only log if it's the last variant
            if variant == primary_variants[-1]:
                logger.warning(f"Primary model {variant} failed: {e}")
            continue
    
    # Get fallback models - use cached available models if we have them
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
            try:
                response = _GEMINI_CLIENT.models.generate_content(
                    model=variant,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        max_output_tokens=service_config.RAG_MAX_TOKENS,
                    ),
                )
                logger.info(f"Using fallback model {variant} instead of {primary_model}")
                if not response.text:
                    raise ValueError(f"Empty response from model {variant}")
                return response.text
            except ClientError as e:
                last_error = e
                # Log only first few failures to avoid spam
                if fallback_models.index(model_name) < 2:
                    logger.debug(f"Fallback model {variant} failed: {e}")
                continue
    
    # If all models failed, raise the last error
    if last_error:
        logger.error(f"All Gemini models failed. Last error: {last_error}")
        raise last_error
    else:
        raise RuntimeError("All Gemini models failed and no error was captured")
