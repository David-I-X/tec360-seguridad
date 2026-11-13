"""
Suite TDD (Codework) para cambios de producto:
1. Mecánica rápida exenta de inspección vehicular previa (update_service_status y save_vehicle_inspection).
2. Renombre visible de 'spark_bulbs_wipers' a 'Vehículo no enciende'.
3. Exposición de observaciones, fecha programada y foto del vehículo en ofertas de despacho y listado.
"""
import uuid
from datetime import datetime, timedelta
import pytest
from fastapi import HTTPException
from sqlalchemy import event
from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler

from app.models.user import User
from app.models.technician import Technician
from app.models.service import Service, ServiceStatus, ServiceType
from app.models.dispatch import DispatchOffer, DispatchOfferStatus
from app.schemas.service import VehicleInspectionSubmit
from app.services.service_service import service_service
from app.services.dispatch_service import dispatch_service
from app.api.services import get_service_types
from app.api.technicians import get_available_specializations

SQLiteTypeCompiler.visit_JSONB = SQLiteTypeCompiler.visit_JSON


def _run_coro(coro):
    """Ejecuta una corrutina sin I/O de red de forma determinista sin abrir sockets del loop."""
    try:
        while True:
            coro.send(None)
    except StopIteration as stop:
        return stop.value


@pytest.fixture()
def sqlite_session(monkeypatch):
    async def _noop(*args, **kwargs):
        return None

    from app.core.websocket_manager import ws_manager
    from app.services.notification_service import NotificationService

    monkeypatch.setattr(ws_manager, "broadcast_service_status", _noop)
    monkeypatch.setattr(ws_manager, "broadcast_to_service", _noop)
    monkeypatch.setattr(NotificationService, "notify_client_service_update", staticmethod(_noop))

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _register_spatialite_stubs(dbapi_conn, _connection_record):
        for fn_name in (
            "RecoverGeometryColumn",
            "CheckSpatialMetaData",
            "AddGeometryColumn",
            "DiscardGeometryColumn",
            "CreateSpatialIndex",
            "DisableSpatialIndex",
        ):
            dbapi_conn.create_function(fn_name, -1, lambda *a: 1)
        for fn_name in ("AsEWKB", "ST_AsEWKB", "GeomFromEWKT", "ST_GeomFromEWKT"):
            dbapi_conn.create_function(fn_name, -1, lambda *a: None)

    SQLModel.metadata.create_all(
        engine,
        tables=[
            User.__table__,
            Technician.__table__,
            Service.__table__,
            DispatchOffer.__table__,
        ],
    )
    with Session(engine) as session:
        yield session


def _seed_client_and_tech(session: Session):
    client = User(
        id=uuid.uuid4(),
        email=f"cli_{uuid.uuid4().hex[:6]}@tec360.co",
        phone=f"+57300{uuid.uuid4().int % 10000000:07d}",
        full_name="Cliente Prueba",
        role="client",
        hashed_password="x",
        is_active=True,
    )
    tech_user = User(
        id=uuid.uuid4(),
        email=f"tech_{uuid.uuid4().hex[:6]}@tec360.co",
        phone=f"+57301{uuid.uuid4().int % 10000000:07d}",
        full_name="Técnico Prueba",
        role="technician",
        hashed_password="x",
        is_active=True,
    )
    session.add(client)
    session.add(tech_user)
    session.flush()

    tech = Technician(
        id=uuid.uuid4(),
        user_id=tech_user.id,
        is_verified=True,
        is_available=True,
        specializations=["oil_change", "spark_bulbs_wipers", "gps_installation"],
        service_city="Medellín",
    )
    session.add(tech)
    session.commit()
    return client, tech_user, tech


def test_quick_mechanics_transitions_to_in_progress_without_inspection(sqlite_session: Session):
    client, tech_user, _ = _seed_client_and_tech(sqlite_session)
    svc = Service(
        id=uuid.uuid4(),
        client_id=client.id,
        technician_id=tech_user.id,
        service_type=ServiceType.spark_bulbs_wipers,
        title="Vehículo no enciende - Mazda 3",
        description="Da encendido pero no arranca el motor desde esta mañana",
        service_address="Cra 43A # 1-50",
        service_city="Medellín",
        status=ServiceStatus.arrived,
        service_metadata={"service_category": "quick_mechanics"},
    )
    sqlite_session.add(svc)
    sqlite_session.commit()

    res = _run_coro(
        service_service.update_service_status(
            session=sqlite_session,
            service_id=str(svc.id),
            technician_id=str(tech_user.id),
            new_status="in_progress",
            technician_name="Técnico Prueba",
        )
    )
    assert res["new_status"] == "in_progress"


def test_installations_still_require_inspection_before_in_progress(sqlite_session: Session):
    client, tech_user, _ = _seed_client_and_tech(sqlite_session)
    svc = Service(
        id=uuid.uuid4(),
        client_id=client.id,
        technician_id=tech_user.id,
        service_type=ServiceType.gps_installation,
        title="Instalación GPS - Mazda 3",
        description="GPS oculto",
        service_address="Cra 43A # 1-50",
        service_city="Medellín",
        status=ServiceStatus.arrived,
        service_metadata={"service_category": "installations"},
    )
    sqlite_session.add(svc)
    sqlite_session.commit()

    with pytest.raises(HTTPException) as exc:
        _run_coro(
            service_service.update_service_status(
                session=sqlite_session,
                service_id=str(svc.id),
                technician_id=str(tech_user.id),
                new_status="in_progress",
                technician_name="Técnico Prueba",
            )
        )
    assert exc.value.status_code == 400
    assert "inspección vehicular" in exc.value.detail.lower()


def test_save_vehicle_inspection_rejects_quick_mechanics(sqlite_session: Session):
    client, tech_user, _ = _seed_client_and_tech(sqlite_session)
    svc = Service(
        id=uuid.uuid4(),
        client_id=client.id,
        technician_id=tech_user.id,
        service_type=ServiceType.oil_change,
        title="Cambio de aceite - Kia Picanto",
        description="Aceite 10W-30",
        service_address="Calle 10 # 20-30",
        service_city="Medellín",
        status=ServiceStatus.arrived,
        service_metadata={"service_category": "quick_mechanics"},
    )
    sqlite_session.add(svc)
    sqlite_session.commit()

    payload = VehicleInspectionSubmit(
        vehicle_km="42000",
        general_notes="Sin novedades",
        categories={"exterior": {"label": "Exterior", "status": "ok"}},
    )
    with pytest.raises(HTTPException) as exc:
        _run_coro(
            service_service.save_vehicle_inspection(
                session=sqlite_session,
                service_id=str(svc.id),
                technician_id=str(tech_user.id),
                inspection_data=payload,
            )
        )
    assert exc.value.status_code == 400


def test_spark_bulbs_wipers_label_is_vehiculo_no_enciende():
    types_resp = _run_coro(get_service_types())
    item = next(t for t in types_resp["service_types"] if t["value"] == "spark_bulbs_wipers")
    assert item["label"] == "Vehículo no enciende"

    specs_resp = _run_coro(get_available_specializations())
    spec = next(s for s in specs_resp["specializations"] if s["value"] == "spark_bulbs_wipers")
    assert spec["label"] == "Vehículo no enciende"


def test_dispatch_offer_includes_observations_schedule_and_photo(sqlite_session: Session):
    client, tech_user, _ = _seed_client_and_tech(sqlite_session)
    scheduled = datetime.utcnow() + timedelta(hours=3)
    svc = Service(
        id=uuid.uuid4(),
        client_id=client.id,
        service_type=ServiceType.spark_bulbs_wipers,
        title="Vehículo no enciende - Chevrolet Spark",
        description="No da chispa al girar la llave, posible falla de encendido.",
        service_address="Av El Poblado # 5-20, Medellín",
        scheduled_date=scheduled,
        vehicle_photo_url="/uploads/vehicle-photos/sample.jpg",
        status=ServiceStatus.pending,
        service_metadata={
            "service_category": "quick_mechanics",
            "client_notes": "Parqueadero sótano 2",
        },
    )
    sqlite_session.add(svc)
    sqlite_session.flush()

    offer = DispatchOffer(
        id=uuid.uuid4(),
        service_id=svc.id,
        technician_id=tech_user.id,
        wave=1,
        status=DispatchOfferStatus.offered,
        score=95.0,
        distance_km=1.4,
        offered_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(minutes=2),
    )
    sqlite_session.add(offer)
    sqlite_session.commit()

    offers_resp = _run_coro(
        dispatch_service.get_technician_offers(
            session=sqlite_session,
            technician_id=str(tech_user.id),
            active_only=True,
        )
    )
    assert offers_resp.total == 1
    first = offers_resp.offers[0]
    assert first.service_description == "No da chispa al girar la llave, posible falla de encendido."
    assert first.client_notes == "Parqueadero sótano 2"
    assert first.vehicle_photo_url == "/uploads/vehicle-photos/sample.jpg"
    assert first.scheduled_date is not None
