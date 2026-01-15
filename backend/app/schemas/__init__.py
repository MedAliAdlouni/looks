"""Pydantic schemas."""

from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.schemas.user import UserBase, UserCreate, UserResponse as UserResponseSchema
from app.schemas.course import CourseBase, CourseCreate, CourseResponse
from app.schemas.document import DocumentBase, DocumentCreate, DocumentResponse
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    MessageResponse,
    ConversationResponse,
)

__all__ = [
    "RegisterRequest",
    "LoginRequest",
    "TokenResponse",
    "UserResponse",
    "UserBase",
    "UserCreate",
    "UserResponseSchema",
    "CourseBase",
    "CourseCreate",
    "CourseResponse",
    "DocumentBase",
    "DocumentCreate",
    "DocumentResponse",
    "ChatRequest",
    "ChatResponse",
    "MessageResponse",
    "ConversationResponse",
]
