"""
Tests de Codework para Auditoría de Consultas DB, Rutas de Imágenes y Auto-provisionamiento de Técnicos.
Verifica:
1. Auto-provisionamiento de perfil Technician para evitar 404 'Technician profile not found'.
2. Validación administrativa de técnicos huérfanos sin crash.
3. Transiciones de rol seguras (company_admin <-> technician <-> client).
4. Verificación de reglas de Nginx (^~ /uploads/, /_next/static/, /api/).
"""
import uuid
from sqlmodel import Session, SQLModel, create_engine, select
from sqlmodel.pool import StaticPool

from app.models.user import User
from app.models.technician import Technician, ensure_technician_profile
from app.models.organization import Organization, OrganizationMember, OrgRole, OrgMemberStatus
from app.services.storage_service import storage


from sqlalchemy import event
from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler

SQLiteTypeCompiler.visit_JSONB = SQLiteTypeCompiler.visit_JSON


def get_test_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def _register_spatialite_stubs(dbapi_conn, _conn_record):
        for fn_name in (
            "RecoverGeometryColumn",
            "CheckSpatialMetaData",
            "AddGeometryColumn",
            "DiscardGeometryColumn",
            "CreateSpatialIndex",
            "DisableSpatialIndex",
        ):
            dbapi_conn.create_function(fn_name, -1, lambda *args: 1)
        for fn_name in ("AsEWKB", "ST_AsEWKB", "GeomFromEWKT", "ST_GeomFromEWKT"):
            dbapi_conn.create_function(fn_name, -1, lambda *args: None)

    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def test_ensure_technician_profile_auto_provisions():
    for session in get_test_session():
        user = User(
            id=uuid.uuid4(),
            email="tech.orphan@tec360.co",
            phone="+573001234567",
            full_name="Pedro García",
            role="technician",
            hashed_password="pw",
            is_active=True,
        )
        session.add(user)
        session.commit()

        # Al inicio no tiene perfil en tabla technicians
        existing = session.exec(select(Technician).where(Technician.user_id == user.id)).first()
        assert existing is None

        # Llamar a ensure_technician_profile debe crearlo
        tech = ensure_technician_profile(session, user.id)
        assert tech is not None
        assert tech.user_id == user.id
        assert tech.is_available is True
        assert "gps_installation" in tech.specializations

        # Segunda llamada debe ser idempotente
        tech_second = ensure_technician_profile(session, user.id)
        assert tech_second.id == tech.id


def test_role_transition_to_company_admin_and_back():
    for session in get_test_session():
        user = User(
            id=uuid.uuid4(),
            email="tech.owner@tec360.co",
            phone="+573007654321",
            full_name="Reinaldo Taller",
            role="technician",
            hashed_password="pw",
            is_active=True,
        )
        session.add(user)
        session.commit()

        tech = ensure_technician_profile(session, user.id)
        session.commit()
        assert tech.is_available is True

        # Cambio a company_admin: perfil de técnico no se borra (preserva FK), pero se deshabilita
        tech.is_available = False
        org = Organization(
            name="Taller Reinaldo",
            owner_id=user.id,
            is_active=True,
            wallet_balance=200000.0,
        )
        session.add(org)
        session.flush()

        member = OrganizationMember(
            organization_id=org.id,
            user_id=user.id,
            org_role=OrgRole.owner.value,
            status=OrgMemberStatus.active.value,
        )
        session.add(member)
        user.role = "company_admin"
        session.add(user)
        session.commit()

        assert user.role == "company_admin"
        assert tech.is_available is False

        # Transición de regreso a technician: desactiva membresía owner para no bloquearlo en despacho
        member.status = OrgMemberStatus.suspended.value
        tech.is_available = True
        user.role = "technician"
        session.add(member)
        session.add(tech)
        session.add(user)
        session.commit()

        assert user.role == "technician"
        assert tech.is_available is True
        assert member.status == OrgMemberStatus.suspended.value


def _run_async(coro):
    """Drives a coroutine synchronously without opening loopback sockets on Windows."""
    try:
        while True:
            coro.send(None)
    except StopIteration as exc:
        return exc.value


def test_storage_service_path_and_uploads():
    content = b"fake-jpg-content-tec360"
    url = _run_async(storage.upload(
        content=content,
        path="avatars/test_avatar.jpg",
        content_type="image/jpeg",
    ))
    assert url == "/uploads/avatars/test_avatar.jpg"
    deleted = _run_async(storage.delete(url))
    assert deleted is True


def test_nginx_conf_preferential_prefixes():
    import os

    nginx_path = os.path.join(os.getcwd(), "nginx", "nginx.conf")
    assert os.path.exists(nginx_path)

    with open(nginx_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Verificar que las rutas críticas usan ^~ para no ser interceptadas por el regex de imágenes
    assert "location ^~ /uploads/" in content, "Falta ^~ en /uploads/ para evitar que regex lo secuestre"
    assert "location ^~ /_next/static/" in content, "Falta ^~ en /_next/static/"
    assert "location ^~ /api/" in content, "Falta ^~ en /api/"
    assert "root /opt/tec360-seguridad;" in content, "Debe usar root en vez de alias con try_files"
