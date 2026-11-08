"""
API Endpoints para Cuentas Empresa / Talleres (Organizations & Sub-accounts).

Reglas de Negocio Confirmadas:
1. Opción A: Organización (`Organization`) con miembros (`OrganizationMember`: owner, manager, technician).
2. Billetera única compartida (`Organization.wallet_balance`) + cupos por técnico (`credit_quota` / `quota_used`).
3. Despacho configurable por taller (`dispatch_mode`: "manual" por defecto o "direct" alternable).
4. Bono de bienvenida único de $200.000 COP por Taller (los técnicos subcuenta no reciben bono individual).
5. Validación de cursos obligatorios permitida al dueño/manager del taller para sus técnicos.
6. El dueño (`owner`) es estrictamente administrativo y NO opera ni acepta servicios como técnico.
"""
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.api.courses import (
    get_technician_course_gate_status,
    grant_all_required_courses,
)
from app.core.auth_utils import create_access_token, create_refresh_token
from app.core.config import settings
from app.core.database import get_session
from app.api.auth import normalize_phone as normalize_phone_e164
from app.core.security import get_current_user
from app.models.credit import (
    WELCOME_BONUS_AMOUNT,
    CreditTransaction,
    CreditTransactionType,
    TechnicianCredit,
)
from app.models.dispatch import DispatchOffer, DispatchOfferStatus
from app.models.organization import (
    DispatchMode,
    Organization,
    OrganizationMember,
    OrgMemberStatus,
    OrgRole,
)
from app.models.service import Service, ServiceStatus
from app.models.technician import Technician
from app.models.user import User

router = APIRouter(prefix="/organizations", tags=["Organizations / Talleres"])


# ── Schemas ────────────────────────────────────────────


class OrganizationRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=160)
    nit: Optional[str] = Field(default=None, max_length=64)
    phone: Optional[str] = Field(default=None, max_length=32)
    email: Optional[str] = Field(default=None, max_length=255)
    address: Optional[str] = Field(default=None, max_length=255)
    city: str = Field(default="Medellín", max_length=100)
    dispatch_mode: DispatchMode = Field(default=DispatchMode.manual)


class OrganizationUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=160)
    nit: Optional[str] = Field(default=None, max_length=64)
    phone: Optional[str] = Field(default=None, max_length=32)
    email: Optional[str] = Field(default=None, max_length=255)
    address: Optional[str] = Field(default=None, max_length=255)
    city: Optional[str] = Field(default=None, max_length=100)
    dispatch_mode: Optional[DispatchMode] = None


class AddMemberRequest(BaseModel):
    phone: str = Field(..., min_length=7, max_length=32)
    full_name: str = Field(..., min_length=2, max_length=120)
    email: Optional[str] = Field(default=None, max_length=255)
    org_role: OrgRole = Field(default=OrgRole.technician)
    specializations: List[str] = Field(
        default_factory=lambda: ["gps_installation", "alarm_installation"]
    )
    credit_quota: Optional[float] = Field(default=None, ge=0.0)
    validate_courses_immediately: bool = Field(default=False)


class UpdateQuotaRequest(BaseModel):
    credit_quota: Optional[float] = Field(default=None, ge=0.0)
    reset_used: bool = Field(default=False)


class UpdateMemberStatusRequest(BaseModel):
    status: Optional[OrgMemberStatus] = None
    org_role: Optional[OrgRole] = None


class AssignServiceRequest(BaseModel):
    technician_user_id: str


class OrgWalletRechargeRequest(BaseModel):
    amount: float = Field(..., gt=0)
    payment_reference: Optional[str] = None


# ── Helpers ────────────────────────────────────────────


def create_organization_for_owner(
    session: Session,
    owner_user: User,
    name: str,
    nit: Optional[str] = None,
    phone: Optional[str] = None,
    email: Optional[str] = None,
    address: Optional[str] = None,
    city: str = "Medellín",
    dispatch_mode: str = DispatchMode.manual.value,
) -> Organization:
    """
    Crea una Organización (Taller) para `owner_user`:
    - Le asigna `role = "company_admin"` y `OrganizationMember(org_role="owner")`.
    - El dueño NO tiene perfil `Technician` (no trabaja como técnico).
    - Otorga un único bono de bienvenida de $200.000 COP al taller.
    """
    existing_org = session.exec(
        select(Organization).where(
            Organization.owner_id == owner_user.id,
            Organization.is_active == True,  # noqa: E712
        )
    ).first()
    if existing_org:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Ya eres titular del taller '{existing_org.name}'",
        )

    existing_membership = session.exec(
        select(OrganizationMember).where(
            OrganizationMember.user_id == owner_user.id,
            OrganizationMember.status == OrgMemberStatus.active.value,
        )
    ).first()
    if existing_membership:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Tu cuenta ya pertenece activamente a un taller registrado",
        )

    # El dueño es puramente administrativo ("El dueño también puede trabajar como técnico: no")
    owner_user.role = "company_admin"
    owner_user.updated_at = datetime.utcnow()
    session.add(owner_user)

    # Si por alguna razón tenía perfil Technician previo, deshabilitar disponibilidad
    owner_tech = session.exec(
        select(Technician).where(Technician.user_id == owner_user.id)
    ).first()
    if owner_tech:
        session.delete(owner_tech)

    org = Organization(
        name=name.strip(),
        nit=nit.strip() if nit else None,
        phone=phone or owner_user.phone,
        email=email or owner_user.email,
        address=address,
        city=city or "Medellín",
        owner_id=owner_user.id,
        dispatch_mode=dispatch_mode,
        is_verified=False,
        is_active=True,
        wallet_balance=WELCOME_BONUS_AMOUNT,
        total_recharged=WELCOME_BONUS_AMOUNT,
        total_consumed=0.0,
        welcome_bonus_granted=True,
    )
    session.add(org)
    session.flush()

    owner_member = OrganizationMember(
        organization_id=org.id,
        user_id=owner_user.id,
        org_role=OrgRole.owner.value,
        status=OrgMemberStatus.active.value,
        credit_quota=None,
        quota_used=0.0,
        invited_phone=owner_user.phone,
    )
    session.add(owner_member)

    bonus_txn = CreditTransaction(
        technician_id=owner_user.id,
        transaction_type=CreditTransactionType.bonus,
        amount=WELCOME_BONUS_AMOUNT,
        balance_after=WELCOME_BONUS_AMOUNT,
        description=f"¡Te regalamos $200.000 en créditos por bienvenida para el taller {org.name}!",
        external_reference=f"ORG_WELCOME:{org.id}",
    )
    session.add(bonus_txn)
    session.commit()
    session.refresh(org)
    return org


def _require_org_membership(
    session: Session,
    current_user: dict,
    allowed_roles: Optional[List[str]] = None,
) -> tuple[Organization, OrganizationMember]:
    user_uuid = UUID(str(current_user["id"]))
    member = session.exec(
        select(OrganizationMember).where(
            OrganizationMember.user_id == user_uuid,
            OrganizationMember.status == OrgMemberStatus.active.value,
        )
    ).first()
    if not member:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "No perteneces a ningún taller o cuenta empresa activa",
        )

    org = session.get(Organization, member.organization_id)
    if not org or not org.is_active:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "El taller asociado no existe o se encuentra inactivo",
        )

    if allowed_roles and member.org_role not in allowed_roles:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"Se requiere rol de {', '.join(allowed_roles)} en el taller para realizar esta acción",
        )
    return org, member


def _serialize_member(session: Session, member: OrganizationMember) -> dict:
    user = session.get(User, member.user_id)
    tech = session.exec(
        select(Technician).where(Technician.user_id == member.user_id)
    ).first()

    course_gate = (
        get_technician_course_gate_status(session, str(member.user_id))
        if member.org_role == OrgRole.technician.value
        else {"can_operate": False, "is_admin_validated": False, "completed_required": 0, "total_required": 0}
    )

    active_services_count = 0
    completed_services_count = 0
    if member.org_role == OrgRole.technician.value:
        active_services = session.exec(
            select(Service).where(
                Service.technician_id == member.user_id,
                Service.status.in_([
                    ServiceStatus.assigned,
                    ServiceStatus.en_route,
                    ServiceStatus.arrived,
                    ServiceStatus.in_progress,
                ]),
            )
        ).all()
        active_services_count = len(active_services)

        completed_services = session.exec(
            select(Service).where(
                Service.technician_id == member.user_id,
                Service.status.in_([ServiceStatus.completed, ServiceStatus.confirmed]),
            )
        ).all()
        completed_services_count = len(completed_services)

    quota_remaining = (
        max(0.0, round(member.credit_quota - member.quota_used, 2))
        if member.credit_quota is not None
        else None
    )

    return {
        "id": str(member.id),
        "organization_id": str(member.organization_id),
        "user_id": str(member.user_id),
        "full_name": user.full_name if user else "Sin nombre",
        "phone": user.phone if user else member.invited_phone,
        "email": user.email if user else None,
        "avatar_url": user.avatar_url if user else None,
        "org_role": member.org_role,
        "status": member.status,
        "credit_quota": member.credit_quota,
        "quota_used": member.quota_used,
        "quota_remaining": quota_remaining,
        "specializations": tech.specializations if tech and tech.specializations else [],
        "is_available": bool(tech.is_available) if tech else False,
        "is_verified": bool(tech.is_verified) if tech else False,
        "average_rating": float(tech.average_rating) if tech and tech.average_rating is not None else 5.0,
        "courses_validated": bool(course_gate.get("can_operate", False)),
        "is_admin_validated": bool(course_gate.get("is_admin_validated", False)),
        "completed_required_courses": course_gate.get("completed_required", 0),
        "total_required_courses": course_gate.get("total_required", 0),
        "active_services_count": active_services_count,
        "completed_services_count": completed_services_count,
        "created_at": member.created_at.isoformat() if member.created_at else None,
    }


# ── Endpoints ──────────────────────────────────────────


@router.get("/public-list")
async def list_public_organizations(
    session: Session = Depends(get_session),
):
    """
    Lista pública de organizaciones/talleres activos para que un técnico pueda
    vincularse opcionalmente durante el registro/onboarding.
    """
    orgs = session.exec(
        select(Organization)
        .where(Organization.is_active == True)  # noqa: E712
        .order_by(Organization.name.asc())
    ).all()
    return {
        "organizations": [
            {
                "id": str(o.id),
                "name": o.name,
                "city": o.city,
                "nit": o.nit,
            }
            for o in orgs
        ]
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_organization(
    payload: OrganizationRegisterRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Registra un nuevo Taller / Cuenta Empresa para el usuario autenticado.
    - Otorga 1 bono único de bienvenida de $200.000 COP a la billetera del taller.
    - El dueño queda con rol `company_admin` (no opera como técnico).
    """
    user = session.get(User, UUID(str(current_user["id"])))
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")

    org = create_organization_for_owner(
        session=session,
        owner_user=user,
        name=payload.name,
        nit=payload.nit,
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
        city=payload.city,
        dispatch_mode=payload.dispatch_mode.value,
    )

    access_token = create_access_token(
        subject=user.id,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        extra_claims={"role": user.role},
    )
    refresh_token = create_refresh_token(subject=user.id)

    return {
        "message": f"Taller '{org.name}' creado exitosamente con bono de bienvenida de $200.000 COP",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "organization": {
            "id": str(org.id),
            "name": org.name,
            "nit": org.nit,
            "city": org.city,
            "dispatch_mode": org.dispatch_mode,
            "wallet_balance": org.wallet_balance,
            "welcome_bonus_granted": org.welcome_bonus_granted,
            "owner_id": str(org.owner_id),
        },
    }


@router.get("/me")
async def get_my_organization(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Obtiene el detalle completo del taller, billetera compartida, miembros, cupos y métricas."""
    org, my_member = _require_org_membership(session, current_user)

    members = session.exec(
        select(OrganizationMember)
        .where(OrganizationMember.organization_id == org.id)
        .order_by(OrganizationMember.created_at.asc())
    ).all()

    serialized_members = [_serialize_member(session, m) for m in members]
    tech_members = [m for m in serialized_members if m["org_role"] == OrgRole.technician.value]

    total_quota_assigned = sum(
        float(m["credit_quota"]) for m in tech_members if m["credit_quota"] is not None
    )
    total_quota_used = sum(float(m["quota_used"]) for m in tech_members)

    return {
        "id": str(org.id),
        "name": org.name,
        "nit": org.nit,
        "phone": org.phone,
        "email": org.email,
        "address": org.address,
        "city": org.city,
        "logo_url": org.logo_url,
        "owner_id": str(org.owner_id),
        "dispatch_mode": org.dispatch_mode,
        "is_verified": org.is_verified,
        "is_active": org.is_active,
        "wallet": {
            "balance": org.wallet_balance,
            "total_recharged": org.total_recharged,
            "total_consumed": org.total_consumed,
            "welcome_bonus_granted": org.welcome_bonus_granted,
            "welcome_bonus_amount": WELCOME_BONUS_AMOUNT,
            "total_quota_assigned": total_quota_assigned,
            "total_quota_used": total_quota_used,
        },
        "my_membership": {
            "member_id": str(my_member.id),
            "org_role": my_member.org_role,
            "status": my_member.status,
            "credit_quota": my_member.credit_quota,
            "quota_used": my_member.quota_used,
        },
        "metrics": {
            "total_members": len(serialized_members),
            "total_technicians": len(tech_members),
            "available_technicians": sum(1 for t in tech_members if t["is_available"] and t["status"] == "active"),
            "validated_technicians": sum(1 for t in tech_members if t["courses_validated"]),
            "active_services": sum(int(t["active_services_count"]) for t in tech_members),
            "completed_services": sum(int(t["completed_services_count"]) for t in tech_members),
        },
        "members": serialized_members,
    }


@router.put("/me")
async def update_my_organization(
    payload: OrganizationUpdateRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Actualiza datos del taller o alterna el modo de despacho (`manual` vs `direct`)."""
    org, _ = _require_org_membership(
        session, current_user, allowed_roles=[OrgRole.owner.value, OrgRole.manager.value]
    )

    if payload.name is not None:
        org.name = payload.name.strip()
    if payload.nit is not None:
        org.nit = payload.nit.strip()
    if payload.phone is not None:
        org.phone = payload.phone.strip()
    if payload.email is not None:
        org.email = payload.email.strip()
    if payload.address is not None:
        org.address = payload.address.strip()
    if payload.city is not None:
        org.city = payload.city.strip()
    if payload.dispatch_mode is not None:
        org.dispatch_mode = payload.dispatch_mode.value

    org.updated_at = datetime.utcnow()
    session.add(org)
    session.commit()
    session.refresh(org)

    return {
        "message": "Configuración del taller actualizada exitosamente",
        "id": str(org.id),
        "name": org.name,
        "nit": org.nit,
        "city": org.city,
        "dispatch_mode": org.dispatch_mode,
    }


@router.post("/me/members", status_code=status.HTTP_201_CREATED)
async def add_organization_member(
    payload: AddMemberRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Agrega una subcuenta de técnico (o manager) al taller.
    - NO otorga bono individual de $200.000 COP al técnico (usa la billetera compartida del taller).
    - Permite asignar un cupo de créditos (`credit_quota`) desde su creación.
    - Permite validar sus cursos obligatorios de inmediato si el dueño lo indica.
    """
    org, _ = _require_org_membership(
        session, current_user, allowed_roles=[OrgRole.owner.value, OrgRole.manager.value]
    )

    if payload.org_role == OrgRole.owner:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Solo puede existir un dueño (owner) principal por taller",
        )

    normalized_phone = normalize_phone_e164(payload.phone)
    user = session.exec(select(User).where(User.phone == normalized_phone)).first()

    if user:
        existing_member = session.exec(
            select(OrganizationMember).where(
                OrganizationMember.user_id == user.id,
                OrganizationMember.status == OrgMemberStatus.active.value,
            )
        ).first()
        if existing_member:
            if existing_member.organization_id == org.id:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    "Este usuario ya es miembro activo de tu taller",
                )
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Este número telefónico ya pertenece a otro taller registrado",
            )
        user.full_name = payload.full_name.strip()
        if payload.org_role == OrgRole.technician:
            user.role = "technician"
        user.is_active = True
        session.add(user)
    else:
        email = (
            payload.email.strip()
            if payload.email
            else f"tech_{normalized_phone.replace('+', '')}_{uuid4().hex[:6]}@taller.tec360.co"
        )
        user = User(
            email=email,
            phone=normalized_phone,
            full_name=payload.full_name.strip(),
            hashed_password="firebase_phone_auth_only",
            role="technician" if payload.org_role == OrgRole.technician else "company_admin",
            is_active=True,
        )
        session.add(user)
        session.flush()

    # 1. Crear membresía ANTES de inicializar créditos para que no reciba bono individual de $200.000
    member = OrganizationMember(
        organization_id=org.id,
        user_id=user.id,
        org_role=payload.org_role.value,
        status=OrgMemberStatus.active.value,
        credit_quota=payload.credit_quota,
        quota_used=0.0,
        invited_phone=normalized_phone,
    )
    session.add(member)
    session.flush()

    # 2. Si es técnico, crear/actualizar perfil Technician y registro TechnicianCredit con balance 0
    if payload.org_role == OrgRole.technician:
        tech = session.exec(
            select(Technician).where(Technician.user_id == user.id)
        ).first()
        if not tech:
            tech = Technician(
                user_id=user.id,
                specializations=payload.specializations or ["gps_installation"],
                experience_years=1,
                bio=f"Técnico miembro del taller {org.name}",
                city=org.city,
                is_available=True,
                is_verified=payload.validate_courses_immediately,
                verification_status="approved" if payload.validate_courses_immediately else "unverified",
            )
            session.add(tech)
        else:
            if payload.specializations:
                tech.specializations = payload.specializations
            if payload.validate_courses_immediately:
                tech.is_verified = True
                tech.verification_status = "approved"
            session.add(tech)

        # Asegurar registro TechnicianCredit en 0 (sin bono individual duplicado)
        tech_credit = session.exec(
            select(TechnicianCredit).where(TechnicianCredit.technician_id == user.id)
        ).first()
        if not tech_credit:
            tech_credit = TechnicianCredit(
                technician_id=user.id,
                balance=0.0,
                total_recharged=0.0,
                total_consumed=0.0,
            )
            session.add(tech_credit)
        elif tech_credit.total_consumed == 0 and tech_credit.balance == WELCOME_BONUS_AMOUNT:
            # Si tenía un bono individual sin usar antes de ser vinculado al taller, neutralizarlo
            tech_credit.balance = 0.0
            tech_credit.total_recharged = 0.0
            session.add(tech_credit)

        if payload.validate_courses_immediately:
            grant_all_required_courses(session, user.id)

    session.commit()
    session.refresh(member)

    return {
        "message": f"Miembro '{user.full_name}' agregado exitosamente al taller {org.name}",
        "member": _serialize_member(session, member),
    }


@router.put("/me/members/{member_id}/quota")
async def update_member_quota(
    member_id: UUID,
    payload: UpdateQuotaRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Asigna o modifica el cupo específico de créditos (`credit_quota`) de un técnico del taller.
    `credit_quota = None` significa que puede usar el saldo general del taller sin tope individual.
    """
    org, _ = _require_org_membership(
        session, current_user, allowed_roles=[OrgRole.owner.value, OrgRole.manager.value]
    )

    member = session.get(OrganizationMember, member_id)
    if not member or member.organization_id != org.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Miembro no encontrado en tu taller")

    if member.org_role == OrgRole.owner.value:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "El dueño del taller no opera como técnico ni utiliza cupo de técnico",
        )

    member.credit_quota = payload.credit_quota
    if payload.reset_used:
        member.quota_used = 0.0
    member.updated_at = datetime.utcnow()
    session.add(member)
    session.commit()
    session.refresh(member)

    return {
        "message": "Cupo de créditos actualizado exitosamente",
        "member": _serialize_member(session, member),
    }


@router.put("/me/members/{member_id}/status")
async def update_member_status(
    member_id: UUID,
    payload: UpdateMemberStatusRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Suspende/reactiva un miembro o cambia su rol entre `technician` y `manager`."""
    org, _ = _require_org_membership(
        session, current_user, allowed_roles=[OrgRole.owner.value, OrgRole.manager.value]
    )

    member = session.get(OrganizationMember, member_id)
    if not member or member.organization_id != org.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Miembro no encontrado en tu taller")

    if member.org_role == OrgRole.owner.value:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "No se puede alterar el estado ni el rol del dueño del taller",
        )

    if payload.status is not None:
        member.status = payload.status.value
    if payload.org_role is not None:
        if payload.org_role == OrgRole.owner:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puedes asignar otro owner")
        member.org_role = payload.org_role.value

    member.updated_at = datetime.utcnow()
    session.add(member)
    session.commit()
    session.refresh(member)

    return {
        "message": "Estado del miembro actualizado",
        "member": _serialize_member(session, member),
    }


@router.delete("/me/members/{member_id}")
async def remove_organization_member(
    member_id: UUID,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Desvincula a un técnico o manager del taller."""
    org, _ = _require_org_membership(
        session, current_user, allowed_roles=[OrgRole.owner.value]
    )

    member = session.get(OrganizationMember, member_id)
    if not member or member.organization_id != org.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Miembro no encontrado en tu taller")

    if member.org_role == OrgRole.owner.value:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "No puedes eliminar al dueño principal del taller",
        )

    session.delete(member)
    session.commit()
    return {"message": "Miembro desvinculado del taller exitosamente"}


@router.post("/me/members/{member_id}/validate-courses")
async def validate_member_courses_by_workshop(
    member_id: UUID,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Permite al dueño (`owner`) o `manager` del taller dar por cursados y aprobados
    todos los cursos obligatorios de Escuela Tec360 para un técnico de su taller.
    """
    org, _ = _require_org_membership(
        session, current_user, allowed_roles=[OrgRole.owner.value, OrgRole.manager.value]
    )

    member = session.get(OrganizationMember, member_id)
    if not member or member.organization_id != org.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Miembro no encontrado en tu taller")

    if member.org_role != OrgRole.technician.value:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Solo se pueden validar cursos operativos a miembros con rol de técnico",
        )

    tech = session.exec(
        select(Technician).where(Technician.user_id == member.user_id)
    ).first()
    if tech:
        tech.is_verified = True
        tech.verification_status = "approved"
        tech.updated_at = datetime.utcnow()
        session.add(tech)

    courses_granted = grant_all_required_courses(session, member.user_id)
    session.commit()

    return {
        "message": f"Cursos validados exitosamente por el taller ({courses_granted} cursos obligatorios aprobados).",
        "courses_granted": courses_granted,
        "member": _serialize_member(session, member),
    }


@router.post("/me/wallet/recharge")
async def recharge_organization_wallet(
    payload: OrgWalletRechargeRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Recarga la billetera compartida del taller."""
    org, _ = _require_org_membership(
        session, current_user, allowed_roles=[OrgRole.owner.value, OrgRole.manager.value]
    )

    org.wallet_balance = round(org.wallet_balance + payload.amount, 2)
    org.total_recharged = round(org.total_recharged + payload.amount, 2)
    org.updated_at = datetime.utcnow()
    session.add(org)

    txn = CreditTransaction(
        technician_id=org.owner_id,
        transaction_type=CreditTransactionType.recharge,
        amount=payload.amount,
        balance_after=org.wallet_balance,
        description=f"Recarga billetera Taller {org.name}",
        external_reference=payload.payment_reference or f"ORG_RECHARGE:{org.id}",
    )
    session.add(txn)
    session.commit()
    session.refresh(org)

    return {
        "message": f"Billetera del taller recargada con ${payload.amount:,.0f} COP",
        "wallet_balance": org.wallet_balance,
        "total_recharged": org.total_recharged,
    }


@router.get("/me/services")
async def get_organization_services(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Lista:
    1. `available_services`: Servicios pendientes/cotizados disponibles para que el taller los asigne a sus técnicos.
    2. `team_services`: Servicios activos o completados asignados a cualquiera de los técnicos del taller.
    """
    org, _ = _require_org_membership(
        session, current_user, allowed_roles=[OrgRole.owner.value, OrgRole.manager.value]
    )

    tech_members = session.exec(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.org_role == OrgRole.technician.value,
            OrganizationMember.status == OrgMemberStatus.active.value,
        )
    ).all()
    tech_user_ids = [m.user_id for m in tech_members]

    # Servicios disponibles (pending / quoted sin técnico asignado)
    available_stmt = (
        select(Service)
        .where(
            Service.status.in_([ServiceStatus.pending, ServiceStatus.quoted]),
            Service.technician_id == None,  # noqa: E711
        )
        .order_by(Service.created_at.desc())
        .limit(50)
    )
    available_raw = session.exec(available_stmt).all()

    available_services = []
    for s in available_raw:
        available_services.append({
            "id": str(s.id),
            "title": s.title,
            "description": s.description,
            "service_type": s.service_type,
            "status": s.status,
            "service_address": s.service_address,
            "service_city": getattr(s, "service_city", org.city),
            "estimated_price": s.estimated_price,
            "vehicle_type": s.vehicle_type,
            "vehicle_model": s.vehicle_model,
            "vehicle_plate": s.vehicle_plate,
            "scheduled_date": s.scheduled_date.isoformat() if s.scheduled_date else None,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        })

    team_services = []
    if tech_user_ids:
        team_stmt = (
            select(Service)
            .where(Service.technician_id.in_(tech_user_ids))
            .order_by(Service.updated_at.desc())
            .limit(50)
        )
        team_raw = session.exec(team_stmt).all()
        user_map = {
            u.id: u.full_name
            for u in session.exec(select(User).where(User.id.in_(tech_user_ids))).all()
        }
        for s in team_raw:
            team_services.append({
                "id": str(s.id),
                "title": s.title,
                "service_type": s.service_type,
                "status": s.status,
                "service_address": s.service_address,
                "estimated_price": s.estimated_price,
                "final_price": getattr(s, "final_price", None),
                "technician_id": str(s.technician_id) if s.technician_id else None,
                "technician_name": user_map.get(s.technician_id, "Técnico"),
                "scheduled_date": s.scheduled_date.isoformat() if s.scheduled_date else None,
                "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            })

    return {
        "dispatch_mode": org.dispatch_mode,
        "available_services": available_services,
        "team_services": team_services,
    }


@router.post("/me/services/{service_id}/assign")
async def assign_service_to_member_technician(
    service_id: str,
    payload: AssignServiceRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Permite al dueño (`owner`) o `manager` del taller asignar un servicio disponible
    (o aceptar una oferta de despacho activa) en nombre de uno de sus técnicos miembros.
    - Verifica que el destinatario sea un técnico activo del taller (NO el dueño).
    - Descuenta la comisión de la billetera compartida del taller y del cupo asignado al técnico.
    """
    org, _ = _require_org_membership(
        session, current_user, allowed_roles=[OrgRole.owner.value, OrgRole.manager.value]
    )

    try:
        tech_uuid = UUID(str(payload.technician_user_id))
        svc_uuid = UUID(str(service_id))
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID inválido")

    target_member = session.exec(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == org.id,
            OrganizationMember.user_id == tech_uuid,
            OrganizationMember.status == OrgMemberStatus.active.value,
        )
    ).first()

    if not target_member:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "El técnico seleccionado no es un miembro activo de tu taller",
        )

    if target_member.org_role == OrgRole.owner.value:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "OWNER_CANNOT_OPERATE: El dueño del taller no puede asignarse servicios a sí mismo como técnico.",
        )

    if target_member.org_role != OrgRole.technician.value:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Solo puedes asignar servicios a miembros con rol de técnico",
        )

    # Si existe una DispatchOffer activa para este servicio y técnico, aceptarla vía dispatch_service
    active_offer = session.exec(
        select(DispatchOffer).where(
            DispatchOffer.service_id == svc_uuid,
            DispatchOffer.technician_id == tech_uuid,
            DispatchOffer.status == DispatchOfferStatus.offered,
        )
    ).first()

    if active_offer and active_offer.expires_at >= datetime.utcnow():
        from app.services.dispatch_service import dispatch_service

        offer_res = await dispatch_service.accept_offer(
            session=session,
            offer_id=str(active_offer.id),
            technician_id=str(tech_uuid),
            assigned_by_org=True,
        )
        return {
            "message": "Oferta aceptada y servicio asignado exitosamente al técnico del taller",
            "service_id": str(offer_res.service_id),
            "technician_id": str(tech_uuid),
            "status": "assigned",
        }

    # De lo contrario, asignación directa vía service_service
    from app.services.service_service import service_service

    svc_res = await service_service.accept_service(
        session=session,
        service_id=str(svc_uuid),
        technician_id=str(tech_uuid),
        user_role="technician",
        assigned_by_org=True,
    )
    return {
        "message": "Servicio asignado exitosamente al técnico del taller",
        "service_id": str(svc_res.id),
        "technician_id": str(tech_uuid),
        "status": svc_res.status,
    }
