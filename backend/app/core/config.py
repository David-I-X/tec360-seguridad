"""
Configuración central del backend
Carga variables de entorno y expone configuraciones globales
"""
import os
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Cargar variables del archivo .env
load_dotenv()


class Settings(BaseSettings):
    """
    Configuración de la aplicación usando Pydantic
    Las variables se cargan automáticamente desde .env
    """

    # Información general
    APP_NAME: str = "Tec360 Seguridad API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "True") == "True"

    # Database (PostgreSQL propio)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "postgresql://admin:password123@127.0.0.1:5432/tec360"
    )

    # Seguridad / JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-only-secret-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # APIs externas
    GOOGLE_MAPS_API_KEY: str = os.getenv(
        "GOOGLE_MAPS_API_KEY", os.getenv("GOOGLE_API_KEY", "")
    )

    # Twilio - SMS/OTP
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")

    # OTP Settings
    OTP_LENGTH: int = int(os.getenv("OTP_LENGTH", "6"))
    OTP_EXPIRY_MINUTES: int = int(os.getenv("OTP_EXPIRY_MINUTES", "5"))
    OTP_MAX_ATTEMPTS: int = int(os.getenv("OTP_MAX_ATTEMPTS", "3"))
    OTP_RATE_LIMIT_MINUTES: int = int(os.getenv("OTP_RATE_LIMIT_MINUTES", "15"))
    OTP_RATE_LIMIT_MAX: int = int(os.getenv("OTP_RATE_LIMIT_MAX", "5"))

    # CORS - Orígenes permitidos
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",  # Frontend local
        "http://localhost:5173",  # Vite (alternativa)
    ]

    # Configuración de servidor
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    API_V1_STR: str = "/api/v1"

    class Config:
        env_file = ".env"
        case_sensitive = True


# Instancia global de configuración
settings = Settings()


# Validación de configuración crítica
def validate_settings():
    """
    Valida que las variables críticas estén configuradas
    Se debe llamar al inicio de la aplicación
    """
    errors = []
    warnings = []

    is_prod = settings.ENVIRONMENT == "production"

    # SECRET_KEY no puede ser el default en producción
    if is_prod and settings.SECRET_KEY == "dev-only-secret-change-in-production":
        errors.append("❌ SECRET_KEY debe cambiarse en producción")

    # DATABASE_URL debe estar configurada
    if not settings.DATABASE_URL:
        errors.append("❌ DATABASE_URL no está configurada")

    # Twilio (warnings, no blocking)
    if not settings.TWILIO_ACCOUNT_SID:
        warnings.append("⚠️ TWILIO_ACCOUNT_SID no configurada — SMS deshabilitado")

    if not settings.TWILIO_AUTH_TOKEN:
        warnings.append("⚠️ TWILIO_AUTH_TOKEN no configurado — SMS deshabilitado")

    if not settings.TWILIO_PHONE_NUMBER:
        warnings.append("⚠️ TWILIO_PHONE_NUMBER no configurado — SMS deshabilitado")

    # Google Maps (warning)
    if not settings.GOOGLE_MAPS_API_KEY:
        warnings.append("⚠️ GOOGLE_MAPS_API_KEY no configurada — mapas deshabilitados")

    # Mostrar resultados
    if errors:
        print("\n🚨 ERRORES DE CONFIGURACIÓN:")
        print("\n".join(errors))
        if is_prod:
            raise ValueError("Configuración incompleta para producción")

    if warnings:
        print("\n⚠️ ADVERTENCIAS:")
        print("\n".join(warnings))

    if not errors and not warnings:
        print("✅ Configuración validada correctamente")
    elif not errors:
        print("✅ Configuración básica OK (con advertencias)")


# Validar al importar este módulo
if os.getenv("SKIP_CONFIG_VALIDATION") != "true":
    validate_settings()