"""
Export all models for easy access and ensuring SQLModel metadata registration.
"""
from app.models.user import User
from app.models.technician import Technician
from app.models.service import Service
from app.models.quotation import Quotation
from app.models.payment import Payment
from app.models.credit import CreditWallet, CreditTransaction, CreditPackage
from app.models.verification import TechnicianDocument, QuizQuestion, QuizAttempt, VerificationStatus
from app.models.notification import Notification
from app.models.message import Message
from app.models.incident import Incident
from app.models.portfolio import PortfolioItem
from app.models.push_token import PushToken
from app.models.schedule import ScheduleSlot
from app.models.extras import ExtraItem

__all__ = [
    "User",
    "Technician",
    "Service",
    "Quotation",
    "Payment",
    "CreditWallet",
    "CreditTransaction",
    "CreditPackage",
    "TechnicianDocument",
    "QuizQuestion",
    "QuizAttempt",
    "VerificationStatus",
    "Notification",
    "Message",
    "Incident",
    "PortfolioItem",
    "PushToken",
    "ScheduleSlot",
    "ExtraItem",
]
