"""Document schemas."""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DocumentBase(BaseModel):
    """Base document schema."""

    filename: str
    file_size: int
    num_pages: int
    file_type: str
    mime_type: str


class DocumentCreate(DocumentBase):
    """Document creation schema."""

    file_path: str


class DocumentResponse(DocumentBase):
    """Document response schema."""

    id: str
    course_id: str
    processing_status: str
    uploaded_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
