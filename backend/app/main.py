"""
Tec360 Seguridad - Backend API
FastAPI application entry point
"""
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings
from app.api import example, services, technicians, ratings, maps, images, auth, uploads
from app.api import ws as websocket_router
import logging
import time

# Configurar logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# --- Determine docs availability ---
docs_url = "/docs" if settings.ENVIRONMENT != "production" else None
redoc_url = "/redoc" if settings.ENVIRONMENT != "production" else None

# Inicializar FastAPI
app = FastAPI(
    title=settings.APP_NAME,
    description="API para conectar usuarios con técnicos certificados del SENA",
    version=settings.VERSION,
    docs_url=docs_url,
    redoc_url=redoc_url,
)


# --- Security Headers Middleware ---
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)


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
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Error interno del servidor",
            "detail": str(exc) if settings.DEBUG else "Contacta al administrador"
        }
    )


# --- Routers ---
app.include_router(auth.router)
app.include_router(example.router)
app.include_router(services.router)
app.include_router(technicians.router)
app.include_router(ratings.router)
app.include_router(maps.router)
app.include_router(images.router)
app.include_router(uploads.router)
app.include_router(websocket_router.router)

# Location tracking
from app.api import location as location_router
app.include_router(location_router.router)

# Notifications
from app.api import notifications as notifications_router
app.include_router(notifications_router.router)

# Quotations
from app.api import quotations as quotations_router
app.include_router(quotations_router.router)

# Simulation (development only — excluded in production)
if settings.ENVIRONMENT != "production":
    from app.api import simulate as simulate_router
    app.include_router(simulate_router.router)


# --- Health Checks ---
_start_time = time.time()

@app.get("/")
async def root():
    return {
        "message": "Tec360 backend running",
        "status": "healthy",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


@app.get("/health")
async def health():
    """Health check with DB ping"""
    db_status = "unknown"
    try:
        from app.core.database import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    uptime_seconds = int(time.time() - _start_time)

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "uptime_seconds": uptime_seconds,
        "database": db_status,
        "features": {
            "sms_enabled": bool(settings.TWILIO_ACCOUNT_SID),
            "maps_enabled": bool(settings.GOOGLE_MAPS_API_KEY),
            "docs_enabled": docs_url is not None,
        },
    }


# Event handlers
@app.on_event("startup")
async def startup_event():
    print("\n" + "=" * 50)
    print("🚀 Tec360 Seguridad API iniciada")
    print("=" * 50)
    print(f"📍 Entorno: {settings.ENVIRONMENT}")
    print(f"🗄️  Database: {'configurada' if settings.DATABASE_URL else '❌ no configurada'}")
    print(f"📱 Twilio: {'✅' if settings.TWILIO_ACCOUNT_SID else '❌'}")
    print(f"🗺️  Google Maps: {'✅' if settings.GOOGLE_MAPS_API_KEY else '❌'}")
    print(f"🌐 CORS origins: {', '.join(settings.ALLOWED_ORIGINS)}")
    if docs_url:
        print(f"📚 Docs: http://{settings.HOST}:{settings.PORT}{docs_url}")
    else:
        print("📚 Docs: deshabilitados (producción)")
    print("=" * 50 + "\n")

    # Limpiar OTPs expirados al iniciar
    try:
        from app.services.otp_service import otp_service
        deleted = await otp_service.cleanup_expired_otps()
        if deleted > 0:
            logger.info(f"Limpiados {deleted} códigos OTP expirados al iniciar")
    except Exception as e:
        logger.warning(f"No se pudieron limpiar OTPs expirados: {e}")


@app.on_event("shutdown")
async def shutdown_event():
    print("\n👋 Cerrando Tec360 Seguridad API\n")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )