"""
Schemas Pydantic para servicios
Validación de entrada/salida de datos
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, validator
from decimal import Decimal


# ============================================
# ENUMS (deben coincidir con los de PostgreSQL)
# ============================================

class ServiceType(str):
    """Tipos de servicio disponibles"""
    GPS_INSTALLATION = "gps_installation"
    GPS_MAINTENANCE = "gps_maintenance"
    ALARM_INSTALLATION = "alarm_installation"
    ALARM_MAINTENANCE = "alarm_maintenance"
    CAMERA_INSTALLATION = "camera_installation"
    CAMERA_MAINTENANCE = "camera_maintenance"
    OTHER = "other"


class ServiceStatus(str):
    """Estados del servicio"""
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# ============================================
# SCHEMAS DE ENTRADA (Request)
# ============================================

class ServiceCreate(BaseModel):
    """
    Schema para crear un nuevo servicio.
    Usado por clientes al solicitar un servicio.
    """
    service_type: str = Field(
        ..., 
        description="Tipo de servicio solicitado",
        example="gps_installation"
    )
    title: str = Field(
        ..., 
        min_length=5, 
        max_length=200,
        description="Título descriptivo del servicio",
        example="Instalación de GPS en camión de carga"
    )
    description: Optional[str] = Field(
        None,
        max_length=2000,
        description="Descripción detallada del servicio",
        example="Necesito instalar GPS satelital en mi camión Hino 2020"
    )
    service_address: str = Field(
        ...,
        min_length=10,
        description="Dirección completa donde se realizará el servicio",
        example="Calle 50 #45-30, El Poblado, Medellín"
    )
    service_city: str = Field(
        default="Medellín",
        description="Ciudad del servicio",
        example="Medellín"
    )
    service_lat: float = Field(
        ...,
        ge=-90,
        le=90,
        description="Latitud de la ubicación del servicio",
        example=6.2442
    )
    service_lon: float = Field(
        ...,
        ge=-180,
        le=180,
        description="Longitud de la ubicación del servicio",
        example=-75.5636
    )
    scheduled_date: Optional[datetime] = Field(
        None,
        description="Fecha y hora preferida para el servicio (opcional)",
        example="2024-12-10T10:00:00"
    )
    estimated_price: Optional[Decimal] = Field(
        None,
        ge=0,
        description="Precio estimado del servicio (opcional)",
        example=350000.00
    )
    client_notes: Optional[str] = Field(
        None,
        max_length=1000,
        description="Notas adicionales del cliente",
        example="Disponible en horario de mañana, preferiblemente antes de las 12pm"
    )
    vehicle_type: Optional[str] = Field(
        None,
        description="Tipo de vehículo: car, motorcycle, heavy_cargo",
        example="car"
    )
    vehicle_model: Optional[str] = Field(
        None,
        max_length=200,
        description="Modelo del vehículo (texto libre)",
        example="Mazda 3 2020"
    )

    @validator('service_type')
    def validate_service_type(cls, v):
        """Validar que el tipo de servicio sea válido"""
        valid_types = [
            'gps_installation', 'gps_maintenance',
            'alarm_installation', 'alarm_maintenance',
            'camera_installation', 'camera_maintenance', 'other'
        ]
        if v not in valid_types:
            raise ValueError(f'Tipo de servicio inválido. Debe ser uno de: {", ".join(valid_types)}')
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "service_type": "gps_installation",
                "title": "Instalación de GPS en camión",
                "description": "Necesito GPS satelital con alertas de velocidad",
                "service_address": "Calle 50 #45-30, El Poblado",
                "service_city": "Medellín",
                "service_lat": 6.2442,
                "service_lon": -75.5636,
                "scheduled_date": "2024-12-10T10:00:00",
                "estimated_price": 350000.00,
                "client_notes": "Disponible de 8am a 12pm"
            }
        }


class ServiceUpdate(BaseModel):
    """
    Schema para actualizar un servicio existente.
    Los clientes pueden actualizar algunos campos, técnicos otros.
    """
    status: Optional[str] = Field(None, description="Nuevo estado del servicio")
    scheduled_date: Optional[datetime] = Field(None, description="Nueva fecha programada")
    started_at: Optional[datetime] = Field(None, description="Fecha de inicio del trabajo")
    completed_at: Optional[datetime] = Field(None, description="Fecha de finalización")
    final_price: Optional[Decimal] = Field(None, ge=0, description="Precio final del servicio")
    technician_notes: Optional[str] = Field(None, max_length=1000, description="Notas del técnico")
    client_notes: Optional[str] = Field(None, max_length=1000, description="Notas del cliente")

    @validator('status')
    def validate_status(cls, v):
        """Validar que el estado sea válido"""
        if v is not None:
            valid_statuses = ['pending', 'assigned', 'in_progress', 'completed', 'cancelled']
            if v not in valid_statuses:
                raise ValueError(f'Estado inválido. Debe ser uno de: {", ".join(valid_statuses)}')
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "status": "in_progress",
                "started_at": "2024-12-10T10:30:00",
                "technician_notes": "Iniciando instalación del GPS"
            }
        }


class ServiceAssign(BaseModel):
    """
    Schema para asignar un técnico a un servicio.
    Usado por admins o el sistema de asignación automática.
    """
    technician_id: str = Field(
        ...,
        description="UUID del técnico a asignar",
        example="bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "technician_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
            }
        }


# ============================================
# SCHEMAS DE SALIDA (Response)
# ============================================

class ServiceClient(BaseModel):
    """Info básica del cliente (para mostrar en detalle de servicio)"""
    id: str
    email: str
    full_name: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        from_attributes = True


class ServiceTechnician(BaseModel):
    """Info básica del técnico (para mostrar en detalle de servicio)"""
    id: str
    email: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class ServiceResponse(BaseModel):
    """
    Schema de respuesta completo para un servicio.
    Incluye toda la información y relaciones.
    """
    id: str
    client_id: str
    technician_id: Optional[str] = None
    service_type: str
    status: str
    title: str
    description: Optional[str] = None
    service_address: str
    service_city: str
    service_lat: float
    service_lon: float
    requested_date: datetime
    scheduled_date: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    estimated_price: Optional[Decimal] = None
    final_price: Optional[Decimal] = None
    client_notes: Optional[str] = None
    technician_notes: Optional[str] = None
    vehicle_type: Optional[str] = None
    vehicle_model: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Relaciones (opcionales, se cargan si se solicita)
    client: Optional[ServiceClient] = None
    technician: Optional[ServiceTechnician] = None

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "11111111-1111-1111-1111-111111111111",
                "client_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                "technician_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                "service_type": "gps_installation",
                "status": "in_progress",
                "title": "Instalación de GPS en camión",
                "description": "GPS satelital con alertas",
                "service_address": "Calle 50 #45-30, El Poblado",
                "service_city": "Medellín",
                "service_lat": 6.2442,
                "service_lon": -75.5636,
                "requested_date": "2024-12-01T10:00:00",
                "scheduled_date": "2024-12-10T10:00:00",
                "estimated_price": 350000.00,
                "created_at": "2024-12-01T10:00:00",
                "updated_at": "2024-12-01T10:00:00"
            }
        }


class ServiceListResponse(BaseModel):
    """
    Schema para listar servicios (versión simplificada).
    No incluye relaciones completas para optimizar performance.
    """
    id: str
    service_type: str
    status: str
    title: str
    service_city: str
    scheduled_date: Optional[datetime] = None
    estimated_price: Optional[Decimal] = None
    vehicle_type: Optional[str] = None
    vehicle_model: Optional[str] = None
    created_at: datetime
    
    # Info mínima del cliente/técnico
    client_name: Optional[str] = None
    technician_name: Optional[str] = None

    class Config:
        from_attributes = True


class ServiceListPaginated(BaseModel):
    """
    Respuesta paginada para listado de servicios.
    """
    services: List[ServiceListResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

    class Config:
        json_schema_extra = {
            "example": {
                "services": [
                    {
                        "id": "11111111-1111-1111-1111-111111111111",
                        "service_type": "gps_installation",
                        "status": "in_progress",
                        "title": "Instalación GPS camión",
                        "service_city": "Medellín",
                        "scheduled_date": "2024-12-10T10:00:00",
                        "estimated_price": 350000.00,
                        "created_at": "2024-12-01T10:00:00",
                        "client_name": "Juan Pérez",
                        "technician_name": "Carlos Rodríguez"
                    }
                ],
                "total": 25,
                "page": 1,
                "page_size": 10,
                "total_pages": 3
            }
        }


class NearbyTechnicianResponse(BaseModel):
    """
    Schema para técnicos cercanos a un servicio.
    Usado al buscar técnicos disponibles para asignar.
    """
    technician_id: str
    user_id: str
    full_name: Optional[str] = None
    distance_km: float
    average_rating: Decimal
    specializations: List[str]
    is_available: bool

    class Config:
        json_schema_extra = {
            "example": {
                "technician_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                "user_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                "full_name": "Carlos Rodríguez",
                "distance_km": 3.5,
                "average_rating": 4.8,
                "specializations": ["gps_installation", "gps_maintenance"],
                "is_available": True
            }
        }