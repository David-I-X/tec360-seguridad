"""
Suite TDD (Codework) — Recargas manuales Bre-B + aprobación por Bot de Telegram.

Criterios de aceptación cubiertos:
CA-1  Modelo `credit_topup_requests` con índice único parcial del SHA-256 y migración encadenada.
CA-2  Validación de monto (mínimo / máximo configurables).
CA-3  Aprobación idempotente: doble toque / reintento acredita UNA sola vez.
CA-4  Talleres: solo dueño o gerente pueden solicitar recargas (va a la billetera del Taller).
CA-5  Anti-fraude: comprobante duplicado (SHA-256) → 409; máx. 3 pendientes y 5 por hora → 429.
CA-6  Rechazo con motivo, sin acreditar saldo.
CA-7  Comprobante: tope de tamaño, formato, re-codificación solo cuando hace falta.
CA-8  Telegram: callback_data <= 64 bytes, parseo seguro, escape HTML, lista blanca de admins.
CA-9  Webhook: secreto obligatorio (fail-closed), from.id no autorizado no acredita,
      respuesta con `answerCallbackQuery` en el mismo body (sin llamada HTTP extra).
CA-10 Endpoints de auto-recarga sandbox apagados con SIMULATION_ENABLED=false.
CA-11 Endpoints admin estrictos: `company_admin` NO pasa como `admin`.
CA-12 Comprobantes privados: Nginx bloquea /uploads/_private/ y el fallback de FastAPI también.
"""
import asyncio
import hashlib
import io
import re
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi import BackgroundTasks, HTTPException, Response
from PIL import Image
from sqlmodel import Session, SQLModel, create_engine, select

from app.core.config import settings
from app.models.credit import (
    CreditTopUpRequest,
    CreditTransaction,
    TechnicianCredit,
)
from app.models.organization import Organization, OrganizationMember, OrgRole
from app.models.user import User
from app.services import telegram_service, topup_service

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent
WEBHOOK_SECRET = "s3cr3t-webhook-token"
ADMIN_TG_ID = 777000111


# ── Helpers ─────────────────────────────────────────────────────────

def _run_async(coro):
    """Ejecuta una corrutina sin abrir un event loop (evita socketpair en Windows sandbox)."""
    try:
        while True:
            coro.send(None)
    except StopIteration as exc:
        return exc.value


def _png_bytes(width: int = 400, height: int = 800, color=(20, 40, 200)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (width, height), color).save(buf, "PNG")
    return buf.getvalue()


def _sha(n: int) -> str:
    return hashlib.sha256(f"receipt-{n}-{uuid4()}".encode()).hexdigest()


class _FakeRequest:
    def __init__(self, payload: dict):
        self._payload = payload

    async def json(self):
        return self._payload


@pytest.fixture(autouse=True)
def _topup_settings(monkeypatch):
    monkeypatch.setattr(settings, "TOPUP_MIN_AMOUNT", 10000.0)
    monkeypatch.setattr(settings, "TOPUP_MAX_AMOUNT", 2000000.0)
    monkeypatch.setattr(settings, "TOPUP_PAYEE_KEY", "@tec360pagos")
    monkeypatch.setattr(settings, "TOPUP_PAYEE_NAME", "Tec360 Seguridad")
    monkeypatch.setattr(settings, "TOPUP_QR_URL", "/static/topup/qr-bre-b.png")
    monkeypatch.setattr(settings, "TELEGRAM_BOT_TOKEN", "")
    monkeypatch.setattr(settings, "TELEGRAM_ADMIN_CHAT_IDS", str(ADMIN_TG_ID))
    monkeypatch.setattr(settings, "TELEGRAM_WEBHOOK_SECRET", WEBHOOK_SECRET)
    monkeypatch.setattr(settings, "SIMULATION_ENABLED", False)
    # recharge() programa un registro contable asíncrono: lo neutralizamos en pruebas sin loop.
    monkeypatch.setattr(asyncio, "create_task", lambda coro: coro.close())


@pytest.fixture()
def sqlite_session():
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
        yield session


def _make_user(session: Session, role: str = "technician", name: str = "Juan Técnico") -> User:
    user = User(
        id=uuid4(),
        email=f"u_{uuid4().hex[:8]}@test.co",
        phone=f"+57300{uuid4().int % 10000000:07d}",
        full_name=name,
        hashed_password="hash",
        role=role,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    if role == "technician":
        # Saldo previo (sin bono de bienvenida pendiente) para medir deltas exactos.
        session.add(TechnicianCredit(technician_id=user.id, balance=1000.0, total_recharged=1000.0))
        session.commit()
    return user


def _make_org(session: Session, owner: User) -> Organization:
    org = Organization(name="Taller Rapimecánicos", owner_id=owner.id, wallet_balance=0.0)
    session.add(org)
    session.commit()
    session.refresh(org)
    session.add(
        OrganizationMember(organization_id=org.id, user_id=owner.id, org_role=OrgRole.owner.value)
    )
    session.commit()
    return org


def _add_member(session: Session, org: Organization, user: User, role: str) -> None:
    session.add(OrganizationMember(organization_id=org.id, user_id=user.id, org_role=role))
    session.commit()


def _new_request(session: Session, user: User, amount: float = 50000.0, sha: str | None = None):
    sha = sha or _sha(1)
    topup_service.validate_new_request(session, str(user.id), amount, sha)
    return topup_service.insert_request(
        session,
        user_id=str(user.id),
        amount=amount,
        reference_hint="4821",
        receipt_sha256=sha,
        receipt_path=f"_private/topups/{uuid4().hex}.jpg",
    )


def _balance(session: Session, user: User) -> float:
    credit = session.exec(
        select(TechnicianCredit).where(TechnicianCredit.technician_id == user.id)
    ).first()
    return credit.balance if credit else 0.0


# ── CA-1 Modelo y migración ─────────────────────────────────────────

def test_ca1_model_table_and_partial_unique_receipt_index():
    table = CreditTopUpRequest.__table__
    assert table.name == "credit_topup_requests"
    indexes = {ix.name: ix for ix in table.indexes}
    sha_ix = indexes["uq_credit_topup_receipt_sha_active"]
    assert sha_ix.unique is True
    assert "rejected" in str(sha_ix.dialect_options["postgresql"]["where"])
    assert "ix_credit_topup_requests_tech_created" in indexes


def test_ca1_migration_is_chained_to_current_head():
    versions = BACKEND_DIR / "migrations" / "versions"
    matches = [p for p in versions.glob("*.py") if "credit_topup_requests" in p.read_text(encoding="utf-8")]
    assert len(matches) == 1, "Debe existir exactamente una migración para credit_topup_requests"
    text = matches[0].read_text(encoding="utf-8")
    assert "down_revision: Union[str, Sequence[str], None] = 'f8a9b0c1d2e3'" in text
    assert "uq_credit_topup_receipt_sha_active" in text
    assert "def downgrade()" in text and "drop_table('credit_topup_requests')" in text


# ── CA-2 Montos ─────────────────────────────────────────────────────

@pytest.mark.parametrize("amount", [0, 9999, 2000001, -5])
def test_ca2_amount_out_of_bounds_is_rejected(sqlite_session, amount):
    tech = _make_user(sqlite_session)
    with pytest.raises(HTTPException) as exc:
        topup_service.validate_new_request(sqlite_session, str(tech.id), amount, _sha(2))
    assert exc.value.status_code == 400


# ── CA-3 Aprobación idempotente ─────────────────────────────────────

def test_ca3_independent_technician_approval_credits_exactly_once(sqlite_session):
    tech = _make_user(sqlite_session)
    req = _new_request(sqlite_session, tech, amount=50000.0)
    assert req.status == "pending"
    base = _balance(sqlite_session, tech)

    first = _run_async(topup_service.approve_request(sqlite_session, req.id, reviewer="tg:1"))
    second = _run_async(topup_service.approve_request(sqlite_session, req.id, reviewer="tg:1"))

    assert first.changed is True
    assert second.changed is False
    assert second.request.status == "approved"
    assert _balance(sqlite_session, tech) == base + 50000.0
    txns = sqlite_session.exec(
        select(CreditTransaction).where(CreditTransaction.external_reference == f"TOPUP:{req.id}")
    ).all()
    assert len(txns) == 1
    sqlite_session.refresh(req)
    assert req.credit_transaction_id == txns[0].id
    assert req.reviewed_by == "tg:1"
    assert req.reviewed_at is not None


def test_ca3_unknown_request_returns_none(sqlite_session):
    result = _run_async(topup_service.approve_request(sqlite_session, uuid4(), reviewer="tg:1"))
    assert result.request is None and result.changed is False


# ── CA-4 Talleres ───────────────────────────────────────────────────

def test_ca4_workshop_member_technician_cannot_request(sqlite_session):
    owner = _make_user(sqlite_session, role="company_admin", name="Dueño")
    org = _make_org(sqlite_session, owner)
    member = _make_user(sqlite_session)
    _add_member(sqlite_session, org, member, OrgRole.technician.value)

    assert topup_service.requester_block_reason(sqlite_session, str(member.id))
    with pytest.raises(HTTPException) as exc:
        topup_service.validate_new_request(sqlite_session, str(member.id), 50000.0, _sha(3))
    assert exc.value.status_code == 403


@pytest.mark.parametrize("role", [OrgRole.owner.value, OrgRole.manager.value])
def test_ca4_owner_and_manager_credit_workshop_wallet(sqlite_session, role):
    owner = _make_user(sqlite_session, role="company_admin", name="Dueño")
    org = _make_org(sqlite_session, owner)
    requester = owner
    if role == OrgRole.manager.value:
        requester = _make_user(sqlite_session, name="Gerente")
        _add_member(sqlite_session, org, requester, role)

    assert topup_service.requester_block_reason(sqlite_session, str(requester.id)) is None
    req = _new_request(sqlite_session, requester, amount=120000.0)
    result = _run_async(topup_service.approve_request(sqlite_session, req.id, reviewer="tg:1"))

    assert result.changed is True
    sqlite_session.refresh(org)
    assert org.wallet_balance == 120000.0


# ── CA-5 Anti-fraude ────────────────────────────────────────────────

def test_ca5_duplicate_receipt_hash_conflicts_until_rejected(sqlite_session):
    tech = _make_user(sqlite_session)
    sha = _sha(5)
    req = _new_request(sqlite_session, tech, sha=sha)

    with pytest.raises(HTTPException) as exc:
        topup_service.validate_new_request(sqlite_session, str(tech.id), 50000.0, sha)
    assert exc.value.status_code == 409

    topup_service.reject_request(sqlite_session, req.id, reviewer="tg:1", reason_code="3")
    # Tras rechazo, el mismo comprobante puede reenviarse (p. ej. foto más legible del mismo pago).
    topup_service.validate_new_request(sqlite_session, str(tech.id), 50000.0, sha)


def test_ca5_max_three_pending_requests(sqlite_session):
    tech = _make_user(sqlite_session)
    for i in range(3):
        _new_request(sqlite_session, tech, sha=_sha(10 + i))
    with pytest.raises(HTTPException) as exc:
        topup_service.validate_new_request(sqlite_session, str(tech.id), 50000.0, _sha(20))
    assert exc.value.status_code == 429


def test_ca5_max_five_requests_per_hour(sqlite_session):
    tech = _make_user(sqlite_session)
    for i in range(5):
        req = _new_request(sqlite_session, tech, sha=_sha(30 + i))
        topup_service.reject_request(sqlite_session, req.id, reviewer="tg:1", reason_code="1")
    with pytest.raises(HTTPException) as exc:
        topup_service.validate_new_request(sqlite_session, str(tech.id), 50000.0, _sha(40))
    assert exc.value.status_code == 429


# ── CA-6 Rechazo ────────────────────────────────────────────────────

def test_ca6_reject_sets_reason_without_crediting(sqlite_session):
    tech = _make_user(sqlite_session)
    req = _new_request(sqlite_session, tech)
    base = _balance(sqlite_session, tech)

    result = topup_service.reject_request(sqlite_session, req.id, reviewer="tg:1", reason_code="2")
    assert result.changed is True
    assert result.request.status == "rejected"
    assert result.request.reject_reason == topup_service.REJECT_REASONS["2"]
    assert _balance(sqlite_session, tech) == base

    again = _run_async(topup_service.approve_request(sqlite_session, req.id, reviewer="tg:1"))
    assert again.changed is False
    assert _balance(sqlite_session, tech) == base


# ── CA-7 Comprobante ────────────────────────────────────────────────

def test_ca7_small_receipt_is_not_reencoded():
    raw = _png_bytes(400, 800)
    prepared = topup_service.prepare_receipt(raw, "comprobante.png")
    assert prepared.data == raw
    assert prepared.ext == ".png"
    assert prepared.sha256 == hashlib.sha256(raw).hexdigest()


def test_ca7_large_dimensions_are_downscaled_to_jpeg():
    raw = _png_bytes(2400, 3200)
    prepared = topup_service.prepare_receipt(raw, "captura.png")
    assert prepared.ext == ".jpg"
    with Image.open(io.BytesIO(prepared.data)) as img:
        assert max(img.size) <= topup_service.REENCODE_MAX_DIMENSION
    # El hash se calcula sobre los bytes originales (detección de duplicados).
    assert prepared.sha256 == hashlib.sha256(raw).hexdigest()


def test_ca7_invalid_inputs_are_rejected():
    with pytest.raises(HTTPException) as exc:
        topup_service.prepare_receipt(b"not-an-image", "x.jpg")
    assert exc.value.status_code == 400
    with pytest.raises(HTTPException) as exc:
        topup_service.prepare_receipt(_png_bytes(), "x.gif")
    assert exc.value.status_code == 400
    with pytest.raises(HTTPException) as exc:
        topup_service.prepare_receipt(b"0" * (topup_service.MAX_RECEIPT_BYTES + 1), "x.jpg")
    assert exc.value.status_code == 413


# ── CA-8 Telegram helpers ───────────────────────────────────────────

def test_ca8_callback_data_fits_telegram_limit_and_roundtrips():
    rid = uuid4()
    keyboards = [
        telegram_service.build_review_keyboard(rid),
        telegram_service.build_reject_keyboard(rid),
    ]
    datas = [btn["callback_data"] for kb in keyboards for row in kb["inline_keyboard"] for btn in row]
    assert datas and all(len(d.encode("utf-8")) <= 64 for d in datas)
    for d in datas:
        parsed = telegram_service.parse_callback_data(d)
        assert parsed is not None and parsed.request_id == rid


@pytest.mark.parametrize("bad", ["", "xx", "tu:ok:nothex", "tu:hack:" + "a" * 32, None, "tu:rj:" + "a" * 32 + ":9"])
def test_ca8_parse_rejects_garbage(bad):
    assert telegram_service.parse_callback_data(bad) is None


def test_ca8_caption_escapes_user_supplied_html():
    caption = telegram_service.format_request_caption(
        request_id=uuid4(),
        amount=50000.0,
        reference_hint="<i>12</i>",
        tech_name="<b>Hacker</b>",
        tech_phone="+573001112233",
        org_name=None,
    )
    assert "<b>Hacker</b>" not in caption
    assert "&lt;b&gt;Hacker&lt;/b&gt;" in caption
    assert "$50.000" in caption
    assert len(caption) <= 1024


def test_ca8_admin_allowlist(monkeypatch):
    monkeypatch.setattr(settings, "TELEGRAM_ADMIN_CHAT_IDS", f" {ADMIN_TG_ID} , 42 ")
    assert telegram_service.is_admin(ADMIN_TG_ID)
    assert telegram_service.is_admin(42)
    assert not telegram_service.is_admin(43)
    monkeypatch.setattr(settings, "TELEGRAM_ADMIN_CHAT_IDS", "")
    assert not telegram_service.is_admin(ADMIN_TG_ID)


# ── CA-9 Webhook ────────────────────────────────────────────────────

def _callback_update(data: str, from_id: int = ADMIN_TG_ID) -> dict:
    return {
        "update_id": 1,
        "callback_query": {
            "id": "cbq-1",
            "from": {"id": from_id, "first_name": "David"},
            "data": data,
            "message": {"message_id": 99, "chat": {"id": from_id}},
        },
    }


def _call_webhook(session, payload, secret=WEBHOOK_SECRET):
    from app.api.credits import telegram_webhook

    return _run_async(
        telegram_webhook(
            request=_FakeRequest(payload),
            background_tasks=BackgroundTasks(),
            session=session,
            x_telegram_bot_api_secret_token=secret,
        )
    )


def test_ca9_webhook_rejects_wrong_or_missing_secret(sqlite_session, monkeypatch):
    with pytest.raises(HTTPException) as exc:
        _call_webhook(sqlite_session, {}, secret="wrong")
    assert exc.value.status_code == 401
    monkeypatch.setattr(settings, "TELEGRAM_WEBHOOK_SECRET", "")
    with pytest.raises(HTTPException) as exc:
        _call_webhook(sqlite_session, {}, secret="")
    assert exc.value.status_code == 401


def test_ca9_unauthorized_telegram_user_cannot_approve(sqlite_session):
    tech = _make_user(sqlite_session)
    req = _new_request(sqlite_session, tech)
    base = _balance(sqlite_session, tech)

    resp = _call_webhook(sqlite_session, _callback_update(f"tu:ok:{req.id.hex}", from_id=123))
    assert resp["method"] == "answerCallbackQuery"
    sqlite_session.refresh(req)
    assert req.status == "pending"
    assert _balance(sqlite_session, tech) == base


def test_ca9_admin_approves_via_button_once(sqlite_session):
    tech = _make_user(sqlite_session)
    req = _new_request(sqlite_session, tech, amount=70000.0)
    base = _balance(sqlite_session, tech)

    resp1 = _call_webhook(sqlite_session, _callback_update(f"tu:ok:{req.id.hex}"))
    resp2 = _call_webhook(sqlite_session, _callback_update(f"tu:ok:{req.id.hex}"))

    assert resp1["method"] == "answerCallbackQuery" and resp1["callback_query_id"] == "cbq-1"
    assert "aprob" in resp1["text"].lower()
    assert "ya" in resp2["text"].lower()
    sqlite_session.refresh(req)
    assert req.status == "approved"
    assert req.reviewed_by == f"tg:{ADMIN_TG_ID}"
    assert _balance(sqlite_session, tech) == base + 70000.0


def test_ca9_reject_flow_with_reason_menu(sqlite_session):
    tech = _make_user(sqlite_session)
    req = _new_request(sqlite_session, tech)

    menu = _call_webhook(sqlite_session, _callback_update(f"tu:no:{req.id.hex}"))
    assert menu["method"] == "answerCallbackQuery"
    sqlite_session.refresh(req)
    assert req.status == "pending"

    done = _call_webhook(sqlite_session, _callback_update(f"tu:rj:{req.id.hex}:1"))
    assert "rechaz" in done["text"].lower()
    sqlite_session.refresh(req)
    assert req.status == "rejected"
    assert req.reject_reason == topup_service.REJECT_REASONS["1"]


def test_ca9_non_callback_updates_are_acknowledged(sqlite_session):
    assert _call_webhook(sqlite_session, {"update_id": 5, "message": {"text": "hola"}}) == {"ok": True}


# ── CA-10 Sandbox apagado ───────────────────────────────────────────

def test_ca10_legacy_self_recharge_endpoints_are_disabled(sqlite_session):
    from app.api.credits import (
        RechargeConfirmRequest,
        RechargeIntentRequest,
        RechargeRequest,
        confirm_recharge_intent,
        create_recharge_intent,
        recharge_credits,
    )
    from app.api.organizations import OrgWalletRechargeRequest, recharge_organization_wallet

    tech = _make_user(sqlite_session)
    base = _balance(sqlite_session, tech)
    user = {"id": str(tech.id), "role": "technician"}
    calls = [
        recharge_credits(data=RechargeRequest(amount=50000), current_user=user, session=sqlite_session),
        create_recharge_intent(data=RechargeIntentRequest(amount=50000), current_user=user, session=sqlite_session),
        confirm_recharge_intent(
            data=RechargeConfirmRequest(transaction_id="x", amount=50000), current_user=user, session=sqlite_session
        ),
        recharge_organization_wallet(
            payload=OrgWalletRechargeRequest(amount=50000), current_user=user, session=sqlite_session
        ),
    ]
    for coro in calls:
        with pytest.raises(HTTPException) as exc:
            _run_async(coro)
        assert exc.value.status_code == 403
    assert _balance(sqlite_session, tech) == base


# ── CA-11 Admin estricto ────────────────────────────────────────────

def test_ca11_platform_admin_dependency_is_strict():
    import inspect

    from app.api.credits import (
        admin_approve_topup_request,
        admin_get_topup_receipt,
        admin_grant_bonus,
        admin_list_topup_requests,
        admin_reject_topup_request,
        require_platform_admin,
    )

    with pytest.raises(HTTPException) as exc:
        _run_async(require_platform_admin(current_user={"id": "x", "role": "company_admin"}))
    assert exc.value.status_code == 403
    assert _run_async(require_platform_admin(current_user={"id": "x", "role": "admin"}))["role"] == "admin"

    for fn in (
        admin_grant_bonus,
        admin_list_topup_requests,
        admin_approve_topup_request,
        admin_reject_topup_request,
        admin_get_topup_receipt,
    ):
        dep = inspect.signature(fn).parameters["current_user"].default
        assert dep.dependency is require_platform_admin, fn.__name__


def test_ca11_topup_config_reports_requester_eligibility(sqlite_session):
    from app.api.credits import get_topup_config

    owner = _make_user(sqlite_session, role="company_admin", name="Dueño")
    org = _make_org(sqlite_session, owner)
    member = _make_user(sqlite_session)
    _add_member(sqlite_session, org, member, OrgRole.technician.value)

    response = Response()
    cfg_member = _run_async(
        get_topup_config(response=response, current_user={"id": str(member.id), "role": "technician"}, session=sqlite_session)
    )
    cfg_owner = _run_async(
        get_topup_config(response=Response(), current_user={"id": str(owner.id), "role": "company_admin"}, session=sqlite_session)
    )
    assert cfg_member.can_request is False and cfg_member.blocked_reason
    assert cfg_owner.can_request is True
    assert cfg_owner.payee_key == "@tec360pagos"
    assert cfg_owner.min_amount == 10000.0 and cfg_owner.max_amount == 2000000.0
    assert "max-age=300" in response.headers["Cache-Control"]


# ── CA-12 Privacidad de comprobantes ────────────────────────────────

def test_ca12_nginx_blocks_private_receipts_before_public_uploads():
    conf = (ROOT_DIR / "nginx" / "nginx.conf").read_text(encoding="utf-8")
    private_pos = conf.find("location ^~ /uploads/_private/")
    public_pos = conf.find("location ^~ /uploads/ {")
    assert private_pos != -1 and public_pos != -1
    assert private_pos < public_pos
    block = conf[private_pos: conf.find("}", private_pos)]
    assert re.search(r"return\s+404", block)


def test_ca12_fastapi_upload_fallback_refuses_private_folder():
    from app.main import serve_local_upload

    with pytest.raises(HTTPException) as exc:
        _run_async(serve_local_upload(folder="_private", filename="topups"))
    assert exc.value.status_code == 404


def test_ca13_router_create_list_and_admin_backup_endpoints(sqlite_session, tmp_path, monkeypatch):
    from app.api.credits import (
        AdminRejectRequest,
        admin_approve_topup_request,
        admin_get_topup_receipt,
        admin_list_topup_requests,
        admin_reject_topup_request,
        create_topup_request,
        list_my_topup_requests,
    )

    class _FakeUpload:
        def __init__(self, filename: str, data: bytes):
            self.filename = filename
            self._buf = io.BytesIO(data)

        async def read(self, size: int = -1) -> bytes:
            return self._buf.read(size)

    async def _sync_to_thread(fn, *args, **kwargs):
        return fn(*args, **kwargs)

    monkeypatch.setattr(asyncio, "to_thread", _sync_to_thread)
    monkeypatch.setattr(settings, "TOPUP_RECEIPTS_DIR", str(tmp_path))
    tech = _make_user(sqlite_session, name="Ana Técnica")
    base = _balance(sqlite_session, tech)

    raw = _png_bytes(300, 600)
    upload = _FakeUpload("comprobante.png", raw)
    bg = BackgroundTasks()
    created = _run_async(
        create_topup_request(
            background_tasks=bg,
            amount=80000.0,
            reference_hint="9911",
            receipt=upload,
            current_user={"id": str(tech.id), "role": "technician"},
            session=sqlite_session,
        )
    )
    assert created.status == "pending"
    assert len(bg.tasks) == 1

    mine = _run_async(
        list_my_topup_requests(
            limit=10,
            current_user={"id": str(tech.id), "role": "technician"},
            session=sqlite_session,
        )
    )
    assert len(mine) == 1 and mine[0].id == created.id

    admin_user = {"id": str(uuid4()), "role": "admin"}
    pending = _run_async(
        admin_list_topup_requests(
            status_filter="pending",
            limit=50,
            current_user=admin_user,
            session=sqlite_session,
        )
    )
    assert len(pending) == 1 and pending[0].requester_name == "Ana Técnica"

    file_resp = _run_async(
        admin_get_topup_receipt(request_id=created.id, current_user=admin_user, session=sqlite_session)
    )
    assert Path(file_resp.path).is_file()

    approved = _run_async(
        admin_approve_topup_request(
            request_id=created.id,
            background_tasks=BackgroundTasks(),
            current_user=admin_user,
            session=sqlite_session,
        )
    )
    assert approved.status == "approved"
    assert _balance(sqlite_session, tech) == base + 80000.0

    # Solicitud adicional rechazada vía respaldo admin
    upload2 = _FakeUpload("otra.png", _png_bytes(301, 600))
    created2 = _run_async(
        create_topup_request(
            background_tasks=BackgroundTasks(),
            amount=40000.0,
            reference_hint=None,
            receipt=upload2,
            current_user={"id": str(tech.id), "role": "technician"},
            session=sqlite_session,
        )
    )
    rejected = _run_async(
        admin_reject_topup_request(
            request_id=created2.id,
            background_tasks=BackgroundTasks(),
            payload=AdminRejectRequest(reason_code="2"),
            current_user=admin_user,
            session=sqlite_session,
        )
    )
    assert rejected.status == "rejected"
    assert rejected.reject_reason == topup_service.REJECT_REASONS["2"]


# ── CA-14 Endurecimiento de seguridad y regresión ────────────────────

def test_ca14_serve_local_upload_blocks_traversal_and_private():
    from app.main import serve_local_upload

    for folder, fname in [
        ("_private", "secret.jpg"),
        ("avatars", "../_private/topups/secret.jpg"),
        ("avatars", r"..\_private\secret.jpg"),
        ("avatars/..", "secret.jpg"),
    ]:
        with pytest.raises(HTTPException) as exc:
            _run_async(serve_local_upload(folder, fname))
        assert exc.value.status_code in (403, 404)


def test_ca14_suspended_workshop_member_cannot_request(sqlite_session):
    from app.models.organization import Organization, OrganizationMember, OrgMemberStatus, OrgRole

    owner = _make_user(sqlite_session, name="Owner Susp")
    suspended = _make_user(sqlite_session, name="Tech Susp")
    org = Organization(name="Taller Norte", owner_id=owner.id, is_active=True)
    sqlite_session.add(org)
    sqlite_session.flush()
    sqlite_session.add(
        OrganizationMember(
            organization_id=org.id,
            user_id=suspended.id,
            org_role=OrgRole.technician.value,
            status=OrgMemberStatus.suspended.value,
        )
    )
    sqlite_session.commit()

    reason = topup_service.requester_block_reason(sqlite_session, str(suspended.id))
    assert reason is not None


def test_ca14_gif_disguised_as_jpg_rejected_and_transparent_png_uses_white_bg():
    gif_buf = io.BytesIO()
    Image.new("RGB", (60, 60), color=(255, 0, 0)).save(gif_buf, format="GIF")
    with pytest.raises(HTTPException) as exc:
        topup_service.prepare_receipt(gif_buf.getvalue(), "falso.jpg")
    assert exc.value.status_code == 400

    rgba_buf = io.BytesIO()
    Image.new("RGBA", (2000, 100), color=(0, 0, 0, 0)).save(rgba_buf, format="PNG")
    prepared = topup_service.prepare_receipt(rgba_buf.getvalue(), "transparent.png")
    assert prepared.ext == ".jpg"
    with Image.open(io.BytesIO(prepared.data)) as img:
        r, g, b = img.getpixel((0, 0))
        assert r > 240 and g > 240 and b > 240


def test_ca14_webhook_handles_malformed_json_gracefully(sqlite_session, monkeypatch):
    from starlette.requests import Request
    from fastapi import BackgroundTasks
    from app.api.credits import telegram_webhook

    monkeypatch.setattr(settings, "TELEGRAM_WEBHOOK_SECRET", "secreto-json")
    req = Request({"type": "http", "method": "POST", "path": "/credits/telegram/webhook", "headers": []})
    req._body = b"{not-valid-json"

    res = _run_async(
        telegram_webhook(
            request=req,
            background_tasks=BackgroundTasks(),
            session=sqlite_session,
            x_telegram_bot_api_secret_token="secreto-json",
        )
    )
    assert res == {"ok": True}


