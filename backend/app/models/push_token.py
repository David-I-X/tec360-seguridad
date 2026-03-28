from datetime import datetime
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel
from sqlalchemy import Column, Enum
import enum

class PlatformEnum(str, enum.Enum):
    expo = "expo"
    web_push = "web_push"
    pwa_ios = "pwa_ios"
    pwa_android = "pwa_android"

class PushTokenBase(SQLModel):
    user_id: UUID = Field(foreign_key="users.id", index=True)
    token: str = Field(unique=True, index=True)
    platform: PlatformEnum = Field(sa_column=Column(Enum(PlatformEnum)))
    is_active: bool = Field(default=True)

class PushToken(PushTokenBase, table=True):
    __tablename__ = "push_tokens"
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PushTokenCreate(SQLModel):
    token: str
    platform: PlatformEnum

class PushTokenRead(PushTokenBase):
    id: UUID
    created_at: datetime
