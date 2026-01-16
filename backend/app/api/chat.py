"""Chat API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import json
import logging

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
from app.services.rag.pipeline import answer_question
from app.services.rag.prompts import build_prompt, build_prompt_hybrid
from app.services.rag.sources import format_sources
from app.services.integrations.embeddings import create_embedding
from app.services.integrations.pinecone_store import query_vectors
from app.services.chat import (
    create_conversation,
    get_conversation,
    get_conversation_messages,
    save_message,
    fetch_source_metadata,
    format_sources_for_response,
    format_sources_for_db,
    stream_chat_response,
)
from app.config.services import service_config

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/courses/{course_id}/chat/stream")
async def chat_stream(
    course_id: str,
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message and get streaming AI response."""
    course_uuid = validate_uuid(course_id, "course ID")

    result = await db.execute(select(Course).where(Course.id == course_uuid))
    course = result.scalar_one_or_none()

    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if course.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to chat in this course")

    # Get or create conversation
    if request.conversation_id:
        try:
            validate_uuid(request.conversation_id, "conversation ID")
            conversation = await get_conversation(request.conversation_id, db)
            if conversation is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
            if conversation.course_id != course_uuid:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Conversation does not belong to this course")
        except HTTPException:
            title = request.message[:50] if len(request.message) > 50 else request.message
            conversation = await create_conversation(str(course_uuid), title, db)
    else:
        title = request.message[:50] if len(request.message) > 50 else request.message
        conversation = await create_conversation(str(course_uuid), title, db)

    # Save user message
    await save_message(str(conversation.id), "user", request.message, None, db)

    # Get RAG context
    mode = request.mode or "strict"
    verbosity = request.verbosity or "normal"
    
    matches = None
    sources = None
    
    try:
        question_embedding = await create_embedding(request.message)
        matches = await query_vectors(vector=question_embedding, course_id=str(course_uuid), top_k=service_config.RAG_TOP_K)
        
        if matches:
            sources = format_sources(matches)
            if mode == "hybrid":
                rag_context = build_prompt_hybrid(sources, request.message, verbosity)
            else:
                rag_context = build_prompt(sources, request.message, verbosity)
        else:
            rag_context = None
            
    except Exception as e:
        logger.warning(f"RAG retrieval failed: {e}")
        rag_context = None

    # Stream response
    async def generate():
        full_response = ""
        async for chunk in stream_chat_response(
            str(conversation.id),
            request.message,
            rag_context=rag_context,
            db=db,
        ):
            full_response += chunk
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        
        # Save assistant message after streaming completes
        try:
            sources_db = None
            if matches and sources:
                document_map, chunk_map = await fetch_source_metadata(sources, db)
                sources_db = format_sources_for_db(sources, document_map, chunk_map)
            
            await save_message(str(conversation.id), "assistant", full_response, sources_db, db)
        except Exception as e:
            logger.error(f"Failed to save assistant message: {e}")

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/courses/{course_id}/chat")
async def chat(
    course_id: str,
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message and get AI response. Supports both streaming and non-streaming."""
    course_uuid = validate_uuid(course_id, "course ID")

    result = await db.execute(select(Course).where(Course.id == course_uuid))
    course = result.scalar_one_or_none()

    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if course.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to chat in this course")

    # Get or create conversation
    if request.conversation_id:
        try:
            validate_uuid(request.conversation_id, "conversation ID")
            conversation = await get_conversation(request.conversation_id, db)
            if conversation is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
            if conversation.course_id != course_uuid:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Conversation does not belong to this course")
        except HTTPException:
            title = request.message[:50] if len(request.message) > 50 else request.message
            conversation = await create_conversation(str(course_uuid), title, db)
    else:
        title = request.message[:50] if len(request.message) > 50 else request.message
        conversation = await create_conversation(str(course_uuid), title, db)

    # Save user message
    await save_message(str(conversation.id), "user", request.message, None, db)

    mode = request.mode or "strict"
    verbosity = request.verbosity or "normal"
    
    # If streaming is enabled, use streaming endpoint
    if request.stream:
        matches = None
        sources = None
        
        try:
            question_embedding = await create_embedding(request.message)
            matches = await query_vectors(vector=question_embedding, course_id=str(course_uuid), top_k=service_config.RAG_TOP_K)
            
            if matches:
                sources = format_sources(matches)
                if mode == "hybrid":
                    rag_context = build_prompt_hybrid(sources, request.message, verbosity)
                else:
                    rag_context = build_prompt(sources, request.message, verbosity)
            else:
                rag_context = None
                
        except Exception as e:
            logger.warning(f"RAG retrieval failed: {e}")
            rag_context = None

        async def generate():
            full_response = ""
            async for chunk in stream_chat_response(
                str(conversation.id),
                request.message,
                rag_context=rag_context,
                db=db,
            ):
                full_response += chunk
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            
            try:
                sources_db = None
                if matches and sources:
                    document_map, chunk_map = await fetch_source_metadata(sources, db)
                    sources_db = format_sources_for_db(sources, document_map, chunk_map)
                
                await save_message(str(conversation.id), "assistant", full_response, sources_db, db)
            except Exception as e:
                logger.error(f"Failed to save assistant message: {e}")

        return StreamingResponse(generate(), media_type="text/event-stream")
    
    # Non-streaming response
    try:
        rag_result = await answer_question(str(course_uuid), request.message, mode=mode, verbosity=verbosity)
        answer = rag_result["answer"]
        sources = rag_result["sources"]
    except Exception as e:
        logger.error(f"Error in RAG pipeline: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to generate response: {str(e)}")

    try:
        document_map, chunk_map = await fetch_source_metadata(sources, db)
    except Exception as e:
        logger.warning(f"Error fetching source metadata: {e}")
        document_map, chunk_map = {}, {}

    source_list = format_sources_for_response(sources, document_map, chunk_map)
    sources_db = format_sources_for_db(sources, document_map, chunk_map)

    assistant_message = await save_message(str(conversation.id), "assistant", answer, sources_db, db)

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
