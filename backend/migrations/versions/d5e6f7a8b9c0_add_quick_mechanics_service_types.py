"""add_quick_mechanics_service_types

Revision ID: d5e6f7a8b9c0
Revises: b2c3d4e5f6a7
Create Date: 2026-10-22 18:50:00.000000

"""
from typing import Sequence, Union
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'd5e6f7a8b9c0'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


QUICK_MECHANICS_TYPES = [
    'oil_change',
    'tire_change',
    'battery_service',
    'brake_service',
    'chain_kit_service',
    'spark_bulbs_wipers',
]


def upgrade() -> None:
    """Add Quick Mechanics (< 1 hour) values to PostgreSQL servicetype enum."""
    for val in QUICK_MECHANICS_TYPES:
        op.execute(f"ALTER TYPE servicetype ADD VALUE IF NOT EXISTS '{val}'")


def downgrade() -> None:
    """PostgreSQL does not support dropping enum values directly; no-op."""
    pass
