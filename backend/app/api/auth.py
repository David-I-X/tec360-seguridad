import logging
import random
import re
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select

from app.core.auth_utils import create_access_token, create_refresh_token
from app.core.config import settings
from app.core.database import get_session
from app.core.rate_limit import limiter
from app.core.security import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory OTP storage {phone: {"code": "123456", "expires": datetime}}
_otp_store: dict[str, dict] = {}

OTP_EXPIRY_MINUTES = 5
FIXED_OTP_CODE = "123456"

def normalize_phone(phone: str) -> str:
    """Normaliza un número celular a formato E.164 (+57...)"""
    cleaned = re.sub(r"[^\d+]", "", phone.strip())
    if cleaned.startswith("+57"):
        return cleaned
    if cleaned.startswith("57") and len(cleaned) == 12:
        return f"+{cleaned}"
    cleaned_digits = cleaned.lstrip("+")
    return f"+57{cleaned_digits}"

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
@limiter.limit("3/minute")
async def request_otp(data: OTPRequest, request: Request):
    phone_norm = normalize_phone(data.phone)
    if settings.SMS_ENABLED:
        # Real SMS mode: generate random code and send via Twilio
        from app.services.sms_service import sms_service
        code = str(random.randint(100000, 999999))
        expires = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)
        _otp_store[phone_norm] = {"code": code, "expires": expires}
        
        sent = await sms_service.send_otp(phone_norm, code)
        if not sent:
            logger.error(f"Failed to send OTP to {phone_norm}")
            raise HTTPException(
                status_code=500, 
                detail="Error al enviar el código SMS. Intenta de nuevo."
            )
        
        logger.info(f"OTP sent via SMS to {phone_norm}")
        return {
            "success": True, 
            "message": "Código de verificación enviado por SMS",
            "phone": phone_norm, 
            "expires_in_minutes": OTP_EXPIRY_MINUTES
        }
    else:
        # Dev/free mode: fixed code, no SMS sent
        expires = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)
        _otp_store[phone_norm] = {"code": FIXED_OTP_CODE, "expires": expires}
        
        logger.info(f"OTP (dev mode, fixed code) for {phone_norm}")
        return {
            "success": True, 
            "message": f"Código de verificación: {FIXED_OTP_CODE}",
            "phone": phone_norm, 
            "expires_in_minutes": OTP_EXPIRY_MINUTES
        }


@router.post("/verify-otp")
@limiter.limit("5/minute")
async def verify_otp(data: OTPVerify, request: Request, session: Session = Depends(get_session)):
    phone_norm = normalize_phone(data.phone)
    # Check OTP from store
    stored = _otp_store.get(phone_norm)
    
    if not stored:
        raise HTTPException(status_code=400, detail="No se ha solicitado un código para este número")
    
    if datetime.utcnow() > stored["expires"]:
        del _otp_store[phone_norm]
        raise HTTPException(status_code=400, detail="El código ha expirado. Solicita uno nuevo.")
    
    if data.code != stored["code"]:
        raise HTTPException(status_code=400, detail="Código inválido")
    
    # OTP verified — remove from store
    del _otp_store[phone_norm]

    # Find or Create User (match either normalized or raw)
    statement = select(User).where(
        (User.phone == phone_norm) | 
        (User.phone == data.phone) |
        (User.phone == data.phone.replace("+57", ""))
    )
    user = session.exec(statement).first()
    
    is_new_user = False
    
    if not user:
        is_new_user = True
        # Create minimal user
        user = User(
            email=f"{phone_norm.replace('+', '')}@temp.com", # Temporary email
            phone=phone_norm,
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
    # Only allow client/technician via public onboarding
    if data.user_type not in ("client", "technician"):
        raise HTTPException(status_code=403, detail="Rol no permitido desde el registro público")
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


@router.delete("/me")
async def delete_my_account(
    current_user_data: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Deactivate account and anonymize personal data.
    Complies with Google Play Store Data Safety Account Deletion requirement.
    """
    user_id = current_user_data["id"]
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.is_active = False
    user.full_name = "Usuario Eliminado"
    user.email = f"deleted_{user.id}@tec360.internal"
    user.phone = "+570000000000"
    user.avatar_url = None
    session.add(user)
    session.commit()

    return {
        "success": True,
        "message": "Tu cuenta y datos personales han sido eliminados correctamente."
    }