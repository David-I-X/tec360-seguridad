"""
Modelo de Pagos — Tec360 Seguridad
Soporta: efectivo, PSE, Nequi, Daviplata, tarjeta (via Wompi)
"""
from typing import Optional
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum
from sqlmodel import Field, SQLModel


class PaymentStatus(str, Enum):
    pending = "pending"                         # Esperando pago
    approved = "approved"                       # Pago aprobado (Wompi webhook)
    confirmed_by_technician = "confirmed_by_technician"  # Efectivo confirmado por técnico
    confirmed_by_admin = "confirmed_by_admin"   # Efectivo validado por admin
    failed = "failed"                           # Pago fallido
    refunded = "refunded"                       # Reembolsado


class PaymentMethod(str, Enum):
    cash = "cash"               # Efectivo
    pse = "pse"                 # PSE (transferencia bancaria)
    nequi = "nequi"             # Nequi
    daviplata = "daviplata"     # Daviplata
    card = "card"               # Tarjeta crédito/débito


class PaymentBase(SQLModel):
    amount: float
    currency: str = "COP"
    payment_method: PaymentMethod
    payment_provider: Optional[str] = None      # "wompi" | "manual" | None
    provider_reference: Optional[str] = None    # ID externo de Wompi
    status: PaymentStatus = Field(default=PaymentStatus.pending)
    notes: Optional[str] = None                 # Notas del técnico o admin
    paid_at: Optional[datetime] = None
    confirmed_by: Optional[UUID] = None         # User ID de quien confirmó


class Payment(PaymentBase, table=True):
    __tablename__ = "payments"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)

    service_id: UUID = Field(foreign_key="services.id", index=True)
    quotation_id: Optional[UUID] = Field(default=None, foreign_key="quotations.id")
    client_id: UUID = Field(foreign_key="users.id")
    technician_id: Optional[UUID] = Field(default=None, foreign_key="users.id")

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
