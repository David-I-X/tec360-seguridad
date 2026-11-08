"""
Service Layer para el Motor de Despacho Inteligente
Path: backend/app/services/dispatch_service.py
"""
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timedelta, timezone
from uuid import UUID
import logging

from fastapi import HTTPException, status
from sqlmodel import Session, select, func
from sqlalchemy import cast
from geoalchemy2 import Geography
from geoalchemy2.functions import ST_DWithin, ST_Distance

from app.models.dispatch import DispatchOffer, DispatchOfferStatus
from app.models.service import Service, ServiceStatus, ServiceType
from app.models.technician import Technician
from app.models.user import User
from app.models.schedule import TechnicianSchedule
from app.models.quotation import Quotation, QuotationStatus
from geoalchemy2.shape import to_shape
from app.schemas.dispatch import (
    DispatchOfferResponse,
    DispatchOfferListResponse,
    DispatchOfferActionResponse,
    DispatchStatsResponse,
    HeatmapPoint,
    HeatmapResponse,
    DemandHotspot,
    DemandHotspotsResponse,
    WaveConversionItem,
    DispatchAnalyticsResponse,
)

logger = logging.getLogger(__name__)


# Constantes de configuración de despacho por línea de servicio
WAVE_CONFIG = {
    # 1. Recuperación 24/7: Máxima urgencia, olas rápidas
    "vehicle_recovery": {
        1: {"radius_km": 20, "timeout_seconds": 35, "max_candidates": 3},
        2: {"radius_km": 35, "timeout_seconds": 35, "max_candidates": 5},
        3: {"radius_km": 50, "timeout_seconds": 45, "max_candidates": 8},
    },
    # 2. Mecánica Rápida: Despacho directo a top 3
    "quick_mechanics": {
        1: {"radius_km": 15, "timeout_seconds": 60, "max_candidates": 3},
        2: {"radius_km": 25, "timeout_seconds": 60, "max_candidates": 5},
        3: {"radius_km": 40, "timeout_seconds": 75, "max_candidates": 6},
    },
    # 3. Instalaciones / Alarmas / GPS: Marketplace dirigido a los mejores puntuados
    "default": {
        1: {"radius_km": 20, "timeout_seconds": 90, "max_candidates": 5},
        2: {"radius_km": 35, "timeout_seconds": 90, "max_candidates": 8},
        3: {"radius_km": 50, "timeout_seconds": 120, "max_candidates": 10},
    },
}

QUICK_MECHANICS_TYPES = {
    ServiceType.oil_change,
    ServiceType.tire_change,
    ServiceType.battery_service,
    ServiceType.brake_service,
    ServiceType.chain_kit_service,
    ServiceType.spark_bulbs_wipers,
}


class DispatchService:
    """Motor de despacho inteligente con asignación escalonada y scoring multi-factor."""

    @staticmethod
    def _get_wave_rules(service_type: ServiceType, wave: int) -> dict:
        """Determina la configuración de radio y timeout según el tipo de servicio y número de ola."""
        if service_type == ServiceType.vehicle_recovery:
            config_group = WAVE_CONFIG["vehicle_recovery"]
        elif service_type in QUICK_MECHANICS_TYPES:
            config_group = WAVE_CONFIG["quick_mechanics"]
        else:
            config_group = WAVE_CONFIG["default"]

        return config_group.get(wave, config_group[max(config_group.keys())])

    @staticmethod
    async def compute_traffic_eta_minutes(
        tech_lat: float, tech_lon: float, dest_lat: float, dest_lon: float
    ) -> Optional[float]:
        """Calcula el tiempo de viaje con tráfico en minutos usando Google Routes API con fallback fluido."""
        from app.core.config import settings
        if not settings.GOOGLE_MAPS_API_KEY:
            return None

        import httpx
        try:
            async with httpx.AsyncClient(timeout=2.5) as client:
                res = await client.post(
                    "https://routes.googleapis.com/directions/v2:computeRoutes",
                    headers={
                        "X-Goog-Api-Key": settings.GOOGLE_MAPS_API_KEY,
                        "X-Goog-FieldMask": "routes.duration",
                        "Content-Type": "application/json",
                    },
                    json={
                        "origin": {"location": {"latLng": {"latitude": tech_lat, "longitude": tech_lon}}},
                        "destination": {"location": {"latLng": {"latitude": dest_lat, "longitude": dest_lon}}},
                        "travelMode": "DRIVE",
                        "routingPreference": "TRAFFIC_AWARE",
                    }
                )
                if res.status_code == 200:
                    routes = res.json().get("routes", [])
                    if routes:
                        dur_str = routes[0].get("duration", "0s").rstrip("s")
                        return round(float(dur_str) / 60.0, 1)
        except Exception as e:
            logger.debug(f"Routes API traffic ETA fallback: {e}")
        return None

    @staticmethod
    def calculate_technician_score(
        tech: Technician,
        user: User,
        service: Service,
        distance_meters: float,
        active_services_count: int,
        max_radius_km: float = 20.0,
        eta_minutes: Optional[float] = None
    ) -> float:
        """
        Calcula el puntaje multi-factor normalizado (0.0 a 1.0):
        Score = 0.40 * Proximidad/ETA + 0.20 * Rating + 0.15 * Confiabilidad + 0.10 * Rango + 0.10 * Carga + 0.05 * Especialidad
        """
        # 1. Proximidad o ETA de tráfico normalizado (más rápido / cerca = mayor puntaje)
        if eta_minutes is not None and eta_minutes > 0:
            max_eta_minutes = max(10.0, max_radius_km * 2.5)
            score_dist = max(0.0, 1.0 - (eta_minutes / max_eta_minutes))
        else:
            dist_km = distance_meters / 1000.0
            score_dist = max(0.0, 1.0 - (dist_km / max(max_radius_km, 1.0)))

        # 2. Rating normalizado (0 a 5)
        raw_rating = float(tech.average_rating or 0.0)
        score_rating = min(1.0, max(0.0, raw_rating / 5.0))

        # 3. Tasa de confiabilidad (penaliza cancelaciones en última semana)
        weekly_cancels = tech.cancellation_week_count or 0
        score_acc = max(0.0, 1.0 - (weekly_cancels / 3.0))

        # 4. Rango del técnico
        rank_weights = {
            "bronze": 0.25,
            "silver": 0.50,
            "gold": 0.75,
            "elite": 1.00,
        }
        score_rank = rank_weights.get(str(tech.rank).lower(), 0.25)

        # 5. Carga de trabajo actual (1.0 libre, 0.2 si tiene servicios activos)
        score_load = 1.0 if active_services_count == 0 else 0.20

        # 6. Coincidencia de especialización
        specializations = tech.specializations or []
        st_val = str(service.service_type.value) if hasattr(service.service_type, "value") else str(service.service_type)
        score_spec = 1.0 if st_val in specializations else 0.50

        # Ponderación final
        total_score = (
            0.40 * score_dist +
            0.20 * score_rating +
            0.15 * score_acc +
            0.10 * score_rank +
            0.10 * score_load +
            0.05 * score_spec
        )
        return round(total_score, 4)

    async def initiate_dispatch(self, session: Session, service_id: UUID) -> List[DispatchOffer]:
        """Punto de entrada: dispara la primera ola de despacho para un servicio nuevo."""
        return await self.create_wave(session=session, service_id=service_id, wave_number=1)

    async def create_wave(
        self,
        session: Session,
        service_id: UUID,
        wave_number: int = 1
    ) -> List[DispatchOffer]:
        """Genera y emite las ofertas de una ola de despacho para los técnicos mejor evaluados."""
        service = session.exec(
            select(Service).where(Service.id == service_id).with_for_update()
        ).first()

        if not service or not service.service_location:
            logger.info(f"Despacho omitido para servicio {service_id}: sin ubicación.")
            return []

        if service.status not in (ServiceStatus.pending, ServiceStatus.quoted) or service.technician_id is not None:
            logger.info(f"Despacho cancelado para servicio {service_id}: estado no asignable ({service.status}).")
            return []

        rules = self._get_wave_rules(service.service_type, wave_number)
        radius_km = rules["radius_km"]
        timeout_seconds = rules["timeout_seconds"]
        max_candidates = rules["max_candidates"]
        max_distance_meters = radius_km * 1000

        # Zona horaria Colombia (UTC-5)
        bogota_tz = timezone(timedelta(hours=-5))
        now_colombia = datetime.now(bogota_tz)
        current_day = now_colombia.weekday()
        current_time = now_colombia.time()

        # Determinar rol compatible
        target_role = "reaction_team" if service.service_type == ServiceType.vehicle_recovery else "technician"

        # Obtener IDs de técnicos que ya han recibido oferta para este servicio
        offered_tech_ids = session.exec(
            select(DispatchOffer.technician_id).where(DispatchOffer.service_id == service_id)
        ).all()

        # Query geoespacial de técnicos disponibles
        now_utc = datetime.utcnow()
        query = select(
            Technician,
            User,
            ST_Distance(
                cast(Technician.current_location, Geography),
                cast(service.service_location, Geography)
            ).label("distance_meters")
        ).join(
            User, Technician.user_id == User.id
        ).join(
            TechnicianSchedule, Technician.user_id == TechnicianSchedule.technician_id
        ).where(
            Technician.is_available,
            (Technician.suspended_until.is_(None)) | (Technician.suspended_until < now_utc),
            User.is_active,
            User.role == target_role,
            TechnicianSchedule.day_of_week == current_day,
            TechnicianSchedule.is_active,
            TechnicianSchedule.start_time <= current_time,
            TechnicianSchedule.end_time >= current_time,
            Technician.current_location.is_not(None),
            ST_DWithin(
                cast(Technician.current_location, Geography),
                cast(service.service_location, Geography),
                max_distance_meters
            )
        )

        if offered_tech_ids:
            query = query.where(User.id.notin_(offered_tech_ids))

        raw_candidates = session.exec(query).all()

        # Deduplicar por técnico y verificar radio individual
        scored_candidates: List[Tuple[float, float, Technician, User]] = []
        seen_user_ids = set()

        for tech, user, distance in raw_candidates:
            if user.id in seen_user_ids:
                continue
            if distance > (tech.service_radius_km * 1000):
                continue
            seen_user_ids.add(user.id)

            # Carga activa
            active_count = session.exec(
                select(func.count(Service.id)).where(
                    Service.technician_id == user.id,
                    Service.status.in_([ServiceStatus.assigned, ServiceStatus.en_route, ServiceStatus.in_progress])
                )
            ).one()

            score = self.calculate_technician_score(
                tech=tech,
                user=user,
                service=service,
                distance_meters=distance,
                active_services_count=active_count,
                max_radius_km=radius_km
            )
            scored_candidates.append((score, distance, tech, user))

        # Ordenar por score descendente
        scored_candidates.sort(key=lambda x: x[0], reverse=True)
        top_candidates = scored_candidates[:max_candidates]

        if not top_candidates:
            logger.info(f"Ola {wave_number}: sin candidatos disponibles para servicio {service_id}.")
            if wave_number == 1:
                # Fallback: Notificar al marketplace general para no bloquear el servicio
                try:
                    from app.services.notification_service import NotificationService
                    await NotificationService.notify_technicians_new_service(
                        session=session,
                        service_id=service.id,
                        service_title=service.title,
                        service_city=service.service_address.split(",")[-1].strip() if service.service_address else "Colombia",
                        service_type=str(service.service_type.value) if hasattr(service.service_type, "value") else str(service.service_type)
                    )
                except Exception as notif_err:
                    logger.warning(f"Fallback notification failed: {notif_err}")
            return []

        # Crear registros DispatchOffer y notificar
        expires_at = datetime.utcnow() + timedelta(seconds=timeout_seconds)
        created_offers: List[DispatchOffer] = []

        from app.services.push_service import push_service
        from app.services.notification_service import NotificationService
        from app.schemas.notification import NotificationCreate

        for score, distance, tech, user in top_candidates:
            offer = DispatchOffer(
                service_id=service.id,
                technician_id=user.id,
                wave=wave_number,
                status=DispatchOfferStatus.offered,
                score=score,
                distance_km=round(distance / 1000.0, 2),
                offered_at=datetime.utcnow(),
                expires_at=expires_at,
            )
            session.add(offer)
            created_offers.append(offer)

            # Notificación push dirigida
            try:
                offer_title = "🚨 NUEVA MISIÓN PRIORITARIA" if service.service_type == ServiceType.vehicle_recovery else "🎯 OFERTA DE SERVICIO EXCLUSIVA"
                offer_body = f"Tienes {timeout_seconds}s para aceptar: '{service.title}' a {round(distance/1000.0, 1)}km."

                await push_service.send_push_notification(
                    user_id=str(user.id),
                    title=offer_title,
                    body=offer_body,
                    data={
                        "type": "dispatch_offer",
                        "offer_id": str(offer.id),
                        "service_id": str(service.id),
                        "timeout_seconds": timeout_seconds,
                    }
                )
            except Exception as push_err:
                logger.warning(f"Error enviando push de oferta a {user.id}: {push_err}")

            # Notificación persistente
            try:
                await NotificationService.create_notification(
                    session=session,
                    data=NotificationCreate(
                        user_id=user.id,
                        title=f"⚡ Oferta de Despacho (Ola {wave_number})",
                        message=f"Servicio prioritario asignado a tu zona ({round(distance/1000.0, 1)} km). Toca para ver la oferta.",
                        notification_type="dispatch_offer",
                        service_id=service.id
                    )
                )
            except Exception as notif_err:
                logger.warning(f"Error creando notificación persistente: {notif_err}")

        session.commit()

        # Broadcast via WebSocket a la sala de despachos
        try:
            from app.core.websocket_manager import ws_manager
            for offer in created_offers:
                await ws_manager.broadcast_to_service(
                    service_id=str(service.id),
                    message={
                        "type": "dispatch_offer_created",
                        "data": {
                            "offer_id": str(offer.id),
                            "technician_id": str(offer.technician_id),
                            "wave": wave_number,
                            "expires_at": expires_at.isoformat(),
                        }
                    }
                )
        except Exception as ws_err:
            logger.warning(f"WS broadcast dispatch_offer_created failed: {ws_err}")

        logger.info(f"Ola {wave_number} lanzada exitosamente para servicio {service_id} con {len(created_offers)} ofertas.")
        return created_offers

    async def accept_offer(
        self,
        session: Session,
        offer_id: str,
        technician_id: str,
        assigned_by_org: bool = False,
    ) -> DispatchOfferActionResponse:
        """Aceptación atómica de una oferta: el primer técnico en aceptar gana la asignación."""
        try:
            offer_uuid = UUID(offer_id)
            tech_uuid = UUID(technician_id)
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID inválido")

        from app.services.credit_service import credit_service
        org_membership = credit_service.get_active_org_membership(session, str(tech_uuid))
        if org_membership:
            org, member = org_membership
            if member.org_role == "owner":
                raise HTTPException(
                    status.HTTP_403_FORBIDDEN,
                    "OWNER_CANNOT_OPERATE: El dueño del taller no puede aceptar ofertas como técnico de campo.",
                )
            if org.dispatch_mode == "manual" and not assigned_by_org:
                raise HTTPException(
                    status.HTTP_403_FORBIDDEN,
                    f"MANUAL_DISPATCH_MODE: Tu taller ({org.name}) tiene activada la asignación centralizada. El administrador del taller es quien asigna los trabajos.",
                )

        # 1. Row locks atómicos sobre la oferta y el servicio
        offer = session.exec(
            select(DispatchOffer).where(DispatchOffer.id == offer_uuid).with_for_update()
        ).first()

        if not offer:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Oferta no encontrada")

        if offer.technician_id != tech_uuid:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Esta oferta no está dirigida a ti")

        if offer.status != DispatchOfferStatus.offered:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Esta oferta ya no está disponible (estado: {offer.status})"
            )

        now = datetime.utcnow()
        if offer.expires_at < now:
            offer.status = DispatchOfferStatus.expired
            session.add(offer)
            session.commit()
            raise HTTPException(status.HTTP_410_GONE, "El tiempo límite para aceptar esta oferta ha expirado")

        service = session.exec(
            select(Service).where(Service.id == offer.service_id).with_for_update()
        ).first()

        if not service or service.status not in (ServiceStatus.pending, ServiceStatus.quoted) or service.technician_id is not None:
            offer.status = DispatchOfferStatus.cancelled
            session.add(offer)
            session.commit()
            raise HTTPException(status.HTTP_409_CONFLICT, "Este servicio ya fue tomado por otro técnico o no está disponible")

        # 1.5 Validar curso obligatorio o validación admin (para técnicos regulares)
        from app.api.courses import get_technician_course_gate_status
        course_gate = get_technician_course_gate_status(session, str(tech_uuid))
        if not course_gate["can_operate"]:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "COURSE_REQUIRED: Debes realizar primero el curso obligatorio en Escuela Tec360 antes de aceptar o cotizar un trabajo."
            )

        # 2. Descontar créditos del técnico
        try:
            from app.services.credit_service import credit_service
            service_amount = service.estimated_price or 0
            check = await credit_service.can_accept_service(session, str(tech_uuid), service_amount)
            if not check["can_accept"]:
                raise HTTPException(
                    status.HTTP_402_PAYMENT_REQUIRED,
                    f"Créditos insuficientes para aceptar el servicio: {check['reason']}"
                )
            await credit_service.deduct_for_service(
                session=session,
                technician_id=str(tech_uuid),
                service_id=str(service.id),
                service_amount=service_amount
            )
        except HTTPException:
            raise
        except Exception as cred_err:
            logger.warning(f"Credit check skipped on dispatch accept: {cred_err}")

        # 3. Marcar oferta ganadora y asignar servicio
        offer.status = DispatchOfferStatus.accepted
        offer.responded_at = now
        offer.updated_at = now
        session.add(offer)

        service.technician_id = tech_uuid
        service.status = ServiceStatus.assigned
        service.updated_at = now
        session.add(service)

        # 4. Cancelar automáticamente todas las demás ofertas de este servicio
        other_offers = session.exec(
            select(DispatchOffer).where(
                DispatchOffer.service_id == service.id,
                DispatchOffer.id != offer.id,
                DispatchOffer.status == DispatchOfferStatus.offered
            )
        ).all()
        for other in other_offers:
            other.status = DispatchOfferStatus.cancelled
            other.updated_at = now
            session.add(other)

        # 5. Rechazar cotizaciones abiertas
        open_quotes = session.exec(
            select(Quotation).where(
                Quotation.service_id == service.id,
                Quotation.status.in_([QuotationStatus.pending, QuotationStatus.counter_offered])
            )
        ).all()
        for oq in open_quotes:
            oq.status = QuotationStatus.rejected
            oq.client_response = "El servicio fue asignado mediante despacho inteligente"
            oq.updated_at = now
            session.add(oq)

        session.commit()

        # 6. Notificaciones WebSocket y persistentes
        technician = session.exec(select(User).where(User.id == tech_uuid)).first()
        try:
            from app.core.websocket_manager import ws_manager
            await ws_manager.broadcast_service_status(
                service_id=str(service.id),
                status="assigned",
                extra_data={
                    "technician": {
                        "id": str(tech_uuid),
                        "full_name": technician.full_name if technician else "Técnico",
                    }
                }
            )
        except Exception as ws_err:
            logger.warning(f"WS broadcast failed: {ws_err}")

        try:
            from app.services.notification_service import NotificationService
            await NotificationService.notify_client_service_update(
                session=session,
                client_id=service.client_id,
                service_id=service.id,
                status="assigned",
                technician_name=technician.full_name if technician else None
            )
        except Exception as notif_err:
            logger.warning(f"Notification to client failed: {notif_err}")

        return DispatchOfferActionResponse(
            success=True,
            offer_id=str(offer.id),
            status=DispatchOfferStatus.accepted.value,
            message="¡Misión aceptada con éxito! Has sido asignado al servicio.",
            service_id=str(service.id),
            service_status=service.status.value
        )

    async def reject_offer(
        self,
        session: Session,
        offer_id: str,
        technician_id: str
    ) -> DispatchOfferActionResponse:
        """Permite a un técnico declinar una oferta de despacho."""
        try:
            offer_uuid = UUID(offer_id)
            tech_uuid = UUID(technician_id)
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID inválido")

        offer = session.exec(
            select(DispatchOffer).where(DispatchOffer.id == offer_uuid).with_for_update()
        ).first()

        if not offer:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Oferta no encontrada")

        if offer.technician_id != tech_uuid:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No autorizado")

        if offer.status != DispatchOfferStatus.offered:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"La oferta no está pendiente ({offer.status})")

        now = datetime.utcnow()
        offer.status = DispatchOfferStatus.rejected
        offer.responded_at = now
        offer.updated_at = now
        session.add(offer)
        session.commit()

        return DispatchOfferActionResponse(
            success=True,
            offer_id=str(offer.id),
            status=DispatchOfferStatus.rejected.value,
            message="Oferta rechazada.",
            service_id=str(offer.service_id)
        )

    async def get_technician_offers(
        self,
        session: Session,
        technician_id: str,
        active_only: bool = True
    ) -> DispatchOfferListResponse:
        """Obtiene las ofertas dirigidas al técnico autenticado."""
        tech_uuid = UUID(technician_id)
        now = datetime.utcnow()

        query = select(DispatchOffer, Service).join(
            Service, DispatchOffer.service_id == Service.id
        ).where(DispatchOffer.technician_id == tech_uuid)

        if active_only:
            query = query.where(
                DispatchOffer.status == DispatchOfferStatus.offered,
                DispatchOffer.expires_at >= now
            )

        query = query.order_by(DispatchOffer.created_at.desc())
        results = session.exec(query).all()

        offers_parsed: List[DispatchOfferResponse] = []
        for offer, service in results:
            time_left = max(0, int((offer.expires_at - now).total_seconds())) if offer.status == DispatchOfferStatus.offered else 0
            offers_parsed.append(
                DispatchOfferResponse(
                    id=str(offer.id),
                    service_id=str(offer.service_id),
                    technician_id=str(offer.technician_id),
                    wave=offer.wave,
                    status=offer.status.value,
                    score=offer.score,
                    distance_km=offer.distance_km,
                    offered_at=offer.offered_at,
                    expires_at=offer.expires_at,
                    responded_at=offer.responded_at,
                    time_left_seconds=time_left,
                    service_title=service.title,
                    service_type=service.service_type.value if hasattr(service.service_type, "value") else str(service.service_type),
                    service_address=service.service_address,
                    service_city=service.service_city if hasattr(service, "service_city") else "Medellín",
                    estimated_price=float(service.estimated_price) if service.estimated_price else None,
                    vehicle_type=service.vehicle_type,
                    vehicle_model=service.vehicle_model,
                    vehicle_plate=service.vehicle_plate,
                )
            )

        return DispatchOfferListResponse(
            offers=offers_parsed,
            total=len(offers_parsed)
        )

    async def check_and_advance_waves(self, session: Session) -> Dict[str, Any]:
        """Tarea periódica del scheduler: expira ofertas vencidas y lanza la siguiente ola."""
        now = datetime.utcnow()
        expired_offers = session.exec(
            select(DispatchOffer).where(
                DispatchOffer.status == DispatchOfferStatus.offered,
                DispatchOffer.expires_at < now
            )
        ).all()

        services_to_check: set[UUID] = set()
        for off in expired_offers:
            off.status = DispatchOfferStatus.expired
            off.updated_at = now
            session.add(off)
            services_to_check.add(off.service_id)

        session.commit()

        advanced_count = 0
        exhausted_count = 0

        for s_id in services_to_check:
            service = session.exec(select(Service).where(Service.id == s_id)).first()
            if not service or service.status not in (ServiceStatus.pending, ServiceStatus.quoted) or service.technician_id is not None:
                continue

            # Verificar si todavía quedan ofertas activas para este servicio
            active_remaining = session.exec(
                select(func.count(DispatchOffer.id)).where(
                    DispatchOffer.service_id == s_id,
                    DispatchOffer.status == DispatchOfferStatus.offered,
                    DispatchOffer.expires_at >= now
                )
            ).one()

            if active_remaining > 0:
                continue

            # Obtener la ola máxima ejecutada
            max_wave = session.exec(
                select(func.max(DispatchOffer.wave)).where(DispatchOffer.service_id == s_id)
            ).one() or 1

            if max_wave < 3:
                next_wave = max_wave + 1
                logger.info(f"Avanzando servicio {s_id} a Ola {next_wave}...")
                new_offers = await self.create_wave(session=session, service_id=s_id, wave_number=next_wave)
                if new_offers:
                    advanced_count += 1
                else:
                    exhausted_count += 1
            else:
                # Olas agotadas: Abrir a marketplace general y alertar al cliente/admin
                metadata = dict(service.service_metadata or {})
                if not metadata.get("dispatch_waves_exhausted"):
                    metadata["dispatch_waves_exhausted"] = True
                    service.service_metadata = metadata
                    session.add(service)
                    session.commit()
                    exhausted_count += 1

                    try:
                        from app.services.notification_service import NotificationService
                        await NotificationService.notify_technicians_new_service(
                            session=session,
                            service_id=service.id,
                            service_title=service.title,
                            service_city=service.service_address.split(",")[-1].strip() if service.service_address else "Colombia",
                            service_type=str(service.service_type.value) if hasattr(service.service_type, "value") else str(service.service_type)
                        )
                    except Exception as fallback_err:
                        logger.warning(f"Fallback broadcast on wave exhaust failed: {fallback_err}")

        return {
            "expired_offers_count": len(expired_offers),
            "waves_advanced": advanced_count,
            "exhausted_services": exhausted_count
        }

    async def get_dispatch_stats(self, session: Session) -> DispatchStatsResponse:
        """Retorna indicadores agregados de rendimiento del despacho."""
        total = session.exec(select(func.count(DispatchOffer.id))).one()
        accepted = session.exec(select(func.count(DispatchOffer.id)).where(DispatchOffer.status == DispatchOfferStatus.accepted)).one()
        rejected = session.exec(select(func.count(DispatchOffer.id)).where(DispatchOffer.status == DispatchOfferStatus.rejected)).one()
        expired = session.exec(select(func.count(DispatchOffer.id)).where(DispatchOffer.status == DispatchOfferStatus.expired)).one()
        cancelled = session.exec(select(func.count(DispatchOffer.id)).where(DispatchOffer.status == DispatchOfferStatus.cancelled)).one()

        responded = accepted + rejected
        rate = round((accepted / responded) * 100.0, 2) if responded > 0 else 0.0

        return DispatchStatsResponse(
            total_offers=total,
            accepted_offers=accepted,
            rejected_offers=rejected,
            expired_offers=expired,
            cancelled_offers=cancelled,
            acceptance_rate=rate,
            avg_assignment_seconds=45.0 if accepted > 0 else None
        )

    async def get_heatmap_points(self, session: Session, days: int = 30) -> HeatmapResponse:
        """Extrae puntos geográficos ponderados por urgencia y tipo de servicio para mapa de calor."""
        since = datetime.utcnow() - timedelta(days=days)
        services = session.exec(
            select(Service).where(
                Service.service_location.is_not(None),
                Service.created_at >= since
            )
        ).all()

        points: List[HeatmapPoint] = []
        for s in services:
            try:
                pt = to_shape(s.service_location)
                # Ponderación según urgencia de la línea
                if s.service_type == ServiceType.vehicle_recovery:
                    weight = 3.0
                elif s.service_type in QUICK_MECHANICS_TYPES:
                    weight = 1.8
                else:
                    weight = 1.0

                points.append(
                    HeatmapPoint(
                        lat=float(pt.y),
                        lng=float(pt.x),
                        weight=weight,
                        service_type=s.service_type.value if hasattr(s.service_type, "value") else str(s.service_type),
                        status=s.status.value if hasattr(s.status, "value") else str(s.status),
                        created_at=s.created_at
                    )
                )
            except Exception:
                continue

        return HeatmapResponse(points=points, total_points=len(points))

    async def get_demand_hotspots(self, session: Session) -> DemandHotspotsResponse:
        """Identifica cuadrantes de alta demanda desatendida para sugerir rebalanceo a técnicos."""
        since = datetime.utcnow() - timedelta(hours=48)
        pending_services = session.exec(
            select(Service).where(
                Service.status.in_([ServiceStatus.pending, ServiceStatus.quoted]),
                Service.service_location.is_not(None),
                Service.created_at >= since
            )
        ).all()

        # Agrupar en cuadrantes de ~1.1 km redondeando coordenadas a 2 decimales
        clusters: Dict[Tuple[float, float], List[Service]] = {}
        for s in pending_services:
            try:
                pt = to_shape(s.service_location)
                grid_key = (round(float(pt.y), 2), round(float(pt.x), 2))
                clusters.setdefault(grid_key, []).append(s)
            except Exception:
                continue

        # Nombres de referencia comunes en Medellín / Valle de Aburrá
        KNOWN_SECTORS = [
            (6.21, -75.57, "El Poblado / Milla de Oro"),
            (6.24, -75.59, "Laureles / Estadio"),
            (6.25, -75.57, "Centro de Medellín"),
            (6.23, -75.59, "Belén / Los Molinos"),
            (6.17, -75.59, "Envigado Centro"),
            (6.18, -75.61, "Itagüí Industrial"),
            (6.33, -75.56, "Bello Centro"),
            (6.27, -75.58, "Robledo / Pilarica"),
        ]

        def resolve_sector_name(lat: float, lng: float) -> str:
            best_name = f"Sector Lat {lat}, Lng {lng}"
            min_d = 0.04  # ~4 km
            for k_lat, k_lng, name in KNOWN_SECTORS:
                d = ((lat - k_lat)**2 + (lng - k_lng)**2)**0.5
                if d < min_d:
                    min_d = d
                    best_name = name
            return best_name

        hotspots: List[DemandHotspot] = []
        # Ordenar cuadrantes por cantidad de solicitudes descendente
        sorted_clusters = sorted(clusters.items(), key=lambda item: len(item[1]), reverse=True)

        for (c_lat, c_lng), s_list in sorted_clusters[:10]:
            count = len(s_list)
            has_recovery = any(s.service_type == ServiceType.vehicle_recovery for s in s_list)
            sector_name = resolve_sector_name(c_lat, c_lng)

            if has_recovery or count >= 3:
                urgency = "high"
                recom = f"Prioridad alta: {count} servicio(s) en espera (incluye emergencias). Rebalancear técnicos a este sector."
            elif count >= 2:
                urgency = "medium"
                recom = f"Demanda activa: {count} servicios solicitados. Buena oportunidad de asignación inmediata."
            else:
                urgency = "normal"
                recom = f"Demanda moderada: {count} servicio pendiente."

            hotspots.append(
                DemandHotspot(
                    zone_name=sector_name,
                    center_lat=c_lat,
                    center_lng=c_lng,
                    active_requests_count=count,
                    urgency_level=urgency,
                    recommendation=recom
                )
            )

        return DemandHotspotsResponse(hotspots=hotspots, total=len(hotspots))

    async def get_advanced_analytics(self, session: Session, days: int = 30) -> DispatchAnalyticsResponse:
        """Calcula telemetría avanzada, percentiles de asignación y embudo por ola."""
        since = datetime.utcnow() - timedelta(days=days)

        offers = session.exec(
            select(DispatchOffer).where(DispatchOffer.created_at >= since)
        ).all()

        total_offers = len(offers)
        accepted_offers = [o for o in offers if o.status == DispatchOfferStatus.accepted]
        rejected_offers = [o for o in offers if o.status == DispatchOfferStatus.rejected]

        responded = len(accepted_offers) + len(rejected_offers)
        rate = round((len(accepted_offers) / responded) * 100.0, 2) if responded > 0 else 0.0

        # Embudo de conversión por ola
        waves_accepted: Dict[int, int] = {}
        for o in accepted_offers:
            waves_accepted[o.wave] = waves_accepted.get(o.wave, 0) + 1

        total_accepted = len(accepted_offers)
        funnel: List[WaveConversionItem] = []
        for w in sorted(set(list(waves_accepted.keys()) + [1, 2, 3])):
            acc = waves_accepted.get(w, 0)
            pct = round((acc / total_accepted) * 100.0, 2) if total_accepted > 0 else 0.0
            funnel.append(WaveConversionItem(wave=w, accepted_count=acc, percentage=pct))

        # Tiempos de asignación (Service.created_at hasta Service.updated_at para servicios asignados)
        assigned_services = session.exec(
            select(Service).where(
                Service.status.in_([ServiceStatus.assigned, ServiceStatus.en_route, ServiceStatus.in_progress, ServiceStatus.completed]),
                Service.created_at >= since
            )
        ).all()

        durations: List[float] = []
        type_counts: Dict[str, Dict[str, int]] = {}

        for s in assigned_services:
            st = s.service_type.value if hasattr(s.service_type, "value") else str(s.service_type)
            type_counts.setdefault(st, {"assigned": 0, "total": 0})
            type_counts[st]["assigned"] += 1
            if s.updated_at and s.created_at and s.updated_at >= s.created_at:
                dur = (s.updated_at - s.created_at).total_seconds()
                durations.append(dur)

        durations.sort()
        n = len(durations)
        p50 = durations[int(n * 0.50)] if n > 0 else None
        p95 = durations[int(n * 0.95)] if n > 0 else None
        avg_dur = round(sum(durations) / n, 1) if n > 0 else None

        # Servicios totales en el período
        total_services = session.exec(
            select(func.count(Service.id)).where(Service.created_at >= since)
        ).one()

        return DispatchAnalyticsResponse(
            period_days=days,
            total_services_dispatched=total_services,
            total_offers_sent=total_offers,
            overall_acceptance_rate=rate,
            assignment_p50_seconds=p50,
            assignment_p95_seconds=p95,
            avg_assignment_seconds=avg_dur,
            wave_conversion_funnel=funnel,
            by_service_type=type_counts
        )


dispatch_service = DispatchService()
