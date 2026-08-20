"""
Tests for the verification flow:
  1. Technician uploads document (multipart file)
  2. Admin reviews and approves/rejects documents
  3. Technician takes quiz
  4. Technician becomes verified
"""
import io
from uuid import uuid4
from datetime import timedelta

import pytest
from sqlmodel import Session, select

from tests.conftest import auth_header
from app.models.user import User
from app.models.technician import Technician
from app.models.verification import TechnicianDocument, QuizQuestion, QuizAttempt, VerificationStatus
from app.core.auth_utils import create_access_token


# ============================================
# FIXTURES
# ============================================

@pytest.fixture()
def tech_user_for_verification(session: Session):
    """Create a technician user specifically for verification tests."""
    user = User(
        id=uuid4(),
        email=f"verifytech_{uuid4().hex[:8]}@test.com",
        phone=f"+57320{uuid4().int % 10000000:07d}",
        full_name="Técnico Verificación",
        hashed_password="nopassword",
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
        experience_years=2,
        bio="Técnico para tests de verificación",
        verification_status=VerificationStatus.incomplete.value,
    )
    session.add(tech)
    session.commit()
    session.refresh(tech)

    token = create_access_token(
        subject=user.id,
        expires_delta=timedelta(hours=1),
        extra_claims={"role": "technician"},
    )
    yield user, tech, token

    # Cleanup
    try:
        # Delete related records first
        docs = session.exec(
            select(TechnicianDocument).where(TechnicianDocument.technician_id == tech.id)
        ).all()
        for doc in docs:
            session.delete(doc)

        attempts = session.exec(
            select(QuizAttempt).where(QuizAttempt.technician_id == tech.id)
        ).all()
        for att in attempts:
            session.delete(att)

        session.delete(tech)
        session.delete(user)
        session.commit()
    except Exception:
        session.rollback()


@pytest.fixture()
def admin_user(session: Session):
    """Create an admin user for document review."""
    user = User(
        id=uuid4(),
        email=f"admin_{uuid4().hex[:8]}@test.com",
        phone=f"+57300{uuid4().int % 10000000:07d}",
        full_name="Admin Test",
        hashed_password="nopassword",
        role="admin",
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_access_token(
        subject=user.id,
        expires_delta=timedelta(hours=1),
        extra_claims={"role": "admin"},
    )
    yield user, token

    try:
        session.delete(user)
        session.commit()
    except Exception:
        session.rollback()


def make_fake_image(filename: str = "test.jpg") -> tuple:
    """Create a minimal JPEG file for upload testing."""
    # Minimal valid JPEG (2x2 pixel)
    jpeg_bytes = bytes([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9
    ])
    return (filename, io.BytesIO(jpeg_bytes), "image/jpeg")


# ============================================
# DOCUMENT UPLOAD TESTS
# ============================================

class TestDocumentUpload:

    def test_upload_document_success(self, client, tech_user_for_verification):
        """Technician can upload a document via multipart file."""
        _, tech, token = tech_user_for_verification

        filename, file_obj, content_type = make_fake_image("cedula_front.jpg")
        response = client.post(
            "/verification/documents",
            headers=auth_header(token),
            files={"file": (filename, file_obj, content_type)},
            data={"document_type": "id_front"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["document_type"] == "id_front"
        assert data["status"] == "pending"
        assert "document_url" in data
        # URL should be a real storage path, not base64
        assert not data["document_url"].startswith("data:")

    def test_upload_changes_status_to_pending_review(self, client, session, tech_user_for_verification):
        """Uploading a document should change status from incomplete to pending_review."""
        _, tech, token = tech_user_for_verification

        # Verify initial status
        assert tech.verification_status == VerificationStatus.incomplete.value

        filename, file_obj, content_type = make_fake_image()
        client.post(
            "/verification/documents",
            headers=auth_header(token),
            files={"file": (filename, file_obj, content_type)},
            data={"document_type": "id_front"},
        )

        # Refresh from DB
        session.refresh(tech)
        assert tech.verification_status == VerificationStatus.pending_review.value

    def test_upload_invalid_document_type(self, client, tech_user_for_verification):
        """Should reject invalid document types."""
        _, _, token = tech_user_for_verification

        filename, file_obj, content_type = make_fake_image()
        response = client.post(
            "/verification/documents",
            headers=auth_header(token),
            files={"file": (filename, file_obj, content_type)},
            data={"document_type": "passport"},  # not valid
        )

        assert response.status_code == 400

    def test_upload_invalid_file_type(self, client, tech_user_for_verification):
        """Should reject non-image file types."""
        _, _, token = tech_user_for_verification

        response = client.post(
            "/verification/documents",
            headers=auth_header(token),
            files={"file": ("document.pdf", io.BytesIO(b"fake pdf"), "application/pdf")},
            data={"document_type": "id_front"},
        )

        assert response.status_code == 400

    def test_client_cannot_upload_document(self, client, test_client_user):
        """Non-technicians should be rejected."""
        _, token = test_client_user

        filename, file_obj, content_type = make_fake_image()
        response = client.post(
            "/verification/documents",
            headers=auth_header(token),
            files={"file": (filename, file_obj, content_type)},
            data={"document_type": "id_front"},
        )

        assert response.status_code == 403


# ============================================
# STATUS TESTS
# ============================================

class TestVerificationStatus:

    def test_get_status_initial(self, client, tech_user_for_verification):
        """New technician should have incomplete status."""
        _, _, token = tech_user_for_verification

        response = client.get(
            "/verification/status",
            headers=auth_header(token),
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "incomplete"
        assert data["documents"] == []
        assert data["quiz_attempts"] == []

    def test_get_status_after_upload(self, client, tech_user_for_verification):
        """Status should reflect uploaded documents."""
        _, _, token = tech_user_for_verification

        # Upload a document
        filename, file_obj, content_type = make_fake_image()
        client.post(
            "/verification/documents",
            headers=auth_header(token),
            files={"file": (filename, file_obj, content_type)},
            data={"document_type": "id_front"},
        )

        # Check status
        response = client.get(
            "/verification/status",
            headers=auth_header(token),
        )

        data = response.json()
        assert data["status"] == "pending_review"
        assert len(data["documents"]) == 1
        assert data["documents"][0]["document_type"] == "id_front"


# ============================================
# ADMIN REVIEW TESTS
# ============================================

class TestAdminReview:

    def test_admin_approve_documents(self, client, session, tech_user_for_verification, admin_user):
        """Admin can approve documents, moving tech to quiz_available."""
        _, tech, tech_token = tech_user_for_verification
        _, admin_token = admin_user

        # Upload document first
        filename, file_obj, content_type = make_fake_image()
        client.post(
            "/verification/documents",
            headers=auth_header(tech_token),
            files={"file": (filename, file_obj, content_type)},
            data={"document_type": "id_front"},
        )

        # Admin approves
        response = client.post(
            f"/verification/admin/{tech.id}/review",
            headers=auth_header(admin_token),
            json={"status": "approved"},
        )

        assert response.status_code == 200

        # Check tech status changed
        session.refresh(tech)
        assert tech.verification_status == VerificationStatus.quiz_available.value

    def test_admin_reject_documents(self, client, session, tech_user_for_verification, admin_user):
        """Admin can reject documents with a reason."""
        _, tech, tech_token = tech_user_for_verification
        _, admin_token = admin_user

        # Upload document
        filename, file_obj, content_type = make_fake_image()
        client.post(
            "/verification/documents",
            headers=auth_header(tech_token),
            files={"file": (filename, file_obj, content_type)},
            data={"document_type": "id_front"},
        )

        # Admin rejects
        response = client.post(
            f"/verification/admin/{tech.id}/review",
            headers=auth_header(admin_token),
            json={
                "status": "rejected",
                "rejection_reason": "La foto está borrosa",
            },
        )

        assert response.status_code == 200

        session.refresh(tech)
        assert tech.verification_status == VerificationStatus.documents_rejected.value

    def test_admin_get_pending(self, client, tech_user_for_verification, admin_user):
        """Admin can list technicians with pending documents."""
        _, tech, tech_token = tech_user_for_verification
        _, admin_token = admin_user

        # Upload document
        filename, file_obj, content_type = make_fake_image()
        client.post(
            "/verification/documents",
            headers=auth_header(tech_token),
            files={"file": (filename, file_obj, content_type)},
            data={"document_type": "id_front"},
        )

        # Admin checks pending
        response = client.get(
            "/verification/admin/pending",
            headers=auth_header(admin_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        # Our tech should be in the list
        tech_ids = [t["technician_id"] for t in data]
        assert str(tech.id) in tech_ids

    def test_non_admin_cannot_review(self, client, tech_user_for_verification):
        """Non-admin users cannot access admin endpoints."""
        _, tech, token = tech_user_for_verification

        response = client.get(
            "/verification/admin/pending",
            headers=auth_header(token),
        )

        assert response.status_code == 403


# ============================================
# QUIZ TESTS
# ============================================

class TestQuiz:

    def _approve_tech_for_quiz(self, client, session, tech, tech_token, admin_token):
        """Helper: upload doc + admin approve to unlock quiz."""
        filename, file_obj, content_type = make_fake_image()
        client.post(
            "/verification/documents",
            headers=auth_header(tech_token),
            files={"file": (filename, file_obj, content_type)},
            data={"document_type": "id_front"},
        )
        client.post(
            f"/verification/admin/{tech.id}/review",
            headers=auth_header(admin_token),
            json={"status": "approved"},
        )
        session.refresh(tech)

    def test_get_quiz_questions(self, client, session, tech_user_for_verification, admin_user):
        """Approved technician can get quiz questions."""
        _, tech, tech_token = tech_user_for_verification
        _, admin_token = admin_user

        self._approve_tech_for_quiz(client, session, tech, tech_token, admin_token)

        response = client.get(
            "/verification/quiz/gps_installation",
            headers=auth_header(tech_token),
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        assert "question_text" in data[0]
        assert "options" in data[0]
        # Should NOT include correct_option_index
        assert "correct_option_index" not in data[0]

    def test_cannot_get_quiz_before_approval(self, client, tech_user_for_verification):
        """Technician without approved docs cannot access quiz."""
        _, _, token = tech_user_for_verification

        response = client.get(
            "/verification/quiz/gps_installation",
            headers=auth_header(token),
        )

        assert response.status_code == 403

    def test_submit_quiz_pass(self, client, session, tech_user_for_verification, admin_user):
        """Submitting correct answers should pass the quiz and verify the technician."""
        _, tech, tech_token = tech_user_for_verification
        _, admin_token = admin_user

        self._approve_tech_for_quiz(client, session, tech, tech_token, admin_token)

        # Get questions
        response = client.get(
            "/verification/quiz/gps_installation",
            headers=auth_header(tech_token),
        )
        questions = response.json()

        # Get correct answers from DB
        answers = []
        for q in questions:
            db_question = session.get(QuizQuestion, q["id"])
            answers.append({
                "question_id": q["id"],
                "selected_option_index": db_question.correct_option_index,
            })

        # Submit quiz with all correct answers
        response = client.post(
            "/verification/quiz/gps_installation/submit",
            headers=auth_header(tech_token),
            json={"answers": answers},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["passed"] is True
        assert data["score"] == 100

        # Tech should be verified
        session.refresh(tech)
        assert tech.verification_status == VerificationStatus.verified.value
        assert tech.is_verified is True

    def test_submit_quiz_fail(self, client, session, tech_user_for_verification, admin_user):
        """Submitting all wrong answers should fail and set retry cooldown."""
        _, tech, tech_token = tech_user_for_verification
        _, admin_token = admin_user

        self._approve_tech_for_quiz(client, session, tech, tech_token, admin_token)

        # Get questions
        response = client.get(
            "/verification/quiz/gps_installation",
            headers=auth_header(tech_token),
        )
        questions = response.json()

        # Submit all wrong answers (pick index that's NOT correct)
        answers = []
        for q in questions:
            db_question = session.get(QuizQuestion, q["id"])
            wrong_index = (db_question.correct_option_index + 1) % len(q["options"])
            answers.append({
                "question_id": q["id"],
                "selected_option_index": wrong_index,
            })

        response = client.post(
            "/verification/quiz/gps_installation/submit",
            headers=auth_header(tech_token),
            json={"answers": answers},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["passed"] is False
        assert data["score"] == 0
        assert data["can_retry_after"] is not None


# ============================================
# FULL FLOW TEST
# ============================================

class TestFullVerificationFlow:

    def test_complete_verification_flow(self, client, session, tech_user_for_verification, admin_user):
        """
        End-to-end test:
        1. Check initial status (incomplete)
        2. Upload id_front
        3. Upload id_back
        4. Admin approves
        5. Take quiz (pass)
        6. Verify tech is fully verified
        """
        _, tech, tech_token = tech_user_for_verification
        admin, admin_token = admin_user

        # 1. Initial status
        res = client.get("/verification/status", headers=auth_header(tech_token))
        assert res.json()["status"] == "incomplete"

        # 2. Upload id_front
        f1_name, f1_obj, f1_type = make_fake_image("cedula_front.jpg")
        res = client.post(
            "/verification/documents",
            headers=auth_header(tech_token),
            files={"file": (f1_name, f1_obj, f1_type)},
            data={"document_type": "id_front"},
        )
        assert res.status_code == 200

        # 3. Upload id_back
        f2_name, f2_obj, f2_type = make_fake_image("cedula_back.jpg")
        res = client.post(
            "/verification/documents",
            headers=auth_header(tech_token),
            files={"file": (f2_name, f2_obj, f2_type)},
            data={"document_type": "id_back"},
        )
        assert res.status_code == 200

        # Status should be pending_review
        res = client.get("/verification/status", headers=auth_header(tech_token))
        assert res.json()["status"] == "pending_review"
        assert len(res.json()["documents"]) == 2

        # 4. Admin approves
        res = client.post(
            f"/verification/admin/{tech.id}/review",
            headers=auth_header(admin_token),
            json={"status": "approved"},
        )
        assert res.status_code == 200

        # Status should be quiz_available
        res = client.get("/verification/status", headers=auth_header(tech_token))
        assert res.json()["status"] == "quiz_available"

        # 5. Take quiz (all correct)
        res = client.get("/verification/quiz/gps_installation", headers=auth_header(tech_token))
        questions = res.json()

        answers = []
        for q in questions:
            db_q = session.get(QuizQuestion, q["id"])
            answers.append({
                "question_id": q["id"],
                "selected_option_index": db_q.correct_option_index,
            })

        res = client.post(
            "/verification/quiz/gps_installation/submit",
            headers=auth_header(tech_token),
            json={"answers": answers},
        )
        assert res.json()["passed"] is True

        # 6. Final status: verified
        res = client.get("/verification/status", headers=auth_header(tech_token))
        assert res.json()["status"] == "verified"

        session.refresh(tech)
        assert tech.is_verified is True
