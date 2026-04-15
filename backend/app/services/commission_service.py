"""
Commission Service — Tec360 Seguridad
Business logic for the 10% commission system.

Rules:
- First 3 completed services per technician: commission waived (0%)
- After that: 10% of service price
- Every 3 services without paying: notification sent
- 48h after notification: technician blocked from accepting new services
"""
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from uuid import UUID

from sqlmodel import Session, select, func
from fastapi import HTTPException, status

from app.models.commission import (
    CommissionLedger, CommissionStatus,
    CommissionPayment, CommissionPaymentStatus,
)
from app.models.service import Service
from app.models.user import User
from app.models.technician import Technician

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────
COMMISSION_RATE = 0.10          # 10%
FREE_SERVICES_COUNT = 3         # First N services are free
SERVICES_BEFORE_COLLECTION = 3  # Collect every N unpaid services
GRACE_PERIOD_HOURS = 48         # Hours before blocking


class CommissionService:
    """Service layer for commission management."""

    # ──────────────────────────────────────────────────────────
    # 1. REGISTER COMMISSION (called when service completes)
    # ──────────────────────────────────────────────────────────

    async def register_commission(
        self,
        session: Session,
        service: Service,
        technician_id: UUID,
    ) -> CommissionLedger:
        """
        Called when a service is marked 'completed'.
        Calculates and records the commission owed.
        """
        # Check if already registered
        existing = session.exec(
            select(CommissionLedger).where(
                CommissionLedger.service_id == service.id
            )
        ).first()
        if existing:
            logger.info(f"Commission already registered for service {service.id}")
            return existing

        # Count how many completed services this technician has
        completed_count = session.exec(
            select(func.count()).select_from(
                select(CommissionLedger).where(
                    CommissionLedger.technician_id == technician_id
                ).subquery()
            )
        ).one()

        # Determine rate: free for first N services
        if completed_count < FREE_SERVICES_COUNT:
            rate = 0.0
            commission_status = CommissionStatus.waived
            logger.info(
                f"Technician {technician_id}: service #{completed_count + 1} "
                f"(free, {FREE_SERVICES_COUNT - completed_count - 1} free remaining)"
            )
        else:
            rate = COMMISSION_RATE
            commission_status = CommissionStatus.pending

        service_amount = float(service.estimated_price or 0)
        commission_amount = round(service_amount * rate, 2)

        entry = CommissionLedger(
            technician_id=technician_id,
            service_id=service.id,
            service_amount=service_amount,
            commission_rate=rate,
            commission_amount=commission_amount,
            status=commission_status,
            service_completed_at=datetime.utcnow(),
        )

        session.add(entry)
        session.commit()
        session.refresh(entry)

        logger.info(
            f"Commission registered: tech={technician_id}, "
            f"amount=${commission_amount:,.0f} ({rate*100:.0f}%)"
        )

        # Check if technician needs to pay
        await self._check_collection_threshold(session, technician_id)

        return entry

    # ──────────────────────────────────────────────────────────
    # 2. TECHNICIAN: GET BALANCE & STATUS
    # ──────────────────────────────────────────────────────────

    async def get_technician_balance(
        self, session: Session, technician_id: str
    ) -> Dict[str, Any]:
        """Get commission summary for a technician."""
        tech_uuid = UUID(technician_id)

        # Pending commissions (not waived, not yet included in a payment)
        pending = session.exec(
            select(CommissionLedger).where(
                CommissionLedger.technician_id == tech_uuid,
                CommissionLedger.status == CommissionStatus.pending,
            )
        ).all()

        pending_amount = sum(c.commission_amount for c in pending)
        pending_count = len(pending)

        # Total waived (free services used)
        waived_count = session.exec(
            select(func.count()).select_from(
                select(CommissionLedger).where(
                    CommissionLedger.technician_id == tech_uuid,
                    CommissionLedger.status == CommissionStatus.waived,
                ).subquery()
            )
        ).one()

        free_remaining = max(0, FREE_SERVICES_COUNT - waived_count)

        # Total paid historically
        total_paid = session.exec(
            select(func.coalesce(func.sum(CommissionPayment.amount), 0)).where(
                CommissionPayment.technician_id == tech_uuid,
                CommissionPayment.status == CommissionPaymentStatus.approved,
            )
        ).one()

        # Check if blocked
        is_blocked = await self.is_technician_blocked(session, technician_id)

        # Active payment request (pending/submitted)
        active_payment = session.exec(
            select(CommissionPayment).where(
                CommissionPayment.technician_id == tech_uuid,
                CommissionPayment.status.in_([
                    CommissionPaymentStatus.pending,
                    CommissionPaymentStatus.submitted,
                ]),
            )
        ).first()

        return {
            "pending_amount": pending_amount,
            "pending_services": pending_count,
            "free_services_remaining": free_remaining,
            "total_paid": float(total_paid),
            "is_blocked": is_blocked,
            "active_payment": {
                "id": str(active_payment.id),
                "amount": active_payment.amount,
                "status": active_payment.status,
                "due_date": active_payment.due_date.isoformat() if active_payment.due_date else None,
            } if active_payment else None,
        }

    # ──────────────────────────────────────────────────────────
    # 3. TECHNICIAN: SUBMIT RECEIPT
    # ──────────────────────────────────────────────────────────

    async def submit_receipt(
        self,
        session: Session,
        technician_id: str,
        payment_id: str,
        receipt_url: str,
        reference_number: Optional[str] = None,
        payment_method: str = "nequi",
    ) -> Dict[str, Any]:
        """Technician uploads transfer receipt."""
        payment = session.get(CommissionPayment, UUID(payment_id))
        if not payment:
            raise HTTPException(404, "Pago de comisión no encontrado")

        if str(payment.technician_id) != technician_id:
            raise HTTPException(403, "No autorizado")

        if payment.status not in (
            CommissionPaymentStatus.pending,
            CommissionPaymentStatus.rejected,
        ):
            raise HTTPException(400, "Este pago ya fue procesado")

        payment.receipt_url = receipt_url
        payment.reference_number = reference_number
        payment.payment_method = payment_method
        payment.status = CommissionPaymentStatus.submitted
        payment.submitted_at = datetime.utcnow()
        payment.updated_at = datetime.utcnow()

        session.add(payment)
        session.commit()
        session.refresh(payment)

        logger.info(f"Receipt submitted for payment {payment_id} by tech {technician_id}")

        return {
            "id": str(payment.id),
            "amount": payment.amount,
            "status": payment.status,
            "message": "Comprobante enviado. Un administrador lo revisará pronto.",
        }

    # ──────────────────────────────────────────────────────────
    # 4. ADMIN: REVIEW PAYMENTS
    # ──────────────────────────────────────────────────────────

    async def admin_list_payments(
        self,
        session: Session,
        status_filter: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Dict[str, Any]:
        """Admin: list all commission payments."""
        query = select(CommissionPayment)
        if status_filter:
            query = query.where(CommissionPayment.status == status_filter)

        total = session.exec(
            select(func.count()).select_from(query.subquery())
        ).one()

        payments = session.exec(
            query.order_by(CommissionPayment.created_at.desc())
            .offset(skip).limit(limit)
        ).all()

        items = []
        for p in payments:
            tech_user = session.exec(
                select(User).where(User.id == p.technician_id)
            ).first()
            items.append({
                "id": str(p.id),
                "technician_id": str(p.technician_id),
                "technician_name": tech_user.full_name if tech_user else None,
                "technician_phone": tech_user.phone if tech_user else None,
                "amount": p.amount,
                "payment_method": p.payment_method,
                "receipt_url": p.receipt_url,
                "reference_number": p.reference_number,
                "status": p.status,
                "due_date": p.due_date.isoformat() if p.due_date else None,
                "submitted_at": p.submitted_at.isoformat() if p.submitted_at else None,
                "created_at": p.created_at.isoformat(),
            })

        return {"items": items, "total": total}

    async def admin_review_payment(
        self,
        session: Session,
        payment_id: str,
        admin_id: str,
        approved: bool,
        admin_notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Admin approves or rejects a commission payment."""
        payment = session.get(CommissionPayment, UUID(payment_id))
        if not payment:
            raise HTTPException(404, "Pago no encontrado")

        if payment.status != CommissionPaymentStatus.submitted:
            raise HTTPException(400, "Solo se pueden revisar pagos con comprobante enviado")

        if approved:
            payment.status = CommissionPaymentStatus.approved
            # Mark all covered ledger entries as 'included'
            ledger_entries = session.exec(
                select(CommissionLedger).where(
                    CommissionLedger.payment_id == payment.id
                )
            ).all()
            for entry in ledger_entries:
                entry.status = CommissionStatus.included
                session.add(entry)
        else:
            payment.status = CommissionPaymentStatus.rejected

        payment.reviewed_at = datetime.utcnow()
        payment.reviewed_by = UUID(admin_id)
        payment.admin_notes = admin_notes
        payment.updated_at = datetime.utcnow()

        session.add(payment)
        session.commit()

        # Notify technician
        try:
            from app.services.notification_service import NotificationService
            tech_user = session.get(User, payment.technician_id)
            if tech_user:
                status_text = "✅ aprobado" if approved else "❌ rechazado"
                await NotificationService.send_to_user(
                    session=session,
                    user_id=payment.technician_id,
                    title="Comisión " + ("Aprobada" if approved else "Rechazada"),
                    body=f"Tu pago de ${payment.amount:,.0f} fue {status_text}."
                         + (f" Nota: {admin_notes}" if admin_notes else ""),
                    notification_type="commission",
                    reference_id=str(payment.id),
                )
        except Exception as e:
            logger.warning(f"Failed to notify technician: {e}")

        return {
            "id": str(payment.id),
            "status": payment.status,
            "message": f"Pago {'aprobado' if approved else 'rechazado'}",
        }

    # ──────────────────────────────────────────────────────────
    # 5. BLOCKING LOGIC
    # ──────────────────────────────────────────────────────────

    async def is_technician_blocked(
        self, session: Session, technician_id: str
    ) -> bool:
        """
        A technician is blocked if they have a pending CommissionPayment
        past its due_date that hasn't been submitted.
        """
        overdue = session.exec(
            select(CommissionPayment).where(
                CommissionPayment.technician_id == UUID(technician_id),
                CommissionPayment.status == CommissionPaymentStatus.pending,
                CommissionPayment.due_date <= datetime.utcnow(),
            )
        ).first()

        return overdue is not None

    # ──────────────────────────────────────────────────────────
    # 6. ADMIN: GLOBAL STATS
    # ──────────────────────────────────────────────────────────

    async def get_stats(self, session: Session) -> Dict[str, Any]:
        """Global commission statistics for admin dashboard."""
        total_pending = session.exec(
            select(func.coalesce(func.sum(CommissionLedger.commission_amount), 0))
            .where(CommissionLedger.status == CommissionStatus.pending)
        ).one()

        total_collected = session.exec(
            select(func.coalesce(func.sum(CommissionPayment.amount), 0))
            .where(CommissionPayment.status == CommissionPaymentStatus.approved)
        ).one()

        total_waived = session.exec(
            select(func.coalesce(func.sum(CommissionLedger.commission_amount), 0))
            .where(CommissionLedger.status == CommissionStatus.waived)
        ).one()

        blocked_count = session.exec(
            select(func.count()).select_from(
                select(CommissionPayment).where(
                    CommissionPayment.status == CommissionPaymentStatus.pending,
                    CommissionPayment.due_date <= datetime.utcnow(),
                ).subquery()
            )
        ).one()

        return {
            "total_pending": float(total_pending),
            "total_collected": float(total_collected),
            "total_waived": float(total_waived),
            "technicians_blocked": blocked_count,
            "commission_rate": f"{COMMISSION_RATE * 100:.0f}%",
            "free_services_per_tech": FREE_SERVICES_COUNT,
        }

    # ──────────────────────────────────────────────────────────
    # INTERNAL: Check if threshold reached → create payment request
    # ──────────────────────────────────────────────────────────

    async def _check_collection_threshold(
        self, session: Session, technician_id: UUID
    ):
        """
        After registering a commission, check if the technician has
        accumulated enough unpaid services to trigger a collection.
        """
        # Count pending commissions NOT yet in any payment request
        pending_entries = session.exec(
            select(CommissionLedger).where(
                CommissionLedger.technician_id == technician_id,
                CommissionLedger.status == CommissionStatus.pending,
                CommissionLedger.payment_id == None,  # noqa: E711
            )
        ).all()

        if len(pending_entries) < SERVICES_BEFORE_COLLECTION:
            return  # Not enough yet

        # Check if already has an active (pending/submitted) payment request
        active = session.exec(
            select(CommissionPayment).where(
                CommissionPayment.technician_id == technician_id,
                CommissionPayment.status.in_([
                    CommissionPaymentStatus.pending,
                    CommissionPaymentStatus.submitted,
                ]),
            )
        ).first()
        if active:
            return  # Already has one

        # Create payment request
        total_amount = sum(e.commission_amount for e in pending_entries)
        now = datetime.utcnow()

        payment_request = CommissionPayment(
            technician_id=technician_id,
            amount=total_amount,
            status=CommissionPaymentStatus.pending,
            notified_at=now,
            due_date=now + timedelta(hours=GRACE_PERIOD_HOURS),
        )
        session.add(payment_request)
        session.commit()
        session.refresh(payment_request)

        # Link ledger entries to this payment
        for entry in pending_entries:
            entry.payment_id = payment_request.id
            session.add(entry)
        session.commit()

        # Send push notification
        try:
            from app.services.notification_service import NotificationService
            await NotificationService.send_to_user(
                session=session,
                user_id=technician_id,
                title="💰 Comisión Pendiente",
                body=f"Tienes ${total_amount:,.0f} COP en comisiones pendientes. "
                     f"Consigna antes de {GRACE_PERIOD_HOURS}h para no ser bloqueado.",
                notification_type="commission",
                reference_id=str(payment_request.id),
            )
        except Exception as e:
            logger.warning(f"Failed to send commission notification: {e}")

        logger.info(
            f"Commission payment request created: tech={technician_id}, "
            f"amount=${total_amount:,.0f}, due={payment_request.due_date}"
        )


commission_service = CommissionService()
