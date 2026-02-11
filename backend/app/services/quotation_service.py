"""
Service Layer para el sistema de cotizaciones
Path: backend/app/services/quotation_service.py
"""
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status
from sqlmodel import Session, select, func
from datetime import datetime, timedelta
from decimal import Decimal
from uuid import UUID
import logging

from app.models.quotation import Quotation, QuotationStatus
from app.models.service import Service, ServiceStatus
from app.models.user import User
from app.models.notification import NotificationCreate
from app.schemas.quotation import (
    QuotationCreate, QuotationResponse, QuotationListResponse,
    QuotationListItem, QuotationCounterOffer, QuotationReject,
    ServiceQuotationsSummary
)
from app.services.notification_service import NotificationService


def _get_technician_profile(session: Session, user_id: UUID):
    """Safely get technician profile, returns None if not found"""
    try:
        from app.models.technician import Technician
        return session.exec(
            select(Technician).where(Technician.user_id == user_id)
        ).first()
    except Exception as e:
        logging.warning(f"Could not query technician profile: {e}")
        return None


class QuotationService:
    """Servicio para gestión de cotizaciones"""
    
    async def create_quotation(
        self,
        session: Session,
        service_id: str,
        quotation_data: QuotationCreate,
        technician_id: str
    ) -> QuotationResponse:
        """
        Técnico crea una cotización para un servicio
        """
        try:
            service_uuid = UUID(service_id)
            tech_uuid = UUID(technician_id)
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID inválido")
        
        # 1. Verificar que el servicio existe y está pending
        service = session.get(Service, service_uuid)
        if not service:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")
        
        if service.status not in [ServiceStatus.pending, ServiceStatus.quoted]:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, 
                f"Solo se pueden cotizar servicios pendientes. Estado actual: {service.status}"
            )
        
        # 2. Verificar que el técnico no es el cliente
        if service.client_id == tech_uuid:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puedes cotizar tu propio servicio")
        
        # 3. Verificar que no haya cotización previa de este técnico
        existing = session.exec(
            select(Quotation).where(
                Quotation.service_id == service_uuid,
                Quotation.technician_id == tech_uuid
            )
        ).first()
        
        if existing:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ya enviaste una cotización para este servicio")
        
        # 4. Obtener info del técnico
        technician = session.get(User, tech_uuid)
        tech_profile = _get_technician_profile(session, tech_uuid)
        
        # 5. Crear cotización
        expires_at = None
        if quotation_data.expires_in_hours:
            expires_at = datetime.utcnow() + timedelta(hours=quotation_data.expires_in_hours)
        
        new_quotation = Quotation(
            service_id=service_uuid,
            technician_id=tech_uuid,
            amount=quotation_data.amount,
            description=quotation_data.description,
            status=QuotationStatus.pending,
            expires_at=expires_at
        )
        session.add(new_quotation)
        
        # 6. Actualizar estado del servicio a 'quoted' si es la primera
        if service.status == ServiceStatus.pending:
            service.status = ServiceStatus.quoted
            session.add(service)
        
        session.commit()
        session.refresh(new_quotation)
        
        # 7. Notificar al cliente
        try:
            await NotificationService.create_notification(
                session=session,
                data=NotificationCreate(
                    user_id=service.client_id,
                    title="Nueva cotización recibida",
                    message=f"{technician.full_name if technician else 'Un técnico'} envió una cotización de ${quotation_data.amount:,.0f}",
                    notification_type="quotation",
                    service_id=service_uuid
                )
            )
        except Exception as e:
            import logging
            logging.warning(f"Failed to send notification: {e}")
        
        return QuotationResponse(
            id=str(new_quotation.id),
            service_id=str(new_quotation.service_id),
            technician_id=str(new_quotation.technician_id),
            amount=new_quotation.amount,
            description=new_quotation.description,
            status=new_quotation.status.value,
            expires_at=new_quotation.expires_at,
            created_at=new_quotation.created_at,
            updated_at=new_quotation.updated_at,
            technician_name=technician.full_name if technician else None,
            technician_rating=tech_profile.average_rating if tech_profile else None,
            technician_total_services=tech_profile.total_services if tech_profile else None
        )
    
    async def get_service_quotations(
        self,
        session: Session,
        service_id: str,
        user_id: str,
        user_role: str
    ) -> List[QuotationResponse]:
        """
        Obtener cotizaciones de un servicio
        Solo el cliente dueño o el técnico que cotizó pueden ver
        """
        try:
            service_uuid = UUID(service_id)
            user_uuid = UUID(user_id)
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID inválido")
        
        # Verificar servicio existe
        service = session.get(Service, service_uuid)
        if not service:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")
        
        # Verificar permisos
        is_client = service.client_id == user_uuid
        
        query = select(Quotation).where(Quotation.service_id == service_uuid)
        
        if not is_client and user_role != "admin":
            # Técnico solo ve su propia cotización
            query = query.where(Quotation.technician_id == user_uuid)
        
        quotations = session.exec(query.order_by(Quotation.created_at.desc())).all()
        
        result = []
        for q in quotations:
            tech = session.get(User, q.technician_id)
            tech_profile = _get_technician_profile(session, q.technician_id)
            
            result.append(QuotationResponse(
                id=str(q.id),
                service_id=str(q.service_id),
                technician_id=str(q.technician_id),
                amount=q.amount,
                description=q.description,
                status=q.status.value,
                client_response=q.client_response,
                counter_amount=q.counter_amount,
                expires_at=q.expires_at,
                created_at=q.created_at,
                updated_at=q.updated_at,
                responded_at=q.responded_at,
                technician_name=tech.full_name if tech else None,
                technician_rating=tech_profile.average_rating if tech_profile else None,
                technician_total_services=tech_profile.total_services if tech_profile else None
            ))
        
        return result
    
    async def approve_quotation(
        self,
        session: Session,
        quotation_id: str,
        client_id: str
    ) -> QuotationResponse:
        """
        Cliente aprueba una cotización
        - Asigna el técnico al servicio
        - Rechaza otras cotizaciones del mismo servicio
        """
        try:
            quote_uuid = UUID(quotation_id)
            client_uuid = UUID(client_id)
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID inválido")
        
        # 1. Obtener cotización
        quotation = session.get(Quotation, quote_uuid)
        if not quotation:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Cotización no encontrada")
        
        if quotation.status != QuotationStatus.pending:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Cotización no está pendiente: {quotation.status}")
        
        # 2. Verificar que el cliente es dueño del servicio
        service = session.get(Service, quotation.service_id)
        if not service:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")
        
        if service.client_id != client_uuid:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso para aprobar esta cotización")
        
        # 3. Aprobar cotización
        quotation.status = QuotationStatus.approved
        quotation.responded_at = datetime.utcnow()
        quotation.updated_at = datetime.utcnow()
        session.add(quotation)
        
        # 4. Asignar técnico al servicio
        service.technician_id = quotation.technician_id
        service.status = ServiceStatus.assigned
        service.estimated_price = quotation.amount
        service.updated_at = datetime.utcnow()
        session.add(service)
        
        # 5. Rechazar otras cotizaciones
        other_quotes = session.exec(
            select(Quotation).where(
                Quotation.service_id == quotation.service_id,
                Quotation.id != quotation.id,
                Quotation.status == QuotationStatus.pending
            )
        ).all()
        
        for oq in other_quotes:
            oq.status = QuotationStatus.rejected
            oq.client_response = "Otra cotización fue aceptada"
            oq.responded_at = datetime.utcnow()
            oq.updated_at = datetime.utcnow()
            session.add(oq)
        
        session.commit()
        session.refresh(quotation)
        
        # 6. Notificar al técnico ganador
        tech = session.get(User, quotation.technician_id)
        try:
            await NotificationService.create_notification(
                session=session,
                data=NotificationCreate(
                    user_id=quotation.technician_id,
                    title="¡Cotización aprobada!",
                    message=f"Tu cotización de ${quotation.amount:,.0f} fue aceptada. Ve al servicio para comenzar.",
                    notification_type="quotation_approved",
                    service_id=quotation.service_id
                )
            )
        except Exception as e:
            import logging
            logging.warning(f"Failed to notify technician: {e}")
        
        # 7. Notificar a otros técnicos
        for oq in other_quotes:
            try:
                await NotificationService.create_notification(
                    session=session,
                    data=NotificationCreate(
                        user_id=oq.technician_id,
                        title="Cotización no seleccionada",
                        message="Tu cotización no fue seleccionada para este servicio.",
                        notification_type="quotation_rejected",
                        service_id=oq.service_id
                    )
                )
            except:
                pass
        
        return QuotationResponse(
            id=str(quotation.id),
            service_id=str(quotation.service_id),
            technician_id=str(quotation.technician_id),
            amount=quotation.amount,
            description=quotation.description,
            status=quotation.status.value,
            client_response=quotation.client_response,
            counter_amount=quotation.counter_amount,
            expires_at=quotation.expires_at,
            created_at=quotation.created_at,
            updated_at=quotation.updated_at,
            responded_at=quotation.responded_at,
            technician_name=tech.full_name if tech else None
        )
    
    async def reject_quotation(
        self,
        session: Session,
        quotation_id: str,
        client_id: str,
        rejection: QuotationReject
    ) -> QuotationResponse:
        """Cliente rechaza una cotización"""
        try:
            quote_uuid = UUID(quotation_id)
            client_uuid = UUID(client_id)
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID inválido")
        
        quotation = session.get(Quotation, quote_uuid)
        if not quotation:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Cotización no encontrada")
        
        if quotation.status != QuotationStatus.pending:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cotización no está pendiente")
        
        service = session.get(Service, quotation.service_id)
        if service.client_id != client_uuid:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso")
        
        quotation.status = QuotationStatus.rejected
        quotation.client_response = rejection.client_response
        quotation.responded_at = datetime.utcnow()
        quotation.updated_at = datetime.utcnow()
        session.add(quotation)
        session.commit()
        session.refresh(quotation)
        
        # Notificar técnico
        try:
            await NotificationService.create_notification(
                session=session,
                data=NotificationCreate(
                    user_id=quotation.technician_id,
                    title="Cotización rechazada",
                    message=rejection.client_response or "Tu cotización fue rechazada.",
                    notification_type="quotation_rejected",
                    service_id=quotation.service_id
                )
            )
        except:
            pass
        
        tech = session.get(User, quotation.technician_id)
        return QuotationResponse(
            id=str(quotation.id),
            service_id=str(quotation.service_id),
            technician_id=str(quotation.technician_id),
            amount=quotation.amount,
            description=quotation.description,
            status=quotation.status.value,
            client_response=quotation.client_response,
            expires_at=quotation.expires_at,
            created_at=quotation.created_at,
            updated_at=quotation.updated_at,
            responded_at=quotation.responded_at,
            technician_name=tech.full_name if tech else None
        )
    
    async def counter_offer(
        self,
        session: Session,
        quotation_id: str,
        client_id: str,
        counter_data: QuotationCounterOffer
    ) -> QuotationResponse:
        """Cliente hace contraoferta"""
        try:
            quote_uuid = UUID(quotation_id)
            client_uuid = UUID(client_id)
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID inválido")
        
        quotation = session.get(Quotation, quote_uuid)
        if not quotation:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Cotización no encontrada")
        
        if quotation.status != QuotationStatus.pending:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cotización no está pendiente")
        
        service = session.get(Service, quotation.service_id)
        if service.client_id != client_uuid:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso")
        
        quotation.status = QuotationStatus.counter_offered
        quotation.counter_amount = counter_data.counter_amount
        quotation.client_response = counter_data.client_response
        quotation.responded_at = datetime.utcnow()
        quotation.updated_at = datetime.utcnow()
        session.add(quotation)
        session.commit()
        session.refresh(quotation)
        
        # Notificar técnico
        try:
            await NotificationService.create_notification(
                session=session,
                data=NotificationCreate(
                    user_id=quotation.technician_id,
                    title="Contraoferta recibida",
                    message=f"El cliente ofrece ${counter_data.counter_amount:,.0f}. {counter_data.client_response or ''}",
                    notification_type="quotation_counter",
                    service_id=quotation.service_id
                )
            )
        except:
            pass
        
        tech = session.get(User, quotation.technician_id)
        return QuotationResponse(
            id=str(quotation.id),
            service_id=str(quotation.service_id),
            technician_id=str(quotation.technician_id),
            amount=quotation.amount,
            description=quotation.description,
            status=quotation.status.value,
            client_response=quotation.client_response,
            counter_amount=quotation.counter_amount,
            expires_at=quotation.expires_at,
            created_at=quotation.created_at,
            updated_at=quotation.updated_at,
            responded_at=quotation.responded_at,
            technician_name=tech.full_name if tech else None
        )
    
    async def get_my_quotations(
        self,
        session: Session,
        technician_id: str,
        status_filter: Optional[str] = None,
        page: int = 1,
        page_size: int = 10
    ) -> QuotationListResponse:
        """Técnico ve sus cotizaciones enviadas"""
        try:
            tech_uuid = UUID(technician_id)
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID inválido")
        
        query = select(Quotation).where(Quotation.technician_id == tech_uuid)
        
        if status_filter:
            query = query.where(Quotation.status == QuotationStatus(status_filter))
        
        # Count
        count_query = select(func.count()).select_from(query.subquery())
        total = session.exec(count_query).one()
        
        # Paginate
        quotations = session.exec(
            query.order_by(Quotation.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        
        items = []
        for q in quotations:
            tech = session.get(User, q.technician_id)
            tech_profile = _get_technician_profile(session, q.technician_id)
            
            items.append(QuotationListItem(
                id=str(q.id),
                service_id=str(q.service_id),
                technician_id=str(q.technician_id),
                technician_name=tech.full_name if tech else "Técnico",
                technician_rating=tech_profile.average_rating if tech_profile else None,
                amount=q.amount,
                description=q.description,
                status=q.status.value,
                client_response=q.client_response,
                counter_amount=q.counter_amount,
                created_at=q.created_at,
                expires_at=q.expires_at
            ))
        
        import math
        total_pages = math.ceil(total / page_size) if total > 0 else 1
        
        return QuotationListResponse(
            quotations=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    
    async def accept_counter_offer(
        self,
        session: Session,
        quotation_id: str,
        technician_id: str
    ) -> QuotationResponse:
        """
        Técnico acepta la contraoferta del cliente.
        - Actualiza el monto con el counter_amount
        - Cambia estado a 'pending' para aprobación final
        """
        try:
            quote_uuid = UUID(quotation_id)
            tech_uuid = UUID(technician_id)
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID inválido")
        
        quotation = session.get(Quotation, quote_uuid)
        if not quotation:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Cotización no encontrada")
        
        if quotation.technician_id != tech_uuid:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso")
        
        if quotation.status != QuotationStatus.counter_offered:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Esta cotización no tiene contraoferta pendiente")
        
        if not quotation.counter_amount:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "No hay monto de contraoferta")
        
        # Update amount to counter amount and reset to pending
        quotation.amount = quotation.counter_amount
        quotation.counter_amount = None
        quotation.status = QuotationStatus.pending
        quotation.client_response = None
        quotation.updated_at = datetime.utcnow()
        session.add(quotation)
        session.commit()
        session.refresh(quotation)
        
        # Notify client
        service = session.get(Service, quotation.service_id)
        try:
            await NotificationService.create_notification(
                session=session,
                data=NotificationCreate(
                    user_id=service.client_id,
                    title="Contraoferta aceptada",
                    message=f"El técnico aceptó tu contraoferta de ${quotation.amount:,.0f}. Ahora puedes aprobar el servicio.",
                    notification_type="quotation_accepted",
                    service_id=quotation.service_id
                )
            )
        except:
            pass
        
        tech = session.get(User, quotation.technician_id)
        return QuotationResponse(
            id=str(quotation.id),
            service_id=str(quotation.service_id),
            technician_id=str(quotation.technician_id),
            amount=quotation.amount,
            description=quotation.description,
            status=quotation.status.value,
            client_response=quotation.client_response,
            counter_amount=quotation.counter_amount,
            expires_at=quotation.expires_at,
            created_at=quotation.created_at,
            updated_at=quotation.updated_at,
            responded_at=quotation.responded_at,
            technician_name=tech.full_name if tech else None
        )
    
    async def reject_counter_offer(
        self,
        session: Session,
        quotation_id: str,
        technician_id: str
    ) -> QuotationResponse:
        """
        Técnico rechaza la contraoferta del cliente.
        - Cancela la cotización
        """
        try:
            quote_uuid = UUID(quotation_id)
            tech_uuid = UUID(technician_id)
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID inválido")
        
        quotation = session.get(Quotation, quote_uuid)
        if not quotation:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Cotización no encontrada")
        
        if quotation.technician_id != tech_uuid:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso")
        
        if quotation.status != QuotationStatus.counter_offered:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Esta cotización no tiene contraoferta pendiente")
        
        # Cancel quotation
        quotation.status = QuotationStatus.cancelled
        quotation.updated_at = datetime.utcnow()
        session.add(quotation)
        session.commit()
        session.refresh(quotation)
        
        # Notify client
        service = session.get(Service, quotation.service_id)
        try:
            await NotificationService.create_notification(
                session=session,
                data=NotificationCreate(
                    user_id=service.client_id,
                    title="Contraoferta rechazada",
                    message="El técnico no aceptó tu contraoferta. Puedes revisar otras cotizaciones.",
                    notification_type="quotation_rejected",
                    service_id=quotation.service_id
                )
            )
        except:
            pass
        
        tech = session.get(User, quotation.technician_id)
        return QuotationResponse(
            id=str(quotation.id),
            service_id=str(quotation.service_id),
            technician_id=str(quotation.technician_id),
            amount=quotation.amount,
            description=quotation.description,
            status=quotation.status.value,
            client_response=quotation.client_response,
            counter_amount=quotation.counter_amount,
            expires_at=quotation.expires_at,
            created_at=quotation.created_at,
            updated_at=quotation.updated_at,
            responded_at=quotation.responded_at,
            technician_name=tech.full_name if tech else None
        )


# Singleton instance
quotation_service = QuotationService()

