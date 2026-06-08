"""
Modelo de Créditos para Técnicos — Tec360 Seguridad

Los técnicos recargan créditos equivalentes al 18% del valor de los servicios
que desean ejecutar. Cada servicio aceptado consume créditos.

Reglas:
- Primeros 3 servicios completados son GRATIS (no consumen créditos)
- Saldo mínimo equivalente a 1 servicio para aceptar nuevos
- Si saldo llega a 0: técnico no puede aceptar hasta recargar
- Recargas son "créditos de acceso" (no wallet financiero → no SFC)
"""
from datetime import datetime
from uuid import UUID, uuid4
from typing import Optional
from sqlmodel import Field, SQLModel
from enum import Enum


class CreditTransactionType(str, Enum):
    recharge = "recharge"         # Recarga de créditos (Wompi o admin)
    deduction = "deduction"       # Descuento al aceptar un servicio
    refund = "refund"             # Reembolso (cliente canceló, etc.)
    bonus = "bonus"               # Bonificación administrativa
    free_service = "free_service" # Servicio gratis (primeros 3)


class TechnicianCredit(SQLModel, table=True):
    """Saldo actual de créditos del técnico."""
    __tablename__ = "technician_credits"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    technician_id: UUID = Field(foreign_key="users.id", unique=True, index=True)

    balance: float = Field(default=0.0)  # Saldo actual en COP
    total_recharged: float = Field(default=0.0)   # Total recargado histórico
    total_consumed: float = Field(default=0.0)     # Total consumido histórico
    free_services_used: int = Field(default=0)     # Servicios gratis usados (max 3)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CreditTransaction(SQLModel, table=True):
    """Registro de cada movimiento de créditos."""
    __tablename__ = "credit_transactions"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    technician_id: UUID = Field(foreign_key="users.id", index=True)
    
    transaction_type: str = Field(index=True)  # CreditTransactionType value
    amount: float = Field()                    # Monto de la transacción (positivo = ingreso)
    balance_after: float = Field()             # Saldo después de la transacción
    
    service_id: Optional[UUID] = Field(default=None, foreign_key="services.id")
    description: str = Field(default="")
    
    # Referencia de pago externo (Wompi transaction ID, etc.)
    external_reference: Optional[str] = Field(default=None)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── Constants ──
COMMISSION_RATE = 0.18  # 18% del valor del servicio
FREE_SERVICES_LIMIT = 3  # Primeros 3 servicios gratis
