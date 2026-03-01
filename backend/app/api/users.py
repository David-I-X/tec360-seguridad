from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.technician import Technician
from pydantic import BaseModel

router = APIRouter(prefix="/users", tags=["users"])

# Schemas for this router only
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    notification_preferences: Optional[dict] = None

class TechnicianUpdate(BaseModel):
    bio: Optional[str] = None
    experience_years: Optional[int] = None
    service_radius_km: Optional[int] = None
    specializations: Optional[list[str]] = None

@router.get("/me", summary="Get current user profile")
async def get_my_profile(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    user = session.get(User, current_user["id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    response = {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role,
        "avatar_url": user.avatar_url,
        "city": user.city,
        "address": user.address,
        "is_active": user.is_active,
        "notification_preferences": user.notification_preferences,
    }
    
    if user.role == "technician":
        tech = session.exec(select(Technician).where(Technician.user_id == user.id)).first()
        if tech:
            response["technician_profile"] = {
                "id": str(tech.id),
                "bio": tech.bio,
                "experience_years": tech.experience_years,
                "service_radius_km": tech.service_radius_km,
                "specializations": tech.specializations,
                "rank": tech.rank,
                "rank_points": tech.rank_points,
                "average_rating": tech.average_rating,
                "total_services": tech.total_services,
                "is_verified": tech.is_verified,
            }
            
    return response

@router.put("/me", summary="Update current user personal info")
async def update_my_profile(
    update_data: UserUpdate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    user = session.get(User, current_user["id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(user, key, value)
        
    session.add(user)
    session.commit()
    return {"message": "Profile updated successfully"}

@router.put("/me/technician", summary="Update current user technician details")
async def update_my_technician_profile(
    update_data: TechnicianUpdate,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if current_user["role"] != "technician":
        raise HTTPException(status_code=403, detail="Not a technician")
        
    tech = session.exec(select(Technician).where(Technician.user_id == current_user["id"])).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician profile not found")
        
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(tech, key, value)
        
    session.add(tech)
    session.commit()
    return {"message": "Technician profile updated successfully"}

@router.delete("/me", summary="Soft-delete current user account")
async def delete_my_account(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    user = session.get(User, current_user["id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_active = False
    
    # Also disable technician profile if exists
    if user.role == "technician":
        tech = session.exec(select(Technician).where(Technician.user_id == user.id)).first()
        if tech:
            tech.is_available = False
            session.add(tech)
            
    session.add(user)
    session.commit()
    return {"message": "Account deactivated successfully"}
