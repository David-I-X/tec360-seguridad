"""
SMS Service using Twilio
"""
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class SMSService:
    """Service for sending SMS messages via Twilio"""
    
    def __init__(self):
        """Initialize Twilio client"""
        try:
            self.client = Client(
                settings.TWILIO_ACCOUNT_SID,
                settings.TWILIO_AUTH_TOKEN
            )
            self.from_number = settings.TWILIO_PHONE_NUMBER
            logger.info("Twilio client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Twilio client: {e}")
            raise
    
    async def send_otp(self, phone: str, code: str) -> bool:
        """
        Send OTP code via SMS
        
        Args:
            phone: Phone number in international format (+57...)
            code: OTP code to send
            
        Returns:
            bool: True if sent successfully, False otherwise
        """
        try:
            message_body = (
                f"Tu código de verificación para Tec360 es: {code}\n\n"
                f"Este código expira en 5 minutos.\n"
                f"Si no solicitaste este código, ignora este mensaje."
            )
            
            message = self.client.messages.create(
                body=message_body,
                from_=self.from_number,
                to=phone
            )
            
            logger.info(f"SMS sent successfully to {phone}. SID: {message.sid}")
            return True
            
        except TwilioRestException as e:
            logger.error(f"Twilio error sending SMS to {phone}: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending SMS to {phone}: {e}")
            return False
    
    async def send_welcome(self, phone: str, name: str) -> bool:
        """
        Send welcome message to new user
        
        Args:
            phone: Phone number in international format
            name: User's name
            
        Returns:
            bool: True if sent successfully
        """
        try:
            message_body = (
                f"¡Bienvenido a Tec360, {name}! 🎉\n\n"
                f"Tu cuenta ha sido verificada exitosamente.\n"
                f"Ahora puedes solicitar servicios de técnicos certificados."
            )
            
            message = self.client.messages.create(
                body=message_body,
                from_=self.from_number,
                to=phone
            )
            
            logger.info(f"Welcome SMS sent to {phone}. SID: {message.sid}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending welcome SMS to {phone}: {e}")
            return False


# Singleton instance
sms_service = SMSService()