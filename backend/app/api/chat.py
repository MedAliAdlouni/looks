"""Chat API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid
from app.db import get_db
from app.models.user import User
from app.models.course import Course
from app.models.document import Document
from app.models.chunk import Chunk
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    MessageResponse,
    ConversationResponse,
    Source,
)
from app.utils.dependencies import get_current_user
from app.services.rag_service import answer_question
from app.services.chat_service import (
    create_conversation,
    get_conversation,
    get_conversation_messages,
    save_message,
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/courses/{course_id}/chat", response_model=ChatResponse)
async def chat(
    course_id: str,
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message and get AI response."""
    try:
        course_uuid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid course ID format"
        )

    # Verify course exists and user owns it
    result = await db.execute(select(Course).where(Course.id == course_uuid))
    course = result.scalar_one_or_none()

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    if course.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to chat in this course",
        )

    # Get or create conversation
    if request.conversation_id:
        # Validate conversation_id is a valid UUID
        try:
            conv_uuid = uuid.UUID(request.conversation_id)
        except ValueError:
            # Invalid UUID format, treat as new conversation
            logger.warning(
                f"Invalid conversation_id format: {request.conversation_id}. Creating new conversation."
            )
            title = request.message[:50] if len(request.message) > 50 else request.message
            conversation = await create_conversation(str(course_uuid), title, db)
        else:
            conversation = await get_conversation(request.conversation_id, db)
            if conversation is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
                )
            if conversation.course_id != course_uuid:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Conversation does not belong to this course",
                )
    else:
        # Create new conversation with first message as title
        title = request.message[:50] if len(request.message) > 50 else request.message
        conversation = await create_conversation(str(course_uuid), title, db)

    # Save user message
    user_message = await save_message(
        str(conversation.id), "user", request.message, None, db
    )

    # Get AI response using RAG
    # Extract mode from request, default to "strict"
    mode = request.mode or "strict"
    if mode not in ["strict", "hybrid"]:
        mode = "strict"  # Fallback to strict if invalid mode
    
    # Extract verbosity from request, default to "normal"
    verbosity = request.verbosity or "normal"
    if verbosity not in ["concise", "normal", "detailed"]:
        verbosity = "normal"  # Fallback to normal if invalid verbosity
    
    try:
        rag_result = await answer_question(str(course_uuid), request.message, mode=mode, verbosity=verbosity)
        answer = rag_result["answer"]
        sources = rag_result["sources"]
    except Exception as e:
        logger.error(f"Error in RAG pipeline: {str(e)}", exc_info=True)
        # Temporary: return error for debugging (remove in production)
        answer = f"Error: {str(e)}"
        sources = []

    # Fetch document names for all unique document_ids
    document_ids = list(set([src.get("document_id", "") for src in sources if src.get("document_id") and src.get("document_id").strip()]))
    document_map = {}
    if document_ids:
        try:
            # Filter out empty strings and convert to UUIDs
            valid_uuids = []
            for doc_id in document_ids:
                try:
                    valid_uuids.append(uuid.UUID(doc_id))
                except (ValueError, AttributeError):
                    logger.warning(f"Invalid document_id format: {doc_id}")
                    continue
            
            if valid_uuids:
                result = await db.execute(
                    select(Document).where(Document.id.in_(valid_uuids))
                )
                documents = result.scalars().all()
                document_map = {str(doc.id): doc.filename for doc in documents}
        except Exception as e:
            logger.warning(f"Error fetching document names: {str(e)}")

    # Fetch full chunk content for all chunks
    chunk_ids = [src.get("chunk_id", "") for src in sources if src.get("chunk_id")]
    chunk_map = {}
    if chunk_ids:
        try:
            valid_chunk_uuids = []
            for chunk_id in chunk_ids:
                try:
                    valid_chunk_uuids.append(uuid.UUID(chunk_id))
                except (ValueError, AttributeError):
                    logger.warning(f"Invalid chunk_id format: {chunk_id}")
                    continue
            
            if valid_chunk_uuids:
                result = await db.execute(
                    select(Chunk).where(Chunk.id.in_(valid_chunk_uuids))
                )
                chunks = result.scalars().all()
                chunk_map = {str(chunk.id): chunk.content for chunk in chunks}
        except Exception as e:
            logger.warning(f"Error fetching chunk content: {str(e)}")

    # Format sources for response - use full chunk content from database
    source_list = [
        Source(
            page=src["page"],
            chunk_id=src["chunk_id"],
            similarity=src["similarity"],
            document_id=src.get("document_id", ""),
            document_name=document_map.get(src.get("document_id", ""), "Unknown Document"),
            chunk_text=chunk_map.get(src.get("chunk_id", ""), src.get("text", ""))  # Use full chunk content
        )
        for src in sources
    ]

    # Format sources for database (JSONB)
    sources_db = [
        {
            "page": src["page"],
            "chunk_id": src["chunk_id"],
            "similarity": float(src["similarity"]),
            "document_id": src.get("document_id", ""),
            "document_name": document_map.get(src.get("document_id", ""), "Unknown Document"),
            "chunk_text": chunk_map.get(src.get("chunk_id", ""), src.get("text", "")),
        }
        for src in sources
    ]

    # Save assistant message
    assistant_message = await save_message(
        str(conversation.id), "assistant", answer, sources_db, db
    )

    return ChatResponse(
        message_id=str(assistant_message.id),
        content=answer,
        sources=source_list,
        conversation_id=str(conversation.id),
        mode=mode,
    )


@router.get(
    "/conversations/{conversation_id}/messages", response_model=List[MessageResponse]
)
async def get_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all messages in a conversation."""
    try:
        conv_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation ID format",
        )

    # Get conversation and verify ownership
    conversation = await get_conversation(conversation_id, db)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    # Verify user owns the course
    result = await db.execute(select(Course).where(Course.id == conversation.course_id))
    course = result.scalar_one_or_none()

    if course and course.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this conversation",
        )

    # Get messages
    messages = await get_conversation_messages(conversation_id, db)

    return [
        MessageResponse(
            id=str(msg.id),
            role=msg.role,
            content=msg.content,
            sources=msg.sources,
            created_at=msg.created_at,
        )
        for msg in messages
    ]


@router.get(
    "/courses/{course_id}/conversations", response_model=List[ConversationResponse]
)
async def get_conversations(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all conversations for a course."""
    try:
        course_uuid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid course ID format"
        )

    # Verify course exists and user owns it
    result = await db.execute(select(Course).where(Course.id == course_uuid))
    course = result.scalar_one_or_none()

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    if course.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this course",
        )

    # Get conversations
    from app.models.conversation import Conversation

    result = await db.execute(
        select(Conversation)
        .where(Conversation.course_id == course_uuid)
        .order_by(Conversation.updated_at.desc())
    )
    conversations = result.scalars().all()

    return [
        ConversationResponse(
            id=str(conv.id),
            course_id=str(conv.course_id),
            title=conv.title,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
        )
        for conv in conversations
    ]
