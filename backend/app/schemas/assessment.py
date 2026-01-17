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
    num_questions: int = Field(1, ge=1, le=50, description="Number of MCQs to generate (1-50)")
    document_ids: Optional[List[str]] = Field(None, description="Optional list of document IDs to limit question generation to")
    difficulty: Optional[str] = Field(None, description="Difficulty level: 'easy', 'medium', or 'hard'")


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
    num_questions: Optional[int] = Field(1, ge=1, le=50, description="Number of questions to generate (1-50, default: 1)")
    document_ids: Optional[List[str]] = Field(None, description="Optional list of document IDs to limit question generation to")
    difficulty: Optional[str] = Field(None, description="Difficulty level: 'easy', 'medium', or 'hard'")


class OpenEndedQuestionResponse(BaseModel):
    """Response schema for open-ended question generation."""

    question: str = Field(..., description="The open-ended question")
    source_references: List[SourceReference] = Field(..., description="Source references (PDF + page)")


class OpenEndedQuestionListResponse(BaseModel):
    """Response schema for multiple open-ended questions."""

    questions: List[OpenEndedQuestionResponse] = Field(..., description="List of generated open-ended questions")


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


# ============================================================================
# Find Mistake Assessment Schemas
# ============================================================================

class FindMistakeRequest(BaseModel):
    """Request schema for find_mistake assessment generation."""

    num_questions: int = Field(1, ge=1, le=50, description="Number of find_mistake items to generate (1-50)")
    document_ids: Optional[List[str]] = Field(None, description="Optional list of document IDs to limit generation to")
    difficulty: Optional[str] = Field("medium", description="Difficulty level: 'easy', 'medium', or 'hard' (default: 'medium')")


class FindMistakeResponse(BaseModel):
    """Response schema for a single find_mistake assessment item."""

    type: str = Field("find_mistake", description="Assessment type")
    id: str = Field(..., description="Unique identifier for this assessment item")
    prompt: str = Field(..., description="Instructions for the student")
    incorrect_solution: str = Field(..., description="Intentionally wrong reasoning/solution")
    expected_correction: str = Field(..., description="The corrected version")
    explanation: str = Field(..., description="Explanation of the mistake and correction")
    sources: List[SourceReference] = Field(..., description="Source references (PDF + page)")


class FindMistakeListResponse(BaseModel):
    """Response schema for multiple find_mistake assessment items."""

    items: List[FindMistakeResponse] = Field(..., description="List of generated find_mistake assessment items")


# ============================================================================
# Case-Based Assessment Schemas
# ============================================================================

class CaseBasedMCQ(BaseModel):
    """MCQ within a case-based assessment."""

    kind: str = Field("mcq", description="Question kind")
    question: str = Field(..., description="The MCQ question text")
    options: List[str] = Field(..., description="List of answer options")
    answer_index: int = Field(..., description="Index of the correct answer (0-based)")
    hint: str = Field(..., description="Hint for the question")
    sources: List[SourceReference] = Field(..., description="Source references for this question")


class CaseBasedOpenEnded(BaseModel):
    """Open-ended question within a case-based assessment."""

    kind: str = Field("open_ended", description="Question kind")
    question: str = Field(..., description="The open-ended question text")
    expected_answer: str = Field(..., description="Expected answer")
    rubric: List[str] = Field(..., description="Rubric points for evaluation")
    sources: List[SourceReference] = Field(..., description="Source references for this question")


class CaseBasedQuestion(BaseModel):
    """Union type for case-based questions (MCQ or open-ended)."""
    
    kind: str
    question: str
    sources: List[SourceReference]
    # For MCQs
    options: Optional[List[str]] = None
    answer_index: Optional[int] = None
    hint: Optional[str] = None
    # For open-ended
    expected_answer: Optional[str] = None
    rubric: Optional[List[str]] = None


class CaseBasedResponse(BaseModel):
    """Response schema for a single case-based assessment bundle."""

    type: str = Field("case_based", description="Assessment type")
    id: str = Field(..., description="Unique identifier for this case")
    case_title: str = Field(..., description="Title of the case")
    case_description: str = Field(..., description="Description/scenario of the case")
    questions: List[CaseBasedQuestion] = Field(..., description="List of questions (2 MCQs + 1 open-ended)")
    sources: List[SourceReference] = Field(..., description="Source references for the case")


class CaseBasedRequest(BaseModel):
    """Request schema for case_based assessment generation."""

    num_questions: int = Field(1, ge=1, le=50, description="Number of cases to generate (1-50)")
    document_ids: Optional[List[str]] = Field(None, description="Optional list of document IDs to limit generation to")
    difficulty: Optional[str] = Field("medium", description="Difficulty level: 'easy', 'medium', or 'hard' (default: 'medium')")


class CaseBasedListResponse(BaseModel):
    """Response schema for multiple case-based assessments."""

    cases: List[CaseBasedResponse] = Field(..., description="List of generated case-based assessment bundles")
