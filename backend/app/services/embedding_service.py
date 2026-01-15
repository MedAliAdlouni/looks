"""Google Generative AI embedding service."""

from typing import List, Dict
import logging
import asyncio
from app.config.services import service_config
from app.config.ai import ai_config
import google.genai as genai
from google.genai import types

logger = logging.getLogger(__name__)

# Lazy import to avoid errors if API key not configured
_client = None

def get_client():
    """Get or create the Gemini client."""
    global _client
    if _client is None:
        _client = genai.Client(api_key=ai_config.GEMINI_API_KEY)
    return _client


def _embed_batch_sync(texts: List[str]) -> List[List[float]]:
    """Synchronous helper to call Google's embedding API with multiple texts."""
    client = get_client()
    result = client.models.embed_content(
        model=service_config.EMBEDDING_MODEL,
        contents=texts,
        config=types.EmbedContentConfig(
            task_type=service_config.EMBEDDING_TASK_TYPE,
            output_dimensionality=service_config.VECTOR_DIMENSION
        )
    )
    embeddings = [list(emb.values) for emb in result.embeddings]
    # Log dimension for debugging
    if embeddings:
        logger.debug(f"Generated embeddings with dimension: {len(embeddings[0])}")
    return embeddings


async def create_embedding(text: str) -> List[float]:
    """Create embedding for a single text."""
    if not ai_config.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured")
    
    try:
        loop = asyncio.get_event_loop()
        # Set timeout to 10 seconds for embedding (should be fast)
        embeddings = await asyncio.wait_for(
            loop.run_in_executor(None, _embed_batch_sync, [text]),
            timeout=10.0
        )
        return embeddings[0]  # Return first (and only) embedding
    except asyncio.TimeoutError:
        logger.error("Embedding API call timed out after 10 seconds")
        raise RuntimeError("Embedding generation timed out. Please try again.")
    except Exception as e:
        logger.error(f"Error creating embedding: {str(e)}")
        raise


async def create_embeddings_batch(chunks: List[Dict]) -> List[Dict]:
    """Create embeddings for multiple chunks."""
    if not ai_config.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured")
    
    results = []

    for i in range(0, len(chunks), service_config.EMBEDDING_BATCH_SIZE):
        batch = chunks[i : i + service_config.EMBEDDING_BATCH_SIZE]
        texts = [chunk["content"] for chunk in batch]

        try:
            # Pass all texts in a single API call
            loop = asyncio.get_event_loop()
            embeddings = await loop.run_in_executor(None, _embed_batch_sync, texts)
            
            # Map embeddings back to chunk IDs
            for chunk, embedding in zip(batch, embeddings):
                results.append({
                    "chunk_id": chunk["chunk_id"],
                    "embedding": embedding,
                })
        except Exception as e:
            logger.error(f"Error creating batch embeddings: {str(e)}")
            raise

    return results