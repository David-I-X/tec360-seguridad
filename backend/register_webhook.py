import asyncio
import sys
from app.services.sas_service import register_webhook
from app.core.config import settings

async def main():
    if len(sys.argv) < 2:
        print("Uso: python register_webhook.py <URL_DEL_WEBHOOK>")
        print("Ejemplo: python register_webhook.py https://api.tec360.com/api/webhooks/sas-vertical")
        sys.exit(1)

    webhook_url = sys.argv[1]
    print(f"Registrando webhook URL: {webhook_url}")
    
    if not settings.SAS_VERTICAL_API_KEY:
        print("Error: SAS_VERTICAL_API_KEY no está configurada en .env")
        sys.exit(1)
        
    success = await register_webhook(webhook_url)
    
    if success:
        print("¡Webhook registrado exitosamente en el SaaS Vertical!")
    else:
        print("Fallo al registrar el webhook. Revisa los logs.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
