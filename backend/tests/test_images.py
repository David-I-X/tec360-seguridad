"""
Tests para endpoints de imágenes
Path: backend/tests/test_images.py
"""
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from datetime import datetime
from io import BytesIO
from app.api.images import router
from app.core.security import get_current_user
from app.services.image_service import image_service


# ============================================
# HELPERS
# ============================================

def override_get_current_user(user):
    """Helper para overridear get_current_user"""
    async def _override():
        return user
    return _override


def create_mock_upload_file(filename="test.jpg", content_type="image/jpeg", size=1024):
    """Crea un UploadFile mock"""
    content = b"fake image content" * (size // 18)  # Aproximar tamaño
    file = BytesIO(content)
    
    class MockUploadFile:
        def __init__(self):
            self.filename = filename
            self.content_type = content_type
            self.file = file
        
        async def read(self):
            return file.read()
    
    return MockUploadFile()


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
    """Mock de usuario técnico"""
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
def mock_image_response():
    """Mock de imagen subida"""
    return {
        "id": "image-uuid-111",
        "service_id": "service-uuid-222",
        "uploaded_by": "tech-uuid-123",
        "image_type": "after",
        "description": "GPS instalado correctamente",
        "file_path": "services/service-uuid-222/after_1234567890.jpg",
        "file_size": 2048576,
        "mime_type": "image/jpeg",
        "public_url": "https://storage.supabase.co/object/public/service-images/...",
        "created_at": datetime.now().isoformat(),
        "uploader_name": "Carlos Rodríguez"
    }


@pytest.fixture
def mock_image_list():
    """Mock de lista de imágenes"""
    return {
        "images": [
            {
                "id": "image-1",
                "image_type": "before",
                "description": "Estado inicial",
                "public_url": "https://storage.supabase.co/...",
                "file_size": 1024000,
                "created_at": datetime.now().isoformat(),
                "uploader_name": "Carlos Rodríguez"
            },
            {
                "id": "image-2",
                "image_type": "after",
                "description": "Trabajo completado",
                "public_url": "https://storage.supabase.co/...",
                "file_size": 2048000,
                "created_at": datetime.now().isoformat(),
                "uploader_name": "Carlos Rodríguez"
            }
        ],
        "total": 2,
        "service_id": "service-uuid-222"
    }


# ============================================
# TESTS: POST /images/upload
# ============================================

class TestUploadImage:
    """Tests para subir imágenes"""
    
    def test_upload_image_success(
        self,
        app,
        mock_technician_user,
        mock_image_response,
        monkeypatch
    ):
        """Test técnico sube imagen exitosamente"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        async def mock_upload(file, metadata, user_id, user_role):
            return mock_image_response
        
        monkeypatch.setattr(image_service, "upload_image", mock_upload)
        
        client = TestClient(app)
        
        # Crear archivo mock
        files = {"file": ("test.jpg", b"fake image content", "image/jpeg")}
        data = {
            "service_id": "service-uuid-222",
            "image_type": "after",
            "description": "GPS instalado"
        }
        
        response = client.post(
            "/images/upload",
            files=files,
            data=data,
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 201
        result = response.json()
        assert result["success"] is True
        assert result["image"]["id"] == "image-uuid-111"
        
        app.dependency_overrides.clear()
    
    
    def test_upload_image_service_not_found(
        self,
        app,
        mock_technician_user,
        monkeypatch
    ):
        """Test servicio no encontrado"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        async def mock_upload(file, metadata, user_id, user_role):
            raise HTTPException(status_code=404, detail="Servicio no encontrado")
        
        monkeypatch.setattr(image_service, "upload_image", mock_upload)
        
        client = TestClient(app)
        
        files = {"file": ("test.jpg", b"fake image", "image/jpeg")}
        data = {
            "service_id": "nonexistent-uuid",
            "image_type": "after"
        }
        
        response = client.post(
            "/images/upload",
            files=files,
            data=data,
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 404
        
        app.dependency_overrides.clear()
    
    
    def test_upload_image_forbidden(
        self,
        app,
        mock_client_user,
        monkeypatch
    ):
        """Test cliente no puede subir imagen de servicio de otro"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        async def mock_upload(file, metadata, user_id, user_role):
            raise HTTPException(
                status_code=403,
                detail="No tienes permiso para subir imágenes a este servicio"
            )
        
        monkeypatch.setattr(image_service, "upload_image", mock_upload)
        
        client = TestClient(app)
        
        files = {"file": ("test.jpg", b"fake image", "image/jpeg")}
        data = {
            "service_id": "other-service-uuid",
            "image_type": "after"
        }
        
        response = client.post(
            "/images/upload",
            files=files,
            data=data,
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 403
        
        app.dependency_overrides.clear()
    
    
    def test_upload_image_invalid_file_type(
        self,
        app,
        mock_technician_user,
        monkeypatch
    ):
        """Test tipo de archivo inválido"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        async def mock_upload(file, metadata, user_id, user_role):
            raise HTTPException(
                status_code=400,
                detail="Tipo de archivo no permitido"
            )
        
        monkeypatch.setattr(image_service, "upload_image", mock_upload)
        
        client = TestClient(app)
        
        files = {"file": ("test.pdf", b"fake pdf", "application/pdf")}
        data = {
            "service_id": "service-uuid-222",
            "image_type": "after"
        }
        
        response = client.post(
            "/images/upload",
            files=files,
            data=data,
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 400
        
        app.dependency_overrides.clear()
    
    
    def test_upload_image_file_too_large(
        self,
        app,
        mock_technician_user,
        monkeypatch
    ):
        """Test archivo muy grande"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        async def mock_upload(file, metadata, user_id, user_role):
            raise HTTPException(
                status_code=400,
                detail="Archivo muy grande. Máximo: 5MB"
            )
        
        monkeypatch.setattr(image_service, "upload_image", mock_upload)
        
        client = TestClient(app)
        
        # Simular archivo grande
        large_content = b"x" * (6 * 1024 * 1024)  # 6MB
        files = {"file": ("large.jpg", large_content, "image/jpeg")}
        data = {
            "service_id": "service-uuid-222",
            "image_type": "after"
        }
        
        response = client.post(
            "/images/upload",
            files=files,
            data=data,
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 400
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: GET /images/services/{service_id}
# ============================================

class TestListServiceImages:
    """Tests para listar imágenes"""
    
    def test_list_images_success(
        self,
        app,
        mock_technician_user,
        mock_image_list,
        monkeypatch
    ):
        """Test listar imágenes exitosamente"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        async def mock_list(service_id, user_id, user_role):
            return mock_image_list
        
        monkeypatch.setattr(image_service, "list_service_images", mock_list)
        
        client = TestClient(app)
        response = client.get(
            "/images/services/service-uuid-222",
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert len(data["images"]) == 2
        
        app.dependency_overrides.clear()
    
    
    def test_list_images_empty(
        self,
        app,
        mock_technician_user,
        monkeypatch
    ):
        """Test servicio sin imágenes"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        async def mock_list(service_id, user_id, user_role):
            return {
                "images": [],
                "total": 0,
                "service_id": service_id
            }
        
        monkeypatch.setattr(image_service, "list_service_images", mock_list)
        
        client = TestClient(app)
        response = client.get(
            "/images/services/service-uuid-222",
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        
        app.dependency_overrides.clear()
    
    
    def test_list_images_forbidden(
        self,
        app,
        mock_client_user,
        monkeypatch
    ):
        """Test cliente no puede ver imágenes de otro servicio"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        async def mock_list(service_id, user_id, user_role):
            raise HTTPException(
                status_code=403,
                detail="No tienes permiso para ver imágenes de este servicio"
            )
        
        monkeypatch.setattr(image_service, "list_service_images", mock_list)
        
        client = TestClient(app)
        response = client.get(
            "/images/services/other-service-uuid",
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 403
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: GET /images/{image_id}
# ============================================

class TestGetImage:
    """Tests para obtener imagen por ID"""
    
    def test_get_image_success(
        self,
        app,
        mock_technician_user,
        mock_image_response,
        monkeypatch
    ):
        """Test obtener imagen exitosamente"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        async def mock_get(image_id, user_id, user_role):
            return mock_image_response
        
        monkeypatch.setattr(image_service, "get_image_by_id", mock_get)
        
        client = TestClient(app)
        response = client.get(
            "/images/image-uuid-111",
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "image-uuid-111"
        
        app.dependency_overrides.clear()
    
    
    def test_get_image_not_found(
        self,
        app,
        mock_technician_user,
        monkeypatch
    ):
        """Test imagen no encontrada"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        async def mock_get(image_id, user_id, user_role):
            raise HTTPException(status_code=404, detail="Imagen no encontrada")
        
        monkeypatch.setattr(image_service, "get_image_by_id", mock_get)
        
        client = TestClient(app)
        response = client.get(
            "/images/nonexistent-uuid",
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 404
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: DELETE /images/{image_id}
# ============================================

class TestDeleteImage:
    """Tests para eliminar imágenes"""
    
    def test_delete_image_success(
        self,
        app,
        mock_technician_user,
        monkeypatch
    ):
        """Test eliminar imagen exitosamente"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        async def mock_delete(image_id, user_id, user_role):
            return {
                "success": True,
                "message": "Imagen eliminada exitosamente",
                "image_id": image_id
            }
        
        monkeypatch.setattr(image_service, "delete_image", mock_delete)
        
        client = TestClient(app)
        response = client.delete(
            "/images/image-uuid-111",
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        app.dependency_overrides.clear()
    
    
    def test_delete_image_forbidden(
        self,
        app,
        mock_client_user,
        monkeypatch
    ):
        """Test no puede eliminar imagen de otro usuario"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_client_user)
        
        async def mock_delete(image_id, user_id, user_role):
            raise HTTPException(
                status_code=403,
                detail="Solo el usuario que subió la imagen puede eliminarla"
            )
        
        monkeypatch.setattr(image_service, "delete_image", mock_delete)
        
        client = TestClient(app)
        response = client.delete(
            "/images/image-uuid-111",
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 403
        
        app.dependency_overrides.clear()
    
    
    def test_delete_image_as_admin(
        self,
        app,
        mock_admin_user,
        monkeypatch
    ):
        """Test admin puede eliminar cualquier imagen"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_admin_user)
        
        async def mock_delete(image_id, user_id, user_role):
            return {
                "success": True,
                "message": "Imagen eliminada exitosamente",
                "image_id": image_id
            }
        
        monkeypatch.setattr(image_service, "delete_image", mock_delete)
        
        client = TestClient(app)
        response = client.delete(
            "/images/image-uuid-111",
            headers={"Authorization": "Bearer admin_token"}
        )
        
        assert response.status_code == 200
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: GET /images/stats/storage
# ============================================

class TestStorageStats:
    """Tests para estadísticas de almacenamiento"""
    
    def test_get_storage_stats_technician(
        self,
        app,
        mock_technician_user,
        monkeypatch
    ):
        """Test técnico obtiene sus estadísticas"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        async def mock_stats(user_id, user_role):
            return {
                "total_images": 10,
                "total_size_mb": 15.5,
                "images_by_type": {
                    "before": 5,
                    "after": 5
                }
            }
        
        monkeypatch.setattr(image_service, "get_storage_stats", mock_stats)
        
        client = TestClient(app)
        response = client.get(
            "/images/stats/storage",
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_images"] == 10
        
        app.dependency_overrides.clear()
    
    
    def test_get_storage_stats_admin(
        self,
        app,
        mock_admin_user,
        monkeypatch
    ):
        """Test admin obtiene estadísticas globales"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_admin_user)
        
        async def mock_stats(user_id, user_role):
            return {
                "total_images": 100,
                "total_size_mb": 250.8,
                "images_by_type": {
                    "before": 45,
                    "after": 45,
                    "during": 10
                }
            }
        
        monkeypatch.setattr(image_service, "get_storage_stats", mock_stats)
        
        client = TestClient(app)
        response = client.get(
            "/images/stats/storage",
            headers={"Authorization": "Bearer admin_token"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_images"] == 100
        
        app.dependency_overrides.clear()


# ============================================
# TESTS: Validaciones
# ============================================

class TestImageValidation:
    """Tests de validación"""
    
    def test_upload_without_auth(
        self,
        app
    ):
        """Test subir sin autenticación"""
        client = TestClient(app)
        
        files = {"file": ("test.jpg", b"fake", "image/jpeg")}
        data = {"service_id": "service-uuid", "image_type": "after"}
        
        response = client.post("/images/upload", files=files, data=data)
        
        assert response.status_code == 403
    
    
    def test_invalid_image_type(
        self,
        app,
        mock_technician_user
    ):
        """Test tipo de imagen inválido"""
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_technician_user)
        
        client = TestClient(app)
        
        files = {"file": ("test.jpg", b"fake", "image/jpeg")}
        data = {
            "service_id": "service-uuid",
            "image_type": "invalid_type"  # No es before/after/during/other
        }
        
        response = client.post(
            "/images/upload",
            files=files,
            data=data,
            headers={"Authorization": "Bearer fake_token"}
        )
        
        assert response.status_code == 422
        
        app.dependency_overrides.clear()


# Comando para ejecutar:
# pytest backend/tests/test_images.py -v --cov=app.api.images