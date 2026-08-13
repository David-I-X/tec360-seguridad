"""
Tests completos para endpoints de calificaciones
Path: backend/tests/test_ratings.py
"""
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from datetime import datetime
from decimal import Decimal
from app.api.ratings import router
from app.core.security import get_current_user, require_roles
from app.services.rating_service import rating_service


# ============================================
# HELPERS
# ============================================

from app.core.auth_utils import create_access_token
def get_token(user):
    return create_access_token(subject=str(user["id"]), extra_claims={"role": user.get("role", "client")})


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
def mock_client_user():
    """Mock de usuario cliente"""
    return {
        "id": "22222222-2222-2222-2222-222222222222",
        "email": "cliente@tec360.com",
        "role": "client",
        "full_name": "Juan Pérez"
    }


@pytest.fixture
def mock_technician_user():
    """Mock de usuario técnico"""
    return {
        "id": "11111111-1111-1111-1111-111111111111",
        "email": "tecnico@tec360.com",
        "role": "technician",
        "full_name": "Carlos Rodríguez"
    }


@pytest.fixture
def mock_admin_user():
    """Mock de usuario admin"""
    return {
        "id": "33333333-3333-3333-3333-333333333333",
        "email": "admin@tec360.com",
        "role": "admin",
        "full_name": "Admin Tec360"
    }


@pytest.fixture
def valid_rating_payload():
    """Payload válido para crear calificación"""
    return {
        "rating": 5,
        "comment": "Excelente servicio, muy profesional y puntual. Lo recomiendo 100%."
    }


@pytest.fixture
def mock_rating_response():
    """Mock de calificación creada"""
    return {
        "id": "66666666-6666-6666-6666-666666666666",
        "service_id": "44444444-4444-4444-4444-444444444444",
        "client_id": "22222222-2222-2222-2222-222222222222",
        "technician_id": "11111111-1111-1111-1111-111111111111",
        "rating": 5,
        "comment": "Excelente servicio",
        "created_at": datetime.now().isoformat(),
        "client_name": "Juan Pérez",
        "client_avatar_url": None,
        "service_type": "gps_installation",
        "service_title": "Instalación GPS"
    }


# ============================================
# TESTS: POST /ratings/services/{service_id}
# ============================================

class TestCreateRating:
    """Tests para crear calificaciones"""
    
    def test_create_rating_success(
        self,
        app,
        mock_client_user,
        valid_rating_payload,
        mock_rating_response,
        monkeypatch
    ):
        """Test cliente crea calificación exitosamente"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        async def mock_create(*args, **kwargs):
            return mock_rating_response
        
        monkeypatch.setattr(rating_service, "create_rating", mock_create)
        
        client = TestClient(app)
        response = client.post(
            "/ratings/services/44444444-4444-4444-4444-444444444444",
            json=valid_rating_payload,
            headers={"Authorization": f"Bearer {get_token(mock_client_user)}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["rating"] == 5
        assert data["service_id"] == "44444444-4444-4444-4444-444444444444"
        
        app.dependency_overrides.clear()
    
    
    def test_create_rating_service_not_completed(
        self,
        app,
        mock_client_user,
        valid_rating_payload,
        monkeypatch
    ):
        """Test no se puede calificar servicio no completado"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        async def mock_create(*args, **kwargs):
            raise HTTPException(
                status_code=400,
                detail="Solo puedes calificar servicios completados. Estado actual: in_progress"
            )
        
        monkeypatch.setattr(rating_service, "create_rating", mock_create)
        
        client = TestClient(app)
        response = client.post(
            "/ratings/services/44444444-4444-4444-4444-444444444444",
            json=valid_rating_payload,
            headers={"Authorization": f"Bearer {get_token(mock_client_user)}"}
        )
        
        assert response.status_code == 400
        assert "completados" in response.json()["detail"]
        
        app.dependency_overrides.clear()
    
    
    def test_create_rating_already_rated(
        self,
        app,
        mock_client_user,
        valid_rating_payload,
        monkeypatch
    ):
        """Test no se puede calificar servicio ya calificado"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        async def mock_create(*args, **kwargs):
            raise HTTPException(
                status_code=400,
                detail="Este servicio ya ha sido calificado"
            )
        
        monkeypatch.setattr(rating_service, "create_rating", mock_create)
        
        client = TestClient(app)
        response = client.post(
            "/ratings/services/44444444-4444-4444-4444-444444444444",
            json=valid_rating_payload,
            headers={"Authorization": f"Bearer {get_token(mock_client_user)}"}
        )
        
        assert response.status_code == 400
        assert "ya ha sido calificado" in response.json()["detail"]
        
        app.dependency_overrides.clear()
    
    
    def test_create_rating_not_owner(
        self,
        app,
        mock_client_user,
        valid_rating_payload,
        monkeypatch
    ):
        """Test no se puede calificar servicio de otro cliente"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        async def mock_create(*args, **kwargs):
            raise HTTPException(
                status_code=403,
                detail="No tienes permiso para calificar este servicio"
            )
        
        monkeypatch.setattr(rating_service, "create_rating", mock_create)
        
        client = TestClient(app)
        response = client.post(
            "/ratings/services/44444444-9999-9999-9999-444444444444",
            json=valid_rating_payload,
            headers={"Authorization": f"Bearer {get_token(mock_client_user)}"}
        )
        
        assert response.status_code == 403
        
        app.dependency_overrides.clear()
    
    
    def test_create_rating_as_technician_forbidden(
        self,
        app,
        mock_technician_user,
        valid_rating_payload
    ):
        """Test técnico no puede crear calificaciones"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        client = TestClient(app)
        response = client.post(
            "/ratings/services/44444444-4444-4444-4444-444444444444",
            json=valid_rating_payload,
            headers={"Authorization": f"Bearer {get_token(mock_technician_user)}"}
        )
        
        assert response.status_code == 403
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: GET /ratings/services/{service_id}/can-rate
# ============================================

class TestCanRateService:
    """Tests para verificar si se puede calificar"""
    
    def test_can_rate_service_yes(
        self,
        app,
        mock_client_user,
        monkeypatch
    ):
        """Test servicio puede ser calificado"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        async def mock_can_rate(*args, **kwargs):
            return {
                "can_rate": True,
                "reason": None,
                "service_status": "completed"
            }
        
        monkeypatch.setattr(rating_service, "can_rate_service", mock_can_rate)
        
        client = TestClient(app)
        response = client.get(
            "/ratings/services/44444444-4444-4444-4444-444444444444/can-rate",
            headers={"Authorization": f"Bearer {get_token(mock_client_user)}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["can_rate"] is True
        
        app.dependency_overrides.clear()
    
    
    def test_can_rate_service_not_completed(
        self,
        app,
        mock_client_user,
        monkeypatch
    ):
        """Test servicio no completado"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        async def mock_can_rate(*args, **kwargs):
            return {
                "can_rate": False,
                "reason": "El servicio debe estar completado (estado actual: in_progress)",
                "service_status": "in_progress"
            }
        
        monkeypatch.setattr(rating_service, "can_rate_service", mock_can_rate)
        
        client = TestClient(app)
        response = client.get(
            "/ratings/services/44444444-4444-4444-4444-444444444444/can-rate",
            headers={"Authorization": f"Bearer {get_token(mock_client_user)}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["can_rate"] is False
        assert "completado" in data["reason"]
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: GET /ratings/technicians/{technician_id}
# ============================================

class TestGetTechnicianRatings:
    """Tests para obtener calificaciones de técnico"""
    
    def test_get_technician_ratings_public(
        self,
        app,
        monkeypatch
    ):
        """Test obtener calificaciones sin autenticación"""
        async def mock_get_ratings(*args, **kwargs):
            return {
                "ratings": [
                    {
                        "id": "rating-1",
                        "rating": 5,
                        "comment": "Excelente",
                        "created_at": datetime.now().isoformat(),
                        "client_name": "Juan Pérez",
                        "client_avatar_url": None,
                        "service_type": "gps_installation"
                    }
                ],
                "total": 1,
                "page": 1,
                "page_size": 10,
                "total_pages": 1,
                "average_rating": Decimal("4.8")
            }
        
        monkeypatch.setattr(rating_service, "get_technician_ratings", mock_get_ratings)
        
        client = TestClient(app)
        response = client.get("/ratings/technicians/11111111-1111-1111-1111-111111111111")
        
        assert response.status_code == 200
        data = response.json()
        assert "ratings" in data
        assert "average_rating" in data
    
    
    def test_get_technician_ratings_pagination(
        self,
        app,
        monkeypatch
    ):
        """Test paginación de calificaciones"""
        async def mock_get_ratings(*args, **kwargs):
            pass
            pass
            return {
                "ratings": [],
                "total": 25,
                "page": 2,
                "page_size": 5,
                "total_pages": 5,
                "average_rating": Decimal("4.5")
            }
        
        monkeypatch.setattr(rating_service, "get_technician_ratings", mock_get_ratings)
        
        client = TestClient(app)
        response = client.get("/ratings/technicians/11111111-1111-1111-1111-111111111111?page=2&page_size=5")
        
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 2
        assert data["page_size"] == 5


# ============================================
# TESTS: GET /ratings/technicians/{technician_id}/stats
# ============================================

class TestGetTechnicianStats:
    """Tests para estadísticas de técnico"""
    
    def test_get_technician_stats_public(
        self,
        app,
        monkeypatch
    ):
        """Test obtener estadísticas sin autenticación"""
        async def mock_get_stats(*args, **kwargs):
            return {
                "average_rating": Decimal("4.8"),
                "total_ratings": 45,
                "rating_distribution": {
                    "5": 35,
                    "4": 8,
                    "3": 2,
                    "2": 0,
                    "1": 0
                },
                "five_stars": 35,
                "four_stars": 8,
                "three_stars": 2,
                "two_stars": 0,
                "one_star": 0
            }
        
        monkeypatch.setattr(rating_service, "get_technician_rating_stats", mock_get_stats)
        
        client = TestClient(app)
        response = client.get("/ratings/technicians/11111111-1111-1111-1111-111111111111/stats")
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_ratings"] == 45
        assert data["five_stars"] == 35
    
    
    def test_get_technician_stats_no_ratings(
        self,
        app,
        monkeypatch
    ):
        """Test técnico sin calificaciones"""
        async def mock_get_stats(*args, **kwargs):
            return {
                "average_rating": Decimal("0.0"),
                "total_ratings": 0,
                "rating_distribution": {
                    "5": 0,
                    "4": 0,
                    "3": 0,
                    "2": 0,
                    "1": 0
                },
                "five_stars": 0,
                "four_stars": 0,
                "three_stars": 0,
                "two_stars": 0,
                "one_star": 0
            }
        
        monkeypatch.setattr(rating_service, "get_technician_rating_stats", mock_get_stats)
        
        client = TestClient(app)
        response = client.get("/ratings/technicians/11111111-2222-3333-4444-555555555555/stats")
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_ratings"] == 0


# ============================================
# TESTS: GET /ratings/services/{service_id}
# ============================================

class TestGetServiceRating:
    """Tests para obtener calificación de servicio"""
    
    def test_get_service_rating_as_client(
        self,
        app,
        mock_client_user,
        mock_rating_response,
        monkeypatch
    ):
        """Test cliente obtiene calificación de su servicio"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        async def mock_get(*args, **kwargs):
            return {
                "service_id": kwargs.get("service_id", "44444444-4444-4444-4444-444444444444"),
                "has_rating": True,
                "rating": mock_rating_response
            }
        
        monkeypatch.setattr(rating_service, "get_service_rating", mock_get)
        
        client = TestClient(app)
        response = client.get(
            "/ratings/services/44444444-4444-4444-4444-444444444444",
            headers={"Authorization": f"Bearer {get_token(mock_client_user)}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["has_rating"] is True
        
        app.dependency_overrides.clear()
    
    
    def test_get_service_rating_not_found(
        self,
        app,
        mock_client_user,
        monkeypatch
    ):
        """Test servicio sin calificación"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        async def mock_get(*args, **kwargs):
            return {
                "service_id": kwargs.get("service_id", "44444444-4444-4444-4444-444444444444"),
                "has_rating": False,
                "rating": None
            }
        
        monkeypatch.setattr(rating_service, "get_service_rating", mock_get)
        
        client = TestClient(app)
        response = client.get(
            "/ratings/services/44444444-4444-4444-4444-444444444444",
            headers={"Authorization": f"Bearer {get_token(mock_client_user)}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["has_rating"] is False
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: GET /ratings/me (técnico)
# ============================================

class TestGetMyRatings:
    """Tests para técnico obtiene sus calificaciones"""
    
    def test_get_my_ratings_as_technician(
        self,
        app,
        mock_technician_user,
        monkeypatch
    ):
        """Test técnico obtiene sus calificaciones"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        async def mock_get_ratings(*args, **kwargs):
            return {
                "ratings": [],
                "total": 0,
                "page": 1,
                "page_size": 10,
                "total_pages": 0,
                "average_rating": None
            }
        
        monkeypatch.setattr(rating_service, "get_technician_ratings", mock_get_ratings)
        
        client = TestClient(app)
        response = client.get(
            "/ratings/me",
            headers={"Authorization": f"Bearer {get_token(mock_technician_user)}"}
        )
        
        assert response.status_code == 200
        
        app.dependency_overrides.clear()
    
    
    def test_get_my_ratings_as_client_forbidden(
        self,
        app,
        mock_client_user
    ):
        """Test cliente no puede usar endpoint de técnico"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        client = TestClient(app)
        response = client.get(
            "/ratings/me",
            headers={"Authorization": f"Bearer {get_token(mock_client_user)}"}
        )
        
        assert response.status_code == 403
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: GET /ratings/me/stats (técnico)
# ============================================

class TestGetMyStats:
    """Tests para técnico obtiene sus estadísticas"""
    
    def test_get_my_stats_as_technician(
        self,
        app,
        mock_technician_user,
        monkeypatch
    ):
        """Test técnico obtiene sus estadísticas"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        async def mock_get_stats(*args, **kwargs):
            return {
                "average_rating": Decimal("4.8"),
                "total_ratings": 45,
                "rating_distribution": {"5": 35, "4": 8, "3": 2, "2": 0, "1": 0},
                "five_stars": 35,
                "four_stars": 8,
                "three_stars": 2,
                "two_stars": 0,
                "one_star": 0
            }
        
        monkeypatch.setattr(rating_service, "get_technician_rating_stats", mock_get_stats)
        
        client = TestClient(app)
        response = client.get(
            "/ratings/me/stats",
            headers={"Authorization": f"Bearer {get_token(mock_technician_user)}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_ratings"] == 45
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: Validación de datos
# ============================================

class TestRatingValidation:
    """Tests de validación de datos"""
    
    def test_create_rating_invalid_score(
        self,
        app,
        mock_client_user
    ):
        """Test calificación fuera de rango"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        payload = {
            "rating": 6,  # Fuera de rango 1-5
            "comment": "Esto debería fallar"
        }
        
        client = TestClient(app)
        response = client.post(
            "/ratings/services/44444444-4444-4444-4444-444444444444",
            json=payload,
            headers={"Authorization": f"Bearer {get_token(mock_client_user)}"}
        )
        
        assert response.status_code == 422
        
        app.dependency_overrides.clear()
    
    
    def test_create_rating_comment_too_short(
        self,
        app,
        mock_client_user
    ):
        """Test comentario muy corto"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        payload = {
            "rating": 5,
            "comment": "Muy bien"  # Menos de 10 caracteres
        }
        
        client = TestClient(app)
        response = client.post(
            "/ratings/services/44444444-4444-4444-4444-444444444444",
            json=payload,
            headers={"Authorization": f"Bearer {get_token(mock_client_user)}"}
        )
        
        assert response.status_code == 422
        
        app.dependency_overrides.clear()
    
    
    def test_create_rating_without_comment_ok(
        self,
        app,
        mock_client_user,
        mock_rating_response,
        monkeypatch
    ):
        """Test calificación sin comentario es válida"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        async def mock_create(*args, **kwargs):
            return mock_rating_response
        
        monkeypatch.setattr(rating_service, "create_rating", mock_create)
        
        payload = {
            "rating": 5
            # Sin comentario
        }
        
        client = TestClient(app)
        response = client.post(
            "/ratings/services/44444444-4444-4444-4444-444444444444",
            json=payload,
            headers={"Authorization": f"Bearer {get_token(mock_client_user)}"}
        )
        
        assert response.status_code == 201
        
        app.dependency_overrides.clear()


# Comando para ejecutar:
# pytest backend/tests/test_ratings.py -v --cov=app.api.ratings