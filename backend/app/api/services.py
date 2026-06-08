"""
Endpoints de API para servicios
Rutas públicas y protegidas para gestión de servicios técnicos
Refactorizado para usar SQLModel Session
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from sqlmodel import Session
from app.core.database import get_session
from app.core.security import get_current_user, require_roles
from app.schemas.service import (
    ServiceCreate,
    ServiceUpdate,
    ServiceResponse,
    ServiceListPaginated,
    ServiceAssign,
    NearbyTechnicianResponse
)
from app.schemas.incident import IncidentCreate
from app.models.incident import IncidentReport
from app.services.service_service import service_service
from pydantic import BaseModel

class PriceAdjustmentRequest(BaseModel):
    amount: float
    description: str

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
                "label": "Instalación Dashcam",
                "description": "Instalación de sistemas de videovigilancia"
            },
            {
                "value": "camera_maintenance",
                "label": "Mantenimiento Dashcam",
                "description": "Mantenimiento de dashcam vehicular"
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
    current_user: dict = Depends(require_roles("technician", "reaction_team", "admin")),
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
        user_role=current_user["role"],
        page=page,
        page_size=page_size
    )


@router.post("/{service_id}/accept", response_model=ServiceResponse)
async def accept_service(
    service_id: str = Path(..., description="UUID del servicio"),
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
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
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
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



@router.get("/{service_id}/eta")
async def get_service_eta(
    service_id: str = Path(..., description="UUID del servicio"),
    tech_lat: float = Query(..., description="Latitud actual del técnico"),
    tech_lon: float = Query(..., description="Longitud actual del técnico"),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Calcula el ETA (tiempo estimado de llegada) del técnico al servicio usando Google Routes API.
    Retorna: { eta_seconds, eta_minutes, eta_text, distance_meters, distance_text }
    """
    import httpx
    from app.core.config import settings
    from app.models.service import Service
    from uuid import UUID as PyUUID

    try:
        service = session.get(Service, PyUUID(service_id))
    except Exception:
        service = None

    if not service:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    # Extract destination coords from PostGIS geometry
    dest_lat, dest_lon = None, None
    if service.service_location:
        try:
            from geoalchemy2.shape import to_shape
            point = to_shape(service.service_location)
            dest_lon, dest_lat = point.x, point.y
        except Exception:
            pass

    # Fallback to Bogotá center if no location stored
    if dest_lat is None:
        dest_lat, dest_lon = 4.6097, -74.0817

    if not settings.GOOGLE_MAPS_API_KEY:
        # Return generic estimate when no API key configured
        return {"eta_seconds": 1200, "eta_minutes": 20, "eta_text": "~20 min", "distance_meters": None, "distance_text": None}

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(
                "https://routes.googleapis.com/directions/v2:computeRoutes",
                headers={
                    "X-Goog-Api-Key": settings.GOOGLE_MAPS_API_KEY,
                    "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
                    "Content-Type": "application/json",
                },
                json={
                    "origin": {"location": {"latLng": {"latitude": tech_lat, "longitude": tech_lon}}},
                    "destination": {"location": {"latLng": {"latitude": dest_lat, "longitude": dest_lon}}},
                    "travelMode": "DRIVE",
                    "routingPreference": "TRAFFIC_AWARE",
                }
            )

        if response.status_code != 200:
            raise ValueError(f"Google Routes error {response.status_code}")

        routes = response.json().get("routes", [])
        if not routes:
            raise ValueError("No routes returned")

        route = routes[0]
        # duration comes as "NNNs" string
        duration_str = route.get("duration", "1200s")
        eta_seconds = int(duration_str.rstrip("s"))
        distance_m = route.get("distanceMeters", 0)
        eta_minutes = round(eta_seconds / 60)
        eta_text = f"{eta_minutes} min" if eta_minutes > 0 else "Menos de 1 min"
        dist_km = round(distance_m / 1000, 1)
        distance_text = f"{dist_km} km"

        return {
            "eta_seconds": eta_seconds,
            "eta_minutes": eta_minutes,
            "eta_text": eta_text,
            "distance_meters": distance_m,
            "distance_text": distance_text,
        }

    except Exception as e:
        import logging
        logging.warning(f"[ETA] Google Routes API error: {e}")
        return {"eta_seconds": 1200, "eta_minutes": 20, "eta_text": "~20 min", "distance_meters": None, "distance_text": None}


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


@router.patch("/{service_id}/confirm", response_model=ServiceResponse)
async def confirm_service(
    service_id: str = Path(..., description="UUID del servicio"),
    payment_method: str = Query(None, description="Método de pago (online/cash)"),
    current_user: dict = Depends(require_roles("client")),
    session: Session = Depends(get_session)
):
    """
    Permite al cliente confirmar que el servicio fue completado satisfactoriamente.
    Opcionalmente registra el método de pago elegido.
    """
    return await service_service.confirm_service(
        session=session,
        service_id=service_id,
        client_id=current_user["id"],
        payment_method=payment_method
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


@router.delete("/{service_id}", status_code=status.HTTP_200_OK)
async def cancel_service(
    service_id: str = Path(..., description="UUID del servicio"),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Cancela un servicio.
    - Clientes: Cancela y reembolsa créditos al técnico (si aplica).
    - Técnicos: Cancela y aplica penalización por cancelación (-15 pts, posible suspensión).
    - Admins: Cancela sin penalizaciones.
    """
    if current_user["role"] not in ["client", "admin", "technician"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Rol no autorizado para cancelar servicios"
        )
    
    result = await service_service.cancel_service(
        session=session,
        service_id=service_id,
        user_id=current_user["id"],
        user_role=current_user["role"]
    )
    
    # Client penalty
    if current_user["role"] == "client":
        from app.models.user import User
        from sqlmodel import select
        from uuid import UUID
        client = session.exec(select(User).where(User.id == UUID(current_user["id"]))).first()
        if client:
            client.cancellation_count += 1
            if client.cancellation_count >= 3:
                client.flagged_for_review = True
            session.add(client)
            session.commit()
    
    return result
@router.post("/{service_id}/incident", response_model=dict, status_code=status.HTTP_201_CREATED)
async def report_incident(
    service_id: str,
    incident_data: IncidentCreate,
    current_user: dict = Depends(require_roles("technician")),
    session: Session = Depends(get_session)
):
    """
    Técnico reporta un incidente en campo.
    - Pausa el servicio automáticamente
    - Notifica al administrador
    """
    from uuid import UUID
    from sqlmodel import select
    from app.models.service import Service, ServiceStatus
    
    service = session.exec(select(Service).where(Service.id == UUID(service_id))).first()
    if not service:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")
        
    if str(service.technician_id) != current_user["id"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No autorizado")
        
    # Crear reporte
    incident = IncidentReport(
        service_id=service.id,
        technician_id=current_user["id"],
        incident_type=incident_data.incident_type,
        description=incident_data.description,
        evidence_url=incident_data.evidence_url
    )
    session.add(incident)
    
    # Pausar servicio
    service.status = ServiceStatus.paused
    session.add(service)
    session.commit()
    
    # Notificar a Admin (idealmente con NotificationService)
    try:
        from app.services.notification_service import NotificationService
        from app.schemas.notification import NotificationCreate
        await NotificationService.create_notification(
            session=session,
            data=NotificationCreate(
                user_id=service.client_id, # Enviar a admin en producción
                title="🚨 Incidente Reportado",
                message=f"El técnico reportó un incidente: {incident_data.incident_type.value}",
                notification_type="system_alert",
                service_id=service.id
            )
        )
    except Exception as e:
        import logging
        logging.warning(f"Failed to notify incident: {e}")
        
    return {"success": True, "message": "Incidente reportado, servicio pausado"}

@router.post("/{service_id}/price-adjustment", response_model=dict, status_code=status.HTTP_201_CREATED)
async def request_price_adjustment(
    service_id: str,
    payload: PriceAdjustmentRequest,
    current_user: dict = Depends(require_roles("technician")),
    session: Session = Depends(get_session)
):
    """
    Técnico solicita un ajuste de precio en campo.
    Crea una nueva cotización de tipo ajuste.
    - Notifica al cliente para que la apruebe.
    """
    from uuid import UUID
    from app.models.quotation import Quotation, QuotationStatus
    from sqlmodel import select
    from app.models.service import Service, ServiceStatus
    
    service = session.exec(select(Service).where(Service.id == UUID(service_id))).first()
    if not service:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")
        
    if str(service.technician_id) != current_user["id"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No autorizado")
        
    if service.status != ServiceStatus.in_progress:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Solo se pueden hacer ajustes si el servicio está en progreso")
        
    # Crear cotización de ajuste
    quotation = Quotation(
        service_id=service.id,
        technician_id=current_user["id"],
        amount=payload.amount,
        description=payload.description,
        is_adjustment=True,
        status=QuotationStatus.pending
    )
    session.add(quotation)
    
    # Pausar el servicio hasta que el cliente responda
    service.status = ServiceStatus.paused
    session.add(service)
    
    session.commit()
    
    # Notificar al cliente
    try:
        from app.services.notification_service import NotificationService
        from app.schemas.notification import NotificationCreate
        await NotificationService.create_notification(
            session=session,
            data=NotificationCreate(
                user_id=service.client_id,
                title="Ajuste de precio requerido",
                message=f"El técnico solicita un ajuste a ${payload.amount:,.0f}. Motivo: {payload.description}",
                notification_type="price_adjustment",
                service_id=service.id
            )
        )
    except Exception as e:
        import logging
        logging.warning(f"Failed to notify price adjustment: {e}")
        
    return {"success": True, "message": "Solicitud de ajuste enviada al cliente"}
@router.get("/{service_id}/receipt")
async def download_receipt(
    service_id: str,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Descarga el recibo en PDF de un servicio completado/confirmado.
    """
    from app.models.service import Service, ServiceStatus
    from app.models.user import User
    from sqlmodel import select
    from uuid import UUID
    from fastapi.responses import Response

    service = session.exec(select(Service).where(Service.id == UUID(service_id))).first()
    if not service:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")

    if current_user["role"] == "client" and str(service.client_id) != current_user["id"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No autorizado")

    if service.status not in [ServiceStatus.COMPLETED, ServiceStatus.CONFIRMED]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El recibo solo está disponible para servicios completados")

    client = session.exec(select(User).where(User.id == service.client_id)).first()
    technician = session.exec(select(User).where(User.id == service.technician_id)).first()

    from app.services.pdf_service import PDFService
    pdf_bytes = PDFService.generate_receipt(
        service=service,
        client_name=client.full_name if client else "Cliente",
        tech_name=technician.full_name if technician else "Técnico"
    )

    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=recibo_{service.id}.pdf"})
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