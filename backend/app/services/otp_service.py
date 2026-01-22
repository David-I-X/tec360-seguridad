"""
OTP Service - Gestión de códigos de verificación
"""
import random
import string
from datetime import datetime, timedelta
from typing import Optional, Tuple
from supabase import create_client, Client
from app.core.config import settings
from app.services.sms_service import sms_service
import logging

logger = logging.getLogger(__name__)


class OTPService:
    """Service for managing OTP codes"""
    
    def __init__(self):
        """Initialize Supabase client with service role key"""
        self.supabase: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_KEY  # Service role para operaciones admin
        )
    
    def _generate_code(self) -> str:
        """
        Generate random OTP code
        
        Returns:
            str: Random code (default 6 digits)
        """
        return ''.join(random.choices(string.digits, k=settings.OTP_LENGTH))
    
    async def check_rate_limit(self, phone: str) -> Tuple[bool, Optional[str]]:
        """
        Check if phone number has exceeded rate limit
        
        Args:
            phone: Phone number to check
            
        Returns:
            Tuple[bool, Optional[str]]: (is_allowed, error_message)
        """
        try:
            # Calcular tiempo de ventana
            window_start = datetime.utcnow() - timedelta(
                minutes=settings.OTP_RATE_LIMIT_MINUTES
            )
            
            # Contar OTPs recientes
            response = self.supabase.table('otp_codes')\
                .select('id')\
                .eq('phone', phone)\
                .gte('created_at', window_start.isoformat())\
                .execute()
            
            count = len(response.data) if response.data else 0
            
            if count >= settings.OTP_RATE_LIMIT_MAX:
                return False, (
                    f"Has excedido el límite de {settings.OTP_RATE_LIMIT_MAX} intentos. "
                    f"Por favor espera {settings.OTP_RATE_LIMIT_MINUTES} minutos."
                )
            
            return True, None
            
        except Exception as e:
            logger.error(f"Error checking rate limit for {phone}: {e}")
            return False, "Error verificando límite de intentos"
    
    async def create_otp(self, phone: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Create and send OTP code
        
        Args:
            phone: Phone number in international format (+57...)
            
        Returns:
            Tuple[bool, Optional[str], Optional[str]]: (success, code, error_message)
        """
        try:
            # 1. Verificar rate limit
            is_allowed, error_msg = await self.check_rate_limit(phone)
            if not is_allowed:
                return False, None, error_msg
            
            # 2. Generar código
            code = self._generate_code()
            
            # 3. Calcular expiración
            expires_at = datetime.utcnow() + timedelta(
                minutes=settings.OTP_EXPIRY_MINUTES
            )
            
            # 4. Guardar en base de datos
            response = self.supabase.table('otp_codes').insert({
                'phone': phone,
                'code': code,
                'expires_at': expires_at.isoformat(),
                'verified': False,
                'attempts': 0
            }).execute()
            
            if not response.data:
                return False, None, "Error al crear código OTP"
            
            # 5. Enviar SMS
            sms_sent = await sms_service.send_otp(phone, code)
            
            if not sms_sent:
                logger.warning(f"SMS not sent to {phone}, but OTP created: {code}")
                # En desarrollo, permitir continuar incluso si SMS falla
                if settings.ENVIRONMENT == "development":
                    logger.info(f"[DEV] OTP Code for {phone}: {code}")
            
            logger.info(f"OTP created successfully for {phone}")
            return True, code if settings.ENVIRONMENT == "development" else None, None
            
        except Exception as e:
            logger.error(f"Error creating OTP for {phone}: {e}")
            return False, None, f"Error al crear código: {str(e)}"
    
    async def verify_otp(
        self, 
        phone: str, 
        code: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Verify OTP code
        
        Args:
            phone: Phone number
            code: OTP code to verify
            
        Returns:
            Tuple[bool, Optional[str]]: (is_valid, error_message)
        """
        try:
            # 1. Buscar OTP más reciente no verificado
            response = self.supabase.table('otp_codes')\
                .select('*')\
                .eq('phone', phone)\
                .eq('verified', False)\
                .order('created_at', desc=True)\
                .limit(1)\
                .execute()
            
            if not response.data or len(response.data) == 0:
                return False, "No se encontró código válido para este número"
            
            otp_record = response.data[0]
            
            # 2. Verificar si expiró
            expires_at = datetime.fromisoformat(
                otp_record['expires_at'].replace('Z', '+00:00')
            )
            if datetime.utcnow().replace(tzinfo=expires_at.tzinfo) > expires_at:
                return False, "El código ha expirado. Solicita uno nuevo."
            
            # 3. Verificar intentos
            if otp_record['attempts'] >= settings.OTP_MAX_ATTEMPTS:
                return False, (
                    f"Has excedido el máximo de {settings.OTP_MAX_ATTEMPTS} intentos. "
                    "Solicita un nuevo código."
                )
            
            # 4. Verificar código
            if otp_record['code'] != code:
                # Incrementar intentos
                self.supabase.table('otp_codes')\
                    .update({'attempts': otp_record['attempts'] + 1})\
                    .eq('id', otp_record['id'])\
                    .execute()
                
                remaining = settings.OTP_MAX_ATTEMPTS - (otp_record['attempts'] + 1)
                return False, (
                    f"Código incorrecto. Te quedan {remaining} intentos."
                )
            
            # 5. Marcar como verificado
            self.supabase.table('otp_codes')\
                .update({'verified': True})\
                .eq('id', otp_record['id'])\
                .execute()
            
            logger.info(f"OTP verified successfully for {phone}")
            return True, None
            
        except Exception as e:
            logger.error(f"Error verifying OTP for {phone}: {e}")
            return False, f"Error al verificar código: {str(e)}"
    
    async def cleanup_expired_otps(self) -> int:
        """
        Delete expired and verified OTP codes
        
        Returns:
            int: Number of deleted records
        """
        try:
            # Llamar función SQL de limpieza (sin parámetros)
            response = self.supabase.rpc('delete_expired_otps', {}).execute()
            
            # La función SQL retorna directamente un INTEGER
            deleted_count = response.data if isinstance(response.data, int) else 0
            
            if deleted_count > 0:
                logger.info(f"Cleaned up {deleted_count} expired OTP codes")
            else:
                logger.debug("No expired OTP codes to clean")
            
            return deleted_count
            
        except Exception as e:
            logger.warning(f"Could not cleanup OTPs (non-critical): {e}")
            return 0


# Singleton instance
otp_service = OTPService()