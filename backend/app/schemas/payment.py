"""
Schemas de Pagos — Tec360 Seguridad
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class CashPaymentConfirm(BaseModel):
    """Técnico confirma que recibió pago en efectivo"""
    service_id: str
    amount: float = Field(..., gt=0, description="Monto recibido en COP")
    notes: Optional[str] = Field(None, max_length=500, description="Notas opcionales")


class PaymentResponse(BaseModel):
    id: str
    service_id: str
    client_id: str
    technician_id: Optional[str]
    quotation_id: Optional[str]
    amount: float
    currency: str
    payment_method: str
    payment_provider: Optional[str]
    provider_reference: Optional[str]
    status: str
    notes: Optional[str]
    paid_at: Optional[datetime]
    confirmed_by: Optional[str]
    created_at: datetime

    # Hydrated names (optional)
    client_name: Optional[str] = None
    technician_name: Optional[str] = None
    service_title: Optional[str] = None


class PaymentListResponse(BaseModel):
    items: List[PaymentResponse]
    total: int
