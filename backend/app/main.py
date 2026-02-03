"""
Tec360 Seguridad - Backend API
FastAPI application entry point
"""
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.core.config import settings
from app.api import example, services, technicians, ratings, maps, images, auth
from app.api import ws as websocket_router
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Inicializar FastAPI
app = FastAPI(
    title="Tec360 Seguridad API",
    description="API para conectar usuarios con técnicos certificados del SENA",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir archivos estáticos (imágenes)
from fastapi.staticfiles import StaticFiles
import os
static_dir = os.path.join(os.getcwd(), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Exception Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handler para errores de validación de Pydantic
    Retorna mensajes de error más amigables
    """
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"])
        message = error["msg"]
        errors.append(f"{field}: {message}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": "Datos inválidos",
            "details": errors
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """
    Handler para errores no controlados
    """
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Error interno del servidor",
            "detail": str(exc) if settings.DEBUG else "Contacta al administrador"
        }
    )


# Incluir routers
app.include_router(auth.router)        # ✨ NUEVO: Router de autenticación
app.include_router(example.router)
app.include_router(services.router)
app.include_router(technicians.router)
app.include_router(ratings.router)
app.include_router(maps.router)
app.include_router(images.router)
app.include_router(websocket_router.router)  # 🔌 WebSocket para tracking en tiempo real

# Location tracking
from app.api import location as location_router
app.include_router(location_router.router)  # 📍 Location tracking


# Ruta de health check
@app.get("/")
async def root():
    """
    Health check endpoint
    Confirma que el backend está funcionando
    """
    return {
        "message": "Tec360 backend running",
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }


@app.get("/health")
async def health():
    """Health check detallado"""
    return {
        "status": "healthy",
        "database": "connected",
        "version": "1.0.0",
        "features": {
            "otp_auth": True,
            "sms_enabled": bool(settings.TWILIO_ACCOUNT_SID),
            "maps_enabled": bool(settings.GOOGLE_MAPS_API_KEY)
        }
    }


# Event handlers
@app.on_event("startup")
async def startup_event():
    """
    Se ejecuta al iniciar la aplicación
    Aquí puedes inicializar conexiones, caché, etc.
    """
    print("\n" + "="*50)
    print("🚀 Tec360 Seguridad API iniciada")
    print("="*50)
    print(f"📍 Entorno: {settings.ENVIRONMENT}")
    print(f"🔗 Supabase URL: {settings.SUPABASE_URL}")
    print(f"📱 Twilio configurado: {'✅' if settings.TWILIO_ACCOUNT_SID else '❌'}")
    print(f"🗺️  Google Maps configurado: {'✅' if settings.GOOGLE_MAPS_API_KEY else '❌'}")
    print(f"🌐 CORS origins: {', '.join(settings.ALLOWED_ORIGINS)}")
    print(f"📚 Docs disponibles en: http://{settings.HOST}:{settings.PORT}/docs")
    print("="*50 + "\n")
    
    # Opcional: Limpiar OTPs expirados al iniciar
    try:
        from app.services.otp_service import otp_service
        deleted = await otp_service.cleanup_expired_otps()
        if deleted > 0:
            logger.info(f"Limpiados {deleted} códigos OTP expirados al iniciar")
    except Exception as e:
        logger.warning(f"No se pudieron limpiar OTPs expirados: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Se ejecuta al cerrar la aplicación
    Limpieza de recursos
    """
    print("\n👋 Cerrando Tec360 Seguridad API\n")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )