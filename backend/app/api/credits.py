"""
API de Créditos — Endpoints para el sistema de comisiones.

Endpoints:
- GET  /credits/balance      → Saldo actual del técnico
- GET  /credits/transactions  → Historial de movimientos
- POST /credits/recharge      → Recargar créditos (simula pago por ahora)
- GET  /credits/check/{service_id} → ¿Puede aceptar este servicio?
- POST /credits/admin/bonus   → Admin otorga bonificación
"""
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_session
from app.core.security import get_current_user, require_roles
from app.services.credit_service import credit_service
from app.models.service import Service


router = APIRouter(prefix="/credits", tags=["credits"])


# ── Schemas ────────────────────────────────────

class BalanceResponse(BaseModel):
    balance: float
    total_recharged: float
    total_consumed: float
    free_services_remaining: int
    can_accept_services: bool
    commission_rate: float


class RechargeRequest(BaseModel):
    amount: float
    external_reference: Optional[str] = None


class TransactionResponse(BaseModel):
    id: UUID
    technician_id: UUID
    transaction_type: str
    amount: float
    balance_after: float
    service_id: Optional[UUID] = None
    description: str
    external_reference: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CanAcceptResponse(BaseModel):
    can_accept: bool
    reason: str
    commission: float
    is_free: bool
    free_remaining: Optional[int] = None
    balance: Optional[float] = None
    deficit: Optional[float] = None


class AdminBonusRequest(BaseModel):
    technician_id: str
    amount: float
    description: str = "Bonificación administrativa"


# ── Endpoints de Técnico ───────────────────────

@router.get("/balance", response_model=BalanceResponse)
async def get_my_balance(
    current_user: dict = Depends(require_roles("technician")),
    session: Session = Depends(get_session),
):
    """Obtiene el saldo de créditos del técnico autenticado."""
    data = await credit_service.get_balance(session, current_user["id"])
    return BalanceResponse(**data)


@router.get("/transactions", response_model=List[TransactionResponse])
async def get_my_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(require_roles("technician")),
    session: Session = Depends(get_session),
):
    """Historial de movimientos de créditos del técnico."""
    txns = await credit_service.get_transactions(
        session, current_user["id"], skip=skip, limit=limit
    )
    return txns


@router.post("/recharge", response_model=TransactionResponse, status_code=201)
async def recharge_credits(
    data: RechargeRequest,
    current_user: dict = Depends(require_roles("technician")),
    session: Session = Depends(get_session),
):
    """
    Recarga de créditos.
    Por ahora simula el pago. Cuando se integre Wompi, este endpoint
    recibirá el webhook de confirmación.
    """
    txn = await credit_service.recharge(
        session=session,
        technician_id=current_user["id"],
        amount=data.amount,
        external_reference=data.external_reference,
    )
    return txn


@router.get("/check/{service_id}", response_model=CanAcceptResponse)
async def check_can_accept(
    service_id: str,
    current_user: dict = Depends(require_roles("technician")),
    session: Session = Depends(get_session),
):
    """Verifica si el técnico puede aceptar un servicio dado su saldo."""
    service = session.get(Service, UUID(service_id))
    if not service:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")

    service_amount = service.estimated_price or 250000  # Default si no tiene precio
    result = await credit_service.can_accept_service(
        session, current_user["id"], service_amount
    )
    return CanAcceptResponse(**result)


# ── Endpoints de Admin ─────────────────────────

@router.post("/admin/bonus", response_model=TransactionResponse, status_code=201)
async def admin_grant_bonus(
    data: AdminBonusRequest,
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session),
):
    """Admin otorga una bonificación de créditos a un técnico."""
    txn = await credit_service.recharge(
        session=session,
        technician_id=data.technician_id,
        amount=data.amount,
        description=data.description,
    )
    return txn


@router.get("/admin/{technician_id}/balance", response_model=BalanceResponse)
async def admin_get_balance(
    technician_id: str,
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session),
):
    """Admin consulta el saldo de un técnico específico."""
    data = await credit_service.get_balance(session, technician_id)
    return BalanceResponse(**data)
