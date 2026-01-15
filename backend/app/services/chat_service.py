"""Chat and conversation management service."""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from app.models.conversation import Conversation
from app.models.message import Message


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
