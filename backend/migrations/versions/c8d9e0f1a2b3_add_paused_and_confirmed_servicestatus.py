"""Add paused and confirmed to servicestatus enum

Revision ID: c8d9e0f1a2b3
Revises: e738d8231234
Create Date: 2026-07-22 19:10:00.000000

"""
from typing import Sequence, Union
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c8d9e0f1a2b3'
down_revision: Union[str, Sequence[str], None] = 'e738d8231234'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE servicestatus ADD VALUE IF NOT EXISTS 'paused'")
    op.execute("ALTER TYPE servicestatus ADD VALUE IF NOT EXISTS 'confirmed'")


def downgrade() -> None:
    pass
