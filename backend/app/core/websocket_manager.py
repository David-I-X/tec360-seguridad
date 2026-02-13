"""
WebSocket Connection Manager
Gestiona conexiones WebSocket para comunicación en tiempo real
"""
from typing import Dict, Set
from fastapi import WebSocket
import asyncio
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Gestor de conexiones WebSocket para el sistema de tracking en tiempo real.
    
    Mantiene:
    - Conexiones por usuario (para notificaciones personales)
    - Conexiones por servicio (para salas de servicio cliente-técnico)
    """
    
    def __init__(self):
        # user_id -> Set[WebSocket]
        self.user_connections: Dict[str, Set[WebSocket]] = {}
        # service_id -> Set[WebSocket]
        self.service_rooms: Dict[str, Set[WebSocket]] = {}
        # websocket -> user_id (para limpieza)
        self.websocket_to_user: Dict[WebSocket, str] = {}
        # websocket -> service_id
        self.websocket_to_service: Dict[WebSocket, str] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str, service_id: str = None):
        """Acepta una nueva conexión WebSocket"""
        await websocket.accept()
        
        # Registrar en conexiones de usuario
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(websocket)
        self.websocket_to_user[websocket] = user_id
        
        # Registrar en sala de servicio si se especifica
        if service_id:
            if service_id not in self.service_rooms:
                self.service_rooms[service_id] = set()
            self.service_rooms[service_id].add(websocket)
            self.websocket_to_service[websocket] = service_id
            room_size = len(self.service_rooms[service_id])
            logger.info(f"[WS] User {user_id[:8]}... joined room {service_id[:8]}... (room size: {room_size})")
        else:
            logger.info(f"[WS] User {user_id[:8]}... connected (no service room)")
    
    def disconnect(self, websocket: WebSocket):
        """Limpia una conexión cerrada"""
        user_id = self.websocket_to_user.get(websocket)
        service_id = self.websocket_to_service.get(websocket)
        
        # Remover de conexiones de usuario
        if user_id and user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        
        # Remover de sala de servicio
        if service_id and service_id in self.service_rooms:
            self.service_rooms[service_id].discard(websocket)
            room_size = len(self.service_rooms[service_id])
            if not self.service_rooms[service_id]:
                del self.service_rooms[service_id]
                logger.info(f"[WS] Room {service_id[:8]}... closed (empty)")
            else:
                logger.info(f"[WS] User {(user_id or '?')[:8]}... left room {service_id[:8]}... (room size: {room_size})")
        
        # Limpiar mapeos
        self.websocket_to_user.pop(websocket, None)
        self.websocket_to_service.pop(websocket, None)
    
    async def send_to_user(self, user_id: str, message: dict):
        """Envía mensaje a todas las conexiones de un usuario"""
        connections = self.user_connections.get(user_id, set())
        disconnected = []
        
        for websocket in connections:
            try:
                await websocket.send_json(message)
            except Exception:
                disconnected.append(websocket)
        
        # Limpiar conexiones muertas
        for ws in disconnected:
            self.disconnect(ws)
    
    async def broadcast_to_service(self, service_id: str, message: dict):
        """Envía mensaje a todos los conectados a una sala de servicio"""
        connections = self.service_rooms.get(service_id, set())
        
        if not connections:
            logger.warning(f"[WS] broadcast_to_service: no connections in room {service_id[:8]}...")
            return
        
        disconnected = []
        sent_count = 0
        
        for websocket in connections:
            try:
                await websocket.send_json(message)
                sent_count += 1
            except Exception:
                disconnected.append(websocket)
        
        msg_type = message.get("type", "unknown")
        logger.debug(f"[WS] Broadcast '{msg_type}' to room {service_id[:8]}... → {sent_count} recipients")
        
        # Limpiar conexiones muertas
        for ws in disconnected:
            self.disconnect(ws)
    
    async def broadcast_location_update(self, service_id: str, lat: float, lng: float, technician_id: str):
        """Broadcast de actualización de ubicación del técnico"""
        await self.broadcast_to_service(service_id, {
            "type": "location_update",
            "data": {
                "technician_id": technician_id,
                "lat": lat,
                "lng": lng,
                "timestamp": asyncio.get_event_loop().time()
            }
        })
    
    async def broadcast_service_status(self, service_id: str, status: str, extra_data: dict = None):
        """Broadcast de cambio de estado del servicio"""
        message = {
            "type": "status_update",
            "data": {
                "service_id": service_id,
                "status": status,
                **(extra_data or {})
            }
        }
        await self.broadcast_to_service(service_id, message)


# Instancia global del manager
ws_manager = ConnectionManager()
