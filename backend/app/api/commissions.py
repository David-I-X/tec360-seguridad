"""
Commission API Endpoints — Tec360 Seguridad

Endpoints para:
- Técnicos: ver balance, subir comprobante
- Admin: ver pagos pendientes, aprobar/rechazar, stats
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlmodel import Session
from pydantic import BaseModel

from app.core.database import get_session
from app.core.security import get_current_user, require_roles
from app.services.commission_service import commission_service

router = APIRouter(prefix="/commissions", tags=["commissions"])


# ── Schemas ───────────────────────────────────────────────────

class ReceiptSubmit(BaseModel):
    payment_id: str
    reference_number: Optional[str] = None
    payment_method: str = "nequi"  # nequi, bancolombia, daviplata


class ReviewRequest(BaseModel):
    approved: bool
    admin_notes: Optional[str] = None


# ── Technician Endpoints ─────────────────────────────────────

@router.get("/me/balance", summary="Mi balance de comisiones")
async def get_my_balance(
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
    session: Session = Depends(get_session),
):
    """
    Devuelve el resumen de comisiones del técnico:
    - Monto pendiente
    - Servicios pendientes de pago
    - Servicios gratis restantes
    - Si está bloqueado
    - Pago activo (si existe)
    """
    return await commission_service.get_technician_balance(
        session, str(current_user["id"])
    )


@router.post("/me/submit-receipt", summary="Subir comprobante de transferencia")
async def submit_receipt(
    file: UploadFile = File(...),
    payment_id: str = Form(...),
    reference_number: Optional[str] = Form(None),
    payment_method: str = Form("nequi"),
    current_user: dict = Depends(require_roles("technician", "reaction_team")),
    session: Session = Depends(get_session),
):
    """
    Técnico sube foto del comprobante de transferencia (Nequi, Bancolombia, etc).
    """
    import os
    import uuid as uuid_mod

    # Validate file
    if not file.filename:
        raise HTTPException(400, "No filename provided")
    ext = os.path.splitext(file.filename)[1].lower()
    allowed = {".jpg", ".jpeg", ".png", ".webp"}
    if ext not in allowed:
        raise HTTPException(400, f"Tipo de archivo no permitido. Usa: {allowed}")

    content = await file.read()
    max_size = 10 * 1024 * 1024  # 10MB
    if len(content) > max_size:
        raise HTTPException(400, "Archivo muy grande (máx 10MB)")

    # Save file
    upload_dir = "/opt/tec360-seguridad/uploads/receipts"
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"{payment_id}_{uuid_mod.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(upload_dir, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    receipt_url = f"/uploads/receipts/{filename}"

    return await commission_service.submit_receipt(
        session=session,
        technician_id=str(current_user["id"]),
        payment_id=payment_id,
        receipt_url=receipt_url,
        reference_number=reference_number,
        payment_method=payment_method,
    )


# ── Admin Endpoints ──────────────────────────────────────────

@router.get("", summary="[Admin] Listar pagos de comisiones")
async def list_commission_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None, description="pending, submitted, approved, rejected"),
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session),
):
    """Admin: lista todos los pagos de comisiones con filtros."""
    return await commission_service.admin_list_payments(
        session=session,
        status_filter=status,
        skip=skip,
        limit=limit,
    )


@router.put("/{payment_id}/review", summary="[Admin] Aprobar/rechazar pago de comisión")
async def review_commission_payment(
    payment_id: str,
    body: ReviewRequest,
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session),
):
    """Admin aprueba o rechaza un pago de comisión con comprobante."""
    return await commission_service.admin_review_payment(
        session=session,
        payment_id=payment_id,
        admin_id=str(current_user["id"]),
        approved=body.approved,
        admin_notes=body.admin_notes,
    )


@router.get("/stats", summary="[Admin] Estadísticas globales de comisiones")
async def get_commission_stats(
    current_user: dict = Depends(require_roles("admin")),
    session: Session = Depends(get_session),
):
    """Estadísticas globales: pendiente, cobrado, exonerado, bloqueados."""
    return await commission_service.get_stats(session)
