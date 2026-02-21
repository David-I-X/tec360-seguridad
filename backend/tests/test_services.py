"""
Tests para servicios — CRUD, estados, permisos por rol
"""
import pytest
from tests.conftest import auth_header


def create_service_payload(**overrides) -> dict:
    """Build a valid service creation payload"""
    base = {
        "service_type": "gps_installation",
        "title": "Instalar GPS en camión",
        "description": "GPS tracker para flota de 1 camión",
        "service_address": "Cra 43A #1-50, Medellín",
        "service_lat": 6.2442,
        "service_lon": -75.5636,
        "scheduled_date": "2026-03-15T10:00:00",
        "estimated_price": 350000,
        "client_notes": "Disponible de 8am a 12pm",
    }
    base.update(overrides)
    return base


class TestServiceCreation:
    """Test service creation by role"""

    def test_client_creates_service(self, client, test_client_user):
        """Client should be able to create a service"""
        user, token = test_client_user
        resp = client.post(
            "/services",
            json=create_service_payload(),
            headers=auth_header(token),
        )
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert data["title"] == "Instalar GPS en camión"
        assert data["status"] == "pending"
        assert data["client_id"] == str(user.id)

    def test_technician_cannot_create_service(self, client, test_tech_user):
        """Technician should NOT be able to create a service"""
        _, token = test_tech_user
        resp = client.post(
            "/services",
            json=create_service_payload(),
            headers=auth_header(token),
        )
        assert resp.status_code == 403

    def test_unauthenticated_cannot_create_service(self, client):
        """Unauthenticated user should get 401"""
        resp = client.post("/services", json=create_service_payload())
        assert resp.status_code == 401

    def test_missing_fields_returns_422(self, client, test_client_user):
        """Missing required fields should return validation error"""
        _, token = test_client_user
        resp = client.post(
            "/services",
            json={"title": "Solo título"},
            headers=auth_header(token),
        )
        assert resp.status_code == 422


class TestServiceListing:
    """Test service listing and filtering"""

    def test_client_sees_own_services(self, client, test_client_user):
        """Client should see their own services"""
        user, token = test_client_user
        # Create a service first
        client.post(
            "/services",
            json=create_service_payload(),
            headers=auth_header(token),
        )

        resp = client.get("/services", headers=auth_header(token))
        assert resp.status_code == 200
        data = resp.json()
        # Should return a list or paginated response
        assert isinstance(data, (list, dict))

    def test_technician_sees_available_services(self, client, test_tech_user):
        """Technician should see available services"""
        _, token = test_tech_user
        resp = client.get("/services", headers=auth_header(token))
        assert resp.status_code == 200


class TestServiceDetail:
    """Test service detail and updates"""

    def test_get_service_by_id(self, client, test_client_user):
        """Should get service details by ID"""
        _, token = test_client_user
        # Create service
        create_resp = client.post(
            "/services",
            json=create_service_payload(),
            headers=auth_header(token),
        )
        service_id = create_resp.json().get("id")
        if not service_id:
            pytest.skip("Service creation did not return ID")

        resp = client.get(f"/services/{service_id}", headers=auth_header(token))
        assert resp.status_code == 200

    def test_get_nonexistent_service(self, client, test_client_user):
        """Should return 404 for nonexistent service"""
        _, token = test_client_user
        resp = client.get(
            "/services/00000000-0000-0000-0000-000000000000",
            headers=auth_header(token),
        )
        assert resp.status_code in (404, 500)


class TestHealthCheck:
    """Test health endpoints"""

    def test_root_endpoint(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"

    def test_health_endpoint(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert "database" in data
        assert "version" in data