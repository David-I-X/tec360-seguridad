"""Add scheduled_date to services

Revision ID: 4b4e043f0a72
Revises: 4181c55ae5fe
Create Date: 2026-01-29 00:07:37.681535

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '4b4e043f0a72'
down_revision: Union[str, Sequence[str], None] = '4181c55ae5fe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('services', sa.Column('scheduled_date', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('services', 'scheduled_date')
