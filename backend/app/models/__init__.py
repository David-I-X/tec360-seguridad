"""
Export all models for easy access and ensuring SQLModel metadata registration.
"""
from app.models.user import User
from app.models.technician import Technician, TechnicianRank
from app.models.service import Service, ServiceStatus, ServiceType, VehicleType
from app.models.quotation import Quotation, QuotationStatus
from app.models.payment import Payment, PaymentStatus, PaymentMethod
from app.models.credit import TechnicianCredit, CreditTransaction, CreditTransactionType
from app.models.verification import (
    TechnicianDocument,
    QuizQuestion,
    QuizAttempt,
    VerificationStatus,
    DocumentStatus,
)
from app.models.notification import Notification
from app.models.message import Message
from app.models.incident import IncidentReport, IncidentType
from app.models.portfolio import PortfolioImage
from app.models.push_token import PushToken
from app.models.schedule import TechnicianSchedule
from app.models.extras import ServiceRating, ServiceImage, RatedBy, ImageType

__all__ = [
    "User",
    "Technician",
    "TechnicianRank",
    "Service",
    "ServiceStatus",
    "ServiceType",
    "VehicleType",
    "Quotation",
    "QuotationStatus",
    "Payment",
    "PaymentStatus",
    "PaymentMethod",
    "TechnicianCredit",
    "CreditTransaction",
    "CreditTransactionType",
    "TechnicianDocument",
    "QuizQuestion",
    "QuizAttempt",
    "VerificationStatus",
    "DocumentStatus",
    "Notification",
    "Message",
    "IncidentReport",
    "IncidentType",
    "PortfolioImage",
    "PushToken",
    "TechnicianSchedule",
    "ServiceRating",
    "ServiceImage",
    "RatedBy",
    "ImageType",
]
