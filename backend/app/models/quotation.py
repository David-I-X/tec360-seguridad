"""
Modelo SQLModel para cotizaciones
Path: backend/app/models/quotation.py
"""
from typing import Optional
from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel
from enum import Enum


class QuotationStatus(str, Enum):
    """Estados posibles de una cotización"""
    pending = "pending"           # Enviada, esperando respuesta
    approved = "approved"         # Aprobada por cliente
    rejected = "rejected"         # Rechazada por cliente
    counter_offered = "counter_offered"  # Cliente hizo contraoferta
    expired = "expired"           # Expiró sin respuesta
    cancelled = "cancelled"       # Cancelada por técnico


class Quotation(SQLModel, table=True):
    """Modelo de cotización de servicio"""
    __tablename__ = "quotations"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    service_id: UUID = Field(foreign_key="services.id", index=True)
    technician_id: UUID = Field(foreign_key="users.id", index=True)
    
    # Monto y descripción
    amount: Decimal = Field(max_digits=10, decimal_places=2)
    description: str = Field(max_length=2000)  # Desglose del presupuesto
    
    # Estado
    status: QuotationStatus = Field(default=QuotationStatus.pending)
    
    # Respuesta del cliente
    client_response: Optional[str] = Field(default=None, max_length=1000)
    counter_amount: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    
    # Expiración (opcional)
    expires_at: Optional[datetime] = Field(default=None)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    responded_at: Optional[datetime] = Field(default=None)  # Cuando cliente respondió
