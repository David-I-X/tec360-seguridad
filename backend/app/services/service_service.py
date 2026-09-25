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
from app.models.technician import Technician
from app.models.payment import Payment
from app.schemas.service import (
    ServiceCreate,
    ServiceUpdate,
    ServiceResponse,
    ServiceListResponse,
    NearbyTechnicianResponse,
    VehicleInspectionSubmit,
    ServiceConfirmRequest,
    ServiceClient,
    ServiceTechnician
)
import math
from datetime import datetime, timedelta
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
                service_metadata=service_data.service_metadata,
                vehicle_type=service_data.vehicle_type,
                vehicle_model=service_data.vehicle_model,
                vehicle_plate=service_data.vehicle_plate,
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
                    service_type=str(db_service.service_type.value) if db_service.service_type else "",
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
            if user_role in ("technician", "reaction_team") and service.technician_id and str(service.technician_id) != user_id:
                raise HTTPException(status.HTTP_403_FORBIDDEN, detail="No tienes permiso")
                
            # Traer info de usuarios
            client = session.exec(select(User).where(User.id == service.client_id)).first()
            technician = None
            if service.technician_id:
                technician = session.exec(select(User).where(User.id == service.technician_id)).first()
                if technician:
                    tech_model = session.exec(select(Technician).where(Technician.user_id == technician.id)).first()
                    if tech_model and tech_model.average_rating is not None:
                        setattr(technician, "average_rating", float(tech_model.average_rating))

            # Traer info del pago más reciente (con datos DIAN)
            payment = session.exec(
                select(Payment).where(Payment.service_id == service.id).order_by(Payment.created_at.desc())
            ).first()

            if payment and payment.technician_id and not payment.tech_pdf_url and payment.invoice_number:
                from app.services.payment_service import payment_service
                payment = await payment_service.ensure_tech_commission_invoice(session, payment)

            return self._to_response(service, client=client, technician=technician, payment=payment)
            
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
            elif user_role in ("technician", "reaction_team"):
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
            
            services_parsed = [self._to_list_item(session, s) for s in results]
                
            return {
                "services": services_parsed,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages
            }
            
        except Exception as e:
             raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    def _to_list_item(self, session: Session, s: Service) -> ServiceListResponse:
        """Helper para convertir DB Service a ServiceListResponse completo con mapa y relaciones"""
        client = session.get(User, s.client_id) if s.client_id else None
        technician = session.get(User, s.technician_id) if s.technician_id else None

        lat = None
        lon = None
        if s.service_location:
            try:
                pt = to_shape(s.service_location)
                lat = float(pt.y)
                lon = float(pt.x)
            except Exception:
                pass

        tech_schema = None
        if technician:
            tech_model = session.exec(select(Technician).where(Technician.user_id == technician.id)).first()
            avg_rating = float(tech_model.average_rating) if (tech_model and tech_model.average_rating is not None) else 0.0
            tech_schema = ServiceTechnician(
                id=str(technician.id),
                email=technician.email,
                full_name=technician.full_name,
                phone=technician.phone,
                avatar_url=technician.avatar_url,
                average_rating=avg_rating
            )

        client_schema = None
        if client:
            client_schema = ServiceClient(
                id=str(client.id),
                email=client.email,
                full_name=client.full_name,
                phone=client.phone,
                avatar_url=client.avatar_url
            )

        city = getattr(s, "service_city", None)
        if not city and s.service_address and "," in s.service_address:
            city = s.service_address.split(",")[-1].strip()
        if not city:
            city = "Medellín"

        payment = session.exec(
            select(Payment).where(Payment.service_id == s.id).order_by(Payment.created_at.desc())
        ).first()

        has_warranty, w_status, w_days, w_expires = self._compute_warranty(s)
        commission_amt = None
        if payment and payment.amount:
            commission_amt = round(payment.amount * 0.18, 2)
        elif getattr(s, "final_price", None) or s.estimated_price:
            commission_amt = round(float(getattr(s, "final_price", None) or s.estimated_price) * 0.18, 2)

        return ServiceListResponse(
            id=str(s.id),
            service_type=s.service_type,
            status=s.status,
            title=s.title,
            description=s.description,
            service_address=s.service_address,
            service_city=city,
            service_lat=lat,
            service_lon=lon,
            scheduled_date=s.scheduled_date,
            estimated_price=s.estimated_price,
            final_price=getattr(s, "final_price", None),
            vehicle_type=s.vehicle_type,
            vehicle_model=s.vehicle_model,
            vehicle_plate=s.vehicle_plate,
            vehicle_photo_url=s.vehicle_photo_url,
            service_metadata=s.service_metadata,
            payment_method=getattr(s, "payment_method", None),
            payment_status=getattr(s, "payment_status", "pending"),
            invoice_number=payment.invoice_number if payment else None,
            cufe=payment.cufe if payment else None,
            qr_url=payment.qr_url if payment else None,
            pdf_url=payment.pdf_url if payment else None,
            dian_status=payment.dian_status if payment else None,
            tech_invoice_number=payment.tech_invoice_number if payment else None,
            tech_cufe=payment.tech_cufe if payment else None,
            tech_qr_url=payment.tech_qr_url if payment else None,
            tech_pdf_url=payment.tech_pdf_url if payment else None,
            tech_dian_status=payment.tech_dian_status if payment else None,
            commission_amount=commission_amt,
            has_warranty=has_warranty,
            warranty_status=w_status,
            warranty_days_left=w_days,
            warranty_expires_at=w_expires,
            created_at=s.created_at,
            client_name=client.full_name if client else None,
            technician_name=technician.full_name if technician else None,
            client=client_schema,
            technician=tech_schema
        )

    @staticmethod
    def _compute_warranty(service: Service) -> tuple[bool, Optional[str], Optional[int], Optional[datetime]]:
        """Calcula el estado de garantía de 30 días para servicios completados o terminados/confirmados."""
        if service.status not in ["completed", "confirmed"]:
            return False, None, None, None

        base_date = service.updated_at or service.created_at
        expires_at = base_date + timedelta(days=30)
        now = datetime.utcnow()
        diff = (expires_at - now).total_seconds()
        days_left = max(0, int(diff // 86400))
        w_status = "active" if now <= expires_at else "expired"
        return True, w_status, days_left, expires_at

    async def list_available_services(
        self,
        session: Session,
        user_id: str,
        user_role: str = "technician",
        page: int = 1,
        page_size: int = 10
    ) -> Dict[str, Any]:
        """Marketplace para técnicos / equipo de reacción"""
        try:
            from app.models.service import ServiceType
            query = select(Service).where(
                Service.status == ServiceStatus.pending,
                Service.technician_id == None  # noqa: E711 — SQLAlchemy translates to IS NULL
            )
            
            # Role-based filtering
            if user_role == "reaction_team":
                query = query.where(Service.service_type == ServiceType.vehicle_recovery)
            elif user_role == "technician":
                query = query.where(Service.service_type != ServiceType.vehicle_recovery)
            # admin sees all
            
            # Count
            total = session.exec(select(func.count()).select_from(query.subquery())).one()
            
            query = query.offset((page - 1) * page_size).limit(page_size).order_by(Service.created_at.desc())
            results = session.exec(query).all()
            
            total_pages = math.ceil(total / page_size) if total > 0 else 0
            
            services_parsed = [self._to_list_item(session, s) for s in results]
                
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
                status_labels = {
                    ServiceStatus.assigned: "ya fue asignado a un técnico",
                    ServiceStatus.en_route: "ya está en camino",
                    ServiceStatus.arrived: "ya tiene un técnico en el sitio",
                    ServiceStatus.in_progress: "ya se encuentra en ejecución",
                    ServiceStatus.completed: "ya fue completado",
                    ServiceStatus.confirmed: "ya fue confirmado",
                    ServiceStatus.cancelled: "fue cancelado",
                }
                status_desc = status_labels.get(service.status, "ya no está disponible")
                raise HTTPException(status.HTTP_409_CONFLICT, f"Este servicio {status_desc}.")
            
            # Validar que el técnico no tenga conflicto de horario (bloque de 2 horas)
            self._check_technician_schedule_conflict(session, technician_id, service)
            
            # Check if technician is suspended
            from app.services.reputation_service import reputation_service
            from app.models.technician import Technician
            is_suspended = await reputation_service.is_suspended(session, technician_id)
            if is_suspended:
                tech = session.exec(select(Technician).where(Technician.user_id == technician_id)).first()
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Tu cuenta está suspendida hasta {tech.suspended_until.strftime('%d/%m/%Y %H:%M') if tech and tech.suspended_until else 'pronto'}. No puedes aceptar servicios durante la suspensión."
                )
            
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
            
            # Fetch client for full response
            client = session.exec(select(User).where(User.id == service.client_id)).first()
            
            return self._to_response(service, client=client, technician=technician)
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
            valid_statuses = ["en_route", "arrived", "in_progress", "paused", "completed"]
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

            # Validar inspección vehicular obligatoria para transición a in_progress (excepto vehicle_recovery)
            if new_status == "in_progress" and service.service_type != "vehicle_recovery":
                metadata = service.service_metadata or {}
                inspection = metadata.get("vehicle_inspection")
                if not inspection:
                    raise HTTPException(
                        status.HTTP_400_BAD_REQUEST,
                        "Debes completar el checklist de inspección vehicular antes de iniciar el trabajo."
                    )
                # Validar confirmación del cliente (o timeout de 15 min)
                client_confirmed = inspection.get("client_confirmed", False)
                if not client_confirmed:
                    inspected_at_str = inspection.get("inspected_at")
                    allow_timeout = False
                    if inspected_at_str:
                        try:
                            from datetime import timezone, timedelta
                            inspected_at = datetime.fromisoformat(inspected_at_str)
                            now = datetime.utcnow()
                            if inspected_at.tzinfo is not None:
                                now = datetime.now(timezone.utc)
                            if now - inspected_at >= timedelta(minutes=15):
                                allow_timeout = True
                        except Exception:
                            pass
                    if not allow_timeout:
                        raise HTTPException(
                            status.HTTP_400_BAD_REQUEST,
                            "Esperando que el cliente confirme la copia de la inspección de su vehículo. (Si el cliente no responde en 15 minutos, podrás iniciar automáticamente)."
                        )

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

    async def cancel_service(
        self, session: Session, service_id: str, user_id: str, user_role: str
    ) -> dict:
        """Lógica centralizada para cancelar un servicio y aplicar penalizaciones/reembolsos."""
        from uuid import UUID as UUIDType
        
        try:
            service = session.exec(select(Service).where(Service.id == UUIDType(service_id))).first()
            if not service:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")
            
            # Check if it's already cancelled or completed
            if service.status in ["cancelled", "completed", "confirmed"]:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, f"El servicio ya está {service.status}")
                
            # Validar permisos
            if user_role == "client" and str(service.client_id) != user_id:
                raise HTTPException(status.HTTP_403_FORBIDDEN, "No autorizado")
            if user_role == "technician" and str(service.technician_id) != user_id:
                 raise HTTPException(status.HTTP_403_FORBIDDEN, "No autorizado")
            
            prev_status = service.status
            service.status = ServiceStatus.cancelled
            service.updated_at = datetime.utcnow()
            session.add(service)
            
            penalty_applied = False
            refund_applied = False
            
            # Si el servicio ya tenía un técnico asignado
            if service.technician_id and prev_status in ["assigned", "en_route"]:
                if user_role == "technician":
                    # Penalización al técnico
                    try:
                        from app.services.reputation_service import reputation_service
                        penalty_result = await reputation_service.penalize_cancellation(session, str(service.technician_id))
                        penalty_applied = True
                        
                        # Notify technician about penalty
                        try:
                            from app.services.notification_service import NotificationService
                            penalty_msg = "Se te han descontado 15 puntos de reputación por cancelar un servicio asignado."
                            if penalty_result.get("suspended"):
                                penalty_msg += " Tu cuenta ha sido suspendida por 24 horas."
                            await NotificationService.create_notification(
                                session=session,
                                data={
                                    "user_id": str(service.technician_id),
                                    "title": "⚠️ Penalización por cancelación",
                                    "message": penalty_msg,
                                    "notification_type": "system_alert",
                                    "service_id": str(service.id)
                                }
                            )
                        except Exception as notif_err:
                            import logging
                            logging.warning(f"Failed to notify technician about penalty: {notif_err}")
                            
                    except Exception as e:
                        import logging
                        logging.warning(f"Failed to penalize technician: {e}")
                
                elif user_role == "client":
                    # Reembolso de créditos al técnico
                    try:
                        from app.services.credit_service import credit_service
                        await credit_service.refund_for_service(
                            session=session,
                            technician_id=str(service.technician_id),
                            service_id=str(service.id),
                            reason="Cliente canceló el servicio"
                        )
                        refund_applied = True
                        
                        # (Task 10 hook) Penalización al cliente (por hacer en Sprint 3)
                        # user = session.get(User, service.client_id)
                        # user.cancellation_count += 1
                        # if user.cancellation_count >= 3:
                        #     user.flagged_for_review = True
                        # session.add(user)
                    except Exception as e:
                        import logging
                        logging.warning(f"Failed to refund technician credits: {e}")
            
            session.commit()
            
            return {
                "success": True, 
                "service_id": str(service.id), 
                "penalty_applied": penalty_applied,
                "refund_applied": refund_applied
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    async def save_vehicle_inspection(
        self,
        session: Session,
        service_id: str,
        technician_id: str,
        inspection_data: VehicleInspectionSubmit
    ) -> dict:
        """Guarda la inspección vehicular realizada por el técnico y notifica al cliente."""
        from uuid import UUID as UUIDType
        try:
            try:
                service_uuid = UUIDType(service_id)
            except ValueError:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de servicio inválido")

            service = session.exec(select(Service).where(Service.id == service_uuid)).first()
            if not service:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")

            if str(service.technician_id) != technician_id:
                raise HTTPException(status.HTTP_403_FORBIDDEN, "No estás asignado a este servicio")

            if service.status not in (ServiceStatus.arrived, ServiceStatus.in_progress):
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    f"La inspección debe realizarse al llegar al servicio (estado actual: {service.status})"
                )

            current_metadata = dict(service.service_metadata or {})
            now_iso = datetime.utcnow().isoformat()

            inspection_dict = {
                "inspected_at": now_iso,
                "inspected_by": technician_id,
                "vehicle_km": inspection_data.vehicle_km,
                "general_notes": inspection_data.general_notes,
                "categories": inspection_data.categories,
                "photo_url": inspection_data.photo_url,
                "client_confirmed": False,
                "client_confirmed_at": None,
            }

            current_metadata["vehicle_inspection"] = inspection_dict
            service.service_metadata = current_metadata
            service.updated_at = datetime.utcnow()

            session.add(service)
            session.commit()
            session.refresh(service)

            # Broadcast WebSocket event to service room
            try:
                from app.core.websocket_manager import ws_manager
                await ws_manager.broadcast_to_service(
                    service_id=str(service.id),
                    message={
                        "type": "inspection_submitted",
                        "data": {
                            "service_id": str(service.id),
                            "inspection": inspection_dict
                        }
                    }
                )
            except Exception as ws_err:
                import logging
                logging.warning(f"WS inspection_submitted broadcast failed: {ws_err}")

            # Notify client
            try:
                from app.services.notification_service import NotificationService
                await NotificationService.notify_user(
                    session=session,
                    user_id=service.client_id,
                    title="🔍 Inspección de Vehículo Registrada",
                    message="El técnico ha registrado el estado previo de tu vehículo. Por favor revísala y confírmala para iniciar el servicio.",
                    notification_type="inspection_submitted",
                    reference_id=str(service.id),
                )
            except Exception as notif_err:
                import logging
                logging.warning(f"Notification inspection_submitted failed: {notif_err}")

            return {
                "success": True,
                "service_id": str(service.id),
                "inspection": inspection_dict,
                "message": "Inspección registrada con éxito. Notificando al cliente."
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    async def confirm_vehicle_inspection(
        self,
        session: Session,
        service_id: str,
        client_id: str
    ) -> dict:
        """Permite al cliente confirmar la inspección vehicular previa."""
        from uuid import UUID as UUIDType
        try:
            try:
                service_uuid = UUIDType(service_id)
            except ValueError:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de servicio inválido")

            service = session.exec(select(Service).where(Service.id == service_uuid)).first()
            if not service:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")

            if str(service.client_id) != client_id:
                raise HTTPException(status.HTTP_403_FORBIDDEN, "No autorizado")

            current_metadata = dict(service.service_metadata or {})
            inspection = current_metadata.get("vehicle_inspection")
            if not inspection:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "No hay inspección registrada para este servicio")

            now_iso = datetime.utcnow().isoformat()
            inspection["client_confirmed"] = True
            inspection["client_confirmed_at"] = now_iso
            current_metadata["vehicle_inspection"] = inspection

            service.service_metadata = current_metadata
            service.updated_at = datetime.utcnow()

            session.add(service)
            session.commit()
            session.refresh(service)

            # Broadcast WebSocket event to service room
            try:
                from app.core.websocket_manager import ws_manager
                await ws_manager.broadcast_to_service(
                    service_id=str(service.id),
                    message={
                        "type": "inspection_confirmed",
                        "data": {
                            "service_id": str(service.id),
                            "confirmed_at": now_iso
                        }
                    }
                )
            except Exception as ws_err:
                import logging
                logging.warning(f"WS inspection_confirmed broadcast failed: {ws_err}")

            # Notify technician
            if service.technician_id:
                try:
                    from app.services.notification_service import NotificationService
                    await NotificationService.notify_user(
                        session=session,
                        user_id=service.technician_id,
                        title="✅ Inspección Confirmada por el Cliente",
                        message="El cliente ha confirmado el estado inicial de su vehículo. Ya puedes iniciar el trabajo.",
                        notification_type="inspection_confirmed",
                        reference_id=str(service.id),
                    )
                except Exception as notif_err:
                    import logging
                    logging.warning(f"Notification inspection_confirmed failed: {notif_err}")

            return {
                "success": True,
                "service_id": str(service.id),
                "confirmed_at": now_iso,
                "message": "Inspección confirmada satisfactoriamente"
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    async def confirm_service(
        self,
        session: Session,
        service_id: str,
        client_id: str,
        confirm_data: ServiceConfirmRequest = None,
        payment_method: str = None
    ) -> ServiceResponse:
        try:
            service = session.exec(select(Service).where(Service.id == service_id)).first()
            if not service:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")
            
            if str(service.client_id) != client_id:
                raise HTTPException(status.HTTP_403_FORBIDDEN, "No autorizado")
                
            if service.status != ServiceStatus.completed:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "El servicio debe estar completado para poder confirmarlo")
                
            service.status = ServiceStatus.confirmed
            service.client_confirmed_at = datetime.utcnow()
            service.updated_at = datetime.utcnow()
            
            resolved_payment_method = (confirm_data.payment_method if confirm_data and confirm_data.payment_method else payment_method)
            if resolved_payment_method:
                service.payment_method = resolved_payment_method
                service.payment_status = "paid" if resolved_payment_method == "online" else "pending"
            
            # Guardar metadata de confirmación y rating
            current_metadata = dict(service.service_metadata or {})
            rating_val = confirm_data.rating if confirm_data else 5
            comment_val = confirm_data.comment if confirm_data else None

            current_metadata["client_confirmation"] = {
                "rating": rating_val,
                "comment": comment_val,
                "confirmed_at": datetime.utcnow().isoformat(),
            }
            service.service_metadata = current_metadata

            session.add(service)
            session.commit()
            session.refresh(service)

            # Crear rating en ServiceRating si hay técnico asignado
            if service.technician_id:
                try:
                    from app.services.rating_service import RatingService
                    from app.schemas.rating import RatingCreate
                    rating_svc = RatingService()
                    valid_comment = comment_val.strip() if comment_val and len(comment_val.strip()) >= 10 else None
                    await rating_svc.create_rating(
                        session=session,
                        service_id=str(service.id),
                        rating_data=RatingCreate(rating=rating_val, comment=valid_comment),
                        client_id=client_id
                    )
                except Exception as rating_err:
                    import logging
                    logging.warning(f"Rating creation skipped/failed: {rating_err}")

            # WebSocket broadcast
            try:
                from app.core.websocket_manager import ws_manager
                await ws_manager.broadcast_service_status(
                    service_id=str(service.id),
                    status="confirmed",
                    extra_data={"rating": rating_val}
                )
            except Exception as ws_error:
                import logging
                logging.warning(f"WebSocket broadcast failed: {ws_error}")
            
            # Notificar al técnico
            if service.technician_id:
                try:
                    from app.services.notification_service import NotificationService
                    await NotificationService.notify_technician_service_confirmed(
                        session=session,
                        technician_id=service.technician_id,
                        service_id=service.id,
                    )
                except Exception as notif_error:
                    import logging
                    logging.warning(f"Notification failed: {notif_error}")
            
            return self._to_response(service)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    async def assign_technician(self, session: Session, service_id: str, technician_id: str, user_role: str) -> ServiceResponse:
        if user_role != "admin":
             raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo admin")
             
        # Reutilizamos accept logic pero forzado
        service = session.exec(select(Service).where(Service.id == service_id)).first()
        if not service:
             raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")
             
        # Validar que el técnico no tenga conflicto de horario (bloque de 2 horas)
        self._check_technician_schedule_conflict(session, technician_id, service)

        service.technician_id = technician_id
        service.status = ServiceStatus.assigned
        session.add(service)
        session.commit()
        session.refresh(service)
        return self._to_response(service)

    async def find_nearby_technicians(self, session: Session, service_id: str, max_distance_km: int = 20) -> List[NearbyTechnicianResponse]:
        from app.models.technician import Technician
        from app.models.schedule import TechnicianSchedule
        from geoalchemy2.functions import ST_DWithin, ST_Distance
        from sqlalchemy import cast
        from geoalchemy2 import Geography
        from uuid import UUID
        from datetime import datetime
        import logging
        
        try:
            svc_uuid = UUID(service_id)
        except ValueError:
            return []
            
        service = session.get(Service, svc_uuid)
        if not service or not service.service_location:
            return []

        # 1. Obtener día actual
        current_day = datetime.utcnow().weekday() # 0 = Monday, 6 = Sunday
        
        # 2. Buscar técnicos disponibles, con horario activo hoy, y dentro de la distancia
        max_distance_meters = max_distance_km * 1000
        
        query = select(
            Technician, 
            User, 
            ST_Distance(
                cast(Technician.current_location, Geography), 
                cast(service.service_location, Geography)
            ).label("distance_meters")
        ).join(
            User, Technician.user_id == User.id
        ).join(
            TechnicianSchedule, Technician.user_id == TechnicianSchedule.technician_id
        ).where(
            Technician.is_available,
            User.is_active,
            TechnicianSchedule.day_of_week == current_day,
            TechnicianSchedule.is_active,
            Technician.current_location.is_not(None),
            ST_DWithin(
                cast(Technician.current_location, Geography), 
                cast(service.service_location, Geography), 
                max_distance_meters
            )
        )
        
        results = session.exec(query).all()
        logging.info(f"Técnicos cercanos encontrados: {len(results)}")
        
        response_list = []
        for tech, user, distance in results:
            # Check if tech has capacity or within their own radius
            if distance > (tech.service_radius_km * 1000):
                continue
                
            response_list.append(NearbyTechnicianResponse(
                id=str(user.id),
                full_name=user.full_name,
                distance_km=round(distance / 1000, 2),
                rank=tech.rank,
                average_rating=tech.average_rating,
                total_services=tech.total_services
            ))
            
        # Order by distance
        response_list.sort(key=lambda x: x.distance_km)
        
        return response_list

    def _to_response(
        self,
        service: Service,
        client_name: str = None,
        client: User = None,
        technician: User = None,
        payment: Optional[Payment] = None,
    ) -> ServiceResponse:
        """Helper para convertir DB model a Response Schema"""
        lat = 0.0
        lon = 0.0
        if service.service_location:
            try:
                pt = to_shape(service.service_location)
                lat = float(pt.y)
                lon = float(pt.x)
            except Exception:
                pass

        city = getattr(service, "service_city", None)
        if not city and service.service_address and "," in service.service_address:
            city = service.service_address.split(",")[-1].strip()
        if not city:
            city = "Medellín"

        has_warranty, w_status, w_days, w_expires = self._compute_warranty(service)
        commission_amt = None
        if payment and payment.amount:
            commission_amt = round(payment.amount * 0.18, 2)
        elif getattr(service, "final_price", None) or service.estimated_price:
            commission_amt = round(float(getattr(service, "final_price", None) or service.estimated_price) * 0.18, 2)

        response_kwargs = {
            "id": str(service.id),
            "client_id": str(service.client_id),
            "technician_id": str(service.technician_id) if service.technician_id else None,
            "service_type": service.service_type,
            "status": service.status,
            "title": service.title,
            "description": service.description,
            "service_address": service.service_address,
            "service_city": city,
            "service_lat": lat,
            "service_lon": lon,
            "requested_date": service.requested_date,
            "scheduled_date": service.scheduled_date,
            "estimated_price": service.estimated_price,
            "service_metadata": service.service_metadata,
            "vehicle_type": service.vehicle_type,
            "vehicle_model": service.vehicle_model,
            "vehicle_plate": service.vehicle_plate,
            "vehicle_photo_url": service.vehicle_photo_url,
            "payment_method": getattr(service, "payment_method", None),
            "payment_status": getattr(service, "payment_status", "pending"),
            "invoice_number": payment.invoice_number if payment else None,
            "cufe": payment.cufe if payment else None,
            "qr_url": payment.qr_url if payment else None,
            "pdf_url": payment.pdf_url if payment else None,
            "dian_status": payment.dian_status if payment else None,
            "tech_invoice_number": payment.tech_invoice_number if payment else None,
            "tech_cufe": payment.tech_cufe if payment else None,
            "tech_qr_url": payment.tech_qr_url if payment else None,
            "tech_pdf_url": payment.tech_pdf_url if payment else None,
            "tech_dian_status": payment.tech_dian_status if payment else None,
            "commission_amount": commission_amt,
            "has_warranty": has_warranty,
            "warranty_status": w_status,
            "warranty_days_left": w_days,
            "warranty_expires_at": w_expires,
            "created_at": service.created_at,
            "updated_at": service.updated_at
        }
        
        # Opcionalmente hidratar relaciones si se pasaron
        if client:
            response_kwargs["client"] = ServiceClient(
                id=str(client.id),
                email=client.email,
                full_name=client.full_name,
                phone=client.phone,
                avatar_url=client.avatar_url
            )
            
        if technician:
            tech_rating = getattr(technician, "average_rating", None)
            response_kwargs["technician"] = ServiceTechnician(
                id=str(technician.id),
                email=technician.email,
                full_name=technician.full_name,
                phone=technician.phone,
                avatar_url=technician.avatar_url,
                average_rating=float(tech_rating) if tech_rating is not None else 0.0
            )
            
        return ServiceResponse(**response_kwargs)

    def _check_technician_schedule_conflict(
        self, session: Session, technician_id: str, target_service: Service
    ) -> None:
        """
        Verifica si el técnico ya tiene un servicio activo en una ventana de 2 horas.
        Cada servicio requiere un bloque de 2 horas.
        """
        from uuid import UUID as UUIDType
        
        target_time = target_service.scheduled_date or target_service.requested_date or target_service.created_at
        if not target_time:
            return

        active_statuses = [
            ServiceStatus.assigned,
            ServiceStatus.en_route,
            ServiceStatus.arrived,
            ServiceStatus.in_progress,
            ServiceStatus.paused
        ]

        try:
            tech_uuid = UUIDType(str(technician_id))
        except ValueError:
            return

        existing_services = session.exec(
            select(Service).where(
                Service.technician_id == tech_uuid,
                Service.status.in_(active_statuses),
                Service.id != target_service.id
            )
        ).all()

        target_time_naive = target_time.replace(tzinfo=None)

        for existing in existing_services:
            existing_time = existing.scheduled_date or existing.requested_date or existing.created_at
            if not existing_time:
                continue

            existing_time_naive = existing_time.replace(tzinfo=None)
            time_diff = abs((target_time_naive - existing_time_naive).total_seconds())

            if time_diff < 7200:  # 2 horas en segundos (7200s)
                existing_title = existing.title or f"Servicio #{str(existing.id)[:8]}"
                remaining_mins = max(1, int((7200 - time_diff) / 60))
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Ya tienes asignado '{existing_title}' en esta franja horaria. Cada servicio requiere una ventana de 2 horas (espera {remaining_mins} min o completa el servicio previo)."
                )

service_service = ServiceService()