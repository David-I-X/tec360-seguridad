# Import all models so SQLModel.metadata discovers them for create_all()
from app.models.commission import CommissionLedger, CommissionPayment  # noqa: F401
