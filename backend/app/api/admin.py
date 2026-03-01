from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_session
from app.core.security import require_roles
from app.models.user import User
from app.models.technician import Technician, calculate_rank_points
from app.models.service import Service, ServiceStatus

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

@router.get("/users", summary="List all users", response_model=dict)
async def list_users(
    skip: int = 0,
    limit: int = 50,
    role: Optional[str] = None,
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session)
):
    query = select(User)
    if role:
        query = query.where(User.role == role)
        
    total = session.exec(select(func.count()).select_from(query.subquery())).one()
    users = session.exec(query.offset(skip).limit(limit)).all()
    
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
            tech = session.exec(select(Technician).where(Technician.user_id == u.id)).first()
            if tech:
                user_data.update({
                    "sena_certification_number": tech.sena_certification_number,
                    "is_verified": tech.is_verified,
                    "rank": tech.rank,
                    "total_services": tech.total_services,
                    "average_rating": tech.average_rating,
                })
        result_list.append(user_data)
        
    return {
        "items": result_list,
        "total": total,
        "page": (skip // limit) + 1,
        "pages": (total // limit) + (1 if total % limit > 0 else 0)
    }

@router.put("/users/{user_id}/verify", summary="Verify technician SENA status")
async def verify_technician(
    user_id: str,
    is_verified: bool = Query(..., description="True to verify, False to revoke"),
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session)
):
    from uuid import UUID
    
    user = session.get(User, UUID(user_id))
    if not user or user.role != "technician":
        raise HTTPException(status_code=404, detail="Technician not found")
        
    tech = session.exec(select(Technician).where(Technician.user_id == user.id)).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician profile not found")
        
    tech.is_verified = is_verified
    
    # Recalculate rank points with verified status bonus (+20)
    points, rank = calculate_rank_points(
        total_services=tech.total_services,
        experience_years=tech.experience_years,
        certifications_count=tech.certifications_count,
        average_rating=tech.average_rating,
        is_verified=tech.is_verified
    )
    tech.rank_points = points
    tech.rank = rank
    
    session.add(tech)
    session.commit()
    
    return {"message": f"Technician {'verified' if is_verified else 'unverified'} successfully"}

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

# --- Admin Services Management ---

@router.get("/services", summary="List all services across platform")
async def list_global_services(
    skip: int = 0,
    limit: int = 50,
    status: Optional[ServiceStatus] = None,
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session)
):
    query = select(Service)
    if status:
        query = query.where(Service.status == status)
        
    total = session.exec(select(func.count()).select_from(query.subquery())).one()
    services = session.exec(query.order_by(Service.created_at.desc()).offset(skip).limit(limit)).all()
    
    return {
        "items": [
            {
                "id": str(s.id),
                "title": s.title,
                "service_type": s.service_type,
                "status": s.status,
                "service_address": s.service_address,
                "client_id": str(s.client_id),
                "technician_id": str(s.technician_id) if s.technician_id else None,
                "created_at": s.created_at,
            } for s in services
        ],
        "total": total
    }

@router.get("/stats", summary="Platform wide statistics")
async def platform_stats(
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session)
):
    total_clients = session.exec(select(func.count()).select_from(select(User).where(User.role == "client").subquery())).one()
    total_techs = session.exec(select(func.count()).select_from(select(User).where(User.role == "technician").subquery())).one()
    total_services = session.exec(select(func.count()).select_from(select(Service).subquery())).one()
    completed_services = session.exec(select(func.count()).select_from(select(Service).where(Service.status == "completed").subquery())).one()
    
    return {
        "users": {
            "clients": total_clients,
            "technicians": total_techs,
            "total": total_clients + total_techs
        },
        "services": {
            "total": total_services,
            "completed": completed_services,
            "completion_rate": f"{(completed_services / total_services * 100):.1f}%" if total_services > 0 else "0%"
        }
    }
