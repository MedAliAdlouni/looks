"""
Google Generative AI embedding service.
Handles single and batch embedding creation.
"""

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
        if not ai_config.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not configured")
        logger.info("Initializing Gemini client for embeddings")
        _client = genai.Client(api_key=ai_config.GEMINI_API_KEY)
    return _client


def _embed_batch_sync(texts: List[str]) -> List[List[float]]:
    """Synchronous helper to call Google's embedding API with multiple texts."""
    import time
    start_time = time.time()
    
    try:
        client = get_client()
        logger.info(f"Calling embedding API - model: {service_config.EMBEDDING_MODEL}, text count: {len(texts)}, first text length: {len(texts[0]) if texts else 0} chars")
        
        result = client.models.embed_content(
            model=service_config.EMBEDDING_MODEL,
            contents=texts,
            config=types.EmbedContentConfig(
                task_type=service_config.EMBEDDING_TASK_TYPE,
                output_dimensionality=service_config.VECTOR_DIMENSION
            )
        )
        
        elapsed = time.time() - start_time
        logger.info(f"Embedding API call completed in {elapsed:.2f} seconds")
        
        embeddings = [list(emb.values) for emb in result.embeddings]
        # Log dimension for debugging
        if embeddings:
            logger.info(f"Generated {len(embeddings)} embeddings with dimension: {len(embeddings[0])}")
        return embeddings
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"Error in _embed_batch_sync after {elapsed:.2f}s: {type(e).__name__}: {str(e)}", exc_info=True)
        raise


async def create_embedding(text: str) -> List[float]:
    """Create embedding for a single text."""
    if not ai_config.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured")
    
    logger.info(f"Creating embedding for text (length: {len(text)} chars)")
    
    try:
        loop = asyncio.get_running_loop()
        # Use configurable timeout for embedding API calls
        # The API call itself might be slow, so we give it more time
        timeout = service_config.EMBEDDING_TIMEOUT
        embeddings = await asyncio.wait_for(
            loop.run_in_executor(None, _embed_batch_sync, [text]),
            timeout=timeout
        )
        logger.info("Embedding generated successfully")
        return embeddings[0]  # Return first (and only) embedding
    except asyncio.TimeoutError:
        timeout = service_config.EMBEDDING_TIMEOUT
        logger.error(f"Embedding API call timed out after {timeout} seconds - this may indicate network issues or API problems")
        raise RuntimeError(f"Embedding generation timed out after {timeout} seconds. Please check your network connection and API key, then try again.")
    except ValueError as e:
        if "GEMINI_API_KEY" in str(e):
            logger.error("GEMINI_API_KEY is not configured")
            raise ValueError("GEMINI_API_KEY is not configured. Please set it in your environment variables.")
        raise
    except Exception as e:
        logger.error(f"Error creating embedding: {type(e).__name__}: {str(e)}", exc_info=True)
        raise RuntimeError(f"Failed to create embedding: {str(e)}") from e


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
            loop = asyncio.get_running_loop()
            timeout = service_config.EMBEDDING_TIMEOUT
            embeddings = await asyncio.wait_for(
                loop.run_in_executor(None, _embed_batch_sync, texts),
                timeout=timeout
            )
            
            # Map embeddings back to chunk IDs
            for chunk, embedding in zip(batch, embeddings):
                results.append({
                    "chunk_id": chunk["chunk_id"],
                    "embedding": embedding,
                })
        except asyncio.TimeoutError:
            timeout = service_config.EMBEDDING_TIMEOUT
            logger.error(f"Batch embedding API call timed out after {timeout} seconds")
            raise RuntimeError(f"Batch embedding generation timed out after {timeout} seconds. Please check your network connection and API key, then try again.")
        except Exception as e:
            logger.error(f"Error creating batch embeddings: {str(e)}")
            raise

    return results

