"""
API de Créditos — Billetera operativa y recargas manuales Bre-B + Bot Telegram.

Endpoints:
- GET  /credits/balance                  → Saldo actual del técnico o Taller
- GET  /credits/transactions             → Historial de movimientos
- GET  /credits/recharge/config          → Datos Bre-B (llave, titular, QR) y límites
- POST /credits/recharge/requests        → Sube comprobante Bre-B (queda `pending`)
- GET  /credits/recharge/requests        → Mis solicitudes recientes de recarga
- POST /credits/telegram/webhook         → Webhook seguro del Bot de Telegram (Aprobar/Rechazar)
- GET  /credits/admin/recharge-requests  → Respaldo administrativo de solicitudes
- POST /credits/admin/recharge-requests/{id}/approve | /reject → Aprobar/rechazar vía API
- GET  /credits/admin/recharge-requests/{id}/receipt → Comprobante privado (solo admin)
- POST /credits/admin/bonus              → Admin otorga bonificación
"""
import asyncio
import logging
import os
import secrets
from datetime import datetime
from typing import List, Optional, Union
from uuid import UUID, uuid4

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Body,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlmodel import Session, select

from app.core.config import settings
from app.core.database import engine, get_session
from app.core.security import get_current_user, require_roles
from app.models.credit import CreditTopUpRequest, CreditTopUpStatus
from app.models.service import Service
from app.models.user import User
from app.services import telegram_service, topup_service
from app.services.credit_service import credit_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/credits", tags=["credits"])


# ── Schemas ────────────────────────────────────

class BalanceResponse(BaseModel):
    balance: float
    total_recharged: float
    total_consumed: float
    free_services_remaining: int = 0
    can_accept_services: bool
    commission_rate: float
    welcome_bonus_granted: bool = True
    welcome_bonus_amount: float = 200000.0


class RechargeRequest(BaseModel):
    amount: float = 50000.0
    external_reference: Optional[str] = None
    payment_method: Optional[str] = None


class RechargeIntentRequest(BaseModel):
    amount: float = Field(default=50000.0, gt=0, description="Monto en COP a recargar")
    payment_method: str = Field(default="pse", description="pse | nequi | daviplata | card")
    bank_name: Optional[str] = None
    card_last_four: Optional[str] = None


class RechargeIntentResponse(BaseModel):
    transaction_id: str
    status: str = "processing"
    payment_method: str
    amount: float
    message: str = "Iniciando recarga en pasarela..."


class RechargeConfirmRequest(BaseModel):
    transaction_id: str
    amount: Optional[float] = 50000.0
    payment_method: Optional[str] = "pse"
    bank_name: Optional[str] = None


class RechargeConfirmResponse(BaseModel):
    id: Optional[str] = None
    transaction_id: str
    status: str = "completed"
    amount: float
    balance_after: float
    message: str = "Recarga de saldo acreditada exitosamente"


class TransactionResponse(BaseModel):
    id: Union[UUID, str]
    technician_id: Union[UUID, str]
    transaction_type: str
    amount: float
    balance_after: float
    service_id: Optional[Union[UUID, str]] = None
    description: str = ""
    external_reference: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CanAcceptResponse(BaseModel):
    can_accept: bool
    reason: str
    commission: float
    is_free: bool
    free_remaining: Optional[int] = None
    balance: Optional[float] = None
    deficit: Optional[float] = None


class AdminBonusRequest(BaseModel):
    technician_id: str
    amount: float
    description: str = "Bonificación administrativa"


class TopUpConfigResponse(BaseModel):
    enabled: bool
    payee_key: str
    payee_name: str
    qr_url: str
    min_amount: float
    max_amount: float
    can_request: bool
    blocked_reason: Optional[str] = None


class TopUpRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Union[UUID, str]
    technician_id: Union[UUID, str]
    amount: float
    reference_hint: Optional[str] = None
    status: str
    reject_reason: Optional[str] = None
    reviewed_by: Optional[str] = None
    credit_transaction_id: Optional[Union[UUID, str]] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None


class AdminTopUpRequestItem(TopUpRequestResponse):
    requester_name: Optional[str] = None
    requester_phone: Optional[str] = None


class AdminRejectRequest(BaseModel):
    reason_code: Optional[str] = None
    reason: Optional[str] = None


# ── Dependencias y Helpers ─────────────────────

async def require_platform_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Verifica rol administrador de plataforma estricto (excluye company_admin)."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Acceso denegado. Se requiere rol de administrador de plataforma.",
        )
    return current_user


def _build_caption_for_request(
    session: Session,
    req: CreditTopUpRequest,
    status_line: Optional[str] = None,
) -> str:
    user = session.get(User, req.technician_id)
    org_membership = credit_service.get_active_org_membership(session, str(req.technician_id))
    org_name = org_membership[0].name if org_membership else None
    return telegram_service.format_request_caption(
        request_id=req.id,
        amount=req.amount,
        reference_hint=req.reference_hint,
        tech_name=user.full_name if user else "Técnico",
        tech_phone=user.phone if user else None,
        org_name=org_name,
        status_line=status_line,
    )


async def _dispatch_topup_to_telegram(
    request_id: UUID,
    amount: float,
    reference_hint: Optional[str],
    tech_name: str,
    tech_phone: Optional[str],
    org_name: Optional[str],
    receipt_filepath: str,
) -> None:
    sent = await telegram_service.send_topup_to_admins(
        request_id=request_id,
        amount=amount,
        reference_hint=reference_hint,
        tech_name=tech_name,
        tech_phone=tech_phone,
        org_name=org_name,
        receipt_filepath=receipt_filepath,
    )
    if sent:
        chat_id, message_id = sent
        try:
            with Session(engine) as bg_session:
                req = bg_session.get(CreditTopUpRequest, request_id)
                if req:
                    req.telegram_chat_id = chat_id
                    req.telegram_message_id = message_id
                    bg_session.add(req)
                    bg_session.commit()
        except Exception as exc:
            logger.warning(f"No se pudo guardar telegram_message_id para {request_id}: {exc}")


async def _read_receipt_stream(receipt: UploadFile) -> bytes:
    """Lee el comprobante por bloques cortando de inmediato si excede MAX_RECEIPT_BYTES."""
    chunks: list[bytes] = []
    total = 0
    chunk_size = 65536
    while True:
        chunk = await receipt.read(chunk_size)
        if not chunk:
            break
        total += len(chunk)
        if total > topup_service.MAX_RECEIPT_BYTES:
            raise HTTPException(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                "El comprobante supera el tamaño máximo permitido (5 MB)",
            )
        chunks.append(chunk)
    return b"".join(chunks)


# ── Endpoints de Técnico ───────────────────────

@router.get("/balance", response_model=BalanceResponse)
async def get_my_balance(
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
    session: Session = Depends(get_session),
):
    """Obtiene el saldo de créditos del técnico autenticado."""
    data = await credit_service.get_balance(session, current_user["id"])
    return BalanceResponse(**data)


@router.get("/transactions", response_model=List[TransactionResponse])
async def get_my_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
    session: Session = Depends(get_session),
):
    """Historial de movimientos de créditos del técnico."""
    txns = await credit_service.get_transactions(
        session, current_user["id"], skip=skip, limit=limit
    )
    return txns


@router.get("/recharge/config", response_model=TopUpConfigResponse)
async def get_topup_config(
    response: Response,
    current_user: dict = Depends(require_roles("technician", "reaction_team", "company_admin")),
    session: Session = Depends(get_session),
):
    """Retorna la llave Bre-B, titular, QR y elegibilidad del solicitante (cacheable 5 min)."""
    response.headers["Cache-Control"] = "private, max-age=300"
    block_reason = topup_service.requester_block_reason(session, current_user["id"])
    payee_key = (settings.TOPUP_PAYEE_KEY or "").strip()
    qr_url = (settings.TOPUP_QR_URL or "").strip()
    return TopUpConfigResponse(
        enabled=bool(payee_key or qr_url),
        payee_key=payee_key,
        payee_name=(settings.TOPUP_PAYEE_NAME or "Tec360 Seguridad").strip(),
        qr_url=qr_url,
        min_amount=settings.TOPUP_MIN_AMOUNT,
        max_amount=settings.TOPUP_MAX_AMOUNT,
        can_request=block_reason is None,
        blocked_reason=block_reason,
    )


@router.post("/recharge/requests", response_model=TopUpRequestResponse, status_code=201)
async def create_topup_request(
    background_tasks: BackgroundTasks,
    amount: float = Form(..., description="Monto transferido en COP"),
    reference_hint: Optional[str] = Form(default=None, max_length=12),
    receipt: UploadFile = File(..., description="Captura del comprobante de pago"),
    current_user: dict = Depends(require_roles("technician", "reaction_team", "company_admin")),
    session: Session = Depends(get_session),
):
    """Registra una solicitud de recarga manual Bre-B y la envía al Bot de Telegram en segundo plano."""
    topup_service.validate_pre_upload(session, current_user["id"], amount)

    raw_bytes = await _read_receipt_stream(receipt)
    prepared = await asyncio.to_thread(
        topup_service.prepare_receipt, raw_bytes, receipt.filename or "comprobante.jpg"
    )

    topup_service.validate_receipt_not_duplicate(session, prepared.sha256)

    req_id = uuid4()
    receipt_path = await asyncio.to_thread(topup_service.save_receipt_file, prepared, req_id)
    try:
        req = topup_service.insert_request(
            session,
            user_id=current_user["id"],
            amount=amount,
            reference_hint=reference_hint,
            receipt_sha256=prepared.sha256,
            receipt_path=receipt_path,
            request_id=req_id,
        )
    except Exception:
        await asyncio.to_thread(topup_service.delete_receipt_file, receipt_path)
        raise

    user = session.get(User, UUID(str(current_user["id"])))
    org_membership = credit_service.get_active_org_membership(session, current_user["id"])
    org_name = org_membership[0].name if org_membership else None
    filepath = topup_service.resolve_receipt_filepath(req.receipt_path)

    background_tasks.add_task(
        _dispatch_topup_to_telegram,
        req.id,
        req.amount,
        req.reference_hint,
        user.full_name if user else "Técnico",
        user.phone if user else None,
        org_name,
        filepath,
    )
    return req


@router.get("/recharge/requests", response_model=List[TopUpRequestResponse])
async def list_my_topup_requests(
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(require_roles("technician", "reaction_team", "company_admin")),
    session: Session = Depends(get_session),
):
    """Lista las solicitudes recientes de recarga del usuario autenticado."""
    tech_uuid = UUID(str(current_user["id"]))
    rows = session.exec(
        select(CreditTopUpRequest)
        .where(CreditTopUpRequest.technician_id == tech_uuid)
        .order_by(CreditTopUpRequest.created_at.desc())
        .limit(limit)
    ).all()
    return list(rows)


@router.post("/telegram/webhook")
async def telegram_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    x_telegram_bot_api_secret_token: Optional[str] = Header(default=None),
):
    """
    Webhook de Telegram para aprobar/rechazar recargas desde botones inline.
    Responde con `answerCallbackQuery` en el mismo body HTTP para ahorrar llamadas salientes.
    """
    expected_secret = (settings.TELEGRAM_WEBHOOK_SECRET or "").strip()
    provided_secret = (x_telegram_bot_api_secret_token or "").strip()
    if not expected_secret or not secrets.compare_digest(provided_secret, expected_secret):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Webhook no autorizado")

    try:
        payload = await request.json()
    except (ValueError, TypeError):
        return {"ok": True}

    if not isinstance(payload, dict):
        return {"ok": True}

    cbq = payload.get("callback_query")
    if not isinstance(cbq, dict):
        return {"ok": True}

    cbq_id = str(cbq.get("id", ""))
    raw_from = cbq.get("from")
    from_user = raw_from if isinstance(raw_from, dict) else {}
    from_id = from_user.get("id")
    if not telegram_service.is_admin(from_id):
        return telegram_service.callback_answer(
            cbq_id, "No autorizado para aprobar recargas.", show_alert=True
        )

    parsed = telegram_service.parse_callback_data(cbq.get("data"))
    if parsed is None:
        return telegram_service.callback_answer(cbq_id, "Acción no reconocida.")

    raw_msg = cbq.get("message")
    message = raw_msg if isinstance(raw_msg, dict) else {}
    raw_chat = message.get("chat")
    chat_id = raw_chat.get("id") if isinstance(raw_chat, dict) else None
    message_id = message.get("message_id")
    admin_label = str(from_user.get("first_name") or f"ID {from_id}").strip()[:64]
    reviewer = f"tg:{from_id}"

    if parsed.action == "ok":
        result = await topup_service.approve_request(session, parsed.request_id, reviewer=reviewer)
        if result.request is None:
            return telegram_service.callback_answer(cbq_id, "Solicitud no encontrada.", show_alert=True)
        if not result.changed:
            if chat_id and message_id:
                background_tasks.add_task(
                    telegram_service.edit_message_reply_markup,
                    int(chat_id),
                    int(message_id),
                    {"inline_keyboard": []},
                )
            return telegram_service.callback_answer(
                cbq_id, f"Esta solicitud ya fue procesada ({result.request.status})."
            )

        background_tasks.add_task(topup_service.notify_requester_decision, result.request.id, True)
        if chat_id and message_id:
            caption = _build_caption_for_request(
                session, result.request, status_line=f"✅ APROBADO por {admin_label}"
            )
            background_tasks.add_task(
                telegram_service.edit_message_caption,
                int(chat_id),
                int(message_id),
                caption,
                {"inline_keyboard": []},
            )
        amount_txt = f"${result.request.amount:,.0f}".replace(",", ".")
        return telegram_service.callback_answer(cbq_id, f"Recarga aprobada: {amount_txt} COP")

    if parsed.action == "no":
        req = session.get(CreditTopUpRequest, parsed.request_id)
        if not req:
            return telegram_service.callback_answer(cbq_id, "Solicitud no encontrada.", show_alert=True)
        if req.status != CreditTopUpStatus.pending.value:
            return telegram_service.callback_answer(
                cbq_id, f"Esta solicitud ya fue procesada ({req.status})."
            )
        if chat_id and message_id:
            background_tasks.add_task(
                telegram_service.edit_message_reply_markup,
                int(chat_id),
                int(message_id),
                telegram_service.build_reject_keyboard(parsed.request_id),
            )
        return telegram_service.callback_answer(cbq_id, "Selecciona el motivo del rechazo.")

    if parsed.action == "bk":
        req = session.get(CreditTopUpRequest, parsed.request_id)
        if req and req.status == CreditTopUpStatus.pending.value and chat_id and message_id:
            background_tasks.add_task(
                telegram_service.edit_message_reply_markup,
                int(chat_id),
                int(message_id),
                telegram_service.build_review_keyboard(parsed.request_id),
            )
        return telegram_service.callback_answer(cbq_id, "Volviendo a opciones...")

    if parsed.action == "rj":
        result = topup_service.reject_request(
            session, parsed.request_id, reviewer=reviewer, reason_code=parsed.reason_code
        )
        if result.request is None:
            return telegram_service.callback_answer(cbq_id, "Solicitud no encontrada.", show_alert=True)
        if not result.changed:
            if chat_id and message_id:
                background_tasks.add_task(
                    telegram_service.edit_message_reply_markup,
                    int(chat_id),
                    int(message_id),
                    {"inline_keyboard": []},
                )
            return telegram_service.callback_answer(
                cbq_id, f"Esta solicitud ya fue procesada ({result.request.status})."
            )

        background_tasks.add_task(topup_service.notify_requester_decision, result.request.id, False)
        if chat_id and message_id:
            reason_txt = result.request.reject_reason or "Rechazada"
            caption = _build_caption_for_request(
                session,
                result.request,
                status_line=f"❌ RECHAZADO por {admin_label}: {reason_txt}",
            )
            background_tasks.add_task(
                telegram_service.edit_message_caption,
                int(chat_id),
                int(message_id),
                caption,
                {"inline_keyboard": []},
            )
        return telegram_service.callback_answer(
            cbq_id, f"Recarga rechazada: {result.request.reject_reason}"
        )

    return {"ok": True}


@router.post("/recharge", response_model=TransactionResponse, status_code=201)
async def recharge_credits(
    data: RechargeRequest,
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
    session: Session = Depends(get_session),
):
    """Recarga directa simulada (deshabilitada en producción)."""
    if settings.ENVIRONMENT == "production" or not settings.SIMULATION_ENABLED:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "La recarga directa simulada está deshabilitada. Usa recarga por Bre-B con comprobante.",
        )
    desc = "Recarga de créditos"
    if data.payment_method:
        desc = f"Recarga de créditos via {data.payment_method.upper()}"
    effective_amount = data.amount if (data.amount and data.amount > 0) else 50000.0
    txn = await credit_service.recharge(
        session=session,
        technician_id=current_user["id"],
        amount=effective_amount,
        external_reference=data.external_reference,
        description=desc,
    )
    return txn


@router.post("/recharge/intent", response_model=RechargeIntentResponse, status_code=201)
async def create_recharge_intent(
    data: RechargeIntentRequest,
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
    session: Session = Depends(get_session),
):
    """Inicia la recarga sandbox (deshabilitada en producción)."""
    if settings.ENVIRONMENT == "production" or not settings.SIMULATION_ENABLED:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "La recarga directa simulada está deshabilitada. Usa recarga por Bre-B con comprobante.",
        )
    tx_id = f"sandbox-rech-{uuid4().hex[:14]}"
    effective_amount = data.amount if (data.amount and data.amount > 0) else 50000.0
    return RechargeIntentResponse(
        transaction_id=tx_id,
        status="processing",
        payment_method=data.payment_method,
        amount=effective_amount,
        message="Pasarela digital sandbox iniciada para recarga",
    )


@router.post("/recharge/confirm", response_model=RechargeConfirmResponse, status_code=200)
async def confirm_recharge_intent(
    data: RechargeConfirmRequest,
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
    session: Session = Depends(get_session),
):
    """Confirma la recarga sandbox (deshabilitada en producción)."""
    if settings.ENVIRONMENT == "production" or not settings.SIMULATION_ENABLED:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "La recarga directa simulada está deshabilitada. Usa recarga por Bre-B con comprobante.",
        )
    method_labels = {
        "pse": f"PSE ({data.bank_name or 'Bancolombia'})",
        "card": "Tarjeta Débito/Crédito",
        "nequi": "Nequi",
        "daviplata": "Daviplata",
    }
    method_str = method_labels.get(data.payment_method, (data.payment_method or "SANDBOX").upper())
    desc = f"Recarga de créditos via {method_str}"

    effective_amount = data.amount if (data.amount and data.amount > 0) else 50000.0

    txn = await credit_service.recharge(
        session=session,
        technician_id=current_user["id"],
        amount=effective_amount,
        external_reference=data.transaction_id,
        description=desc,
    )
    return RechargeConfirmResponse(
        id=str(txn.id),
        transaction_id=data.transaction_id,
        status="completed",
        amount=effective_amount,
        balance_after=txn.balance_after,
        message="Recarga de saldo acreditada exitosamente",
    )


@router.get("/check/{service_id}", response_model=CanAcceptResponse)
async def check_can_accept(
    service_id: str,
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
    session: Session = Depends(get_session),
):
    """Verifica si el técnico puede aceptar un servicio dado su saldo."""
    service = session.get(Service, UUID(service_id))
    if not service:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")

    service_amount = service.estimated_price or 250000  # Default si no tiene precio
    result = await credit_service.can_accept_service(
        session, current_user["id"], service_amount
    )
    return CanAcceptResponse(**result)


# ── Endpoints de Admin ─────────────────────────

@router.get("/admin/recharge-requests", response_model=List[AdminTopUpRequestItem])
async def admin_list_topup_requests(
    status_filter: Optional[str] = Query(default="pending", alias="status"),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(require_platform_admin),
    session: Session = Depends(get_session),
):
    """Lista solicitudes de recarga manual Bre-B para respaldo administrativo."""
    stmt = select(CreditTopUpRequest)
    if status_filter and status_filter != "all":
        stmt = stmt.where(CreditTopUpRequest.status == status_filter)
    rows = session.exec(stmt.order_by(CreditTopUpRequest.created_at.desc()).limit(limit)).all()

    user_ids = list({r.technician_id for r in rows})
    users_by_id: dict[UUID, User] = {}
    if user_ids:
        for u in session.exec(select(User).where(User.id.in_(user_ids))).all():
            users_by_id[u.id] = u

    items: list[AdminTopUpRequestItem] = []
    for r in rows:
        u = users_by_id.get(r.technician_id)
        item = AdminTopUpRequestItem.model_validate(r)
        item.requester_name = u.full_name if u else None
        item.requester_phone = u.phone if u else None
        items.append(item)
    return items


@router.post("/admin/recharge-requests/{request_id}/approve", response_model=TopUpRequestResponse)
async def admin_approve_topup_request(
    request_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_platform_admin),
    session: Session = Depends(get_session),
):
    """Aprueba de forma idempotente una solicitud de recarga pendiente desde el respaldo admin."""
    result = await topup_service.approve_request(
        session, request_id, reviewer=f"admin:{current_user['id']}"
    )
    if result.request is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Solicitud no encontrada")
    if result.changed:
        background_tasks.add_task(topup_service.notify_requester_decision, result.request.id, True)
        if result.request.telegram_chat_id and result.request.telegram_message_id:
            caption = _build_caption_for_request(
                session, result.request, status_line="✅ APROBADO desde panel admin"
            )
            background_tasks.add_task(
                telegram_service.edit_message_caption,
                int(result.request.telegram_chat_id),
                int(result.request.telegram_message_id),
                caption,
                {"inline_keyboard": []},
            )
    return result.request


@router.post("/admin/recharge-requests/{request_id}/reject", response_model=TopUpRequestResponse)
async def admin_reject_topup_request(
    request_id: UUID,
    background_tasks: BackgroundTasks,
    payload: Optional[AdminRejectRequest] = Body(default=None),
    current_user: dict = Depends(require_platform_admin),
    session: Session = Depends(get_session),
):
    """Rechaza una solicitud pendiente sin acreditar créditos."""
    result = topup_service.reject_request(
        session,
        request_id,
        reviewer=f"admin:{current_user['id']}",
        reason_code=payload.reason_code if payload else None,
        custom_reason=payload.reason if payload else None,
    )
    if result.request is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Solicitud no encontrada")
    if result.changed:
        background_tasks.add_task(topup_service.notify_requester_decision, result.request.id, False)
        if result.request.telegram_chat_id and result.request.telegram_message_id:
            reason_txt = result.request.reject_reason or "Rechazada"
            caption = _build_caption_for_request(
                session,
                result.request,
                status_line=f"❌ RECHAZADO desde panel admin: {reason_txt}",
            )
            background_tasks.add_task(
                telegram_service.edit_message_caption,
                int(result.request.telegram_chat_id),
                int(result.request.telegram_message_id),
                caption,
                {"inline_keyboard": []},
            )
    return result.request


@router.get("/admin/recharge-requests/{request_id}/receipt")
async def admin_get_topup_receipt(
    request_id: UUID,
    current_user: dict = Depends(require_platform_admin),
    session: Session = Depends(get_session),
):
    """Entrega la imagen privada del comprobante únicamente a un administrador autenticado."""
    req = session.get(CreditTopUpRequest, request_id)
    if not req:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Solicitud no encontrada")
    filepath = topup_service.resolve_receipt_filepath(req.receipt_path)
    if not os.path.isfile(filepath):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comprobante no encontrado")
    return FileResponse(filepath, headers={"X-Content-Type-Options": "nosniff"})


@router.post("/admin/bonus", response_model=TransactionResponse, status_code=201)
async def admin_grant_bonus(
    data: AdminBonusRequest,
    current_user: dict = Depends(require_platform_admin),
    session: Session = Depends(get_session),
):
    """Admin otorga una bonificación de créditos a un técnico."""
    txn = await credit_service.recharge(
        session=session,
        technician_id=data.technician_id,
        amount=data.amount,
        description=data.description,
    )
    return txn


@router.get("/admin/{technician_id}/balance", response_model=BalanceResponse)
async def admin_get_balance(
    technician_id: str,
    current_user: dict = Depends(require_platform_admin),
    session: Session = Depends(get_session),
):
    """Admin consulta el saldo de un técnico específico."""
    data = await credit_service.get_balance(session, technician_id)
    return BalanceResponse(**data)
