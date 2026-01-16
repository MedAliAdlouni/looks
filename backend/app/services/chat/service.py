"""Chat and conversation management service."""

from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.document import Document
from app.models.chunk import Chunk
from app.services.chat.sources import format_sources_for_response, format_sources_for_db


async def create_conversation(
    course_id: str, title: Optional[str], db: AsyncSession
) -> Conversation:
    """
    Create a new conversation.

    Args:
        course_id: UUID of the course
        title: Optional conversation title
        db: Database session

    Returns:
        Created conversation
    """
    conversation = Conversation(course_id=uuid.UUID(course_id), title=title)

    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)

    return conversation


async def get_conversation(
    conversation_id: str, db: AsyncSession
) -> Optional[Conversation]:
    """
    Get a conversation by ID.

    Args:
        conversation_id: UUID of the conversation
        db: Database session

    Returns:
        Conversation or None if not found
    """
    result = await db.execute(
        select(Conversation).where(Conversation.id == uuid.UUID(conversation_id))
    )
    return result.scalar_one_or_none()


async def get_conversation_messages(
    conversation_id: str, db: AsyncSession
) -> List[Message]:
    """
    Get all messages in a conversation, ordered by creation time.

    Args:
        conversation_id: UUID of the conversation
        db: Database session

    Returns:
        List of messages (oldest first)
    """
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == uuid.UUID(conversation_id))
        .order_by(Message.created_at)
    )
    return list(result.scalars().all())


async def save_message(
    conversation_id: str,
    role: str,
    content: str,
    sources: Optional[List[Dict[str, Any]]],
    db: AsyncSession,
) -> Message:
    """
    Save a message to a conversation.

    Args:
        conversation_id: UUID of the conversation
        role: 'user' or 'assistant'
        content: Message content
        sources: Optional list of source citations
        db: Database session

    Returns:
        Created message
    """
    message = Message(
        conversation_id=uuid.UUID(conversation_id),
        role=role,
        content=content,
        sources=sources,
    )

    db.add(message)
    await db.commit()
    await db.refresh(message)

    return message


async def fetch_source_metadata(
    sources: List[Dict[str, Any]], db: AsyncSession
) -> Tuple[Dict[str, str], Dict[str, str]]:
    """
    Fetch document names and chunk content for sources in a single batch query.
    
    Args:
        sources: List of source dictionaries with document_id and chunk_id
        db: Database session
        
    Returns:
        Tuple of (document_map, chunk_map) where:
        - document_map: {document_id: filename}
        - chunk_map: {chunk_id: content}
    """
    # Extract unique document IDs and chunk IDs
    document_ids = set()
    chunk_ids = set()
    
    for src in sources:
        doc_id = src.get("document_id", "").strip()
        chunk_id = src.get("chunk_id", "").strip()
        if doc_id:
            try:
                document_ids.add(uuid.UUID(doc_id))
            except (ValueError, AttributeError):
                continue
        if chunk_id:
            try:
                chunk_ids.add(uuid.UUID(chunk_id))
            except (ValueError, AttributeError):
                continue
    
    document_map: Dict[str, str] = {}
    chunk_map: Dict[str, str] = {}
    
    # Fetch documents and chunks in parallel (single query each)
    if document_ids:
        result = await db.execute(
            select(Document).where(Document.id.in_(document_ids))
        )
        documents = result.scalars().all()
        document_map = {str(doc.id): doc.filename for doc in documents}
    
    if chunk_ids:
        result = await db.execute(
            select(Chunk).where(Chunk.id.in_(chunk_ids))
        )
        chunks = result.scalars().all()
        chunk_map = {str(chunk.id): chunk.content for chunk in chunks}
    
    return document_map, chunk_map

