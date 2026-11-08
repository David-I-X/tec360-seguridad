"""
TDD Suite — Cuentas Empresa / Talleres (Organizations & Sub-accounts) bajo Codework.
Valida las 6 reglas de negocio confirmadas por el usuario:
1. Arquitectura Opción A: `Organization` + `OrganizationMember` (`owner`, `manager`, `technician`).
2. Billetera única compartida (`Organization.wallet_balance`) con asignación de cupos específicos (`credit_quota` / `quota_used`) por técnico.
3. Modo de despacho configurable por taller (`dispatch_mode = "manual"` vs `"direct"`).
4. Bono de bienvenida único de $200.000 COP por Taller (los técnicos subcuenta NO reciben bonos individuales).
5. Validación de cursos obligatorios de Escuela Tec360 permitida al dueño/manager del taller.
6. El dueño (`owner` / `company_admin`) NO trabaja ni acepta servicios como técnico.
"""
from datetime import datetime, timedelta
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlmodel import Session, SQLModel, create_engine, select

from app.api.courses import (
    get_technician_course_gate_status,
)
from app.api.organizations import (
    AddMemberRequest,
    AssignServiceRequest,
    OrganizationRegisterRequest,
    OrganizationUpdateRequest,
    UpdateQuotaRequest,
    add_organization_member,
    assign_service_to_member_technician,
    get_my_organization,
    register_organization,
    update_member_quota,
    update_my_organization,
    validate_member_courses_by_workshop,
)
from app.models.course import (
    Course,
    CourseQuiz,  # noqa: F401
    Enrollment,  # noqa: F401
    Lesson,  # noqa: F401
    LessonProgress,  # noqa: F401
)
from app.models.credit import (
    WELCOME_BONUS_AMOUNT,
    CreditTransaction,  # noqa: F401
    TechnicianCredit,
)
from app.models.dispatch import DispatchOffer  # noqa: F401
from app.models.organization import (
    DispatchMode,
    Organization,  # noqa: F401
    OrganizationMember,  # noqa: F401
    OrgRole,
)
from app.models.payment import Payment  # noqa: F401
from app.models.quotation import Quotation  # noqa: F401
from app.models.schedule import TechnicianSchedule  # noqa: F401
from app.models.service import Service, ServiceStatus, ServiceType, VehicleType
from app.models.technician import Technician
from app.models.user import User
from app.services.credit_service import credit_service
from app.services.service_service import service_service


def _run_async(coro):
    """Drives a database coroutine synchronously without opening a Windows loopback socketpair."""
    try:
        while True:
            coro.send(None)
    except StopIteration as exc:
        return exc.value


@pytest.fixture()
def sqlite_session():
    """Creates an isolated in-memory SQLite database with SpatiaLite and JSONB stubs."""
    from sqlalchemy import event
    from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler

    SQLiteTypeCompiler.visit_JSONB = SQLiteTypeCompiler.visit_JSON

    engine = create_engine("sqlite:///:memory:", echo=False)

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
        req_course = Course(
            title="Protocolo Oficial de Instalación GPS Tec360",
            slug="protocolo-oficial-gps-tec360",
            description="Curso obligatorio para técnicos de la red Tec360.",
            category="gps_alarmas",
            difficulty="beginner",
            is_published=True,
            is_required_for_technicians=True,
            sort_order=1,
        )
        session.add(req_course)
        session.commit()
        yield session


def test_ca1_single_welcome_bonus_per_workshop_and_owner_not_technician(sqlite_session: Session):
    """
    CA-1:
    - Al registrar un taller se otorga exactamente UN bono de bienvenida de $200.000 COP al taller.
    - El dueño queda con `role = "company_admin"`, sin perfil `Technician`.
    - Al agregar 2 técnicos subcuenta al taller, ninguno recibe bono individual de $200.000 COP.
    """
    owner = User(
        id=uuid4(),
        email="dueno@tallertec.co",
        phone="+573001112233",
        full_name="Carlos Dueño Taller",
        hashed_password="hash",
        role="client",
        is_active=True,
    )
    sqlite_session.add(owner)
    sqlite_session.commit()

    res = _run_async(
        register_organization(
            payload=OrganizationRegisterRequest(
                name="Taller Master GPS Medellín",
                nit="901.456.789-0",
                city="Medellín",
                dispatch_mode=DispatchMode.manual,
            ),
            current_user={"id": str(owner.id), "role": owner.role},
            session=sqlite_session,
        )
    )

    assert res["organization"]["wallet_balance"] == WELCOME_BONUS_AMOUNT
    assert res["organization"]["welcome_bonus_granted"] is True
    assert res["organization"]["dispatch_mode"] == "manual"

    sqlite_session.refresh(owner)
    assert owner.role == "company_admin"

    # El dueño NO tiene perfil Technician
    owner_tech = sqlite_session.exec(
        select(Technician).where(Technician.user_id == owner.id)
    ).first()
    assert owner_tech is None

    # Agregar 2 técnicos subcuenta
    current_owner_ctx = {"id": str(owner.id), "role": "company_admin"}
    m1 = _run_async(
        add_organization_member(
            payload=AddMemberRequest(
                phone="3105550001",
                full_name="Técnico Uno",
                org_role=OrgRole.technician,
                specializations=["gps_installation"],
                credit_quota=50000.0,
            ),
            current_user=current_owner_ctx,
            session=sqlite_session,
        )
    )
    m2 = _run_async(
        add_organization_member(
            payload=AddMemberRequest(
                phone="3105550002",
                full_name="Técnico Dos",
                org_role=OrgRole.technician,
                specializations=["alarm_installation"],
                credit_quota=30000.0,
            ),
            current_user=current_owner_ctx,
            session=sqlite_session,
        )
    )

    tech1_user_id = m1["member"]["user_id"]
    tech2_user_id = m2["member"]["user_id"]

    # Verificar que los técnicos NO recibieron bonos individuales de $200.000
    tc1 = sqlite_session.exec(
        select(TechnicianCredit).where(TechnicianCredit.technician_id == UUID_from_str(tech1_user_id))
    ).first()
    tc2 = sqlite_session.exec(
        select(TechnicianCredit).where(TechnicianCredit.technician_id == UUID_from_str(tech2_user_id))
    ).first()
    assert tc1 is not None and tc1.balance == 0.0
    assert tc2 is not None and tc2.balance == 0.0

    # El saldo de cada técnico reporta la billetera de organización limitada por su cupo
    bal1 = _run_async(credit_service.get_balance(sqlite_session, tech1_user_id))
    assert bal1["is_organization_wallet"] is True
    assert bal1["org_wallet_balance"] == 200000.0
    assert bal1["credit_quota"] == 50000.0
    assert bal1["balance"] == 50000.0


def test_ca2_shared_wallet_and_per_technician_credit_quotas(sqlite_session: Session):
    """
    CA-2:
    - El taller tiene $200.000 COP de saldo compartido.
    - Al técnico se le asigna un cupo (`credit_quota`) de $15.000 COP.
    - Primer servicio de $100.000 COP (comisión 10% = $10.000 COP):
      * Se descuenta $10.000 del taller ($200.000 -> $190.000).
      * `quota_used` del técnico sube a $10.000 (cupo restante: $5.000).
    - Segundo servicio de $100.000 COP (comisión $10.000 > cupo restante $5.000):
      * Es rechazado con HTTP 402 por superar el cupo individual del técnico, aunque el taller tenga $190.000.
    - Si el dueño amplía el cupo del técnico a $25.000 COP, ahora sí puede tomar el segundo servicio.
    """
    owner = User(
        id=uuid4(),
        email="owner2@tallertec.co",
        phone="+573002223344",
        full_name="Laura Dueña",
        hashed_password="hash",
        role="client",
        is_active=True,
    )
    sqlite_session.add(owner)
    sqlite_session.commit()

    _run_async(
        register_organization(
            payload=OrganizationRegisterRequest(name="Taller Norte", city="Bogotá"),
            current_user={"id": str(owner.id), "role": owner.role},
            session=sqlite_session,
        )
    )
    owner_ctx = {"id": str(owner.id), "role": "company_admin"}

    member_res = _run_async(
        add_organization_member(
            payload=AddMemberRequest(
                phone="3114445566",
                full_name="Andrés Técnico",
                credit_quota=15000.0,
            ),
            current_user=owner_ctx,
            session=sqlite_session,
        )
    )
    member_id = UUID_from_str(member_res["member"]["id"])
    tech_user_id = member_res["member"]["user_id"]

    # Primer servicio: $100.000 -> comisión 10% = $10.000
    svc1_id = str(uuid4())
    txn1 = _run_async(
        credit_service.deduct_for_service(
            session=sqlite_session,
            technician_id=tech_user_id,
            service_id=svc1_id,
            service_amount=100000.0,
        )
    )
    assert txn1.amount == -10000.0

    org_info = _run_async(get_my_organization(current_user=owner_ctx, session=sqlite_session))
    assert org_info["wallet"]["balance"] == 190000.0
    assert org_info["wallet"]["total_consumed"] == 10000.0

    bal_after_1 = _run_async(credit_service.get_balance(sqlite_session, tech_user_id))
    assert bal_after_1["quota_used"] == 10000.0
    assert bal_after_1["quota_remaining"] == 5000.0

    # Segundo servicio: $100.000 -> comisión $10.000 > $5.000 disponibles en su cupo
    svc2_id = str(uuid4())
    with pytest.raises(HTTPException) as exc_info:
        _run_async(
            credit_service.deduct_for_service(
                session=sqlite_session,
                technician_id=tech_user_id,
                service_id=svc2_id,
                service_amount=100000.0,
            )
        )
    assert exc_info.value.status_code == 402
    assert "Cupo individual insuficiente" in exc_info.value.detail

    # El dueño amplía el cupo a $25.000 COP
    _run_async(
        update_member_quota(
            member_id=member_id,
            payload=UpdateQuotaRequest(credit_quota=25000.0, reset_used=False),
            current_user=owner_ctx,
            session=sqlite_session,
        )
    )

    # Ahora el segundo servicio pasa y descuenta de la billetera compartida ($190.000 -> $180.000)
    txn2 = _run_async(
        credit_service.deduct_for_service(
            session=sqlite_session,
            technician_id=tech_user_id,
            service_id=svc2_id,
            service_amount=100000.0,
        )
    )
    assert txn2.balance_after == 180000.0


def test_ca3_and_ca4_course_validation_and_dispatch_mode_toggle(sqlite_session: Session):
    """
    CA-3 y CA-4:
    - El dueño valida los cursos de su técnico (`POST /organizations/me/members/{id}/validate-courses`),
      dejándolo con `can_operate = True`.
    - En modo `dispatch_mode = "manual"`, si el técnico intenta auto-aceptar o cotizar directamente,
      recibe 403 `MANUAL_DISPATCH_MODE`.
    - El dueño tampoco puede auto-aceptar servicios (`OWNER_CANNOT_OPERATE`).
    - Cuando el taller alterna a `dispatch_mode = "direct"`, el técnico queda habilitado.
    """
    owner = User(
        id=uuid4(),
        email="owner3@tallertec.co",
        phone="+573009998877",
        full_name="Pedro Dueño",
        hashed_password="hash",
        role="client",
        is_active=True,
    )
    sqlite_session.add(owner)
    sqlite_session.commit()

    _run_async(
        register_organization(
            payload=OrganizationRegisterRequest(
                name="Taller Central Cali",
                city="Cali",
                dispatch_mode=DispatchMode.manual,
            ),
            current_user={"id": str(owner.id), "role": owner.role},
            session=sqlite_session,
        )
    )
    owner_ctx = {"id": str(owner.id), "role": "company_admin"}

    member_res = _run_async(
        add_organization_member(
            payload=AddMemberRequest(
                phone="3157778899",
                full_name="Camilo Técnico",
                validate_courses_immediately=False,
            ),
            current_user=owner_ctx,
            session=sqlite_session,
        )
    )
    member_id = UUID_from_str(member_res["member"]["id"])
    tech_user_id = member_res["member"]["user_id"]

    # Inicialmente no tiene los cursos validados
    gate_before = get_technician_course_gate_status(sqlite_session, tech_user_id)
    assert gate_before["can_operate"] is False

    # El dueño valida los cursos del técnico desde el panel del taller
    val_res = _run_async(
        validate_member_courses_by_workshop(
            member_id=member_id,
            current_user=owner_ctx,
            session=sqlite_session,
        )
    )
    assert val_res["courses_granted"] >= 1
    assert val_res["member"]["courses_validated"] is True

    gate_after = get_technician_course_gate_status(sqlite_session, tech_user_id)
    assert gate_after["can_operate"] is True

    # El dueño intenta aceptar un servicio directamente -> bloqueado con OWNER_CANNOT_OPERATE
    with pytest.raises(HTTPException) as owner_exc:
        _run_async(
            service_service.accept_service(
                session=sqlite_session,
                service_id=str(uuid4()),
                technician_id=str(owner.id),
                user_role="company_admin",
            )
        )
    assert owner_exc.value.status_code == 403
    assert "OWNER_CANNOT_OPERATE" in owner_exc.value.detail

    # En modo "manual", el técnico intenta aceptar por su cuenta -> bloqueado con MANUAL_DISPATCH_MODE
    with pytest.raises(HTTPException) as manual_exc:
        _run_async(
            service_service.accept_service(
                session=sqlite_session,
                service_id=str(uuid4()),
                technician_id=tech_user_id,
                user_role="technician",
                assigned_by_org=False,
            )
        )
    assert manual_exc.value.status_code == 403
    assert "MANUAL_DISPATCH_MODE" in manual_exc.value.detail

    # El dueño alterna el taller a modo "direct"
    upd_res = _run_async(
        update_my_organization(
            payload=OrganizationUpdateRequest(dispatch_mode=DispatchMode.direct),
            current_user=owner_ctx,
            session=sqlite_session,
        )
    )
    assert upd_res["dispatch_mode"] == "direct"


def test_ca5_workshop_assigns_service_to_technician_and_deducts_shared_wallet(sqlite_session: Session):
    """
    CA-5:
    - En modo `manual`, el dueño del taller asigna un servicio pendiente a uno de sus técnicos validados
      usando `assign_service_to_member_technician`.
    - El servicio pasa a `assigned` con `technician_id` del técnico miembro.
    - La comisión se descuenta de la billetera compartida del taller y se suma a `quota_used` del técnico.
    """
    client_user = User(
        id=uuid4(),
        email="cliente@test.co",
        phone="+573201112233",
        full_name="Cliente Servicio",
        hashed_password="hash",
        role="client",
        is_active=True,
    )
    owner = User(
        id=uuid4(),
        email="owner4@tallertec.co",
        phone="+573008887766",
        full_name="Jorge Dueño Taller",
        hashed_password="hash",
        role="client",
        is_active=True,
    )
    sqlite_session.add(client_user)
    sqlite_session.add(owner)
    sqlite_session.commit()

    _run_async(
        register_organization(
            payload=OrganizationRegisterRequest(
                name="Taller Express Barranquilla",
                city="Barranquilla",
                dispatch_mode=DispatchMode.manual,
            ),
            current_user={"id": str(owner.id), "role": owner.role},
            session=sqlite_session,
        )
    )
    owner_ctx = {"id": str(owner.id), "role": "company_admin"}

    member_res = _run_async(
        add_organization_member(
            payload=AddMemberRequest(
                phone="3162223344",
                full_name="Mateo Instalador",
                credit_quota=40000.0,
                validate_courses_immediately=True,
            ),
            current_user=owner_ctx,
            session=sqlite_session,
        )
    )
    tech_user_id = member_res["member"]["user_id"]

    # Crear servicio pendiente de $150.000 COP (comisión 10% = $15.000 COP)
    svc = Service(
        id=uuid4(),
        client_id=client_user.id,
        service_type=ServiceType.gps_installation,
        status=ServiceStatus.pending,
        title="Instalación GPS Camioneta",
        description="Instalación GPS 4G con apagado remoto",
        service_address="Cra 50 # 80-20, Barranquilla",
        scheduled_date=datetime.utcnow() + timedelta(hours=4),
        estimated_price=150000.0,
        vehicle_type=VehicleType.car,
        vehicle_model="Toyota Hilux 2024",
        vehicle_plate="ABC123",
    )
    sqlite_session.add(svc)
    sqlite_session.commit()

    # El dueño no puede asignarse el servicio a sí mismo
    with pytest.raises(HTTPException) as self_assign_exc:
        _run_async(
            assign_service_to_member_technician(
                service_id=str(svc.id),
                payload=AssignServiceRequest(technician_user_id=str(owner.id)),
                current_user=owner_ctx,
                session=sqlite_session,
            )
        )
    assert self_assign_exc.value.status_code == 403
    assert "OWNER_CANNOT_OPERATE" in self_assign_exc.value.detail

    # El dueño asigna el servicio al técnico Mateo Instalador
    assign_res = _run_async(
        assign_service_to_member_technician(
            service_id=str(svc.id),
            payload=AssignServiceRequest(technician_user_id=tech_user_id),
            current_user=owner_ctx,
            session=sqlite_session,
        )
    )
    assert assign_res["status"] == "assigned"
    assert assign_res["technician_id"] == tech_user_id

    # Verificar descuento en la billetera del taller ($200.000 - $15.000 = $185.000) y en el cupo del técnico
    org_after = _run_async(get_my_organization(current_user=owner_ctx, session=sqlite_session))
    assert org_after["wallet"]["balance"] == 185000.0
    assert org_after["wallet"]["total_consumed"] == 15000.0
    assert org_after[" wallet" if " wallet" in org_after else "wallet"]["total_quota_used"] == 15000.0


def test_ca6_admin_can_change_user_role_to_company_admin_and_provisions_organization(sqlite_session: Session):
    """
    CA-6:
    - El Super Admin puede cambiar el rol de un usuario a `company_admin` (Organización / Taller)
      desde `/admin/users/{user_id}/role`.
    - Al promoverlo a `company_admin`, si no tiene taller activo se provisiona automáticamente su
      `Organization` + `OrganizationMember(org_role="owner")` + bono de bienvenida de $200.000 COP,
      y se elimina cualquier perfil `Technician` previo (regla: el dueño no trabaja como técnico).
    - `GET /admin/users` expone `organization_name` y `GET /organizations/me` funciona sin 404.
    """
    from app.api.admin import RoleChangeRequest, change_user_role, list_users, platform_stats

    admin_user = User(
        id=uuid4(),
        email="superadmin@tec360.co",
        phone="+573000000001",
        full_name="Super Admin",
        hashed_password="hash",
        role="admin",
        is_active=True,
    )
    target_user = User(
        id=uuid4(),
        email="nuevo_taller@tec360.co",
        phone="+573007776655",
        full_name="Roberto Gómez",
        hashed_password="hash",
        role="technician",
        is_active=True,
    )
    sqlite_session.add(admin_user)
    sqlite_session.add(target_user)
    sqlite_session.flush()

    # Tenía perfil Technician antes de ser promovido a dueño de taller
    prior_tech = Technician(
        user_id=target_user.id,
        specializations=["gps_installation"],
        is_available=True,
    )
    sqlite_session.add(prior_tech)
    sqlite_session.commit()

    admin_ctx = {"id": str(admin_user.id), "role": "admin"}

    # Cambiar rol a company_admin desde el endpoint de Admin
    role_res = _run_async(
        change_user_role(
            user_id=str(target_user.id),
            body=RoleChangeRequest(role="company_admin", organization_name="Taller Roberto GPS"),
            current_user=admin_ctx,
            session=sqlite_session,
        )
    )
    assert role_res["role"] == "company_admin"
    assert role_res["organization_name"] == "Taller Roberto GPS"

    sqlite_session.refresh(target_user)
    assert target_user.role == "company_admin"

    # El perfil Technician previo fue removido (el dueño no opera como técnico)
    tech_after = sqlite_session.exec(
        select(Technician).where(Technician.user_id == target_user.id)
    ).first()
    assert tech_after is None

    # El usuario promovido puede consultar GET /organizations/me y tiene su bono de $200.000 COP
    org_me = _run_async(
        get_my_organization(
            current_user={"id": str(target_user.id), "role": "company_admin"},
            session=sqlite_session,
        )
    )
    assert org_me["name"] == "Taller Roberto GPS"
    assert org_me["wallet"]["balance"] == WELCOME_BONUS_AMOUNT

    # GET /admin/users filtrando por company_admin devuelve el usuario con su organization_name
    users_res = _run_async(
        list_users(
            skip=0,
            limit=50,
            role="company_admin",
            search=None,
            current_user=admin_ctx,
            session=sqlite_session,
        )
    )
    assert users_res["total"] >= 1
    found = [u for u in users_res["items"] if u["id"] == str(target_user.id)]
    assert len(found) == 1
    assert found[0]["organization_name"] == "Taller Roberto GPS"

    # GET /admin/stats incluye el conteo de organizaciones / talleres
    stats_res = _run_async(platform_stats(current_user=admin_ctx, session=sqlite_session))
    assert stats_res["users"]["organizations"] >= 1


def UUID_from_str(val: str):
    from uuid import UUID
    return UUID(str(val))
