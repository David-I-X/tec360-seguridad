"""Create quotations table

Revision ID: create_quotations
Revises: create_service_ratings
Create Date: 2026-02-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'create_quotations'
down_revision: Union[str, None] = 'create_service_ratings'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create quotations table and add 'quoted' status to servicestatus enum."""
    
    # 1. Add 'quoted' to servicestatus enum (for services with pending quotations)
    op.execute("ALTER TYPE servicestatus ADD VALUE IF NOT EXISTS 'quoted'")
    
    # 2. Create quotationstatus enum
    quotation_status = postgresql.ENUM(
        'pending', 'approved', 'rejected', 'counter_offered', 'expired', 'cancelled',
        name='quotationstatus',
        create_type=False
    )
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE quotationstatus AS ENUM (
                'pending', 'approved', 'rejected', 'counter_offered', 'expired', 'cancelled'
            );
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # 3. Create quotations table
    op.create_table(
        'quotations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('service_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('services.id', ondelete='CASCADE'), nullable=False),
        sa.Column('technician_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('status', postgresql.ENUM('pending', 'approved', 'rejected', 'counter_offered', 'expired', 'cancelled', name='quotationstatus', create_type=False), nullable=False, server_default='pending'),
        sa.Column('client_response', sa.Text(), nullable=True),
        sa.Column('counter_amount', sa.Numeric(10, 2), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('responded_at', sa.DateTime(), nullable=True),
    )
    
    # 4. Create indexes
    op.create_index('ix_quotations_service_id', 'quotations', ['service_id'])
    op.create_index('ix_quotations_technician_id', 'quotations', ['technician_id'])
    op.create_index('ix_quotations_status', 'quotations', ['status'])
    
    # 5. Unique constraint: one quotation per technician per service
    op.create_unique_constraint(
        'uq_quotation_service_technician',
        'quotations',
        ['service_id', 'technician_id']
    )
    
    # 6. Check constraint for amount
    op.create_check_constraint(
        'check_quotation_amount_positive',
        'quotations',
        'amount > 0'
    )


def downgrade() -> None:
    """Drop quotations table."""
    op.drop_constraint('check_quotation_amount_positive', 'quotations')
    op.drop_constraint('uq_quotation_service_technician', 'quotations')
    op.drop_index('ix_quotations_status', 'quotations')
    op.drop_index('ix_quotations_technician_id', 'quotations')
    op.drop_index('ix_quotations_service_id', 'quotations')
    op.drop_table('quotations')
    op.execute('DROP TYPE IF EXISTS quotationstatus')
