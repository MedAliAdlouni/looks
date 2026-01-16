"""
Gemini API client wrapper.
Handles client initialization, model listing, and content generation with fallback logic.
"""

from typing import List
import logging
from google import genai
from google.genai import types
from google.genai.errors import ClientError
from app.config.ai import ai_config
from app.config.services import service_config

logger = logging.getLogger(__name__)

# Global client instance
_GEMINI_CLIENT: genai.Client | None = None

# Cache for available models (lazy initialization)
_cached_available_models: List[str] | None = None
_models_list_attempted = False


def get_gemini_client() -> genai.Client:
    """
    Get or create the Gemini client instance.
    
    Returns:
        Initialized Gemini client
        
    Raises:
        RuntimeError: If GEMINI_API_KEY is not configured
    """
    global _GEMINI_CLIENT
    
    if _GEMINI_CLIENT is not None:
        return _GEMINI_CLIENT
    
    if not ai_config.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    # Don't specify api_version - let SDK use default (usually v1beta for newer models)
    _GEMINI_CLIENT = genai.Client(
        api_key=ai_config.GEMINI_API_KEY,
    )
    return _GEMINI_CLIENT


def list_available_models() -> List[str]:
    """
    List available Gemini models that support generateContent.
    Returns cached list of model names (only queries API once).
    
    Returns:
        List of available model names
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
        client = get_gemini_client()
        models = client.models.list()
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


def generate_content(prompt: str, max_tokens: int | None = None) -> str:
    """
    Generate content using Gemini API with automatic fallback.
    Blocking call - must be run in a thread executor for async code.
    Optimized to try primary model first, only fallback if needed.
    
    Args:
        prompt: Prompt text to send to the model
        max_tokens: Maximum output tokens (defaults to service_config.RAG_MAX_TOKENS)
        
    Returns:
        Generated text response
        
    Raises:
        RuntimeError: If all models fail
        ClientError: If API call fails
    """
    client = get_gemini_client()
    
    if max_tokens is None:
        max_tokens = service_config.RAG_MAX_TOKENS
    
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
            response = client.models.generate_content(
                model=variant,
                contents=prompt,
                config=types.GenerateContentConfig(
                    max_output_tokens=max_tokens,
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
    available_models = list_available_models()
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
                response = client.models.generate_content(
                    model=variant,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        max_output_tokens=max_tokens,
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

