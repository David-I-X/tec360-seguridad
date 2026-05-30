import io
from app.models.service import Service
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors

class PDFService:
    @staticmethod
    def generate_receipt(service: Service, client_name: str, tech_name: str) -> bytes:
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        # Header
        c.setFont("Helvetica-Bold", 20)
        c.drawString(50, height - 50, "TEC360 - Recibo de Servicio")
        
        c.setFont("Helvetica", 12)
        c.drawString(50, height - 80, f"ID del Servicio: {service.id}")
        c.drawString(50, height - 100, f"Fecha: {service.updated_at.strftime('%Y-%m-%d %H:%M')}")
        
        # Details
        c.drawString(50, height - 140, f"Cliente: {client_name}")
        c.drawString(50, height - 160, f"Técnico: {tech_name}")
        c.drawString(50, height - 180, f"Servicio: {service.title}")
        c.drawString(50, height - 200, f"Vehículo: {service.vehicle_plate}")
        
        # Total
        c.setFont("Helvetica-Bold", 14)
        c.setFillColor(colors.darkblue)
        c.drawString(50, height - 240, f"TOTAL PAGADO: ${service.estimated_price:,.0f} COP")
        
        # Footer
        c.setFont("Helvetica-Oblique", 10)
        c.setFillColor(colors.gray)
        c.drawString(50, 50, "Gracias por confiar en TEC360 Seguridad.")
        
        c.save()
        buffer.seek(0)
        return buffer.getvalue()
