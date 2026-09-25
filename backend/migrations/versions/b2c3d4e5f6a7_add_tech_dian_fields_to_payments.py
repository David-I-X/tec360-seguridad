"""add tech dian fields to payments

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-24 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add technician DIAN commission electronic invoice fields to payments table if they don't exist
    conn = op.get_bind()
    for col in ["tech_invoice_number", "tech_cufe", "tech_qr_url", "tech_pdf_url", "tech_dian_status"]:
        conn.execute(sa.text(f"ALTER TABLE payments ADD COLUMN IF NOT EXISTS {col} VARCHAR;"))


def downgrade() -> None:
    conn = op.get_bind()
    for col in ["tech_invoice_number", "tech_cufe", "tech_qr_url", "tech_pdf_url", "tech_dian_status"]:
        conn.execute(sa.text(f"ALTER TABLE payments DROP COLUMN IF EXISTS {col};"))
