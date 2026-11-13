"""
Cliente asíncrono minimalista para el Bot de Telegram (costo $0).

Optimizaciones de rendimiento:
- Un único `httpx.AsyncClient` compartido con keep-alive (sin handshake TLS por mensaje).
- Respuesta al webhook con `answerCallbackQuery` en el mismo body HTTP.
- `callback_data` compacto (<= 40 bytes, muy por debajo del límite de 64 bytes).
"""
import asyncio
import html
import logging
import os
from dataclasses import dataclass
from typing import Optional
from uuid import UUID

import httpx

from app.core.config import settings
from app.services.topup_service import REJECT_REASONS

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org"
_shared_client: Optional[httpx.AsyncClient] = None


@dataclass(frozen=True)
class ParsedCallback:
    action: str
    request_id: UUID
    reason_code: Optional[str] = None


def get_client() -> httpx.AsyncClient:
    """Retorna el cliente HTTP compartido con pool keep-alive hacia api.telegram.org."""
    global _shared_client
    if _shared_client is None or _shared_client.is_closed:
        _shared_client = httpx.AsyncClient(
            timeout=httpx.Timeout(10.0, connect=5.0),
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
        )
    return _shared_client


async def close_client() -> None:
    """Cierra ordenadamente el cliente HTTP compartido en shutdown."""
    global _shared_client
    if _shared_client is not None and not _shared_client.is_closed:
        await _shared_client.aclose()
    _shared_client = None


def get_admin_chat_ids() -> list[int]:
    """Lista blanca de IDs de Telegram autorizados para aprobar/rechazar recargas."""
    raw = settings.TELEGRAM_ADMIN_CHAT_IDS or ""
    ids: list[int] = []
    for part in raw.split(","):
        cleaned = part.strip()
        if not cleaned:
            continue
        try:
            ids.append(int(cleaned))
        except ValueError:
            logger.warning(f"TELEGRAM_ADMIN_CHAT_IDS contiene valor inválido ignorado: {cleaned!r}")
    return ids


def is_admin(telegram_user_id: Optional[int]) -> bool:
    """Verifica si el usuario de Telegram pertenece a la lista blanca de administradores."""
    if telegram_user_id is None:
        return False
    try:
        uid = int(telegram_user_id)
    except (TypeError, ValueError):
        return False
    return uid in get_admin_chat_ids()


def build_review_keyboard(request_id: UUID) -> dict:
    rid = request_id.hex
    return {
        "inline_keyboard": [
            [
                {"text": "✅ Aprobar", "callback_data": f"tu:ok:{rid}"},
                {"text": "❌ Rechazar", "callback_data": f"tu:no:{rid}"},
            ]
        ]
    }


def build_reject_keyboard(request_id: UUID) -> dict:
    rid = request_id.hex
    return {
        "inline_keyboard": [
            [{"text": "1. Pago no recibido", "callback_data": f"tu:rj:{rid}:1"}],
            [{"text": "2. Monto no coincide", "callback_data": f"tu:rj:{rid}:2"}],
            [{"text": "3. Comprobante ilegible/duplicado", "callback_data": f"tu:rj:{rid}:3"}],
            [{"text": "⬅️ Volver", "callback_data": f"tu:bk:{rid}"}],
        ]
    }


def parse_callback_data(data: Optional[str]) -> Optional[ParsedCallback]:
    """Parsea y valida estrictamente callback_data generado por build_*_keyboard."""
    if not isinstance(data, str) or not data:
        return None
    parts = data.split(":")
    if len(parts) < 3 or parts[0] != "tu":
        return None

    action = parts[1]
    hex_id = parts[2]
    if len(hex_id) != 32:
        return None
    try:
        req_uuid = UUID(hex=hex_id)
    except ValueError:
        return None

    if action in ("ok", "no", "bk") and len(parts) == 3:
        return ParsedCallback(action=action, request_id=req_uuid)
    if action == "rj" and len(parts) == 4 and parts[3] in REJECT_REASONS:
        return ParsedCallback(action=action, request_id=req_uuid, reason_code=parts[3])
    return None


def _format_cop(amount: float) -> str:
    return f"${amount:,.0f}".replace(",", ".")


def format_request_caption(
    *,
    request_id: UUID,
    amount: float,
    reference_hint: Optional[str],
    tech_name: str,
    tech_phone: Optional[str],
    org_name: Optional[str],
    status_line: Optional[str] = None,
) -> str:
    """
    Construye el caption HTML escapado (<= 1024 caracteres, límite de Telegram).
    Acota cada campo ANTES de `html.escape` para nunca cortar una entidad o etiqueta HTML.
    """
    safe_name = html.escape((tech_name or "Técnico").strip()[:80])
    safe_phone = html.escape((tech_phone or "Sin teléfono").strip()[:32])
    safe_ref = html.escape(reference_hint.strip()[:24]) if reference_hint else "No indicada"
    safe_org = html.escape(org_name.strip()[:80]) if org_name else None

    lines = [
        "💳 <b>Nueva solicitud de recarga Bre-B</b>",
        f"💰 <b>Monto:</b> {_format_cop(amount)} COP",
        f"👤 <b>Solicitante:</b> {safe_name} ({safe_phone})",
    ]
    if safe_org:
        lines.append(f"🏢 <b>Taller:</b> {safe_org}")
    lines.append(f"🔢 <b>Ref. comprobante:</b> {safe_ref}")
    lines.append(f"🆔 <code>{request_id.hex[:12]}</code>")
    if status_line:
        lines.append("")
        lines.append(html.escape(status_line.strip()[:220]))

    return "\n".join(lines)


def _read_file_bytes(filepath: str) -> bytes:
    with open(filepath, "rb") as fh:
        return fh.read()


def callback_answer(callback_query_id: str, text: str, show_alert: bool = False) -> dict:
    """Payload devuelto en el mismo response HTTP del webhook (evita 1 llamada extra)."""
    return {
        "method": "answerCallbackQuery",
        "callback_query_id": callback_query_id,
        "text": text[:200],
        "show_alert": show_alert,
    }


async def send_topup_to_admins(
    *,
    request_id: UUID,
    amount: float,
    reference_hint: Optional[str],
    tech_name: str,
    tech_phone: Optional[str],
    org_name: Optional[str],
    receipt_filepath: str,
) -> Optional[tuple[int, int]]:
    """Envía foto del comprobante y botones Aprobar/Rechazar a todos los admins en Telegram."""
    token = (settings.TELEGRAM_BOT_TOKEN or "").strip()
    admin_ids = get_admin_chat_ids()
    if not token or not admin_ids:
        logger.info(f"Telegram no configurado; recarga {request_id} queda solo en panel admin.")
        return None

    if not os.path.isfile(receipt_filepath):
        logger.warning(f"Comprobante no encontrado en disco para Telegram: {receipt_filepath}")
        return None

    image_bytes = await asyncio.to_thread(_read_file_bytes, receipt_filepath)

    ext = os.path.splitext(receipt_filepath)[1].lower()
    mime = "image/png" if ext == ".png" else "image/webp" if ext == ".webp" else "image/jpeg"
    caption = format_request_caption(
        request_id=request_id,
        amount=amount,
        reference_hint=reference_hint,
        tech_name=tech_name,
        tech_phone=tech_phone,
        org_name=org_name,
    )
    keyboard = build_review_keyboard(request_id)

    import json as _json

    client = get_client()
    url = f"{TELEGRAM_API_BASE}/bot{token}/sendPhoto"
    last_sent: Optional[tuple[int, int]] = None

    for chat_id in admin_ids:
        try:
            resp = await client.post(
                url,
                data={
                    "chat_id": str(chat_id),
                    "caption": caption,
                    "parse_mode": "HTML",
                    "reply_markup": _json.dumps(keyboard),
                },
                files={"photo": (f"comprobante{ext or '.jpg'}", image_bytes, mime)},
            )
            body = resp.json()
            if resp.is_success and body.get("ok"):
                msg_id = body["result"]["message_id"]
                last_sent = (chat_id, int(msg_id))
            else:
                logger.warning(f"Telegram sendPhoto error para chat {chat_id}: {resp.status_code} {body}")
        except Exception as exc:
            logger.warning(f"Error enviando recarga {request_id} a Telegram chat {chat_id}: {exc}")

    return last_sent


async def edit_message_caption(
    chat_id: int,
    message_id: int,
    caption: str,
    reply_markup: Optional[dict] = None,
) -> None:
    """Actualiza el caption y teclado de un mensaje ya enviado en Telegram."""
    token = (settings.TELEGRAM_BOT_TOKEN or "").strip()
    if not token:
        return
    try:
        payload: dict = {
            "chat_id": chat_id,
            "message_id": message_id,
            "caption": caption[:1024],
            "parse_mode": "HTML",
        }
        if reply_markup is not None:
            payload["reply_markup"] = reply_markup
        resp = await get_client().post(
            f"{TELEGRAM_API_BASE}/bot{token}/editMessageCaption",
            json=payload,
        )
        if not resp.is_success:
            logger.warning(f"Telegram editMessageCaption fallo: {resp.status_code} {resp.text[:200]}")
    except Exception as exc:
        logger.warning(f"Error editando mensaje Telegram {chat_id}/{message_id}: {exc}")


async def edit_message_reply_markup(
    chat_id: int,
    message_id: int,
    reply_markup: dict,
) -> None:
    """Actualiza únicamente los botones del mensaje en Telegram."""
    token = (settings.TELEGRAM_BOT_TOKEN or "").strip()
    if not token:
        return
    try:
        resp = await get_client().post(
            f"{TELEGRAM_API_BASE}/bot{token}/editMessageReplyMarkup",
            json={
                "chat_id": chat_id,
                "message_id": message_id,
                "reply_markup": reply_markup,
            },
        )
        if not resp.is_success:
            logger.warning(f"Telegram editMessageReplyMarkup fallo: {resp.status_code} {resp.text[:200]}")
    except Exception as exc:
        logger.warning(f"Error editando botones Telegram {chat_id}/{message_id}: {exc}")
