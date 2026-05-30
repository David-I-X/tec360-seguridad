"""
Configuración de tareas programadas (APScheduler)
Se encarga de monitorear servicios "zombie" y otras tareas periódicas.
"""
import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlmodel import Session, select
from sqlalchemy.orm import sessionmaker

from app.core.database import engine
from app.models.service import Service, ServiceStatus
from app.models.user import User

logger = logging.getLogger(__name__)

# Crear un sessionmaker para tareas asíncronas / background
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=Session)

scheduler = AsyncIOScheduler()

async def check_zombie_services():
    """
    Se ejecuta cada 30 minutos.
    Revisa servicios que lleven en estado "in_progress" mucho tiempo:
    - > 6 horas: Alerta al admin
    - > 12 horas: Alerta crítica
    """
    logger.info("Running check_zombie_services task...")
    try:
        with SessionLocal() as session:
            now = datetime.utcnow()
            six_hours_ago = now - timedelta(hours=6)
            twelve_hours_ago = now - timedelta(hours=12)

            # Buscar servicios in_progress
            zombies = session.exec(
                select(Service).where(Service.status == ServiceStatus.in_progress)
            ).all()

            from app.services.notification_service import NotificationService
            from app.schemas.notification import NotificationCreate

            for service in zombies:
                # Asumimos que started_at o updated_at marca cuando inició in_progress
                start_time = service.updated_at
                if not start_time:
                    continue

                if start_time <= twelve_hours_ago:
                    # Critical Alert (12+ hours)
                    await NotificationService.create_notification(
                        session=session,
                        data=NotificationCreate(
                            user_id=service.client_id, # Envíamos a admin/soporte en la vida real
                            title="⚠️ Servicio Zombie Crítico",
                            message=f"El servicio {service.id} lleva más de 12h en progreso.",
                            notification_type="system_alert",
                            service_id=service.id
                        )
                    )
                elif start_time <= six_hours_ago:
                    # Warning Alert (6+ hours)
                    await NotificationService.create_notification(
                        session=session,
                        data=NotificationCreate(
                            user_id=service.technician_id,
                            title="Recordatorio de servicio",
                            message="Llevas más de 6 horas en este servicio. ¿Olvidaste marcarlo como completado?",
                            notification_type="system_alert",
                            service_id=service.id
                        )
                    )
                    
            session.commit()
    except Exception as e:
        logger.error(f"Error in check_zombie_services: {e}")

def start_scheduler():
    """Inicia el scheduler y registra las tareas."""
    # Ejecutar check_zombie_services cada 30 minutos
    scheduler.add_job(check_zombie_services, "interval", minutes=30, id="zombie_check", replace_existing=True)
    scheduler.start()
    logger.info("APScheduler started with jobs: %s", scheduler.get_jobs())

def shutdown_scheduler():
    """Detiene el scheduler."""
    scheduler.shutdown()
    logger.info("APScheduler shut down.")
