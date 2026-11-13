"""create credit_topup_requests table (recargas manuales Bre-B + Telegram)

Revision ID: a7b8c9d0e1f2
Revises: f8a9b0c1d2e3
Create Date: 2026-11-13 12:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = 'f8a9b0c1d2e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    if 'credit_topup_requests' in insp.get_table_names():
        return

    op.create_table(
        'credit_topup_requests',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('technician_id', sa.UUID(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('reference_hint', sa.String(length=12), nullable=True),
        sa.Column('receipt_path', sa.String(length=255), nullable=False),
        sa.Column('receipt_sha256', sa.String(length=64), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='pending'),
        sa.Column('reject_reason', sa.String(length=120), nullable=True),
        sa.Column('telegram_chat_id', sa.BigInteger(), nullable=True),
        sa.Column('telegram_message_id', sa.BigInteger(), nullable=True),
        sa.Column('reviewed_by', sa.String(length=64), nullable=True),
        sa.Column('credit_transaction_id', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['technician_id'], ['users.id']),
        sa.ForeignKeyConstraint(['credit_transaction_id'], ['credit_transactions.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_credit_topup_requests_status', 'credit_topup_requests', ['status'], unique=False)
    op.create_index(
        'ix_credit_topup_requests_tech_created',
        'credit_topup_requests',
        ['technician_id', 'created_at'],
        unique=False,
    )
    op.create_index(
        'uq_credit_topup_receipt_sha_active',
        'credit_topup_requests',
        ['receipt_sha256'],
        unique=True,
        postgresql_where=sa.text("status <> 'rejected'"),
    )


def downgrade() -> None:
    op.drop_index('uq_credit_topup_receipt_sha_active', table_name='credit_topup_requests')
    op.drop_index('ix_credit_topup_requests_tech_created', table_name='credit_topup_requests')
    op.drop_index('ix_credit_topup_requests_status', table_name='credit_topup_requests')
    op.drop_table('credit_topup_requests')
