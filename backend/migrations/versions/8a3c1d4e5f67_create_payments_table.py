"""create payments table

Revision ID: 8a3c1d4e5f67
Revises: 2f95fcd97412
Create Date: 2026-03-25 08:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '8a3c1d4e5f67'
down_revision: Union[str, None] = '2f95fcd97412'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types
    payment_status_enum = postgresql.ENUM(
        'pending', 'approved', 'confirmed_by_technician',
        'confirmed_by_admin', 'failed', 'refunded',
        name='paymentstatus', create_type=False
    )
    payment_method_enum = postgresql.ENUM(
        'cash', 'pse', 'nequi', 'daviplata', 'card',
        name='paymentmethod', create_type=False
    )
    
    # Create enums in database
    payment_status_enum.create(op.get_bind(), checkfirst=True)
    payment_method_enum.create(op.get_bind(), checkfirst=True)

    op.create_table('payments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('service_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('quotation_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('technician_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(), nullable=False, server_default='COP'),
        sa.Column('payment_method', payment_method_enum, nullable=False),
        sa.Column('payment_provider', sa.String(), nullable=True),
        sa.Column('provider_reference', sa.String(), nullable=True),
        sa.Column('status', payment_status_enum, nullable=False, server_default='pending'),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('paid_at', sa.DateTime(), nullable=True),
        sa.Column('confirmed_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ),
        sa.ForeignKeyConstraint(['quotation_id'], ['quotations.id'], ),
        sa.ForeignKeyConstraint(['client_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['technician_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_payments_id', 'payments', ['id'])
    op.create_index('ix_payments_service_id', 'payments', ['service_id'])


def downgrade() -> None:
    op.drop_index('ix_payments_service_id', table_name='payments')
    op.drop_index('ix_payments_id', table_name='payments')
    op.drop_table('payments')
    
    # Drop enum types
    sa.Enum(name='paymentstatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='paymentmethod').drop(op.get_bind(), checkfirst=True)
