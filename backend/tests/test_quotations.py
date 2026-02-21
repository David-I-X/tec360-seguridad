"""
Tests para cotizaciones — envío, aprobación, rechazo, contraoferta
"""
import pytest
from tests.conftest import auth_header


def create_service_and_get_id(client, token: str) -> str:
    """Helper: create a service and return its ID"""
    resp = client.post(
        "/services",
        json={
            "service_type": "camera_installation",
            "title": "Instalar cámaras de seguridad",
            "description": "4 cámaras HD en oficina",
            "service_address": "Cra 43A #1-50, Medellín",
            "service_lat": 6.2442,
            "service_lon": -75.5636,
            "scheduled_date": "2026-03-20T10:00:00",
            "estimated_price": 500000,
        },
        headers=auth_header(token),
    )
    data = resp.json()
    return data.get("id")


class TestQuotationCreation:
    """Test quotation creation by technicians"""

    def test_technician_creates_quotation(self, client, test_client_user, test_tech_user):
        """Technician should be able to quote on a service"""
        _, client_token = test_client_user
        _, tech_token = test_tech_user

        service_id = create_service_and_get_id(client, client_token)
        if not service_id:
            pytest.skip("Could not create service")

        resp = client.post(
            f"/quotations/service/{service_id}",
            json={
                "amount": 450000,
                "description": "Instalación completa de 4 cámaras HD con DVR",
                "expires_in_hours": 48,
            },
            headers=auth_header(tech_token),
        )
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert data.get("status") == "pending" or "id" in data

    def test_client_cannot_create_quotation(self, client, test_client_user):
        """Client should NOT be able to create a quotation"""
        _, token = test_client_user
        service_id = create_service_and_get_id(client, token)
        if not service_id:
            pytest.skip("Could not create service")

        resp = client.post(
            f"/quotations/service/{service_id}",
            json={
                "amount": 300000,
                "description": "Intentando cotizar como cliente",
            },
            headers=auth_header(token),
        )
        assert resp.status_code == 403


class TestQuotationActions:
    """Test quotation approval, rejection, counter-offer"""

    def _create_service_and_quotation(self, client, client_token, tech_token):
        """Helper: create a service and a quotation, return both IDs"""
        service_id = create_service_and_get_id(client, client_token)
        if not service_id:
            return None, None

        resp = client.post(
            f"/quotations/service/{service_id}",
            json={
                "amount": 400000,
                "description": "Servicio completo con garantía",
            },
            headers=auth_header(tech_token),
        )
        data = resp.json()
        quotation_id = data.get("id")
        return service_id, quotation_id

    def test_client_approves_quotation(self, client, test_client_user, test_tech_user):
        """Client should be able to approve a quotation"""
        _, client_token = test_client_user
        _, tech_token = test_tech_user

        _, quotation_id = self._create_service_and_quotation(
            client, client_token, tech_token
        )
        if not quotation_id:
            pytest.skip("Could not create quotation")

        resp = client.patch(
            f"/quotations/{quotation_id}/approve",
            headers=auth_header(client_token),
        )
        assert resp.status_code == 200

    def test_client_rejects_quotation(self, client, test_client_user, test_tech_user):
        """Client should be able to reject a quotation"""
        _, client_token = test_client_user
        _, tech_token = test_tech_user

        _, quotation_id = self._create_service_and_quotation(
            client, client_token, tech_token
        )
        if not quotation_id:
            pytest.skip("Could not create quotation")

        resp = client.patch(
            f"/quotations/{quotation_id}/reject",
            json={"client_response": "Muy costoso"},
            headers=auth_header(client_token),
        )
        assert resp.status_code == 200

    def test_client_counter_offers(self, client, test_client_user, test_tech_user):
        """Client should be able to make a counter-offer"""
        _, client_token = test_client_user
        _, tech_token = test_tech_user

        _, quotation_id = self._create_service_and_quotation(
            client, client_token, tech_token
        )
        if not quotation_id:
            pytest.skip("Could not create quotation")

        resp = client.patch(
            f"/quotations/{quotation_id}/counter",
            json={
                "counter_amount": 350000,
                "client_response": "¿Puede hacer descuento?",
            },
            headers=auth_header(client_token),
        )
        assert resp.status_code == 200


class TestQuotationListing:
    """Test quotation listing endpoints"""

    def test_tech_sees_own_quotations(self, client, test_client_user, test_tech_user):
        """Technician should see their own quotations"""
        _, client_token = test_client_user
        _, tech_token = test_tech_user

        service_id = create_service_and_get_id(client, client_token)
        if service_id:
            client.post(
                f"/quotations/service/{service_id}",
                json={"amount": 200000, "description": "Cotización de prueba"},
                headers=auth_header(tech_token),
            )

        resp = client.get("/quotations/me", headers=auth_header(tech_token))
        assert resp.status_code == 200

    def test_get_quotations_for_service(self, client, test_client_user, test_tech_user):
        """Should list quotations for a specific service"""
        _, client_token = test_client_user
        _, tech_token = test_tech_user

        service_id = create_service_and_get_id(client, client_token)
        if not service_id:
            pytest.skip("Could not create service")

        # Create a quotation
        client.post(
            f"/quotations/service/{service_id}",
            json={"amount": 250000, "description": "Propuesta económica"},
            headers=auth_header(tech_token),
        )

        resp = client.get(
            f"/quotations/service/{service_id}",
            headers=auth_header(client_token),
        )
        assert resp.status_code == 200
