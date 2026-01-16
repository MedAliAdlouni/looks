"""
Database persistence for chunks.
Pure database operations, no business logic.
"""

from typing import List, Dict
import uuid
import logging
from app.models.chunk import Chunk
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def save_chunks_to_db(chunks: List[Dict], db: AsyncSession) -> None:
    """
    Save chunks to database.

    Args:
        chunks: List of chunk dictionaries with keys:
               - chunk_id: str
               - document_id: str
               - content: str
               - page_number: int
               - chunk_index: int
               - token_count: int (optional)
        db: Database session
    """
    for chunk_data in chunks:
        # Ensure page_number is always set and is not None
        page_number = chunk_data.get("page_number")
        if page_number is None:
            logger.warning(f"Chunk {chunk_data.get('chunk_id')} has no page_number, defaulting to 1")
            page_number = 1
        
        # Ensure page_number is an integer
        if not isinstance(page_number, int):
            logger.warning(f"Chunk {chunk_data.get('chunk_id')} has invalid page_number {page_number}, defaulting to 1")
            page_number = 1
        
        chunk = Chunk(
            id=uuid.UUID(chunk_data["chunk_id"]),
            document_id=uuid.UUID(chunk_data["document_id"]),
            content=chunk_data["content"],
            page_number=page_number,
            chunk_index=chunk_data["chunk_index"],
            token_count=chunk_data.get("token_count"),
        )
        db.add(chunk)

    await db.commit()

