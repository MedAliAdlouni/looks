"""Chat schemas."""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class ChatRequest(BaseModel):
    """Chat request schema."""

    message: str
    conversation_id: Optional[str] = None
    mode: Optional[str] = "strict"  # "strict" or "hybrid"
    verbosity: Optional[str] = "normal"  # "concise", "normal", or "detailed"
    stream: Optional[bool] = False  # Enable streaming response


# ------------------------------------------------------------
class Source(BaseModel):
    """Source citation schema."""

    page: int
    chunk_id: str
    similarity: float
    document_id: str
    document_name: str
    chunk_text: str


class ChatResponse(BaseModel):
    """Chat response schema."""

    message_id: str
    content: str
    sources: List[Source]
    conversation_id: str
    mode: Optional[str] = "strict"  # Track which mode was used


# ------------------------------------------------------------
class MessageResponse(BaseModel):
    """Message response schema."""

    id: str
    role: str
    content: str
    sources: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    """Conversation response schema."""

    id: str
    course_id: str
    title: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
