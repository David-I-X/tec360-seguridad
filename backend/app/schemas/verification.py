from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID


# --- Documents ---
class DocumentUploadRequest(BaseModel):
    document_type: str
    document_url: str


class DocumentResponse(BaseModel):
    id: UUID
    technician_id: UUID
    document_type: str
    document_url: str
    status: str
    rejection_reason: Optional[str] = None
    uploaded_at: datetime
    reviewed_at: Optional[datetime] = None


# --- Admin ---
class AdminReviewRequest(BaseModel):
    status: str # "approved" or "rejected"
    rejection_reason: Optional[str] = None


class PendingTechnicianResponse(BaseModel):
    technician_id: UUID
    full_name: str
    phone: str
    uploaded_at: datetime
    documents_count: int


# --- Quiz ---
class QuizQuestionResponse(BaseModel):
    id: UUID
    question_text: str
    options: List[str]
    # correct_option_index is intentionally excluded here for the client


class QuizSubmitAnswer(BaseModel):
    question_id: UUID
    selected_option_index: int


class QuizSubmitRequest(BaseModel):
    answers: List[QuizSubmitAnswer]


class QuizResultResponse(BaseModel):
    passed: bool
    score: int
    total_questions: int
    correct_answers: int
    can_retry_after: Optional[datetime] = None


# --- Status ---
class VerificationStatusResponse(BaseModel):
    status: str
    documents: List[DocumentResponse]
    quiz_attempts: List[Dict[str, Any]]
