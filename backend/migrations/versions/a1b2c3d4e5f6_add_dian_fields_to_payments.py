"""add dian fields to payments

Revision ID: a1b2c3d4e5f6
Revises: c1d2e3f4a5b6
Create Date: 2026-09-22 17:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add DIAN electronic invoice fields to payments table if they don't exist
    conn = op.get_bind()
    for col in ["invoice_number", "cufe", "qr_url", "pdf_url", "dian_status"]:
        conn.execute(sa.text(f"ALTER TABLE payments ADD COLUMN IF NOT EXISTS {col} VARCHAR;"))


def downgrade() -> None:
    conn = op.get_bind()
    for col in ["invoice_number", "cufe", "qr_url", "pdf_url", "dian_status"]:
        conn.execute(sa.text(f"ALTER TABLE payments DROP COLUMN IF EXISTS {col};"))
