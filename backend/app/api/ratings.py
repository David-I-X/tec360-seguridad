"""
Endpoints de FastAPI para el sistema de calificaciones
Path: backend/app/api/ratings.py
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
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
    summary="Crear calificación de servicio",
    description="""
    Permite a un cliente calificar un servicio completado.
    
    **Validaciones:**
    - El servicio debe existir
    - El servicio debe estar en estado 'completed'
    - El cliente debe ser el dueño del servicio
    - El servicio no debe tener ya una calificación
    
    **Roles permitidos:** client
    """
)
async def create_service_rating(
    service_id: str,
    rating_data: RatingCreate,
    current_user: dict = Depends(require_roles("client"))
):
    """
    Crear calificación de un servicio
    
    Solo el cliente que solicitó el servicio puede calificarlo,
    y únicamente después de que el servicio esté completado.
    """
    return await rating_service.create_rating(
        service_id=service_id,
        rating_data=rating_data,
        client_id=current_user["id"]
    )


@router.get(
    "/services/{service_id}/can-rate",
    response_model=CanRateServiceResponse,
    summary="Verificar si se puede calificar un servicio",
    description="""
    Verifica si el cliente actual puede calificar un servicio.
    
    Retorna información sobre:
    - Si puede calificar o no
    - Razón por la que no puede (si aplica)
    - Estado actual del servicio
    
    **Roles permitidos:** client
    """
)
async def check_can_rate_service(
    service_id: str,
    current_user: dict = Depends(require_roles("client"))
):
    """
    Verificar si un cliente puede calificar un servicio
    """
    result = await rating_service.can_rate_service(
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
    summary="Obtener calificaciones de un técnico",
    description="""
    Lista todas las calificaciones que ha recibido un técnico.
    
    **Endpoint público** - No requiere autenticación.
    
    Incluye:
    - Lista paginada de calificaciones
    - Promedio general del técnico
    - Comentarios de clientes
    
    Útil para que los clientes vean la reputación de un técnico
    antes de solicitar un servicio.
    """
)
async def get_technician_ratings(
    technician_id: str,
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(10, ge=1, le=50, description="Elementos por página")
):
    """
    Obtener calificaciones de un técnico con paginación
    
    No requiere autenticación - Endpoint público
    """
    return await rating_service.get_technician_ratings(
        technician_id=technician_id,
        page=page,
        page_size=page_size
    )


@router.get(
    "/technicians/{technician_id}/stats",
    response_model=RatingStats,
    summary="Obtener estadísticas de calificaciones de un técnico",
    description="""
    Obtiene estadísticas detalladas de las calificaciones de un técnico.
    
    **Endpoint público** - No requiere autenticación.
    
    Incluye:
    - Promedio general
    - Total de calificaciones
    - Distribución por estrellas (cuántas de 5⭐, 4⭐, etc.)
    
    Útil para mostrar gráficos y resúmenes visuales.
    """
)
async def get_technician_rating_stats(
    technician_id: str
):
    """
    Obtener estadísticas detalladas de calificaciones
    
    No requiere autenticación - Endpoint público
    """
    return await rating_service.get_technician_rating_stats(
        technician_id=technician_id
    )


# ============================================
# ENDPOINTS PROTEGIDOS (ver calificación propia)
# ============================================

@router.get(
    "/services/{service_id}",
    response_model=ServiceRatingResponse,
    summary="Obtener calificación de un servicio",
    description="""
    Obtiene la calificación de un servicio específico.
    
    **Permisos:**
    - Cliente: puede ver la calificación de sus servicios
    - Técnico: puede ver la calificación de los servicios donde trabajó
    - Admin: puede ver cualquier calificación
    
    **Roles permitidos:** client, technician, admin
    """
)
async def get_service_rating(
    service_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener calificación de un servicio específico
    
    Verifica permisos según el rol del usuario
    """
    return await rating_service.get_service_rating(
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
    summary="Obtener mis calificaciones (técnico)",
    description="""
    Permite a un técnico ver todas las calificaciones que ha recibido.
    
    Incluye paginación y promedio general.
    
    **Roles permitidos:** technician
    """
)
async def get_my_ratings(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(require_roles("technician"))
):
    """
    Técnico obtiene sus propias calificaciones
    """
    return await rating_service.get_technician_ratings(
        technician_id=current_user["id"],
        page=page,
        page_size=page_size
    )


@router.get(
    "/me/stats",
    response_model=RatingStats,
    summary="Obtener mis estadísticas (técnico)",
    description="""
    Permite a un técnico ver estadísticas detalladas de sus calificaciones.
    
    **Roles permitidos:** technician
    """
)
async def get_my_rating_stats(
    current_user: dict = Depends(require_roles("technician"))
):
    """
    Técnico obtiene sus estadísticas de calificaciones
    """
    return await rating_service.get_technician_rating_stats(
        technician_id=current_user["id"]
    )


# ============================================
# RESUMEN DE ENDPOINTS
# ============================================

"""
ENDPOINTS DISPONIBLES:

📝 CLIENTE:
  POST   /ratings/services/{service_id}               - Crear calificación
  GET    /ratings/services/{service_id}/can-rate      - Verificar si puede calificar

👁️ PÚBLICOS (sin auth):
  GET    /ratings/technicians/{technician_id}         - Listar calificaciones de técnico
  GET    /ratings/technicians/{technician_id}/stats   - Stats de técnico

🔒 PROTEGIDOS:
  GET    /ratings/services/{service_id}               - Ver calificación de servicio

🛠️ TÉCNICO:
  GET    /ratings/me                                   - Mis calificaciones
  GET    /ratings/me/stats                             - Mis estadísticas

TOTAL: 7 endpoints
"""