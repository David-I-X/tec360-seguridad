from pydantic import BaseModel, Field
from typing import Optional
from app.models.incident import IncidentType

class IncidentCreate(BaseModel):
    incident_type: IncidentType
    description: str = Field(..., min_length=10, max_length=500)
    evidence_url: Optional[str] = None
