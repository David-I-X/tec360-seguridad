"""
Endpoint público de reputación de técnicos
"""
from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.core.database import get_session
from app.schemas.reputation import TechnicianReputation
from app.services.reputation_service import reputation_service

router = APIRouter(prefix="/reputation", tags=["reputation"])


@router.get("/{technician_id}", response_model=TechnicianReputation)
async def get_technician_reputation(
    technician_id: str,
    session: Session = Depends(get_session),
):
    """Obtener reputación pública de un técnico: puntos, nivel, desglose"""
    return await reputation_service.get_reputation(
        session=session,
        technician_id=technician_id,
    )
