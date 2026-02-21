"""
Tests para autenticación — OTP, onboarding, /me
"""
import pytest
from tests.conftest import auth_header


class TestOTPFlow:
    """Test the OTP request and verification flow"""

    def test_request_otp_success(self, client):
        """OTP request should always succeed (simulation mode)"""
        resp = client.post("/auth/request-otp", json={"phone": "+573001234567"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "expires_in_minutes" in data

    def test_verify_otp_correct_code(self, client):
        """Correct OTP code should return token and user"""
        resp = client.post("/auth/verify-otp", json={
            "phone": "+573009999999",
            "code": "123456"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "access_token" in data
        assert data["user"]["phone"] == "+573009999999"

    def test_verify_otp_wrong_code(self, client):
        """Wrong OTP code should return 400"""
        resp = client.post("/auth/verify-otp", json={
            "phone": "+573001234567",
            "code": "000000"
        })
        assert resp.status_code == 400

    def test_verify_otp_creates_new_user(self, client):
        """First verification with a new phone should create user"""
        unique_phone = "+573008888888"
        resp = client.post("/auth/verify-otp", json={
            "phone": unique_phone,
            "code": "123456"
        })
        data = resp.json()
        assert data["is_new_user"] is True
        assert data["user"]["role"] == "client"  # default role

    def test_verify_otp_existing_user(self, client):
        """Second verification with same phone should find existing user"""
        phone = "+573007777777"
        # First login
        client.post("/auth/verify-otp", json={"phone": phone, "code": "123456"})
        # Second login
        resp = client.post("/auth/verify-otp", json={"phone": phone, "code": "123456"})
        data = resp.json()
        assert data["is_new_user"] is False


class TestOnboarding:
    """Test the onboarding/profile completion flow"""

    def test_onboarding_success(self, client):
        """Complete onboarding should update user profile"""
        # Create user via OTP
        resp = client.post("/auth/verify-otp", json={
            "phone": "+573006666666",
            "code": "123456"
        })
        token = resp.json()["access_token"]

        # Complete onboarding
        resp = client.post(
            "/auth/onboarding",
            json={
                "full_name": "Juan Pérez",
                "email": "juan@ejemplo.com",
                "user_type": "client"
            },
            headers=auth_header(token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["full_name"] == "Juan Pérez"
        assert data["user"]["onboarding_completed"] is True

    def test_onboarding_as_technician(self, client):
        """Onboarding as technician should set role correctly"""
        resp = client.post("/auth/verify-otp", json={
            "phone": "+573005555555",
            "code": "123456"
        })
        token = resp.json()["access_token"]

        resp = client.post(
            "/auth/onboarding",
            json={
                "full_name": "Carlos Técnico",
                "user_type": "technician"
            },
            headers=auth_header(token),
        )
        data = resp.json()
        assert data["user"]["role"] == "technician"

    def test_onboarding_without_auth_fails(self, client):
        """Onboarding without token should return 401"""
        resp = client.post("/auth/onboarding", json={
            "full_name": "Hacker",
            "user_type": "admin"
        })
        assert resp.status_code == 401


class TestGetMe:
    """Test the /auth/me endpoint"""

    def test_get_me_authenticated(self, client, test_client_user):
        """Authenticated user should get their profile"""
        user, token = test_client_user
        resp = client.get("/auth/me", headers=auth_header(token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert str(user.id) == data["user"]["id"]

    def test_get_me_no_token(self, client):
        """Request without token should return 401"""
        resp = client.get("/auth/me")
        assert resp.status_code == 401

    def test_get_me_invalid_token(self, client):
        """Request with invalid token should return 401"""
        resp = client.get("/auth/me", headers=auth_header("invalid.token.here"))
        assert resp.status_code == 401
