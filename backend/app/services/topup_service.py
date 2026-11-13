"""
Servicio de recargas manuales Bre-B con verificación por administrador.

Diseño de rendimiento y seguridad:
- Compresión en cliente primero; backend solo re-codifica si excede 1.5 MB o 1600 px.
- Validación de imagen en hilo separado (`asyncio.to_thread` desde el router).
- Deduplicación por SHA-256 de los bytes originales.
- Aprobación atómica e idempotente (`UPDATE ... WHERE status = 'pending'`).
- Aviso instantáneo al solicitante vía WebSocket + Push existentes (cero polling).
"""
import hashlib
import io
import logging
import math
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy import case, func, update
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.core.config import settings
from app.models.credit import CreditTopUpRequest, CreditTopUpStatus
from app.models.organization import Organization, OrganizationMember, OrgMemberStatus, OrgRole
from app.services.credit_service import credit_service

logger = logging.getLogger(__name__)

MAX_RECEIPT_BYTES = 5 * 1024 * 1024  # 5 MB máx. por comprobante
MAX_IMAGE_PIXEL_BUDGET = 25_000_000
ALLOWED_RECEIPT_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
FORMAT_TO_EXTENSION = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}
REENCODE_THRESHOLD_BYTES = 1_500_000  # 1.5 MB
REENCODE_MAX_DIMENSION = 1600
REENCODE_JPEG_QUALITY = 80
MAX_PENDING_PER_USER = 3
MAX_REQUESTS_PER_HOUR = 5

REJECT_REASONS: dict[str, str] = {
    "1": "Pago no recibido",
    "2": "Monto no coincide",
    "3": "Comprobante ilegible o duplicado",
}


def _utcnow() -> datetime:
    """UTC naive compatible con columnas DateTime existentes en PostgreSQL."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


@dataclass(frozen=True)
class PreparedReceipt:
    data: bytes
    ext: str
    sha256: str


@dataclass(frozen=True)
class DecisionResult:
    request: Optional[CreditTopUpRequest]
    changed: bool


def prepare_receipt(raw_bytes: bytes, filename: str) -> PreparedReceipt:
    """
    Valida tamaño, extensión e integridad de imagen del comprobante y calcula su SHA-256.
    Solo re-codifica si la imagen supera el umbral de dimensiones o peso.
    """
    if not raw_bytes:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El comprobante está vacío")
    if len(raw_bytes) > MAX_RECEIPT_BYTES:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            "El comprobante supera el tamaño máximo permitido (5 MB)",
        )

    ext = os.path.splitext(filename or "")[1].lower()
    if ext not in ALLOWED_RECEIPT_EXTENSIONS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Formato {ext or 'desconocido'} no permitido. Usa JPG, PNG o WEBP.",
        )

    sha256 = hashlib.sha256(raw_bytes).hexdigest()

    # Validación segura por cabecera sin mutar el global Image.MAX_IMAGE_PIXELS en paralelo.
    try:
        with Image.open(io.BytesIO(raw_bytes)) as img_probe:
            img_format = (img_probe.format or "").upper()
            if img_format not in FORMAT_TO_EXTENSION:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    "Formato de imagen no válido. Usa JPG, PNG o WEBP.",
                )
            width, height = img_probe.size
            if width <= 0 or height <= 0:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Imagen de comprobante inválida")
            if width * height > MAX_IMAGE_PIXEL_BUDGET:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    "La resolución de la imagen excede el máximo permitido.",
                )

        with Image.open(io.BytesIO(raw_bytes)) as img:
            img.verify()

        with Image.open(io.BytesIO(raw_bytes)) as img:
            img.load()
            canonical_ext = FORMAT_TO_EXTENSION[img_format]
            if max(width, height) <= REENCODE_MAX_DIMENSION and len(raw_bytes) <= REENCODE_THRESHOLD_BYTES:
                return PreparedReceipt(data=raw_bytes, ext=canonical_ext, sha256=sha256)

            transposed = ImageOps.exif_transpose(img)
            transposed.thumbnail((REENCODE_MAX_DIMENSION, REENCODE_MAX_DIMENSION), Image.Resampling.LANCZOS)
            if transposed.mode in ("RGBA", "LA") or (
                transposed.mode == "P" and "transparency" in transposed.info
            ):
                rgba = transposed.convert("RGBA")
                canvas = Image.new("RGB", rgba.size, (255, 255, 255))
                canvas.paste(rgba, mask=rgba.split()[3])
                transposed = canvas
            elif transposed.mode != "RGB":
                transposed = transposed.convert("RGB")

            buf = io.BytesIO()
            transposed.save(buf, "JPEG", quality=REENCODE_JPEG_QUALITY, optimize=True)
            return PreparedReceipt(data=buf.getvalue(), ext=".jpg", sha256=sha256)
    except HTTPException:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El archivo no es una imagen válida")


def save_receipt_file(prepared: PreparedReceipt, request_id: UUID) -> str:
    """Guarda el comprobante optimizado en almacenamiento privado y retorna ruta relativa."""
    os.makedirs(settings.TOPUP_RECEIPTS_DIR, exist_ok=True)
    filename = f"{request_id.hex}{prepared.ext}"
    full_path = os.path.join(settings.TOPUP_RECEIPTS_DIR, filename)
    with open(full_path, "wb") as fh:
        fh.write(prepared.data)
    return f"_private/topups/{filename}"


def resolve_receipt_filepath(receipt_path: str) -> str:
    """Resuelve la ruta física dentro de TOPUP_RECEIPTS_DIR evitando path traversal."""
    base_dir = os.path.abspath(settings.TOPUP_RECEIPTS_DIR)
    safe_name = os.path.basename(receipt_path or "")
    target = os.path.abspath(os.path.join(base_dir, safe_name))
    if not safe_name or os.path.commonpath([base_dir, target]) != base_dir:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comprobante no encontrado")
    return target


def delete_receipt_file(receipt_path: str) -> None:
    """Limpia un comprobante en disco si falla el insert posterior."""
    try:
        filepath = resolve_receipt_filepath(receipt_path)
        if os.path.isfile(filepath):
            os.remove(filepath)
    except Exception:
        pass


def requester_block_reason(session: Session, user_id: str) -> Optional[str]:
    """
    Si el usuario pertenece a un Taller activo como técnico subcuenta o miembro suspendido,
    bloquea la recarga: en un Taller solo el dueño o gerente activo puede recargar.
    """
    tech_uuid = UUID(str(user_id))
    row = session.exec(
        select(OrganizationMember)
        .join(Organization, Organization.id == OrganizationMember.organization_id)
        .where(
            OrganizationMember.user_id == tech_uuid,
            Organization.is_active == True,  # noqa: E712
        )
    ).first()
    if not row:
        return None
    if row.status != OrgMemberStatus.active.value:
        return "Tu membresía en el taller está suspendida o inactiva para solicitar recargas."
    if row.org_role not in (OrgRole.owner.value, OrgRole.manager.value):
        return "Las recargas de un taller solo pueden ser solicitadas por el dueño o gerente."
    return None


def validate_pre_upload(session: Session, user_id: str, amount: float) -> None:
    """Valida monto, permisos y límites anti-spam ANTES de leer/decodificar la imagen."""
    if not math.isfinite(amount) or amount < settings.TOPUP_MIN_AMOUNT or amount > settings.TOPUP_MAX_AMOUNT:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"El monto debe estar entre ${settings.TOPUP_MIN_AMOUNT:,.0f} y ${settings.TOPUP_MAX_AMOUNT:,.0f} COP",
        )

    block_reason = requester_block_reason(session, user_id)
    if block_reason:
        raise HTTPException(status.HTTP_403_FORBIDDEN, block_reason)

    tech_uuid = UUID(str(user_id))
    one_hour_ago = _utcnow() - timedelta(hours=1)
    pending_count, hourly_count = session.exec(
        select(
            func.coalesce(
                func.sum(case((CreditTopUpRequest.status == CreditTopUpStatus.pending.value, 1), else_=0)),
                0,
            ),
            func.coalesce(
                func.sum(case((CreditTopUpRequest.created_at >= one_hour_ago, 1), else_=0)),
                0,
            ),
        ).where(CreditTopUpRequest.technician_id == tech_uuid)
    ).one()

    if int(pending_count) >= MAX_PENDING_PER_USER:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"Tienes {MAX_PENDING_PER_USER} recargas pendientes de revisión. Espera a que sean validadas.",
        )
    if int(hourly_count) >= MAX_REQUESTS_PER_HOUR:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Has alcanzado el límite de solicitudes por hora. Intenta más tarde.",
        )


def validate_receipt_not_duplicate(session: Session, receipt_sha256: str) -> None:
    """Rechaza comprobantes duplicados que sigan pendientes o ya acreditados."""
    duplicate = session.exec(
        select(CreditTopUpRequest.id).where(
            CreditTopUpRequest.receipt_sha256 == receipt_sha256,
            CreditTopUpRequest.status != CreditTopUpStatus.rejected.value,
        ).limit(1)
    ).first()
    if duplicate is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Este comprobante ya fue enviado o acreditado anteriormente.",
        )


def validate_new_request(session: Session, user_id: str, amount: float, receipt_sha256: str) -> None:
    """Valida reglas completas de monto, permisos, límites anti-spam y deduplicación."""
    validate_pre_upload(session, user_id, amount)
    validate_receipt_not_duplicate(session, receipt_sha256)


def insert_request(
    session: Session,
    *,
    user_id: str,
    amount: float,
    reference_hint: Optional[str],
    receipt_sha256: str,
    receipt_path: str,
    request_id: Optional[UUID] = None,
) -> CreditTopUpRequest:
    """Persiste la solicitud en estado pending manejando colisiones concurrentes de SHA-256."""
    cleaned_hint = reference_hint.strip()[:12] if reference_hint and reference_hint.strip() else None
    req = CreditTopUpRequest(
        id=request_id,
        technician_id=UUID(str(user_id)),
        amount=round(float(amount), 2),
        reference_hint=cleaned_hint,
        receipt_path=receipt_path,
        receipt_sha256=receipt_sha256,
        status=CreditTopUpStatus.pending.value,
    ) if request_id is not None else CreditTopUpRequest(
        technician_id=UUID(str(user_id)),
        amount=round(float(amount), 2),
        reference_hint=cleaned_hint,
        receipt_path=receipt_path,
        receipt_sha256=receipt_sha256,
        status=CreditTopUpStatus.pending.value,
    )

    try:
        session.add(req)
        session.commit()
        session.refresh(req)
        return req
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Este comprobante ya fue enviado o acreditado anteriormente.",
        )


async def approve_request(session: Session, request_id: UUID, reviewer: str) -> DecisionResult:
    """
    Aprueba de forma atómica e idempotente una solicitud pending y acredita los créditos.
    Si el pago/acreditación falla, se revierte toda la transacción para no aprobar sin saldo.
    """
    now = _utcnow()
    stmt = (
        update(CreditTopUpRequest)
        .where(
            CreditTopUpRequest.id == request_id,
            CreditTopUpRequest.status == CreditTopUpStatus.pending.value,
        )
        .values(
            status=CreditTopUpStatus.approved.value,
            reviewed_by=(reviewer or "")[:64],
            reviewed_at=now,
        )
    )
    res = session.execute(stmt)
    if not res.rowcount:
        session.rollback()
        existing = session.get(CreditTopUpRequest, request_id)
        return DecisionResult(request=existing, changed=False)

    req = session.get(CreditTopUpRequest, request_id)
    if req is None:
        session.rollback()
        return DecisionResult(request=None, changed=False)

    desc = "Recarga Bre-B verificada"
    if req.reference_hint:
        desc = f"{desc} (ref. {req.reference_hint})"

    try:
        txn = await credit_service.recharge(
            session=session,
            technician_id=str(req.technician_id),
            amount=req.amount,
            external_reference=f"TOPUP:{req.id}",
            description=desc,
            commit=False,
        )
        req.credit_transaction_id = txn.id
        session.add(req)
        session.commit()
        session.refresh(req)
        return DecisionResult(request=req, changed=True)
    except Exception:
        session.rollback()
        raise


def reject_request(
    session: Session,
    request_id: UUID,
    reviewer: str,
    reason_code: Optional[str] = None,
    custom_reason: Optional[str] = None,
) -> DecisionResult:
    """Rechaza de forma atómica una solicitud pending sin acreditar saldo."""
    reason = REJECT_REASONS.get(reason_code or "")
    if not reason:
        cleaned = (custom_reason or "").strip()
        reason = cleaned[:120] if cleaned else "Solicitud rechazada por el administrador"

    now = _utcnow()
    stmt = (
        update(CreditTopUpRequest)
        .where(
            CreditTopUpRequest.id == request_id,
            CreditTopUpRequest.status == CreditTopUpStatus.pending.value,
        )
        .values(
            status=CreditTopUpStatus.rejected.value,
            reject_reason=reason[:120],
            reviewed_by=(reviewer or "")[:64],
            reviewed_at=now,
        )
    )
    res = session.execute(stmt)
    if not res.rowcount:
        session.rollback()
        existing = session.get(CreditTopUpRequest, request_id)
        return DecisionResult(request=existing, changed=False)

    session.commit()
    req = session.get(CreditTopUpRequest, request_id)
    return DecisionResult(request=req, changed=True)


async def notify_requester_decision(request_id: UUID, approved: bool) -> None:
    """
    Notifica al solicitante por WebSocket + Push usando NotificationService existente.
    Se ejecuta en segundo plano con sesión propia para no bloquear al webhook ni al admin.
    """
    try:
        from app.core.database import engine
        from app.models.notification import NotificationCreate
        from app.services.notification_service import NotificationService

        with Session(engine) as session:
            req = session.get(CreditTopUpRequest, request_id)
            if not req:
                return
            amount_str = f"${req.amount:,.0f}".replace(",", ".")
            if approved:
                title = "✅ Recarga aprobada"
                message = f"Se acreditaron {amount_str} COP a tu billetera operativa."
            else:
                reason = req.reject_reason or "Verifica el comprobante e intenta de nuevo"
                title = "❌ Recarga rechazada"
                message = f"Tu recarga de {amount_str} COP fue rechazada: {reason}."

            await NotificationService.create_notification(
                session=session,
                data=NotificationCreate(
                    user_id=req.technician_id,
                    title=title,
                    message=message,
                    notification_type="credit_topup",
                ),
            )
    except Exception as exc:
        logger.warning(f"No se pudo notificar decisión de recarga {request_id}: {exc}")
