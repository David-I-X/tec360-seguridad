import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import String, cast, text
from sqlmodel import Session, func, or_, select

from app.core.database import get_session
from app.core.security import require_roles
from app.models.organization import Organization, OrganizationMember, OrgMemberStatus, OrgRole
from app.models.service import Service, ServiceStatus
from app.models.technician import Technician, calculate_rank_points, ensure_technician_profile
from app.models.user import User
from app.models.verification import DocumentStatus, TechnicianDocument
from app.services.sas_service import get_accounting_dashboard

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

# --- Admin User Management ---

class AdminUserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    phone: Optional[str]
    role: str
    is_active: bool
    created_at: datetime
    avatar_url: Optional[str]

    # Technician specific
    sena_certification_number: Optional[str] = None
    is_verified: Optional[bool] = None
    rank: Optional[str] = None
    total_services: Optional[int] = None
    average_rating: Optional[float] = None

    # Organization / Workshop specific
    organization_id: Optional[str] = None
    organization_name: Optional[str] = None
    org_role: Optional[str] = None

@router.get("/users", summary="List all users", response_model=dict)
async def list_users(
    skip: int = 0,
    limit: int = 50,
    role: Optional[str] = None,
    search: Optional[str] = Query(None, description="Buscar por nombre, email o teléfono"),
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session)
):
    query = select(User)
    if role:
        query = query.where(User.role == role)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                User.full_name.ilike(pattern),
                User.email.ilike(pattern),
                User.phone.ilike(pattern),
            )
        )
        
    total = session.exec(select(func.count()).select_from(query.subquery())).one()
    users = session.exec(query.order_by(User.created_at.desc()).offset(skip).limit(limit)).all()

    user_ids = [u.id for u in users]
    tech_map: dict = {}
    member_map: dict = {}
    owned_org_map: dict = {}
    org_by_id: dict = {}
    provisioned_missing_tech = False

    if user_ids:
        for t in session.exec(select(Technician).where(Technician.user_id.in_(user_ids))).all():
            tech_map[t.user_id] = t

        active_members = session.exec(
            select(OrganizationMember).where(
                OrganizationMember.user_id.in_(user_ids),
                OrganizationMember.status == OrgMemberStatus.active.value,
            )
        ).all()
        org_ids = {m.organization_id for m in active_members}
        for m in active_members:
            member_map[m.user_id] = m

        owned_orgs = session.exec(
            select(Organization).where(
                Organization.owner_id.in_(user_ids),
                Organization.is_active == True,  # noqa: E712
            )
        ).all()
        for o in owned_orgs:
            owned_org_map[o.owner_id] = o
            org_by_id[o.id] = o
            org_ids.discard(o.id)

        if org_ids:
            for o in session.exec(select(Organization).where(Organization.id.in_(org_ids))).all():
                org_by_id[o.id] = o

    result_list = []
    for u in users:
        user_data = {
            "id": str(u.id),
            "email": u.email,
            "full_name": u.full_name,
            "phone": u.phone,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at,
            "avatar_url": u.avatar_url,
        }

        if u.role == "technician":
            tech = tech_map.get(u.id)
            if not tech:
                tech = ensure_technician_profile(session, u.id)
                tech_map[u.id] = tech
                provisioned_missing_tech = True
            user_data.update({
                "sena_certification_number": tech.sena_certification_number,
                "is_verified": tech.is_verified,
                "rank": tech.rank,
                "total_services": tech.total_services,
                "average_rating": tech.average_rating,
            })

        if u.role in ("company_admin", "technician"):
            member = member_map.get(u.id)
            if member:
                org = org_by_id.get(member.organization_id)
                if org and org.is_active:
                    user_data.update({
                        "organization_id": str(org.id),
                        "organization_name": org.name,
                        "org_role": member.org_role,
                    })
            elif u.role == "company_admin":
                owned_org = owned_org_map.get(u.id)
                if owned_org and owned_org.is_active:
                    user_data.update({
                        "organization_id": str(owned_org.id),
                        "organization_name": owned_org.name,
                        "org_role": "owner",
                    })
        result_list.append(user_data)

    if provisioned_missing_tech:
        session.commit()

    return {
        "items": result_list,
        "total": total,
        "page": (skip // limit) + 1,
        "pages": (total // limit) + (1 if total % limit > 0 else 0)
    }

@router.put("/users/{user_id}/verify", summary="Validar técnico y dar por cursados los cursos obligatorios")
async def verify_technician(
    user_id: str,
    is_verified: bool = Query(..., description="True to verify and complete required courses, False to revoke"),
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session)
):
    from uuid import UUID
    from app.api.courses import grant_all_required_courses, revoke_admin_granted_courses
    
    user = session.get(User, UUID(str(user_id)))
    if not user or user.role not in ("technician", "reaction_team"):
        raise HTTPException(status_code=404, detail="Technician not found")
        
    tech = ensure_technician_profile(session, user.id)
        
    tech.is_verified = is_verified
    tech.verification_status = "verified" if is_verified else "incomplete"
    courses_completed = 0

    if is_verified:
        courses_completed = grant_all_required_courses(session, user.id)
        tech.certifications_count = max(tech.certifications_count or 0, courses_completed)
    else:
        revoke_admin_granted_courses(session, user.id)
    
    # Recalculate rank points with verified status bonus (+25)
    points, rank = calculate_rank_points(
        total_services=tech.total_services or 0,
        experience_years=tech.experience_years or 0,
        certifications_count=tech.certifications_count or 0,
        average_rating=tech.average_rating or 0.0,
        is_verified=tech.is_verified,
        specializations_count=len(tech.specializations or []),
    )
    tech.rank_points = points
    tech.rank = rank
    
    session.add(tech)
    session.commit()
    
    return {
        "message": (
            f"Técnico validado exitosamente ({courses_completed} curso(s) obligatorio(s) dado(s) por cursado(s))"
            if is_verified
            else "Validación de técnico revocada"
        ),
        "is_verified": is_verified,
        "courses_completed": courses_completed,
    }

@router.put("/users/{user_id}/status", summary="Suspend or activate user")
async def change_user_status(
    user_id: str,
    is_active: bool,
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session)
):
    from uuid import UUID
    
    if str(current_user["id"]) == user_id:
        raise HTTPException(status_code=400, detail="Cannot change own admin status")
        
    user = session.get(User, UUID(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_active = is_active
    session.add(user)
    session.commit()
    
    return {"message": f"User {'activated' if is_active else 'suspended'}"}


class RoleChangeRequest(BaseModel):
    role: str  # "client" | "technician" | "admin" | "reaction_team" | "company_admin"
    organization_name: Optional[str] = None

@router.put("/users/{user_id}/role", summary="Change user role")
async def change_user_role(
    user_id: str,
    body: RoleChangeRequest,
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session)
):
    from uuid import UUID
    from app.api.organizations import create_organization_for_owner
    
    allowed_roles = ["client", "technician", "admin", "reaction_team", "company_admin"]
    if body.role not in allowed_roles:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {allowed_roles}")
    
    user = session.get(User, UUID(str(user_id)))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_role = user.role
    organization_name: Optional[str] = None

    if body.role == "company_admin":
        existing_org = session.exec(
            select(Organization).where(Organization.owner_id == user.id)
        ).first()
        all_memberships = session.exec(
            select(OrganizationMember).where(OrganizationMember.user_id == user.id)
        ).all()

        # El dueño es administrativo: deshabilitar disponibilidad sin borrar Technician (preserva FK de documentos/quizzes)
        owner_tech = session.exec(select(Technician).where(Technician.user_id == user.id)).first()
        if owner_tech:
            owner_tech.is_available = False
            session.add(owner_tech)

        if existing_org:
            existing_org.is_active = True
            if body.organization_name and body.organization_name.strip():
                existing_org.name = body.organization_name.strip()
            session.add(existing_org)

            own_member = next((m for m in all_memberships if m.organization_id == existing_org.id), None)
            for m in all_memberships:
                if m.organization_id != existing_org.id and m.status == OrgMemberStatus.active.value:
                    m.status = OrgMemberStatus.suspended.value
                    session.add(m)

            if not own_member:
                session.add(
                    OrganizationMember(
                        organization_id=existing_org.id,
                        user_id=user.id,
                        org_role=OrgRole.owner.value,
                        status=OrgMemberStatus.active.value,
                        invited_phone=user.phone,
                    )
                )
            else:
                own_member.org_role = OrgRole.owner.value
                own_member.status = OrgMemberStatus.active.value
                session.add(own_member)

            user.role = "company_admin"
            session.add(user)
            session.commit()
            organization_name = existing_org.name
        else:
            # Si pertenecía como técnico/manager a otro taller ajeno, suspender esa membresía antes de crear su propio taller
            for m in all_memberships:
                if m.status == OrgMemberStatus.active.value:
                    m.status = OrgMemberStatus.suspended.value
                    session.add(m)
            session.flush()

            default_org_name = (
                body.organization_name.strip()
                if body.organization_name and body.organization_name.strip()
                else f"Taller {user.full_name or user.phone or user.email.split('@')[0]}"
            )
            org = create_organization_for_owner(
                session=session,
                owner_user=user,
                name=default_org_name,
            )
            organization_name = org.name
    else:
        user.role = body.role
        session.add(user)

        # Si el usuario era owner activo de un taller y pasa a otro rol, suspender membresía owner
        # para evitar bloqueo OWNER_CANNOT_OPERATE cuando opere como técnico o cliente
        owner_memberships = session.exec(
            select(OrganizationMember).where(
                OrganizationMember.user_id == user.id,
                OrganizationMember.org_role == OrgRole.owner.value,
                OrganizationMember.status == OrgMemberStatus.active.value,
            )
        ).all()
        for om in owner_memberships:
            om.status = OrgMemberStatus.suspended.value
            session.add(om)

        if body.role in ("technician", "reaction_team"):
            tech = ensure_technician_profile(session, user.id)
            tech.is_available = True
            session.add(tech)

        session.commit()
    
    return {
        "message": f"Role changed from '{old_role}' to '{body.role}'",
        "user_id": user_id,
        "phone": user.phone,
        "full_name": user.full_name,
        "role": user.role,
        "organization_name": organization_name,
    }

# --- Admin Services Management ---

@router.get("/services", summary="List all services with resolved names")
async def list_global_services(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = Query(None, description="Filtrar por estado"),
    service_type: Optional[str] = Query(None, description="Filtrar por tipo"),
    search: Optional[str] = Query(None, description="Buscar por título, dirección o placa"),
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session)
):
    query = select(Service)
    if status:
        query = query.where(Service.status == status)
    if service_type:
        query = query.where(Service.service_type == service_type)
    if search:
        pattern = f"%{search}%"
        matching_users = select(User.id).where(
            or_(
                User.full_name.ilike(pattern),
                User.phone.ilike(pattern),
                User.email.ilike(pattern),
            )
        )
        query = query.where(
            or_(
                Service.title.ilike(pattern),
                Service.service_address.ilike(pattern),
                Service.vehicle_plate.ilike(pattern),
                Service.description.ilike(pattern),
                cast(Service.id, String).ilike(pattern),
                Service.client_id.in_(matching_users),
                Service.technician_id.in_(matching_users),
            )
        )
        
    total = session.exec(select(func.count()).select_from(query.subquery())).one()
    services = session.exec(query.order_by(Service.created_at.desc()).offset(skip).limit(limit)).all()
    
    # Resolve client and technician names in a single batch query
    related_user_ids = {
        uid
        for s in services
        for uid in (s.client_id, s.technician_id)
        if uid is not None
    }
    user_lookup = {
        u.id: u
        for u in (
            session.exec(select(User).where(User.id.in_(related_user_ids))).all()
            if related_user_ids
            else []
        )
    }

    items = []
    for s in services:
        client = user_lookup.get(s.client_id) if s.client_id else None
        technician = user_lookup.get(s.technician_id) if s.technician_id else None
        items.append({
            "id": str(s.id),
            "title": s.title,
            "service_type": s.service_type,
            "status": s.status,
            "service_address": s.service_address,
            "estimated_price": s.estimated_price,
            "vehicle_plate": s.vehicle_plate,
            "client_id": str(s.client_id),
            "client_name": client.full_name if client else None,
            "client_phone": client.phone if client else None,
            "technician_id": str(s.technician_id) if s.technician_id else None,
            "technician_name": technician.full_name if technician else None,
            "created_at": s.created_at,
        })
    
    return {
        "items": items,
        "total": total
    }


@router.get("/services/{service_id}", summary="Get single service detail with client and technician info")
async def get_service_detail_admin(
    service_id: str,
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session)
):
    """Returns full service detail with embedded client and technician names for admin panel."""
    from uuid import UUID
    try:
        svc_uuid = UUID(service_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid service ID format")

    service = session.get(Service, svc_uuid)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    client = session.get(User, service.client_id) if service.client_id else None
    technician = session.get(User, service.technician_id) if service.technician_id else None

    return {
        "id": str(service.id),
        "title": service.title,
        "service_type": service.service_type,
        "status": service.status,
        "service_address": service.service_address,
        "description": service.description,
        "estimated_price": service.estimated_price,
        "vehicle_type": service.vehicle_type,
        "vehicle_model": service.vehicle_model,
        "vehicle_plate": service.vehicle_plate,
        "service_metadata": service.service_metadata,
        "scheduled_date": service.scheduled_date.isoformat() if service.scheduled_date else None,
        "created_at": service.created_at.isoformat() if service.created_at else None,
        "client_id": str(service.client_id) if service.client_id else None,
        "technician_id": str(service.technician_id) if service.technician_id else None,
        "client": {
            "full_name": client.full_name,
            "phone": client.phone,
            "email": client.email,
        } if client else None,
        "technician": {
            "full_name": technician.full_name,
            "phone": technician.phone,
        } if technician else None,
    }


@router.post("/services/{service_id}/force-close", summary="Force close a zombie service")
async def force_close_service(
    service_id: str,
    reason: str = Query(..., description="Reason for forcing closure"),
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session)
):
    from uuid import UUID
    from app.services.notification_service import NotificationService
    
    try:
        svc_uuid = UUID(service_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid service ID")
        
    service = session.get(Service, svc_uuid)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
        
    if service.status in [ServiceStatus.cancelled, ServiceStatus.completed, ServiceStatus.confirmed]:
        raise HTTPException(status_code=400, detail=f"Service already {service.status}")
        
    service.status = ServiceStatus.cancelled
    service.service_metadata = service.service_metadata or {}
    service.service_metadata["force_closed_reason"] = reason
    service.service_metadata["force_closed_by"] = str(current_user["id"])
    service.updated_at = datetime.utcnow()
    
    session.add(service)
    session.commit()
    
    # Notify client and tech
    await NotificationService.notify_client_service_update(
        session=session,
        client_id=service.client_id,
        service_id=service.id,
        status="cancelled",
        technician_name="Sistema"
    )
    
    return {"message": "Service force closed successfully", "service_id": service_id}



# --- Estadísticas ---

@router.get("/stats", summary="Platform wide statistics — real data")
async def platform_stats(
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session)
):
    # User counts by role
    total_clients = session.exec(select(func.count()).select_from(select(User).where(User.role == "client").subquery())).one()
    total_techs = session.exec(select(func.count()).select_from(select(User).where(User.role == "technician").subquery())).one()
    total_reaction = session.exec(select(func.count()).select_from(select(User).where(User.role == "reaction_team").subquery())).one()
    total_company_admins = session.exec(select(func.count()).select_from(select(User).where(User.role == "company_admin").subquery())).one()
    total_orgs = session.exec(select(func.count()).select_from(select(Organization).where(Organization.is_active == True).subquery())).one()  # noqa: E712

    # Pending technician document verifications and unverified technicians
    pending_verifications = session.exec(
        select(func.count()).select_from(
            select(Technician).where(
                Technician.id.in_(
                    select(TechnicianDocument.technician_id).where(
                        TechnicianDocument.status == DocumentStatus.pending
                    )
                )
            ).subquery()
        )
    ).one()
    unverified_techs = session.exec(
        select(func.count()).select_from(
            select(Technician).where(Technician.is_verified == False).subquery()  # noqa: E712
        )
    ).one()

    # Service counts
    total_services = session.exec(select(func.count()).select_from(select(Service).subquery())).one()
    
    status_counts = {}
    for s in ServiceStatus:
        count = session.exec(select(func.count()).select_from(select(Service).where(Service.status == s.value).subquery())).one()
        status_counts[s.value] = count

    terminal_completed = ["completed", "confirmed"]
    terminal_all = ["completed", "confirmed", "cancelled"]

    # Gross volume of completed + confirmed services
    gross_volume_result = session.exec(
        select(func.coalesce(func.sum(Service.estimated_price), 0))
        .where(Service.status.in_(terminal_completed))
    ).one()
    gross_volume = float(gross_volume_result)

    # Escrow volume in active services
    escrow_active_result = session.exec(
        select(func.coalesce(func.sum(Service.estimated_price), 0))
        .where(Service.status.notin_(terminal_all))
    ).one()
    escrow_active = float(escrow_active_result)

    # Real Revenue connected to SaaS Vertical (Contabilidad)
    # Under DIAN Concept 1222/2024, Tec360's real revenue is the platform commission,
    # tracked directly in the SaaS Vertical accounting ledger.
    real_revenue = gross_volume * 0.10  # Platform commission default (10%)
    accounting_connected = False
    month_income = 0.0
    month_expenses = 0.0
    month_net_profit = 0.0

    try:
        accounting = await get_accounting_dashboard()
        if accounting and "month_income" in accounting:
            month_income = float(accounting.get("month_income", 0) or 0)
            month_expenses = float(accounting.get("month_expenses", 0) or 0)
            month_net_profit = float(accounting.get("month_net_profit", 0) or 0)
            if month_income > 0:
                real_revenue = month_income
            accounting_connected = True
    except Exception as e:
        logger.warning(f"Error fetching accounting dashboard for admin stats: {e}")

    # Recovery services
    recovery_total = session.exec(select(func.count()).select_from(
        select(Service).where(Service.service_type == "vehicle_recovery").subquery()
    )).one()
    recovery_active = session.exec(select(func.count()).select_from(
        select(Service).where(
            Service.service_type == "vehicle_recovery",
            Service.status.notin_(terminal_all)
        ).subquery()
    )).one()

    # Quick mechanics services
    quick_mechanics_types = [
        "oil_change", "tire_change", "battery_service",
        "brake_service", "chain_kit_service", "spark_bulbs_wipers"
    ]
    mechanics_total = session.exec(select(func.count()).select_from(
        select(Service).where(Service.service_type.in_(quick_mechanics_types)).subquery()
    )).one()
    mechanics_active = session.exec(select(func.count()).select_from(
        select(Service).where(
            Service.service_type.in_(quick_mechanics_types),
            Service.status.notin_(terminal_all)
        ).subquery()
    )).one()

    # Installations services (everything else)
    installations_total = max(0, total_services - recovery_total - mechanics_total)
    active_services = sum(
        count for st, count in status_counts.items() if st not in terminal_all
    )
    installations_active = max(0, active_services - recovery_active - mechanics_active)

    # Avg ticket (completed + confirmed with price)
    avg_ticket_result = session.exec(
        select(func.coalesce(func.avg(Service.estimated_price), 0))
        .where(Service.status.in_(terminal_completed), Service.estimated_price.isnot(None))
    ).one()

    completed = status_counts.get("completed", 0) + status_counts.get("confirmed", 0)

    return {
        "users": {
            "clients": total_clients,
            "technicians": total_techs,
            "reaction_team": total_reaction,
            "company_admins": total_company_admins,
            "organizations": total_orgs,
            "total": total_clients + total_techs + total_reaction + total_company_admins,
            "pending_verifications": pending_verifications,
            "unverified_technicians": unverified_techs,
        },
        "services": {
            "total": total_services,
            "by_status": status_counts,
            "completed": completed,
            "active": active_services,
            "completion_rate": f"{(completed / total_services * 100):.1f}%" if total_services > 0 else "0%"
        },
        "revenue": {
            "total": real_revenue,
            "gross_volume": gross_volume,
            "escrow_active": escrow_active,
            "month_income": month_income,
            "month_expenses": month_expenses,
            "month_net_profit": month_net_profit,
            "accounting_connected": accounting_connected,
            "average_ticket": float(avg_ticket_result),
            "currency": "COP"
        },
        "recovery": {
            "total": recovery_total,
            "active": recovery_active,
        },
        "quick_mechanics": {
            "total": mechanics_total,
            "active": mechanics_active,
        },
        "installations": {
            "total": installations_total,
            "active": installations_active,
        }
    }


@router.get("/stats/timeline", summary="Services created per week (last 12 weeks)")
async def stats_timeline(
    weeks: int = Query(12, ge=1, le=52, description="Number of past weeks"),
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session)
):
    start_date = datetime.utcnow() - timedelta(weeks=weeks)
    
    # Raw SQL for date_trunc — cleaner for time series
    result = session.exec(text("""
        SELECT
            date_trunc('week', created_at)::date AS week_start,
            COUNT(*) AS count,
            COALESCE(SUM(estimated_price), 0) AS revenue
        FROM services
        WHERE created_at >= :start_date
        GROUP BY week_start
        ORDER BY week_start
    """), params={"start_date": start_date})
    
    timeline = []
    for row in result:
        timeline.append({
            "week": row[0].isoformat(),
            "services": row[1],
            "revenue": float(row[2])
        })
    
    return {"timeline": timeline, "weeks": weeks}
