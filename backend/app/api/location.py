"""
Location API - Endpoints para tracking de ubicación de técnicos
"""
from fastapi import APIRouter, Depends, HTTPException, status
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
    current_user: dict = Depends(require_roles("technician", "admin")),
    session: Session = Depends(get_session)
):
    """
    Endpoint para que el técnico envíe su ubicación actual.
    Se guarda en cache y se broadcast a todos los conectados a la sala del servicio.
    """
    technician_id = current_user["id"]
    
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
    current_user: dict = Depends(require_roles("client", "technician", "admin")),
    session: Session = Depends(get_session)
):
    """
    Obtiene la última ubicación conocida del técnico asignado a un servicio.
    Returns cached position from POST /location/update calls.
    """
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
