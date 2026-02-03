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
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "True") == "True"
    
    # Seguridad
    SECRET_KEY: str = os.getenv("SECRET_KEY", "cambiar-en-produccion-super-secreto-123")
    
    # Supabase - Backend para auth y database
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    
    # Database (PostgreSQL en Supabase)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # APIs externas
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
    WOMPI_API_KEY: str = os.getenv("WOMPI_API_KEY", "")
    
    # Twilio - SMS/OTP (NUEVO)
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")
    
    # OTP Settings (NUEVO)
    OTP_LENGTH: int = int(os.getenv("OTP_LENGTH", "6"))
    OTP_EXPIRY_MINUTES: int = int(os.getenv("OTP_EXPIRY_MINUTES", "5"))
    OTP_MAX_ATTEMPTS: int = int(os.getenv("OTP_MAX_ATTEMPTS", "3"))
    OTP_RATE_LIMIT_MINUTES: int = int(os.getenv("OTP_RATE_LIMIT_MINUTES", "15"))
    OTP_RATE_LIMIT_MAX: int = int(os.getenv("OTP_RATE_LIMIT_MAX", "5"))
    
    # CORS - Orígenes permitidos
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",  # Frontend local
        "http://localhost:5173",  # Vite (alternativa)
        "https://tec360-seguridad.vercel.app",  # Frontend en producción
    ]
    
    # Configuración de servidor
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Database
    DATABASE_URL: str = "postgresql://admin:password123@127.0.0.1:5432/tec360"
    
    # Auth
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    API_V1_STR: str = "/api/v1"
    
    # Old Supabase (Deprecating)
    SUPABASE_URL: str = "https://deprecated.supabase.co"
    SUPABASE_KEY: str = "deprecated"
    SUPABASE_SERVICE_KEY: str = "deprecated"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

    def __init__(self, **data):
        super().__init__(**data)
        # FORCE LOCAL DATABASE URL - Override any env var
        self.DATABASE_URL = "postgresql://admin:password123@127.0.0.1:5432/tec360"

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
    
    # Validaciones críticas (bloquean en producción)
    if not settings.SUPABASE_URL:
        errors.append("❌ SUPABASE_URL no está configurada")
    
    if not settings.SUPABASE_KEY:
        errors.append("❌ SUPABASE_KEY no está configurada")
    
    if not settings.SUPABASE_SERVICE_KEY:
        errors.append("❌ SUPABASE_SERVICE_KEY no está configurada (necesaria para auth con OTP)")
    
    if not settings.SECRET_KEY or settings.SECRET_KEY == "cambiar-en-produccion-super-secreto-123":
        if settings.ENVIRONMENT == "production":
            errors.append("⚠️ SECRET_KEY debe cambiarse en producción")
    
    # Validaciones de Twilio (críticas si se usa autenticación por teléfono)
    if not settings.TWILIO_ACCOUNT_SID:
        warnings.append("⚠️ TWILIO_ACCOUNT_SID no configurada - SMS deshabilitado")
    
    if not settings.TWILIO_AUTH_TOKEN:
        warnings.append("⚠️ TWILIO_AUTH_TOKEN no configurado - SMS deshabilitado")
    
    if not settings.TWILIO_PHONE_NUMBER:
        warnings.append("⚠️ TWILIO_PHONE_NUMBER no configurado - SMS deshabilitado")
    
    # Mostrar errores y warnings
    if errors:
        print("\n🚨 ERRORES DE CONFIGURACIÓN:")
        print("\n".join(errors))
        if settings.ENVIRONMENT == "production":
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