from typing import List, Dict, Any, Tuple
from fastapi import HTTPException
from sqlmodel import Session, select
from datetime import datetime, timedelta
from uuid import UUID
import random
import logging

from app.models.technician import Technician
from app.models.user import User
from app.models.verification import (
    VerificationStatus,
    DocumentStatus,
    TechnicianDocument,
    QuizQuestion,
    QuizAttempt
)
from app.schemas.verification import (
    DocumentUploadRequest,
    DocumentResponse,
    QuizSubmitRequest,
    QuizResultResponse,
    VerificationStatusResponse
)

logger = logging.getLogger(__name__)


class VerificationService:
    
    def upload_document(
        self, session: Session, technician_id: UUID, req: DocumentUploadRequest
    ) -> DocumentResponse:
        tech = session.get(Technician, technician_id)
        if not tech:
            raise HTTPException(404, "Técnico no encontrado")
            
        doc = TechnicianDocument(
            technician_id=technician_id,
            document_type=req.document_type,
            document_url=req.document_url
        )
        session.add(doc)
        
        # Cambiar estado a pending_review si está en incomplete o rejected
        if tech.verification_status in [VerificationStatus.incomplete, VerificationStatus.documents_rejected]:
            tech.verification_status = VerificationStatus.pending_review
            session.add(tech)
            
        session.commit()
        session.refresh(doc)
        
        return DocumentResponse(**doc.model_dump())

    def get_status(self, session: Session, technician_id: UUID) -> VerificationStatusResponse:
        tech = session.get(Technician, technician_id)
        if not tech:
            raise HTTPException(404, "Técnico no encontrado")
            
        docs = session.exec(
            select(TechnicianDocument).where(TechnicianDocument.technician_id == technician_id)
        ).all()
        
        attempts = session.exec(
            select(QuizAttempt).where(QuizAttempt.technician_id == technician_id)
        ).all()
        
        attempts_summary = [
            {
                "specialization": a.specialization,
                "passed": a.passed,
                "score": a.score,
                "date": a.started_at,
                "can_retry_after": a.can_retry_after
            }
            for a in attempts
        ]
        
        return VerificationStatusResponse(
            status=tech.verification_status,
            documents=[DocumentResponse(**d.model_dump()) for d in docs],
            quiz_attempts=attempts_summary
        )

    def admin_review_documents(
        self, session: Session, technician_id: UUID, status: str, admin_id: UUID, reason: str = None
    ):
        tech = session.get(Technician, technician_id)
        if not tech:
            raise HTTPException(404, "Técnico no encontrado")
            
        docs = session.exec(
            select(TechnicianDocument).where(
                TechnicianDocument.technician_id == technician_id,
                TechnicianDocument.status == DocumentStatus.pending
            )
        ).all()
        
        if status == "approved":
            for d in docs:
                d.status = DocumentStatus.approved
                d.reviewed_at = datetime.utcnow()
                d.reviewed_by = admin_id
                session.add(d)
                
            tech.verification_status = VerificationStatus.quiz_available
        elif status == "rejected":
            for d in docs:
                d.status = DocumentStatus.rejected
                d.reviewed_at = datetime.utcnow()
                d.reviewed_by = admin_id
                d.rejection_reason = reason
                session.add(d)
                
            tech.verification_status = VerificationStatus.documents_rejected
            
        session.add(tech)
        session.commit()
        return True

    def get_quiz_questions(self, session: Session, technician_id: UUID, specialization: str) -> List[QuizQuestion]:
        tech = session.get(Technician, technician_id)
        if not tech:
            raise HTTPException(404, "Técnico no encontrado")
            
        if tech.verification_status not in [VerificationStatus.quiz_available, VerificationStatus.verified]:
            raise HTTPException(403, "Aún no tienes acceso al quiz")
            
        # Verificar si hay un intento fallido reciente que no ha expirado el tiempo de gracia (3 días)
        recent_failed = session.exec(
            select(QuizAttempt).where(
                QuizAttempt.technician_id == technician_id,
                QuizAttempt.specialization == specialization,
                QuizAttempt.passed == False
            ).order_by(QuizAttempt.started_at.desc())
        ).first()
        
        if recent_failed and recent_failed.can_retry_after and recent_failed.can_retry_after > datetime.utcnow():
            raise HTTPException(403, f"Debes esperar hasta {recent_failed.can_retry_after.strftime('%Y-%m-%d %H:%M')} para reintentar.")

        questions = session.exec(
            select(QuizQuestion).where(
                QuizQuestion.specialization == specialization,
                QuizQuestion.is_active == True
            )
        ).all()
        
        if not questions:
            raise HTTPException(404, "No hay preguntas para esta especialización")
            
        # Retornar máximo 10 preguntas aleatorias
        sampled = random.sample(questions, min(10, len(questions)))
        return sampled

    def submit_quiz(
        self, session: Session, technician_id: UUID, specialization: str, answers: QuizSubmitRequest
    ) -> QuizResultResponse:
        tech = session.get(Technician, technician_id)
        if not tech:
            raise HTTPException(404, "Técnico no encontrado")
            
        total_q = len(answers.answers)
        if total_q == 0:
            raise HTTPException(400, "No se enviaron respuestas")
            
        correct_count = 0
        recorded_answers = []
        
        for ans in answers.answers:
            q = session.get(QuizQuestion, ans.question_id)
            if not q:
                continue
                
            is_correct = (ans.selected_option_index == q.correct_option_index)
            if is_correct:
                correct_count += 1
                
            recorded_answers.append({
                "question_id": str(q.id),
                "selected": ans.selected_option_index,
                "correct": is_correct
            })
            
        score_percent = int((correct_count / total_q) * 100)
        passed = score_percent >= 70
        
        attempt = QuizAttempt(
            technician_id=technician_id,
            specialization=specialization,
            score=score_percent,
            passed=passed,
            answers=recorded_answers,
            completed_at=datetime.utcnow()
        )
        
        if not passed:
            attempt.can_retry_after = datetime.utcnow() + timedelta(days=3)
        else:
            # Si pasa el quiz, marcamos como verificado
            # TODO: Idealmente requeriríamos aprobar todas sus especializaciones,
            # por ahora si aprueba una, le damos el verified.
            tech.verification_status = VerificationStatus.verified
            tech.is_verified = True
            
            # Sumar puntos por verificarse!
            from app.services.reputation_service import reputation_service
            session.add(tech)
            session.commit() # Commit to save tech state before reputation recalculate
            reputation_service.recalculate(session, technician_id)
            
        session.add(attempt)
        session.commit()
        
        return QuizResultResponse(
            passed=passed,
            score=score_percent,
            total_questions=total_q,
            correct_answers=correct_count,
            can_retry_after=attempt.can_retry_after
        )


verification_service = VerificationService()
