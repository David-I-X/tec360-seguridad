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


class DigitalPaymentIntent(BaseModel):
    """Cliente inicia un pago digital (PSE, Nequi, Daviplata, Tarjeta)"""
    service_id: str
    amount: float = Field(..., gt=0, description="Monto a pagar en COP")
    payment_method: str = Field(..., description="pse | nequi | daviplata | card")
    bank_name: Optional[str] = Field(None, description="Nombre del banco (solo PSE)")
    card_last_four: Optional[str] = Field(None, max_length=4, description="Últimos 4 dígitos (solo tarjeta)")


class DigitalPaymentConfirm(BaseModel):
    """Cliente confirma la transacción digital"""
    transaction_id: str = Field(..., description="ID de transacción devuelto por /digital/intent")


class PaymentIntentResponse(BaseModel):
    """Respuesta al crear un intent de pago digital"""
    transaction_id: str
    status: str = "processing"
    payment_method: str
    amount: float
    message: str = "Procesando pago..."


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

    # DIAN Electronic Invoice fields (Factura A - Cliente)
    invoice_number: Optional[str] = None
    cufe: Optional[str] = None
    qr_url: Optional[str] = None
    pdf_url: Optional[str] = None
    dian_status: Optional[str] = None

    # Factura B (Comisión al Técnico)
    tech_invoice_number: Optional[str] = None
    tech_cufe: Optional[str] = None
    tech_qr_url: Optional[str] = None
    tech_pdf_url: Optional[str] = None
    tech_dian_status: Optional[str] = None
    commission_amount: Optional[float] = None


class PaymentListResponse(BaseModel):
    items: List[PaymentResponse]
    total: int


class TechnicianPaymentSummary(BaseModel):
    """Resumen financiero para el técnico"""
    total_collected: float = Field(0, description="Total cobrado en COP")
    payments_count: int = Field(0, description="Cantidad de pagos registrados")
    pending_validation: int = Field(0, description="Pagos pendientes de validar por admin")
    validated: int = Field(0, description="Pagos ya validados por admin")
