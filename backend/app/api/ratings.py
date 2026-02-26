"""
Endpoints de FastAPI para el sistema de calificaciones
Path: backend/app/api/ratings.py
Refactorizado para usar SQLModel Session
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session
from app.core.database import get_session
from app.core.security import get_current_user, require_roles
from app.schemas.rating import (
    RatingCreate, RatingResponse, RatingListResponse,
    RatingStats, ServiceRatingResponse, CanRateServiceResponse
)
from app.services.rating_service import rating_service

router = APIRouter(prefix="/ratings", tags=["ratings"])


# ============================================
# ENDPOINTS DE CLIENTE (crear calificación)
# ============================================

@router.post(
    "/services/{service_id}",
    response_model=RatingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear calificación de servicio"
)
async def create_service_rating(
    service_id: str,
    rating_data: RatingCreate,
    current_user: dict = Depends(require_roles("client")),
    session: Session = Depends(get_session)
):
    """
    Crear calificación de un servicio
    """
    return await rating_service.create_rating(
        session=session,
        service_id=service_id,
        rating_data=rating_data,
        client_id=current_user["id"]
    )


@router.post(
    "/services/{service_id}/technician",
    response_model=RatingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Técnico califica al cliente"
)
async def create_technician_rating(
    service_id: str,
    rating_data: RatingCreate,
    current_user: dict = Depends(require_roles("technician")),
    session: Session = Depends(get_session)
):
    """
    Técnico califica a un cliente después de completar un servicio
    """
    return await rating_service.create_technician_rating(
        session=session,
        service_id=service_id,
        rating_data=rating_data,
        technician_user_id=current_user["id"]
    )


@router.get(
    "/services/{service_id}/can-rate",
    response_model=CanRateServiceResponse,
    summary="Verificar si se puede calificar un servicio"
)
async def check_can_rate_service(
    service_id: str,
    current_user: dict = Depends(require_roles("client")),
    session: Session = Depends(get_session)
):
    """
    Verificar si un cliente puede calificar un servicio
    """
    result = await rating_service.can_rate_service(
        session=session,
        service_id=service_id,
        client_id=current_user["id"]
    )
    
    return CanRateServiceResponse(
        can_rate=result["can_rate"],
        reason=result["reason"],
        service_status=result["service_status"]
    )


# ============================================
# ENDPOINTS PÚBLICOS (consultar calificaciones)
# ============================================

@router.get(
    "/technicians/{technician_id}",
    response_model=RatingListResponse,
    summary="Obtener calificaciones de un técnico"
)
async def get_technician_ratings(
    technician_id: str,
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(10, ge=1, le=50, description="Elementos por página"),
    session: Session = Depends(get_session)
):
    """
    Obtener calificaciones de un técnico con paginación
    """
    return await rating_service.get_technician_ratings(
        session=session,
        technician_id=technician_id,
        page=page,
        page_size=page_size
    )


@router.get(
    "/technicians/{technician_id}/stats",
    response_model=RatingStats,
    summary="Obtener estadísticas de calificaciones de un técnico"
)
async def get_technician_rating_stats(
    technician_id: str,
    session: Session = Depends(get_session)
):
    """
    Obtener estadísticas detalladas de calificaciones
    """
    return await rating_service.get_technician_rating_stats(
        session=session,
        technician_id=technician_id
    )


# ============================================
# ENDPOINTS PROTEGIDOS (ver calificación propia)
# ============================================

@router.get(
    "/services/{service_id}",
    response_model=ServiceRatingResponse,
    summary="Obtener calificación de un servicio"
)
async def get_service_rating(
    service_id: str,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Obtener calificación de un servicio específico
    """
    return await rating_service.get_service_rating(
        session=session,
        service_id=service_id,
        user_id=current_user["id"],
        user_role=current_user["role"]
    )


# ============================================
# ENDPOINTS DE TÉCNICO (mis calificaciones)
# ============================================

@router.get(
    "/me",
    response_model=RatingListResponse,
    summary="Obtener mis calificaciones (técnico)"
)
async def get_my_ratings(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(require_roles("technician")),
    session: Session = Depends(get_session)
):
    """
    Técnico obtiene sus propias calificaciones
    """
    return await rating_service.get_technician_ratings(
        session=session,
        technician_id=current_user["id"],
        page=page,
        page_size=page_size
    )


@router.get(
    "/me/stats",
    response_model=RatingStats,
    summary="Obtener mis estadísticas (técnico)"
)
async def get_my_rating_stats(
    current_user: dict = Depends(require_roles("technician")),
    session: Session = Depends(get_session)
):
    """
    Técnico obtiene sus estadísticas de calificaciones
    """
    return await rating_service.get_technician_rating_stats(
        session=session,
        technician_id=current_user["id"]
    )