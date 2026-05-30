"""
Modelo para reportes de incidentes en campo (Sprint 2 - Task 5)
"""
from datetime import datetime
from uuid import UUID, uuid4
from typing import Optional
from sqlmodel import Field, SQLModel
from enum import Enum

class IncidentType(str, Enum):
    client_absent = "client_absent"
    vehicle_mismatch = "vehicle_mismatch"
    device_incompatible = "device_incompatible"
    security_issue = "security_issue"
    other = "other"

class IncidentReport(SQLModel, table=True):
    __tablename__ = "incident_reports"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    service_id: UUID = Field(foreign_key="services.id", index=True)
    technician_id: UUID = Field(foreign_key="users.id", index=True)
    
    incident_type: IncidentType = Field(index=True)
    description: str
    
    # Optional evidence (URL to an uploaded image)
    evidence_url: Optional[str] = Field(default=None)
    
    # Status of the incident resolution
    is_resolved: bool = Field(default=False)
    resolved_at: Optional[datetime] = Field(default=None)
    admin_notes: Optional[str] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)
