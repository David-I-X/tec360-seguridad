ALTER TABLE technicians ADD COLUMN IF NOT EXISTS rank VARCHAR(10) DEFAULT 'bronze';
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS rank_points INTEGER DEFAULT 0;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS certifications_count INTEGER DEFAULT 0;
ALTER TABLE service_ratings ADD COLUMN IF NOT EXISTS rated_by VARCHAR(20) DEFAULT 'client';
ALTER TABLE service_ratings ADD COLUMN IF NOT EXISTS rater_id VARCHAR(50) DEFAULT NULL;
ALTER TABLE services ADD COLUMN IF NOT EXISTS client_confirmed_at TIMESTAMP DEFAULT NULL;
DROP INDEX IF EXISTS ix_service_ratings_service_id;

-- ============================================
-- Escuela Tec: Courses, Lessons, Quizzes & Certifications
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'basicos',
    thumbnail_url TEXT,
    difficulty VARCHAR(20) NOT NULL DEFAULT 'beginner',
    estimated_hours INTEGER DEFAULT 2,
    instructor_name VARCHAR(100) DEFAULT 'Equipo Técnico Tec360',
    instructor_user_id UUID REFERENCES users(id),
    is_published BOOLEAN DEFAULT true,
    is_paid BOOLEAN DEFAULT false,
    price DOUBLE PRECISION DEFAULT 0.0,
    is_required_for_technicians BOOLEAN DEFAULT false,
    rank_points_reward INTEGER DEFAULT 25,
    badge_name VARCHAR(100),
    badge_icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    enrolled_count INTEGER DEFAULT 0,
    rating DOUBLE PRECISION DEFAULT 5.0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_courses_id ON courses(id);
CREATE INDEX IF NOT EXISTS ix_courses_title ON courses(title);
CREATE INDEX IF NOT EXISTS ix_courses_slug ON courses(slug);
CREATE INDEX IF NOT EXISTS ix_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS ix_courses_is_published ON courses(is_published);

CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    content_markdown TEXT,
    video_url TEXT,
    video_duration_seconds INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    is_free_preview BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_lessons_id ON lessons(id);
CREATE INDEX IF NOT EXISTS ix_lessons_course_id ON lessons(course_id);

CREATE TABLE IF NOT EXISTS course_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSON NOT NULL DEFAULT '[]'::json,
    correct_option_index INTEGER NOT NULL,
    explanation TEXT,
    sort_order INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_course_quizzes_id ON course_quizzes(id);
CREATE INDEX IF NOT EXISTS ix_course_quizzes_course_id ON course_quizzes(course_id);

CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'enrolled',
    progress_pct DOUBLE PRECISION DEFAULT 0.0,
    completed_lessons INTEGER DEFAULT 0,
    enrolled_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    quiz_score DOUBLE PRECISION,
    quiz_passed BOOLEAN DEFAULT false,
    certificate_code VARCHAR(50) UNIQUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_enrollments_user_course UNIQUE(user_id, course_id)
);
CREATE INDEX IF NOT EXISTS ix_enrollments_id ON enrollments(id);
CREATE INDEX IF NOT EXISTS ix_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS ix_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS ix_enrollments_certificate_code ON enrollments(certificate_code);

CREATE TABLE IF NOT EXISTS lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT uq_lesson_progress_enrollment_lesson UNIQUE(enrollment_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS ix_lesson_progress_id ON lesson_progress(id);
CREATE INDEX IF NOT EXISTS ix_lesson_progress_enrollment_id ON lesson_progress(enrollment_id);
CREATE INDEX IF NOT EXISTS ix_lesson_progress_lesson_id ON lesson_progress(lesson_id);
