"""
Schemas de Pydantic para el sistema de calificaciones
Path: backend/app/schemas/rating.py
"""
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
from decimal import Decimal


# ============================================
# SCHEMAS DE INPUT (REQUEST)
# ============================================

class RatingCreate(BaseModel):
    """Schema para crear una calificación de servicio"""
    rating: int = Field(
        ...,
        ge=1,
        le=5,
        description="Calificación de 1 a 5 estrellas"
    )
    comment: Optional[str] = Field(
        None,
        min_length=10,
        max_length=1000,
        description="Comentario opcional sobre el servicio (mínimo 10 caracteres)"
    )
    
    @validator('comment')
    def validate_comment(cls, v):
        """Validar que el comentario no sea solo espacios"""
        if v and not v.strip():
            raise ValueError("El comentario no puede estar vacío")
        return v.strip() if v else None
    
    class Config:
        json_schema_extra = {
            "example": {
                "rating": 5,
                "comment": "Excelente servicio, muy profesional y puntual. Recomendado 100%."
            }
        }


class RatingUpdate(BaseModel):
    """Schema para actualizar una calificación (opcional, por si lo necesitas)"""
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = Field(None, min_length=10, max_length=1000)
    
    class Config:
        json_schema_extra = {
            "example": {
                "rating": 4,
                "comment": "Actualicé mi calificación después de pensar mejor."
            }
        }


# ============================================
# SCHEMAS DE OUTPUT (RESPONSE)
# ============================================

class RatingResponse(BaseModel):
    """Schema de respuesta completa de una calificación"""
    id: str
    service_id: str
    client_id: str
    technician_id: str
    rating: int
    comment: Optional[str]
    created_at: datetime
    
    # Información adicional del cliente (opcional)
    client_name: Optional[str] = None
    client_avatar_url: Optional[str] = None
    
    # Información del servicio (opcional)
    service_type: Optional[str] = None
    service_title: Optional[str] = None
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "rating-uuid-123",
                "service_id": "service-uuid-456",
                "client_id": "client-uuid-789",
                "technician_id": "tech-uuid-012",
                "rating": 5,
                "comment": "Excelente trabajo",
                "created_at": "2024-12-15T10:30:00Z",
                "client_name": "Juan Pérez",
                "client_avatar_url": None,
                "service_type": "gps_installation",
                "service_title": "Instalación GPS"
            }
        }


class RatingListItem(BaseModel):
    """Schema simplificado para listados de calificaciones"""
    id: str
    rating: int
    comment: Optional[str]
    created_at: datetime
    client_name: str
    client_avatar_url: Optional[str] = None
    service_type: Optional[str] = None
    
    class Config:
        from_attributes = True


class RatingListResponse(BaseModel):
    """Schema de respuesta paginada para listados"""
    ratings: list[RatingListItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    average_rating: Optional[Decimal] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "ratings": [
                    {
                        "id": "rating-1",
                        "rating": 5,
                        "comment": "Excelente",
                        "created_at": "2024-12-15T10:30:00Z",
                        "client_name": "Juan Pérez",
                        "client_avatar_url": None,
                        "service_type": "gps_installation"
                    }
                ],
                "total": 45,
                "page": 1,
                "page_size": 10,
                "total_pages": 5,
                "average_rating": "4.8"
            }
        }


# ============================================
# SCHEMAS DE ESTADÍSTICAS
# ============================================

class RatingStats(BaseModel):
    """Estadísticas de calificaciones de un técnico"""
    average_rating: Decimal = Field(description="Promedio de calificaciones")
    total_ratings: int = Field(description="Total de calificaciones recibidas")
    rating_distribution: dict[str, int] = Field(
        description="Distribución de calificaciones (1-5 estrellas)"
    )
    
    # Distribución detallada
    five_stars: int = 0
    four_stars: int = 0
    three_stars: int = 0
    two_stars: int = 0
    one_star: int = 0
    
    class Config:
        json_schema_extra = {
            "example": {
                "average_rating": "4.8",
                "total_ratings": 45,
                "rating_distribution": {
                    "5": 35,
                    "4": 8,
                    "3": 2,
                    "2": 0,
                    "1": 0
                },
                "five_stars": 35,
                "four_stars": 8,
                "three_stars": 2,
                "two_stars": 0,
                "one_star": 0
            }
        }


class ServiceRatingResponse(BaseModel):
    """Respuesta de calificación de un servicio específico"""
    service_id: str
    has_rating: bool
    rating: Optional[RatingResponse] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "service_id": "service-uuid-123",
                "has_rating": True,
                "rating": {
                    "id": "rating-uuid-456",
                    "rating": 5,
                    "comment": "Excelente servicio",
                    "created_at": "2024-12-15T10:30:00Z",
                    "client_name": "Juan Pérez"
                }
            }
        }


# ============================================
# SCHEMAS DE VALIDACIÓN
# ============================================

class CanRateServiceResponse(BaseModel):
    """Respuesta para verificar si se puede calificar un servicio"""
    can_rate: bool
    reason: Optional[str] = None
    service_status: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "can_rate": False,
                "reason": "El servicio aún no ha sido completado",
                "service_status": "in_progress"
            }
        }