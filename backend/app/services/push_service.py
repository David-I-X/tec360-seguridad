import logging
import httpx
from typing import List
from sqlmodel import Session, select
from app.core.database import engine
from app.models.push_token import PushToken

logger = logging.getLogger(__name__)

class PushNotificationService:
    """
    Servicio de notificaciones Push unificado.
    Maneja el envío a través de Expo (App Nativa) y Web Push (PWA/Web).
    """
    
    @staticmethod
    def get_user_tokens(user_id: str) -> List[PushToken]:
        import uuid
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            return []
            
        with Session(engine) as session:
            tokens = session.exec(
                select(PushToken).where(PushToken.user_id == user_uuid).where(PushToken.is_active == True)
            ).all()
            return tokens
            
    @staticmethod
    async def send_push_notification(user_id: str, title: str, body: str, data: dict = None):
        """
        Envía una notificación push a todos los tokens activos del usuario.
        """
        tokens = PushNotificationService.get_user_tokens(user_id)
        if not tokens:
            logger.info(f"[PushService] No active tokens for user {user_id}")
            return False
            
        success_count = 0
        for push_token in tokens:
            if push_token.platform == "expo":
                # Implement Expo Push API
                try:
                    expo_payload = {
                        "to": push_token.token,
                        "title": title,
                        "body": body,
                        "data": data or {},
                        "sound": "default",
                        "channelId": "services"  # Coincide con lo configurado en Android
                    }
                    async with httpx.AsyncClient() as client:
                        response = await client.post(
                            "https://exp.host/--/api/v2/push/send",
                            json=expo_payload
                        )
                    if response.status_code == 200:
                        success_count += 1
                        logger.info(f"[PushService] Sent Expo push to {push_token.token}")
                    else:
                        logger.warning(f"[PushService] Failed Expo push: {response.text}")
                except Exception as e:
                    logger.error(f"[PushService] Expo push error: {e}")
                    
            elif push_token.platform in ["web_push", "pwa_ios", "pwa_android"]:
                # Implement pywebpush logic
                try:
                    import json
                    from pywebpush import webpush, WebPushException
                    from app.core.config import settings
                    
                    sub_info = json.loads(push_token.token)
                    payload = json.dumps({
                        "title": title,
                        "message": body,
                        **(data if data else {})
                    })
                    
                    webpush(
                        subscription_info=sub_info,
                        data=payload,
                        vapid_private_key=settings.VAPID_PRIVATE_KEY,
                        vapid_claims={"sub": settings.VAPID_SUBJECT}
                    )
                    logger.info(f"[PushService] Sent Web Push to {push_token.id}")
                    success_count += 1
                except Exception as e:
                    logger.error(f"[PushService] Web push error: {e}")
                    # Desactivar el token si expiró o es inválido
                    if "410 Gone" in str(e) or "404 Not Found" in str(e):
                        with Session(engine) as session:
                            invalid_token = session.get(PushToken, push_token.id)
                            if invalid_token:
                                invalid_token.is_active = False
                                session.add(invalid_token)
                                session.commit()
                
        return success_count > 0

push_service = PushNotificationService()
