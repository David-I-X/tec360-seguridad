"""
Webhook receiver — SaaS Vertical (Factus/DIAN) events
"""
from fastapi import APIRouter, Request
from sqlmodel import Session, select
from uuid import UUID
import logging

from app.core.database import get_session
from app.models.payment import Payment

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
        invoice_number = payload.get("invoice_number")
        new_status = payload.get("status")
        cufe = payload.get("cufe")
        qr_url = payload.get("qr_url")
        pdf_url = payload.get("pdf_url")
        logger.info(
            f"Factura {invoice_number} status updated to {new_status}, CUFE: {cufe}"
        )

        # Update payment record with latest DIAN data
        try:
            from app.core.database import engine
            from sqlmodel import Session as SqlSession
            with SqlSession(engine) as session:
                if invoice_number:
                    payment = session.exec(
                        select(Payment).where(
                            Payment.invoice_number == invoice_number
                        )
                    ).first()
                    if payment:
                        if new_status:
                            payment.dian_status = new_status
                        if cufe:
                            payment.cufe = cufe
                        if qr_url:
                            payment.qr_url = qr_url
                        if pdf_url:
                            payment.pdf_url = pdf_url
                        session.add(payment)
                        session.commit()
                        logger.info(
                            f"Payment {payment.id} updated with DIAN webhook data"
                        )
                    else:
                        logger.warning(
                            f"No payment found for invoice_number={invoice_number}"
                        )
        except Exception as e:
            logger.error(f"Error updating payment from DIAN webhook: {e}")
        
    elif event_type == "whatsapp.message_received":
        phone = payload.get("phone")
        text = payload.get("text")
        intent = payload.get("intent")
        logger.info(f"WhatsApp message from {phone}: {text} (Intent: {intent})")
        # TODO: Create a support ticket or notify a technician
        
    else:
        logger.warning(f"Unhandled webhook event type: {event_type}")

    return {"status": "received"}
