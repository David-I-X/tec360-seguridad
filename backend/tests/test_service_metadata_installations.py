"""
Prueba unitaria aislada para metadatos de servicios en instalaciones y mecánica rápida.
Verifica que Service y ServiceCreate manejen correctamente service_metadata con:
- service_category: 'installations' | 'quick_mechanics'
- supplies_provider: 'client' | 'technician'
- supplies_notes: str | None
"""
import os
import sys
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import event
from sqlmodel import SQLModel, Session, create_engine, select
from sqlalchemy.pool import StaticPool
from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler
from app.models.service import Service, ServiceStatus, ServiceType

# Allow SQLite to compile JSONB as JSON in test
SQLiteTypeCompiler.visit_JSONB = SQLiteTypeCompiler.visit_JSON


def test_installations_service_metadata_flow():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _register_spatialite_stubs(dbapi_conn, _connection_record):
        dbapi_conn.create_function("RecoverGeometryColumn", 5, lambda *a: 1)
        dbapi_conn.create_function("AddGeometryColumn", 5, lambda *a: 1)
        dbapi_conn.create_function("DiscardGeometryColumn", 2, lambda *a: 1)
        dbapi_conn.create_function("DisableSpatialIndex", 2, lambda *a: 1)
        dbapi_conn.create_function("CreateSpatialIndex", 2, lambda *a: 1)
        dbapi_conn.create_function("AsEWKB", 1, lambda x: x)
        dbapi_conn.create_function("ST_GeomFromEWKT", 1, lambda x: x)
        dbapi_conn.create_function("GeomFromEWKT", 1, lambda x: x)
    SQLModel.metadata.create_all(engine, tables=[Service.__table__])

    with Session(engine) as session:
        # 1. Caso Instalación donde el cliente ya tiene el dispositivo
        client_id = uuid.uuid4()
        svc_client_has_device = Service(
            id=uuid.uuid4(),
            client_id=client_id,
            title="Dashcam Vehicular - Mazda 3",
            service_type=ServiceType.camera_installation,
            service_address="Cra 43A # 1-50, Medellín",
            status=ServiceStatus.pending,
            estimated_price=120000.0,
            service_metadata={
                "service_category": "installations",
                "supplies_provider": "client",
                "supplies_notes": "Dashcam 70mai A500S con cámara trasera",
            },
        )
        session.add(svc_client_has_device)

        # 2. Caso Instalación donde el técnico suministra el dispositivo
        svc_tech_supplies_device = Service(
            id=uuid.uuid4(),
            client_id=client_id,
            title="GPS Satelital 4G - Toyota Hilux",
            service_type=ServiceType.gps_installation,
            service_address="Calle 10 # 40-20, Medellín",
            status=ServiceStatus.pending,
            estimated_price=350000.0,
            service_metadata={
                "service_category": "installations",
                "supplies_provider": "technician",
                "supplies_notes": "Equipo homologado 4G con corta corriente",
            },
        )
        session.add(svc_tech_supplies_device)
        session.commit()

        # Consultar y validar persistencia
        retrieved_1 = session.exec(select(Service).where(Service.id == svc_client_has_device.id)).one()
        assert retrieved_1.service_metadata is not None
        assert retrieved_1.service_metadata["service_category"] == "installations"
        assert retrieved_1.service_metadata["supplies_provider"] == "client"
        assert retrieved_1.service_metadata["supplies_notes"] == "Dashcam 70mai A500S con cámara trasera"

        retrieved_2 = session.exec(select(Service).where(Service.id == svc_tech_supplies_device.id)).one()
        assert retrieved_2.service_metadata is not None
        assert retrieved_2.service_metadata["service_category"] == "installations"
        assert retrieved_2.service_metadata["supplies_provider"] == "technician"
        assert retrieved_2.service_metadata["supplies_notes"] == "Equipo homologado 4G con corta corriente"

    print("ALL INSTALLATIONS SERVICE METADATA TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    test_installations_service_metadata_flow()
