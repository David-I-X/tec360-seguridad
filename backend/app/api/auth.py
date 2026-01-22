"""
Authentication Endpoints
OTP-based phone authentication with Supabase
"""
from fastapi import APIRouter, HTTPException, status, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from app.core.config import settings
from app.schemas.auth import (
    PhoneRequest,
    OTPRequest,
    OTPResponse,
    AuthResponse,
    ErrorResponse,
    OnboardingRequest,
    OnboardingResponse
)
from app.services.otp_service import otp_service
from app.services.sms_service import sms_service
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Cliente Supabase con Service Role Key
supabase_admin: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_KEY
)

# Esquema de seguridad HTTP Bearer
security = HTTPBearer()


def mask_phone(phone: str) -> str:
    """
    Mask phone number for privacy
    +573001234567 -> +57300***4567
    """
    if len(phone) < 8:
        return phone
    return f"{phone[:6]}***{phone[-4:]}"


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Dependency to get current authenticated user from JWT token
    """
    token = credentials.credentials
    logger.info(f"Token received (first 30 chars): {token[:30]}...")
    
    try:
        # Verificar token JWT (generado por nosotros)
        import jwt
        from datetime import datetime
        
        try:
            # Decodificar el token
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            logger.info(f"Token decoded successfully. User ID: {payload.get('sub')}")
            
            # Verificar expiración
            if payload.get("exp") and datetime.utcnow().timestamp() > payload["exp"]:
                logger.error(f"Token expired")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token expirado"
                )
            
            # Crear objeto de usuario desde el payload
            user = {
                "id": payload.get("sub"),
                "phone": payload.get("phone"),
                "role": payload.get("role", "authenticated"),
                "user_metadata": {}
            }
            
            logger.info(f"User authenticated successfully: {user['id']}")
            return user
            
        except jwt.ExpiredSignatureError:
            logger.error("Token expired (ExpiredSignatureError)")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expirado"
            )
        except jwt.InvalidTokenError as e:
            logger.error(f"Invalid token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token inválido: {str(e)}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error verifying token: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Error al verificar token: {str(e)}"
        )


@router.post(
    "/request-otp",
    response_model=OTPResponse,
    status_code=status.HTTP_200_OK,
    summary="Solicitar código OTP",
    description="Envía un código de verificación de 6 dígitos por SMS al número proporcionado"
)
async def request_otp(request: PhoneRequest):
    """
    Solicitar código OTP por SMS
    
    - **phone**: Número de teléfono en formato internacional (+57...)
    
    Retorna:
    - success: true si el código fue enviado
    - message: Mensaje descriptivo
    - phone: Número enmascarado para privacidad
    - expires_in_minutes: Minutos hasta que expire el código
    - code: Código OTP (solo en modo desarrollo)
    """
    try:
        # Crear y enviar OTP
        success, code, error = await otp_service.create_otp(request.phone)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS
                if "límite" in (error or "").lower()
                else status.HTTP_400_BAD_REQUEST,
                detail=error or "Error al enviar código"
            )
        
        return OTPResponse(
            success=True,
            message="Código enviado exitosamente. Revisa tu SMS.",
            phone=mask_phone(request.phone),
            expires_in_minutes=settings.OTP_EXPIRY_MINUTES,
            code=code  # Solo se incluye en desarrollo
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in request_otp: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al procesar solicitud"
        )


@router.post(
    "/verify-otp",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Verificar código OTP y autenticar",
    description="Verifica el código OTP y crea/autentica al usuario en Supabase"
)
async def verify_otp(request: OTPRequest):
    """
    Verificar código OTP y autenticar usuario
    
    - **phone**: Número de teléfono
    - **code**: Código de 6 dígitos recibido por SMS
    
    Retorna:
    - access_token: Token JWT para autenticación
    - refresh_token: Token para renovar sesión
    - user: Información del usuario
    - is_new_user: true si es un usuario nuevo (necesita onboarding)
    """
    try:
        # 1. Verificar OTP
        is_valid, error = await otp_service.verify_otp(request.phone, request.code)
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error or "Código inválido"
            )
        
        # 2. Buscar o crear usuario en Supabase Auth
        is_new_user = False
        current_user = None
        
        try:
            # Método 1: Buscar usuario por teléfono en la tabla auth.users
            try:
                # Usar una consulta directa a la base de datos
                users_query = supabase_admin.table('auth.users')\
                    .select('*')\
                    .eq('phone', request.phone)\
                    .execute()
                
                if users_query.data and len(users_query.data) > 0:
                    user_data_db = users_query.data[0]
                    logger.info(f"Found user in database: {user_data_db.get('id')}")
                    
                    # Obtener el usuario completo desde Auth Admin
                    try:
                        full_user = supabase_admin.auth.admin.get_user_by_id(user_data_db['id'])
                        if full_user and full_user.user:
                            current_user = full_user.user
                            logger.info(f"Retrieved full user data: {current_user.id}")
                    except Exception as e:
                        logger.warning(f"Could not get full user data: {e}")
                        # Crear objeto user temporal con datos de DB
                        class TempUser:
                            def __init__(self, data):
                                self.id = data['id']
                                self.phone = data['phone']
                                self.email = data.get('email')
                                self.user_metadata = data.get('raw_user_meta_data', {})
                                self.created_at = data.get('created_at')
                        
                        current_user = TempUser(user_data_db)
                        
            except Exception as db_error:
                logger.warning(f"Could not query database directly: {db_error}")
                # Fallback: Método 2 - Listar todos los usuarios
                try:
                    users_response = supabase_admin.auth.admin.list_users()
                    
                    for user in users_response:
                        if user.phone == request.phone:
                            current_user = user
                            logger.info(f"Found user in list: {user.id}")
                            break
                except Exception as list_error:
                    logger.warning(f"Could not list users: {list_error}")
            
            if current_user:
                # Usuario existente encontrado
                logger.info(f"Authenticating existing user: {current_user.id}")
                
            else:
                # Usuario nuevo - intentar crear
                is_new_user = True
                logger.info(f"Creating new user for phone: {request.phone}")
                
                try:
                    signup_response = supabase_admin.auth.admin.create_user({
                        "phone": request.phone,
                        "phone_confirm": True,
                        "user_metadata": {
                            "phone": request.phone,
                            "onboarding_completed": False
                        }
                    })
                    
                    if not signup_response or not signup_response.user:
                        raise Exception("Error al crear usuario en Supabase")
                    
                    current_user = signup_response.user
                    logger.info(f"New user created: {current_user.id}")
                    
                    # Enviar SMS de bienvenida
                    try:
                        await sms_service.send_welcome(request.phone, "Usuario")
                    except Exception as e:
                        logger.warning(f"Failed to send welcome SMS: {e}")
                        
                except Exception as create_error:
                    error_msg = str(create_error)
                    
                    # Si el error es que el teléfono ya existe, eliminarlo y recrearlo
                    if "already registered" in error_msg.lower():
                        logger.warning(f"Phone {request.phone} already exists. Attempting to find and use existing user...")
                        
                        # Última estrategia: Buscar en TODAS las páginas
                        try:
                            page = 1
                            per_page = 1000
                            found = False
                            
                            while not found:
                                logger.info(f"Searching users page {page}...")
                                users_page = supabase_admin.auth.admin.list_users(page=page, per_page=per_page)
                                
                                if not users_page or len(users_page) == 0:
                                    break
                                
                                for user in users_page:
                                    if user.phone == request.phone:
                                        current_user = user
                                        is_new_user = False
                                        found = True
                                        logger.info(f"Found user in page {page}: {user.id}")
                                        break
                                
                                if found or len(users_page) < per_page:
                                    break
                                    
                                page += 1
                            
                            if not current_user:
                                # Si aún no encontramos el usuario, creemos uno temporal que funcione
                                logger.error(f"User exists but cannot be found. Creating functional temporary user.")
                                
                                # Crear usuario temporal con datos básicos que permitan continuar
                                class FunctionalUser:
                                    def __init__(self, phone_num):
                                        import uuid
                                        # Generar UUID consistente basado en el teléfono
                                        self.id = str(uuid.uuid5(uuid.NAMESPACE_DNS, phone_num))
                                        self.phone = phone_num
                                        self.email = None
                                        self.user_metadata = {
                                            "phone": phone_num,
                                            "onboarding_completed": False,
                                            "_temporary": True
                                        }
                                        self.created_at = None
                                
                                current_user = FunctionalUser(request.phone)
                                is_new_user = False
                                logger.warning(f"Using temporary functional user for {request.phone}")
                                
                        except Exception as search_error:
                            logger.error(f"Final search failed: {search_error}")
                            # Crear usuario temporal como último recurso
                            class FunctionalUser:
                                def __init__(self, phone_num):
                                    import uuid
                                    self.id = str(uuid.uuid5(uuid.NAMESPACE_DNS, phone_num))
                                    self.phone = phone_num
                                    self.email = None
                                    self.user_metadata = {
                                        "phone": phone_num,
                                        "onboarding_completed": False,
                                        "_temporary": True
                                    }
                                    self.created_at = None
                            
                            current_user = FunctionalUser(request.phone)
                            is_new_user = False
                            logger.warning(f"Using temporary functional user after search failure")
                    else:
                        raise create_error
            
            # Verificar que tenemos un usuario
            if not current_user:
                raise Exception("No se pudo obtener información del usuario")
            
            # Generar tokens JWT
            import jwt
            from datetime import datetime, timedelta
            
            access_payload = {
                "sub": current_user.id,
                "phone": current_user.phone if hasattr(current_user, 'phone') else request.phone,
                "role": "authenticated",
                "exp": datetime.utcnow() + timedelta(days=7)  # 7 días en vez de 1 hora
            }
            
            refresh_payload = {
                "sub": current_user.id,
                "phone": current_user.phone if hasattr(current_user, 'phone') else request.phone,
                "exp": datetime.utcnow() + timedelta(days=30)  # 30 días
            }
            
            access_token = jwt.encode(access_payload, settings.SECRET_KEY, algorithm="HS256")
            refresh_token = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm="HS256")
            
            user_data = {
                "id": current_user.id,
                "phone": current_user.phone if hasattr(current_user, 'phone') else request.phone,
                "email": current_user.email if hasattr(current_user, 'email') else None,
                "user_metadata": current_user.user_metadata if hasattr(current_user, 'user_metadata') else {},
                "created_at": str(current_user.created_at) if hasattr(current_user, 'created_at') and current_user.created_at else None
            }
            
        except Exception as e:
            logger.error(f"Error managing user in Supabase: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al autenticar usuario: {str(e)}"
            )
        
        # 3. Retornar respuesta con tokens
        return AuthResponse(
            success=True,
            message="Autenticación exitosa" if not is_new_user else "Cuenta creada exitosamente",
            access_token=access_token,
            refresh_token=refresh_token,
            user=user_data,
            is_new_user=is_new_user
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in verify_otp: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al verificar código: {str(e)}"
        )


@router.post(
    "/onboarding",
    response_model=OnboardingResponse,
    status_code=status.HTTP_200_OK,
    summary="Completar perfil de usuario",
    description="Completa la información del perfil después del primer login"
)
async def complete_onboarding(
    request: OnboardingRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Completar onboarding del usuario
    
    Requiere autenticación (Authorization: Bearer <token>)
    
    - **full_name**: Nombre completo del usuario
    - **email**: Email (opcional)
    - **user_type**: Tipo de usuario (client o technician)
    """
    try:
        user_id = current_user["id"]
        user_phone = current_user["phone"]
        
        logger.info(f"Starting onboarding for user: {user_id}")
        
        # Obtener usuario actual de Supabase para preservar metadata existente
        try:
            existing_user = supabase_admin.auth.admin.get_user_by_id(user_id)
            existing_metadata = existing_user.user.user_metadata if existing_user and existing_user.user else {}
        except Exception as e:
            logger.warning(f"Could not fetch existing user metadata: {e}")
            existing_metadata = {}
        
        # Merge de metadata existente con nueva info
        updated_metadata = {
            **existing_metadata,
            "phone": user_phone,
            "full_name": request.full_name,
            "email": request.email if request.email else existing_metadata.get("email"),
            "role": request.user_type,
            "onboarding_completed": True,
        }
        
        # Actualizar metadata del usuario
        update_response = supabase_admin.auth.admin.update_user_by_id(
            user_id,
            {"user_metadata": updated_metadata}
        )
        
        if not update_response or not update_response.user:
            raise Exception("Error al actualizar perfil")
        
        logger.info(f"Onboarding completed for user: {user_id}")
        
        return OnboardingResponse(
            success=True,
            message="Perfil completado exitosamente",
            user={
                "id": user_id,
                "phone": user_phone,
                "full_name": request.full_name,
                "email": request.email,
                "role": request.user_type,
                "onboarding_completed": True
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in complete_onboarding: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al completar perfil: {str(e)}"
        )


@router.post(
    "/refresh",
    summary="Renovar token de acceso",
    description="Genera un nuevo access_token usando el refresh_token"
)
async def refresh_token(refresh_token: str):
    """
    Renovar access token usando refresh token
    """
    try:
        session_response = supabase_admin.auth.refresh_session(refresh_token)
        
        if not session_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token inválido"
            )
        
        return {
            "success": True,
            "access_token": session_response.session.access_token,
            "refresh_token": session_response.session.refresh_token
        }
        
    except Exception as e:
        logger.error(f"Error refreshing token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Error al renovar token"
        )


@router.get(
    "/me",
    summary="Obtener usuario actual",
    description="Retorna información del usuario autenticado"
)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Obtener información del usuario actual
    
    Requiere autenticación (Authorization: Bearer <token>)
    """
    return {
        "success": True,
        "user": {
            "id": current_user.id,
            "phone": current_user.phone,
            "email": current_user.email,
            **current_user.user_metadata
        }
    }