"""Course schemas."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CourseBase(BaseModel):
    """Base course schema."""

    name: str
    description: Optional[str] = None


class CourseCreate(CourseBase):
    """Course creation schema."""

    pass


class CourseUpdate(CourseBase):
    """Course update schema."""

    pass


class CourseResponse(CourseBase):
    """Course response schema."""

    id: str
    user_id: str
    document_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
