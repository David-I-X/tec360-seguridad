"""
Notification Model - Sistema de notificaciones para Tec360
"""
from typing import Optional
from datetime import datetime
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel


class NotificationBase(SQLModel):
    """Base notification fields"""
    title: str = Field(max_length=200)
    message: str = Field(max_length=500)
    notification_type: str = Field(default="info")  # info, service, status, alert
    is_read: bool = Field(default=False)
    service_id: Optional[UUID] = Field(default=None, foreign_key="services.id")


class Notification(NotificationBase, table=True):
    """Notification table model"""
    __tablename__ = "notifications"
    
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class NotificationCreate(SQLModel):
    """Schema for creating a notification"""
    user_id: UUID
    title: str
    message: str
    notification_type: str = "info"
    service_id: Optional[UUID] = None


class NotificationRead(NotificationBase):
    """Schema for reading a notification"""
    id: UUID
    user_id: UUID
    created_at: datetime
