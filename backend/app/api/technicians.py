"""
Endpoints de API para técnicos
Gestión de perfiles, búsqueda y disponibilidad de técnicos
Refactorizado para usar SQLModel Session
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from sqlmodel import Session
from app.core.database import get_session
from app.core.security import require_roles
from app.schemas.technician import (
    TechnicianCreate,
    TechnicianUpdate,
    TechnicianResponse,
    TechnicianListResponse,
    TechnicianPublicProfile,
    TechnicianStatsResponse,
    TechnicianLocationUpdate,
    TechnicianAvailabilityUpdate,
    TechnicianScheduleCreate,
    TechnicianScheduleResponse,
    PortfolioImageCreate,
    PortfolioImageResponse
)
from app.models.schedule import TechnicianSchedule
from app.models.portfolio import PortfolioImage
from datetime import datetime
from app.services.technician_service import technician_service


router = APIRouter(prefix="/technicians", tags=["Technicians"])


# ============================================
# ENDPOINTS PÚBLICOS
# ============================================

@router.get("", response_model=TechnicianListResponse)
async def list_technicians(
    specialization: Optional[str] = Query(None, description="Filtrar por especialización"),
    city: Optional[str] = Query(None, description="Filtrar por ciudad"),
    min_rating: Optional[float] = Query(None, ge=0, le=5, description="Rating mínimo"),
    is_available: Optional[bool] = Query(None, description="Solo técnicos disponibles"),
    verified_only: bool = Query(True, description="Solo técnicos verificados"),
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(10, ge=1, le=50, description="Técnicos por página"),
    session: Session = Depends(get_session)
):
    """
    Lista técnicos disponibles con filtros.
    **Endpoint público** - No requiere autenticación.
    """
    return await technician_service.list_technicians(
        session=session,
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
    user_id: str = Path(..., description="UUID del usuario técnico"),
    session: Session = Depends(get_session)
):
    """
    Obtiene el perfil público de un técnico.
    **Endpoint público**
    """
    try:
        technician = await technician_service.get_technician_by_user_id(
            session=session,
            user_id=user_id,
            include_user_info=True
        )
        
        user_info = technician.user
        
        return TechnicianPublicProfile(
            user_id=technician.user_id,
            full_name=user_info.full_name if user_info else None,
            specializations=technician.specializations,
            experience_years=technician.experience_years,
            bio=technician.bio,
            service_radius_km=technician.service_radius_km,
            average_rating=technician.average_rating,
            total_services=technician.total_services,
            city=user_info.city if user_info else None,
            avatar_url=user_info.avatar_url if user_info else None,
            is_verified=technician.is_verified
        )
    except HTTPException as e:
        if e.status_code == 404:
            # Fallback: check if User exists to show basic info
            from app.models.user import User
            user = session.get(User, user_id)
            if user:
                return TechnicianPublicProfile(
                    user_id=str(user.id),
                    full_name=user.full_name,
                    specializations=["No disponible"],
                    experience_years=0,
                    bio="Perfil de técnico no completado",
                    service_radius_km=0,
                    average_rating=0.0,
                    total_services=0,
                    city=user.city,
                    avatar_url=user.avatar_url,
                    is_verified=False
                )
        raise


# ============================================
# ENDPOINTS PROTEGIDOS
# ============================================

@router.post("/me/profile", response_model=TechnicianResponse, status_code=status.HTTP_201_CREATED)
async def create_my_technician_profile(
    technician_data: TechnicianCreate,
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
    session: Session = Depends(get_session)
):
    """
    Crea el perfil de técnico para el usuario actual.
    **Requiere rol: technician**
    """
    return await technician_service.create_technician_profile(
        session=session,
        technician_data=technician_data,
        user_id=current_user["id"]
    )


@router.get("/me", response_model=TechnicianResponse)
async def get_my_profile(
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
    session: Session = Depends(get_session)
):
    """
    Obtiene el perfil completo del técnico actual.
    """
    return await technician_service.get_technician_by_user_id(
        session=session,
        user_id=current_user["id"],
        include_user_info=True
    )


@router.patch("/me", response_model=TechnicianResponse)
async def update_my_profile(
    technician_data: TechnicianUpdate,
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
    session: Session = Depends(get_session)
):
    """
    Actualiza el perfil del técnico actual.
    """
    return await technician_service.update_technician_profile(
        session=session,
        user_id=current_user["id"],
        technician_data=technician_data
    )


@router.patch("/me/location", response_model=dict)
async def update_my_location(
    location_data: TechnicianLocationUpdate,
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
    session: Session = Depends(get_session)
):
    """
    Actualiza solo la ubicación actual del técnico.
    """
    return await technician_service.update_location(
        session=session,
        user_id=current_user["id"],
        location_data=location_data
    )


@router.patch("/me/availability", response_model=dict)
async def toggle_my_availability(
    availability_data: TechnicianAvailabilityUpdate,
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
    session: Session = Depends(get_session)
):
    """
    Cambia el estado de disponibilidad.
    """
    return await technician_service.toggle_availability(
        session=session,
        user_id=current_user["id"],
        is_available=availability_data.is_available
    )


@router.get("/me/stats", response_model=TechnicianStatsResponse)
async def get_my_stats(
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
    session: Session = Depends(get_session)
):
    """
    Obtiene estadísticas del técnico actual.
    """
    return await technician_service.get_technician_stats(
        session=session,
        user_id=current_user["id"]
    )


# ============================================
# ENDPOINTS ADMIN
# ============================================

@router.get("/{user_id}", response_model=TechnicianResponse)
async def get_technician_by_id(
    user_id: str = Path(..., description="UUID del usuario técnico"),
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session)
):
    """
    Obtiene el perfil completo de un técnico específico.
    """
    return await technician_service.get_technician_by_user_id(
        session=session,
        user_id=user_id,
        include_user_info=True
    )


@router.patch("/{user_id}/verify", response_model=dict)
async def verify_technician(
    user_id: str = Path(..., description="UUID del usuario técnico"),
    verified: bool = Query(..., description="True para verificar, False para desverificar"),
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session)
):
    """
    Verifica o desverifica a un técnico.
    """
    # Fix: technician_service no tiene metodo verify directo, 
    # pero podemos hacer update simple o agregar método.
    # Agregaré lógica aquí mismo o idealmente en service.
    # Por consistencia, usaré update_technician_profile pero requiere TechnicianUpdate
    # Mejor crear un método ad-hoc en service si no existe, o usar update.
    # El service original usaba update directo a supabase.
    # En mi refactor service no puse 'verify_technician'.
    # Voy a user update_technician_profile con un objeto parcial.
    
    await technician_service.update_technician_profile(
        session=session,
        user_id=user_id,
        technician_data=TechnicianUpdate(is_verified=verified)
    )
    
    status_text = "verificado" if verified else "desverificado"
    return {
        "message": f"Técnico {status_text} exitosamente",
        "user_id": user_id,
        "is_verified": verified
    }


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_technician_profile(
    user_id: str = Path(..., description="UUID del usuario técnico"),
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session)
):
    """
    Elimina el perfil de técnico.
    """
    # Mi service refactorizado NO TIENE delete.
    # Debo implementarlo o hacerlo manual aqui con session.
    # Lo haré manual aquí por rapidez y simplicidad.
    from app.models.technician import Technician
    from sqlmodel import select
    
    tech = session.exec(select(Technician).where(Technician.user_id == user_id)).first()
    if not tech:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Técnico no encontrado")
    
    session.delete(tech)
    session.commit()
    
    return None


@router.get("/search/specializations", response_model=dict)
async def get_available_specializations():
    """Endpoint público"""
    return {
        "specializations": [
            {"value": "gps_installation", "label": "Instalación de GPS", "icon": "📍"},
            {"value": "gps_maintenance", "label": "Mantenimiento de GPS", "icon": "🔧"},
            {"value": "alarm_installation", "label": "Instalación de Alarmas", "icon": "🚨"},
            {"value": "alarm_maintenance", "label": "Mantenimiento de Alarmas", "icon": "🔧"},
            {"value": "camera_installation", "label": "Instalación Dashcam", "icon": "📹"},
            {"value": "camera_maintenance", "label": "Mantenimiento Dashcam", "icon": "🔧"},
            {"value": "other", "label": "Otros", "icon": "🛠️"}
        ]
    }


@router.get("/top-rated", response_model=TechnicianListResponse)
async def get_top_rated_technicians(
    limit: int = Query(10, ge=1, le=50),
    city: Optional[str] = Query(None),
    session: Session = Depends(get_session)
):
    """Endpoint público"""
    return await technician_service.list_technicians(
        session=session,
        city=city,
        min_rating=4.0,
        verified_only=True,
        page=1,
        page_size=limit
    )

# ============================================
# HORARIOS (SCHEDULE)
# ============================================


@router.post("/me/schedule", response_model=TechnicianScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_my_schedule(
    schedule_data: TechnicianScheduleCreate,
    current_user: dict = Depends(require_roles("technician")),
    session: Session = Depends(get_session)
):
    """Crea o actualiza un horario para un día específico."""
    from sqlmodel import select
    from uuid import UUID
    
    tech_id = UUID(current_user["id"])
    
    # Parse times
    start_t = datetime.strptime(schedule_data.start_time, "%H:%M").time()
    end_t = datetime.strptime(schedule_data.end_time, "%H:%M").time()
    
    # Check if schedule for that day already exists
    existing = session.exec(
        select(TechnicianSchedule).where(
            TechnicianSchedule.technician_id == tech_id,
            TechnicianSchedule.day_of_week == schedule_data.day_of_week
        )
    ).first()
    
    if existing:
        existing.start_time = start_t
        existing.end_time = end_t
        existing.is_active = schedule_data.is_active
        existing.updated_at = datetime.utcnow()
        session.add(existing)
        sched = existing
    else:
        sched = TechnicianSchedule(
            technician_id=tech_id,
            day_of_week=schedule_data.day_of_week,
            start_time=start_t,
            end_time=end_t,
            is_active=schedule_data.is_active
        )
        session.add(sched)
        
    session.commit()
    session.refresh(sched)
    
    # Formatear hora a string para la respuesta
    return {
        "id": str(sched.id),
        "technician_id": str(sched.technician_id),
        "day_of_week": sched.day_of_week,
        "start_time": sched.start_time.strftime("%H:%M"),
        "end_time": sched.end_time.strftime("%H:%M"),
        "is_active": sched.is_active
    }

@router.get("/me/schedule", response_model=list[TechnicianScheduleResponse])
async def get_my_schedule(
    current_user: dict = Depends(require_roles("technician")),
    session: Session = Depends(get_session)
):
    """Obtiene los horarios configurados del técnico."""
    from sqlmodel import select
    from uuid import UUID
    
    schedules = session.exec(
        select(TechnicianSchedule).where(
            TechnicianSchedule.technician_id == UUID(current_user["id"])
        ).order_by(TechnicianSchedule.day_of_week)
    ).all()
    
    return [
        {
            "id": str(s.id),
            "technician_id": str(s.technician_id),
            "day_of_week": s.day_of_week,
            "start_time": s.start_time.strftime("%H:%M"),
            "end_time": s.end_time.strftime("%H:%M"),
            "is_active": s.is_active
        }
        for s in schedules
    ]

# ============================================
# PORTAFOLIO (PORTFOLIO)
# ============================================


@router.post("/me/portfolio", response_model=PortfolioImageResponse, status_code=status.HTTP_201_CREATED)
async def add_portfolio_image(
    image_data: PortfolioImageCreate,
    current_user: dict = Depends(require_roles("technician")),
    session: Session = Depends(get_session)
):
    """Sube una imagen al portafolio del técnico."""
    from uuid import UUID
    
    tech_id = UUID(current_user["id"])
    
    image = PortfolioImage(
        technician_id=tech_id,
        image_url=image_data.image_url,
        description=image_data.description
    )
    session.add(image)
    session.commit()
    session.refresh(image)
    
    return image

@router.get("/{user_id}/portfolio", response_model=list[PortfolioImageResponse])
async def get_technician_portfolio(
    user_id: str,
    session: Session = Depends(get_session)
):
    """Obtiene el portafolio público de un técnico."""
    from sqlmodel import select
    from uuid import UUID
    
    images = session.exec(
        select(PortfolioImage).where(
            PortfolioImage.technician_id == UUID(user_id)
        ).order_by(PortfolioImage.created_at.desc())
    ).all()
    
    return images

@router.delete("/me/portfolio/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_portfolio_image(
    image_id: str,
    current_user: dict = Depends(require_roles("technician")),
    session: Session = Depends(get_session)
):
    """Elimina una imagen del portafolio del técnico."""
    from sqlmodel import select
    from uuid import UUID
    
    image = session.exec(select(PortfolioImage).where(PortfolioImage.id == UUID(image_id))).first()
    if not image:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Imagen no encontrada")
        
    if str(image.technician_id) != current_user["id"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No autorizado")
        
    session.delete(image)
    session.commit()
    return None
