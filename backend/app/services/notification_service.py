"""
Notification Service - Lógica de negocio para notificaciones
"""
from typing import List
from uuid import UUID
from sqlmodel import Session, select, desc
from app.models.notification import Notification, NotificationCreate


class NotificationService:
    """Service for notification operations"""
    
    @staticmethod
    async def create_notification(
        session: Session,
        data: NotificationCreate
    ) -> Notification:
        """Create a new notification and optionally broadcast via WebSocket"""
        notification = Notification(
            user_id=data.user_id,
            title=data.title,
            message=data.message,
            notification_type=data.notification_type,
            service_id=data.service_id
        )
        session.add(notification)
        session.commit()
        session.refresh(notification)
        
        # Broadcast via WebSocket
        try:
            from app.core.websocket_manager import ws_manager
            await ws_manager.send_to_user(
                user_id=str(data.user_id),
                message={
                    "type": "notification",
                    "data": {
                        "id": str(notification.id),
                        "title": notification.title,
                        "message": notification.message,
                        "notification_type": notification.notification_type,
                        "service_id": str(notification.service_id) if notification.service_id else None,
                        "created_at": notification.created_at.isoformat()
                    }
                }
            )
        except Exception as e:
            # Don't fail if WebSocket fails
            import logging
            logging.warning(f"WebSocket notification failed: {e}")
            
        # Trigger external Push Notification (Expo/WebPush)
        try:
            from app.services.push_service import push_service
            await push_service.send_push_notification(
                user_id=str(data.user_id),
                title=data.title,
                body=data.message,
                data={
                    "notification_type": data.notification_type,
                    "service_id": str(data.service_id) if data.service_id else None
                }
            )
        except Exception as e:
            import logging
            logging.warning(f"Push notification dispatch failed: {e}")
        
        return notification
    
    @staticmethod
    def get_user_notifications(
        session: Session,
        user_id: UUID,
        limit: int = 20,
        unread_only: bool = False
    ) -> List[Notification]:
        """Get notifications for a user"""
        query = select(Notification).where(Notification.user_id == user_id)
        
        if unread_only:
            query = query.where(not Notification.is_read)
        
        query = query.order_by(desc(Notification.created_at)).limit(limit)
        return session.exec(query).all()
    
    @staticmethod
    def get_unread_count(session: Session, user_id: UUID) -> int:
        """Get count of unread notifications"""
        query = select(Notification).where(
            Notification.user_id == user_id,
            not Notification.is_read
        )
        return len(session.exec(query).all())
    
    @staticmethod
    def mark_as_read(session: Session, notification_id: UUID, user_id: UUID) -> bool:
        """Mark a notification as read"""
        notification = session.get(Notification, notification_id)
        if notification and notification.user_id == user_id:
            notification.is_read = True
            session.add(notification)
            session.commit()
            return True
        return False
    
    @staticmethod
    def mark_all_as_read(session: Session, user_id: UUID) -> int:
        """Mark all notifications as read for a user"""
        query = select(Notification).where(
            Notification.user_id == user_id,
            not Notification.is_read
        )
        notifications = session.exec(query).all()
        count = 0
        for notification in notifications:
            notification.is_read = True
            session.add(notification)
            count += 1
        session.commit()
        return count
    
    @staticmethod
    async def notify_technicians_new_service(
        session: Session,
        service_id: UUID,
        service_title: str,
        service_city: str
    ):
        """Notify all active technicians about a new service"""
        from app.models.user import User
        
        # Get all technicians
        query = select(User).where(
            User.role == "technician",
            User.is_active
        )
        technicians = session.exec(query).all()
        
        for tech in technicians:
            await NotificationService.create_notification(
                session=session,
                data=NotificationCreate(
                    user_id=tech.id,
                    title="🔔 Nuevo servicio disponible",
                    message=f"{service_title} en {service_city}",
                    notification_type="service",
                    service_id=service_id
                )
            )
    
    @staticmethod
    async def notify_client_service_update(
        session: Session,
        client_id: UUID,
        service_id: UUID,
        status: str,
        technician_name: str = None
    ):
        """Notify client about service status update"""
        status_messages = {
            "assigned": f"🎉 ¡{technician_name or 'Un técnico'} aceptó tu servicio!",
            "en_route": f"🚗 {technician_name or 'El técnico'} está en camino",
            "arrived": f"📍 {technician_name or 'El técnico'} ha llegado al lugar",
            "in_progress": "🔧 El servicio está en progreso",
            "completed": "✅ ¡Servicio completado! Por favor califica al técnico",
            "cancelled": "❌ El servicio ha sido cancelado"
        }
        
        message = status_messages.get(status, f"Estado actualizado: {status}")
        
        await NotificationService.create_notification(
            session=session,
            data=NotificationCreate(
                user_id=client_id,
                title="Actualización de servicio",
                message=message,
                notification_type="status",
                service_id=service_id
            )
        )


# Singleton instance for easy import
notification_service = NotificationService()
