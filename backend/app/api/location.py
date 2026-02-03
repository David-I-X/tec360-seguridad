"""
Location API - Endpoints para tracking de ubicación de técnicos
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session

from app.core.database import get_session
from app.core.security import require_roles
from app.core.websocket_manager import ws_manager

router = APIRouter(prefix="/location", tags=["location"])


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
    Se broadcasting a todos los conectados a la sala del servicio.
    """
    technician_id = current_user["id"]
    
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
    Para MVP, esto retorna data dummy. La ubicación real viene via WebSocket.
    """
    # En producción, esto buscaría en Redis/DB la última ubicación guardada
    # Por ahora retornamos null - el cliente debe usar WebSocket para tiempo real
    return {
        "service_id": service_id,
        "technician_location": None,
        "message": "Usa WebSocket para tracking en tiempo real"
    }
