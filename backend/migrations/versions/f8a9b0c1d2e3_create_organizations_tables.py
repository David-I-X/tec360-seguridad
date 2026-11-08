"""create organizations and organization_members tables

Revision ID: f8a9b0c1d2e3
Revises: e1f2a3b4c5d6
Create Date: 2026-11-07 11:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f8a9b0c1d2e3'
down_revision: Union[str, Sequence[str], None] = 'e1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing_tables = insp.get_table_names()

    if 'organizations' not in existing_tables:
        op.create_table(
            'organizations',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('name', sa.String(length=160), nullable=False),
            sa.Column('nit', sa.String(length=64), nullable=True),
            sa.Column('phone', sa.String(length=32), nullable=True),
            sa.Column('email', sa.String(length=255), nullable=True),
            sa.Column('address', sa.String(length=255), nullable=True),
            sa.Column('city', sa.String(length=100), nullable=False, server_default='Medellín'),
            sa.Column('logo_url', sa.String(length=500), nullable=True),
            sa.Column('owner_id', sa.UUID(), nullable=False),
            sa.Column('dispatch_mode', sa.String(length=32), nullable=False, server_default='manual'),
            sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
            sa.Column('wallet_balance', sa.Float(), nullable=False, server_default='0.0'),
            sa.Column('total_recharged', sa.Float(), nullable=False, server_default='0.0'),
            sa.Column('total_consumed', sa.Float(), nullable=False, server_default='0.0'),
            sa.Column('welcome_bonus_granted', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_organizations_id', 'organizations', ['id'], unique=False)
        op.create_index('ix_organizations_name', 'organizations', ['name'], unique=False)
        op.create_index('ix_organizations_nit', 'organizations', ['nit'], unique=False)
        op.create_index('ix_organizations_owner_id', 'organizations', ['owner_id'], unique=False)

    if 'organization_members' not in existing_tables:
        op.create_table(
            'organization_members',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('organization_id', sa.UUID(), nullable=False),
            sa.Column('user_id', sa.UUID(), nullable=False),
            sa.Column('org_role', sa.String(length=32), nullable=False, server_default='technician'),
            sa.Column('status', sa.String(length=32), nullable=False, server_default='active'),
            sa.Column('credit_quota', sa.Float(), nullable=True),
            sa.Column('quota_used', sa.Float(), nullable=False, server_default='0.0'),
            sa.Column('invited_phone', sa.String(length=32), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_organization_members_id', 'organization_members', ['id'], unique=False)
        op.create_index('ix_organization_members_organization_id', 'organization_members', ['organization_id'], unique=False)
        op.create_index('ix_organization_members_user_id', 'organization_members', ['user_id'], unique=False)
        op.create_index('ix_organization_members_org_role', 'organization_members', ['org_role'], unique=False)
        op.create_index('ix_organization_members_status', 'organization_members', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_organization_members_status', table_name='organization_members')
    op.drop_index('ix_organization_members_org_role', table_name='organization_members')
    op.drop_index('ix_organization_members_user_id', table_name='organization_members')
    op.drop_index('ix_organization_members_organization_id', table_name='organization_members')
    op.drop_index('ix_organization_members_id', table_name='organization_members')
    op.drop_table('organization_members')

    op.drop_index('ix_organizations_owner_id', table_name='organizations')
    op.drop_index('ix_organizations_nit', table_name='organizations')
    op.drop_index('ix_organizations_name', table_name='organizations')
    op.drop_index('ix_organizations_id', table_name='organizations')
    op.drop_table('organizations')
