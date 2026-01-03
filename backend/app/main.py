"""
Tec360 Seguridad - Backend API
FastAPI application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import example, services, technicians, ratings, maps, images

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

# Incluir routers
app.include_router(example.router)
app.include_router(services.router)
app.include_router(technicians.router)
app.include_router(ratings.router)
app.include_router(maps.router)
app.include_router(images.router)

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
        "version": "0.1.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )


# Event handlers
@app.on_event("startup")
async def startup_event():
    """
    Se ejecuta al iniciar la aplicación
    Aquí puedes inicializar conexiones, caché, etc.
    """
    print("🚀 Tec360 Seguridad API iniciada")
    print(f"📍 Entorno: {settings.ENVIRONMENT}")
    print(f"🔗 Supabase URL: {settings.SUPABASE_URL}")

@app.on_event("shutdown")
async def shutdown_event():
    """
    Se ejecuta al cerrar la aplicación
    Limpieza de recursos
    """
    print("👋 Cerrando Tec360 Seguridad API")