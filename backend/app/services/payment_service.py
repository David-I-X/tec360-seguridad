"""
Servicio de Pagos — Tec360 Seguridad
Lógica de negocio para pagos en efectivo y digitales
"""
import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlmodel import Session, func, select

from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.service import Service
from app.models.user import User
from app.schemas.payment import CashPaymentConfirm, PaymentListResponse, PaymentResponse

logger = logging.getLogger(__name__)


class PaymentService:
    """Service layer para pagos"""

    async def confirm_cash_payment(
        self,
        session: Session,
        data: CashPaymentConfirm,
        technician_id: str,
    ) -> PaymentResponse:
        """Técnico confirma que recibió pago en efectivo del cliente"""
        service = session.get(Service, UUID(data.service_id))
        if not service:
            raise HTTPException(status_code=404, detail="Servicio no encontrado")

        # Verify the technician is assigned to this service
        if str(service.technician_id) != str(technician_id):
            raise HTTPException(
                status_code=403,
                detail="Solo el técnico asignado puede confirmar el pago"
            )

        # Check if payment already exists for this service
        existing = session.exec(
            select(Payment).where(
                Payment.service_id == service.id,
                Payment.status.in_(["approved", "confirmed_by_technician", "confirmed_by_admin"])
            )
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Ya existe un pago registrado para este servicio"
            )

        payment = Payment(
            service_id=service.id,
            client_id=service.client_id,
            technician_id=UUID(technician_id),
            amount=data.amount,
            currency="COP",
            payment_method=PaymentMethod.cash,
            payment_provider="manual",
            status=PaymentStatus.confirmed_by_technician,
            notes=data.notes,
            paid_at=datetime.utcnow(),
            confirmed_by=UUID(technician_id),
        )

        service.payment_status = "paid"
        session.add(service)
        session.add(payment)
        session.commit()
        session.refresh(payment)

        # Trigger DIAN invoice creation asynchronously
        import asyncio
        from app.services.sas_service import create_dian_invoice, sync_contact_to_sas
        from app.core.database import engine
        from sqlmodel import Session as SqlSession
        
        async def _trigger_invoice(uid, svc, pmt):
            try:
                with SqlSession(engine) as session_bg:
                    client_user = session_bg.get(User, uid)
                    if client_user:
                        if not client_user.sas_contact_id:
                            sas_id = await sync_contact_to_sas(client_user)
                            if sas_id:
                                client_user.sas_contact_id = str(sas_id)
                                session_bg.add(client_user)
                                session_bg.commit()
                        if client_user.sas_contact_id:
                            await create_dian_invoice(client_user.sas_contact_id, svc, pmt)
            except Exception as e:
                logger.error(f"Error in background DIAN invoice trigger: {e}")
        
        asyncio.create_task(_trigger_invoice(service.client_id, service, payment))

        return self._to_response(payment, session)

    async def admin_confirm_payment(
        self,
        session: Session,
        payment_id: str,
        admin_id: str,
    ) -> PaymentResponse:
        """Admin valida un pago en efectivo confirmado por el técnico"""
        payment = session.get(Payment, UUID(payment_id))
        if not payment:
            raise HTTPException(status_code=404, detail="Pago no encontrado")

        if payment.status != PaymentStatus.confirmed_by_technician:
            raise HTTPException(
                status_code=400,
                detail="Solo se pueden validar pagos confirmados por el técnico"
            )

        payment.status = PaymentStatus.confirmed_by_admin
        payment.confirmed_by = UUID(admin_id)
        payment.updated_at = datetime.utcnow()

        session.add(payment)
        session.commit()
        session.refresh(payment)

        return self._to_response(payment, session)

    async def get_service_payment(
        self,
        session: Session,
        service_id: str,
    ) -> Optional[PaymentResponse]:
        """Get payment info for a specific service"""
        payment = session.exec(
            select(Payment).where(Payment.service_id == UUID(service_id))
        ).first()

        if not payment:
            return None

        return self._to_response(payment, session)

    async def list_payments(
        self,
        session: Session,
        skip: int = 0,
        limit: int = 50,
        status_filter: Optional[str] = None,
        method_filter: Optional[str] = None,
    ) -> PaymentListResponse:
        """Admin: list all payments with filters"""
        query = select(Payment)

        if status_filter:
            query = query.where(Payment.status == status_filter)
        if method_filter:
            query = query.where(Payment.payment_method == method_filter)

        total = session.exec(select(func.count()).select_from(query.subquery())).one()
        payments = session.exec(
            query.order_by(Payment.created_at.desc()).offset(skip).limit(limit)
        ).all()

        items = [self._to_response(p, session) for p in payments]

        return PaymentListResponse(items=items, total=total)

    def _to_response(self, payment: Payment, session: Session) -> PaymentResponse:
        """Convert payment model to response schema with hydrated names"""
        client = session.get(User, payment.client_id) if payment.client_id else None
        technician = session.get(User, payment.technician_id) if payment.technician_id else None
        service = session.get(Service, payment.service_id) if payment.service_id else None

        return PaymentResponse(
            id=str(payment.id),
            service_id=str(payment.service_id),
            client_id=str(payment.client_id),
            technician_id=str(payment.technician_id) if payment.technician_id else None,
            quotation_id=str(payment.quotation_id) if payment.quotation_id else None,
            amount=payment.amount,
            currency=payment.currency,
            payment_method=payment.payment_method,
            payment_provider=payment.payment_provider,
            provider_reference=payment.provider_reference,
            status=payment.status,
            notes=payment.notes,
            paid_at=payment.paid_at,
            confirmed_by=str(payment.confirmed_by) if payment.confirmed_by else None,
            created_at=payment.created_at,
            client_name=client.full_name if client else None,
            technician_name=technician.full_name if technician else None,
            service_title=service.title if service else None,
        )

    async def get_technician_summary(
        self,
        session: Session,
        technician_id: str,
    ):
        """Get payment summary stats for a technician"""
        from app.schemas.payment import TechnicianPaymentSummary

        tech_uuid = UUID(technician_id)

        # Total collected (confirmed_by_technician + confirmed_by_admin)
        total_collected = session.exec(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(
                Payment.technician_id == tech_uuid,
                Payment.status.in_(["confirmed_by_technician", "confirmed_by_admin"]),
            )
        ).one()

        payments_count = session.exec(
            select(func.count()).where(
                Payment.technician_id == tech_uuid,
                Payment.status.in_(["confirmed_by_technician", "confirmed_by_admin"]),
            )
        ).one()

        pending_validation = session.exec(
            select(func.count()).where(
                Payment.technician_id == tech_uuid,
                Payment.status == "confirmed_by_technician",
            )
        ).one()

        validated = session.exec(
            select(func.count()).where(
                Payment.technician_id == tech_uuid,
                Payment.status == "confirmed_by_admin",
            )
        ).one()

        return TechnicianPaymentSummary(
            total_collected=float(total_collected),
            payments_count=payments_count,
            pending_validation=pending_validation,
            validated=validated,
        )

    async def get_technician_payments(
        self,
        session: Session,
        technician_id: str,
        skip: int = 0,
        limit: int = 50,
    ) -> PaymentListResponse:
        """List payments registered by a specific technician"""
        tech_uuid = UUID(technician_id)
        query = select(Payment).where(Payment.technician_id == tech_uuid)

        total = session.exec(select(func.count()).select_from(query.subquery())).one()
        payments = session.exec(
            query.order_by(Payment.created_at.desc()).offset(skip).limit(limit)
        ).all()

        items = [self._to_response(p, session) for p in payments]
        return PaymentListResponse(items=items, total=total)


payment_service = PaymentService()
