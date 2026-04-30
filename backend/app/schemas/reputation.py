"""
Schema de reputación para técnicos — Tec360 Seguridad
"""
from pydantic import BaseModel, Field
from typing import Optional


class PointsBreakdown(BaseModel):
    services: int = Field(0, description="Puntos por servicios completados")
    ratings: int = Field(0, description="Puntos por calificaciones recibidas")
    profile: int = Field(0, description="Puntos por perfil completo")
    certifications: int = Field(0, description="Puntos por certificaciones")
    specializations: int = Field(0, description="Puntos por especializaciones")
    experience: int = Field(0, description="Puntos por experiencia")


class TechnicianReputation(BaseModel):
    """Respuesta pública del sistema de reputación"""
    technician_id: str
    points: int = Field(0, description="Puntos totales")
    rank: str = Field("bronze", description="Nivel actual: bronze, silver, gold, elite")
    rank_label: str = Field("Bronce", description="Nombre legible del nivel")
    rank_emoji: str = Field("🥉")
    rank_color: str = Field("#cd7f32")
    progress_percent: float = Field(0, description="Progreso hacia el siguiente nivel (0-100)")
    points_to_next: Optional[int] = Field(None, description="Puntos que faltan para subir")
    next_rank_label: Optional[str] = None
    breakdown: PointsBreakdown = Field(default_factory=PointsBreakdown)
    total_services: int = 0
    average_rating: float = 0.0
    total_ratings: int = 0
