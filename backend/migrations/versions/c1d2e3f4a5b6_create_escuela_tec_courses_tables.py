"""create_escuela_tec_courses_tables

Revision ID: c1d2e3f4a5b6
Revises: b5c7d9e1f3a2
Create Date: 2026-09-11 12:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = 'b5c7d9e1f3a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Courses ---
    op.create_table('courses',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=50), server_default='basicos', nullable=False),
        sa.Column('thumbnail_url', sa.Text(), nullable=True),
        sa.Column('difficulty', sa.String(length=20), server_default='beginner', nullable=False),
        sa.Column('estimated_hours', sa.Integer(), server_default='2', nullable=False),
        sa.Column('instructor_name', sa.String(length=100), server_default='Equipo Técnico Tec360', nullable=True),
        sa.Column('instructor_user_id', sa.Uuid(), nullable=True),
        sa.Column('is_published', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_paid', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('price', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('is_required_for_technicians', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('rank_points_reward', sa.Integer(), server_default='25', nullable=False),
        sa.Column('badge_name', sa.String(length=100), nullable=True),
        sa.Column('badge_icon', sa.String(length=50), nullable=True),
        sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('enrolled_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('rating', sa.Float(), server_default='5.0', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['instructor_user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug')
    )
    op.create_index('ix_courses_id', 'courses', ['id'], unique=False)
    op.create_index('ix_courses_title', 'courses', ['title'], unique=False)
    op.create_index('ix_courses_slug', 'courses', ['slug'], unique=True)
    op.create_index('ix_courses_category', 'courses', ['category'], unique=False)
    op.create_index('ix_courses_is_published', 'courses', ['is_published'], unique=False)

    # --- Lessons ---
    op.create_table('lessons',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('course_id', sa.Uuid(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=255), nullable=False),
        sa.Column('content_markdown', sa.Text(), nullable=True),
        sa.Column('video_url', sa.Text(), nullable=True),
        sa.Column('video_duration_seconds', sa.Integer(), server_default='0', nullable=False),
        sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('is_published', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_free_preview', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_lessons_id', 'lessons', ['id'], unique=False)
    op.create_index('ix_lessons_course_id', 'lessons', ['course_id'], unique=False)

    # --- Course Quizzes ---
    op.create_table('course_quizzes',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('course_id', sa.Uuid(), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('options', sa.JSON(), nullable=False),
        sa.Column('correct_option_index', sa.Integer(), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=True),
        sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_course_quizzes_id', 'course_quizzes', ['id'], unique=False)
    op.create_index('ix_course_quizzes_course_id', 'course_quizzes', ['course_id'], unique=False)

    # --- Enrollments ---
    op.create_table('enrollments',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('course_id', sa.Uuid(), nullable=False),
        sa.Column('status', sa.String(length=30), server_default='enrolled', nullable=False),
        sa.Column('progress_pct', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('completed_lessons', sa.Integer(), server_default='0', nullable=False),
        sa.Column('enrolled_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('quiz_score', sa.Float(), nullable=True),
        sa.Column('quiz_passed', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('certificate_code', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['courses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('certificate_code'),
        sa.UniqueConstraint('user_id', 'course_id', name='uq_enrollments_user_course')
    )
    op.create_index('ix_enrollments_id', 'enrollments', ['id'], unique=False)
    op.create_index('ix_enrollments_user_id', 'enrollments', ['user_id'], unique=False)
    op.create_index('ix_enrollments_course_id', 'enrollments', ['course_id'], unique=False)
    op.create_index('ix_enrollments_certificate_code', 'enrollments', ['certificate_code'], unique=True)

    # --- Lesson Progress ---
    op.create_table('lesson_progress',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('enrollment_id', sa.Uuid(), nullable=False),
        sa.Column('lesson_id', sa.Uuid(), nullable=False),
        sa.Column('completed', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['enrollment_id'], ['enrollments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['lesson_id'], ['lessons.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('enrollment_id', 'lesson_id', name='uq_lesson_progress_enrollment_lesson')
    )
    op.create_index('ix_lesson_progress_id', 'lesson_progress', ['id'], unique=False)
    op.create_index('ix_lesson_progress_enrollment_id', 'lesson_progress', ['enrollment_id'], unique=False)
    op.create_index('ix_lesson_progress_lesson_id', 'lesson_progress', ['lesson_id'], unique=False)


def downgrade() -> None:
    op.drop_table('lesson_progress')
    op.drop_table('enrollments')
    op.drop_table('course_quizzes')
    op.drop_table('lessons')
    op.drop_table('courses')
