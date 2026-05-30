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
    elite = "elite"


# ── Rank thresholds ──
RANK_THRESHOLDS = [
    ("bronze", 0),
    ("silver", 50),
    ("gold", 150),
    ("elite", 300),
]

RANK_CONFIG = {
    "bronze": {"label": "Bronce", "emoji": "🥉", "color": "#cd7f32", "next": "silver", "next_at": 50},
    "silver": {"label": "Plata", "emoji": "🥈", "color": "#94a3b8", "next": "gold", "next_at": 150},
    "gold":   {"label": "Oro",   "emoji": "🥇", "color": "#eab308", "next": "elite", "next_at": 300},
    "elite":  {"label": "Élite", "emoji": "👑", "color": "#8b5cf6", "next": None, "next_at": None},
}


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
    # ── Cancellation tracking ──
    cancellation_count: int = Field(default=0)
    cancellation_week_count: int = Field(default=0)  # Cancelaciones en últimos 7 días
    last_cancellation_at: Optional[datetime] = Field(default=None)
    suspended_until: Optional[datetime] = Field(default=None)

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


# ── Points calculation ──────────────────────────────────

# Points per rating star received
RATING_POINTS = {5: 8, 4: 4, 3: 0, 2: -5, 1: -10}


def calculate_rank_points(
    total_services: int,
    experience_years: int,
    certifications_count: int,
    average_rating: float,
    is_verified: bool,
    specializations_count: int = 0,
    has_bio: bool = False,
    has_avatar: bool = False,
    has_phone: bool = False,
    rating_breakdown: dict | None = None,
) -> tuple[int, str]:
    """
    Calculate rank points and determine rank tier.
    
    Points breakdown:
    - Each completed service: +10
    - Rating points: sum of RATING_POINTS per rating received
    - Profile complete (bio + avatar + phone): +15
    - SENA verified: +25
    - Each specialization: +5
    - Experience: +3 per year
    """
    points = 0

    # Services
    points += total_services * 10

    # Rating breakdown (individual ratings)
    if rating_breakdown:
        for stars, count in rating_breakdown.items():
            stars_int = int(stars)
            points += RATING_POINTS.get(stars_int, 0) * count
    else:
        # Fallback: estimate from average
        points += int(average_rating * 10)

    # Profile completeness
    profile_complete = has_bio and has_avatar and has_phone
    if profile_complete:
        points += 15

    # Certifications
    if is_verified:
        points += 25
    points += certifications_count * 15

    # Specializations
    points += specializations_count * 5

    # Experience
    points += experience_years * 3

    # Floor at 0
    points = max(0, points)

    # Determine rank
    rank = "bronze"
    for rank_name, threshold in RANK_THRESHOLDS:
        if points >= threshold:
            rank = rank_name

    return points, rank
