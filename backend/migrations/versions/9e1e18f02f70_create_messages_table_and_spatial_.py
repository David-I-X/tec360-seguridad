"""create messages table and spatial indexes

Revision ID: 9e1e18f02f70
Revises: 9cf286c39062
Create Date: 2026-05-26 17:22:14.365793

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '9e1e18f02f70'
down_revision: Union[str, Sequence[str], None] = '9cf286c39062'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create messages table
    op.create_table('messages',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('service_id', sa.Uuid(), nullable=False),
        sa.Column('sender_id', sa.Uuid(), nullable=False),
        sa.Column('text', sa.String(length=2000), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # 2. Create indexes for messages
    op.create_index('ix_messages_id', 'messages', ['id'], unique=False)
    op.create_index('ix_messages_sender_id', 'messages', ['sender_id'], unique=False)
    op.create_index('ix_messages_service_id', 'messages', ['service_id'], unique=False)

    # 3. Create spatial index for services.service_location
    op.execute('CREATE INDEX IF NOT EXISTS idx_services_service_location ON services USING GIST (service_location)')


def downgrade() -> None:
    # 1. Drop spatial index
    op.execute('DROP INDEX IF EXISTS idx_services_service_location')
    
    # 2. Drop messages indexes and table
    op.drop_index('ix_messages_service_id', table_name='messages')
    op.drop_index('ix_messages_sender_id', table_name='messages')
    op.drop_index('ix_messages_id', table_name='messages')
    op.drop_table('messages')
