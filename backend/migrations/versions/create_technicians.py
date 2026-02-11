"""Create technicians table

Revision ID: create_technicians
Revises: create_quotations
Create Date: 2026-02-08

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from geoalchemy2 import Geometry

# revision identifiers, used by Alembic.
revision: str = 'create_technicians'
down_revision: Union[str, None] = 'create_quotations'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create technicians table
    op.create_table(
        'technicians',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False, unique=True),
        sa.Column('sena_certification_number', sa.String(100), nullable=True, unique=True),
        sa.Column('specializations', postgresql.JSON(), nullable=True, default=[]),
        sa.Column('experience_years', sa.Integer(), nullable=False, default=0),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('service_radius_km', sa.Integer(), nullable=False, default=20),
        sa.Column('is_available', sa.Boolean(), nullable=False, default=True),
        sa.Column('is_verified', sa.Boolean(), nullable=False, default=False),
        sa.Column('total_services', sa.Integer(), nullable=False, default=0),
        sa.Column('average_rating', sa.Float(), nullable=False, default=0.0),
        sa.Column('current_location', Geometry('POINT', srid=4326), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    
    # Create indexes
    op.create_index('ix_technicians_user_id', 'technicians', ['user_id'])
    op.create_index('ix_technicians_is_available', 'technicians', ['is_available'])
    op.create_index('ix_technicians_is_verified', 'technicians', ['is_verified'])
    
    # Spatial index for location-based queries
    op.execute('CREATE INDEX ix_technicians_location ON technicians USING GIST (current_location)')


def downgrade() -> None:
    op.drop_index('ix_technicians_location', table_name='technicians')
    op.drop_index('ix_technicians_is_verified', table_name='technicians')
    op.drop_index('ix_technicians_is_available', table_name='technicians')
    op.drop_index('ix_technicians_user_id', table_name='technicians')
    op.drop_table('technicians')
