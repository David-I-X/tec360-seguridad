from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from uuid import UUID
from typing import List

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.technician import Technician
from app.models.verification import TechnicianDocument, DocumentStatus
from app.schemas.verification import (
    DocumentUploadRequest,
    DocumentResponse,
    AdminReviewRequest,
    PendingTechnicianResponse,
    QuizQuestionResponse,
    QuizSubmitRequest,
    QuizResultResponse,
    VerificationStatusResponse
)
from app.services.verification_service import verification_service

router = APIRouter(prefix="/verification", tags=["Verification"])


def get_current_technician(current_user: dict = Depends(get_current_user), session: Session = Depends(get_session)) -> Technician:
    if current_user["role"] != "technician":
        raise HTTPException(status_code=403, detail="Not a technician")
    tech = session.exec(select(Technician).where(Technician.user_id == UUID(current_user["id"]))).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician profile not found")
    return tech


def get_current_admin(current_user: dict = Depends(get_current_user), session: Session = Depends(get_session)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Requires admin role")
    user = session.get(User, UUID(current_user["id"]))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# --- Technician Endpoints ---

@router.get("/status", response_model=VerificationStatusResponse)
def get_my_status(
    tech: Technician = Depends(get_current_technician),
    session: Session = Depends(get_session)
):
    return verification_service.get_status(session, tech.id)


@router.post("/documents", response_model=DocumentResponse)
def upload_document(
    req: DocumentUploadRequest,
    tech: Technician = Depends(get_current_technician),
    session: Session = Depends(get_session)
):
    return verification_service.upload_document(session, tech.id, req)


@router.get("/quiz/{specialization}", response_model=List[QuizQuestionResponse])
def get_quiz(
    specialization: str,
    tech: Technician = Depends(get_current_technician),
    session: Session = Depends(get_session)
):
    questions = verification_service.get_quiz_questions(session, tech.id, specialization)
    return [QuizQuestionResponse(**q.model_dump()) for q in questions]


@router.post("/quiz/{specialization}/submit", response_model=QuizResultResponse)
def submit_quiz(
    specialization: str,
    req: QuizSubmitRequest,
    tech: Technician = Depends(get_current_technician),
    session: Session = Depends(get_session)
):
    return verification_service.submit_quiz(session, tech.id, specialization, req)


# --- Admin Endpoints ---

@router.get("/admin/pending", response_model=List[PendingTechnicianResponse])
def get_pending_verifications(
    admin: User = Depends(get_current_admin),
    session: Session = Depends(get_session)
):
    # Obtener técnicos con documentos en estado pending
    statement = select(Technician, User).join(User).where(
        Technician.id.in_(
            select(TechnicianDocument.technician_id).where(TechnicianDocument.status == DocumentStatus.pending)
        )
    )
    results = session.exec(statement).all()
    
    response = []
    for tech, user in results:
        docs = session.exec(
            select(TechnicianDocument).where(
                TechnicianDocument.technician_id == tech.id,
                TechnicianDocument.status == DocumentStatus.pending
            )
        ).all()
        
        response.append(
            PendingTechnicianResponse(
                technician_id=tech.id,
                full_name=user.full_name or "Sin nombre",
                phone=user.phone,
                uploaded_at=docs[0].uploaded_at if docs else None,
                documents_count=len(docs)
            )
        )
        
    return response


@router.get("/admin/{technician_id}/documents", response_model=List[DocumentResponse])
def get_technician_documents(
    technician_id: UUID,
    admin: User = Depends(get_current_admin),
    session: Session = Depends(get_session)
):
    docs = session.exec(
        select(TechnicianDocument).where(TechnicianDocument.technician_id == technician_id)
    ).all()
    return [DocumentResponse(**d.model_dump()) for d in docs]


@router.post("/admin/{technician_id}/review")
def review_technician_documents(
    technician_id: UUID,
    req: AdminReviewRequest,
    admin: User = Depends(get_current_admin),
    session: Session = Depends(get_session)
):
    verification_service.admin_review_documents(
        session=session,
        technician_id=technician_id,
        status=req.status,
        admin_id=admin.id,
        reason=req.rejection_reason
    )
    return {"message": f"Documentos marcados como {req.status}"}
