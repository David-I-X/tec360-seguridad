"""
Tests para endpoints de Google Maps
Path: backend/tests/test_maps.py
"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.api.maps import router
from app.services.maps_service import maps_service


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
def mock_geocode_response():
    """Mock de respuesta de geocodificación"""
    return {
        "latitude": 6.2442,
        "longitude": -75.5636,
        "formatted_address": "Calle 50 #45-30, El Poblado, Medellín, Antioquia, Colombia",
        "place_id": "ChIJmock123",
        "address_components": {
            "route": "Calle 50",
            "street_number": "45-30",
            "neighborhood": "El Poblado",
            "city": "Medellín",
            "state": "Antioquia",
            "country": "Colombia"
        },
        "location_type": "ROOFTOP"
    }


@pytest.fixture
def mock_reverse_geocode_response():
    """Mock de respuesta de geocodificación inversa"""
    return {
        "formatted_address": "Calle 50 #45-30, Medellín, Antioquia, Colombia",
        "place_id": "ChIJmock123",
        "street": "Calle 50",
        "street_number": "45-30",
        "neighborhood": "El Poblado",
        "city": "Medellín",
        "state": "Antioquia",
        "country": "Colombia",
        "postal_code": "050021",
        "address_components": {}
    }


@pytest.fixture
def mock_distance_response():
    """Mock de respuesta de distancia"""
    return {
        "distance_km": 5.2,
        "distance_meters": 5200,
        "distance_text": "5.2 km",
        "duration_minutes": 12.5,
        "duration_seconds": 750,
        "duration_text": "13 mins",
        "origin_address": "Calle 50, Medellín",
        "destination_address": "Calle 10, Medellín",
        "mode": "driving"
    }


@pytest.fixture
def mock_autocomplete_response():
    """Mock de respuesta de autocompletado"""
    return [
        {
            "description": "Calle 50 #45-30, Medellín, Antioquia, Colombia",
            "place_id": "ChIJmock1",
            "main_text": "Calle 50 #45-30",
            "secondary_text": "Medellín, Antioquia, Colombia",
            "types": ["street_address"]
        },
        {
            "description": "Calle 50 #60-20, Medellín, Antioquia, Colombia",
            "place_id": "ChIJmock2",
            "main_text": "Calle 50 #60-20",
            "secondary_text": "Medellín, Antioquia, Colombia",
            "types": ["street_address"]
        }
    ]


# ============================================
# TESTS: POST /maps/geocode
# ============================================

class TestGeocodeAddress:
    """Tests para geocodificación"""
    
    def test_geocode_success(
        self,
        app,
        mock_geocode_response,
        monkeypatch
    ):
        """Test geocodificar dirección exitosamente"""
        async def mock_geocode(address, city, country):
            return mock_geocode_response
        
        monkeypatch.setattr(maps_service, "geocode_address", mock_geocode)
        
        client = TestClient(app)
        response = client.post(
            "/maps/geocode",
            json={
                "address": "Calle 50 #45-30",
                "city": "Medellín",
                "country": "Colombia"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["latitude"] == 6.2442
        assert data["longitude"] == -75.5636
        assert "Medellín" in data["formatted_address"]
    
    
    def test_geocode_without_city(
        self,
        app,
        mock_geocode_response,
        monkeypatch
    ):
        """Test geocodificar sin especificar ciudad"""
        async def mock_geocode(address, city, country):
            return mock_geocode_response
        
        monkeypatch.setattr(maps_service, "geocode_address", mock_geocode)
        
        client = TestClient(app)
        response = client.post(
            "/maps/geocode",
            json={
                "address": "Calle 50 #45-30",
                "country": "Colombia"
            }
        )
        
        assert response.status_code == 200
    
    
    def test_geocode_address_not_found(
        self,
        app,
        monkeypatch
    ):
        """Test dirección no encontrada"""
        from fastapi import HTTPException
        
        async def mock_geocode(address, city, country):
            raise HTTPException(status_code=404, detail="No se encontraron resultados")
        
        monkeypatch.setattr(maps_service, "geocode_address", mock_geocode)
        
        client = TestClient(app)
        response = client.post(
            "/maps/geocode",
            json={
                "address": "Dirección Inexistente 123",
                "city": "Medellín"
            }
        )
        
        assert response.status_code == 404
    
    
    def test_geocode_invalid_address_too_short(
        self,
        app
    ):
        """Test dirección muy corta (validación Pydantic)"""
        client = TestClient(app)
        response = client.post(
            "/maps/geocode",
            json={
                "address": "Ab",  # Menos de 3 caracteres
                "city": "Medellín"
            }
        )
        
        assert response.status_code == 422


# ============================================
# TESTS: GET /maps/reverse-geocode
# ============================================

class TestReverseGeocode:
    """Tests para geocodificación inversa"""
    
    def test_reverse_geocode_success(
        self,
        app,
        mock_reverse_geocode_response,
        monkeypatch
    ):
        """Test geocodificación inversa exitosa"""
        async def mock_reverse(latitude, longitude):
            return mock_reverse_geocode_response
        
        monkeypatch.setattr(maps_service, "reverse_geocode", mock_reverse)
        
        client = TestClient(app)
        response = client.get(
            "/maps/reverse-geocode?latitude=6.2442&longitude=-75.5636"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "Calle 50" in data["formatted_address"]
        assert data["city"] == "Medellín"
    
    
    def test_reverse_geocode_invalid_latitude(
        self,
        app
    ):
        """Test latitud inválida"""
        client = TestClient(app)
        response = client.get(
            "/maps/reverse-geocode?latitude=100&longitude=-75.5636"
        )
        
        assert response.status_code == 422
    
    
    def test_reverse_geocode_invalid_longitude(
        self,
        app
    ):
        """Test longitud inválida"""
        client = TestClient(app)
        response = client.get(
            "/maps/reverse-geocode?latitude=6.2442&longitude=200"
        )
        
        assert response.status_code == 422


# ============================================
# TESTS: GET /maps/distance
# ============================================

class TestCalculateDistance:
    """Tests para cálculo de distancia"""
    
    def test_calculate_distance_success(
        self,
        app,
        mock_distance_response,
        monkeypatch
    ):
        """Test calcular distancia exitosamente"""
        async def mock_distance(origin_lat, origin_lon, dest_lat, dest_lon, mode):
            return mock_distance_response
        
        monkeypatch.setattr(maps_service, "calculate_distance", mock_distance)
        
        client = TestClient(app)
        response = client.get(
            "/maps/distance?origin_lat=6.2442&origin_lon=-75.5636"
            "&dest_lat=6.2500&dest_lon=-75.5700&mode=driving"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["distance_km"] == 5.2
        assert data["mode"] == "driving"
    
    
    def test_calculate_distance_walking_mode(
        self,
        app,
        mock_distance_response,
        monkeypatch
    ):
        """Test calcular distancia caminando"""
        async def mock_distance(origin_lat, origin_lon, dest_lat, dest_lon, mode):
            assert mode == "walking"
            response = mock_distance_response.copy()
            response["mode"] = "walking"
            response["duration_minutes"] = 25.0
            return response
        
        monkeypatch.setattr(maps_service, "calculate_distance", mock_distance)
        
        client = TestClient(app)
        response = client.get(
            "/maps/distance?origin_lat=6.2442&origin_lon=-75.5636"
            "&dest_lat=6.2500&dest_lon=-75.5700&mode=walking"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["mode"] == "walking"
    
    
    def test_calculate_distance_invalid_mode(
        self,
        app,
        monkeypatch
    ):
        """Test modo de transporte inválido"""
        from fastapi import HTTPException
        
        async def mock_distance(origin_lat, origin_lon, dest_lat, dest_lon, mode):
            raise HTTPException(status_code=400, detail="Modo inválido")
        
        monkeypatch.setattr(maps_service, "calculate_distance", mock_distance)
        
        client = TestClient(app)
        response = client.get(
            "/maps/distance?origin_lat=6.2442&origin_lon=-75.5636"
            "&dest_lat=6.2500&dest_lon=-75.5700&mode=flying"
        )
        
        assert response.status_code == 400


# ============================================
# TESTS: GET /maps/autocomplete
# ============================================

class TestAutocompleteAddress:
    """Tests para autocompletado"""
    
    def test_autocomplete_success(
        self,
        app,
        mock_autocomplete_response,
        monkeypatch
    ):
        """Test autocompletar dirección"""
        async def mock_autocomplete(input_text, city, country):
            return mock_autocomplete_response
        
        monkeypatch.setattr(maps_service, "autocomplete_address", mock_autocomplete)
        
        client = TestClient(app)
        response = client.get(
            "/maps/autocomplete?input_text=Calle 50&city=Medellín"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert "Calle 50" in data[0]["main_text"]
    
    
    def test_autocomplete_no_results(
        self,
        app,
        monkeypatch
    ):
        """Test autocompletar sin resultados"""
        async def mock_autocomplete(input_text, city, country):
            return []
        
        monkeypatch.setattr(maps_service, "autocomplete_address", mock_autocomplete)
        
        client = TestClient(app)
        response = client.get(
            "/maps/autocomplete?input_text=xyz123&city=Medellín"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data == []
    
    
    def test_autocomplete_input_too_short(
        self,
        app
    ):
        """Test input muy corto"""
        client = TestClient(app)
        response = client.get(
            "/maps/autocomplete?input_text=Ca"
        )
        
        assert response.status_code == 422


# ============================================
# TESTS: POST /maps/validate
# ============================================

class TestValidateAddress:
    """Tests para validación de dirección"""
    
    def test_validate_address_valid(
        self,
        app,
        monkeypatch
    ):
        """Test validar dirección válida"""
        async def mock_validate(address, city):
            return {
                "is_valid": True,
                "original_address": address,
                "corrected_address": "Calle 50 #45-30, Medellín, Colombia",
                "latitude": 6.2442,
                "longitude": -75.5636,
                "confidence": "high",
                "place_id": "ChIJmock123"
            }
        
        monkeypatch.setattr(maps_service, "validate_address", mock_validate)
        
        client = TestClient(app)
        response = client.post(
            "/maps/validate",
            json={
                "address": "Calle 50 45 30",
                "city": "Medellín"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_valid"] is True
        assert data["confidence"] == "high"
    
    
    def test_validate_address_invalid(
        self,
        app,
        monkeypatch
    ):
        """Test validar dirección inválida"""
        async def mock_validate(address, city):
            return {
                "is_valid": False,
                "original_address": address,
                "corrected_address": None,
                "reason": "Dirección no encontrada",
                "confidence": None
            }
        
        monkeypatch.setattr(maps_service, "validate_address", mock_validate)
        
        client = TestClient(app)
        response = client.post(
            "/maps/validate",
            json={
                "address": "Dirección Falsa 123",
                "city": "Ciudad Inexistente"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_valid"] is False
        assert "no encontrada" in data["reason"]


# ============================================
# TESTS: GET /maps/distance/haversine
# ============================================

class TestHaversineDistance:
    """Tests para distancia Haversine"""
    
    def test_haversine_distance_success(
        self,
        app
    ):
        """Test calcular distancia Haversine"""
        client = TestClient(app)
        response = client.get(
            "/maps/distance/haversine?lat1=6.2442&lon1=-75.5636"
            "&lat2=6.2500&lon2=-75.5700"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "distance_km" in data
        assert data["method"] == "haversine"
        assert isinstance(data["distance_km"], float)
    
    
    def test_haversine_same_point(
        self,
        app
    ):
        """Test distancia entre el mismo punto"""
        client = TestClient(app)
        response = client.get(
            "/maps/distance/haversine?lat1=6.2442&lon1=-75.5636"
            "&lat2=6.2442&lon2=-75.5636"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["distance_km"] == 0.0


# ============================================
# TESTS: GET /maps/health
# ============================================

class TestMapsHealth:
    """Tests para health check"""
    
    def test_maps_health_unavailable(
        self,
        app,
        monkeypatch
    ):
        """Test API no configurada"""
        # Simular que gmaps es None
        monkeypatch.setattr(maps_service, "gmaps", None)
        
        client = TestClient(app)
        response = client.get("/maps/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "unavailable"
        assert data["api_key_set"] is False
    
    
    def test_maps_health_ok(
        self,
        app,
        mock_geocode_response,
        monkeypatch
    ):
        """Test API funcionando"""
        # Simular que gmaps existe
        monkeypatch.setattr(maps_service, "gmaps", True)
        
        async def mock_geocode(address, country):
            return mock_geocode_response
        
        monkeypatch.setattr(maps_service, "geocode_address", mock_geocode)
        
        client = TestClient(app)
        response = client.get("/maps/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["api_key_set"] is True


# ============================================
# TESTS: Integración con service_service.py
# ============================================

class TestMapsIntegration:
    """Tests de integración con otros servicios"""
    
    def test_geocode_for_service_creation(
        self,
        app,
        mock_geocode_response,
        monkeypatch
    ):
        """Test geocodificar antes de crear servicio"""
        async def mock_geocode(address, city, country):
            return mock_geocode_response
        
        monkeypatch.setattr(maps_service, "geocode_address", mock_geocode)
        
        # Simular flujo: cliente ingresa dirección → geocodificar → crear servicio
        client = TestClient(app)
        
        # 1. Geocodificar dirección
        geocode_response = client.post(
            "/maps/geocode",
            json={
                "address": "Calle 50 #45-30",
                "city": "Medellín"
            }
        )
        
        assert geocode_response.status_code == 200
        geo_data = geocode_response.json()
        
        # 2. Usar coordenadas para crear servicio (se haría en otro endpoint)
        assert geo_data["latitude"] is not None
        assert geo_data["longitude"] is not None


# Comando para ejecutar:
# pytest backend/tests/test_maps.py -v --cov=app.api.maps