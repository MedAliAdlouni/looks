"""Gemini API client wrapper."""

import logging
from google import genai
from google.genai import types
from app.config.ai import ai_config
from app.config.services import service_config

logger = logging.getLogger(__name__)

_GEMINI_CLIENT: genai.Client | None = None


def get_gemini_client() -> genai.Client:
    """Get or create the Gemini client instance."""
    global _GEMINI_CLIENT
    
    if _GEMINI_CLIENT is not None:
        return _GEMINI_CLIENT
    
    if not ai_config.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    _GEMINI_CLIENT = genai.Client(api_key=ai_config.GEMINI_API_KEY)
    return _GEMINI_CLIENT


def generate_content(prompt: str, max_tokens: int | None = None) -> str:
    """Generate content using Gemini API. Blocking call - run in thread executor for async."""
    client = get_gemini_client()
    
    if max_tokens is None:
        max_tokens = service_config.RAG_MAX_TOKENS
    
    response = client.models.generate_content(
        model=ai_config.GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(max_output_tokens=max_tokens),
    )
    
    if not response.text:
        raise ValueError("Empty response from model")
    
    return response.text


def generate_content_stream(contents, config: types.GenerateContentConfig | None = None):
    """Generate streaming content using Gemini API. Returns iterator over chunks."""
    client = get_gemini_client()
    
    if config is None:
        config = types.GenerateContentConfig()
    
    return client.models.generate_content_stream(
        model=ai_config.GEMINI_MODEL,
        contents=contents,
        config=config,
    )

