from typing import Optional, List
from datetime import datetime
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel, JSON
from sqlalchemy import Column
from geoalchemy2 import Geometry

class TechnicianBase(SQLModel):
    sena_certification_number: Optional[str] = Field(default=None, unique=True)
    specializations: List[str] = Field(default=[], sa_column=Column(JSON))
    experience_years: int = Field(default=0)
    bio: Optional[str] = None
    service_radius_km: int = Field(default=20)
    is_available: bool = Field(default=True)
    is_verified: bool = Field(default=False)
    total_services: int = Field(default=0)
    average_rating: float = Field(default=0.0)

class Technician(TechnicianBase, table=True):
    __tablename__ = "technicians"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    user_id: UUID = Field(foreign_key="users.id", unique=True)
    
    current_location: Optional[str] = Field(
        default=None, 
        sa_column=Column(Geometry("POINT", srid=4326))
    )
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TechnicianCreate(TechnicianBase):
    user_id: UUID

class TechnicianRead(TechnicianBase):
    id: UUID
    user_id: UUID
