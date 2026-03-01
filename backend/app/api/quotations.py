"""
Endpoints de FastAPI para el sistema de cotizaciones
Path: backend/app/api/quotations.py
"""
from fastapi import APIRouter, Depends, status, Query
from sqlmodel import Session
from typing import List, Optional

from app.core.database import get_session
from app.core.security import get_current_user, require_roles
from app.schemas.quotation import (
    QuotationCreate, QuotationResponse, QuotationListResponse,
    QuotationCounterOffer, QuotationReject
)
from app.services.quotation_service import quotation_service


router = APIRouter(prefix="/quotations", tags=["quotations"])


# ============================================
# ENDPOINTS DE TÉCNICO
# ============================================

@router.post(
    "/service/{service_id}",
    response_model=QuotationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Enviar cotización para un servicio"
)
async def create_quotation(
    service_id: str,
    quotation_data: QuotationCreate,
    current_user: dict = Depends(require_roles("technician")),
    session: Session = Depends(get_session)
):
    """
    Técnico envía una cotización para un servicio pendiente.
    
    - **amount**: Monto del presupuesto (requerido)
    - **description**: Desglose del presupuesto (requerido, min 10 caracteres)
    - **expires_in_hours**: Horas de validez (opcional, máx 168 = 7 días)
    """
    return await quotation_service.create_quotation(
        session=session,
        service_id=service_id,
        quotation_data=quotation_data,
        technician_id=current_user["id"]
    )


@router.get(
    "/me",
    response_model=QuotationListResponse,
    summary="Mis cotizaciones enviadas"
)
async def get_my_quotations(
    status_filter: Optional[str] = Query(None, description="Filtrar por estado"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(require_roles("technician")),
    session: Session = Depends(get_session)
):
    """
    Obtener mis cotizaciones enviadas.
    Filtros opcionales por estado: pending, approved, rejected, counter_offered
    """
    return await quotation_service.get_my_quotations(
        session=session,
        technician_id=current_user["id"],
        status_filter=status_filter,
        page=page,
        page_size=page_size
    )


# ============================================
# ENDPOINTS DE SERVICIO
# ============================================

@router.get(
    "/service/{service_id}",
    response_model=List[QuotationResponse],
    summary="Ver cotizaciones de un servicio"
)
async def get_service_quotations(
    service_id: str,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Ver cotizaciones de un servicio.
    
    - **Cliente**: Ve todas las cotizaciones de su servicio
    - **Técnico**: Solo ve su propia cotización
    - **Admin**: Ve todas
    """
    return await quotation_service.get_service_quotations(
        session=session,
        service_id=service_id,
        user_id=current_user["id"],
        user_role=current_user["role"]
    )


# ============================================
# ENDPOINTS DE CLIENTE (respuestas)
# ============================================

@router.patch(
    "/{quotation_id}/approve",
    response_model=QuotationResponse,
    summary="Aprobar cotización"
)
async def approve_quotation(
    quotation_id: str,
    current_user: dict = Depends(require_roles("client")),
    session: Session = Depends(get_session)
):
    """
    Cliente aprueba una cotización.
    
    - Asigna automáticamente al técnico
    - Cambia estado del servicio a 'assigned'
    - Rechaza automáticamente otras cotizaciones pendientes
    - Notifica al técnico ganador
    """
    return await quotation_service.approve_quotation(
        session=session,
        quotation_id=quotation_id,
        client_id=current_user["id"]
    )


@router.patch(
    "/{quotation_id}/reject",
    response_model=QuotationResponse,
    summary="Rechazar cotización"
)
async def reject_quotation(
    quotation_id: str,
    rejection: QuotationReject = None,
    current_user: dict = Depends(require_roles("client")),
    session: Session = Depends(get_session)
):
    """
    Cliente rechaza una cotización.
    Puede incluir una razón opcional.
    """
    if rejection is None:
        rejection = QuotationReject()
    
    return await quotation_service.reject_quotation(
        session=session,
        quotation_id=quotation_id,
        client_id=current_user["id"],
        rejection=rejection
    )


@router.patch(
    "/{quotation_id}/counter",
    response_model=QuotationResponse,
    summary="Hacer contraoferta"
)
async def counter_offer(
    quotation_id: str,
    counter_data: QuotationCounterOffer,
    current_user: dict = Depends(require_roles("client")),
    session: Session = Depends(get_session)
):
    """
    Cliente hace una contraoferta.
    
    - **counter_amount**: Monto propuesto por el cliente
    - **client_response**: Comentario explicativo (opcional)
    
    El técnico recibirá notificación y puede aceptar, rechazar o modificar su cotización.
    """
    return await quotation_service.counter_offer(
        session=session,
        quotation_id=quotation_id,
        client_id=current_user["id"],
        counter_data=counter_data
    )


# ============================================
# ENDPOINTS DE TÉCNICO (respuestas a contraoferta)
# ============================================

@router.patch(
    "/{quotation_id}/accept-counter",
    response_model=QuotationResponse,
    summary="Técnico acepta contraoferta"
)
async def accept_counter_offer(
    quotation_id: str,
    current_user: dict = Depends(require_roles("technician")),
    session: Session = Depends(get_session)
):
    """
    Técnico acepta la contraoferta del cliente.
    
    - La cotización se actualiza con el nuevo monto
    - El estado cambia a 'pending' para aprobación final del cliente
    - Se notifica al cliente
    """
    return await quotation_service.accept_counter_offer(
        session=session,
        quotation_id=quotation_id,
        technician_id=current_user["id"]
    )


@router.patch(
    "/{quotation_id}/reject-counter",
    response_model=QuotationResponse,
    summary="Técnico rechaza contraoferta"
)
async def reject_counter_offer(
    quotation_id: str,
    current_user: dict = Depends(require_roles("technician")),
    session: Session = Depends(get_session)
):
    """
    Técnico rechaza la contraoferta del cliente.
    
    - La cotización se cancela
    - Se notifica al cliente
    """
    return await quotation_service.reject_counter_offer(
        session=session,
        quotation_id=quotation_id,
        technician_id=current_user["id"]
    )

