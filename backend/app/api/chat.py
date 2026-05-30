"""
Chat API Endpoints
Historial de mensajes y marcado de lectura para el chat en tiempo real.
"""
from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, col
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.message import Message
from app.models.service import Service

router = APIRouter(prefix="/services/{service_id}/messages", tags=["chat"])


# ---------- Schemas ----------

class MessageRead(BaseModel):
    id: UUID
    service_id: UUID
    sender_id: UUID
    text: str
    created_at: datetime
    is_read: bool

    class Config:
        from_attributes = True


class UnreadCountResponse(BaseModel):
    unread_count: int


# ---------- Helpers ----------

def _validate_participant(
    service_id: UUID,
    user_id: str,
    session: Session,
) -> Service:
    """Verify the requesting user is either the client or the assigned technician."""
    service = session.get(Service, service_id)
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Servicio no encontrado",
        )

    if str(service.client_id) != user_id and str(service.technician_id) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso al chat de este servicio",
        )
    return service


# ---------- Endpoints ----------

@router.get("", response_model=List[MessageRead])
async def get_chat_history(
    service_id: UUID,
    limit: int = Query(default=50, le=200),
    before: datetime | None = Query(default=None, description="Cursor: traer mensajes antes de esta fecha"),
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Devuelve el historial de chat del servicio, ordenado ascendente.
    Soporta paginación con cursor `before` para scroll infinito.
    """
    _validate_participant(service_id, current_user["id"], session)

    stmt = (
        select(Message)
        .where(Message.service_id == service_id)
    )
    if before:
        stmt = stmt.where(Message.created_at < before)

    stmt = stmt.order_by(col(Message.created_at).desc()).limit(limit)

    messages = session.exec(stmt).all()
    # Devolver en orden cronológico ascendente
    messages.reverse()
    return messages


@router.post("/read", response_model=dict)
async def mark_messages_as_read(
    service_id: UUID,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Marca como leídos todos los mensajes enviados por el OTRO participante.
    (Los que no fueron enviados por el usuario actual.)
    """
    _validate_participant(service_id, current_user["id"], session)

    stmt = (
        select(Message)
        .where(Message.service_id == service_id)
        .where(Message.sender_id != UUID(current_user["id"]))
        .where(Message.is_read == False)  # noqa: E712
    )
    unread_messages = session.exec(stmt).all()
    count = 0
    for msg in unread_messages:
        msg.is_read = True
        session.add(msg)
        count += 1

    session.commit()
    return {"success": True, "marked_read": count}


@router.get("/unread", response_model=UnreadCountResponse)
async def get_unread_count(
    service_id: UUID,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Devuelve la cantidad de mensajes no leídos para el usuario actual
    en este servicio (mensajes del otro participante que no han sido leídos).
    """
    _validate_participant(service_id, current_user["id"], session)

    stmt = (
        select(Message)
        .where(Message.service_id == service_id)
        .where(Message.sender_id != UUID(current_user["id"]))
        .where(Message.is_read == False)  # noqa: E712
    )
    unread = session.exec(stmt).all()
    return UnreadCountResponse(unread_count=len(unread))
