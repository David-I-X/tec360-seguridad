"""
Modelo SQLModel para Ofertas de Despacho Inteligente
Path: backend/app/models/dispatch.py
"""
from typing import Optional
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum
from sqlmodel import Field, SQLModel


class DispatchOfferStatus(str, Enum):
    """Estados del ciclo de vida de una oferta de despacho."""
    offered = "offered"       # Oferta activa, esperando respuesta del técnico
    accepted = "accepted"     # Aceptada por el técnico (ganador de la asignación)
    rejected = "rejected"     # Rechazada activamente por el técnico
    expired = "expired"       # Expiró la ventana de tiempo de la ola sin respuesta
    cancelled = "cancelled"   # Cancelada porque otro técnico aceptó primero o servicio cancelado


class DispatchOffer(SQLModel, table=True):
    """Modelo para registro y auditoría de ofertas de despacho por olas."""
    __tablename__ = "dispatch_offers"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    service_id: UUID = Field(foreign_key="services.id", index=True)
    technician_id: UUID = Field(foreign_key="users.id", index=True)

    wave: int = Field(default=1, index=True)
    status: DispatchOfferStatus = Field(default=DispatchOfferStatus.offered, index=True)
    score: float = Field(default=0.0)
    distance_km: Optional[float] = Field(default=None)

    offered_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(index=True)
    responded_at: Optional[datetime] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
