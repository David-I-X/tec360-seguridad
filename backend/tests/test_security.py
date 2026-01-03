"""
Tests para el módulo de seguridad (security.py)
"""
import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
from app.core.security import (
    verify_supabase_token,
    get_current_user,
    require_roles
)

# Mock de respuesta exitosa de Supabase
MOCK_VALID_USER = {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "test@example.com",
    "role": "client",
    "user_metadata": {"role": "client", "name": "Test User"},
    "created_at": "2024-01-01T00:00:00Z"
}

MOCK_ADMIN_USER = {
    "id": "admin-uuid-1234",
    "email": "admin@tec360.com",
    "role": "admin",
    "user_metadata": {"role": "admin", "name": "Admin User"},
    "created_at": "2024-01-01T00:00:00Z"
}


@pytest.fixture
def app():
    """Crea una app FastAPI de prueba"""
    app = FastAPI()
    
    @app.get("/public")
    async def public():
        return {"message": "public"}
    
    @app.get("/protected")
    async def protected(user: dict = Depends(get_current_user)):
        return {"user_id": user["id"], "email": user["email"]}
    
    @app.get("/admin")
    async def admin_only(user: dict = Depends(require_roles("admin"))):
        return {"message": "admin area", "email": user["email"]}
    
    return app


@pytest.fixture
def client(app):
    """Cliente de prueba"""
    return TestClient(app)


class TestVerifySupabaseToken:
    """Tests para verify_supabase_token"""
    
    @pytest.mark.asyncio
    async def test_valid_token(self):
        """Test con token válido - debe retornar usuario"""
        with patch('app.core.security.supabase_client') as mock_supabase:
            # Mock de respuesta exitosa
            mock_response = Mock()
            mock_response.user = Mock(
                id="user-123",
                email="user@example.com",
                user_metadata={"role": "client"},
                created_at="2024-01-01T00:00:00Z"
            )
            mock_supabase.auth.get_user.return_value = mock_response
            
            # Ejecutar
            result = await verify_supabase_token("valid_token_xyz")
            
            # Verificar
            assert result["id"] == "user-123"
            assert result["email"] == "user@example.com"
            assert result["role"] == "client"
            mock_supabase.auth.get_user.assert_called_once_with("valid_token_xyz")
    
    
    @pytest.mark.asyncio
    async def test_invalid_token(self):
        """Test con token inválido - debe lanzar HTTPException 401"""
        with patch('app.core.security.supabase_client') as mock_supabase:
            # Mock de respuesta sin usuario (token inválido)
            mock_response = Mock()
            mock_response.user = None
            mock_supabase.auth.get_user.return_value = mock_response
            
            # Debe lanzar excepción
            from fastapi import HTTPException
            with pytest.raises(HTTPException) as exc_info:
                await verify_supabase_token("invalid_token")
            
            assert exc_info.value.status_code == 401
            assert "inválido o expirado" in exc_info.value.detail
    
    
    @pytest.mark.asyncio
    async def test_token_without_role(self):
        """Test usuario sin rol definido - debe asignar 'client' por defecto"""
        with patch('app.core.security.supabase_client') as mock_supabase:
            mock_response = Mock()
            mock_response.user = Mock(
                id="user-456",
                email="norole@example.com",
                user_metadata={},  # Sin rol
                created_at="2024-01-01T00:00:00Z"
            )
            mock_supabase.auth.get_user.return_value = mock_response
            
            result = await verify_supabase_token("token_sin_rol")
            
            # Debe asignar "client" por defecto
            assert result["role"] == "client"
    
    
    @pytest.mark.asyncio
    async def test_supabase_connection_error(self):
        """Test error de conexión con Supabase - debe lanzar 401"""
        with patch('app.core.security.supabase_client') as mock_supabase:
            # Simular error de red
            mock_supabase.auth.get_user.side_effect = Exception("Connection timeout")
            
            from fastapi import HTTPException
            with pytest.raises(HTTPException) as exc_info:
                await verify_supabase_token("any_token")
            
            assert exc_info.value.status_code == 401
            assert "Error al verificar token" in exc_info.value.detail


class TestProtectedEndpoints:
    """Tests de endpoints protegidos usando el cliente de prueba"""
    
    def test_public_endpoint_no_auth(self, client):
        """Endpoint público - accesible sin token"""
        response = client.get("/public")
        assert response.status_code == 200
        assert response.json() == {"message": "public"}
    
    
    def test_protected_endpoint_without_token(self, client):
        """Endpoint protegido sin token - debe retornar 403"""
        response = client.get("/protected")
        assert response.status_code == 403  # HTTPBearer retorna 403 si no hay header
    
    
    def test_protected_endpoint_with_valid_token(self, client):
        """Endpoint protegido con token válido - debe permitir acceso"""
        with patch('app.core.security.supabase_client') as mock_supabase:
            # Mock usuario válido
            mock_response = Mock()
            mock_response.user = Mock(
                id="user-789",
                email="valid@example.com",
                user_metadata={"role": "client"},
                created_at="2024-01-01T00:00:00Z"
            )
            mock_supabase.auth.get_user.return_value = mock_response
            
            # Hacer request con token
            response = client.get(
                "/protected",
                headers={"Authorization": "Bearer valid_token_abc123"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["user_id"] == "user-789"
            assert data["email"] == "valid@example.com"
    
    
    def test_protected_endpoint_with_invalid_token(self, client):
        """Endpoint protegido con token inválido - debe retornar 401"""
        with patch('app.core.security.supabase_client') as mock_supabase:
            # Mock token inválido
            mock_response = Mock()
            mock_response.user = None
            mock_supabase.auth.get_user.return_value = mock_response
            
            response = client.get(
                "/protected",
                headers={"Authorization": "Bearer invalid_token"}
            )
            
            assert response.status_code == 401


class TestRoleBasedAccess:
    """Tests de control de acceso basado en roles"""
    
    def test_admin_endpoint_with_admin_user(self, client):
        """Usuario admin puede acceder a ruta /admin"""
        with patch('app.core.security.supabase_client') as mock_supabase:
            mock_response = Mock()
            mock_response.user = Mock(
                id="admin-123",
                email="admin@tec360.com",
                user_metadata={"role": "admin"},
                created_at="2024-01-01T00:00:00Z"
            )
            mock_supabase.auth.get_user.return_value = mock_response
            
            response = client.get(
                "/admin",
                headers={"Authorization": "Bearer admin_token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "admin area"
    
    
    def test_admin_endpoint_with_client_user(self, client):
        """Usuario client NO puede acceder a ruta /admin - debe retornar 403"""
        with patch('app.core.security.supabase_client') as mock_supabase:
            mock_response = Mock()
            mock_response.user = Mock(
                id="client-456",
                email="client@example.com",
                user_metadata={"role": "client"},
                created_at="2024-01-01T00:00:00Z"
            )
            mock_supabase.auth.get_user.return_value = mock_response
            
            response = client.get(
                "/admin",
                headers={"Authorization": "Bearer client_token"}
            )
            
            assert response.status_code == 403
            data = response.json()
            assert "Acceso denegado" in data["detail"]


# Comando para ejecutar los tests:
# pytest backend/tests/test_security.py -v