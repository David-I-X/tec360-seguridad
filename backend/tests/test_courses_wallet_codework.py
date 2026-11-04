"""
Suite de pruebas TDD (Codework) para:
1. Gate de Cursos Obligatorios al aceptar o cotizar servicios (COURSE_REQUIRED).
2. Botón "Validar" en Panel Admin que da por cursados los cursos obligatorios.
3. Bono de bienvenida de $200.000 COP en créditos operativos en Billetera (en reemplazo de trabajos gratis).
"""
import asyncio
import uuid
import pytest
from fastapi import HTTPException
from sqlalchemy import event
from sqlmodel import SQLModel, Session, create_engine, select
from sqlalchemy.pool import StaticPool

from app.models.user import User
from app.models.technician import Technician
from app.models.course import Course, Lesson, Enrollment, LessonProgress, EnrollmentStatus
from app.models.credit import (
    TechnicianCredit,
    CreditTransaction,
    CreditTransactionType,
    WELCOME_BONUS_AMOUNT,
    WELCOME_BONUS_REFERENCE,
)
from app.models.service import Service, ServiceStatus, ServiceType
from app.models.quotation import Quotation
from app.schemas.quotation import QuotationCreate
from app.services.credit_service import credit_service
from app.services.quotation_service import quotation_service
from app.api.courses import get_technician_course_gate_status
from app.api.admin import verify_technician


@pytest.fixture()
def sqlite_session():
    """Sesión SQLite en memoria aislada para pruebas deterministas."""
    from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler
    SQLiteTypeCompiler.visit_JSONB = SQLiteTypeCompiler.visit_JSON

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

    tables = [
        User.__table__,
        Technician.__table__,
        Course.__table__,
        Lesson.__table__,
        Enrollment.__table__,
        LessonProgress.__table__,
        TechnicianCredit.__table__,
        CreditTransaction.__table__,
        Service.__table__,
        Quotation.__table__,
    ]
    SQLModel.metadata.create_all(engine, tables=tables)
    with Session(engine) as s:
        # Sembrar cursos obligatorios de Escuela Tec360
        c1 = Course(
            id=uuid.uuid4(),
            title="Fundamentos de Instalación y Seguridad Tec360",
            slug="fundamentos-instalacion-seguridad",
            category="basicos",
            difficulty="beginner",
            estimated_hours=2,
            is_published=True,
            is_paid=False,
            price=0.0,
            is_required_for_technicians=True,
            rank_points_reward=25,
            sort_order=1,
        )
        c2 = Course(
            id=uuid.uuid4(),
            title="Instalación Profesional de GPS 4G y Corte de Motor",
            slug="instalacion-profesional-gps-4g",
            category="gps_alarmas",
            difficulty="intermediate",
            estimated_hours=4,
            is_published=True,
            is_paid=False,
            price=0.0,
            is_required_for_technicians=True,
            rank_points_reward=35,
            sort_order=2,
        )
        s.add(c1)
        s.add(c2)
        s.flush()

        l1 = Lesson(
            id=uuid.uuid4(),
            course_id=c1.id,
            title="Inducción y protocolos de seguridad",
            slug="induccion-protocolos-seguridad",
            video_duration_seconds=480,
            sort_order=1,
            is_published=True,
        )
        s.add(l1)
        s.commit()
        yield s


def test_welcome_bonus_200k_credits_in_wallet(sqlite_session: Session):
    """
    Verifica que un técnico nuevo reciba $200.000 COP en créditos por bienvenida
    (y no '3 servicios gratis'), junto con su transacción de bono registrada.
    """
    tech_user = User(
        id=uuid.uuid4(),
        email="nuevo_tech@tec360.co",
        phone="+573001112233",
        full_name="Carlos Instalador",
        hashed_password="x",
        role="technician",
        is_active=True,
    )
    sqlite_session.add(tech_user)
    sqlite_session.commit()

    balance_data = asyncio.run(credit_service.get_balance(sqlite_session, str(tech_user.id)))

    assert balance_data["balance"] == WELCOME_BONUS_AMOUNT == 200000.0
    assert balance_data["total_recharged"] == 200000.0
    assert balance_data["total_consumed"] == 0.0
    assert balance_data["free_services_remaining"] == 0
    assert balance_data["welcome_bonus_granted"] is True
    assert balance_data["welcome_bonus_amount"] == 200000.0
    assert balance_data["can_accept_services"] is True

    txns = asyncio.run(credit_service.get_transactions(sqlite_session, str(tech_user.id)))
    assert len(txns) == 1
    assert txns[0].transaction_type == CreditTransactionType.bonus
    assert txns[0].amount == 200000.0
    assert txns[0].balance_after == 200000.0
    assert txns[0].external_reference == WELCOME_BONUS_REFERENCE
    assert "200.000" in txns[0].description

    # Al aceptar un servicio de $500.000 COP, se descuenta el 10% ($50.000 COP) de los $200.000 COP
    service_id = str(uuid.uuid4())
    deduct_txn = asyncio.run(
        credit_service.deduct_for_service(
            session=sqlite_session,
            technician_id=str(tech_user.id),
            service_id=service_id,
            service_amount=500000.0,
        )
    )
    assert deduct_txn.transaction_type == CreditTransactionType.deduction
    assert deduct_txn.amount == -50000.0
    assert deduct_txn.balance_after == 150000.0


def test_course_gate_blocks_unverified_technician_until_completed_or_validated(sqlite_session: Session):
    """
    Verifica que un técnico sin cursos obligatorios completados ni validación de admin:
    1. Tenga can_operate == False y vea los cursos pendientes.
    2. Al ser validado por el admin con el botón 'Validar', se le den por cursados
       automáticamente todos los cursos obligatorios (progress_pct=100%, quiz_passed=True)
       y pase a can_operate == True.
    3. Si se revoca la validación, vuelva a can_operate == False.
    """
    tech_user = User(
        id=uuid.uuid4(),
        email="experto@tec360.co",
        phone="+573109998877",
        full_name="Andrés Experto",
        hashed_password="x",
        role="technician",
        is_active=True,
    )
    sqlite_session.add(tech_user)
    sqlite_session.flush()

    tech_profile = Technician(
        id=uuid.uuid4(),
        user_id=tech_user.id,
        specializations=["gps_installation"],
        experience_years=5,
        is_verified=False,
    )
    sqlite_session.add(tech_profile)
    sqlite_session.commit()

    # 1. Inicialmente no puede operar porque no ha hecho los cursos ni está validado
    gate_initial = get_technician_course_gate_status(sqlite_session, str(tech_user.id))
    assert gate_initial["can_operate"] is False
    assert gate_initial["is_verified"] is False
    assert gate_initial["required_courses_completed"] is False
    assert gate_initial["required_count"] == 2
    assert len(gate_initial["pending_courses"]) == 2

    # Si intenta cotizar un servicio sin haber hecho el curso, recibe 403 COURSE_REQUIRED
    client_user = User(
        id=uuid.uuid4(),
        email="cliente@tec360.co",
        phone="+573005554433",
        full_name="Cliente Prueba",
        hashed_password="x",
        role="client",
        is_active=True,
    )
    sqlite_session.add(client_user)
    sqlite_session.flush()

    svc = Service(
        id=uuid.uuid4(),
        client_id=client_user.id,
        service_type=ServiceType.gps_installation,
        status=ServiceStatus.pending,
        title="Instalación GPS Camioneta",
        description="Instalación oculta",
        service_address="Calle 10 # 40-20, Medellín",
        scheduled_date=tech_user.created_at,
        estimated_price=280000.0,
    )
    sqlite_session.add(svc)
    sqlite_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            quotation_service.create_quotation(
                session=sqlite_session,
                service_id=str(svc.id),
                quotation_data=QuotationCreate(
                    amount=260000.0,
                    description="Instalación profesional con relé",
                    expires_in_hours=24,
                ),
                technician_id=str(tech_user.id),
            )
        )
    assert exc_info.value.status_code == 403
    assert "COURSE_REQUIRED" in str(exc_info.value.detail)

    # 2. El administrador pulsa el botón 'Validar' en /admin/usuarios
    res = asyncio.run(
        verify_technician(
            user_id=str(tech_user.id),
            is_verified=True,
            current_user={"id": str(uuid.uuid4()), "role": "admin"},
            session=sqlite_session,
        )
    )
    assert res["is_verified"] is True
    assert res["courses_completed"] == 2

    # Verificar que los enrollments quedaron completados al 100% con certificado
    enrollments = sqlite_session.exec(
        select(Enrollment).where(Enrollment.user_id == tech_user.id)
    ).all()
    assert len(enrollments) == 2
    for enr in enrollments:
        assert enr.status == EnrollmentStatus.completed.value
        assert enr.progress_pct == 100.0
        assert enr.quiz_passed is True
        assert enr.quiz_score == 100.0
        assert enr.certificate_code is not None
        assert enr.certificate_code.startswith("TEC-ADM-")

    gate_after_verify = get_technician_course_gate_status(sqlite_session, str(tech_user.id))
    assert gate_after_verify["can_operate"] is True
    assert gate_after_verify["is_verified"] is True
    assert gate_after_verify["required_courses_completed"] is True
    assert len(gate_after_verify["pending_courses"]) == 0

    # 3. Si el admin revoca la validación, se revocan las homologaciones TEC-ADM-*
    res_revoke = asyncio.run(
        verify_technician(
            user_id=str(tech_user.id),
            is_verified=False,
            current_user={"id": str(uuid.uuid4()), "role": "admin"},
            session=sqlite_session,
        )
    )
    assert res_revoke["is_verified"] is False

    gate_after_revoke = get_technician_course_gate_status(sqlite_session, str(tech_user.id))
    assert gate_after_revoke["can_operate"] is False
    assert gate_after_revoke["is_verified"] is False
    assert len(gate_after_revoke["pending_courses"]) == 2
