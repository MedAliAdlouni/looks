"""Chat API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.db import get_db
from app.models.user import User
from app.models.course import Course
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    MessageResponse,
    ConversationResponse,
)
from app.utils.dependencies import get_current_user, validate_uuid
from app.services.rag import answer_question
from app.services.chat import (
    create_conversation,
    get_conversation,
    get_conversation_messages,
    save_message,
    fetch_source_metadata,
    format_sources_for_response,
    format_sources_for_db,
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
    course_uuid = validate_uuid(course_id, "course ID")

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
        try:
            validate_uuid(request.conversation_id, "conversation ID")
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
        except HTTPException:
            # Invalid UUID format, treat as new conversation
            logger.warning(
                f"Invalid conversation_id format: {request.conversation_id}. Creating new conversation."
            )
            title = request.message[:50] if len(request.message) > 50 else request.message
            conversation = await create_conversation(str(course_uuid), title, db)
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
    except RuntimeError as e:
        logger.error(f"Error in RAG pipeline: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate response: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error in RAG pipeline: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while generating the response"
        )

    # Fetch document names and chunk content in a single batch (fixes N+1 query)
    try:
        document_map, chunk_map = await fetch_source_metadata(sources, db)
    except Exception as e:
        logger.warning(f"Error fetching source metadata: {str(e)}")
        document_map, chunk_map = {}, {}

    # Format sources for response and database
    source_list = format_sources_for_response(sources, document_map, chunk_map)
    sources_db = format_sources_for_db(sources, document_map, chunk_map)

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
    validate_uuid(conversation_id, "conversation ID")

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
    course_uuid = validate_uuid(course_id, "course ID")

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
