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

    @staticmethod
    def generate_certificate(
        student_name: str,
        course_title: str,
        category: str,
        completion_date: str,
        cert_code: str,
        instructor_name: str = "Equipo Técnico Tec360"
    ) -> bytes:
        """
        Genera un certificado PDF en orientación horizontal con diseño profesional
        de la Escuela Tec360 Seguridad.
        """
        from reportlab.lib.pagesizes import landscape, letter
        from reportlab.lib import colors

        buffer = io.BytesIO()
        # Landscape letter: 792 x 612 pt
        page_size = landscape(letter)
        c = canvas.Canvas(buffer, pagesize=page_size)
        width, height = page_size

        # --- Background / Borders ---
        # Outer Border
        c.setStrokeColor(colors.HexColor("#0f172a")) # Dark slate
        c.setLineWidth(6)
        c.rect(20, 20, width - 40, height - 40)

        # Inner Gold Border
        c.setStrokeColor(colors.HexColor("#eab308")) # Gold
        c.setLineWidth(2)
        c.rect(28, 28, width - 56, height - 56)

        # Thin Accent Border
        c.setStrokeColor(colors.HexColor("#3b82f6")) # Blue accent
        c.setLineWidth(0.75)
        c.rect(34, 34, width - 68, height - 68)

        # Header Badge / Organization
        c.setFont("Helvetica-Bold", 14)
        c.setFillColor(colors.HexColor("#3b82f6"))
        c.drawCentredString(width / 2, height - 70, "ESCUELA TEC360 SEGURIDAD")

        c.setFont("Helvetica", 10)
        c.setFillColor(colors.HexColor("#64748b"))
        c.drawCentredString(width / 2, height - 85, "CENTRO DE FORMACIÓN Y CERTIFICACIÓN EN TELEMÁTICA AUTOMOTRIZ")

        # Certificate Title
        c.setFont("Helvetica-Bold", 26)
        c.setFillColor(colors.HexColor("#0f172a"))
        c.drawCentredString(width / 2, height - 130, "CERTIFICADO DE APROBACIÓN")

        # Decorative line
        c.setStrokeColor(colors.HexColor("#eab308"))
        c.setLineWidth(2)
        c.line(width / 2 - 120, height - 145, width / 2 + 120, height - 145)

        # Subtext
        c.setFont("Helvetica", 12)
        c.setFillColor(colors.HexColor("#334155"))
        c.drawCentredString(width / 2, height - 175, "Hace constar que:")

        # Student Name
        c.setFont("Helvetica-Bold", 24)
        c.setFillColor(colors.HexColor("#1e1b4b")) # Deep indigo
        c.drawCentredString(width / 2, height - 215, student_name.upper())

        # Description text
        c.setFont("Helvetica", 12)
        c.setFillColor(colors.HexColor("#475569"))
        c.drawCentredString(
            width / 2, 
            height - 250, 
            "Completó y aprobó exitosamente con calificación del 100% el programa de especialización técnica:"
        )

        # Course Title
        c.setFont("Helvetica-Bold", 18)
        c.setFillColor(colors.HexColor("#0369a1")) # Cyan/sky blue
        c.drawCentredString(width / 2, height - 285, f"« {course_title} »")

        # Category and criteria badge
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.HexColor("#16a34a")) # Green
        category_label = category.replace("_", " ").upper()
        c.drawCentredString(
            width / 2, 
            height - 315, 
            f"CATEGORÍA: {category_label}  •  CALIFICACIÓN: 100/100 (EXCELENCIA)  •  HABILITADO OFICIALMENTE"
        )

        # Bottom Signatures and Validation
        # Left signature: Instructor
        sig_y = 110
        c.setStrokeColor(colors.HexColor("#94a3b8"))
        c.setLineWidth(1)
        c.line(100, sig_y, 300, sig_y)

        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(colors.HexColor("#0f172a"))
        c.drawCentredString(200, sig_y - 18, instructor_name)

        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor("#64748b"))
        c.drawCentredString(200, sig_y - 32, "Instructor de Seguridad Telemática")

        # Right signature: Operations Director
        c.line(width - 300, sig_y, width - 100, sig_y)

        c.setFont("Helvetica-Bold", 11)
        c.setFillColor(colors.HexColor("#0f172a"))
        c.drawCentredString(width - 200, sig_y - 18, "Dirección de Operaciones")

        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor("#64748b"))
        c.drawCentredString(width - 200, sig_y - 32, "Tec360 Seguridad Colombia")

        # Center Seal & Certificate Code
        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(colors.HexColor("#d97706")) # Amber gold
        c.drawCentredString(width / 2, 95, "✦ VERIFICACIÓN DE SEGURIDAD ✦")

        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor("#475569"))
        c.drawCentredString(width / 2, 80, f"Código de Certificación: {cert_code}")
        c.drawCentredString(width / 2, 65, f"Fecha de Emisión: {completion_date}")

        c.setFont("Helvetica-Oblique", 8)
        c.setFillColor(colors.HexColor("#94a3b8"))
        c.drawCentredString(width / 2, 45, "Valide este documento en https://tec-360.tech/escuela/verificar")

        c.save()
        buffer.seek(0)
        return buffer.getvalue()

