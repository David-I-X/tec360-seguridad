"""
API Router para Despacho Inteligente
Path: backend/app/api/dispatch.py
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, Query, Path, status, HTTPException
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.security import require_roles
from app.models.dispatch import DispatchOffer
from app.models.service import Service
from app.schemas.dispatch import (
    DispatchOfferResponse,
    DispatchOfferListResponse,
    DispatchOfferActionResponse,
    DispatchStatsResponse,
)
from app.services.dispatch_service import dispatch_service

router = APIRouter(prefix="/dispatch", tags=["dispatch"])


@router.get(
    "/my-offers",
    response_model=DispatchOfferListResponse,
    summary="Ofertas de despacho para el técnico autenticado"
)
async def get_my_dispatch_offers(
    active_only: bool = Query(True, description="Filtrar solo ofertas activas y vigentes"),
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
    session: Session = Depends(get_session)
):
    """Obtiene la lista de ofertas de despacho dirigidas al técnico autenticado."""
    return await dispatch_service.get_technician_offers(
        session=session,
        technician_id=current_user["id"],
        active_only=active_only
    )


@router.post(
    "/offers/{offer_id}/accept",
    response_model=DispatchOfferActionResponse,
    summary="Aceptar oferta de despacho"
)
async def accept_dispatch_offer(
    offer_id: str = Path(..., description="UUID de la oferta"),
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
    session: Session = Depends(get_session)
):
    """
    Acepta una oferta de despacho asignando el servicio al técnico de forma atómica.
    Cancela las demás ofertas activas de la ola para ese servicio.
    """
    return await dispatch_service.accept_offer(
        session=session,
        offer_id=offer_id,
        technician_id=current_user["id"]
    )


@router.post(
    "/offers/{offer_id}/reject",
    response_model=DispatchOfferActionResponse,
    summary="Rechazar oferta de despacho"
)
async def reject_dispatch_offer(
    offer_id: str = Path(..., description="UUID de la oferta"),
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
    session: Session = Depends(get_session)
):
    """Declina una oferta de despacho para que el motor continúe con otros candidatos u olas."""
    return await dispatch_service.reject_offer(
        session=session,
        offer_id=offer_id,
        technician_id=current_user["id"]
    )


@router.get(
    "/service/{service_id}/offers",
    response_model=List[DispatchOfferResponse],
    summary="Historial de ofertas y olas de un servicio"
)
async def get_service_dispatch_offers(
    service_id: str = Path(..., description="UUID del servicio"),
    current_user: dict = Depends(require_roles("admin", "client")),
    session: Session = Depends(get_session)
):
    """
    Permite a administradores (o al cliente dueño del servicio) auditar el historial de olas y ofertas.
    """
    try:
        svc_uuid = UUID(service_id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de servicio inválido")

    service = session.get(Service, svc_uuid)
    if not service:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")

    if current_user["role"] == "client" and str(service.client_id) != str(current_user["id"]):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No autorizado")

    offers = session.exec(
        select(DispatchOffer).where(DispatchOffer.service_id == svc_uuid).order_by(DispatchOffer.created_at.desc())
    ).all()

    return [
        DispatchOfferResponse(
            id=str(o.id),
            service_id=str(o.service_id),
            technician_id=str(o.technician_id),
            wave=o.wave,
            status=o.status.value,
            score=o.score,
            distance_km=o.distance_km,
            offered_at=o.offered_at,
            expires_at=o.expires_at,
            responded_at=o.responded_at,
            service_title=service.title,
            service_type=service.service_type.value if hasattr(service.service_type, "value") else str(service.service_type),
        )
        for o in offers
    ]


@router.get(
    "/stats",
    response_model=DispatchStatsResponse,
    summary="Estadísticas globales del motor de despacho"
)
async def get_dispatch_statistics(
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session)
):
    """Retorna indicadores agregados de desempeño y tasas de aceptación del despacho."""
    return await dispatch_service.get_dispatch_stats(session=session)
