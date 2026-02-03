from typing import Optional
from datetime import datetime
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel
from sqlalchemy import Column
from geoalchemy2 import Geometry

class UserBase(SQLModel):
    email: str = Field(unique=True, index=True)
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: str = Field(default="client") # client, technician, admin
    is_active: bool = Field(default=True)
    avatar_url: Optional[str] = None
    address: Optional[str] = None
    city: str = Field(default="Medellín")

class User(UserBase, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    hashed_password: str = Field(nullable=False)
    
    # GeoAlchemy2 for PostGIS location
    location: Optional[str] = Field(
        default=None, 
        sa_column=Column(Geometry("POINT", srid=4326))
    )
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: UUID
