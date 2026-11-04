"""
Tests unitarios y de contrato para Auditoría del Panel de Administración (/admin/stats y /admin/services)
Verifica:
1. Que platform_stats compute correctamente servicios completed + confirmed,
   servicios activos, custodia escrow_active, instalaciones, reacción, mecánica
   y verificaciones pendientes.
2. Que list_global_services construya predicados de búsqueda por nombre/teléfono/email de usuario,
   placa, dirección e ID de servicio.
"""
import asyncio
import os
import sys
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("SKIP_CONFIG_VALIDATION", "true")
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.api.admin import list_global_services, platform_stats
from app.models.service import Service, ServiceStatus, ServiceType
from app.models.user import User


class _ScalarResult:
    def __init__(self, val):
        self._val = val

    def one(self):
        return self._val

    def all(self):
        return self._val


def test_platform_stats_includes_confirmed_and_all_pillars():
    """
    Verifica que platform_stats:
    - Sume completed + confirmed en services.completed y completion_rate
    - Retorne services.active, revenue.escrow_active, installations y users.pending_verifications
    """
    status_list = list(ServiceStatus)
    status_map = {s.value: 0 for s in status_list}
    status_map["completed"] = 10
    status_map["confirmed"] = 5
    status_map["en_route"] = 2
    status_map["in_progress"] = 1
    status_map["cancelled"] = 2

    exec_sequence = [
        _ScalarResult(10),  # clients
        _ScalarResult(4),   # technicians
        _ScalarResult(2),   # reaction_team
        _ScalarResult(3),   # pending_verifications
        _ScalarResult(1),   # unverified_techs
        _ScalarResult(20),  # total_services
    ]
    for s in status_list:
        exec_sequence.append(_ScalarResult(status_map[s.value]))

    exec_sequence.extend([
        _ScalarResult(4500000.0),  # gross_volume (completed + confirmed)
        _ScalarResult(950000.0),   # escrow_active
        _ScalarResult(4),          # recovery_total
        _ScalarResult(1),          # recovery_active
        _ScalarResult(6),          # mechanics_total
        _ScalarResult(1),          # mechanics_active
        _ScalarResult(300000.0),   # avg_ticket
    ])

    fake_session = MagicMock()
    fake_session.exec.side_effect = exec_sequence

    with patch("app.api.admin.get_accounting_dashboard", new=AsyncMock(return_value={})):
        res = asyncio.run(
            platform_stats(
                current_user={"id": str(uuid4()), "role": "admin"},
                session=fake_session,
            )
        )

    assert res["users"]["clients"] == 10
    assert res["users"]["technicians"] == 4
    assert res["users"]["reaction_team"] == 2
    assert res["users"]["total"] == 16
    assert res["users"]["pending_verifications"] == 3
    assert res["users"]["unverified_technicians"] == 1

    # completed (10) + confirmed (5) = 15 de 20 => 75.0%
    assert res["services"]["completed"] == 15
    assert res["services"]["active"] == 3  # en_route (2) + in_progress (1)
    assert res["services"]["completion_rate"] == "75.0%"

    assert res["revenue"]["gross_volume"] == 4500000.0
    assert res["revenue"]["escrow_active"] == 950000.0
    assert res["revenue"]["average_ticket"] == 300000.0

    # Pilares: total_services (20) - recovery (4) - mechanics (6) = 10 instalaciones
    assert res["installations"]["total"] == 10
    assert res["installations"]["active"] == 1
    assert res["recovery"]["total"] == 4
    assert res["recovery"]["active"] == 1
    assert res["quick_mechanics"]["total"] == 6
    assert res["quick_mechanics"]["active"] == 1


def test_list_global_services_searches_client_plate_and_id():
    """
    Verifica que list_global_services aplique filtro de búsqueda incluyendo
    subconsulta de usuarios (nombre, teléfono, email) y cast(Service.id, String).
    """
    client_id = uuid4()
    svc_id = uuid4()
    fake_service = Service(
        id=svc_id,
        client_id=client_id,
        service_type=ServiceType.gps_installation,
        status=ServiceStatus.in_progress,
        title="Instalación GPS 4G",
        description="Prueba",
        service_address="Calle 10 #43A",
        service_location="SRID=4326;POINT(-75.5658 6.2088)",
        estimated_price=320000.0,
        vehicle_plate="KLS842",
        created_at=datetime.utcnow(),
    )
    fake_client = User(
        id=client_id,
        email="valentina@tec360.co",
        phone="+525512345678",
        full_name="Valentina Monterrey",
        hashed_password="x",
        role="client",
        is_active=True,
    )

    fake_session = MagicMock()
    fake_session.exec.side_effect = [
        _ScalarResult(1),
        _ScalarResult([fake_service]),
    ]
    fake_session.get.side_effect = lambda model, pk: fake_client if pk == client_id else None

    result = asyncio.run(
        list_global_services(
            skip=0,
            limit=50,
            status=None,
            service_type=None,
            search="Valentina",
            current_user={"id": str(uuid4()), "role": "admin"},
            session=fake_session,
        )
    )

    assert result["total"] == 1
    assert len(result["items"]) == 1
    assert result["items"][0]["client_name"] == "Valentina Monterrey"
    assert result["items"][0]["client_phone"] == "+525512345678"
    assert result["items"][0]["vehicle_plate"] == "KLS842"

    # Verificar que la consulta SQL generada incluya la subconsulta de usuarios y el cast de id
    first_query_arg = fake_session.exec.call_args_list[0][0][0]
    compiled_sql = str(first_query_arg.compile(compile_kwargs={"literal_binds": True}))
    assert "users.full_name" in compiled_sql
    assert "users.phone" in compiled_sql
    assert "CAST(services.id AS VARCHAR)" in compiled_sql
