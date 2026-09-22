"""
Tests para el sistema de pagos — Pagos digitales (Sandbox), pagos en efectivo y datos DIAN
"""
from datetime import timedelta
from uuid import uuid4

import pytest
from app.core.auth_utils import create_access_token
from app.models.service import Service
from app.models.user import User
from tests.conftest import auth_header


@pytest.fixture()
def test_admin_user(session):
    """Fixture to create an admin user and return (user, token)"""
    user = User(
        id=uuid4(),
        email=f"testadmin_{uuid4().hex[:8]}@test.com",
        phone=f"+57320{uuid4().int % 10000000:07d}",
        full_name="Test Admin",
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


def create_service(client, token: str) -> str:
    """Helper: create a service and return its ID"""
    resp = client.post(
        "/services",
        json={
            "service_type": "gps_installation",
            "title": "Instalación GPS Tracker",
            "description": "Servicio de instalación para prueba de pagos",
            "service_address": "Carrera 43A #5A-113, Medellín",
            "service_lat": 6.2085,
            "service_lon": -75.5678,
            "scheduled_date": "2026-03-25T14:00:00",
            "estimated_price": 250000,
        },
        headers=auth_header(token),
    )
    assert resp.status_code in (200, 201)
    return resp.json()["id"]


class TestDigitalPaymentSandbox:
    """Pruebas del flujo de pasarela de pagos digital simulada (Sandbox)"""

    def test_create_digital_intent_success(self, client, test_client_user):
        """Cliente crea un intent de pago digital (PSE/Nequi/Tarjeta)"""
        _, client_token = test_client_user
        service_id = create_service(client, client_token)

        resp = client.post(
            "/payments/digital/intent",
            json={
                "service_id": service_id,
                "amount": 250000,
                "payment_method": "pse",
                "bank_name": "Bancolombia",
            },
            headers=auth_header(client_token),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert "transaction_id" in data
        assert data["transaction_id"].startswith("sandbox-")
        assert data["status"] == "processing"
        assert data["payment_method"] == "pse"
        assert data["amount"] == 250000

    def test_confirm_digital_payment_success(self, client, test_client_user, session):
        """Cliente confirma el pago digital y el servicio queda como pagado"""
        _, client_token = test_client_user
        service_id = create_service(client, client_token)

        # 1. Crear intent
        intent_resp = client.post(
            "/payments/digital/intent",
            json={
                "service_id": service_id,
                "amount": 250000,
                "payment_method": "card",
                "card_last_four": "4242",
            },
            headers=auth_header(client_token),
        )
        assert intent_resp.status_code == 201
        tx_id = intent_resp.json()["transaction_id"]

        # 2. Confirmar transacción
        confirm_resp = client.post(
            "/payments/digital/confirm",
            json={"transaction_id": tx_id},
            headers=auth_header(client_token),
        )
        assert confirm_resp.status_code == 200
        data = confirm_resp.json()
        assert data["status"] == "approved"
        assert data["service_id"] == service_id
        assert data["provider_reference"] == tx_id
        assert data["payment_method"] == "card"

        # 3. Verificar estado en el servicio
        svc = session.get(Service, data["service_id"])
        assert svc.payment_status == "paid"

    def test_unauthorized_client_cannot_create_intent(
        self, client, test_client_user, test_tech_user
    ):
        """Un usuario que no sea el cliente del servicio no puede crear intent"""
        _, client_token = test_client_user
        _, tech_token = test_tech_user
        service_id = create_service(client, client_token)

        resp = client.post(
            "/payments/digital/intent",
            json={
                "service_id": service_id,
                "amount": 250000,
                "payment_method": "nequi",
            },
            headers=auth_header(tech_token),
        )
        assert resp.status_code == 403

    def test_cannot_confirm_invalid_transaction(self, client, test_client_user):
        """Intentar confirmar una transacción inexistente retorna 404"""
        _, client_token = test_client_user
        resp = client.post(
            "/payments/digital/confirm",
            json={"transaction_id": "sandbox-nonexistent-1234"},
            headers=auth_header(client_token),
        )
        assert resp.status_code == 404

    def test_get_service_payment_info(self, client, test_client_user):
        """Obtener la información de pago de un servicio"""
        _, client_token = test_client_user
        service_id = create_service(client, client_token)

        # Crear y confirmar
        intent_resp = client.post(
            "/payments/digital/intent",
            json={
                "service_id": service_id,
                "amount": 180000,
                "payment_method": "daviplata",
            },
            headers=auth_header(client_token),
        )
        tx_id = intent_resp.json()["transaction_id"]
        client.post(
            "/payments/digital/confirm",
            json={"transaction_id": tx_id},
            headers=auth_header(client_token),
        )

        # Consultar pago por service_id
        resp = client.get(
            f"/payments/service/{service_id}",
            headers=auth_header(client_token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["service_id"] == service_id
        assert data["amount"] == 180000
        assert data["status"] == "approved"
        # Campos DIAN presentes en schema (pueden ser None si no hay SAS configurado en test)
        assert "invoice_number" in data
        assert "cufe" in data
        assert "qr_url" in data
        assert "pdf_url" in data


class TestCashPaymentFlow:
    """Pruebas del flujo de pago en efectivo"""

    def test_assigned_technician_confirms_cash_payment(
        self, client, test_client_user, test_tech_user, session
    ):
        """El técnico asignado puede confirmar el pago en efectivo"""
        _, client_token = test_client_user
        tech_user, tech_token = test_tech_user
        service_id = create_service(client, client_token)

        # Asignar técnico al servicio
        svc = session.get(Service, service_id)
        svc.technician_id = tech_user.id
        session.add(svc)
        session.commit()

        resp = client.post(
            "/payments/cash/confirm",
            json={
                "service_id": service_id,
                "amount": 200000,
                "notes": "Pago recibido en efectivo completo",
            },
            headers=auth_header(tech_token),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "confirmed_by_technician"
        assert data["payment_method"] == "cash"
        assert data["amount"] == 200000

    def test_unassigned_technician_cannot_confirm_cash(
        self, client, test_client_user, test_tech_user
    ):
        """Un técnico no asignado al servicio no puede confirmar el pago"""
        _, client_token = test_client_user
        _, tech_token = test_tech_user
        service_id = create_service(client, client_token)

        resp = client.post(
            "/payments/cash/confirm",
            json={
                "service_id": service_id,
                "amount": 200000,
            },
            headers=auth_header(tech_token),
        )
        assert resp.status_code == 403

    def test_admin_validates_cash_payment(
        self, client, test_client_user, test_tech_user, test_admin_user, session
    ):
        """El administrador puede validar un pago en efectivo confirmado por el técnico"""
        _, client_token = test_client_user
        tech_user, tech_token = test_tech_user
        _, admin_token = test_admin_user
        service_id = create_service(client, client_token)

        svc = session.get(Service, service_id)
        svc.technician_id = tech_user.id
        session.add(svc)
        session.commit()

        cash_resp = client.post(
            "/payments/cash/confirm",
            json={"service_id": service_id, "amount": 300000},
            headers=auth_header(tech_token),
        )
        payment_id = cash_resp.json()["id"]

        validate_resp = client.put(
            f"/payments/{payment_id}/validate",
            headers=auth_header(admin_token),
        )
        assert validate_resp.status_code == 200
        assert validate_resp.json()["status"] == "confirmed_by_admin"
