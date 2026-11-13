"""
Servicio de Créditos — Lógica de negocio para el sistema de comisiones.

Reglas:
- Comisión = 12% del valor del servicio
- Técnicos independientes: Bono único de bienvenida de $200.000 COP
- Talleres / Cuentas Empresa (Organization):
  * Un único bono de bienvenida de $200.000 COP por Taller (no por técnico subcuenta).
  * Billetera única compartida (`Organization.wallet_balance`).
  * Cupos individuales configurables por técnico (`OrganizationMember.credit_quota` / `quota_used`).
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
    WELCOME_BONUS_AMOUNT,
    WELCOME_BONUS_REFERENCE,
    CreditTransaction,
    CreditTransactionType,
    TechnicianCredit,
)
from app.models.organization import (
    Organization,
    OrganizationMember,
    OrgMemberStatus,
)

logger = logging.getLogger(__name__)


class CreditService:

    # ── Helpers de Organización / Taller ───────────────

    def get_active_org_membership(
        self, session: Session, technician_id: str
    ) -> Optional[tuple[Organization, OrganizationMember]]:
        """
        Si el usuario/técnico pertenece como miembro activo a un Taller (Organization) activo,
        retorna (Organization, OrganizationMember). De lo contrario retorna None.
        """
        tech_uuid = UUID(str(technician_id))
        member = session.exec(
            select(OrganizationMember).where(
                OrganizationMember.user_id == tech_uuid,
                OrganizationMember.status == OrgMemberStatus.active.value,
            )
        ).first()
        if not member:
            return None

        org = session.get(Organization, member.organization_id)
        if not org or not org.is_active:
            return None

        return org, member

    # ── Consultas ──────────────────────────────────────

    async def get_or_create_credit(
        self,
        session: Session,
        technician_id: str,
        grant_welcome_bonus: bool = True,
    ) -> TechnicianCredit:
        """
        Obtiene o crea el registro de créditos de un técnico.
        Si el técnico pertenece a un Taller (Organization) o `grant_welcome_bonus=False`,
        NO se otorga un bono individual de $200.000 COP (el bono es único por Taller).
        """
        tech_uuid = UUID(str(technician_id))
        org_membership = self.get_active_org_membership(session, technician_id)
        should_grant_bonus = grant_welcome_bonus and (org_membership is None)

        credit = session.exec(
            select(TechnicianCredit).where(
                TechnicianCredit.technician_id == tech_uuid
            )
        ).first()
        if not credit:
            initial_amount = WELCOME_BONUS_AMOUNT if should_grant_bonus else 0.0
            credit = TechnicianCredit(
                technician_id=tech_uuid,
                balance=initial_amount,
                total_recharged=initial_amount,
            )
            session.add(credit)
            if should_grant_bonus:
                bonus_txn = CreditTransaction(
                    technician_id=tech_uuid,
                    transaction_type=CreditTransactionType.bonus,
                    amount=WELCOME_BONUS_AMOUNT,
                    balance_after=WELCOME_BONUS_AMOUNT,
                    description="¡Te regalamos $200.000 en créditos por bienvenida!",
                    external_reference=WELCOME_BONUS_REFERENCE,
                )
                session.add(bonus_txn)
            session.commit()
            session.refresh(credit)
        elif should_grant_bonus and credit.total_recharged == 0 and credit.balance == 0:
            has_bonus = session.exec(
                select(CreditTransaction).where(
                    CreditTransaction.technician_id == tech_uuid,
                    CreditTransaction.external_reference == WELCOME_BONUS_REFERENCE,
                )
            ).first()
            if not has_bonus:
                credit.balance += WELCOME_BONUS_AMOUNT
                credit.total_recharged += WELCOME_BONUS_AMOUNT
                credit.updated_at = datetime.utcnow()
                session.add(credit)
                bonus_txn = CreditTransaction(
                    technician_id=tech_uuid,
                    transaction_type=CreditTransactionType.bonus,
                    amount=WELCOME_BONUS_AMOUNT,
                    balance_after=credit.balance,
                    description="¡Te regalamos $200.000 en créditos por bienvenida!",
                    external_reference=WELCOME_BONUS_REFERENCE,
                )
                session.add(bonus_txn)
                session.commit()
                session.refresh(credit)
        return credit

    async def get_balance(self, session: Session, technician_id: str) -> dict:
        """Retorna el saldo y estado del técnico (individual o de Taller con cupo)."""
        org_membership = self.get_active_org_membership(session, technician_id)
        if org_membership:
            org, member = org_membership
            if member.credit_quota is not None:
                quota_remaining = max(0.0, round(member.credit_quota - member.quota_used, 2))
                effective_balance = min(org.wallet_balance, quota_remaining)
            else:
                quota_remaining = None
                effective_balance = org.wallet_balance

            return {
                "balance": effective_balance,
                "total_recharged": org.total_recharged,
                "total_consumed": member.quota_used,
                "free_services_remaining": 0,
                "can_accept_services": effective_balance > 0,
                "commission_rate": COMMISSION_RATE,
                "welcome_bonus_granted": org.welcome_bonus_granted,
                "welcome_bonus_amount": WELCOME_BONUS_AMOUNT,
                "is_organization_wallet": True,
                "organization_id": str(org.id),
                "organization_name": org.name,
                "org_wallet_balance": org.wallet_balance,
                "credit_quota": member.credit_quota,
                "quota_used": member.quota_used,
                "quota_remaining": quota_remaining,
                "dispatch_mode": org.dispatch_mode,
            }

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
            "welcome_bonus_granted": True,
            "welcome_bonus_amount": WELCOME_BONUS_AMOUNT,
            "is_organization_wallet": False,
        }

    async def get_transactions(
        self,
        session: Session,
        technician_id: str,
        skip: int = 0,
        limit: int = 50,
    ) -> list[CreditTransaction]:
        """Historial de transacciones del técnico."""
        tech_uuid = UUID(str(technician_id))
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
        commit: bool = True,
    ) -> CreditTransaction:
        """Recarga de créditos (desde Wompi o admin) con bloqueo de fila anti-race."""
        if amount <= 0:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "El monto debe ser mayor a 0",
            )

        from app.models.organization import Organization

        org_membership = self.get_active_org_membership(session, technician_id)
        if org_membership:
            org_ref, _ = org_membership
            org = (
                session.exec(
                    select(Organization).where(Organization.id == org_ref.id).with_for_update()
                ).first()
                or org_ref
            )
            org.wallet_balance = round(org.wallet_balance + amount, 2)
            org.total_recharged = round(org.total_recharged + amount, 2)
            org.updated_at = datetime.utcnow()
            session.add(org)

            txn = CreditTransaction(
                technician_id=UUID(str(technician_id)),
                transaction_type=CreditTransactionType.recharge,
                amount=amount,
                balance_after=org.wallet_balance,
                description=f"[Taller: {org.name}] {description}",
                external_reference=external_reference or f"ORG:{org.id}",
            )
            session.add(txn)
            if commit:
                session.commit()
                session.refresh(txn)
            else:
                session.flush()
            return txn

        credit = await self.get_or_create_credit(session, technician_id)
        locked_credit = session.exec(
            select(TechnicianCredit).where(TechnicianCredit.id == credit.id).with_for_update()
        ).first()
        if locked_credit is not None:
            credit = locked_credit
        credit.balance = round(credit.balance + amount, 2)
        credit.total_recharged = round(credit.total_recharged + amount, 2)
        credit.updated_at = datetime.utcnow()
        session.add(credit)

        txn = CreditTransaction(
            technician_id=UUID(str(technician_id)),
            transaction_type=CreditTransactionType.recharge,
            amount=amount,
            balance_after=credit.balance,
            description=description,
            external_reference=external_reference,
        )
        session.add(txn)
        if commit:
            session.commit()
            session.refresh(txn)
        else:
            session.flush()
            return txn

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
        Verifica si el técnico puede aceptar un servicio dado su saldo (o el saldo y cupo de su Taller).
        Retorna: {can_accept, reason, commission, is_free}
        """
        commission = round(service_amount * COMMISSION_RATE, 2)

        org_membership = self.get_active_org_membership(session, technician_id)
        if org_membership:
            org, member = org_membership
            if org.wallet_balance < commission:
                return {
                    "can_accept": False,
                    "reason": (
                        f"Saldo insuficiente en la billetera del taller ({org.name}). "
                        f"Se requieren ${commission:,.0f} pero el taller tiene ${org.wallet_balance:,.0f}"
                    ),
                    "commission": commission,
                    "is_free": False,
                    "balance": org.wallet_balance,
                    "deficit": round(commission - org.wallet_balance, 2),
                    "is_organization_wallet": True,
                }

            if member.credit_quota is not None:
                quota_remaining = max(0.0, round(member.credit_quota - member.quota_used, 2))
                if quota_remaining < commission:
                    return {
                        "can_accept": False,
                        "reason": (
                            f"Cupo individual insuficiente en el taller ({org.name}). "
                            f"Necesitas ${commission:,.0f} pero tu cupo disponible es ${quota_remaining:,.0f} "
                            f"(Cupo asignado: ${member.credit_quota:,.0f})"
                        ),
                        "commission": commission,
                        "is_free": False,
                        "balance": quota_remaining,
                        "deficit": round(commission - quota_remaining, 2),
                        "is_organization_wallet": True,
                    }
                effective_balance = min(org.wallet_balance, quota_remaining)
            else:
                effective_balance = org.wallet_balance

            return {
                "can_accept": True,
                "reason": f"Saldo y cupo disponibles en taller {org.name}",
                "commission": commission,
                "is_free": False,
                "balance": effective_balance,
                "is_organization_wallet": True,
            }

        credit = await self.get_or_create_credit(session, technician_id)
        free_remaining = max(0, FREE_SERVICES_LIMIT - credit.free_services_used)

        # Primeros servicios gratis (si aplica)
        if free_remaining > 0:
            return {
                "can_accept": True,
                "reason": f"Servicio gratis ({free_remaining} restantes)",
                "commission": 0,
                "is_free": True,
                "free_remaining": free_remaining,
                "is_organization_wallet": False,
            }

        # Verificar saldo suficiente
        if credit.balance >= commission:
            return {
                "can_accept": True,
                "reason": "Saldo suficiente",
                "commission": commission,
                "is_free": False,
                "balance": credit.balance,
                "is_organization_wallet": False,
            }

        return {
            "can_accept": False,
            "reason": f"Saldo insuficiente. Necesitas ${commission:,.0f} pero tienes ${credit.balance:,.0f}",
            "commission": commission,
            "is_free": False,
            "balance": credit.balance,
            "deficit": round(commission - credit.balance, 2),
            "is_organization_wallet": False,
        }

    async def deduct_for_service(
        self,
        session: Session,
        technician_id: str,
        service_id: str,
        service_amount: float,
    ) -> CreditTransaction:
        """
        Descuenta créditos al aceptar un servicio (de la billetera individual o de la billetera compartida del Taller + cupo del técnico).
        """
        check = await self.can_accept_service(session, technician_id, service_amount)
        if not check["can_accept"]:
            raise HTTPException(
                status.HTTP_402_PAYMENT_REQUIRED,
                check["reason"],
            )

        org_membership = self.get_active_org_membership(session, technician_id)
        if org_membership:
            org, member = org_membership
            commission = check["commission"]
            org.wallet_balance = round(org.wallet_balance - commission, 2)
            org.total_consumed = round(org.total_consumed + commission, 2)
            org.updated_at = datetime.utcnow()
            member.quota_used = round(member.quota_used + commission, 2)
            member.updated_at = datetime.utcnow()
            session.add(org)
            session.add(member)

            txn = CreditTransaction(
                technician_id=UUID(str(technician_id)),
                transaction_type=CreditTransactionType.deduction,
                amount=-commission,
                balance_after=org.wallet_balance,
                service_id=UUID(str(service_id)),
                description=f"[Taller: {org.name}] Comisión {COMMISSION_RATE*100:.0f}% de ${service_amount:,.0f}",
                external_reference=f"ORG:{org.id}",
            )
            session.add(txn)
            session.commit()
            session.refresh(txn)
            return txn

        credit = await self.get_or_create_credit(session, technician_id)

        if check["is_free"]:
            # Servicio gratis — no descontar pero registrar
            credit.free_services_used += 1
            credit.updated_at = datetime.utcnow()
            session.add(credit)

            txn = CreditTransaction(
                technician_id=UUID(str(technician_id)),
                transaction_type=CreditTransactionType.free_service,
                amount=0,
                balance_after=credit.balance,
                service_id=UUID(str(service_id)),
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
                technician_id=UUID(str(technician_id)),
                transaction_type=CreditTransactionType.deduction,
                amount=-commission,
                balance_after=credit.balance,
                service_id=UUID(str(service_id)),
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
        Busca la transacción de descuento original y revierte (en billetera individual o en billetera del Taller + cupo).
        """
        original = session.exec(
            select(CreditTransaction).where(
                CreditTransaction.service_id == UUID(str(service_id)),
                CreditTransaction.technician_id == UUID(str(technician_id)),
                CreditTransaction.transaction_type.in_([
                    CreditTransactionType.deduction,
                    CreditTransactionType.free_service,
                ]),
            )
        ).first()

        if not original:
            return None

        org_membership = self.get_active_org_membership(session, technician_id)
        if org_membership:
            org, member = org_membership
            refund_amount = abs(original.amount)
            org.wallet_balance = round(org.wallet_balance + refund_amount, 2)
            org.total_consumed = max(0.0, round(org.total_consumed - refund_amount, 2))
            org.updated_at = datetime.utcnow()
            member.quota_used = max(0.0, round(member.quota_used - refund_amount, 2))
            member.updated_at = datetime.utcnow()
            session.add(org)
            session.add(member)

            txn = CreditTransaction(
                technician_id=UUID(str(technician_id)),
                transaction_type=CreditTransactionType.refund,
                amount=refund_amount,
                balance_after=org.wallet_balance,
                service_id=UUID(str(service_id)),
                description=f"[Taller: {org.name}] {reason}",
                external_reference=f"ORG:{org.id}",
            )
            session.add(txn)
            session.commit()
            session.refresh(txn)
            return txn

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
            technician_id=UUID(str(technician_id)),
            transaction_type=CreditTransactionType.refund,
            amount=refund_amount,
            balance_after=credit.balance,
            service_id=UUID(str(service_id)),
            description=reason,
        )
        session.add(txn)
        session.commit()
        session.refresh(txn)
        return txn


credit_service = CreditService()
