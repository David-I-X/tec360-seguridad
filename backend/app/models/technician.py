from typing import Optional, List
from datetime import datetime
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel, JSON
from sqlalchemy import Column
from geoalchemy2 import Geometry
from enum import Enum


class TechnicianRank(str, Enum):
    bronze = "bronze"
    silver = "silver"
    gold = "gold"


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
    rank: str = Field(default="bronze")
    rank_points: int = Field(default=0)
    certifications_count: int = Field(default=0)

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


def calculate_rank_points(
    total_services: int,
    experience_years: int,
    certifications_count: int,
    average_rating: float,
    is_verified: bool
) -> tuple[int, str]:
    """
    Calculate rank points and determine rank tier.
    
    Points:
    - Each completed service: +5
    - Each month of experience (years*12): +2
    - Each certification: +15
    - Average rating * 10
    - SENA verified: +20 bonus
    
    Ranks:
    - Bronze: 0-49
    - Silver: 50-149
    - Gold: 150+
    """
    points = 0
    points += total_services * 5
    points += (experience_years * 12) * 2
    points += certifications_count * 15
    points += int(average_rating * 10)
    if is_verified:
        points += 20
    
    if points >= 150:
        rank = "gold"
    elif points >= 50:
        rank = "silver"
    else:
        rank = "bronze"
    
    return points, rank
