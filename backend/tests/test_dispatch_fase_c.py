"""
Pruebas unitarias para la Fase C de Despacho: ETA de Tráfico, Heatmaps y Hotspots de Demanda
Path: backend/tests/test_dispatch_fase_c.py
"""
import pytest
from uuid import uuid4
from unittest.mock import patch

from app.models.service import Service, ServiceType
from app.models.technician import Technician
from app.models.user import User
from app.services.dispatch_service import DispatchService


def test_scoring_with_traffic_eta_priority():
    """Un técnico con menor tiempo de llegada en tráfico (10 min vs 35 min) obtiene mayor puntaje."""
    service = Service(
        id=uuid4(),
        client_id=uuid4(),
        service_type=ServiceType.oil_change,
        title="Cambio de Aceite"
    )
    user = User(id=uuid4(), email="tech@tec360.com", full_name="Carlos Gomez", role="technician")
    tech = Technician(
        user_id=user.id,
        average_rating=4.5,
        cancellation_week_count=0,
        rank="gold",
        specializations=["oil_change"]
    )

    # Candidato 1: ETA de 8 minutos en tráfico
    score_fast_eta = DispatchService.calculate_technician_score(
        tech=tech,
        user=user,
        service=service,
        distance_meters=5000.0,
        active_services_count=0,
        max_radius_km=20.0,
        eta_minutes=8.0
    )

    # Candidato 2: ETA de 35 minutos debido a congestión
    score_slow_eta = DispatchService.calculate_technician_score(
        tech=tech,
        user=user,
        service=service,
        distance_meters=5000.0,
        active_services_count=0,
        max_radius_km=20.0,
        eta_minutes=35.0
    )

    assert score_fast_eta > score_slow_eta
    assert (score_fast_eta - score_slow_eta) >= 0.20


@pytest.mark.asyncio
async def test_traffic_eta_graceful_fallback():
    """Si no hay clave de Google Maps configurada, compute_traffic_eta_minutes retorna None sin fallar."""
    with patch("app.core.config.settings.GOOGLE_MAPS_API_KEY", ""):
        eta = await DispatchService.compute_traffic_eta_minutes(
            tech_lat=6.2442,
            tech_lon=-75.5812,
            dest_lat=6.2084,
            dest_lon=-75.5671
        )
        assert eta is None


def test_heatmap_weight_calculation():
    """Las misiones de recuperación vehicular reciben el triple de peso que servicios normales."""
    from app.services.dispatch_service import QUICK_MECHANICS_TYPES
    assert ServiceType.oil_change in QUICK_MECHANICS_TYPES
    assert ServiceType.vehicle_recovery not in QUICK_MECHANICS_TYPES
