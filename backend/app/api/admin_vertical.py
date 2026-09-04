"""
Router Administrativo para la Integración con el SaaS Vertical (Contabilidad & DIAN)
Acceso exclusivo para rol 'admin'.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.security import require_roles
from app.services.sas_service import (
    create_expense,
    get_accounting_dashboard,
    get_contacts,
    get_entries,
    get_invoices,
    get_pnl,
    get_tenant_info,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/vertical", tags=["admin-vertical"])


class ExpenseCreateRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Monto del gasto en COP")
    category: str = Field(..., min_length=2, description="Categoría (repuestos, nómina, combustible, etc.)")
    description: str = Field(..., min_length=3, description="Descripción detallada del gasto")
    entry_date: Optional[str] = Field(default=None, description="Fecha opcional en formato ISO")


@router.get("/dashboard")
async def get_vertical_dashboard(
    admin_user: dict = Depends(require_roles("admin")),
):
    """
    Retorna el estado de la conexión, datos del Tenant y los KPIs contables mensuales.
    """
    try:
        tenant_info = await get_tenant_info()
        accounting = await get_accounting_dashboard()

        return {
            "success": True,
            "connected": bool(tenant_info),
            "tenant": tenant_info,
            "accounting": accounting or {},
        }
    except Exception as e:
        logger.error(f"Error al obtener dashboard vertical: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error comunicando con SaaS Vertical: {str(e)}",
        )


@router.get("/invoices")
async def list_vertical_invoices(
    invoice_type: Optional[str] = Query(None, description="Filtrar por mandate_service o platform_commission"),
    admin_user: dict = Depends(require_roles("admin")),
):
    """
    Lista las facturas electrónicas emitidas ante la DIAN (Mandato A y Comisiones B).
    """
    invoices = await get_invoices(invoice_type=invoice_type)
    return {"success": True, "count": len(invoices), "invoices": invoices}


@router.get("/entries")
async def list_accounting_entries(
    limit: int = Query(50, ge=1, le=200),
    entry_type: Optional[str] = Query(None, description="income o expense"),
    category: Optional[str] = Query(None),
    admin_user: dict = Depends(require_roles("admin")),
):
    """
    Lista los asientos del libro contable (ingresos por comisión, recargas de técnicos y gastos).
    """
    entries = await get_entries(limit=limit, entry_type=entry_type, category=category)
    return {"success": True, "count": len(entries), "entries": entries}


@router.post("/expenses")
async def record_operational_expense(
    data: ExpenseCreateRequest,
    admin_user: dict = Depends(require_roles("admin")),
):
    """
    Registra un egreso/gasto operativo en el libro contable del SaaS Vertical.
    """
    expense = await create_expense(
        amount=data.amount,
        category=data.category,
        description=data.description,
        entry_date=data.entry_date,
    )
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo registrar el gasto en el SaaS Vertical. Verifique logs y conexión.",
        )

    return {
        "success": True,
        "message": "Gasto registrado exitosamente en el libro contable",
        "expense": expense,
    }


@router.get("/contacts")
async def list_synced_contacts(
    admin_user: dict = Depends(require_roles("admin")),
):
    """
    Lista los contactos (clientes y técnicos) sincronizados en el SaaS Vertical.
    """
    contacts = await get_contacts()
    return {"success": True, "count": len(contacts), "contacts": contacts}


@router.get("/pnl")
async def get_profit_and_loss(
    month: Optional[str] = Query(None, description="Formato YYYY-MM"),
    admin_user: dict = Depends(require_roles("admin")),
):
    """
    Retorna el estado de Pérdidas y Ganancias (P&L) del mes especificado.
    """
    pnl = await get_pnl(month=month)
    return {"success": True, "pnl": pnl or {}}