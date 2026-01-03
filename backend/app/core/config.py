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
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")
    WOMPI_API_KEY: str = os.getenv("WOMPI_API_KEY", "")
    
    # CORS - Orígenes permitidos
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",  # Frontend local
        "http://localhost:5173",  # Vite (alternativa)
        "https://tec360-seguridad.vercel.app",  # Frontend en producción
    ]
    
    # Configuración de servidor
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
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
    
    if not settings.SUPABASE_URL:
        errors.append("❌ SUPABASE_URL no está configurada")
    
    if not settings.SUPABASE_KEY:
        errors.append("❌ SUPABASE_KEY no está configurada")
    
    if not settings.SECRET_KEY or settings.SECRET_KEY == "cambiar-en-produccion-super-secreto-123":
        if settings.ENVIRONMENT == "production":
            errors.append("⚠️ SECRET_KEY debe cambiarse en producción")
    
    if errors:
        print("\n".join(errors))
        if settings.ENVIRONMENT == "production":
            raise ValueError("Configuración incompleta para producción")
    else:
        print("✅ Configuración validada correctamente")

# Validar al importar este módulo
if os.getenv("SKIP_CONFIG_VALIDATION") != "true":
    validate_settings()