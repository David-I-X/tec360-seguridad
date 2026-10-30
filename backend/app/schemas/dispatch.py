"""
Schemas Pydantic v2 para el sistema de despacho inteligente
Path: backend/app/schemas/dispatch.py
"""
from typing import Optional, List, Dict, Any
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


# ============================================================
# Schemas para Fase C: Heatmaps, Hotspots y Analítica Avanzada
# ============================================================

class HeatmapPoint(BaseModel):
    """Punto geográfico ponderado para renderizar mapas de calor."""
    model_config = ConfigDict(from_attributes=True)

    lat: float
    lng: float
    weight: float = Field(default=1.0, description="Intensidad de demanda relativa")
    service_type: str
    status: str
    created_at: datetime


class HeatmapResponse(BaseModel):
    """Conjunto de puntos para capas de mapa de calor."""
    model_config = ConfigDict(from_attributes=True)

    points: List[HeatmapPoint]
    total_points: int


class DemandHotspot(BaseModel):
    """Zona geográfica con alta concentración de demanda sin asignar."""
    model_config = ConfigDict(from_attributes=True)

    zone_name: str
    center_lat: float
    center_lng: float
    active_requests_count: int
    urgency_level: str = Field(description="'high', 'medium', o 'normal'")
    recommendation: str


class DemandHotspotsResponse(BaseModel):
    """Listado de zonas calientes para sugerencias de posicionamiento."""
    model_config = ConfigDict(from_attributes=True)

    hotspots: List[DemandHotspot]
    total: int


class WaveConversionItem(BaseModel):
    """Métrica de conversión por número de ola."""
    model_config = ConfigDict(from_attributes=True)

    wave: int
    accepted_count: int
    percentage: float


class DispatchAnalyticsResponse(BaseModel):
    """Informe consolidado de métricas avanzadas de despacho y rendimiento."""
    model_config = ConfigDict(from_attributes=True)

    period_days: int
    total_services_dispatched: int
    total_offers_sent: int
    overall_acceptance_rate: float
    assignment_p50_seconds: Optional[float] = Field(default=None, description="Mediana de tiempo de asignación en segundos")
    assignment_p95_seconds: Optional[float] = Field(default=None, description="Percentil 95 de tiempo de asignación en segundos")
    avg_assignment_seconds: Optional[float] = Field(default=None, description="Promedio de tiempo de asignación en segundos")
    wave_conversion_funnel: List[WaveConversionItem]
    by_service_type: Dict[str, Any]
