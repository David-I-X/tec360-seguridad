"""add_payment_fields

Revision ID: e738d8231234
Revises: f43753b7654e
Create Date: 2026-06-07 23:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# revision identifiers, used by Alembic.
revision: str = 'e738d8231234'
down_revision: Union[str, Sequence[str], None] = 'bc5bb1ef1adb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('services', sa.Column('payment_method', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('services', sa.Column('payment_status', sqlmodel.sql.sqltypes.AutoString(), server_default='pending', nullable=True))

def downgrade() -> None:
    op.drop_column('services', 'payment_status')
    op.drop_column('services', 'payment_method')
