"""
Modelo para imágenes de portafolio de técnicos (Sprint 3 - Task 11)
"""
from datetime import datetime
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel
from typing import Optional

class PortfolioImage(SQLModel, table=True):
    __tablename__ = "portfolio_images"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    technician_id: UUID = Field(foreign_key="users.id", index=True)
    
    image_url: str = Field(description="URL de la imagen alojada (ej. S3)")
    description: Optional[str] = Field(default=None, max_length=500)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
