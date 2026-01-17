"""Document upload and management API routes."""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid
import os
from datetime import datetime, timezone
from app.db import get_db
from app.models.user import User
from app.models.course import Course
from app.models.document import Document
from app.schemas.document import DocumentResponse
from app.utils.dependencies import get_current_user
from app.config.api import api_config
from app.services.documents import (
    get_file_type,
    is_text_processable,
    is_media_file,
    is_image_file,
    extract_text_from_file,
)
from app.services.chunking import chunk_text_parent_child, save_chunks_to_db
from app.services.integrations.embeddings import create_embeddings_batch
from app.services.integrations.pinecone_store import store_vectors
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["documents"])


class PasteTextRequest(BaseModel):
    """Request schema for pasting text."""
    title: str
    text: str


class PasteTextRequest(BaseModel):
    """Request schema for pasting text."""
    title: str
    text: str


@router.post(
    "/courses/{course_id}/documents/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    course_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload and process a document (PDF, DOCX, PPTX, TXT, RTF, CSV, XLSX, MP3, WAV, MP4, WEBM)."""
    try:
        course_uuid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid course ID format"
        )

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
            detail="Not authorized to upload to this course",
        )

    # Validate file type
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Filename is required"
        )
    
    file_type, mime_type = get_file_type(file.filename)
    
    # Supported file types
    supported_types = {
        'pdf', 'docx', 'doc', 'pptx', 'ppt', 'txt', 'rtf', 
        'csv', 'xlsx', 'xls', 'mp3', 'wav', 'mp4', 'webm',
        'png', 'jpg', 'jpeg', 'svg'
    }
    
    if file_type not in supported_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Supported types: PDF, DOCX/DOC, PPTX/PPT, TXT, RTF, CSV, XLSX/XLS, MP3, WAV, MP4, WEBM, PNG, JPG, JPEG, SVG"
        )

    # Read file content
    contents = await file.read()
    file_size = len(contents)

    # Validate file size
    if file_size > api_config.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {api_config.MAX_FILE_SIZE} bytes",
        )

    # Create document record
    document_id = uuid.uuid4()
    document = Document(
        id=document_id,
        course_id=course_uuid,
        filename=file.filename,
        file_path="",  # Will be set after saving
        file_size=file_size,
        num_pages=0,  # Will be updated after processing
        file_type=file_type,
        mime_type=mime_type,
        processing_status="pending",
    )

    db.add(document)
    await db.commit()
    await db.refresh(document)

    # Create upload directory structure
    upload_dir = os.path.join(
        api_config.UPLOAD_DIR, str(current_user.id), str(course_uuid)
    )
    os.makedirs(upload_dir, exist_ok=True)

    # Save file with original extension
    file_ext = os.path.splitext(file.filename)[1] or f".{file_type}"
    file_path = os.path.join(upload_dir, f"{document_id}{file_ext}")
    with open(file_path, "wb") as f:
        f.write(contents)

    # Update document with file path
    document.file_path = file_path
    document.processing_status = "processing"
    await db.commit()

    try:
        # Process file based on type
        if is_text_processable(file_type):
            # Process text-based files for RAG
            # 1. Extract text
            pages = extract_text_from_file(file_path, file_type)
            document.num_pages = len(pages)
            await db.commit()

            # 2. Create chunks (parent-child strategy)
            small_chunks, parent_chunks = chunk_text_parent_child(pages, str(document_id))
            # Save both small and parent chunks to database
            await save_chunks_to_db(small_chunks, db)
            await save_chunks_to_db(parent_chunks, db)

            # 3. Generate embeddings (use small chunks for retrieval)
            embeddings = await create_embeddings_batch(small_chunks)

            # 4. Store in Pinecone (need to get page numbers from chunks)
            # Enhance embeddings with page numbers
            chunk_dict = {chunk["chunk_id"]: chunk for chunk in small_chunks}
            for emb in embeddings:
                chunk_id = emb["chunk_id"]
                if chunk_id in chunk_dict:
                    emb["page_number"] = chunk_dict[chunk_id]["page_number"]
                    emb["text"] = chunk_dict[chunk_id]["content"][:1000]  # First 1000 chars

            await store_vectors(embeddings, str(document_id), str(course_uuid))

            # 5. Update status to completed
            document.processing_status = "completed"
            document.processed_at = datetime.now(timezone.utc)
            await db.commit()
        elif is_media_file(file_type) or is_image_file(file_type):
            # Media and image files: just store, no processing
            document.num_pages = 1  # Media/image files don't have pages
            document.processing_status = "completed"
            document.processed_at = datetime.now(timezone.utc)
            await db.commit()
        else:
            # Unknown file type - mark as completed but don't process
            document.num_pages = 0
            document.processing_status = "completed"
            document.processed_at = datetime.now(timezone.utc)
            await db.commit()

    except Exception as e:
        logger.error(f"Error processing document {document_id}: {str(e)}")
        document.processing_status = "failed"
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process document: {str(e)}",
        )

    return DocumentResponse(
        id=str(document.id),
        course_id=str(document.course_id),
        filename=str(document.filename),  # type: ignore
        file_size=int(document.file_size),  # type: ignore
        num_pages=int(document.num_pages),  # type: ignore
        file_type=str(document.file_type),  # type: ignore
        mime_type=str(document.mime_type),  # type: ignore
        processing_status=str(document.processing_status),  # type: ignore
        uploaded_at=document.uploaded_at,  # type: ignore
        processed_at=document.processed_at,  # type: ignore
    )


@router.get("/courses/{course_id}/documents", response_model=List[DocumentResponse])
async def get_documents(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all documents for a course."""
    try:
        course_uuid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid course ID format"
        )

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

    # Get documents
    result = await db.execute(select(Document).where(Document.course_id == course_uuid))
    documents = result.scalars().all()

    return [
        DocumentResponse(
            id=str(doc.id),
            course_id=str(doc.course_id),
            filename=doc.filename,
            file_size=doc.file_size,
            num_pages=doc.num_pages,
            file_type=doc.file_type,
            mime_type=doc.mime_type,
            processing_status=doc.processing_status,
            uploaded_at=doc.uploaded_at,
            processed_at=doc.processed_at,
        )
        for doc in documents
    ]


@router.post(
    "/courses/{course_id}/documents/paste",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def paste_text_document(
    course_id: str,
    request: PasteTextRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a text document from pasted text."""
    try:
        course_uuid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid course ID format"
        )

    # Validate request
    if not request.title or not request.title.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Title is required"
        )
    
    if not request.text or not request.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Text is required"
        )

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
            detail="Not authorized to add documents to this course",
        )

    # Create document record
    document_id = uuid.uuid4()
    filename = f"{request.title.strip()}.txt"
    file_size = len(request.text.encode('utf-8'))
    file_type = 'txt'
    mime_type = 'text/plain'

    document = Document(
        id=document_id,
        course_id=course_uuid,
        filename=filename,
        file_path="",  # Will be set after saving
        file_size=file_size,
        num_pages=0,  # Will be updated after processing
        file_type=file_type,
        mime_type=mime_type,
        processing_status="pending",
    )

    db.add(document)
    await db.commit()
    await db.refresh(document)

    # Create upload directory structure
    upload_dir = os.path.join(
        api_config.UPLOAD_DIR, str(current_user.id), str(course_uuid)
    )
    os.makedirs(upload_dir, exist_ok=True)

    # Save text to file
    file_path = os.path.join(upload_dir, f"{document_id}.txt")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(request.text)

    # Update document with file path
    document.file_path = file_path
    document.processing_status = "processing"
    await db.commit()

    try:
        # Process text file for RAG (same as regular text file upload)
        # 1. Extract text (already have it, but format as pages)
        pages = extract_text_from_file(file_path, file_type)
        document.num_pages = len(pages)
        await db.commit()

        # 2. Create chunks (parent-child strategy)
        small_chunks, parent_chunks = chunk_text_parent_child(pages, str(document_id))
        # Save both small and parent chunks to database
        await save_chunks_to_db(small_chunks, db)
        await save_chunks_to_db(parent_chunks, db)

        # 3. Generate embeddings (use small chunks for retrieval)
        embeddings = await create_embeddings_batch(small_chunks)

        # 4. Store in Pinecone (need to get page numbers from chunks)
        # Enhance embeddings with page numbers
        chunk_dict = {chunk["chunk_id"]: chunk for chunk in small_chunks}
        for emb in embeddings:
            chunk_id = emb["chunk_id"]
            if chunk_id in chunk_dict:
                emb["page_number"] = chunk_dict[chunk_id]["page_number"]
                emb["text"] = chunk_dict[chunk_id]["content"][:1000]  # First 1000 chars

        await store_vectors(embeddings, str(document_id), str(course_uuid))

        # 5. Update status to completed
        document.processing_status = "completed"
        document.processed_at = datetime.now(timezone.utc)
        await db.commit()

    except Exception as e:
        logger.error(f"Error processing pasted text document {document_id}: {str(e)}")
        document.processing_status = "failed"
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process document: {str(e)}",
        )

    return DocumentResponse(
        id=str(document.id),
        course_id=str(document.course_id),
        filename=str(document.filename),  # type: ignore
        file_size=int(document.file_size),  # type: ignore
        num_pages=int(document.num_pages),  # type: ignore
        file_type=str(document.file_type),  # type: ignore
        mime_type=str(document.mime_type),  # type: ignore
        processing_status=str(document.processing_status),  # type: ignore
        uploaded_at=document.uploaded_at,  # type: ignore
        processed_at=document.processed_at,  # type: ignore
    )


@router.get("/documents/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get document details."""
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

    return DocumentResponse(
        id=str(document.id),
        course_id=str(document.course_id),
        filename=document.filename,
        file_size=document.file_size,
        num_pages=document.num_pages,
        file_type=document.file_type,
        mime_type=document.mime_type,
        processing_status=document.processing_status,
        uploaded_at=document.uploaded_at,
        processed_at=document.processed_at,
    )


@router.get("/documents/{document_id}/file")
async def get_document_file(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the file for a document."""
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

    # Check if file exists
    if not os.path.exists(document.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="File not found"
        )

    return FileResponse(
        document.file_path,
        media_type=document.mime_type,
        filename=document.filename,
    )
