"""
API de Créditos — Endpoints para el sistema de comisiones.

Endpoints:
- GET  /credits/balance      → Saldo actual del técnico
- GET  /credits/transactions  → Historial de movimientos
- POST /credits/recharge      → Recargar créditos (simula pago por ahora)
- GET  /credits/check/{service_id} → ¿Puede aceptar este servicio?
- POST /credits/admin/bonus   → Admin otorga bonificación
"""
from typing import Optional, List, Union
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session
from pydantic import BaseModel, Field
from datetime import datetime

from app.core.database import get_session
from app.core.security import require_roles
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
    amount: float = 50000.0
    external_reference: Optional[str] = None
    payment_method: Optional[str] = None


class RechargeIntentRequest(BaseModel):
    amount: float = Field(default=50000.0, gt=0, description="Monto en COP a recargar")
    payment_method: str = Field(default="pse", description="pse | nequi | daviplata | card")
    bank_name: Optional[str] = None
    card_last_four: Optional[str] = None


class RechargeIntentResponse(BaseModel):
    transaction_id: str
    status: str = "processing"
    payment_method: str
    amount: float
    message: str = "Iniciando recarga en pasarela..."


class RechargeConfirmRequest(BaseModel):
    transaction_id: str
    amount: Optional[float] = 50000.0
    payment_method: Optional[str] = "pse"
    bank_name: Optional[str] = None


class RechargeConfirmResponse(BaseModel):
    id: Optional[str] = None
    transaction_id: str
    status: str = "completed"
    amount: float
    balance_after: float
    message: str = "Recarga de saldo acreditada exitosamente"


class TransactionResponse(BaseModel):
    id: Union[UUID, str]
    technician_id: Union[UUID, str]
    transaction_type: str
    amount: float
    balance_after: float
    service_id: Optional[Union[UUID, str]] = None
    description: str = ""
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
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
    session: Session = Depends(get_session),
):
    """Obtiene el saldo de créditos del técnico autenticado."""
    data = await credit_service.get_balance(session, current_user["id"])
    return BalanceResponse(**data)


@router.get("/transactions", response_model=List[TransactionResponse])
async def get_my_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
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
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
    session: Session = Depends(get_session),
):
    """
    Recarga de créditos directa o manual.
    """
    desc = "Recarga de créditos"
    if data.payment_method:
        desc = f"Recarga de créditos via {data.payment_method.upper()}"
    effective_amount = data.amount if (data.amount and data.amount > 0) else 50000.0
    txn = await credit_service.recharge(
        session=session,
        technician_id=current_user["id"],
        amount=effective_amount,
        external_reference=data.external_reference,
        description=desc,
    )
    return txn


@router.post("/recharge/intent", response_model=RechargeIntentResponse, status_code=201)
async def create_recharge_intent(
    data: RechargeIntentRequest,
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
    session: Session = Depends(get_session),
):
    """Inicia la recarga de saldo mediante la pasarela digital (sandbox)."""
    tx_id = f"sandbox-rech-{uuid4().hex[:14]}"
    effective_amount = data.amount if (data.amount and data.amount > 0) else 50000.0
    return RechargeIntentResponse(
        transaction_id=tx_id,
        status="processing",
        payment_method=data.payment_method,
        amount=effective_amount,
        message="Pasarela digital sandbox iniciada para recarga",
    )


@router.post("/recharge/confirm", response_model=RechargeConfirmResponse, status_code=200)
async def confirm_recharge_intent(
    data: RechargeConfirmRequest,
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
    session: Session = Depends(get_session),
):
    """Confirma la recarga digital tras la validación de la pasarela sandbox."""
    method_labels = {
        "pse": f"PSE ({data.bank_name or 'Bancolombia'})",
        "card": "Tarjeta Débito/Crédito",
        "nequi": "Nequi",
        "daviplata": "Daviplata",
    }
    method_str = method_labels.get(data.payment_method, (data.payment_method or "SANDBOX").upper())
    desc = f"Recarga de créditos via {method_str}"

    effective_amount = data.amount if (data.amount and data.amount > 0) else 50000.0

    txn = await credit_service.recharge(
        session=session,
        technician_id=current_user["id"],
        amount=effective_amount,
        external_reference=data.transaction_id,
        description=desc,
    )
    return RechargeConfirmResponse(
        id=str(txn.id),
        transaction_id=data.transaction_id,
        status="completed",
        amount=effective_amount,
        balance_after=txn.balance_after,
        message="Recarga de saldo acreditada exitosamente",
    )


@router.get("/check/{service_id}", response_model=CanAcceptResponse)
async def check_can_accept(
    service_id: str,
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
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
