"""
Pruebas unitarias para el algoritmo de scoring y reglas de olas del motor de despacho
Path: backend/tests/test_dispatch.py
"""
from uuid import uuid4
from unittest.mock import MagicMock

from app.models.service import Service, ServiceType
from app.models.technician import Technician
from app.models.user import User
from app.services.dispatch_service import DispatchService, WAVE_CONFIG


def test_wave_rules_by_service_type():
    """Valida la configuración de radio y timeout según el tipo de servicio."""
    # 1. Recuperación 24/7 (urgente: 35s)
    recovery_rules_w1 = DispatchService._get_wave_rules(ServiceType.vehicle_recovery, wave=1)
    assert recovery_rules_w1["timeout_seconds"] == 35
    assert recovery_rules_w1["radius_km"] == 20

    recovery_rules_w2 = DispatchService._get_wave_rules(ServiceType.vehicle_recovery, wave=2)
    assert recovery_rules_w2["timeout_seconds"] == 35
    assert recovery_rules_w2["radius_km"] == 35

    # 2. Mecánica Rápida (60s)
    oil_rules_w1 = DispatchService._get_wave_rules(ServiceType.oil_change, wave=1)
    assert oil_rules_w1["timeout_seconds"] == 60
    assert oil_rules_w1["radius_km"] == 15

    # 3. Instalación GPS (90s)
    gps_rules_w1 = DispatchService._get_wave_rules(ServiceType.gps_installation, wave=1)
    assert gps_rules_w1["timeout_seconds"] == 90
    assert gps_rules_w1["radius_km"] == 20


def test_scoring_distance_proximity_priority():
    """Un técnico a 2 km debe tener un puntaje significativamente mayor que uno a 18 km."""
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

    score_close = DispatchService.calculate_technician_score(
        tech=tech,
        user=user,
        service=service,
        distance_meters=2000.0,  # 2 km
        active_services_count=0,
        max_radius_km=20.0
    )

    score_far = DispatchService.calculate_technician_score(
        tech=tech,
        user=user,
        service=service,
        distance_meters=18000.0,  # 18 km
        active_services_count=0,
        max_radius_km=20.0
    )

    assert score_close > score_far
    assert score_close >= 0.85
    assert score_far < 0.60


def test_scoring_rating_and_cancellations():
    """Un técnico con mejor rating y menos cancelaciones recientes debe superar a uno penalizado."""
    service = Service(
        id=uuid4(),
        client_id=uuid4(),
        service_type=ServiceType.gps_installation,
        title="Instalación GPS"
    )
    user1 = User(id=uuid4(), email="t1@tec360.com", full_name="Tech Confiable", role="technician")
    tech_reliable = Technician(
        user_id=user1.id,
        average_rating=4.9,
        cancellation_week_count=0,
        rank="gold",
        specializations=["gps_installation"]
    )

    user2 = User(id=uuid4(), email="t2@tec360.com", full_name="Tech Penalizado", role="technician")
    tech_penalized = Technician(
        user_id=user2.id,
        average_rating=3.2,
        cancellation_week_count=3,  # Muchas cancelaciones en la semana
        rank="bronze",
        specializations=["gps_installation"]
    )

    # A la misma distancia (5 km)
    score_reliable = DispatchService.calculate_technician_score(
        tech=tech_reliable,
        user=user1,
        service=service,
        distance_meters=5000.0,
        active_services_count=0,
        max_radius_km=20.0
    )

    score_penalized = DispatchService.calculate_technician_score(
        tech=tech_penalized,
        user=user2,
        service=service,
        distance_meters=5000.0,
        active_services_count=0,
        max_radius_km=20.0
    )

    assert score_reliable > score_penalized
    # La diferencia debe ser al menos de 0.20 puntos
    assert (score_reliable - score_penalized) >= 0.20


def test_scoring_workload_penalty():
    """Un técnico con un servicio actualmente en curso recibe penalización por carga."""
    service = Service(
        id=uuid4(),
        client_id=uuid4(),
        service_type=ServiceType.vehicle_recovery,
        title="Recuperación 24/7"
    )
    user = User(id=uuid4(), email="reac@tec360.com", full_name="Reaction Tech", role="reaction_team")
    tech = Technician(
        user_id=user.id,
        average_rating=5.0,
        cancellation_week_count=0,
        rank="elite"
    )

    score_idle = DispatchService.calculate_technician_score(
        tech=tech,
        user=user,
        service=service,
        distance_meters=3000.0,
        active_services_count=0,
        max_radius_km=20.0
    )

    score_busy = DispatchService.calculate_technician_score(
        tech=tech,
        user=user,
        service=service,
        distance_meters=3000.0,
        active_services_count=1,
        max_radius_km=20.0
    )

    assert score_idle > score_busy
    assert round(score_idle - score_busy, 4) == 0.08
