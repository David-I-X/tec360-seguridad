"""Add en_route and arrived to servicestatus enum

Revision ID: add_new_service_statuses
Revises: 1bb3158b3c3f
Create Date: 2026-02-04 12:31:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_new_service_statuses'
down_revision: Union[str, None] = '1bb3158b3c3f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add new status values to the servicestatus enum in PostgreSQL."""
    # PostgreSQL requires ALTER TYPE to add new enum values
    # Note: In PostgreSQL, you can only add enum values, not remove them
    
    op.execute("ALTER TYPE servicestatus ADD VALUE IF NOT EXISTS 'en_route'")
    op.execute("ALTER TYPE servicestatus ADD VALUE IF NOT EXISTS 'arrived'")


def downgrade() -> None:
    """
    Note: PostgreSQL doesn't support removing enum values directly.
    To downgrade, you would need to:
    1. Create a new enum without those values
    2. Update the column to use the new enum
    3. Drop the old enum
    
    For simplicity, we leave this as a no-op since removing enum values is complex.
    """
    pass
