"""Authentication schemas."""

from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    """User registration request."""

    email: EmailStr
    password: str
    full_name: str | None = None


class LoginRequest(BaseModel):
    """User login request."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """User response schema."""

    id: str
    email: str
    full_name: str | None

    class Config:
        from_attributes = True
