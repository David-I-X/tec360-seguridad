"""
Simulation API — Endpoints para simular movimiento de técnicos (solo desarrollo)
Permite testear el tracking en tiempo real sin dispositivos físicos
"""
import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from app.core.config import settings
from app.core.security import require_roles
from app.core.websocket_manager import ws_manager
from app.api.location import _location_cache
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/simulate", tags=["simulation"])


class SimulateMovementRequest(BaseModel):
    """Request para iniciar una simulación de movimiento"""
    service_id: str
    # Starting position (technician's initial location)
    start_lat: float = 6.2486   # Medellín - Poblado
    start_lng: float = -75.5742
    # Ending position (service destination)
    end_lat: float = 6.2442
    end_lng: float = -75.5636
    # Number of steps in the simulated route
    steps: int = 20
    # Interval between steps in seconds
    interval_seconds: float = 2.0


async def _simulate_route(
    service_id: str,
    technician_id: str,
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float,
    steps: int,
    interval: float,
):
    """
    Background task that simulates a technician moving from start to end.
    Sends location updates via WebSocket at each step.
    """
    logger.info(f"[Simulate] Starting movement simulation for service {service_id}")
    logger.info(f"[Simulate] Route: ({start_lat},{start_lng}) → ({end_lat},{end_lng}), {steps} steps, {interval}s interval")

    for i in range(steps + 1):
        progress = i / steps

        # Linear interpolation between start and end
        current_lat = start_lat + (end_lat - start_lat) * progress
        current_lng = start_lng + (end_lng - start_lng) * progress

        # Add slight random offset for realism (zigzag)
        import random
        jitter_lat = random.uniform(-0.0002, 0.0002)
        jitter_lng = random.uniform(-0.0002, 0.0002)
        current_lat += jitter_lat
        current_lng += jitter_lng

        # Save to location cache (same as real POST /location/update)
        _location_cache[service_id] = {
            "technician_id": technician_id,
            "lat": current_lat,
            "lng": current_lng,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Broadcast via WebSocket
        await ws_manager.broadcast_location_update(
            service_id=service_id,
            lat=current_lat,
            lng=current_lng,
            technician_id=technician_id,
        )

        logger.info(f"[Simulate] Step {i+1}/{steps+1}: ({current_lat:.6f}, {current_lng:.6f})")

        if i < steps:
            await asyncio.sleep(interval)

    logger.info(f"[Simulate] Simulation completed for service {service_id}")


@router.post("/movement")
async def simulate_movement(
    data: SimulateMovementRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_roles("technician", "admin")),
):
    """
    Starts a simulated movement for testing.
    The technician marker will move from start to end position over time.
    Only available in development environment.
    """
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=403, detail="Simulación no disponible en producción")

    technician_id = current_user["id"]

    # Run simulation in background
    background_tasks.add_task(
        _simulate_route,
        service_id=data.service_id,
        technician_id=technician_id,
        start_lat=data.start_lat,
        start_lng=data.start_lng,
        end_lat=data.end_lat,
        end_lng=data.end_lng,
        steps=data.steps,
        interval=data.interval_seconds,
    )

    return {
        "success": True,
        "message": f"Simulación iniciada: {data.steps} pasos cada {data.interval_seconds}s",
        "route": {
            "start": {"lat": data.start_lat, "lng": data.start_lng},
            "end": {"lat": data.end_lat, "lng": data.end_lng},
            "steps": data.steps,
            "duration_seconds": data.steps * data.interval_seconds,
        }
    }


@router.get("/status")
async def simulation_status():
    """Returns current simulation/tracking status for debugging"""
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=403, detail="No disponible en producción")

    return {
        "active_service_rooms": list(ws_manager.service_rooms.keys()),
        "connections_per_room": {
            sid: len(conns) for sid, conns in ws_manager.service_rooms.items()
        },
        "total_user_connections": sum(
            len(conns) for conns in ws_manager.user_connections.values()
        ),
        "cached_locations": {
            sid: {
                "lat": data["lat"],
                "lng": data["lng"],
                "timestamp": data["timestamp"],
            }
            for sid, data in _location_cache.items()
        },
    }
