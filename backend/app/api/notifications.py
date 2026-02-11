"""
Notifications API - Endpoints para el sistema de notificaciones
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.notification import Notification, NotificationRead
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=List[NotificationRead])
async def get_notifications(
    limit: int = 20,
    unread_only: bool = False,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get notifications for the current user"""
    notifications = NotificationService.get_user_notifications(
        session=session,
        user_id=UUID(current_user["id"]),
        limit=limit,
        unread_only=unread_only
    )
    return notifications


@router.get("/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get count of unread notifications"""
    count = NotificationService.get_unread_count(
        session=session,
        user_id=UUID(current_user["id"])
    )
    return {"unread_count": count}


@router.patch("/{notification_id}/read")
async def mark_as_read(
    notification_id: UUID,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Mark a notification as read"""
    success = NotificationService.mark_as_read(
        session=session,
        notification_id=notification_id,
        user_id=UUID(current_user["id"])
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    return {"success": True}


@router.patch("/read-all")
async def mark_all_as_read(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Mark all notifications as read"""
    count = NotificationService.mark_all_as_read(
        session=session,
        user_id=UUID(current_user["id"])
    )
    return {"success": True, "marked_count": count}
