"""
Schemas Pydantic para técnicos
Validación de entrada/salida de datos de técnicos
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, validator
from decimal import Decimal


# ============================================
# SCHEMAS DE ENTRADA (Request)
# ============================================

class TechnicianCreate(BaseModel):
    """
    Schema para crear perfil de técnico.
    Usado cuando un usuario con rol 'technician' completa su perfil.
    """
    sena_certification_number: str = Field(
        ...,
        min_length=5,
        max_length=50,
        description="Número de certificación SENA",
        example="SENA-2024-001234"
    )
    specializations: List[str] = Field(
        ...,
        min_items=1,
        max_items=10,
        description="Lista de especializaciones del técnico",
        example=["gps_installation", "gps_maintenance", "alarm_installation"]
    )
    experience_years: int = Field(
        default=0,
        ge=0,
        le=50,
        description="Años de experiencia",
        example=5
    )
    bio: Optional[str] = Field(
        None,
        max_length=1000,
        description="Biografía o descripción del técnico",
        example="Técnico certificado SENA con 5 años de experiencia en instalación de GPS"
    )
    current_lat: Optional[float] = Field(
        None,
        ge=-90,
        le=90,
        description="Latitud de ubicación actual",
        example=6.2442
    )
    current_lon: Optional[float] = Field(
        None,
        ge=-180,
        le=180,
        description="Longitud de ubicación actual",
        example=-75.5636
    )
    service_radius_km: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Radio de servicio en kilómetros",
        example=25
    )

    @validator('specializations')
    def validate_specializations(cls, v):
        """Validar que las especializaciones sean válidas"""
        valid_specializations = [
            'gps_installation', 'gps_maintenance',
            'alarm_installation', 'alarm_maintenance',
            'camera_installation', 'camera_maintenance',
            'other'
        ]
        for spec in v:
            if spec not in valid_specializations:
                raise ValueError(f'Especialización inválida: {spec}')
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "sena_certification_number": "SENA-2024-001234",
                "specializations": ["gps_installation", "alarm_installation"],
                "experience_years": 5,
                "bio": "Técnico especializado en GPS y alarmas",
                "current_lat": 6.2442,
                "current_lon": -75.5636,
                "service_radius_km": 25
            }
        }


class TechnicianUpdate(BaseModel):
    """
    Schema para actualizar perfil de técnico.
    Todos los campos son opcionales.
    """
    sena_certification_number: Optional[str] = Field(None, min_length=5, max_length=50)
    specializations: Optional[List[str]] = Field(None, min_items=1, max_items=10)
    experience_years: Optional[int] = Field(None, ge=0, le=50)
    bio: Optional[str] = Field(None, max_length=1000)
    service_radius_km: Optional[int] = Field(None, ge=1, le=100)
    is_available: Optional[bool] = Field(
        None,
        description="Disponibilidad del técnico para nuevos servicios"
    )

    @validator('specializations')
    def validate_specializations(cls, v):
        if v is not None:
            valid_specializations = [
                'gps_installation', 'gps_maintenance',
                'alarm_installation', 'alarm_maintenance',
                'camera_installation', 'camera_maintenance',
                'other'
            ]
            for spec in v:
                if spec not in valid_specializations:
                    raise ValueError(f'Especialización inválida: {spec}')
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "bio": "Técnico actualizado con 6 años de experiencia",
                "is_available": True,
                "service_radius_km": 30
            }
        }


class TechnicianLocationUpdate(BaseModel):
    """
    Schema para actualizar solo la ubicación del técnico.
    Usado cuando el técnico está en movimiento y reporta su ubicación.
    """
    current_lat: float = Field(
        ...,
        ge=-90,
        le=90,
        description="Nueva latitud",
        example=6.2500
    )
    current_lon: float = Field(
        ...,
        ge=-180,
        le=180,
        description="Nueva longitud",
        example=-75.5700
    )

    class Config:
        json_schema_extra = {
            "example": {
                "current_lat": 6.2500,
                "current_lon": -75.5700
            }
        }


class TechnicianAvailabilityUpdate(BaseModel):
    """
    Schema para cambiar la disponibilidad del técnico (switch on/off).
    """
    is_available: bool = Field(
        ...,
        description="True = disponible para servicios, False = no disponible"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "is_available": False
            }
        }


# ============================================
# SCHEMAS DE SALIDA (Response)
# ============================================

class TechnicianUserInfo(BaseModel):
    """Info básica del usuario asociado al técnico"""
    id: str
    email: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    city: Optional[str] = None

    class Config:
        from_attributes = True


class TechnicianResponse(BaseModel):
    """
    Schema de respuesta completo para un técnico.
    Incluye información del perfil técnico y datos del usuario.
    """
    id: str
    user_id: str
    sena_certification_number: Optional[str] = None
    specializations: List[str] = []
    experience_years: int
    bio: Optional[str] = None
    current_lat: Optional[float] = None
    current_lon: Optional[float] = None
    service_radius_km: int
    is_available: bool
    is_verified: bool
    total_services: int
    average_rating: Decimal
    created_at: datetime
    updated_at: datetime
    
    # Información del usuario
    user: Optional[TechnicianUserInfo] = None

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                "user_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                "sena_certification_number": "SENA-2024-001234",
                "specializations": ["gps_installation", "alarm_installation"],
                "experience_years": 5,
                "bio": "Técnico certificado SENA",
                "current_lat": 6.2442,
                "current_lon": -75.5636,
                "service_radius_km": 25,
                "is_available": True,
                "is_verified": True,
                "total_services": 45,
                "average_rating": 4.8,
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-12-01T00:00:00"
            }
        }


class TechnicianListItem(BaseModel):
    """
    Schema simplificado para listar técnicos.
    Menos campos para optimizar performance en listados.
    """
    id: str
    user_id: str
    full_name: Optional[str] = None
    specializations: List[str] = []
    experience_years: int
    service_radius_km: int
    is_available: bool
    is_verified: bool
    average_rating: Decimal
    total_services: int
    city: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class TechnicianListResponse(BaseModel):
    """
    Respuesta paginada para listado de técnicos.
    """
    technicians: List[TechnicianListItem]
    total: int
    page: int
    page_size: int
    total_pages: int

    class Config:
        json_schema_extra = {
            "example": {
                "technicians": [
                    {
                        "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                        "user_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                        "full_name": "Carlos Rodríguez",
                        "specializations": ["gps_installation"],
                        "experience_years": 5,
                        "service_radius_km": 25,
                        "is_available": True,
                        "is_verified": True,
                        "average_rating": 4.8,
                        "total_services": 45,
                        "city": "Medellín"
                    }
                ],
                "total": 15,
                "page": 1,
                "page_size": 10,
                "total_pages": 2
            }
        }


class TechnicianPublicProfile(BaseModel):
    """
    Perfil público del técnico (sin datos sensibles).
    Usado para mostrar a clientes cuando buscan técnicos.
    """
    user_id: str
    full_name: Optional[str] = None
    specializations: List[str]
    experience_years: int
    bio: Optional[str] = None
    service_radius_km: int
    average_rating: Decimal
    total_services: int
    city: Optional[str] = None
    avatar_url: Optional[str] = None
    is_verified: bool

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "user_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                "full_name": "Carlos Rodríguez",
                "specializations": ["gps_installation", "alarm_installation"],
                "experience_years": 5,
                "bio": "Técnico especializado en GPS",
                "service_radius_km": 25,
                "average_rating": 4.8,
                "total_services": 45,
                "city": "Medellín",
                "is_verified": True
            }
        }


class TechnicianStatsResponse(BaseModel):
    """
    Estadísticas del técnico.
    """
    total_services: int
    completed_services: int
    in_progress_services: int
    cancelled_services: int
    average_rating: Decimal
    total_earned: Optional[Decimal] = None
    services_this_month: int
    services_this_week: int

    class Config:
        json_schema_extra = {
            "example": {
                "total_services": 50,
                "completed_services": 45,
                "in_progress_services": 2,
                "cancelled_services": 3,
                "average_rating": 4.8,
                "total_earned": 15000000.00,
                "services_this_month": 8,
                "services_this_week": 2
            }
        }


class NearbyTechnicianResult(BaseModel):
    """
    Resultado de búsqueda de técnicos cercanos.
    Incluye distancia calculada con PostGIS.
    """
    technician_id: str
    user_id: str
    full_name: Optional[str] = None
    specializations: List[str]
    experience_years: int
    distance_km: float
    average_rating: Decimal
    total_services: int
    is_available: bool
    is_verified: bool
    avatar_url: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "technician_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                "user_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                "full_name": "Carlos Rodríguez",
                "specializations": ["gps_installation"],
                "experience_years": 5,
                "distance_km": 3.5,
                "average_rating": 4.8,
                "total_services": 45,
                "is_available": True,
                "is_verified": True
            }
        }

class TechnicianScheduleCreate(BaseModel):
    day_of_week: int = Field(ge=0, le=6, description="0=Monday, 6=Sunday")
    start_time: str = Field(description="Hora inicio HH:MM")
    end_time: str = Field(description="Hora fin HH:MM")
    is_active: bool = True

class TechnicianScheduleResponse(BaseModel):
    id: str
    technician_id: str
    day_of_week: int
    start_time: str
    end_time: str
    is_active: bool

class PortfolioImageCreate(BaseModel):
    image_url: str
    description: Optional[str] = None

class PortfolioImageResponse(BaseModel):
    id: str
    technician_id: str
    image_url: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True