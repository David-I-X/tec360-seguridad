from typing import Optional
from datetime import datetime
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from geoalchemy2 import Geometry
from enum import Enum

class ServiceStatus(str, Enum):
    pending = "pending"
    quoted = "quoted"          # Tiene cotizaciones pendientes
    assigned = "assigned"
    en_route = "en_route"      # Técnico en camino
    arrived = "arrived"        # Técnico llegó al lugar
    in_progress = "in_progress"
    paused = "paused"          # Agregado para incidentes
    completed = "completed"
    confirmed = "confirmed"    # Cliente confirmó que vehículo funciona
    cancelled = "cancelled"

class ServiceType(str, Enum):
    gps_installation = "gps_installation"
    gps_maintenance = "gps_maintenance"
    alarm_installation = "alarm_installation"
    alarm_maintenance = "alarm_maintenance"
    camera_installation = "camera_installation"
    camera_maintenance = "camera_maintenance"
    vehicle_recovery = "vehicle_recovery"
    other = "other"

class VehicleType(str, Enum):
    car = "car"
    motorcycle = "motorcycle"
    heavy_cargo = "heavy_cargo"

class ServiceBase(SQLModel):
    title: str
    description: Optional[str] = None
    service_type: ServiceType
    status: ServiceStatus = Field(default=ServiceStatus.pending)
    service_address: str
    estimated_price: Optional[float] = None
    requested_date: datetime = Field(default_factory=datetime.utcnow)
    scheduled_date: Optional[datetime] = None
    vehicle_type: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_plate: Optional[str] = None
    vehicle_photo_url: Optional[str] = None
    client_confirmed_at: Optional[datetime] = None
    payment_method: Optional[str] = Field(default=None, description="e.g. 'online' or 'cash'")
    payment_status: Optional[str] = Field(default="pending", description="e.g. 'pending' or 'paid'")
    service_metadata: Optional[dict] = Field(default=None, sa_column=Column(JSONB))

class Service(ServiceBase, table=True):
    __tablename__ = "services"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    
    client_id: UUID = Field(foreign_key="users.id")
    technician_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    
    service_location: Optional[str] = Field(
        default=None, 
        sa_column=Column(Geometry("POINT", srid=4326))
    )
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ServiceCreate(ServiceBase):
    latitude: float
    longitude: float
    client_id: UUID

class ServiceRead(ServiceBase):
    id: UUID
    client_id: UUID
    technician_id: Optional[UUID]
