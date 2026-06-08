"""
WebSocket Endpoints para tracking en tiempo real
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.core.websocket_manager import ws_manager
from app.core.security import decode_token
import json

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/service/{service_id}")
async def websocket_service_room(
    websocket: WebSocket,
    service_id: str,
    token: str = Query(...)
):
    """
    WebSocket endpoint para sala de servicio.
    Tanto cliente como técnico se conectan aquí para recibir:
    - Actualizaciones de estado del servicio
    - Ubicación del técnico en tiempo real
    """
    # Validar token
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Token inválido")
            return
    except Exception:
        await websocket.close(code=4001, reason="Token inválido")
        return
    
    # Conectar
    await ws_manager.connect(websocket, user_id, service_id)
    
    try:
        # Enviar confirmación de conexión
        await websocket.send_json({
            "type": "connected",
            "data": {
                "service_id": service_id,
                "user_id": user_id
            }
        })
        
        # Mantener conexión abierta y procesar mensajes entrantes
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Procesar mensajes del técnico (ubicación)
            if message.get("type") == "location_update":
                location = message.get("data", {})
                lat = location.get("lat", 0)
                lng = location.get("lng", 0)
                
                # Import to update the in-memory cache directly
                from app.api.location import _location_cache
                import datetime
                
                _location_cache[service_id] = {
                    "technician_id": user_id,
                    "lat": lat,
                    "lng": lng,
                    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                }

                await ws_manager.broadcast_location_update(
                    service_id=service_id,
                    lat=lat,
                    lng=lng,
                    technician_id=user_id
                )
            
            # Chat messages — persist to DB and broadcast to room
            elif message.get("type") == "chat_message":
                chat_data = message.get("data", {})
                text = chat_data.get("text", "").strip()
                if text:
                    from sqlmodel import Session as DbSession
                    from app.core.database import engine
                    from app.models.message import Message as ChatMessage
                    from uuid import UUID as PyUUID, uuid4
                    import datetime as dt

                    msg_id = uuid4()
                    now = dt.datetime.now(dt.timezone.utc)
                    
                    # Persist to database
                    try:
                        with DbSession(engine) as db:
                            new_msg = ChatMessage(
                                id=msg_id,
                                service_id=PyUUID(service_id),
                                sender_id=PyUUID(user_id),
                                text=text[:2000],
                                created_at=now,
                                is_read=False,
                            )
                            db.add(new_msg)
                            db.commit()
                    except Exception as e:
                        import logging
                        logging.getLogger(__name__).error(f"Failed to persist chat message: {e}")

                    # Broadcast to all connected clients in this service room
                    await ws_manager.broadcast_to_service(
                        service_id=service_id,
                        message={
                            "type": "chat_message",
                            "data": {
                                "id": str(msg_id),
                                "service_id": service_id,
                                "sender_id": user_id,
                                "text": text[:2000],
                                "created_at": now.isoformat(),
                                "is_read": False,
                            }
                        }
                    )

            # Ping/Pong para mantener conexión
            elif message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


@router.websocket("/ws/user")
async def websocket_user_channel(
    websocket: WebSocket,
    token: str = Query(...)
):
    """
    WebSocket endpoint para canal de usuario.
    Recibe notificaciones personales como:
    - Servicio aceptado
    - Técnico en camino
    - Servicio completado
    """
    # Validar token
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Token inválido")
            return
    except Exception:
        await websocket.close(code=4001, reason="Token inválido")
        return
    
    # Conectar
    await ws_manager.connect(websocket, user_id)
    
    try:
        await websocket.send_json({
            "type": "connected",
            "data": {"user_id": user_id}
        })
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)
