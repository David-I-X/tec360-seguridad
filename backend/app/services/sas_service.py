import httpx
import logging
from typing import Optional, Dict, Any
from app.core.config import settings
from app.models.user import User

logger = logging.getLogger(__name__)

def get_sas_client() -> httpx.AsyncClient:
    """Returns an async HTTP client configured for the SaaS Vertical."""
    return httpx.AsyncClient(
        base_url=settings.SAS_BASE_URL,
        headers={"x-api-key": settings.SAS_VERTICAL_API_KEY}
    )

async def sync_contact_to_sas(user: User) -> Optional[str]:
    """
    Syncs a user to the SaaS Vertical CRM and returns the contact ID.
    If it fails, logs the error and returns None.
    """
    if not settings.SAS_VERTICAL_API_KEY:
        logger.warning("SAS_VERTICAL_API_KEY not configured, skipping CRM sync")
        return None

    try:
        async with get_sas_client() as client:
            response = await client.post("/contacts/", json={
                "name": user.full_name or "Sin nombre",
                "phone": user.phone or "",
                "email": user.email
            })
            response.raise_for_status()
            data = response.json()
            return str(data.get("id"))
    except Exception as e:
        logger.error(f"Error syncing contact to SaaS: {e}")
        return None

async def create_dian_invoice(
    sas_contact_id: str,
    items: list[Dict[str, Any]],
    auto_accounting: bool = False,
    invoice_type: str = "mandate_service",
) -> Optional[Dict[str, Any]]:
    """
    Generates a DIAN electronic invoice in the SaaS Vertical.
    - Factura A (Cliente Final): auto_accounting=False, invoice_type="mandate_service"
    - Factura B (Comisión al Técnico): auto_accounting=True, invoice_type="platform_commission"
    """
    if not settings.SAS_VERTICAL_API_KEY:
        logger.warning("SAS_VERTICAL_API_KEY not configured, skipping DIAN invoice")
        return None

    if not sas_contact_id:
        logger.error("Cannot create invoice: User has no sas_contact_id")
        return None

    try:
        async with get_sas_client() as client:
            response = await client.post("/dian/invoices/", json={
                "contact_id": int(sas_contact_id),
                "auto_accounting": auto_accounting,
                "invoice_type": invoice_type,
                "items": items,
            })
            response.raise_for_status()
            invoice = response.json()
            logger.info(
                f"Factura DIAN ({invoice_type}) generada: {invoice.get('invoice_number')} "
                f"CUFE: {invoice.get('cufe')}"
            )
            return invoice
    except Exception as e:
        logger.error(f"Error creating DIAN invoice ({invoice_type}): {e}")
        return None

async def record_recharge_income(
    amount: float,
    technician_name: str,
    technician_id: str,
) -> Optional[Dict[str, Any]]:
    """
    Registers a technician balance recharge in the SaaS Vertical cash flow
    via POST /api/v1/accounting/incomes/ as an advance/deposit (Concept 1061/2020 DIAN).
    Does NOT issue a sales invoice.
    """
    if not settings.SAS_VERTICAL_API_KEY:
        logger.warning("SAS_VERTICAL_API_KEY not configured, skipping recharge cashflow recording")
        return None

    try:
        async with get_sas_client() as client:
            response = await client.post("/accounting/incomes/", json={
                "amount": float(amount),
                "category": "recargas_tecnicos",
                "description": f"Recarga de saldo - Tecnico {technician_name}",
                "reference_type": "wallet_recharge",
                "reference_id": None,
            })
            response.raise_for_status()
            entry = response.json()
            logger.info(f"Recarga asentada en flujo de caja: #{entry.get('id')} por ${amount}")
            return entry
    except Exception as e:
        logger.error(f"Error recording recharge income in SaaS: {e}")
        return None

async def get_tenant_info() -> Optional[Dict[str, Any]]:
    """Fetches connected tenant information from the SaaS Vertical."""
    if not settings.SAS_VERTICAL_API_KEY:
        return None
    try:
        async with get_sas_client() as client:
            response = await client.get("/tenants/me")
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Error fetching tenant info from SaaS: {e}")
        return None

async def get_accounting_dashboard() -> Optional[Dict[str, Any]]:
    """Fetches accounting KPI dashboard from the SaaS Vertical."""
    if not settings.SAS_VERTICAL_API_KEY:
        return None
    try:
        async with get_sas_client() as client:
            response = await client.get("/accounting/dashboard")
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Error fetching accounting dashboard from SaaS: {e}")
        return None

async def get_entries(
    limit: int = 50,
    entry_type: Optional[str] = None,
    category: Optional[str] = None,
) -> list[Dict[str, Any]]:
    """Fetches accounting ledger entries from the SaaS Vertical."""
    if not settings.SAS_VERTICAL_API_KEY:
        return []
    try:
        async with get_sas_client() as client:
            params: dict[str, Any] = {"limit": limit}
            if entry_type:
                params["entry_type"] = entry_type
            if category:
                params["category"] = category
            response = await client.get("/accounting/entries", params=params)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Error fetching accounting entries from SaaS: {e}")
        return []

async def create_expense(
    amount: float,
    category: str,
    description: str,
    entry_date: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Registers an operational expense in the SaaS Vertical accounting ledger."""
    if not settings.SAS_VERTICAL_API_KEY:
        return None
    try:
        payload: dict[str, Any] = {
            "amount": float(amount),
            "category": category,
            "description": description,
        }
        if entry_date:
            payload["entry_date"] = entry_date

        async with get_sas_client() as client:
            response = await client.post("/accounting/expenses/", json=payload)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Error creating expense in SaaS: {e}")
        return None

async def get_invoices(invoice_type: Optional[str] = None) -> list[Dict[str, Any]]:
    """Fetches DIAN electronic invoices from SaaS Vertical."""
    if not settings.SAS_VERTICAL_API_KEY:
        return []
    try:
        async with get_sas_client() as client:
            params = {}
            if invoice_type:
                params["invoice_type"] = invoice_type
            response = await client.get("/dian/invoices/", params=params)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Error fetching DIAN invoices from SaaS: {e}")
        return []

async def get_contacts() -> list[Dict[str, Any]]:
    """Fetches synced contacts (clients and technicians) from SaaS Vertical."""
    if not settings.SAS_VERTICAL_API_KEY:
        return []
    try:
        async with get_sas_client() as client:
            response = await client.get("/contacts/")
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Error fetching contacts from SaaS: {e}")
        return []

async def get_pnl(month: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Fetches P&L (Profit and Loss) statement from SaaS Vertical."""
    if not settings.SAS_VERTICAL_API_KEY:
        return None
    try:
        async with get_sas_client() as client:
            params = {}
            if month:
                params["month"] = month
            response = await client.get("/accounting/pnl", params=params)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Error fetching P&L from SaaS: {e}")
        return None

async def register_webhook(webhook_url: str) -> bool:
    """
    Registers the webhook URL in the SaaS Vertical.
    """
    if not settings.SAS_VERTICAL_API_KEY:
        logger.warning("SAS_VERTICAL_API_KEY not configured, skipping webhook registration")
        return False

    try:
        async with get_sas_client() as client:
            response = await client.patch("/tenants/me/webhook", json={
                "webhook_url": webhook_url
            })
            response.raise_for_status()
            return True
    except Exception as e:
        logger.error(f"Error registering webhook: {e}")
        return False
