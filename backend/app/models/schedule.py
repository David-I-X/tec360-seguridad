"""
Modelo de horarios de técnicos (Sprint 2 - Task 7)
"""
from datetime import datetime, time
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel

class TechnicianSchedule(SQLModel, table=True):
    """
    Horario de trabajo de un técnico.
    Cada registro representa la disponibilidad de un técnico en un día de la semana.
    """
    __tablename__ = "technician_schedules"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    technician_id: UUID = Field(foreign_key="users.id", index=True)
    
    day_of_week: int = Field(ge=0, le=6)  # 0=Monday, 6=Sunday
    start_time: time
    end_time: time
    
    is_active: bool = Field(default=True)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
