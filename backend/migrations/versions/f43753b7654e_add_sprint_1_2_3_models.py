"""add_sprint_1_2_3_models

Revision ID: f43753b7654e
Revises: 9e1e18f02f70
Create Date: 2026-05-30 21:07:37.196933

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# revision identifiers, used by Alembic.
revision: str = 'f43753b7654e'
down_revision: Union[str, Sequence[str], None] = '9e1e18f02f70'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema — Sprint 1, 2, 3 tables and columns."""

    # ── Sprint 1: Credit System ─────────────────────────
    op.create_table('technician_credits',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('technician_id', sa.Uuid(), nullable=False),
        sa.Column('balance', sa.Float(), nullable=False),
        sa.Column('total_recharged', sa.Float(), nullable=False),
        sa.Column('total_consumed', sa.Float(), nullable=False),
        sa.Column('free_services_used', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['technician_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_technician_credits_id'), 'technician_credits', ['id'], unique=False)
    op.create_index(op.f('ix_technician_credits_technician_id'), 'technician_credits', ['technician_id'], unique=True)

    op.create_table('credit_transactions',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('technician_id', sa.Uuid(), nullable=False),
        sa.Column('transaction_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('balance_after', sa.Float(), nullable=False),
        sa.Column('service_id', sa.Uuid(), nullable=True),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('external_reference', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['service_id'], ['services.id']),
        sa.ForeignKeyConstraint(['technician_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_credit_transactions_id'), 'credit_transactions', ['id'], unique=False)
    op.create_index(op.f('ix_credit_transactions_technician_id'), 'credit_transactions', ['technician_id'], unique=False)
    op.create_index(op.f('ix_credit_transactions_transaction_type'), 'credit_transactions', ['transaction_type'], unique=False)

    # ── Sprint 1: Technician penalties ──────────────────
    op.add_column('technicians', sa.Column('rank', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('technicians', sa.Column('rank_points', sa.Integer(), nullable=True))
    op.add_column('technicians', sa.Column('certifications_count', sa.Integer(), nullable=True))
    op.add_column('technicians', sa.Column('cancellation_count', sa.Integer(), nullable=True))
    op.add_column('technicians', sa.Column('cancellation_week_count', sa.Integer(), nullable=True))
    op.add_column('technicians', sa.Column('last_cancellation_at', sa.DateTime(), nullable=True))
    op.add_column('technicians', sa.Column('suspended_until', sa.DateTime(), nullable=True))

    # ── Sprint 2: Incident Reports ──────────────────────
    op.create_table('incident_reports',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('service_id', sa.Uuid(), nullable=False),
        sa.Column('technician_id', sa.Uuid(), nullable=False),
        sa.Column('incident_type', sa.Enum('client_absent', 'vehicle_mismatch', 'device_incompatible', 'security_issue', 'other', name='incidenttype'), nullable=False),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('evidence_url', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('is_resolved', sa.Boolean(), nullable=False),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('admin_notes', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['service_id'], ['services.id']),
        sa.ForeignKeyConstraint(['technician_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_incident_reports_id'), 'incident_reports', ['id'], unique=False)
    op.create_index(op.f('ix_incident_reports_incident_type'), 'incident_reports', ['incident_type'], unique=False)
    op.create_index(op.f('ix_incident_reports_service_id'), 'incident_reports', ['service_id'], unique=False)
    op.create_index(op.f('ix_incident_reports_technician_id'), 'incident_reports', ['technician_id'], unique=False)

    # ── Sprint 2: Technician Schedules ──────────────────
    op.create_table('technician_schedules',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('technician_id', sa.Uuid(), nullable=False),
        sa.Column('day_of_week', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['technician_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_technician_schedules_id'), 'technician_schedules', ['id'], unique=False)
    op.create_index(op.f('ix_technician_schedules_technician_id'), 'technician_schedules', ['technician_id'], unique=False)

    # ── Sprint 2: Quotation adjustment field ────────────
    op.add_column('quotations', sa.Column('is_adjustment', sa.Boolean(), server_default='false', nullable=False))

    # ── Sprint 3: Portfolio Images ──────────────────────
    op.create_table('portfolio_images',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('technician_id', sa.Uuid(), nullable=False),
        sa.Column('image_url', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('description', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['technician_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_portfolio_images_id'), 'portfolio_images', ['id'], unique=False)
    op.create_index(op.f('ix_portfolio_images_technician_id'), 'portfolio_images', ['technician_id'], unique=False)

    # ── Sprint 3: Client penalties ──────────────────────
    op.add_column('users', sa.Column('cancellation_count', sa.Integer(), server_default='0', nullable=False))
    op.add_column('users', sa.Column('flagged_for_review', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    # Sprint 3
    op.drop_column('users', 'flagged_for_review')
    op.drop_column('users', 'cancellation_count')
    op.drop_index(op.f('ix_portfolio_images_technician_id'), table_name='portfolio_images')
    op.drop_index(op.f('ix_portfolio_images_id'), table_name='portfolio_images')
    op.drop_table('portfolio_images')

    # Sprint 2
    op.drop_column('quotations', 'is_adjustment')
    op.drop_index(op.f('ix_technician_schedules_technician_id'), table_name='technician_schedules')
    op.drop_index(op.f('ix_technician_schedules_id'), table_name='technician_schedules')
    op.drop_table('technician_schedules')
    op.drop_index(op.f('ix_incident_reports_technician_id'), table_name='incident_reports')
    op.drop_index(op.f('ix_incident_reports_service_id'), table_name='incident_reports')
    op.drop_index(op.f('ix_incident_reports_incident_type'), table_name='incident_reports')
    op.drop_index(op.f('ix_incident_reports_id'), table_name='incident_reports')
    op.drop_table('incident_reports')
    op.execute("DROP TYPE IF EXISTS incidenttype")

    # Sprint 1
    op.drop_column('technicians', 'suspended_until')
    op.drop_column('technicians', 'last_cancellation_at')
    op.drop_column('technicians', 'cancellation_week_count')
    op.drop_column('technicians', 'cancellation_count')
    op.drop_column('technicians', 'certifications_count')
    op.drop_column('technicians', 'rank_points')
    op.drop_column('technicians', 'rank')
    op.drop_index(op.f('ix_credit_transactions_transaction_type'), table_name='credit_transactions')
    op.drop_index(op.f('ix_credit_transactions_technician_id'), table_name='credit_transactions')
    op.drop_index(op.f('ix_credit_transactions_id'), table_name='credit_transactions')
    op.drop_table('credit_transactions')
    op.drop_index(op.f('ix_technician_credits_technician_id'), table_name='technician_credits')
    op.drop_index(op.f('ix_technician_credits_id'), table_name='technician_credits')
    op.drop_table('technician_credits')
