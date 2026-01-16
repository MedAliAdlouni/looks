"""Document viewer conversion endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
import os
import logging
from app.db import get_db
from app.models.user import User
from app.models.course import Course
from app.models.document import Document
from app.utils.dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["document-viewers"])


@router.get("/documents/{document_id}/view/docx", response_class=HTMLResponse)
async def view_docx(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Convert DOCX to HTML for viewing."""
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid document ID format"
        )

    result = await db.execute(select(Document).where(Document.id == doc_uuid))
    document = result.scalar_one_or_none()

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )

    # Verify user owns the course
    result = await db.execute(select(Course).where(Course.id == document.course_id))
    course = result.scalar_one_or_none()

    if course and course.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this document",
        )

    if document.file_type not in ('docx', 'doc'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint is only for DOCX/DOC files",
        )

    if not os.path.exists(document.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )

    try:
        from app.services.documents.viewers.docx_html import convert_docx_to_html
        
        html_content = convert_docx_to_html(document.file_path)
        return HTMLResponse(content=html_content)
    except Exception as e:
        logger.error(f"Error converting DOCX to HTML: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to convert document: {str(e)}",
        )


@router.get("/documents/{document_id}/view/pptx")
async def view_pptx(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get PPTX slides data for viewing."""
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid document ID format"
        )

    result = await db.execute(select(Document).where(Document.id == doc_uuid))
    document = result.scalar_one_or_none()

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )

    # Verify user owns the course
    result = await db.execute(select(Course).where(Course.id == document.course_id))
    course = result.scalar_one_or_none()

    if course and course.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this document",
        )

    if document.file_type not in ('pptx', 'ppt'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint is only for PPTX/PPT files",
        )

    if not os.path.exists(document.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )

    try:
        from app.services.documents.viewers.pptx_slides import extract_pptx_slides
        
        slides = extract_pptx_slides(document.file_path)
        return JSONResponse(content={
            "slides": slides,
            "total_slides": len(slides),
            "filename": document.filename,
        })
    except Exception as e:
        logger.error(f"Error extracting PPTX slides: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract slides: {str(e)}",
        )

