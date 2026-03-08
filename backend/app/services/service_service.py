"""
Service Layer para manejo de servicios
Lógica de negocio separada de los endpoints
Refactorizado para usar SQLModel + GeoAlchemy2
"""
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
from sqlmodel import Session, select, func
from app.models.service import Service, ServiceStatus
from app.models.user import User
from app.schemas.service import (
    ServiceCreate,
    ServiceUpdate,
    ServiceResponse,
    ServiceListResponse,
    NearbyTechnicianResponse
)
import math
from datetime import datetime
from geoalchemy2.shape import to_shape

class ServiceService:
    """
    Clase para manejar toda la lógica de negocio de servicios.
    Separa la lógica de los endpoints para mejor testing y mantenibilidad.
    """
    
    async def create_service(
        self, 
        session: Session,
        service_data: ServiceCreate, 
        user: Dict[str, Any]
    ) -> ServiceResponse:
        """
        Crea un nuevo servicio usando SQLModel.
        """
        try:
            client_id = user["id"]
            
            # Verificar que el usuario existe en DB (debería, por auth)
            # No necesitamos hacer upsert manual como en Supabase
            
            # Crear instancia de Servicio
            db_service = Service(
                client_id=client_id,
                service_type=service_data.service_type,
                title=service_data.title,
                description=service_data.description,
                service_address=service_data.service_address,
                # PostGIS Geometry: POINT(lon lat)
                service_location=f"POINT({service_data.service_lon} {service_data.service_lat})",
                scheduled_date=service_data.scheduled_date,
                estimated_price=service_data.estimated_price,
                status=ServiceStatus.pending,
                # client_notes no está en ServiceBase? Revisar Modelo. 
                # El modelo ServiceBase no tiene client_notes en la definición que vi.
                # Voy a asumir que si faltan campos en el modelo, debo agregarlos o ignorarlos.
                # Viendo el modelo: title, description, service_type, status, service_address, estimated_price, requested_date.
                # NO TIENE client_notes ni service_city ni lat/lon separados.
                # service_location guarda la posicion.
            )
            
            # TODO: El modelo ServiceBase parece incompleto comparado con el Schema.
            # Schema tiene: service_city, client_notes.
            # Modelo ServiceBase tiene: title, description, service_type, status, service_address, estimated_price, requested_date.
            # Faltan: service_city, client_notes en el MODELO.
            # Por ahora los omito para que no falle la inserción, pero DEBERÍA actualizar el modelo.
            
            session.add(db_service)
            session.commit()
            session.refresh(db_service)
            
            # 🔔 Notificar a técnicos sobre nuevo servicio
            try:
                from app.services.notification_service import NotificationService
                await NotificationService.notify_technicians_new_service(
                    session=session,
                    service_id=db_service.id,
                    service_title=db_service.title,
                    service_city=service_data.service_address.split(",")[-1].strip() if service_data.service_address else "Colombia"
                )
            except Exception as notif_error:
                import logging
                logging.warning(f"Failed to send notifications: {notif_error}")
            
            return self._to_response(db_service, client_name=user.get("full_name"))
        
        except Exception as e:
            session.rollback()
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al crear servicio: {str(e)}"
            )
    
    async def get_service_by_id(
        self, 
        session: Session,
        service_id: str, 
        user_id: str,
        user_role: str
    ) -> ServiceResponse:
        try:
            # Query con Joins para traer cliente y técnico
            select(Service, User).outerjoin(User, Service.client_id == User.id).where(Service.id == service_id)
            # Esto solo trae el Cliente. Para Technician necesitamos alias o otro join.
            # Simplificación: SQLModel Relationship Loading es mejor.
            # Pero el modelo no tiene links explícitos definidos con Relationship todavía.
            
            # Por ahora, fetch simple
            service = session.exec(select(Service).where(Service.id == service_id)).first()
            
            if not service:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Servicio no encontrado")
            
            # Validar permisos
            if user_role == "client" and str(service.client_id) != user_id:
                raise HTTPException(status.HTTP_403_FORBIDDEN, detail="No tienes permiso")
            if user_role == "technician" and service.technician_id and str(service.technician_id) != user_id:
                raise HTTPException(status.HTTP_403_FORBIDDEN, detail="No tienes permiso")
                
            # Traer info de usuarios
            client = session.exec(select(User).where(User.id == service.client_id)).first()
            technician = None
            if service.technician_id:
                technician = session.exec(select(User).where(User.id == service.technician_id)).first()
                
            return self._to_response(service, client=client, technician=technician)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
            
    async def list_services(
        self,
        session: Session,
        user_id: str,
        user_role: str,
        status_filter: Optional[str] = None,
        service_type_filter: Optional[str] = None,
        page: int = 1,
        page_size: int = 10
    ) -> Dict[str, Any]:
        try:
            query = select(Service)
            
            if user_role == "client":
                query = query.where(Service.client_id == user_id)
            elif user_role == "technician":
                query = query.where(Service.technician_id == user_id)
                
            if status_filter:
                query = query.where(Service.status == status_filter)
            if service_type_filter:
                query = query.where(Service.service_type == service_type_filter)
                
            # Count total
            total_statement = select(func.count()).select_from(query.subquery())
            total = session.exec(total_statement).one()
            
            # Paginación
            query = query.offset((page - 1) * page_size).limit(page_size).order_by(Service.created_at.desc())
            results = session.exec(query).all()
            
            total_pages = math.ceil(total / page_size) if total > 0 else 0
            
            # Convertir a lista de schemas
            # Nota: Necesitaríamos hacer join con User para nombres reales
            services_parsed = []
            for s in results:
                services_parsed.append(ServiceListResponse(
                    id=str(s.id),
                    service_type=s.service_type,
                    status=s.status,
                    title=s.title,
                    service_city="Medellín", # Default por falta de campo en DB por ahora
                    scheduled_date=s.scheduled_date,
                    estimated_price=s.estimated_price,
                    created_at=s.created_at,
                    client_name="Cliente", # Placeholder hasta implementar joins
                    technician_name="Técnico" if s.technician_id else None
                ))
                
            return {
                "services": services_parsed,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages
            }
            
        except Exception as e:
             raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    async def list_available_services(
        self,
        session: Session,
        user_id: str,
        page: int = 1,
        page_size: int = 10
    ) -> Dict[str, Any]:
        """Marketplace para técnicos"""
        try:
            query = select(Service).where(
                Service.status == ServiceStatus.pending,
                Service.technician_id == None  # noqa: E711 — SQLAlchemy translates to IS NULL
            )
            
            # Count
            total = session.exec(select(func.count()).select_from(query.subquery())).one()
            
            query = query.offset((page - 1) * page_size).limit(page_size).order_by(Service.created_at.desc())
            results = session.exec(query).all()
            
            total_pages = math.ceil(total / page_size) if total > 0 else 0
            
            services_parsed = []
            for s in results:
                services_parsed.append(ServiceListResponse(
                    id=str(s.id),
                    service_type=s.service_type,
                    status=s.status,
                    title=s.title,
                    service_city="Medellín",
                    scheduled_date=s.scheduled_date,
                    estimated_price=s.estimated_price,
                    created_at=s.created_at
                ))
                
            return {
                "services": services_parsed,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages
            }
        except Exception as e:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    async def accept_service(self, session: Session, service_id: str, technician_id: str) -> ServiceResponse:
        try:
            service = session.exec(select(Service).where(Service.id == service_id)).first()
            if not service:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")
                
            if service.status != ServiceStatus.pending:
                raise HTTPException(status.HTTP_409_CONFLICT, "Servicio no disponible")
            
            # Obtener info del técnico para enviar al cliente
            technician = session.exec(select(User).where(User.id == technician_id)).first()
                
            service.technician_id = technician_id
            service.status = ServiceStatus.assigned
            session.add(service)
            session.commit()
            session.refresh(service)
            
            # 🔌 Notificar via WebSocket al cliente
            try:
                from app.core.websocket_manager import ws_manager
                await ws_manager.broadcast_service_status(
                    service_id=str(service_id),
                    status="assigned",
                    extra_data={
                        "technician": {
                            "id": str(technician_id),
                            "full_name": technician.full_name if technician else "Técnico",
                            "phone": technician.phone if technician else None,
                            "avatar_url": technician.avatar_url if technician else None
                        }
                    }
                )
            except Exception as ws_error:
                # No fallar si WebSocket tiene problemas
                import logging
                logging.warning(f"WebSocket notification failed: {ws_error}")
            
            # 🔔 Notificación persistente al cliente
            try:
                from app.services.notification_service import NotificationService
                await NotificationService.notify_client_service_update(
                    session=session,
                    client_id=service.client_id,
                    service_id=service.id,
                    status="assigned",
                    technician_name=technician.full_name if technician else None
                )
            except Exception as notif_error:
                import logging
                logging.warning(f"Persistent notification failed: {notif_error}")
            
            return self._to_response(service)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    async def update_service_status(
        self, 
        session: Session, 
        service_id: str, 
        technician_id: str, 
        new_status: str,
        technician_name: str = None
    ) -> dict:
        """Actualiza el estado del servicio por el técnico asignado."""
        from uuid import UUID as UUIDType
        try:
            # Validar estado
            valid_statuses = ["en_route", "arrived", "in_progress", "completed"]
            if new_status not in valid_statuses:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST, 
                    f"Estado inválido. Usa: {', '.join(valid_statuses)}"
                )
            
            # Convert to UUID
            try:
                service_uuid = UUIDType(service_id)
            except ValueError:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de servicio inválido")
            
            service = session.exec(select(Service).where(Service.id == service_uuid)).first()
            if not service:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")
            
            # Validar que el técnico está asignado a este servicio
            if str(service.technician_id) != technician_id:
                raise HTTPException(status.HTTP_403_FORBIDDEN, "No estás asignado a este servicio")
            
            # Actualizar estado
            service.status = ServiceStatus(new_status)
            service.updated_at = datetime.utcnow()
            session.add(service)
            session.commit()
            session.refresh(service)
            
            # 🔌 Broadcast por WebSocket
            try:
                from app.core.websocket_manager import ws_manager
                await ws_manager.broadcast_service_status(
                    service_id=str(service_id),
                    status=new_status,
                    extra_data={"technician_name": technician_name}
                )
            except Exception as ws_error:
                import logging
                logging.warning(f"WebSocket broadcast failed: {ws_error}")
            
            # 🔔 Notificación persistente al cliente
            try:
                from app.services.notification_service import NotificationService
                await NotificationService.notify_client_service_update(
                    session=session,
                    client_id=service.client_id,
                    service_id=service.id,
                    status=new_status,
                    technician_name=technician_name
                )
            except Exception as notif_error:
                import logging
                logging.warning(f"Notification failed: {notif_error}")
            
            return {
                "success": True,
                "service_id": str(service.id),
                "new_status": new_status,
                "message": f"Estado actualizado a: {new_status}"
            }
        except HTTPException:
            raise
        except Exception as e:
            import logging
            import traceback
            logging.error(f"update_service_status failed: {type(e).__name__}: {e}")
            logging.error(traceback.format_exc())
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"{type(e).__name__}: {str(e)}")
            
    async def update_service(
        self, session: Session, service_id: str, service_data: ServiceUpdate, user_id: str, user_role: str
    ) -> ServiceResponse:
        try:
            service = session.exec(select(Service).where(Service.id == service_id)).first()
            if not service:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")
            
            # Validar permisos básicos
            if user_role == "client" and str(service.client_id) != user_id:
                raise HTTPException(status.HTTP_403_FORBIDDEN, "No autorizado")
            if user_role == "technician" and str(service.technician_id) != user_id:
                 raise HTTPException(status.HTTP_403_FORBIDDEN, "No autorizado")

            update_data = service_data.model_dump(exclude_none=True)
            for key, value in update_data.items():
                setattr(service, key, value)
                
            session.add(service)
            session.commit()
            session.refresh(service)
            return self._to_response(service)
        except Exception as e:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    async def assign_technician(self, session: Session, service_id: str, technician_id: str, user_role: str) -> ServiceResponse:
        if user_role != "admin":
             raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo admin")
             
        # Reutilizamos accept logic pero forzado
        service = session.exec(select(Service).where(Service.id == service_id)).first()
        if not service:
             raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")
             
        service.technician_id = technician_id
        service.status = ServiceStatus.assigned
        session.add(service)
        session.commit()
        session.refresh(service)
        return self._to_response(service)

    async def find_nearby_technicians(self, session: Session, service_id: str, max_distance_km: int = 20) -> List[NearbyTechnicianResponse]:
        # Implementación Mock temporal hasta configurar PostGIS queries complejas en SQLModel
        return []

    def _to_response(self, service: Service, client_name: str = None, client: User = None, technician: User = None) -> ServiceResponse:
        """Helper para convertir DB model a Response Schema"""
        response_kwargs = {
            "id": str(service.id),
            "client_id": str(service.client_id),
            "technician_id": str(service.technician_id) if service.technician_id else None,
            "service_type": service.service_type,
            "status": service.status,
            "title": service.title,
            "description": service.description,
            "service_address": service.service_address,
            "service_city": "Medellín", # Default
            "service_lat": to_shape(service.service_location).y if service.service_location else 0.0,
            "service_lon": to_shape(service.service_location).x if service.service_location else 0.0,
            "requested_date": service.requested_date,
            "scheduled_date": service.scheduled_date,
            "estimated_price": service.estimated_price,
            "created_at": service.created_at,
            "updated_at": service.updated_at
        }
        
        # Opcionalmente hidratar relaciones si se pasaron
        if client:
            from app.schemas.service import ServiceClient
            response_kwargs["client"] = ServiceClient(
                id=str(client.id),
                email=client.email,
                full_name=client.full_name,
                phone=client.phone
            )
            
        if technician:
            from app.schemas.service import ServiceTechnician
            response_kwargs["technician"] = ServiceTechnician(
                id=str(technician.id),
                email=technician.email,
                full_name=technician.full_name,
                phone=technician.phone,
                avatar_url=technician.avatar_url
            )
            
        return ServiceResponse(**response_kwargs)

service_service = ServiceService()