from typing import Optional, List
from datetime import datetime
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel, JSON
from sqlalchemy import Column
from enum import Enum


class CourseCategory(str, Enum):
    dashcam = "dashcam"                  # Dashcams HD y Camaras
    gps_alarmas = "gps_alarmas"          # GPS y Alarmas
    basicos = "basicos"                  # Fundamentos e Induccion
    mecanica_basica = "mecanica_basica"  # Mecanica Basica y Electricidad Automotriz
    proveedor = "proveedor"              # Hardware por Proveedor


class CourseDifficulty(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class EnrollmentStatus(str, Enum):
    enrolled = "enrolled"
    in_progress = "in_progress"
    completed = "completed"


class CourseBase(SQLModel):
    title: str = Field(index=True)
    slug: str = Field(unique=True, index=True)
    description: Optional[str] = None
    category: str = Field(default=CourseCategory.basicos.value, index=True)
    thumbnail_url: Optional[str] = None
    difficulty: str = Field(default=CourseDifficulty.beginner.value)
    estimated_hours: int = Field(default=2)
    instructor_name: Optional[str] = Field(default="Equipo Tecnico Tec360")
    instructor_user_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    is_published: bool = Field(default=True, index=True)
    is_paid: bool = Field(default=False)
    price: float = Field(default=0.0)
    is_required_for_technicians: bool = Field(default=False)
    rank_points_reward: int = Field(default=25)
    badge_name: Optional[str] = None
    badge_icon: Optional[str] = None
    sort_order: int = Field(default=0)
    enrolled_count: int = Field(default=0)
    rating: float = Field(default=5.0)


class Course(CourseBase, table=True):
    __tablename__ = "courses"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class LessonBase(SQLModel):
    course_id: UUID = Field(foreign_key="courses.id", index=True)
    title: str
    slug: str
    content_markdown: Optional[str] = None
    video_url: Optional[str] = None
    video_duration_seconds: int = Field(default=0)
    sort_order: int = Field(default=0)
    is_published: bool = Field(default=True)
    is_free_preview: bool = Field(default=False)


class Lesson(LessonBase, table=True):
    __tablename__ = "lessons"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CourseQuiz(SQLModel, table=True):
    __tablename__ = "course_quizzes"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    course_id: UUID = Field(foreign_key="courses.id", index=True)
    question_text: str
    options: List[str] = Field(default=[], sa_column=Column(JSON))
    correct_option_index: int
    explanation: Optional[str] = None
    sort_order: int = Field(default=0)


class Enrollment(SQLModel, table=True):
    __tablename__ = "enrollments"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    course_id: UUID = Field(foreign_key="courses.id", index=True)
    status: str = Field(default=EnrollmentStatus.enrolled.value)
    progress_pct: float = Field(default=0.0)
    completed_lessons: int = Field(default=0)
    enrolled_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    quiz_score: Optional[float] = None
    quiz_passed: bool = Field(default=False)
    certificate_code: Optional[str] = Field(default=None, unique=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class LessonProgress(SQLModel, table=True):
    __tablename__ = "lesson_progress"

    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    enrollment_id: UUID = Field(foreign_key="enrollments.id", index=True)
    lesson_id: UUID = Field(foreign_key="lessons.id", index=True)
    completed: bool = Field(default=False)
    completed_at: Optional[datetime] = None
