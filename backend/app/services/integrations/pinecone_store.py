"""
Pinecone vector database service.
Handles index initialization, vector storage, and querying.
"""

from typing import List, Dict
from pinecone import Pinecone, ServerlessSpec
import logging
import time
from urllib3.exceptions import ProtocolError
from app.config.ai import ai_config
from app.config.services import service_config

logger = logging.getLogger(__name__)

# Initialize Pinecone client
if not ai_config.PINECONE_API_KEY:
    raise ValueError("PINECONE_API_KEY is not configured")

pc = Pinecone(api_key=ai_config.PINECONE_API_KEY)

# Cache the index to avoid checking on every query
_cached_index = None
_index_initialized = False


def init_index(force_reinit: bool = False):
    """Initialize and cache the Pinecone index (called once at startup)."""
    global _cached_index, _index_initialized
    
    if _index_initialized and not force_reinit:
        return _cached_index
    
    index_name = service_config.VECTOR_INDEX_NAME
    logger.info(f"Initializing Pinecone index: {index_name}")

    try:
        # List existing indexes (only once at startup)
        existing_indexes = [idx.name for idx in pc.list_indexes()]

        # Check if index exists and has correct dimension
        if index_name in existing_indexes:
            # Check if dimension matches
            index_info = pc.describe_index(index_name)
            if index_info.dimension != service_config.VECTOR_DIMENSION:
                logger.warning(f"Index {index_name} has dimension {index_info.dimension}, but config expects {service_config.VECTOR_DIMENSION}. Deleting and recreating...")
                pc.delete_index(index_name)
                # Wait a bit for deletion to complete
                time.sleep(2)
                existing_indexes = [idx.name for idx in pc.list_indexes()]
        
        # Create index if it doesn't exist
        if index_name not in existing_indexes:
            # Create index
            logger.info(f"Creating Pinecone index: {index_name}")
            pc.create_index(
                name=index_name,
                dimension=service_config.VECTOR_DIMENSION,
                metric=service_config.VECTOR_METRIC,
                spec=ServerlessSpec(
                    cloud="aws",
                    region=service_config.VECTOR_REGION,
                ),
            )
            # Wait for index to be ready
            time.sleep(2)

        _cached_index = pc.Index(index_name)
        _index_initialized = True
        logger.info(f"Pinecone index {index_name} initialized and cached")
        return _cached_index
    except Exception as e:
        logger.error(f"Failed to initialize Pinecone index: {e}")
        _index_initialized = False
        _cached_index = None
        raise


def _get_index():
    """Get cached Pinecone index (no API calls after first initialization)."""
    if not _index_initialized:
        return init_index()
    return _cached_index


def _reset_index_cache():
    """Reset the index cache to force re-initialization."""
    global _cached_index, _index_initialized
    _cached_index = None
    _index_initialized = False
    logger.info("Pinecone index cache reset")


async def store_vectors(
    embeddings: List[Dict], document_id: str, course_id: str
) -> None:
    """
    Store vectors in Pinecone.

    Args:
        embeddings: List of {chunk_id: str, embedding: List[float], page_number: int, text: str}
        document_id: UUID of the document
        course_id: UUID of the course
    """
    # Prepare vectors for upsert
    vectors_to_upsert = []

    for emb_data in embeddings:
        chunk_id = emb_data["chunk_id"]
        embedding = emb_data["embedding"]
        page_number = emb_data.get("page_number", 0)
        text = emb_data.get("text", "")[:1000]  # First 1000 chars for preview

        # Ensure embedding is a list of floats
        if not isinstance(embedding, list):
            raise ValueError(f"Embedding for chunk {chunk_id} is not a list: {type(embedding)}")
        
        # Flatten if nested and convert all values to float
        embedding_floats = []
        for val in embedding:
            if isinstance(val, list):
                # If nested, flatten it
                embedding_floats.extend([float(v) for v in val])
            else:
                embedding_floats.append(float(val))

        metadata = {
            "document_id": document_id,
            "course_id": course_id,
            "page_number": page_number,
            "text": text,
        }

        vectors_to_upsert.append(
            {"id": chunk_id, "values": embedding_floats, "metadata": metadata}
        )

    # Upsert in batches (Pinecone recommends batches of 100)
    max_retries = 3
    retry_delay = 0.1  # seconds
    
    for i in range(0, len(vectors_to_upsert), service_config.VECTOR_BATCH_SIZE):
        batch = vectors_to_upsert[i : i + service_config.VECTOR_BATCH_SIZE]
        
        for attempt in range(max_retries):
            try:
                index = _get_index()
                index.upsert(vectors=batch)
                break  # Success, move to next batch
            except (ProtocolError, ConnectionError, Exception) as e:
                error_str = str(e)
                is_connection_error = (
                    "Failed to connect" in error_str or
                    "Connection aborted" in error_str or
                    "Remote end closed connection" in error_str or
                    isinstance(e, (ProtocolError, ConnectionError))
                )
                
                if is_connection_error and attempt < max_retries - 1:
                    logger.warning(
                        f"Connection error upserting vectors (attempt {attempt + 1}/{max_retries}): {error_str}"
                    )
                    # Reset index cache and try to re-initialize
                    _reset_index_cache()
                    time.sleep(retry_delay * (attempt + 1))  # Exponential backoff
                    continue
                else:
                    logger.error(f"Error upserting vectors to Pinecone: {error_str}")
                    raise Exception(f"Failed to store vectors: {error_str}")


async def query_vectors(
    vector: List[float], course_id: str, top_k: int = 5
) -> List[Dict]:
    """
    Query Pinecone for similar vectors.

    Args:
        vector: Query embedding vector
        course_id: UUID of the course to filter by
        top_k: Number of results to return

    Returns:
        List of matches with chunk_id, similarity, page_number, and text
    """
    max_retries = 3
    retry_delay = 0.1  # seconds
    
    for attempt in range(max_retries):
        try:
            index = _get_index()
            
            results = index.query(
                vector=vector,
                top_k=top_k,
                filter={"course_id": course_id},
                include_metadata=True,
            )

            matches = []
            for match in results.matches:
                metadata = match.metadata or {}
                matches.append(
                    {
                        "chunk_id": match.id,
                        "similarity": match.score,
                        "page": metadata.get("page_number", 0),
                        "text": metadata.get("text", ""),
                        "document_id": metadata.get("document_id", ""),
                    }
                )

            return matches

        except (ProtocolError, ConnectionError, Exception) as e:
            error_str = str(e)
            is_connection_error = (
                "Failed to connect" in error_str or
                "Connection aborted" in error_str or
                "Remote end closed connection" in error_str or
                isinstance(e, (ProtocolError, ConnectionError))
            )
            
            if is_connection_error and attempt < max_retries - 1:
                logger.warning(
                    f"Connection error querying Pinecone (attempt {attempt + 1}/{max_retries}): {error_str}"
                )
                # Reset index cache and try to re-initialize
                _reset_index_cache()
                time.sleep(retry_delay * (attempt + 1))  # Exponential backoff
                continue
            else:
                logger.error(f"Error querying Pinecone: {error_str}")
                raise Exception(f"Failed to query vectors: {error_str}")
    
    # Should not reach here, but just in case
    raise Exception("Failed to query vectors after all retries")

