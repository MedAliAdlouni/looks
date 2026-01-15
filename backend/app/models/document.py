"""Document model."""

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.db import Base


class Document(Base):
    """Document model."""

    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    num_pages = Column(Integer, nullable=False)
    file_type = Column(String(50), nullable=False)  # pdf, docx, pptx, txt, csv, xlsx, mp3, wav, mp4, webm, etc.
    mime_type = Column(String(100), nullable=False)  # application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, etc.
    processing_status = Column(
        String(50), default="pending"
    )  # pending, processing, completed, failed
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True))

    # Relationships
    course = relationship("Course", back_populates="documents")
    chunks = relationship(
        "Chunk", back_populates="document", cascade="all, delete-orphan"
    )
