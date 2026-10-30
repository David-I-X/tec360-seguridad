"""create dispatch_offers table

Revision ID: e1f2a3b4c5d6
Revises: d5e6f7a8b9c0
Create Date: 2026-10-29 19:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, Sequence[str], None] = 'd5e6f7a8b9c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'dispatch_offers',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('service_id', sa.UUID(), nullable=False),
        sa.Column('technician_id', sa.UUID(), nullable=False),
        sa.Column('wave', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='offered'),
        sa.Column('score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('distance_km', sa.Float(), nullable=True),
        sa.Column('offered_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('responded_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['technician_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_dispatch_offers_id', 'dispatch_offers', ['id'], unique=False)
    op.create_index('ix_dispatch_offers_service_id', 'dispatch_offers', ['service_id'], unique=False)
    op.create_index('ix_dispatch_offers_technician_id', 'dispatch_offers', ['technician_id'], unique=False)
    op.create_index('ix_dispatch_offers_status', 'dispatch_offers', ['status'], unique=False)
    op.create_index('ix_dispatch_offers_expires_at', 'dispatch_offers', ['expires_at'], unique=False)
    op.create_index('ix_dispatch_offers_wave', 'dispatch_offers', ['wave'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_dispatch_offers_wave', table_name='dispatch_offers')
    op.drop_index('ix_dispatch_offers_expires_at', table_name='dispatch_offers')
    op.drop_index('ix_dispatch_offers_status', table_name='dispatch_offers')
    op.drop_index('ix_dispatch_offers_technician_id', table_name='dispatch_offers')
    op.drop_index('ix_dispatch_offers_service_id', table_name='dispatch_offers')
    op.drop_index('ix_dispatch_offers_id', table_name='dispatch_offers')
    op.drop_table('dispatch_offers')
