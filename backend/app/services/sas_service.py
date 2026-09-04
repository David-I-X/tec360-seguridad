import httpx
import logging
from typing import Optional, Dict, Any
from app.core.config import settings
from app.models.user import User
from app.models.service import Service
from app.models.payment import Payment

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

async def create_dian_invoice(sas_contact_id: str, service: Service, payment: Payment) -> Optional[Dict[str, Any]]:
    """
    Generates a DIAN electronic invoice in the SaaS Vertical.
    """
    if not settings.SAS_VERTICAL_API_KEY:
        logger.warning("SAS_VERTICAL_API_KEY not configured, skipping DIAN invoice")
        return None

    if not sas_contact_id:
        logger.error("Cannot create invoice: User has no sas_contact_id")
        return None

    # We map the service_type as the SKU
    sku = service.service_type
    description = service.title or f"Servicio: {sku}"
    
    try:
        async with get_sas_client() as client:
            response = await client.post("/dian/invoices/", json={
                "contact_id": int(sas_contact_id),
                "items": [
                    {
                        "sku": sku,
                        "description": description,
                        "quantity": 1,
                        "unit_price": payment.amount,
                        "tax_rate": 0.19 # 19% IVA standard
                    }
                ]
            })
            response.raise_for_status()
            invoice = response.json()
            logger.info(f"Factura generada con CUFE: {invoice.get('cufe')}")
            return invoice
    except Exception as e:
        logger.error(f"Error creating DIAN invoice: {e}")
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

async def create_expense(amount: float, category: str, description: str) -> Optional[Dict[str, Any]]:
    """Registers an operational expense in the SaaS Vertical accounting ledger."""
    if not settings.SAS_VERTICAL_API_KEY:
        return None
    try:
        async with get_sas_client() as client:
            response = await client.post("/accounting/expenses/", json={
                "amount": amount,
                "category": category,
                "description": description
            })
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Error creating expense in SaaS: {e}")
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
