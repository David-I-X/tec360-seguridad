"""
Endpoints de API para servicios
Rutas públicas y protegidas para gestión de servicios técnicos
Refactorizado para usar SQLModel Session
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from sqlmodel import Session
from app.core.database import get_session
from app.core.security import get_current_user, require_roles, get_user_id
from app.schemas.service import (
    ServiceCreate,
    ServiceUpdate,
    ServiceResponse,
    ServiceListPaginated,
    ServiceAssign,
    NearbyTechnicianResponse
)
from app.services.service_service import service_service


router = APIRouter(prefix="/services", tags=["Services"])


# ============================================
# ENDPOINTS PÚBLICOS
# ============================================

@router.get("/types", response_model=dict)
async def get_service_types():
    """
    Obtiene la lista de tipos de servicio disponibles.
    **Endpoint público**
    """
    return {
        "service_types": [
            {
                "value": "gps_installation",
                "label": "Instalación de GPS",
                "description": "Instalación de sistemas de rastreo GPS satelital"
            },
            {
                "value": "gps_maintenance",
                "label": "Mantenimiento de GPS",
                "description": "Revisión y mantenimiento de equipos GPS"
            },
            {
                "value": "alarm_installation",
                "label": "Instalación de Alarmas",
                "description": "Instalación de sistemas de alarma de seguridad"
            },
            {
                "value": "alarm_maintenance",
                "label": "Mantenimiento de Alarmas",
                "description": "Mantenimiento de sistemas de alarma"
            },
            {
                "value": "camera_installation",
                "label": "Instalación de Cámaras",
                "description": "Instalación de sistemas de videovigilancia"
            },
            {
                "value": "camera_maintenance",
                "label": "Mantenimiento de Cámaras",
                "description": "Mantenimiento de cámaras de seguridad"
            },
            {
                "value": "other",
                "label": "Otro",
                "description": "Otros servicios de seguridad"
            }
        ]
    }


# ============================================
# ENDPOINTS PROTEGIDOS - SERVICIOS
# ============================================

@router.post("", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    service_data: ServiceCreate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Crea una nueva solicitud de servicio.
    **Requiere autenticación** - Solo clientes.
    """
    if current_user["role"] != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los clientes pueden solicitar servicios"
        )
    
    return await service_service.create_service(
        session=session,
        service_data=service_data,
        user=current_user
    )


@router.get("", response_model=ServiceListPaginated)
async def list_services(
    current_user: dict = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, description="Filtrar por estado"),
    service_type: Optional[str] = Query(None, description="Filtrar por tipo"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    session: Session = Depends(get_session)
):
    """
    Lista los servicios del usuario actual con paginación.
    """
    return await service_service.list_services(
        session=session,
        user_id=current_user["id"],
        user_role=current_user["role"],
        status_filter=status_filter,
        service_type_filter=service_type,
        page=page,
        page_size=page_size
    )


@router.get("/available", response_model=ServiceListPaginated)
async def list_available_services(
    current_user: dict = Depends(require_roles("technician", "admin")),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    session: Session = Depends(get_session)
):
    """
    Lista servicios pendientes disponibles para tomar (Marketplace).
    **Requiere rol: technician o admin**
    """
    return await service_service.list_available_services(
        session=session,
        user_id=current_user["id"],
        page=page,
        page_size=page_size
    )


@router.post("/{service_id}/accept", response_model=ServiceResponse)
async def accept_service(
    service_id: str = Path(..., description="UUID del servicio"),
    current_user: dict = Depends(require_roles("technician")),
    session: Session = Depends(get_session)
):
    """
    Permite a un técnico aceptar un servicio disponible.
    """
    return await service_service.accept_service(
        session=session,
        service_id=service_id,
        technician_id=current_user["id"]
    )


@router.patch("/{service_id}/status")
async def update_service_status(
    service_id: str = Path(..., description="UUID del servicio"),
    new_status: str = Query(..., description="Nuevo estado: en_route, arrived, in_progress, completed"),
    current_user: dict = Depends(require_roles("technician")),
    session: Session = Depends(get_session)
):
    """
    Permite al técnico asignado actualizar el estado del servicio.
    Estados válidos: en_route (en camino), arrived (llegué), in_progress (en progreso), completed (completado).
    """
    return await service_service.update_service_status(
        session=session,
        service_id=service_id,
        technician_id=current_user["id"],
        new_status=new_status,
        technician_name=current_user.get("full_name")
    )


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(
    service_id: str = Path(..., description="UUID del servicio"),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Obtiene el detalle completo de un servicio.
    """
    return await service_service.get_service_by_id(
        session=session,
        service_id=service_id,
        user_id=current_user["id"],
        user_role=current_user["role"]
    )


@router.patch("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: str = Path(..., description="UUID del servicio"),
    service_data: ServiceUpdate = ...,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Actualiza un servicio existente.
    """
    return await service_service.update_service(
        session=session,
        service_id=service_id,
        service_data=service_data,
        user_id=current_user["id"],
        user_role=current_user["role"]
    )


@router.post("/{service_id}/assign", response_model=ServiceResponse)
async def assign_technician_to_service(
    service_id: str = Path(..., description="UUID del servicio"),
    assignment: ServiceAssign = ...,
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session)
):
    """
    Asigna un técnico a un servicio pendiente.
    **Requiere rol: admin**
    """
    return await service_service.assign_technician(
        session=session,
        service_id=service_id,
        technician_id=assignment.technician_id,
        user_role=current_user["role"]
    )


@router.get("/{service_id}/nearby-technicians", response_model=List[NearbyTechnicianResponse])
async def find_nearby_technicians(
    service_id: str = Path(..., description="UUID del servicio"),
    max_distance: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_roles("admin", "client")),
    session: Session = Depends(get_session)
):
    """
    Busca técnicos cercanos disponibles.
    """
    return await service_service.find_nearby_technicians(
        session=session,
        service_id=service_id,
        max_distance_km=max_distance
    )


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_service(
    service_id: str = Path(..., description="UUID del servicio"),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Cancela un servicio.
    """
    if current_user["role"] not in ["client", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo clientes y admins pueden cancelar servicios"
        )
    
    await service_service.update_service(
        session=session,
        service_id=service_id,
        service_data=ServiceUpdate(status="cancelled"),
        user_id=current_user["id"],
        user_role=current_user["role"]
    )
    
    return None


# ============================================
# ENDPOINTS PARA ESTADÍSTICAS (BONUS)
# ============================================

@router.get("/stats/summary", response_model=dict)
async def get_service_stats(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Obtiene estadísticas de servicios.
    Mocked for now.
    """
    if current_user["role"] == "client":
        return {
            "total_services": 0,
            "pending": 0,
            "in_progress": 0,
            "completed": 0,
            "cancelled": 0,
            "total_spent": 0.00
        }
    elif current_user["role"] == "technician":
        return {
            "total_assigned": 0,
            "completed": 0,
            "in_progress": 0,
            "average_rating": 0.00,
            "total_earned": 0.00
        }
    else:  # admin
        return {
            "total_services": 0,
            "total_technicians": 0,
            "total_clients": 0,
            "pending_services": 0,
            "active_services": 0
        }


@router.get("/search", response_model=ServiceListPaginated)
async def search_services(
    q: str = Query(..., min_length=3),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session)
):
    """
    Búsqueda avanzada de servicios.
    **Requiere rol: admin**
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Búsqueda de texto completo próximamente"
    )