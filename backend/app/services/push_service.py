import logging
import httpx
import asyncio
import json
from typing import List
from sqlmodel import Session, select
from app.core.database import engine
from app.models.push_token import PushToken
from app.core.config import settings

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
                select(PushToken).where(PushToken.user_id == user_uuid).where(PushToken.is_active)
            ).all()
            return tokens

    @staticmethod
    def deactivate_token(token_id: any):
        """Desactiva un token en la base de datos de forma síncrona"""
        try:
            with Session(engine) as session:
                invalid_token = session.get(PushToken, token_id)
                if invalid_token:
                    invalid_token.is_active = False
                    session.add(invalid_token)
                    session.commit()
                    logger.info(f"[PushService] Token {token_id} desactivado automáticamente")
        except Exception as e:
            logger.error(f"[PushService] Error desactivando token {token_id}: {e}")

    async def _send_single_push(self, push_token: PushToken, title: str, body: str, data: dict):
        """Maneja el envío individual a un dispositivo específico"""
        if push_token.platform == "expo":
            try:
                expo_payload = {
                    "to": push_token.token,
                    "title": title,
                    "body": body,
                    "data": data or {},
                    "sound": "default",
                    "channelId": "services"
                }
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://exp.host/--/api/v2/push/send",
                        json=expo_payload,
                        timeout=10.0
                    )
                
                if response.status_code == 200:
                    res_json = response.json()
                    # Expo puede devolver 'data' como una lista de tickets
                    data_out = res_json.get("data", [])
                    status_data = data_out[0] if isinstance(data_out, list) and len(data_out) > 0 else data_out
                    
                    if isinstance(status_data, dict) and status_data.get("status") == "error":
                        error_code = status_data.get("details", {}).get("error")
                        if error_code in ["DeviceNotRegistered", "InvalidTicket", "InvalidCredentials"]:
                            logger.warning(f"[PushService] Expo token inválido ({error_code}), desactivando...")
                            self.deactivate_token(push_token.id)
                        return False
                    return True
                else:
                    logger.warning(f"[PushService] Fallo Expo API ({response.status_code}): {response.text}")
                    return False
            except Exception as e:
                logger.error(f"[PushService] Error en Expo push: {e}")
                return False
                
        elif push_token.platform in ["web_push", "pwa_ios", "pwa_android"]:
            try:
                from pywebpush import webpush
                
                sub_info = json.loads(push_token.token)
                payload = json.dumps({
                    "title": title,
                    "message": body,
                    **(data if data else {})
                })
                
                # webpush es síncrono y bloqueante, lo ejecutamos en un thread
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None,
                    lambda: webpush(
                        subscription_info=sub_info,
                        data=payload,
                        vapid_private_key=settings.VAPID_PRIVATE_KEY,
                        vapid_claims={"sub": settings.VAPID_SUBJECT}
                    )
                )
                return True
            except Exception as e:
                err_str = str(e)
                logger.error(f"[PushService] Web push error para {push_token.id}: {err_str}")
                if "410 Gone" in err_str or "404 Not Found" in err_str:
                    self.deactivate_token(push_token.id)
                return False
        
        return False

    @staticmethod
    async def send_push_notification(user_id: str, title: str, body: str, data: dict = None):
        """
        Envía una notificación push a todos los tokens activos del usuario en paralelo.
        """
        service = PushNotificationService()
        tokens = service.get_user_tokens(user_id)
        
        if not tokens:
            return False
            
        # Crear tareas para envío en paralelo
        tasks = [service._send_single_push(token, title, body, data) for token in tokens]
        results = await asyncio.gather(*tasks)
        
        success_count = sum(1 for r in results if r)
        if success_count > 0:
            logger.info(f"[PushService] Notificación enviada a {success_count}/{len(tokens)} dispositivos del usuario {user_id}")
            
        return success_count > 0

push_service = PushNotificationService()
