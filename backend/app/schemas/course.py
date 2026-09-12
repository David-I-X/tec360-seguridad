from typing import Optional, List
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class LessonSummary(BaseModel):
    id: UUID
    course_id: UUID
    title: str
    slug: str
    video_duration_seconds: int = 0
    sort_order: int = 0
    is_free_preview: bool = False
    is_completed: bool = False

    class Config:
        from_attributes = True


class LessonDetail(BaseModel):
    id: UUID
    course_id: UUID
    title: str
    slug: str
    content_markdown: Optional[str] = None
    video_url: Optional[str] = None
    video_duration_seconds: int = 0
    sort_order: int = 0
    is_free_preview: bool = False
    is_completed: bool = False
    next_lesson_slug: Optional[str] = None
    prev_lesson_slug: Optional[str] = None

    class Config:
        from_attributes = True


class LessonCreate(BaseModel):
    title: str = Field(..., min_length=3)
    slug: Optional[str] = None
    content_markdown: Optional[str] = None
    video_url: Optional[str] = None
    video_duration_seconds: int = 0
    sort_order: int = 0
    is_free_preview: bool = False


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    content_markdown: Optional[str] = None
    video_url: Optional[str] = None
    video_duration_seconds: Optional[int] = None
    sort_order: Optional[int] = None
    is_published: Optional[bool] = None
    is_free_preview: Optional[bool] = None


class CourseBaseSchema(BaseModel):
    title: str = Field(..., min_length=3)
    slug: Optional[str] = None
    description: Optional[str] = None
    category: str = "basicos"
    thumbnail_url: Optional[str] = None
    difficulty: str = "beginner"
    estimated_hours: int = 2
    instructor_name: Optional[str] = "Equipo Técnico Tec360"
    is_published: bool = True
    is_paid: bool = False
    price: float = 0.0
    is_required_for_technicians: bool = False
    rank_points_reward: int = 25
    badge_name: Optional[str] = None
    badge_icon: Optional[str] = None
    sort_order: int = 0


class CourseCreate(CourseBaseSchema):
    pass


class CourseUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    thumbnail_url: Optional[str] = None
    difficulty: Optional[str] = None
    estimated_hours: Optional[int] = None
    instructor_name: Optional[str] = None
    is_published: Optional[bool] = None
    is_paid: Optional[bool] = None
    price: Optional[float] = None
    is_required_for_technicians: Optional[bool] = None
    rank_points_reward: Optional[int] = None
    badge_name: Optional[str] = None
    badge_icon: Optional[str] = None
    sort_order: Optional[int] = None


class CourseListItem(BaseModel):
    id: UUID
    title: str
    slug: str
    description: Optional[str] = None
    category: str
    thumbnail_url: Optional[str] = None
    difficulty: str
    estimated_hours: int
    instructor_name: Optional[str] = None
    is_published: bool
    is_paid: bool
    price: float
    is_required_for_technicians: bool
    rank_points_reward: int
    badge_name: Optional[str] = None
    badge_icon: Optional[str] = None
    sort_order: int
    enrolled_count: int
    rating: float
    lessons_count: int = 0
    is_enrolled: bool = False
    progress_pct: float = 0.0
    is_completed: bool = False

    class Config:
        from_attributes = True


class CourseDetailResponse(BaseModel):
    id: UUID
    title: str
    slug: str
    description: Optional[str] = None
    category: str
    thumbnail_url: Optional[str] = None
    difficulty: str
    estimated_hours: int
    instructor_name: Optional[str] = None
    is_published: bool
    is_paid: bool
    price: float
    is_required_for_technicians: bool
    rank_points_reward: int
    badge_name: Optional[str] = None
    badge_icon: Optional[str] = None
    sort_order: int
    enrolled_count: int
    rating: float
    lessons: List[LessonSummary] = []
    is_enrolled: bool = False
    enrollment_status: Optional[str] = None
    progress_pct: float = 0.0
    completed_lessons: int = 0
    quiz_passed: bool = False
    certificate_code: Optional[str] = None

    class Config:
        from_attributes = True


class QuizQuestionCreate(BaseModel):
    question_text: str = Field(..., min_length=5)
    options: List[str] = Field(..., min_items=2)
    correct_option_index: int = Field(..., ge=0)
    explanation: Optional[str] = None
    sort_order: int = 0


class QuizQuestionResponse(BaseModel):
    id: UUID
    question_text: str
    options: List[str]
    sort_order: int

    class Config:
        from_attributes = True


class QuizSubmissionItem(BaseModel):
    question_id: UUID
    selected_option_index: int


class QuizSubmission(BaseModel):
    answers: List[QuizSubmissionItem]


class QuizEvaluationResult(BaseModel):
    score: float
    passed: bool
    total_questions: int
    correct_answers: int
    required_score: float = 100.0
    certificate_code: Optional[str] = None
    rank_points_awarded: int = 0
    badge_awarded: Optional[str] = None
    message: str


class CertificateInfo(BaseModel):
    certificate_code: str
    student_name: str
    course_title: str
    category: str
    completion_date: datetime
    score: float
    instructor_name: str
    is_valid: bool = True
