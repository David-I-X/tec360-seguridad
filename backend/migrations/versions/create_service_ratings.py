"""Create service_ratings table

Revision ID: create_service_ratings
Revises: add_new_service_statuses
Create Date: 2026-02-06 00:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'create_service_ratings'
down_revision: Union[str, None] = 'add_new_service_statuses'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create service_ratings table for storing service ratings."""
    op.create_table(
        'service_ratings',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('service_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('services.id'), nullable=False, unique=True),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    )
    
    # Add check constraint for rating 1-5
    op.create_check_constraint(
        'check_rating_range',
        'service_ratings',
        'rating >= 1 AND rating <= 5'
    )
    
    # Add index on service_id for faster lookups
    op.create_index('ix_service_ratings_service_id', 'service_ratings', ['service_id'])


def downgrade() -> None:
    """Drop service_ratings table."""
    op.drop_index('ix_service_ratings_service_id', 'service_ratings')
    op.drop_constraint('check_rating_range', 'service_ratings')
    op.drop_table('service_ratings')
