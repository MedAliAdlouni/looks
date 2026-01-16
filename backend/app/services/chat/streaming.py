"""Streaming chat service."""

import asyncio
import logging
from typing import AsyncIterator
from sqlalchemy.ext.asyncio import AsyncSession
from google.genai import types

from app.services.integrations.gemini_client import generate_content_stream
from app.services.chat.service import get_conversation_messages

logger = logging.getLogger(__name__)


def _build_contents(messages, rag_context: str | None, user_message: str):
    """Build contents list from messages, RAG context, and user message."""
    contents = []
    
    for msg in messages:
        role = 'user' if msg.role == 'user' else 'model'
        contents.append(types.Content(role=role, parts=[types.Part.from_text(text=msg.content)]))
    
    if rag_context:
        contents.append(types.Content(role='user', parts=[types.Part.from_text(text=rag_context)]))
    
    contents.append(types.Content(role='user', parts=[types.Part.from_text(text=user_message)]))
    
    return contents


async def stream_chat_response(
    conversation_id: str,
    user_message: str,
    rag_context: str | None = None,
    system_instruction: str | None = None,
    db: AsyncSession | None = None,
) -> AsyncIterator[str]:
    """Stream chat response using conversation history and optional RAG context."""
    messages = []
    if conversation_id and db:
        messages = await get_conversation_messages(conversation_id, db)
    
    contents = _build_contents(messages, rag_context, user_message)
    
    config = types.GenerateContentConfig()
    if system_instruction:
        config.system_instruction = system_instruction
    
    loop = asyncio.get_running_loop()
    queue = asyncio.Queue()
    
    def _stream_and_queue():
        try:
            response = generate_content_stream(contents, config)
            for chunk in response:
                if chunk.text:
                    # Put chunk in queue from executor thread
                    asyncio.run_coroutine_threadsafe(queue.put(chunk.text), loop)
            asyncio.run_coroutine_threadsafe(queue.put(None), loop)
        except Exception as e:
            logger.error(f"Error in streaming: {e}", exc_info=True)
            asyncio.run_coroutine_threadsafe(queue.put(None), loop)
    
    # Run streaming in executor thread
    loop.run_in_executor(None, _stream_and_queue)
    
    # Yield chunks from queue
    while True:
        chunk = await queue.get()
        if chunk is None:
            break
        yield chunk

