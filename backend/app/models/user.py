from typing import Optional
from datetime import datetime
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel
from sqlalchemy import Column, JSON
from geoalchemy2 import Geometry

class UserBase(SQLModel):
    email: str = Field(unique=True, index=True)
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: str = Field(default="client") # client, technician, admin, reaction_team
    is_active: bool = Field(default=True)
    avatar_url: Optional[str] = None
    address: Optional[str] = None
    city: str = Field(default="Medellín")
    notification_preferences: dict = Field(default={}, sa_column=Column(JSON))

class User(UserBase, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    hashed_password: str = Field(nullable=False)
    
    # GeoAlchemy2 for PostGIS location
    location: Optional[str] = Field(
        default=None, 
        sa_column=Column(Geometry("POINT", srid=4326))
    )
    
    # Client Trust / Penalties
    cancellation_count: int = Field(default=0)
    flagged_for_review: bool = Field(default=False)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Note: relationship fields in SQLModel are typed list, but we use SQLAlchemy relation type
    # For now, if we need it, we can declare it. SQLModel uses List["PushToken"]
    # So we prefer generic back_populates if needed


class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: UUID
