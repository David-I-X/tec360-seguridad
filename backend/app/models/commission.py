"""
Modelos de Comisiones — Tec360 Seguridad

CommissionLedger: Registro de comisión por cada servicio completado.
CommissionPayment: Registro de pagos de comisión que hace el técnico a Tec360.

Reglas de negocio:
- Comisión = 10% del precio del servicio
- Primeros 3 servicios completados: comisión = 0 (incentivo)
- Cada 3 servicios sin pagar comisión → notificación
- Si no paga en 48h después de notificación → bloqueo
"""
from typing import Optional
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum
from sqlmodel import Field, SQLModel


class CommissionStatus(str, Enum):
    """Estado de una entrada en el ledger"""
    pending = "pending"          # Comisión calculada, pendiente de cobro
    included = "included"       # Incluida en un CommissionPayment
    waived = "waived"           # Exonerada (primeros 3 servicios gratis)


class CommissionPaymentStatus(str, Enum):
    """Estado de un pago de comisión del técnico a Tec360"""
    pending = "pending"                     # Técnico notificado, aún no paga
    submitted = "submitted"                 # Técnico subió comprobante
    approved = "approved"                   # Admin verificó y aprobó
    rejected = "rejected"                   # Admin rechazó (comprobante inválido)


class CommissionLedger(SQLModel, table=True):
    """
    Registro individual de comisión por servicio completado.
    Una fila por servicio = una comisión calculada.
    """
    __tablename__ = "commission_ledger"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)

    technician_id: UUID = Field(foreign_key="users.id", index=True)
    service_id: UUID = Field(foreign_key="services.id", index=True)
    payment_id: Optional[UUID] = Field(
        default=None, foreign_key="commission_payments.id",
        description="CommissionPayment que cubre esta comisión (NULL si pendiente)"
    )

    service_amount: float = Field(description="Precio del servicio completado")
    commission_rate: float = Field(default=0.10, description="Tasa de comisión (0.10 = 10%)")
    commission_amount: float = Field(description="Monto de comisión = service_amount * commission_rate")
    status: CommissionStatus = Field(default=CommissionStatus.pending)

    # Tracking
    service_completed_at: datetime = Field(description="Cuándo se completó el servicio")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CommissionPayment(SQLModel, table=True):
    """
    Pago de comisiones acumuladas del técnico a Tec360.
    Cubre múltiples entradas del CommissionLedger.
    """
    __tablename__ = "commission_payments"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)

    technician_id: UUID = Field(foreign_key="users.id", index=True)
    amount: float = Field(description="Monto total de comisiones a pagar")
    payment_method: str = Field(
        default="nequi",
        description="Método: nequi, bancolombia, daviplata"
    )
    receipt_url: Optional[str] = Field(
        default=None,
        description="URL de la foto del comprobante de transferencia"
    )
    reference_number: Optional[str] = Field(
        default=None, max_length=100,
        description="Número de referencia de la transferencia"
    )
    status: CommissionPaymentStatus = Field(
        default=CommissionPaymentStatus.pending
    )
    admin_notes: Optional[str] = Field(default=None, max_length=500)

    # Fechas
    notified_at: Optional[datetime] = Field(
        default=None, description="Cuándo se le notificó al técnico"
    )
    submitted_at: Optional[datetime] = Field(
        default=None, description="Cuándo subió el comprobante"
    )
    reviewed_at: Optional[datetime] = Field(
        default=None, description="Cuándo el admin lo revisó"
    )
    reviewed_by: Optional[UUID] = Field(
        default=None, description="Admin que revisó"
    )
    due_date: Optional[datetime] = Field(
        default=None, description="Fecha límite (48h después de notificación)"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
