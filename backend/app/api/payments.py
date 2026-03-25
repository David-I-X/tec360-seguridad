"""
Endpoints de API para pagos — Tec360 Seguridad
Feature-flagged: PAYMENTS_ENABLED=false por defecto

Soporta:
- Pago en efectivo (confirmado por técnico, validado por admin)
- Pago digital via Wompi (PSE, Nequi, Daviplata, tarjeta) — futuro
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.core.database import get_session
from app.core.config import settings
from app.core.security import get_current_user, require_roles
from app.schemas.payment import CashPaymentConfirm, PaymentResponse, PaymentListResponse
from app.services.payment_service import payment_service

router = APIRouter(prefix="/payments", tags=["payments"])


def _check_payments_enabled():
    """Guard: block all payment endpoints if feature is disabled"""
    if not settings.PAYMENTS_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payments feature is not enabled"
        )


# ============================================
# ENDPOINTS DE TÉCNICO
# ============================================

@router.post("/cash/confirm", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def confirm_cash_payment(
    data: CashPaymentConfirm,
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
    session: Session = Depends(get_session),
):
    """
    Técnico confirma que recibió pago en efectivo del cliente.
    El pago queda como 'confirmed_by_technician' hasta que el admin lo valide.
    """
    _check_payments_enabled()
    return await payment_service.confirm_cash_payment(
        session=session,
        data=data,
        technician_id=current_user["id"],
    )


# ============================================
# ENDPOINTS COMPARTIDOS
# ============================================

@router.get("/service/{service_id}", response_model=Optional[PaymentResponse])
async def get_service_payment(
    service_id: str,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Obtiene la info de pago de un servicio específico"""
    _check_payments_enabled()
    result = await payment_service.get_service_payment(
        session=session,
        service_id=service_id,
    )
    return result


# ============================================
# ENDPOINTS DE ADMIN
# ============================================

@router.get("", response_model=PaymentListResponse)
async def list_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status", description="Filtrar por estado"),
    method: Optional[str] = Query(None, description="Filtrar por método: cash, pse, nequi, card"),
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session),
):
    """Admin: lista todos los pagos con filtros"""
    _check_payments_enabled()
    return await payment_service.list_payments(
        session=session,
        skip=skip,
        limit=limit,
        status_filter=status_filter,
        method_filter=method,
    )


@router.put("/{payment_id}/validate", response_model=PaymentResponse)
async def admin_validate_payment(
    payment_id: str,
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session),
):
    """Admin valida un pago en efectivo confirmado por el técnico"""
    _check_payments_enabled()
    return await payment_service.admin_confirm_payment(
        session=session,
        payment_id=payment_id,
        admin_id=current_user["id"],
    )
