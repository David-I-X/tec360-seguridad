"""
Endpoints de API para servicios
Rutas públicas y protegidas para gestión de servicios técnicos
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
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
    
    **Endpoint público** - No requiere autenticación.
    
    Returns:
        Dict con lista de tipos de servicio y sus descripciones
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
    current_user: dict = Depends(get_current_user)
):
    """
    Crea una nueva solicitud de servicio.
    
    **Requiere autenticación** - Solo clientes pueden crear servicios.
    
    Args:
        service_data: Datos del servicio a crear
        current_user: Usuario autenticado (inyectado por dependencia)
    
    Returns:
        ServiceResponse con el servicio creado
    
    Raises:
        400: Datos inválidos
        401: No autenticado
        500: Error del servidor
    
    Example:
        ```json
        {
            "service_type": "gps_installation",
            "title": "Instalación GPS en camión",
            "description": "Necesito GPS satelital",
            "service_address": "Calle 50 #45-30, El Poblado",
            "service_city": "Medellín",
            "service_lat": 6.2442,
            "service_lon": -75.5636,
            "estimated_price": 350000.00
        }
        ```
    """
    # Solo clientes pueden crear servicios
    if current_user["role"] != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los clientes pueden solicitar servicios"
        )
    
    return await service_service.create_service(
        service_data=service_data,
        client_id=current_user["id"]
    )


@router.get("", response_model=ServiceListPaginated)
async def list_services(
    current_user: dict = Depends(get_current_user),
    status_filter: Optional[str] = Query(
        None, 
        description="Filtrar por estado del servicio",
        example="pending"
    ),
    service_type: Optional[str] = Query(
        None,
        description="Filtrar por tipo de servicio",
        example="gps_installation"
    ),
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(10, ge=1, le=100, description="Servicios por página")
):
    """
    Lista los servicios del usuario actual con paginación.
    
    **Requiere autenticación**
    
    - **Clientes**: Ven solo sus servicios solicitados
    - **Técnicos**: Ven solo servicios asignados a ellos
    - **Admins**: Ven todos los servicios
    
    Args:
        status_filter: Filtrar por estado (pending, assigned, in_progress, completed, cancelled)
        service_type: Filtrar por tipo de servicio
        page: Número de página (default 1)
        page_size: Tamaño de página (default 10, máximo 100)
    
    Returns:
        ServiceListPaginated con lista de servicios y metadata de paginación
    """
    return await service_service.list_services(
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
    page_size: int = Query(10, ge=1, le=100)
):
    """
    Lista servicios pendientes disponibles para tomar (Marketplace).
    
    **Requiere rol: technician o admin**
    
    Muestra servicios con status='pending' y sin técnico asignado.
    """
    return await service_service.list_available_services(
        user_id=current_user["id"],
        page=page,
        page_size=page_size
    )


@router.post("/{service_id}/accept", response_model=ServiceResponse)
async def accept_service(
    service_id: str = Path(..., description="UUID del servicio"),
    current_user: dict = Depends(require_roles("technician"))
):
    """
    Permite a un técnico aceptar (tomar) un servicio disponible.
    
    **Requiere rol: technician**
    
    El servicio debe estar 'pending' y sin asignación.
    Cambia el estado a 'assigned' y asigna al usuario actual.
    """
    return await service_service.accept_service(
        service_id=service_id,
        technician_id=current_user["id"]
    )


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(
    service_id: str = Path(..., description="UUID del servicio"),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene el detalle completo de un servicio.
    
    **Requiere autenticación**
    
    Validaciones:
    - El cliente solo puede ver sus propios servicios
    - El técnico solo puede ver servicios asignados a él
    - Los admins pueden ver cualquier servicio
    
    Args:
        service_id: UUID del servicio
    
    Returns:
        ServiceResponse con toda la información del servicio
    
    Raises:
        404: Servicio no encontrado
        403: Sin permiso para ver este servicio
    """
    return await service_service.get_service_by_id(
        service_id=service_id,
        user_id=current_user["id"],
        user_role=current_user["role"]
    )


@router.patch("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: str = Path(..., description="UUID del servicio"),
    service_data: ServiceUpdate = ...,
    current_user: dict = Depends(get_current_user)
):
    """
    Actualiza un servicio existente.
    
    **Requiere autenticación**
    
    Permisos:
    - **Clientes**: Pueden actualizar sus servicios (campos limitados)
    - **Técnicos**: Pueden actualizar servicios asignados (campos limitados)
    - **Admins**: Pueden actualizar cualquier campo
    
    Campos actualizables según rol:
    - Cliente: `client_notes`, `scheduled_date`
    - Técnico: `status`, `started_at`, `completed_at`, `technician_notes`, `final_price`
    - Admin: Todos los campos
    
    Args:
        service_id: UUID del servicio
        service_data: Campos a actualizar (solo los proporcionados se actualizan)
    
    Returns:
        ServiceResponse con el servicio actualizado
    
    Example:
        ```json
        {
            "status": "in_progress",
            "started_at": "2024-12-10T10:30:00",
            "technician_notes": "Iniciando instalación"
        }
        ```
    """
    return await service_service.update_service(
        service_id=service_id,
        service_data=service_data,
        user_id=current_user["id"],
        user_role=current_user["role"]
    )


@router.post("/{service_id}/assign", response_model=ServiceResponse)
async def assign_technician_to_service(
    service_id: str = Path(..., description="UUID del servicio"),
    assignment: ServiceAssign = ...,
    current_user: dict = Depends(require_roles("admin"))
):
    """
    Asigna un técnico a un servicio pendiente.
    
    **Requiere rol: admin**
    
    Validaciones:
    - El servicio debe estar en estado `pending`
    - El técnico debe existir y estar disponible
    - El técnico debe estar verificado
    
    Automáticamente cambia el estado del servicio a `assigned`.
    
    Args:
        service_id: UUID del servicio
        assignment: Datos de asignación (technician_id)
    
    Returns:
        ServiceResponse con el servicio actualizado
    
    Raises:
        403: Solo admins pueden asignar técnicos
        404: Servicio o técnico no encontrado
        400: El técnico no está disponible
    
    Example:
        ```json
        {
            "technician_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
        }
        ```
    """
    return await service_service.assign_technician(
        service_id=service_id,
        technician_id=assignment.technician_id,
        user_role=current_user["role"]
    )


@router.get("/{service_id}/nearby-technicians", response_model=List[NearbyTechnicianResponse])
async def find_nearby_technicians(
    service_id: str = Path(..., description="UUID del servicio"),
    max_distance: int = Query(
        20, 
        ge=1, 
        le=100, 
        description="Radio máximo de búsqueda en kilómetros"
    ),
    current_user: dict = Depends(require_roles("admin", "client"))
):
    """
    Busca técnicos cercanos disponibles para un servicio.
    
    **Requiere rol: admin o client (dueño del servicio)**
    
    Usa geolocalización PostGIS para encontrar técnicos:
    - Que estén dentro del radio especificado
    - Que estén disponibles (`is_available = true`)
    - Que estén verificados (`is_verified = true`)
    - Ordenados por distancia (más cercano primero)
    
    Args:
        service_id: UUID del servicio
        max_distance: Radio de búsqueda en km (default 20, máximo 100)
    
    Returns:
        Lista de técnicos cercanos con distancia y calificación
    
    Example response:
        ```json
        [
            {
                "technician_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                "user_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                "full_name": "Carlos Rodríguez",
                "distance_km": 3.5,
                "average_rating": 4.8,
                "specializations": ["gps_installation", "gps_maintenance"],
                "is_available": true
            }
        ]
        ```
    """
    return await service_service.find_nearby_technicians(
        service_id=service_id,
        max_distance_km=max_distance
    )


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_service(
    service_id: str = Path(..., description="UUID del servicio"),
    current_user: dict = Depends(get_current_user)
):
    """
    Cancela un servicio.
    
    **Requiere autenticación**
    
    Permisos:
    - **Clientes**: Pueden cancelar sus propios servicios
    - **Admins**: Pueden cancelar cualquier servicio
    
    Solo se pueden cancelar servicios en estado:
    - `pending` (antes de asignar)
    - `assigned` (después de asignar pero antes de iniciar)
    
    NO se pueden cancelar servicios:
    - `in_progress` (ya iniciados)
    - `completed` (ya completados)
    - `cancelled` (ya cancelados)
    
    Args:
        service_id: UUID del servicio
    
    Raises:
        403: Sin permiso para cancelar este servicio
        404: Servicio no encontrado
        400: El servicio no se puede cancelar (estado inválido)
    """
    # Validar permisos
    if current_user["role"] not in ["client", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo clientes y admins pueden cancelar servicios"
        )
    
    # Actualizar estado a cancelado
    await service_service.update_service(
        service_id=service_id,
        service_data=ServiceUpdate(status="cancelled"),
        user_id=current_user["id"],
        user_role=current_user["role"]
    )
    
    return None  # 204 No Content


# ============================================
# ENDPOINTS PARA ESTADÍSTICAS (BONUS)
# ============================================

@router.get("/stats/summary", response_model=dict)
async def get_service_stats(
    current_user: dict = Depends(get_current_user)
):
    """
    Obtiene estadísticas de servicios del usuario.
    
    **Requiere autenticación**
    
    Retorna diferentes estadísticas según el rol:
    - **Cliente**: Total de servicios, pendientes, completados, cancelados
    - **Técnico**: Servicios asignados, completados, calificación promedio
    - **Admin**: Estadísticas globales de la plataforma
    
    Returns:
        Dict con estadísticas relevantes al rol del usuario
    
    Example response (cliente):
        ```json
        {
            "total_services": 15,
            "pending": 2,
            "in_progress": 1,
            "completed": 10,
            "cancelled": 2,
            "total_spent": 4500000.00
        }
        ```
    
    Example response (técnico):
        ```json
        {
            "total_assigned": 50,
            "completed": 45,
            "in_progress": 2,
            "average_rating": 4.8,
            "total_earned": 15000000.00
        }
        ```
    """
    # TODO: Implementar lógica de estadísticas
    # Por ahora retornamos mock data
    
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


# ============================================
# ENDPOINTS DE BÚSQUEDA Y FILTROS AVANZADOS
# ============================================

@router.get("/search", response_model=ServiceListPaginated)
async def search_services(
    q: str = Query(..., min_length=3, description="Término de búsqueda (mínimo 3 caracteres)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(require_roles("admin"))
):
    """
    Búsqueda avanzada de servicios por texto.
    
    **Requiere rol: admin**
    
    Busca en:
    - Título del servicio
    - Descripción
    - Dirección
    - Notas del cliente
    
    Args:
        q: Término de búsqueda (mínimo 3 caracteres)
        page: Número de página
        page_size: Tamaño de página
    
    Returns:
        ServiceListPaginated con resultados de búsqueda
    
    Example:
        GET /services/search?q=GPS&page=1&page_size=10
    """
    # TODO: Implementar búsqueda full-text con PostgreSQL
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Búsqueda de texto completo próximamente"
    )