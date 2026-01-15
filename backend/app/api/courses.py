"""Course management API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from typing import List
import uuid
from app.db import get_db
from app.models.user import User
from app.models.course import Course
from app.models.document import Document
from app.schemas.course import CourseCreate, CourseResponse
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/courses", tags=["courses"])


@router.get("", response_model=List[CourseResponse])
async def get_courses(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """Get all courses for the current user."""
    result = await db.execute(
        select(Course, func.count(Document.id).label("document_count"))
        .outerjoin(Document, Course.id == Document.course_id)
        .where(Course.user_id == current_user.id)
        .group_by(Course.id)
    )

    courses_with_counts = result.all()

    return [
        CourseResponse(
            id=str(course.id),
            user_id=str(course.user_id),
            name=course.name,
            description=course.description,
            document_count=doc_count or 0,
            created_at=course.created_at,
            updated_at=course.updated_at,
        )
        for course, doc_count in courses_with_counts
    ]


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    course_data: CourseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new course."""
    new_course = Course(
        user_id=current_user.id,
        name=course_data.name,
        description=course_data.description,
    )

    db.add(new_course)
    await db.flush()  # Flush to get the ID
    await db.commit()
    await db.refresh(new_course)

    return CourseResponse(
        id=str(new_course.id),
        user_id=str(new_course.user_id),
        name=new_course.name,
        description=new_course.description,
        document_count=0,
        created_at=new_course.created_at,
        updated_at=new_course.updated_at,
    )


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get course details with documents list."""
    try:
        course_uuid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid course ID format"
        )

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

    # Count documents
    doc_count_result = await db.execute(
        select(func.count(Document.id)).where(Document.course_id == course_uuid)
    )
    document_count = doc_count_result.scalar() or 0

    return CourseResponse(
        id=str(course.id),
        user_id=str(course.user_id),
        name=course.name,
        description=course.description,
        document_count=document_count,
        created_at=course.created_at,
        updated_at=course.updated_at,
    )


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a course (cascade deletes documents, chunks, conversations)."""
    try:
        course_uuid = uuid.UUID(course_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid course ID format"
        )

    result = await db.execute(select(Course).where(Course.id == course_uuid))
    course = result.scalar_one_or_none()

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Course not found"
        )

    if course.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this course",
        )

    await db.execute(delete(Course).where(Course.id == course_uuid))
    await db.commit()

    return None
