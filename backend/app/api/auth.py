from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from app.core.database import get_session
from app.models.user import User
from app.core.auth_utils import create_access_token, create_refresh_token
from app.core.config import settings
from app.core.security import get_current_user
from datetime import timedelta, datetime
import random
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory OTP storage {phone: {"code": "123456", "expires": datetime}}
_otp_store: dict[str, dict] = {}

OTP_EXPIRY_MINUTES = 5
FIXED_OTP_CODE = "123456"

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
    if settings.SMS_ENABLED:
        # Real SMS mode: generate random code and send via Twilio
        from app.services.sms_service import sms_service
        code = str(random.randint(100000, 999999))
        expires = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)
        _otp_store[data.phone] = {"code": code, "expires": expires}
        
        sent = await sms_service.send_otp(data.phone, code)
        if not sent:
            logger.error(f"Failed to send OTP to {data.phone}")
            raise HTTPException(
                status_code=500, 
                detail="Error al enviar el código SMS. Intenta de nuevo."
            )
        
        logger.info(f"OTP sent via SMS to {data.phone}")
        return {
            "success": True, 
            "message": "Código de verificación enviado por SMS",
            "phone": data.phone, 
            "expires_in_minutes": OTP_EXPIRY_MINUTES
        }
    else:
        # Dev/free mode: fixed code, no SMS sent
        expires = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)
        _otp_store[data.phone] = {"code": FIXED_OTP_CODE, "expires": expires}
        
        logger.info(f"OTP (dev mode, fixed code) for {data.phone}")
        return {
            "success": True, 
            "message": f"Código de verificación: {FIXED_OTP_CODE}",
            "phone": data.phone, 
            "expires_in_minutes": OTP_EXPIRY_MINUTES
        }


@router.post("/verify-otp")
async def verify_otp(data: OTPVerify, session: Session = Depends(get_session)):
    # Check OTP from store
    stored = _otp_store.get(data.phone)
    
    if not stored:
        raise HTTPException(status_code=400, detail="No se ha solicitado un código para este número")
    
    if datetime.utcnow() > stored["expires"]:
        del _otp_store[data.phone]
        raise HTTPException(status_code=400, detail="El código ha expirado. Solicita uno nuevo.")
    
    if data.code != stored["code"]:
        raise HTTPException(status_code=400, detail="Código inválido")
    
    # OTP verified — remove from store
    del _otp_store[data.phone]

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

    # Generate Tokens
    access_token = create_access_token(
        subject=user.id,
        expires_delta=timedelta(days=7),
        extra_claims={"role": user.role}
    )
    refresh_token = create_refresh_token(
        subject=user.id,
        extra_claims={"role": user.role}
    )
    
    return {
        "success": True,
        "message": "Login exitoso",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": str(user.id),
            "phone": user.phone,
            "email": user.email,
            "role": user.role,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "onboarding_completed": bool(user.full_name)
        },
        "is_new_user": is_new_user
    }



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
            "avatar_url": user.avatar_url,
            "onboarding_completed": True
        }
    }

@router.post("/refresh")
async def refresh_tokens(
    data: RefreshTokenRequest,
    session: Session = Depends(get_session)
):
    """Exchange a valid refresh token for a new access+refresh token pair."""
    from jose import jwt, JWTError
    from app.core.config import settings as cfg
    
    try:
        payload = jwt.decode(data.refresh_token, cfg.SECRET_KEY, algorithms=[cfg.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Refresh token inválido o expirado")
    
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token no es de tipo refresh")
    
    user_id = payload.get("sub")
    user = session.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Usuario no encontrado o inactivo")
    
    new_access = create_access_token(
        subject=user.id,
        expires_delta=timedelta(days=7),
        extra_claims={"role": user.role}
    )
    new_refresh = create_refresh_token(
        subject=user.id,
        extra_claims={"role": user.role}
    )
    
    return {
        "success": True,
        "access_token": new_access,
        "refresh_token": new_refresh
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