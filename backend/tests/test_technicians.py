"""
Tests completos y corregidos para endpoints de técnicos
Usando dependency_overrides de FastAPI
"""
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from datetime import datetime
from decimal import Decimal
from unittest.mock import Mock
from app.api.technicians import router
from app.core.security import get_current_user, require_roles
from app.services.technician_service import technician_service


# ============================================
# HELPERS
# ============================================

def override_get_current_user(user):
    """Helper para overridear get_current_user"""
    async def _override():
        return user
    return _override


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
def mock_technician_user():
    """Mock de usuario técnico autenticado"""
    return {
        "id": "tech-uuid-123",
        "email": "tecnico@tec360.com",
        "role": "technician",
        "full_name": "Carlos Rodríguez"
    }


@pytest.fixture
def mock_client_user():
    """Mock de usuario cliente"""
    return {
        "id": "client-uuid-456",
        "email": "cliente@tec360.com",
        "role": "client",
        "full_name": "Juan Pérez"
    }


@pytest.fixture
def mock_admin_user():
    """Mock de usuario admin"""
    return {
        "id": "admin-uuid-789",
        "email": "admin@tec360.com",
        "role": "admin",
        "full_name": "Admin Tec360"
    }


@pytest.fixture
def valid_technician_payload():
    """Payload válido para crear técnico"""
    return {
        "sena_certification_number": "SENA-2024-001234",
        "specializations": ["gps_installation", "alarm_installation"],
        "experience_years": 5,
        "bio": "Técnico certificado SENA",
        "current_lat": 6.2442,
        "current_lon": -75.5636,
        "service_radius_km": 25
    }


@pytest.fixture
def mock_technician_profile():
    """Mock de perfil de técnico"""
    return {
        "id": "tech-profile-111",
        "user_id": "tech-uuid-123",
        "sena_certification_number": "SENA-2024-001234",
        "specializations": ["gps_installation", "alarm_installation"],
        "experience_years": 5,
        "bio": "Técnico certificado",
        "current_lat": 6.2442,
        "current_lon": -75.5636,
        "service_radius_km": 25,
        "is_available": True,
        "is_verified": True,
        "total_services": 45,
        "average_rating": Decimal("4.8"),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "user": {
            "id": "tech-uuid-123",
            "email": "tecnico@tec360.com",
            "full_name": "Carlos Rodríguez",
            "phone": "+57 301 234 5678",
            "avatar_url": None,
            "city": "Medellín"
        }
    }


# ============================================
# TESTS: GET /technicians (público)
# ============================================

class TestListTechnicians:
    """Tests para listar técnicos"""
    
    def test_list_technicians_public(self, app, monkeypatch):
        """Test listar técnicos sin autenticación"""
        async def mock_list(**kwargs):
            return {
                "technicians": [],
                "total": 0,
                "page": 1,
                "page_size": 10,
                "total_pages": 0
            }
        
        monkeypatch.setattr(technician_service, "list_technicians", mock_list)
        
        client = TestClient(app)
        response = client.get("/technicians")
        
        assert response.status_code == 200
        data = response.json()
        assert "technicians" in data
        assert "total" in data
    
    
    def test_list_technicians_with_filters(self, app, monkeypatch):
        """Test listar con filtros"""
        async def mock_list(specialization, city, min_rating, **kwargs):
            assert specialization == "gps_installation"
            assert city == "Medellín"
            assert min_rating == 4.5
            return {
                "technicians": [],
                "total": 0,
                "page": 1,
                "page_size": 10,
                "total_pages": 0
            }
        
        monkeypatch.setattr(technician_service, "list_technicians", mock_list)
        
        client = TestClient(app)
        response = client.get(
            "/technicians?specialization=gps_installation&city=Medellín&min_rating=4.5"
        )
        
        assert response.status_code == 200


# ============================================
# TESTS: GET /technicians/{user_id}/public
# ============================================

class TestGetPublicProfile:
    """Tests para perfil público"""
    
    def test_get_public_profile_success(
        self,
        app,
        mock_technician_profile,
        monkeypatch
    ):
        """Test obtener perfil público"""
        async def mock_get(user_id, include_user_info):
            # Retornar diccionario directamente
            return mock_technician_profile
        
        monkeypatch.setattr(technician_service, "get_technician_by_user_id", mock_get)
        
        client = TestClient(app)
        response = client.get("/technicians/tech-uuid-123/public")
        
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == "tech-uuid-123"


# ============================================
# TESTS: POST /technicians/me/profile
# ============================================

class TestCreateTechnicianProfile:
    """Tests para crear perfil de técnico"""
    
    def test_create_profile_success(
        self,
        app,
        mock_technician_user,
        valid_technician_payload,
        mock_technician_profile,
        monkeypatch
    ):
        """Test técnico crea su perfil exitosamente"""
        # ✅ CORRECCIÓN: Usar get_current_user como clave
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        async def mock_create(technician_data, user_id):
            return mock_technician_profile
        
        monkeypatch.setattr(technician_service, "create_technician_profile", mock_create)
        
        client = TestClient(app)
        response = client.post(
            "/technicians/me/profile",
            json=valid_technician_payload,
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["user_id"] == "tech-uuid-123"
        
        app.dependency_overrides.clear()
    
    
    def test_create_profile_duplicate(
        self,
        app,
        mock_technician_user,
        valid_technician_payload,
        monkeypatch
    ):
        """Test error al crear perfil duplicado"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        async def mock_create(technician_data, user_id):
            raise HTTPException(
                status_code=400,
                detail="El técnico ya tiene un perfil creado"
            )
        
        monkeypatch.setattr(technician_service, "create_technician_profile", mock_create)
        
        client = TestClient(app)
        response = client.post(
            "/technicians/me/profile",
            json=valid_technician_payload,
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 400
        
        app.dependency_overrides.clear()
    
    
    def test_create_profile_as_non_technician_forbidden(
        self,
        app,
        mock_client_user,
        valid_technician_payload
    ):
        """Test cliente no puede crear perfil de técnico"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        client = TestClient(app)
        response = client.post(
            "/technicians/me/profile",
            json=valid_technician_payload,
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 403
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: GET /technicians/me
# ============================================

class TestGetMyProfile:
    """Tests para obtener perfil propio"""
    
    def test_get_my_profile_success(
        self,
        app,
        mock_technician_user,
        mock_technician_profile,
        monkeypatch
    ):
        """Test obtener perfil propio"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        async def mock_get(user_id, include_user_info):
            return mock_technician_profile
        
        monkeypatch.setattr(technician_service, "get_technician_by_user_id", mock_get)
        
        client = TestClient(app)
        response = client.get(
            "/technicians/me",
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == "tech-uuid-123"
        
        app.dependency_overrides.clear()
    
    
    def test_get_my_profile_not_found(
        self,
        app,
        mock_technician_user,
        monkeypatch
    ):
        """Test perfil no encontrado"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        async def mock_get(user_id, include_user_info):
            raise HTTPException(404, "Perfil no encontrado")
        
        monkeypatch.setattr(technician_service, "get_technician_by_user_id", mock_get)
        
        client = TestClient(app)
        response = client.get(
            "/technicians/me",
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 404
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: PATCH /technicians/me
# ============================================

class TestUpdateMyProfile:
    """Tests para actualizar perfil"""
    
    def test_update_profile_success(
        self,
        app,
        mock_technician_user,
        mock_technician_profile,
        monkeypatch
    ):
        """Test actualizar perfil exitosamente"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        updated_profile = mock_technician_profile.copy()
        updated_profile["bio"] = "Bio actualizada"
        
        async def mock_update(user_id, technician_data):
            return updated_profile
        
        monkeypatch.setattr(technician_service, "update_technician_profile", mock_update)
        
        client = TestClient(app)
        response = client.patch(
            "/technicians/me",
            json={"bio": "Bio actualizada", "service_radius_km": 30},
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["bio"] == "Bio actualizada"
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: PATCH /technicians/me/location
# ============================================

class TestUpdateLocation:
    """Tests para actualizar ubicación"""
    
    def test_update_location_success(
        self,
        app,
        mock_technician_user,
        monkeypatch
    ):
        """Test actualizar ubicación exitosamente"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        async def mock_update_location(user_id, location_data):
            return {
                "message": "Ubicación actualizada correctamente",
                "latitude": 6.2500,
                "longitude": -75.5700
            }
        
        monkeypatch.setattr(technician_service, "update_location", mock_update_location)
        
        client = TestClient(app)
        response = client.patch(
            "/technicians/me/location",
            json={"current_lat": 6.2500, "current_lon": -75.5700},
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["latitude"] == 6.2500
        
        app.dependency_overrides.clear()
    
    
    def test_update_location_invalid_coordinates(
        self,
        app,
        mock_technician_user
    ):
        """Test coordenadas inválidas"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        payload = {
            "current_lat": 100.0,  # Fuera de rango
            "current_lon": -75.5636
        }
        
        client = TestClient(app)
        response = client.patch(
            "/technicians/me/location",
            json=payload,
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 422
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: PATCH /technicians/me/availability
# ============================================

class TestToggleAvailability:
    """Tests para cambiar disponibilidad"""
    
    def test_toggle_availability_to_false(
        self,
        app,
        mock_technician_user,
        monkeypatch
    ):
        """Test cambiar a no disponible"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        async def mock_toggle(user_id, is_available):
            return {
                "message": "Ahora estás no disponible para nuevos servicios",
                "is_available": False
            }
        
        monkeypatch.setattr(technician_service, "toggle_availability", mock_toggle)
        
        client = TestClient(app)
        response = client.patch(
            "/technicians/me/availability",
            json={"is_available": False},
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_available"] is False
        
        app.dependency_overrides.clear()
    
    
    def test_toggle_availability_to_true(
        self,
        app,
        mock_technician_user,
        monkeypatch
    ):
        """Test cambiar a disponible"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        async def mock_toggle(user_id, is_available):
            return {
                "message": "Ahora estás disponible para nuevos servicios",
                "is_available": True
            }
        
        monkeypatch.setattr(technician_service, "toggle_availability", mock_toggle)
        
        client = TestClient(app)
        response = client.patch(
            "/technicians/me/availability",
            json={"is_available": True},
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_available"] is True
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: GET /technicians/me/stats
# ============================================

class TestGetMyStats:
    """Tests para obtener estadísticas"""
    
    def test_get_stats_success(
        self,
        app,
        mock_technician_user,
        monkeypatch
    ):
        """Test obtener estadísticas exitosamente"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        async def mock_stats(user_id):
            return {
                "total_services": 50,
                "completed_services": 45,
                "in_progress_services": 2,
                "cancelled_services": 3,
                "average_rating": Decimal("4.8"),
                "total_earned": Decimal("15000000.00"),
                "services_this_month": 8,
                "services_this_week": 2
            }
        
        monkeypatch.setattr(technician_service, "get_technician_stats", mock_stats)
        
        client = TestClient(app)
        response = client.get(
            "/technicians/me/stats",
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_services"] == 50
        assert data["completed_services"] == 45
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: Admin endpoints
# ============================================

class TestAdminEndpoints:
    """Tests para endpoints de administrador"""
    
    def test_admin_get_technician(
        self,
        app,
        mock_admin_user,
        mock_technician_profile,
        monkeypatch
    ):
        """Test admin obtiene técnico específico"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_admin_user)
        
        async def mock_get(user_id, include_user_info):
            return mock_technician_profile
        
        monkeypatch.setattr(technician_service, "get_technician_by_user_id", mock_get)
        
        client = TestClient(app)
        response = client.get(
            "/technicians/tech-uuid-123",
            headers={"Authorization": "Bearer admin_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == "tech-uuid-123"
        
        app.dependency_overrides.clear()
    
    
    def test_admin_verify_technician(
        self,
        app,
        mock_admin_user,
        monkeypatch
    ):
        """Test admin verifica técnico"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_admin_user)
        
        async def mock_verify(user_id, verified):
            return {
                "user_id": user_id,
                "is_verified": verified,
                "message": f"Técnico {'verificado' if verified else 'desverificado'} exitosamente"
            }
        
        monkeypatch.setattr(technician_service, "verify_technician", mock_verify)
        
        client = TestClient(app)
        response = client.patch(
            "/technicians/tech-uuid-123/verify?verified=true",
            headers={"Authorization": "Bearer admin_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_verified"] is True
        
        app.dependency_overrides.clear()
    
    
    def test_admin_delete_technician(
        self,
        app,
        mock_admin_user,
        monkeypatch
    ):
        """Test admin elimina técnico"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_admin_user)
        
        async def mock_delete(user_id):
            return None
        
        monkeypatch.setattr(technician_service, "delete_technician_profile", mock_delete)
        
        client = TestClient(app)
        response = client.delete(
            "/technicians/tech-uuid-123",
            headers={"Authorization": "Bearer admin_token"}
        )
        
        assert response.status_code == 204
        
        app.dependency_overrides.clear()
    
    
    def test_non_admin_cannot_verify(
        self,
        app,
        mock_technician_user
    ):
        """Test técnico no puede verificar otros técnicos"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        client = TestClient(app)
        response = client.patch(
            "/technicians/tech-uuid-456/verify?verified=true",
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 403
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: Validación de datos
# ============================================

class TestTechnicianValidation:
    """Tests de validación de datos"""
    
    def test_create_profile_invalid_specialization(
        self,
        app,
        mock_technician_user
    ):
        """Test especialización inválida"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        payload = {
            "sena_certification_number": "SENA-2024-001234",
            "specializations": ["invalid_specialization"],
            "experience_years": 5
        }
        
        client = TestClient(app)
        response = client.post(
            "/technicians/me/profile",
            json=payload,
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 422
        
        app.dependency_overrides.clear()
    
    
    def test_create_profile_negative_experience(
        self,
        app,
        mock_technician_user
    ):
        """Test experiencia negativa"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        payload = {
            "sena_certification_number": "SENA-2024-001234",
            "specializations": ["gps_installation"],
            "experience_years": -1
        }
        
        client = TestClient(app)
        response = client.post(
            "/technicians/me/profile",
            json=payload,
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 422
        
        app.dependency_overrides.clear()
    
    
    def test_create_profile_missing_required_fields(
        self,
        app,
        mock_technician_user
    ):
        """Test campos obligatorios faltantes"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        payload = {
            "specializations": ["gps_installation"]
            # Falta sena_certification_number
        }
        
        client = TestClient(app)
        response = client.post(
            "/technicians/me/profile",
            json=payload,
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 422
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: Búsqueda avanzada
# ============================================

class TestSearchEndpoints:
    """Tests para endpoints de búsqueda"""
    
    def test_get_specializations(self, app):
        """Test obtener especializaciones disponibles"""
        client = TestClient(app)
        response = client.get("/technicians/search/specializations")
        
        assert response.status_code == 200
        data = response.json()
        assert "specializations" in data
        assert len(data["specializations"]) > 0
    
    
    def test_get_top_rated(self, app, monkeypatch):
        """Test obtener técnicos mejor calificados"""
        async def mock_list(**kwargs):
            return {
                "technicians": [
                    {
                        "user_id": "tech-1",
                        "full_name": "Técnico 1",
                        "average_rating": Decimal("4.9"),
                        "total_services": 100,
                        "specializations": ["gps_installation"],
                        "is_available": True,
                        "city": "Medellín"
                    }
                ],
                "total": 1,
                "page": 1,
                "page_size": 5,
                "total_pages": 1
            }
        
        monkeypatch.setattr(technician_service, "list_technicians", mock_list)
        
        client = TestClient(app)
        response = client.get("/technicians/top-rated?limit=5")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["technicians"]) > 0


# ============================================
# TESTS: Paginación
# ============================================

class TestTechnicianPagination:
    """Tests de paginación"""
    
    def test_pagination_first_page(self, app, monkeypatch):
        """Test primera página"""
        async def mock_list(**kwargs):
            return {
                "technicians": [{"user_id": f"tech-{i}"} for i in range(10)],
                "total": 25,
                "page": 1,
                "page_size": 10,
                "total_pages": 3
            }
        
        monkeypatch.setattr(technician_service, "list_technicians", mock_list)
        
        client = TestClient(app)
        response = client.get("/technicians?page=1&page_size=10")
        
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["total"] == 25
    
    
    def test_pagination_invalid_page(self, app):
        """Test página inválida"""
        client = TestClient(app)
        response = client.get("/technicians?page=0")
        
        assert response.status_code == 422


# ============================================
# TESTS: Edge cases
# ============================================

class TestTechnicianEdgeCases:
    """Tests de casos límite"""
    
    def test_get_nonexistent_technician_public(self, app, monkeypatch):
        """Test obtener técnico que no existe"""
        async def mock_get(user_id, include_user_info):
            raise HTTPException(404, "Técnico no encontrado")
        
        monkeypatch.setattr(technician_service, "get_technician_by_user_id", mock_get)
        
        client = TestClient(app)
        response = client.get("/technicians/nonexistent-uuid/public")
        
        assert response.status_code == 404
    
    
    def test_update_profile_without_changes(
        self,
        app,
        mock_technician_user,
        mock_technician_profile,
        monkeypatch
    ):
        """Test actualizar perfil sin cambios"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        async def mock_update(user_id, technician_data):
            return mock_technician_profile
        
        monkeypatch.setattr(technician_service, "update_technician_profile", mock_update)
        
        client = TestClient(app)
        response = client.patch(
            "/technicians/me",
            json={},
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 200
        
        app.dependency_overrides.clear()


# Comando para ejecutar:
# pytest backend/tests/test_technicians.py -v --cov=app.api.technicians