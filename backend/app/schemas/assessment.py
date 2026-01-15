"""Assessment schemas for MCQ generation and open-ended question evaluation."""

from pydantic import BaseModel, Field
from typing import List, Optional


# ============================================================================
# MCQ Schemas
# ============================================================================

class MCQOption(BaseModel):
    """Schema for a single MCQ option."""

    id: str = Field(..., description="Option identifier (A, B, C, D)")
    text: str = Field(..., description="Option text")
    is_correct: bool = Field(..., description="Whether this option is correct")
    justification: str = Field(..., description="Explanation of why this option is correct or incorrect")


class SourceReference(BaseModel):
    """Schema for source reference (PDF + page)."""

    document_id: str = Field(..., description="Document UUID")
    document_name: str = Field(..., description="Document filename")
    page: int = Field(..., description="Page number")


class MCQRequest(BaseModel):
    """Request schema for MCQ generation."""

    topic: Optional[str] = Field(None, description="Optional topic to focus on")
    num_questions: int = Field(1, ge=1, le=10, description="Number of MCQs to generate (1-10)")


class MCQResponse(BaseModel):
    """Response schema for MCQ generation."""

    question: str = Field(..., description="The question text")
    options: List[MCQOption] = Field(..., description="List of 4 answer options")
    hint: str = Field(..., description="Hint to help the student")
    source_references: List[SourceReference] = Field(..., description="Source references (PDF + page)")


class MCQListResponse(BaseModel):
    """Response schema for multiple MCQs."""

    mcqs: List[MCQResponse] = Field(..., description="List of generated MCQs")


# ============================================================================
# Open-Ended Question Schemas
# ============================================================================

class OpenEndedQuestionRequest(BaseModel):
    """Request schema for open-ended question generation."""

    topic: Optional[str] = Field(None, description="Optional topic to focus on")


class OpenEndedQuestionResponse(BaseModel):
    """Response schema for open-ended question generation."""

    question: str = Field(..., description="The open-ended question")
    source_references: List[SourceReference] = Field(..., description="Source references (PDF + page)")


class OpenEndedEvaluationRequest(BaseModel):
    """Request schema for open-ended answer evaluation."""

    question: str = Field(..., description="The open-ended question")
    student_answer: str = Field(..., description="The student's answer to evaluate")


class EvaluationDetails(BaseModel):
    """Schema for evaluation details."""

    score_explanation: str = Field(..., description="Overall assessment of the answer")
    correct_aspects: List[str] = Field(..., description="What the student got right")
    missing_aspects: List[str] = Field(..., description="Important points the student missed")
    incorrect_aspects: List[str] = Field(..., description="Incorrect information in the answer")


class OpenEndedEvaluationResponse(BaseModel):
    """Response schema for open-ended answer evaluation."""

    reference_answer: str = Field(..., description="The ideal answer based on course material")
    evaluation: EvaluationDetails = Field(..., description="Detailed evaluation of the student's answer")
    feedback: str = Field(..., description="Constructive feedback to help the student improve")
    source_references: List[SourceReference] = Field(..., description="Source references (PDF + page)")

