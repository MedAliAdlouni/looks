"""Service layer configuration."""

from pydantic_settings import BaseSettings


class ServiceConfig(BaseSettings):
    """Configuration for services."""

    # Embedding service
    EMBEDDING_MODEL: str = "models/text-embedding-004"
    EMBEDDING_TASK_TYPE: str = "RETRIEVAL_DOCUMENT"
    EMBEDDING_BATCH_SIZE: int = 100
    EMBEDDING_MAX_RETRIES: int = 3

    # Chunking service
    CHUNK_SMALL_SIZE: int = 400  # tokens
    CHUNK_PARENT_SIZE: int = 1200  # tokens
    CHUNK_OVERLAP: int = 100  # tokens

    # Vector service
    VECTOR_DIMENSION: int = 768  # text-embedding-004 outputs 768 dimensions by default
    VECTOR_BATCH_SIZE: int = 100
    VECTOR_METRIC: str = "cosine"
    VECTOR_REGION: str = "us-east-1"
    VECTOR_INDEX_NAME: str = "course-materials"

    # RAG service
    RAG_TOP_K: int = 5
    RAG_MAX_TOKENS: int = 4096  # Increased for longer responses, especially in hybrid mode

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


service_config = ServiceConfig()

