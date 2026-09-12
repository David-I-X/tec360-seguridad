"""
Tests for Escuela Tec:
- Course catalog & categories
- Course & lesson details
- Enrollment & lesson completion progress
- Strict 100% quiz evaluation and technician reward
- Certificate verification & PDF generation
"""
import pytest
from uuid import uuid4
from datetime import timedelta
from sqlmodel import Session
from app.core.auth_utils import create_access_token
from app.models.user import User
from app.models.technician import Technician
from app.services.course_seed import seed_courses


@pytest.fixture()
def seeded_session(session: Session):
    """Ensure courses are seeded in the test database session."""
    seed_courses(session)
    return session


@pytest.fixture()
def course_tech_user(session: Session):
    """Create a technician user specifically for course testing."""
    user = User(
        id=uuid4(),
        email=f"coursetech_{uuid4().hex[:8]}@test.com",
        phone=f"+57320{uuid4().int % 10000000:07d}",
        full_name="Carlos Gomez",
        hashed_password="hashed_secret",
        role="technician",
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    tech = Technician(
        id=uuid4(),
        user_id=user.id,
        specializations=["gps_installation"],
        rank="bronze",
        rank_points=0,
        certifications_count=0,
        experience_years=3,
    )
    session.add(tech)
    session.commit()
    session.refresh(tech)

    token = create_access_token(
        subject=user.id,
        expires_delta=timedelta(hours=2),
        extra_claims={"role": "technician"},
    )
    return user, tech, token


def test_list_courses(client, seeded_session):
    """Test public course catalog listing."""
    res = client.get("/api/courses")
    assert res.status_code == 200
    courses = res.json()
    assert len(courses) >= 4
    slugs = [c["slug"] for c in courses]
    assert "fundamentos-instalacion-seguridad" in slugs
    assert "instalacion-profesional-gps-4g" in slugs


def test_list_categories(client):
    """Test public course categories endpoint."""
    res = client.get("/api/courses/categories")
    assert res.status_code == 200
    cats = res.json()
    cat_ids = [c["id"] for c in cats]
    assert "dashcam" in cat_ids
    assert "gps_alarmas" in cat_ids
    assert "basicos" in cat_ids
    assert "mecanica_basica" in cat_ids
    assert "proveedor" in cat_ids


def test_get_course_detail(client, seeded_session):
    """Test retrieving course detail with lessons."""
    res = client.get("/api/courses/fundamentos-instalacion-seguridad")
    assert res.status_code == 200
    data = res.json()
    assert data["slug"] == "fundamentos-instalacion-seguridad"
    assert len(data["lessons"]) >= 4
    assert data["is_required_for_technicians"] is True


def test_get_lesson_detail(client, seeded_session):
    """Test retrieving lesson content and navigation."""
    res = client.get("/api/courses/fundamentos-instalacion-seguridad/lessons/induccion-protocolos-seguridad")
    assert res.status_code == 200
    data = res.json()
    assert "Protocolos de Oro de Tec360" in data["content_markdown"]
    assert data["video_url"] is not None


def test_enrollment_and_lesson_completion(client, seeded_session, course_tech_user):
    """Test student enrollment and marking lessons complete."""
    user, tech, token = course_tech_user
    headers = {"Authorization": f"Bearer {token}"}
    slug = "fundamentos-instalacion-seguridad"


    # Enroll
    res = client.post(f"/api/courses/{slug}/enroll", headers=headers)
    assert res.status_code == 200
    assert res.json()["success"] is True

    # Get course detail to fetch lesson IDs
    course_res = client.get(f"/api/courses/{slug}", headers=headers)
    lessons = course_res.json()["lessons"]
    first_lesson_id = lessons[0]["id"]

    # Mark first lesson complete
    comp_res = client.post(f"/api/courses/{slug}/lessons/{first_lesson_id}/complete", headers=headers)
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    assert comp_data["completed"] is True
    assert comp_data["completed_lessons"] >= 1
    assert comp_data["progress_pct"] > 0


def test_strict_100_percent_quiz_and_certification(client, seeded_session, course_tech_user):
    """
    Test certification quiz:
    1. Submitting imperfect answers (< 100%) fails and does NOT certify.
    2. Submitting 100% correct answers passes, generates certificate code,
       awards technician rank points and badge.
    3. Certificate verification and PDF download succeed.
    """
    user, tech, token = course_tech_user
    headers = {"Authorization": f"Bearer {token}"}
    slug = "instalacion-profesional-gps-4g"

    # Enroll in course
    client.post(f"/api/courses/{slug}/enroll", headers=headers)

    # Fetch quiz questions
    quiz_res = client.get(f"/api/courses/{slug}/quiz", headers=headers)
    assert quiz_res.status_code == 200
    questions = quiz_res.json()
    assert len(questions) == 4

    # 1. Submit with 1 wrong answer (Imperfect score -> Must FAIL)
    imperfect_answers = [
        {"question_id": questions[0]["id"], "selected_option_index": 1},
        {"question_id": questions[1]["id"], "selected_option_index": 1},
        {"question_id": questions[2]["id"], "selected_option_index": 1},
        {"question_id": questions[3]["id"], "selected_option_index": 0}, # WRONG: 0 instead of 1
    ]
    res_imperfect = client.post(f"/api/courses/{slug}/quiz/submit", json={"answers": imperfect_answers}, headers=headers)
    assert res_imperfect.status_code == 200
    result_imperfect = res_imperfect.json()
    assert result_imperfect["passed"] is False
    assert result_imperfect["score"] == 75.0
    assert result_imperfect["certificate_code"] is None

    # 2. Submit with 100% PERFECT answers (All 4 correct -> Must PASS)
    perfect_answers = [
        {"question_id": questions[0]["id"], "selected_option_index": 1},
        {"question_id": questions[1]["id"], "selected_option_index": 1},
        {"question_id": questions[2]["id"], "selected_option_index": 1},
        {"question_id": questions[3]["id"], "selected_option_index": 1}, # CORRECT
    ]
    res_perfect = client.post(f"/api/courses/{slug}/quiz/submit", json={"answers": perfect_answers}, headers=headers)
    assert res_perfect.status_code == 200
    result_perfect = res_perfect.json()
    assert result_perfect["passed"] is True
    assert result_perfect["score"] == 100.0
    assert result_perfect["rank_points_awarded"] == 35
    assert result_perfect["badge_awarded"] == "Especialista GPS 4G"
    cert_code = result_perfect["certificate_code"]
    assert cert_code is not None
    assert cert_code.startswith("TEC-GPS")

    # 3. Verify public certificate endpoint
    verify_res = client.get(f"/api/courses/certificates/{cert_code}")
    assert verify_res.status_code == 200
    cert_data = verify_res.json()
    assert cert_data["student_name"] == "Carlos Gomez"
    assert cert_data["score"] == 100.0
    assert cert_data["is_valid"] is True

    # 4. Download official PDF certificate
    pdf_res = client.get(f"/api/courses/certificates/{cert_code}/download")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000
