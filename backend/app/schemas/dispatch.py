"""
Schemas Pydantic v2 para el sistema de despacho inteligente
Path: backend/app/schemas/dispatch.py
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class DispatchOfferResponse(BaseModel):
    """Schema de respuesta para una oferta de despacho."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    service_id: str
    technician_id: str
    wave: int
    status: str
    score: float
    distance_km: Optional[float] = None
    offered_at: datetime
    expires_at: datetime
    responded_at: Optional[datetime] = None
    time_left_seconds: Optional[int] = Field(default=None, description="Segundos restantes para responder")

    # Datos contextuales del servicio para visualización del técnico
    service_title: Optional[str] = None
    service_type: Optional[str] = None
    service_address: Optional[str] = None
    service_city: Optional[str] = None
    estimated_price: Optional[float] = None
    vehicle_type: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_plate: Optional[str] = None


class DispatchOfferListResponse(BaseModel):
    """Listado paginado o filtrado de ofertas."""
    model_config = ConfigDict(from_attributes=True)

    offers: List[DispatchOfferResponse]
    total: int


class DispatchOfferActionResponse(BaseModel):
    """Respuesta tras aceptar o rechazar una oferta."""
    model_config = ConfigDict(from_attributes=True)

    success: bool
    offer_id: str
    status: str
    message: str
    service_id: str
    service_status: Optional[str] = None


class DispatchStatsResponse(BaseModel):
    """Métricas y estadísticas agregadas del motor de despacho."""
    model_config = ConfigDict(from_attributes=True)

    total_offers: int
    accepted_offers: int
    rejected_offers: int
    expired_offers: int
    cancelled_offers: int
    acceptance_rate: float = Field(description="Porcentaje de ofertas aceptadas sobre respondidas")
    avg_assignment_seconds: Optional[float] = Field(default=None, description="Tiempo promedio en segundos hasta la asignación")
