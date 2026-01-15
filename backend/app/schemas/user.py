"""User schemas."""

from pydantic import BaseModel, EmailStr
from typing import Optional


class UserBase(BaseModel):
    """
    Base user schema with common fields shared across operations.

    Justification: DRY principle - avoids repeating email and full_name
    in multiple schemas. Contains fields that are common to both creation
    and response operations.

    When needed: Used as a base class for other schemas. Not used directly
    in API endpoints, but inherited by UserCreate and UserResponse.
    """

    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """
    Schema for creating a new user.

    Justification: Defines what data is required when a user registers.
    Includes password field which is needed for creation but should NEVER
    be returned in responses. Validates input before it reaches the database.

    When needed: Used in POST /api/users or registration endpoints where
    you need to create a new user. The password will be hashed before
    storing in the database.

    Example usage:
        @router.post("/users", response_model=UserResponse)
        async def create_user(user_data: UserCreate, db: AsyncSession):
            # user_data.email, user_data.password, user_data.full_name
    """

    password: str


class UserResponse(UserBase):
    """
    Schema for returning user data in API responses.

    Justification: Security and API contract - ensures sensitive fields
    (password_hash, internal timestamps) are never exposed. Only includes
    safe, public-facing user information. The from_attributes=True allows
    automatic conversion from SQLAlchemy ORM models.

    When needed: Used as response_model in GET endpoints that return user
    information (e.g., GET /api/users/{id}, GET /api/auth/me). Also used
    when returning user data in nested responses (e.g., course owner info).

    Example usage:
        @router.get("/users/{id}", response_model=UserResponse)
        async def get_user(id: str):
            return UserResponse.model_validate(user_orm_instance)
    """

    id: str

    class Config:
        from_attributes = True
