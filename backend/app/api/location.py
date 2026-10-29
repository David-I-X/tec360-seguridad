"""
Location API - Endpoints para tracking de ubicación de técnicos
"""
from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
from sqlmodel import select
from app.models.service import Service
from app.models.technician import Technician
from pydantic import BaseModel
from sqlmodel import Session
from datetime import datetime, timezone

from app.core.database import get_session
from app.core.security import require_roles
from app.core.websocket_manager import ws_manager

router = APIRouter(prefix="/location", tags=["location"])


# ============================================================
# In-memory cache for last-known technician positions
# In production, use Redis for persistence across restarts
# ============================================================
_location_cache: dict[str, dict] = {}


class LocationUpdate(BaseModel):
    """Schema para actualización de ubicación"""
    lat: float
    lng: float
    service_id: str  # El servicio activo del técnico


@router.post("/update")
async def update_technician_location(
    data: LocationUpdate,
    current_user: dict = Depends(require_roles("technician", "reaction_team", "admin")),
    session: Session = Depends(get_session)
):
    """
    Endpoint para que el técnico envíe su ubicación actual.
    Se guarda en cache y se broadcast a todos los conectados a la sala del servicio.
    """
    technician_id = current_user["id"]
    
    # C5: IDOR validation - verify technician is assigned to this service (or admin)
    try:
        svc_uuid = UUID(data.service_id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de servicio inválido")

    service = session.get(Service, svc_uuid)
    if not service:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")

    if current_user["role"] != "admin" and str(service.technician_id) != str(technician_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No estás asignado a este servicio")

    # Persist live location to Technician profile in DB as well
    try:
        tech_model = session.exec(select(Technician).where(Technician.user_id == UUID(str(technician_id)))).first()
        if tech_model:
            tech_model.current_location = f"POINT({data.lng} {data.lat})"
            session.add(tech_model)
            session.commit()
    except Exception:
        pass
    
    # Save to in-memory cache
    _location_cache[data.service_id] = {
        "technician_id": technician_id,
        "lat": data.lat,
        "lng": data.lng,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    
    # Broadcast de ubicación via WebSocket
    await ws_manager.broadcast_location_update(
        service_id=data.service_id,
        lat=data.lat,
        lng=data.lng,
        technician_id=technician_id
    )
    
    return {"success": True, "message": "Ubicación actualizada"}


@router.get("/{service_id}")
async def get_technician_location(
    service_id: str,
    current_user: dict = Depends(require_roles("client", "technician", "reaction_team", "admin")),
    session: Session = Depends(get_session)
):
    """
    Obtiene la última ubicación conocida del técnico asignado a un servicio.
    Returns cached position from POST /location/update calls.
    """
    # C5: IDOR validation - verify requester is part of this service
    try:
        svc_uuid = UUID(service_id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de servicio inválido")

    service = session.get(Service, svc_uuid)
    if not service:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")

    user_id = str(current_user["id"])
    user_role = current_user["role"]
    if user_role != "admin":
        if user_role == "client" and str(service.client_id) != user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso para ver la ubicación de este servicio")
        if user_role in ("technician", "reaction_team") and str(service.technician_id) != user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso para ver la ubicación de este servicio")

    cached = _location_cache.get(service_id)
    
    if cached:
        return {
            "service_id": service_id,
            "technician_location": {
                "lat": cached["lat"],
                "lng": cached["lng"],
                "technician_id": cached["technician_id"],
                "timestamp": cached["timestamp"],
            }
        }
    
    return {
        "service_id": service_id,
        "technician_location": None,
    }
