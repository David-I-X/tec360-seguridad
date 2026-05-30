from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel, JSON
from sqlalchemy import Column
from enum import Enum


class VerificationStatus(str, Enum):
    incomplete = "incomplete"          # No ha subido docs
    pending_review = "pending_review"  # Docs subidos, esperando admin
    documents_approved = "documents_approved"  # Admin aprobó docs
    documents_rejected = "documents_rejected"  # Admin rechazó docs
    quiz_available = "quiz_available"  # Puede tomar el quiz
    verified = "verified"             # Todo aprobado, puede cotizar


class DocumentStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class TechnicianDocument(SQLModel, table=True):
    __tablename__ = "technician_documents"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    technician_id: UUID = Field(foreign_key="technicians.id", index=True)
    
    document_type: str = Field(index=True) # "id_front", "id_back", "sena_cert", "other_cert"
    document_url: str
    
    status: str = Field(default=DocumentStatus.pending.value)
    rejection_reason: Optional[str] = None
    
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[UUID] = Field(default=None, foreign_key="users.id")


class QuizQuestion(SQLModel, table=True):
    __tablename__ = "quiz_questions"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    specialization: str = Field(index=True) # "gps_installation", "alarm_installation", etc
    
    question_text: str
    options: List[str] = Field(sa_column=Column(JSON))
    correct_option_index: int
    
    difficulty: str = Field(default="medium") # easy, medium, hard
    is_active: bool = Field(default=True)


class QuizAttempt(SQLModel, table=True):
    __tablename__ = "quiz_attempts"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    technician_id: UUID = Field(foreign_key="technicians.id", index=True)
    specialization: str
    
    score: int = Field(default=0) # e.g. 80 out of 100
    passed: bool = Field(default=False)
    
    answers: List[Dict[str, Any]] = Field(default=[], sa_column=Column(JSON)) # [{"question_id": "...", "selected": 1, "correct": True}]
    
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    can_retry_after: Optional[datetime] = None
