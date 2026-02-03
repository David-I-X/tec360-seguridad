from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select
from app.core.database import get_session
from app.models.user import User
from app.core.auth_utils import create_access_token
from datetime import timedelta
import random

router = APIRouter(prefix="/auth", tags=["auth"])

# --- SCHEMAS ---
class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    code: str

class OnboardingRequest(BaseModel):
    full_name: str
    email: str = None
    user_type: str # client, technician

class RefreshTokenRequest(BaseModel):
    refresh_token: str

# --- ENDPOINTS ---

@router.post("/request-otp")
async def request_otp(data: OTPRequest):
    # SIMULATION: In a real app, send SMS via Twilio using sms_service
    # For now, we accept any phone and log the code "123456"
    return {
        "success": True, 
        "message": "Código enviado (Simulación: usa 123456)",
        "phone": data.phone, 
        "expires_in_minutes": 5
    }

@router.post("/verify-otp")
async def verify_otp(data: OTPVerify, session: Session = Depends(get_session)):
    # SIMULATION: Check code
    if data.code != "123456":
        raise HTTPException(status_code=400, detail="Código inválido")

    # Find or Create User
    statement = select(User).where(User.phone == data.phone)
    user = session.exec(statement).first()
    
    is_new_user = False
    
    if not user:
        is_new_user = True
        # Create minimal user
        user = User(
            email=f"{data.phone}@temp.com", # Temporary email
            phone=data.phone,
            hashed_password="nopassword", # OTP users don't have passwords
            role="client",
            is_active=True
        )
        session.add(user)
        session.commit()
        session.refresh(user)

    # Generate Token
    access_token = create_access_token(
        subject=user.id,
        expires_delta=timedelta(days=7),
        extra_claims={"role": user.role}
    )
    
    return {
        "success": True,
        "message": "Login exitoso",
        "access_token": access_token,
        "refresh_token": "dummy_refresh_token",
        "user": {
            "id": str(user.id),
            "phone": user.phone,
            "email": user.email,
            "role": user.role,
            "onboarding_completed": bool(user.full_name) # Simple check
        },
        "is_new_user": is_new_user
    }

from app.core.security import get_current_user

@router.post("/onboarding")
async def complete_onboarding(
    data: OnboardingRequest, 
    current_user_data: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    user_id = current_user_data["id"]
    user = session.get(User, user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    user.full_name = data.full_name
    if data.email:
        user.email = data.email
    user.role = data.user_type
    
    session.add(user)
    session.commit()
    session.refresh(user)
    
    return {
        "success": True,
        "message": "Perfil actualizado",
        "user": {
            "id": str(user.id),
            "phone": user.phone,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "onboarding_completed": True
        }
    }

@router.get("/me")
async def get_me(
    current_user_data: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    user_id = current_user_data["id"]
    user = session.get(User, user_id)
    return {
        "success": True, 
        "user": user
    }