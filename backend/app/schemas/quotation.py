"""
Schemas Pydantic para cotizaciones
Path: backend/app/schemas/quotation.py
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


# ============================================
# ENUMS (mirror from model)
# ============================================

class QuotationStatusEnum(str):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    counter_offered = "counter_offered"
    expired = "expired"
    cancelled = "cancelled"


# ============================================
# INPUT SCHEMAS
# ============================================

class QuotationCreate(BaseModel):
    """Schema para crear una cotización"""
    amount: Decimal = Field(..., gt=0, description="Monto del presupuesto")
    description: str = Field(..., min_length=10, max_length=2000, description="Desglose del presupuesto")
    expires_in_hours: Optional[int] = Field(None, ge=1, le=168, description="Horas hasta expiración (máx 7 días)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "amount": 450000,
                "description": "Instalación de 4 cámaras HD:\n- 4x Cámara Hikvision HD ($80,000 c/u)\n- Cables y conectores ($50,000)\n- Mano de obra ($120,000)",
                "expires_in_hours": 48
            }
        }


class QuotationCounterOffer(BaseModel):
    """Schema para contraoferta del cliente"""
    counter_amount: Decimal = Field(..., gt=0, description="Monto de contraoferta")
    client_response: Optional[str] = Field(None, max_length=1000, description="Comentario del cliente")
    
    class Config:
        json_schema_extra = {
            "example": {
                "counter_amount": 400000,
                "client_response": "¿Podría hacer un descuento si solo instalamos 3 cámaras?"
            }
        }


class QuotationReject(BaseModel):
    """Schema para rechazar cotización"""
    client_response: Optional[str] = Field(None, max_length=1000, description="Razón del rechazo")


# ============================================
# OUTPUT SCHEMAS
# ============================================

class QuotationResponse(BaseModel):
    """Respuesta completa de cotización"""
    id: str
    service_id: str
    technician_id: str
    amount: Decimal
    description: str
    status: str
    client_response: Optional[str] = None
    counter_amount: Optional[Decimal] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    responded_at: Optional[datetime] = None
    
    # Info adicional del técnico
    technician_name: Optional[str] = None
    technician_rating: Optional[float] = None
    technician_total_services: Optional[int] = None
    technician_rank: Optional[str] = None
    technician_rank_points: Optional[int] = None
    
    class Config:
        from_attributes = True


class QuotationListItem(BaseModel):
    """Item resumido para listados"""
    id: str
    service_id: str
    technician_id: str
    technician_name: str
    technician_rating: Optional[float] = None
    amount: Decimal
    description: str
    status: str
    client_response: Optional[str] = None
    counter_amount: Optional[Decimal] = None
    created_at: datetime
    expires_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class QuotationListResponse(BaseModel):
    """Respuesta paginada de cotizaciones"""
    quotations: List[QuotationListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class ServiceQuotationsSummary(BaseModel):
    """Resumen de cotizaciones de un servicio"""
    service_id: str
    total_quotations: int
    pending_count: int
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None
    avg_amount: Optional[Decimal] = None
