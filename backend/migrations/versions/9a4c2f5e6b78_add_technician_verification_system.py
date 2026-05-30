"""Add technician verification system

Revision ID: 9a4c2f5e6b78
Revises: 8a3c1d4e5f67
Create Date: 2026-05-13 21:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '9a4c2f5e6b78'
down_revision = '8a3c1d4e5f67'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Create technician_documents table
    op.create_table('technician_documents',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('technician_id', sa.Uuid(), nullable=False),
        sa.Column('document_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('document_url', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('status', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default="pending"),
        sa.Column('rejection_reason', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('reviewed_by', sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['technician_id'], ['technicians.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_technician_documents_document_type'), 'technician_documents', ['document_type'], unique=False)
    op.create_index(op.f('ix_technician_documents_id'), 'technician_documents', ['id'], unique=False)
    op.create_index(op.f('ix_technician_documents_technician_id'), 'technician_documents', ['technician_id'], unique=False)

    # 2. Create quiz_questions table
    op.create_table('quiz_questions',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('specialization', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('question_text', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('options', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('correct_option_index', sa.Integer(), nullable=False),
        sa.Column('difficulty', sqlmodel.sql.sqltypes.AutoString(), nullable=False, server_default="medium"),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_quiz_questions_id'), 'quiz_questions', ['id'], unique=False)
    op.create_index(op.f('ix_quiz_questions_specialization'), 'quiz_questions', ['specialization'], unique=False)

    # 3. Create quiz_attempts table
    op.create_table('quiz_attempts',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('technician_id', sa.Uuid(), nullable=False),
        sa.Column('specialization', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('score', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('passed', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('answers', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('can_retry_after', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['technician_id'], ['technicians.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_quiz_attempts_id'), 'quiz_attempts', ['id'], unique=False)
    op.create_index(op.f('ix_quiz_attempts_technician_id'), 'quiz_attempts', ['technician_id'], unique=False)

    # 4. Add verification_status to technicians
    op.add_column('technicians', sa.Column('verification_status', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    
    # Update existing technicians to 'verified' to not break existing flow for registered users
    op.execute("UPDATE technicians SET verification_status = 'verified'")
    op.execute("UPDATE technicians SET is_verified = true")
    
    # Now set it as not null
    op.alter_column('technicians', 'verification_status', nullable=False, server_default="incomplete")


def downgrade():
    op.drop_column('technicians', 'verification_status')
    
    op.drop_index(op.f('ix_quiz_attempts_technician_id'), table_name='quiz_attempts')
    op.drop_index(op.f('ix_quiz_attempts_id'), table_name='quiz_attempts')
    op.drop_table('quiz_attempts')
    
    op.drop_index(op.f('ix_quiz_questions_specialization'), table_name='quiz_questions')
    op.drop_index(op.f('ix_quiz_questions_id'), table_name='quiz_questions')
    op.drop_table('quiz_questions')
    
    op.drop_index(op.f('ix_technician_documents_technician_id'), table_name='technician_documents')
    op.drop_index(op.f('ix_technician_documents_id'), table_name='technician_documents')
    op.drop_index(op.f('ix_technician_documents_document_type'), table_name='technician_documents')
    op.drop_table('technician_documents')
