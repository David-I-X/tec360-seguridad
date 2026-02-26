from typing import Optional
from datetime import datetime
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel
from enum import Enum

class RatedBy(str, Enum):
    client = "client"
    technician = "technician"

class ServiceRating(SQLModel, table=True):
    __tablename__ = "service_ratings"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    service_id: UUID = Field(foreign_key="services.id")
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    rated_by: str = Field(default="client")  # "client" or "technician"
    rater_id: Optional[str] = None  # user_id of who rated
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ImageType(str, Enum):
    before = "before"
    during = "during"
    after = "after"
    issue = "issue"

class ServiceImage(SQLModel, table=True):
    __tablename__ = "service_images"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    service_id: UUID = Field(foreign_key="services.id")
    image_url: str
    image_type: Optional[ImageType] = None
    uploaded_by: UUID = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
