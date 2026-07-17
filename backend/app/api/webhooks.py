from fastapi import APIRouter, Request, BackgroundTasks
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/sas-vertical")
async def receive_sas_webhook(request: Request):
    """
    Receives incoming webhook events from SaaS Vertical (DIAN status, WhatsApp messages).
    """
    try:
        payload = await request.json()
    except Exception:
        logger.warning("Invalid JSON received in webhook")
        return {"status": "error", "message": "Invalid JSON"}

    event_type = payload.get("event")
    logger.info(f"Received SaaS webhook event: {event_type}")
    
    if event_type == "invoice.status_updated":
        invoice_id = payload.get("invoice_id")
        status = payload.get("status")
        cufe = payload.get("cufe")
        logger.info(f"Factura {invoice_id} status updated to {status}, CUFE: {cufe}")
        # TODO: Update internal invoice status / link to PDF in DB if we create a table for it
        
    elif event_type == "whatsapp.message_received":
        phone = payload.get("phone")
        text = payload.get("text")
        intent = payload.get("intent")
        logger.info(f"WhatsApp message from {phone}: {text} (Intent: {intent})")
        # TODO: Create a support ticket or notify a technician
        
    else:
        logger.warning(f"Unhandled webhook event type: {event_type}")

    return {"status": "received"}
