"""add service_metadata to services

Revision ID: 2f95fcd97412
Revises: create_technicians
Create Date: 2026-03-25 01:01:42.364352

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '2f95fcd97412'
down_revision: Union[str, Sequence[str], None] = 'create_technicians'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('services', sa.Column('vehicle_type', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('services', sa.Column('vehicle_model', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('services', sa.Column('vehicle_plate', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('services', sa.Column('vehicle_photo_url', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('services', sa.Column('client_confirmed_at', sa.DateTime(), nullable=True))
    op.add_column('services', sa.Column('service_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('users', sa.Column('notification_preferences', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'notification_preferences')
    op.drop_column('services', 'service_metadata')
    op.drop_column('services', 'client_confirmed_at')
    op.drop_column('services', 'vehicle_photo_url')
    op.drop_column('services', 'vehicle_plate')
    op.drop_column('services', 'vehicle_model')
    op.drop_column('services', 'vehicle_type')
