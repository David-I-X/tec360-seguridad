"""
Tests completos y corregidos para endpoints de servicios
Usando dependency_overrides de FastAPI
"""
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from datetime import datetime
from decimal import Decimal
from app.api.services import router
from app.core.security import get_current_user, require_roles
from app.services.service_service import service_service


# ============================================
# HELPERS
# ============================================

def override_get_current_user(user):
    """Helper para overridear get_current_user"""
    async def _override():
        return user
    return _override


def override_require_roles_factory(user):
    """Helper para overridear require_roles"""
    def _wrapper(*roles):
        async def _override():
            if user["role"] not in roles:
                raise HTTPException(status_code=403, detail="Forbidden")
            return user
        return _override
    return _wrapper


# ============================================
# FIXTURES
# ============================================

@pytest.fixture
def app():
    """Crea una app FastAPI de prueba"""
    app = FastAPI()
    app.include_router(router)
    return app


@pytest.fixture
def mock_client_user():
    """Mock de usuario cliente autenticado"""
    return {
        "id": "client-uuid-123",
        "email": "cliente@tec360.com",
        "role": "client",
        "full_name": "Juan Pérez"
    }


@pytest.fixture
def mock_technician_user():
    """Mock de usuario técnico autenticado"""
    return {
        "id": "tech-uuid-456",
        "email": "tecnico@tec360.com",
        "role": "technician",
        "full_name": "Carlos Rodríguez"
    }


@pytest.fixture
def mock_admin_user():
    """Mock de usuario admin autenticado"""
    return {
        "id": "admin-uuid-789",
        "email": "admin@tec360.com",
        "role": "admin",
        "full_name": "Admin Tec360"
    }


@pytest.fixture
def valid_service_payload():
    """Payload válido para crear servicio"""
    return {
        "service_type": "gps_installation",
        "title": "Instalación GPS camión",
        "description": "GPS satelital con alertas",
        "service_address": "Calle 50 #45-30, El Poblado",
        "service_city": "Medellín",
        "service_lat": 6.2442,
        "service_lon": -75.5636,
        "estimated_price": 350000.00,
        "client_notes": "Disponible en la mañana"
    }


@pytest.fixture
def mock_service_response():
    """Mock de servicio creado"""
    return {
        "id": "service-uuid-111",
        "client_id": "client-uuid-123",
        "technician_id": None,
        "service_type": "gps_installation",
        "status": "pending",
        "title": "Instalación GPS camión",
        "description": "GPS satelital con alertas",
        "service_address": "Calle 50 #45-30",
        "service_city": "Medellín",
        "service_lat": 6.2442,
        "service_lon": -75.5636,
        "requested_date": datetime.now().isoformat(),
        "scheduled_date": None,
        "estimated_price": Decimal("350000.00"),
        "final_price": None,
        "client_notes": "Disponible en la mañana",
        "technician_notes": None,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "client": None,
        "technician": None
    }


# ============================================
# TESTS: GET /services/types (público)
# ============================================

class TestGetServiceTypes:
    """Tests para obtener tipos de servicio"""
    
    def test_get_service_types_success(self, app):
        """Test obtener tipos de servicio sin autenticación"""
        client = TestClient(app)
        response = client.get("/services/types")
        
        assert response.status_code == 200
        data = response.json()
        assert "service_types" in data
        assert len(data["service_types"]) == 7  # 7 tipos definidos


# ============================================
# TESTS: POST /services (crear servicio)
# ============================================

class TestCreateService:
    """Tests para crear servicios"""
    
    def test_create_service_as_client_success(
        self,
        app,
        mock_client_user,
        valid_service_payload,
        mock_service_response,
        monkeypatch
    ):
        """Test cliente crea servicio exitosamente"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        async def mock_create(service_data, client_id):
            return mock_service_response
        
        monkeypatch.setattr(service_service, "create_service", mock_create)
        
        client = TestClient(app)
        response = client.post(
            "/services",
            json=valid_service_payload,
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "pending"
        
        app.dependency_overrides.clear()
    
    
    def test_create_service_as_technician_forbidden(
        self,
        app,
        mock_technician_user,
        valid_service_payload
    ):
        """Test técnico NO puede crear servicios"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        client = TestClient(app)
        response = client.post(
            "/services",
            json=valid_service_payload,
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 403
        assert "Solo los clientes" in response.json()["detail"]
        
        app.dependency_overrides.clear()
    
    
    def test_create_service_without_auth(self, app, valid_service_payload):
        """Test crear servicio sin autenticación falla"""
        client = TestClient(app)
        response = client.post("/services", json=valid_service_payload)
        
        assert response.status_code == 403


# ============================================
# TESTS: GET /services (listar servicios)
# ============================================

class TestListServices:
    """Tests para listar servicios"""
    
    def test_list_services_as_client(
        self,
        app,
        mock_client_user,
        monkeypatch
    ):
        """Test cliente lista sus propios servicios"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        async def mock_list(user_id, user_role, status_filter, service_type_filter, page, page_size):
            return {
                "services": [],
                "total": 0,
                "page": 1,
                "page_size": 10,
                "total_pages": 0
            }
        
        monkeypatch.setattr(service_service, "list_services", mock_list)
        
        client = TestClient(app)
        response = client.get(
            "/services",
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "services" in data
        assert "total" in data
        
        app.dependency_overrides.clear()
    
    
    def test_list_services_with_filters(
        self,
        app,
        mock_client_user,
        monkeypatch
    ):
        """Test listar servicios con filtros"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        async def mock_list(user_id, user_role, status_filter, service_type_filter, page, page_size):
            # Verificar que los filtros se pasaron correctamente
            assert status_filter == "pending"
            assert service_type_filter == "gps_installation"
            return {
                "services": [],
                "total": 0,
                "page": 1,
                "page_size": 5,
                "total_pages": 0
            }
        
        monkeypatch.setattr(service_service, "list_services", mock_list)
        
        client = TestClient(app)
        response = client.get(
            "/services?status_filter=pending&service_type=gps_installation&page=1&page_size=5",
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 200
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: GET /services/{id} (detalle)
# ============================================

class TestGetService:
    """Tests para obtener detalle de servicio"""
    
    def test_get_service_success(
        self,
        app,
        mock_client_user,
        mock_service_response,
        monkeypatch
    ):
        """Test obtener servicio exitosamente"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        async def mock_get(service_id, user_id, user_role):
            return mock_service_response
        
        monkeypatch.setattr(service_service, "get_service_by_id", mock_get)
        
        client = TestClient(app)
        response = client.get(
            "/services/service-uuid-111",
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "service-uuid-111"
        
        app.dependency_overrides.clear()
    
    
    def test_get_service_not_found(
        self,
        app,
        mock_client_user,
        monkeypatch
    ):
        """Test servicio no encontrado"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        async def mock_get(service_id, user_id, user_role):
            raise HTTPException(status_code=404, detail="Servicio no encontrado")
        
        monkeypatch.setattr(service_service, "get_service_by_id", mock_get)
        
        client = TestClient(app)
        response = client.get(
            "/services/nonexistent-uuid",
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 404
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: PATCH /services/{id} (actualizar)
# ============================================

class TestUpdateService:
    """Tests para actualizar servicios"""
    
    def test_update_service_status_as_technician(
        self,
        app,
        mock_technician_user,
        mock_service_response,
        monkeypatch
    ):
        """Test técnico actualiza estado del servicio"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        updated_service = mock_service_response.copy()
        updated_service["status"] = "in_progress"
        
        async def mock_update(service_id, service_data, user_id, user_role):
            return updated_service
        
        monkeypatch.setattr(service_service, "update_service", mock_update)
        
        client = TestClient(app)
        response = client.patch(
            "/services/service-uuid-111",
            json={"status": "in_progress", "technician_notes": "Iniciando trabajo"},
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 200
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: POST /services/{id}/assign (asignar técnico)
# ============================================

class TestAssignTechnician:
    """Tests para asignar técnico"""
    
    def test_assign_technician_as_admin(
        self,
        app,
        mock_admin_user,
        mock_service_response,
        monkeypatch
    ):
        """Test admin asigna técnico a servicio"""
        # Override get_current_user en lugar de require_roles
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_admin_user)
        
        assigned_service = mock_service_response.copy()
        assigned_service["technician_id"] = "tech-uuid-456"
        assigned_service["status"] = "assigned"
        
        async def mock_assign(service_id, technician_id, user_role):
            return assigned_service
        
        monkeypatch.setattr(service_service, "assign_technician", mock_assign)
        
        client = TestClient(app)
        response = client.post(
            "/services/service-uuid-111/assign",
            json={"technician_id": "tech-uuid-456"},
            headers={"Authorization": "Bearer admin_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["technician_id"] == "tech-uuid-456"
        assert data["status"] == "assigned"
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: DELETE /services/{id} (cancelar)
# ============================================

class TestCancelService:
    """Tests para cancelar servicios"""
    
    def test_cancel_service_as_client(
        self,
        app,
        mock_client_user,
        monkeypatch
    ):
        """Test cliente cancela su servicio"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        async def mock_update(service_id, service_data, user_id, user_role):
            return None
        
        monkeypatch.setattr(service_service, "update_service", mock_update)
        
        client = TestClient(app)
        response = client.delete(
            "/services/service-uuid-111",
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 204
        
        app.dependency_overrides.clear()
    
    
    def test_cancel_service_as_technician_forbidden(
        self,
        app,
        mock_technician_user
    ):
        """Test técnico NO puede cancelar servicios"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        client = TestClient(app)
        response = client.delete(
            "/services/service-uuid-111",
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 403
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: GET /services/{id}/nearby-technicians
# ============================================

class TestFindNearbyTechnicians:
    """Tests para buscar técnicos cercanos"""
    
    def test_find_nearby_technicians_success(
        self,
        app,
        mock_admin_user,
        monkeypatch
    ):
        """Test buscar técnicos cercanos"""
        # Override get_current_user (admin tiene acceso)
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_admin_user)
        
        async def mock_find(service_id, max_distance_km):
            return [
                {
                    "technician_id": "tech-1",
                    "user_id": "user-1",
                    "full_name": "Técnico 1",
                    "distance_km": 3.5,
                    "average_rating": Decimal("4.8"),
                    "specializations": ["gps_installation"],
                    "is_available": True,
                    "experience_years": 5,
                    "total_services": 45,
                    "is_verified": True,
                    "avatar_url": None
                }
            ]
        
        monkeypatch.setattr(service_service, "find_nearby_technicians", mock_find)
        
        client = TestClient(app)
        response = client.get(
            "/services/service-uuid-111/nearby-technicians?max_distance=20",
            headers={"Authorization": "Bearer admin_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: Validación de datos
# ============================================

class TestServiceValidation:
    """Tests de validación de datos"""
    
    def test_create_service_invalid_service_type(
        self,
        app,
        mock_client_user
    ):
        """Test tipo de servicio inválido"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        payload = {
            "service_type": "invalid_type",
            "title": "Test Service",
            "service_address": "Test",
            "service_lat": 6.2442,
            "service_lon": -75.5636
        }
        
        client = TestClient(app)
        response = client.post(
            "/services",
            json=payload,
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 422
        
        app.dependency_overrides.clear()
    
    
    def test_create_service_invalid_coordinates(
        self,
        app,
        mock_client_user
    ):
        """Test coordenadas fuera de rango"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        payload = {
            "service_type": "gps_installation",
            "title": "Test Service",
            "service_address": "Test",
            "service_lat": 100.0,  # Fuera de rango
            "service_lon": -75.5636
        }
        
        client = TestClient(app)
        response = client.post(
            "/services",
            json=payload,
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 422
        
        app.dependency_overrides.clear()
    
    
    def test_create_service_missing_required_fields(
        self,
        app,
        mock_client_user
    ):
        """Test campos obligatorios faltantes"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        payload = {
            "service_type": "gps_installation"
            # Faltan campos obligatorios
        }
        
        client = TestClient(app)
        response = client.post(
            "/services",
            json=payload,
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 422
        
        app.dependency_overrides.clear()
    
    
    def test_create_service_title_too_short(
        self,
        app,
        mock_client_user
    ):
        """Test título demasiado corto"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        payload = {
            "service_type": "gps_installation",
            "title": "GPS",  # Solo 3 caracteres
            "service_address": "Test",
            "service_lat": 6.2442,
            "service_lon": -75.5636
        }
        
        client = TestClient(app)
        response = client.post(
            "/services",
            json=payload,
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 422
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: Edge cases
# ============================================

class TestServiceEdgeCases:
    """Tests de casos límite"""
    
    def test_cancel_completed_service_fails(
        self,
        app,
        mock_client_user,
        monkeypatch
    ):
        """Test no se puede cancelar servicio completado"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        async def mock_update(service_id, service_data, user_id, user_role):
            raise HTTPException(
                status_code=400,
                detail="No se puede modificar un servicio completado"
            )
        
        monkeypatch.setattr(service_service, "update_service", mock_update)
        
        client = TestClient(app)
        response = client.delete(
            "/services/service-uuid-111",
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 400
        
        app.dependency_overrides.clear()
    
    
    def test_get_service_from_different_client_forbidden(
        self,
        app,
        mock_client_user,
        monkeypatch
    ):
        """Test cliente no puede ver servicio de otro"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        async def mock_get(service_id, user_id, user_role):
            raise HTTPException(
                status_code=403,
                detail="No tienes permiso para ver este servicio"
            )
        
        monkeypatch.setattr(service_service, "get_service_by_id", mock_get)
        
        client = TestClient(app)
        response = client.get(
            "/services/other-service-uuid",
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 403
        
        app.dependency_overrides.clear()
    
    
    def test_assign_unavailable_technician_fails(
        self,
        app,
        mock_admin_user,
        monkeypatch
    ):
        """Test no se puede asignar técnico no disponible"""
        # Override get_current_user
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_admin_user)
        
        async def mock_assign(service_id, technician_id, user_role):
            raise HTTPException(
                status_code=400,
                detail="El técnico no está disponible"
            )
        
        monkeypatch.setattr(service_service, "assign_technician", mock_assign)
        
        client = TestClient(app)
        response = client.post(
            "/services/service-uuid-111/assign",
            json={"technician_id": "tech-uuid-456"},
            headers={"Authorization": "Bearer admin_token"}
        )
        
        assert response.status_code == 400
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: Paginación
# ============================================

class TestServicePagination:
    """Tests de paginación"""
    
    def test_pagination_first_page(
        self,
        app,
        mock_client_user,
        monkeypatch
    ):
        """Test primera página"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        async def mock_list(user_id, user_role, status_filter, service_type_filter, page, page_size):
            # Mock que cumple el schema ServiceListResponse
            return {
                "services": [
                    {
                        "id": f"service-{i}",
                        "service_type": "gps_installation",
                        "status": "pending",
                        "title": f"Servicio {i}",
                        "service_city": "Medellín",
                        "scheduled_date": None,
                        "estimated_price": 350000.00,
                        "created_at": datetime.now().isoformat(),
                        "client_name": "Juan Pérez",
                        "technician_name": None
                    } for i in range(10)
                ],
                "total": 25,
                "page": 1,
                "page_size": 10,
                "total_pages": 3
            }
        
        monkeypatch.setattr(service_service, "list_services", mock_list)
        
        client = TestClient(app)
        response = client.get(
            "/services?page=1&page_size=10",
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["total"] == 25
        
        app.dependency_overrides.clear()
    
    
    def test_pagination_last_page(
        self,
        app,
        mock_client_user,
        monkeypatch
    ):
        """Test última página parcial"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        async def mock_list(user_id, user_role, status_filter, service_type_filter, page, page_size):
            return {
                "services": [
                    {
                        "id": f"service-{i}",
                        "service_type": "gps_installation",
                        "status": "pending",
                        "title": f"Servicio {i}",
                        "service_city": "Medellín",
                        "scheduled_date": None,
                        "estimated_price": 350000.00,
                        "created_at": datetime.now().isoformat(),
                        "client_name": "Juan Pérez",
                        "technician_name": None
                    } for i in range(5)
                ],
                "total": 25,
                "page": 3,
                "page_size": 10,
                "total_pages": 3
            }
        
        monkeypatch.setattr(service_service, "list_services", mock_list)
        
        client = TestClient(app)
        response = client.get(
            "/services?page=3&page_size=10",
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["services"]) == 5
        
        app.dependency_overrides.clear()
    
    
    def test_pagination_invalid_page(
        self,
        app,
        mock_client_user
    ):
        """Test página inválida"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        client = TestClient(app)
        response = client.get(
            "/services?page=0",
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 422
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: Flujo completo
# ============================================

class TestServiceCompleteFlow:
    """Test de flujo completo E2E"""
    
    def test_complete_service_lifecycle(
        self,
        app,
        mock_client_user,
        mock_admin_user,
        mock_technician_user,
        valid_service_payload,
        mock_service_response,
        monkeypatch
    ):
        """Test flujo: crear → asignar → iniciar → completar"""
        
        # PASO 1: Cliente crea servicio
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        async def mock_create(service_data, client_id):
            return mock_service_response
        
        monkeypatch.setattr(service_service, "create_service", mock_create)
        
        client = TestClient(app)
        response = client.post(
            "/services",
            json=valid_service_payload,
            headers={"Authorization": "Bearer client_token"}
        )
        
        assert response.status_code == 201
        service_id = response.json()["id"]
        
        app.dependency_overrides.clear()
        
        # PASO 2: Admin asigna técnico
        async def mock_require_roles_admin():
            return mock_admin_user
        
        app.dependency_overrides[require_roles("admin")] = mock_require_roles_admin
        
        assigned_service = mock_service_response.copy()
        assigned_service["technician_id"] = "tech-uuid-456"
        assigned_service["status"] = "assigned"
        
        async def mock_assign(service_id, technician_id, user_role):
            return assigned_service
        
        monkeypatch.setattr(service_service, "assign_technician", mock_assign)
        
        response = client.post(
            f"/services/{service_id}/assign",
            json={"technician_id": "tech-uuid-456"},
            headers={"Authorization": "Bearer admin_token"}
        )
        
        assert response.status_code == 200
        assert response.json()["status"] == "assigned"
        
        app.dependency_overrides.clear()


# Comando para ejecutar:
# pytest backend/tests/test_services.py -v --cov=app.api.services