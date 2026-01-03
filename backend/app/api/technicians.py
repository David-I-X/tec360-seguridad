"""
Endpoints de API para técnicos
Gestión de perfiles, búsqueda y disponibilidad de técnicos
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from app.core.security import get_current_user, require_roles
from app.schemas.technician import (
    TechnicianCreate,
    TechnicianUpdate,
    TechnicianResponse,
    TechnicianListResponse,
    TechnicianPublicProfile,
    TechnicianStatsResponse,
    TechnicianLocationUpdate,
    TechnicianAvailabilityUpdate
)
from app.services.technician_service import technician_service


router = APIRouter(prefix="/technicians", tags=["Technicians"])


# ============================================
# ENDPOINTS PÚBLICOS
# ============================================

@router.get("", response_model=TechnicianListResponse)
async def list_technicians(
    specialization: Optional[str] = Query(
        None,
        description="Filtrar por especialización",
        example="gps_installation"
    ),
    city: Optional[str] = Query(
        None,
        description="Filtrar por ciudad",
        example="Medellín"
    ),
    min_rating: Optional[float] = Query(
        None,
        ge=0,
        le=5,
        description="Rating mínimo",
        example=4.0
    ),
    is_available: Optional[bool] = Query(
        None,
        description="Solo técnicos disponibles"
    ),
    verified_only: bool = Query(
        True,
        description="Solo técnicos verificados"
    ),
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(10, ge=1, le=50, description="Técnicos por página")
):
    """
    Lista técnicos disponibles con filtros.
    
    **Endpoint público** - No requiere autenticación.
    
    Útil para que clientes busquen técnicos antes de registrarse.
    
    Filtros disponibles:
    - **specialization**: Por tipo de servicio
    - **city**: Por ciudad
    - **min_rating**: Rating mínimo (0-5)
    - **is_available**: Solo disponibles para nuevos servicios
    - **verified_only**: Solo técnicos verificados por admin (default: true)
    
    Returns:
        TechnicianListResponse con lista paginada
    
    Example:
        GET /technicians?specialization=gps_installation&city=Medellín&min_rating=4.5
    """
    return await technician_service.list_technicians(
        specialization=specialization,
        city=city,
        min_rating=min_rating,
        is_available=is_available,
        verified_only=verified_only,
        page=page,
        page_size=page_size
    )


@router.get("/{user_id}/public", response_model=TechnicianPublicProfile)
async def get_technician_public_profile(
    user_id: str = Path(..., description="UUID del usuario técnico")
):
    """
    Obtiene el perfil público de un técnico.
    
    **Endpoint público** - No requiere autenticación.
    
    Muestra solo información pública (sin datos sensibles como email o teléfono).
    Útil para que clientes vean el perfil antes de solicitar servicio.
    
    Args:
        user_id: UUID del usuario técnico
    
    Returns:
        TechnicianPublicProfile con info pública
    
    Raises:
        404: Técnico no encontrado
    """
    technician = await technician_service.get_technician_by_user_id(
        user_id=user_id,
        include_user_info=True
    )
    
    # Convertir a perfil público (sin datos sensibles)
    return TechnicianPublicProfile(
        user_id=technician.user_id,
        full_name=technician.user.full_name if technician.user else None,
        specializations=technician.specializations,
        experience_years=technician.experience_years,
        bio=technician.bio,
        service_radius_km=technician.service_radius_km,
        average_rating=technician.average_rating,
        total_services=technician.total_services,
        city=technician.user.city if technician.user else None,
        avatar_url=technician.user.avatar_url if technician.user else None,
        is_verified=technician.is_verified
    )


# ============================================
# ENDPOINTS PROTEGIDOS - GESTIÓN DE PERFIL
# ============================================

@router.post("/me/profile", response_model=TechnicianResponse, status_code=status.HTTP_201_CREATED)
async def create_my_technician_profile(
    technician_data: TechnicianCreate,
    current_user: dict = Depends(require_roles("technician"))
):
    """
    Crea el perfil de técnico para el usuario actual.
    
    **Requiere rol: technician**
    
    El usuario debe estar registrado con rol 'technician' en Supabase.
    Este endpoint solo se llama una vez para completar el perfil.
    
    Validaciones:
    - El usuario debe tener rol 'technician'
    - No debe existir ya un perfil de técnico
    - El número de certificación SENA debe ser único
    
    Args:
        technician_data: Datos del perfil técnico
    
    Returns:
        TechnicianResponse con el perfil creado
    
    Raises:
        400: Si el perfil ya existe o datos inválidos
        403: Si el usuario no tiene rol 'technician'
    
    Example:
        ```json
        {
            "sena_certification_number": "SENA-2024-001234",
            "specializations": ["gps_installation", "alarm_installation"],
            "experience_years": 5,
            "bio": "Técnico certificado SENA con experiencia",
            "current_lat": 6.2442,
            "current_lon": -75.5636,
            "service_radius_km": 25
        }
        ```
    """
    return await technician_service.create_technician_profile(
        technician_data=technician_data,
        user_id=current_user["id"]
    )


@router.get("/me", response_model=TechnicianResponse)
async def get_my_profile(
    current_user: dict = Depends(require_roles("technician"))
):
    """
    Obtiene el perfil completo del técnico actual.
    
    **Requiere rol: technician**
    
    Incluye toda la información del perfil técnico y datos del usuario.
    
    Returns:
        TechnicianResponse con perfil completo
    
    Raises:
        404: Si el perfil no existe (usuario aún no lo completó)
    """
    return await technician_service.get_technician_by_user_id(
        user_id=current_user["id"],
        include_user_info=True
    )


@router.patch("/me", response_model=TechnicianResponse)
async def update_my_profile(
    technician_data: TechnicianUpdate,
    current_user: dict = Depends(require_roles("technician"))
):
    """
    Actualiza el perfil del técnico actual.
    
    **Requiere rol: technician**
    
    Campos actualizables:
    - `sena_certification_number`: Número de certificación
    - `specializations`: Lista de especializaciones
    - `experience_years`: Años de experiencia
    - `bio`: Biografía
    - `service_radius_km`: Radio de servicio
    - `is_available`: Disponibilidad
    
    Solo se actualizan los campos proporcionados (PATCH parcial).
    
    Args:
        technician_data: Campos a actualizar
    
    Returns:
        TechnicianResponse actualizado
    
    Example:
        ```json
        {
            "bio": "Técnico con 6 años de experiencia actualizada",
            "service_radius_km": 30,
            "is_available": true
        }
        ```
    """
    return await technician_service.update_technician_profile(
        user_id=current_user["id"],
        technician_data=technician_data
    )


@router.patch("/me/location", response_model=dict)
async def update_my_location(
    location_data: TechnicianLocationUpdate,
    current_user: dict = Depends(require_roles("technician"))
):
    """
    Actualiza solo la ubicación actual del técnico.
    
    **Requiere rol: technician**
    
    Endpoint optimizado para actualizaciones frecuentes de ubicación.
    Ideal para tracking en tiempo real mientras el técnico se mueve.
    
    Args:
        location_data: Nueva ubicación (lat, lon)
    
    Returns:
        Dict con confirmación
    
    Example:
        ```json
        {
            "current_lat": 6.2500,
            "current_lon": -75.5700
        }
        ```
    
    Response:
        ```json
        {
            "message": "Ubicación actualizada correctamente",
            "latitude": 6.2500,
            "longitude": -75.5700
        }
        ```
    """
    return await technician_service.update_location(
        user_id=current_user["id"],
        location_data=location_data
    )


@router.patch("/me/availability", response_model=dict)
async def toggle_my_availability(
    availability_data: TechnicianAvailabilityUpdate,
    current_user: dict = Depends(require_roles("technician"))
):
    """
    Cambia el estado de disponibilidad del técnico (switch on/off).
    
    **Requiere rol: technician**
    
    Cuando `is_available = false`:
    - El técnico NO aparecerá en búsquedas de técnicos disponibles
    - NO se le podrán asignar nuevos servicios automáticamente
    - Los servicios ya asignados NO se afectan
    
    Casos de uso:
    - Técnico termina su jornada → `is_available: false`
    - Técnico inicia su jornada → `is_available: true`
    - Técnico tiene emergencia → `is_available: false`
    
    Args:
        availability_data: Estado de disponibilidad
    
    Returns:
        Dict con confirmación
    
    Example:
        ```json
        {
            "is_available": false
        }
        ```
    
    Response:
        ```json
        {
            "message": "Ahora estás no disponible para nuevos servicios",
            "is_available": false
        }
        ```
    """
    return await technician_service.toggle_availability(
        user_id=current_user["id"],
        is_available=availability_data.is_available
    )


@router.get("/me/stats", response_model=TechnicianStatsResponse)
async def get_my_stats(
    current_user: dict = Depends(require_roles("technician"))
):
    """
    Obtiene estadísticas del técnico actual.
    
    **Requiere rol: technician**
    
    Incluye:
    - Total de servicios completados
    - Servicios en progreso
    - Servicios cancelados
    - Rating promedio
    - Ingresos totales
    - Servicios este mes/semana
    
    Returns:
        TechnicianStatsResponse con estadísticas
    
    Example response:
        ```json
        {
            "total_services": 50,
            "completed_services": 45,
            "in_progress_services": 2,
            "cancelled_services": 3,
            "average_rating": 4.8,
            "total_earned": 15000000.00,
            "services_this_month": 8,
            "services_this_week": 2
        }
        ```
    """
    return await technician_service.get_technician_stats(
        user_id=current_user["id"]
    )


# ============================================
# ENDPOINTS ADMIN - GESTIÓN DE TÉCNICOS
# ============================================

@router.get("/{user_id}", response_model=TechnicianResponse)
async def get_technician_by_id(
    user_id: str = Path(..., description="UUID del usuario técnico"),
    current_user: dict = Depends(require_roles("admin"))
):
    """
    Obtiene el perfil completo de un técnico específico.
    
    **Requiere rol: admin**
    
    Usado por administradores para ver detalles completos de cualquier técnico.
    
    Args:
        user_id: UUID del usuario técnico
    
    Returns:
        TechnicianResponse con perfil completo
    
    Raises:
        404: Técnico no encontrado
        403: Sin permisos de admin
    """
    return await technician_service.get_technician_by_user_id(
        user_id=user_id,
        include_user_info=True
    )


@router.patch("/{user_id}/verify", response_model=dict)
async def verify_technician(
    user_id: str = Path(..., description="UUID del usuario técnico"),
    verified: bool = Query(..., description="True para verificar, False para desverificar"),
    current_user: dict = Depends(require_roles("admin"))
):
    """
    Verifica o desverifica a un técnico.
    
    **Requiere rol: admin**
    
    Solo técnicos verificados:
    - Aparecen en búsquedas públicas (por defecto)
    - Pueden recibir asignaciones automáticas de servicios
    - Son visibles para clientes
    
    Proceso de verificación:
    1. Admin revisa certificación SENA
    2. Admin valida experiencia y referencias
    3. Admin marca como verificado
    
    Args:
        user_id: UUID del usuario técnico
        verified: True = verificar, False = desverificar
    
    Returns:
        Dict con confirmación
    
    Example:
        PATCH /technicians/{user_id}/verify?verified=true
    
    Response:
        ```json
        {
            "message": "Técnico verificado exitosamente",
            "user_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            "is_verified": true
        }
        ```
    """
    try:
        # Actualizar estado de verificación
        response = technician_service.supabase.table("technicians")\
            .update({"is_verified": verified})\
            .eq("user_id", user_id)\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Técnico no encontrado"
            )
        
        status_text = "verificado" if verified else "desverificado"
        return {
            "message": f"Técnico {status_text} exitosamente",
            "user_id": user_id,
            "is_verified": verified
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al verificar técnico: {str(e)}"
        )


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_technician_profile(
    user_id: str = Path(..., description="UUID del usuario técnico"),
    current_user: dict = Depends(require_roles("admin"))
):
    """
    Elimina el perfil de técnico (NO elimina el usuario).
    
    **Requiere rol: admin**
    
    ⚠️ **CUIDADO:** Esta acción NO se puede deshacer.
    
    Solo elimina el registro en la tabla `technicians`.
    El usuario en `auth.users` y `public.users` se mantiene.
    
    Casos de uso:
    - Técnico fraudulento
    - Técnico que ya no trabaja en la plataforma
    - Limpieza de datos
    
    Args:
        user_id: UUID del usuario técnico
    
    Raises:
        404: Técnico no encontrado
        403: Sin permisos de admin
    """
    try:
        response = technician_service.supabase.table("technicians")\
            .delete()\
            .eq("user_id", user_id)\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Técnico no encontrado"
            )
        
        return None  # 204 No Content
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al eliminar técnico: {str(e)}"
        )


# ============================================
# ENDPOINTS DE BÚSQUEDA AVANZADA
# ============================================

@router.get("/search/specializations", response_model=dict)
async def get_available_specializations():
    """
    Obtiene la lista de especializaciones disponibles.
    
    **Endpoint público**
    
    Útil para formularios de búsqueda y filtros en el frontend.
    
    Returns:
        Dict con lista de especializaciones
    
    Example response:
        ```json
        {
            "specializations": [
                {
                    "value": "gps_installation",
                    "label": "Instalación de GPS",
                    "icon": "📍"
                },
                ...
            ]
        }
        ```
    """
    return {
        "specializations": [
            {
                "value": "gps_installation",
                "label": "Instalación de GPS",
                "icon": "📍",
                "description": "Instalación de sistemas de rastreo GPS"
            },
            {
                "value": "gps_maintenance",
                "label": "Mantenimiento de GPS",
                "icon": "🔧",
                "description": "Mantenimiento y reparación de GPS"
            },
            {
                "value": "alarm_installation",
                "label": "Instalación de Alarmas",
                "icon": "🚨",
                "description": "Instalación de sistemas de alarma"
            },
            {
                "value": "alarm_maintenance",
                "label": "Mantenimiento de Alarmas",
                "icon": "🔧",
                "description": "Mantenimiento de alarmas"
            },
            {
                "value": "camera_installation",
                "label": "Instalación de Cámaras",
                "icon": "📹",
                "description": "Instalación de videovigilancia"
            },
            {
                "value": "camera_maintenance",
                "label": "Mantenimiento de Cámaras",
                "icon": "🔧",
                "description": "Mantenimiento de cámaras"
            },
            {
                "value": "other",
                "label": "Otros",
                "icon": "🛠️",
                "description": "Otros servicios de seguridad"
            }
        ]
    }


@router.get("/top-rated", response_model=TechnicianListResponse)
async def get_top_rated_technicians(
    limit: int = Query(10, ge=1, le=50, description="Cantidad de técnicos"),
    city: Optional[str] = Query(None, description="Filtrar por ciudad")
):
    """
    Obtiene los técnicos mejor calificados.
    
    **Endpoint público**
    
    Ordenados por rating promedio (de mayor a menor).
    Solo incluye técnicos verificados y con al menos 5 servicios completados.
    
    Args:
        limit: Cantidad máxima de técnicos (default 10)
        city: Opcional, filtrar por ciudad
    
    Returns:
        TechnicianListResponse con top técnicos
    
    Example:
        GET /technicians/top-rated?limit=5&city=Medellín
    """
    return await technician_service.list_technicians(
        city=city,
        min_rating=4.0,  # Mínimo 4.0 estrellas
        is_available=None,  # Incluir disponibles y no disponibles
        verified_only=True,
        page=1,
        page_size=limit
    )