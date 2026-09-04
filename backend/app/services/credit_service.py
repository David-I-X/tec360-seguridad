"""
Servicio de Créditos — Lógica de negocio para el sistema de comisiones.

Reglas:
- Comisión = 18% del valor del servicio
- Primeros 3 servicios completados son GRATIS
- Saldo mínimo = comisión de 1 servicio para poder aceptar
- Saldo 0 → técnico bloqueado hasta recargar
"""
import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.credit import (
    COMMISSION_RATE,
    FREE_SERVICES_LIMIT,
    CreditTransaction,
    CreditTransactionType,
    TechnicianCredit,
)

logger = logging.getLogger(__name__)


class CreditService:

    # ── Consultas ──────────────────────────────────────

    async def get_or_create_credit(
        self, session: Session, technician_id: str
    ) -> TechnicianCredit:
        """Obtiene o crea el registro de créditos de un técnico."""
        tech_uuid = UUID(technician_id)
        credit = session.exec(
            select(TechnicianCredit).where(
                TechnicianCredit.technician_id == tech_uuid
            )
        ).first()
        if not credit:
            credit = TechnicianCredit(technician_id=tech_uuid)
            session.add(credit)
            session.commit()
            session.refresh(credit)
        return credit

    async def get_balance(self, session: Session, technician_id: str) -> dict:
        """Retorna el saldo y estado del técnico."""
        credit = await self.get_or_create_credit(session, technician_id)
        free_remaining = max(0, FREE_SERVICES_LIMIT - credit.free_services_used)
        can_accept = credit.balance > 0 or free_remaining > 0

        return {
            "balance": credit.balance,
            "total_recharged": credit.total_recharged,
            "total_consumed": credit.total_consumed,
            "free_services_remaining": free_remaining,
            "can_accept_services": can_accept,
            "commission_rate": COMMISSION_RATE,
        }

    async def get_transactions(
        self,
        session: Session,
        technician_id: str,
        skip: int = 0,
        limit: int = 50,
    ) -> list[CreditTransaction]:
        """Historial de transacciones del técnico."""
        tech_uuid = UUID(technician_id)
        stmt = (
            select(CreditTransaction)
            .where(CreditTransaction.technician_id == tech_uuid)
            .order_by(CreditTransaction.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(session.exec(stmt).all())

    # ── Operaciones ────────────────────────────────────

    async def recharge(
        self,
        session: Session,
        technician_id: str,
        amount: float,
        external_reference: Optional[str] = None,
        description: str = "Recarga de créditos",
    ) -> CreditTransaction:
        """Recarga de créditos (desde Wompi o admin)."""
        if amount <= 0:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "El monto debe ser mayor a 0",
            )

        credit = await self.get_or_create_credit(session, technician_id)
        credit.balance += amount
        credit.total_recharged += amount
        credit.updated_at = datetime.utcnow()
        session.add(credit)

        txn = CreditTransaction(
            technician_id=UUID(technician_id),
            transaction_type=CreditTransactionType.recharge,
            amount=amount,
            balance_after=credit.balance,
            description=description,
            external_reference=external_reference,
        )
        session.add(txn)
        session.commit()
        session.refresh(txn)

        # Trigger cash flow entry in SaaS Vertical asynchronously (DIAN Concept 1061/2020)
        import asyncio
        from app.services.sas_service import record_recharge_income
        from app.core.database import engine
        from app.models.user import User
        from sqlmodel import Session as SqlSession

        async def _trigger_recharge_cashflow(tech_id_str, recharge_amount):
            try:
                with SqlSession(engine) as session_bg:
                    t_user = session_bg.get(User, UUID(tech_id_str))
                    t_name = t_user.full_name if t_user and t_user.full_name else f"ID #{tech_id_str[:8]}"
                    await record_recharge_income(
                        amount=recharge_amount,
                        technician_name=t_name,
                        technician_id=tech_id_str,
                    )
            except Exception as e:
                logger.error(f"Error recording recharge cashflow in SaaS: {e}")

        asyncio.create_task(_trigger_recharge_cashflow(technician_id, amount))

        return txn

    async def can_accept_service(
        self, session: Session, technician_id: str, service_amount: float
    ) -> dict:
        """
        Verifica si el técnico puede aceptar un servicio dado su saldo.
        Retorna: {can_accept, reason, commission, is_free}
        """
        credit = await self.get_or_create_credit(session, technician_id)
        free_remaining = max(0, FREE_SERVICES_LIMIT - credit.free_services_used)
        commission = round(service_amount * COMMISSION_RATE, 2)

        # Primeros 3 servicios son gratis
        if free_remaining > 0:
            return {
                "can_accept": True,
                "reason": f"Servicio gratis ({free_remaining} restantes)",
                "commission": 0,
                "is_free": True,
                "free_remaining": free_remaining,
            }

        # Verificar saldo suficiente
        if credit.balance >= commission:
            return {
                "can_accept": True,
                "reason": "Saldo suficiente",
                "commission": commission,
                "is_free": False,
                "balance": credit.balance,
            }

        return {
            "can_accept": False,
            "reason": f"Saldo insuficiente. Necesitas ${commission:,.0f} pero tienes ${credit.balance:,.0f}",
            "commission": commission,
            "is_free": False,
            "balance": credit.balance,
            "deficit": round(commission - credit.balance, 2),
        }

    async def deduct_for_service(
        self,
        session: Session,
        technician_id: str,
        service_id: str,
        service_amount: float,
    ) -> CreditTransaction:
        """
        Descuenta créditos al aceptar un servicio.
        Si es uno de los 3 gratis, registra pero no descuenta.
        """
        check = await self.can_accept_service(session, technician_id, service_amount)
        if not check["can_accept"]:
            raise HTTPException(
                status.HTTP_402_PAYMENT_REQUIRED,
                check["reason"],
            )

        credit = await self.get_or_create_credit(session, technician_id)

        if check["is_free"]:
            # Servicio gratis — no descontar pero registrar
            credit.free_services_used += 1
            credit.updated_at = datetime.utcnow()
            session.add(credit)

            txn = CreditTransaction(
                technician_id=UUID(technician_id),
                transaction_type=CreditTransactionType.free_service,
                amount=0,
                balance_after=credit.balance,
                service_id=UUID(service_id),
                description=f"Servicio gratis #{credit.free_services_used} de {FREE_SERVICES_LIMIT}",
            )
        else:
            # Descontar comisión
            commission = check["commission"]
            credit.balance -= commission
            credit.total_consumed += commission
            credit.updated_at = datetime.utcnow()
            session.add(credit)

            txn = CreditTransaction(
                technician_id=UUID(technician_id),
                transaction_type=CreditTransactionType.deduction,
                amount=-commission,
                balance_after=credit.balance,
                service_id=UUID(service_id),
                description=f"Comisión {COMMISSION_RATE*100:.0f}% de ${service_amount:,.0f}",
            )

        session.add(txn)
        session.commit()
        session.refresh(txn)
        return txn

    async def refund_for_service(
        self,
        session: Session,
        technician_id: str,
        service_id: str,
        reason: str = "Cancelación del cliente",
    ) -> Optional[CreditTransaction]:
        """
        Reembolsa créditos cuando el cliente cancela.
        Busca la transacción de descuento original y revierte.
        """
        # Buscar la deducción original
        original = session.exec(
            select(CreditTransaction).where(
                CreditTransaction.service_id == UUID(service_id),
                CreditTransaction.technician_id == UUID(technician_id),
                CreditTransaction.transaction_type.in_([
                    CreditTransactionType.deduction,
                    CreditTransactionType.free_service,
                ]),
            )
        ).first()

        if not original:
            return None

        # Si fue servicio gratis, revertir el contador
        credit = await self.get_or_create_credit(session, technician_id)

        if original.transaction_type == CreditTransactionType.free_service:
            credit.free_services_used = max(0, credit.free_services_used - 1)
            refund_amount = 0
        else:
            refund_amount = abs(original.amount)
            credit.balance += refund_amount
            credit.total_consumed -= refund_amount

        credit.updated_at = datetime.utcnow()
        session.add(credit)

        txn = CreditTransaction(
            technician_id=UUID(technician_id),
            transaction_type=CreditTransactionType.refund,
            amount=refund_amount,
            balance_after=credit.balance,
            service_id=UUID(service_id),
            description=reason,
        )
        session.add(txn)
        session.commit()
        session.refresh(txn)
        return txn


credit_service = CreditService()
