"""
Schemas de Pydantic para Google Maps
Path: backend/app/schemas/maps.py
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict


# ============================================
# SCHEMAS DE REQUEST (INPUT)
# ============================================

class GeocodeRequest(BaseModel):
    """Request para geocodificar dirección"""
    address: str = Field(
        ..., 
        min_length=3, 
        max_length=500,
        description="Dirección a geocodificar"
    )
    city: Optional[str] = Field(
        None, 
        max_length=100,
        description="Ciudad (opcional, mejora precisión)"
    )
    country: str = Field(
        "Colombia", 
        max_length=100,
        description="País"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "address": "Calle 50 #45-30",
                "city": "Medellín",
                "country": "Colombia"
            }
        }


class DistanceRequest(BaseModel):
    """Request para calcular distancia"""
    origin_lat: float = Field(..., ge=-90, le=90, description="Latitud origen")
    origin_lon: float = Field(..., ge=-180, le=180, description="Longitud origen")
    dest_lat: float = Field(..., ge=-90, le=90, description="Latitud destino")
    dest_lon: float = Field(..., ge=-180, le=180, description="Longitud destino")
    mode: str = Field(
        "driving", 
        description="Modo de transporte: driving, walking, bicycling, transit"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "origin_lat": 6.2442,
                "origin_lon": -75.5636,
                "dest_lat": 6.2500,
                "dest_lon": -75.5700,
                "mode": "driving"
            }
        }


class AutocompleteRequest(BaseModel):
    """Request para autocompletar dirección"""
    input_text: str = Field(
        ..., 
        min_length=3, 
        max_length=200,
        description="Texto a autocompletar"
    )
    city: Optional[str] = Field(
        None, 
        max_length=100,
        description="Ciudad para filtrar"
    )
    country: str = Field(
        "co", 
        description="Código de país ISO (ej: co para Colombia)"
    )
    radius: int = Field(
        50000, 
        ge=1000, 
        le=100000,
        description="Radio de búsqueda en metros"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "input_text": "Calle 50",
                "city": "Medellín",
                "country": "co",
                "radius": 50000
            }
        }


# ============================================
# SCHEMAS DE RESPONSE (OUTPUT)
# ============================================

class GeocodeResponse(BaseModel):
    """Response de geocodificación"""
    latitude: float = Field(..., description="Latitud")
    longitude: float = Field(..., description="Longitud")
    formatted_address: str = Field(..., description="Dirección formateada")
    place_id: str = Field(..., description="ID único de Google Places")
    address_components: Dict = Field(..., description="Componentes de la dirección")
    location_type: Optional[str] = Field(
        None, 
        description="Tipo de ubicación (ROOFTOP, RANGE_INTERPOLATED, etc.)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
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
        }


class ReverseGeocodeResponse(BaseModel):
    """Response de geocodificación inversa"""
    formatted_address: str = Field(..., description="Dirección completa formateada")
    place_id: str = Field(..., description="ID único de Google Places")
    street: Optional[str] = Field(None, description="Nombre de la calle")
    street_number: Optional[str] = Field(None, description="Número de la calle")
    neighborhood: Optional[str] = Field(None, description="Barrio")
    city: Optional[str] = Field(None, description="Ciudad")
    state: Optional[str] = Field(None, description="Departamento/Estado")
    country: Optional[str] = Field(None, description="País")
    postal_code: Optional[str] = Field(None, description="Código postal")
    address_components: Optional[Dict] = Field(None, description="Componentes adicionales")
    
    class Config:
        json_schema_extra = {
            "example": {
                "formatted_address": "Calle 50 #45-30, Medellín, Antioquia, Colombia",
                "place_id": "ChIJmock123",
                "street": "Calle 50",
                "street_number": "45-30",
                "neighborhood": "El Poblado",
                "city": "Medellín",
                "state": "Antioquia",
                "country": "Colombia",
                "postal_code": "050021"
            }
        }


class DistanceResponse(BaseModel):
    """Response de cálculo de distancia"""
    distance_km: float = Field(..., description="Distancia en kilómetros")
    distance_meters: int = Field(..., description="Distancia en metros")
    distance_text: str = Field(..., description="Distancia en texto legible")
    duration_minutes: float = Field(..., description="Duración en minutos")
    duration_seconds: int = Field(..., description="Duración en segundos")
    duration_text: str = Field(..., description="Duración en texto legible")
    origin_address: str = Field(..., description="Dirección de origen")
    destination_address: str = Field(..., description="Dirección de destino")
    mode: str = Field(..., description="Modo de transporte usado")
    
    class Config:
        json_schema_extra = {
            "example": {
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
        }


class AutocompleteSuggestion(BaseModel):
    """Sugerencia individual de autocompletado"""
    description: str = Field(..., description="Descripción completa de la dirección")
    place_id: str = Field(..., description="ID único de Google Places")
    main_text: str = Field(..., description="Texto principal (dirección)")
    secondary_text: str = Field(..., description="Texto secundario (ciudad, estado)")
    types: List[str] = Field(..., description="Tipos de lugar")
    
    class Config:
        json_schema_extra = {
            "example": {
                "description": "Calle 50 #45-30, Medellín, Antioquia, Colombia",
                "place_id": "ChIJmock1",
                "main_text": "Calle 50 #45-30",
                "secondary_text": "Medellín, Antioquia, Colombia",
                "types": ["street_address"]
            }
        }


class AutocompleteResponse(BaseModel):
    """Response de autocompletado (lista de sugerencias)"""
    suggestions: List[AutocompleteSuggestion] = Field(..., description="Lista de sugerencias")
    count: int = Field(..., description="Número de sugerencias retornadas")
    
    class Config:
        json_schema_extra = {
            "example": {
                "suggestions": [
                    {
                        "description": "Calle 50 #45-30, Medellín, Antioquia, Colombia",
                        "place_id": "ChIJmock1",
                        "main_text": "Calle 50 #45-30",
                        "secondary_text": "Medellín, Antioquia, Colombia",
                        "types": ["street_address"]
                    }
                ],
                "count": 1
            }
        }


class ValidateAddressResponse(BaseModel):
    """Response de validación de dirección"""
    is_valid: bool = Field(..., description="Si la dirección es válida")
    original_address: str = Field(..., description="Dirección original enviada")
    corrected_address: Optional[str] = Field(
        None, 
        description="Dirección corregida (formato estándar)"
    )
    latitude: Optional[float] = Field(None, description="Latitud (si es válida)")
    longitude: Optional[float] = Field(None, description="Longitud (si es válida)")
    confidence: Optional[str] = Field(
        None, 
        description="Nivel de confianza: high, medium, low"
    )
    place_id: Optional[str] = Field(None, description="ID de Google Places")
    reason: Optional[str] = Field(
        None, 
        description="Razón por la que es inválida (si aplica)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "is_valid": True,
                "original_address": "Calle 50 45 30",
                "corrected_address": "Calle 50 #45-30, Medellín, Colombia",
                "latitude": 6.2442,
                "longitude": -75.5636,
                "confidence": "high",
                "place_id": "ChIJmock123",
                "reason": None
            }
        }


class HaversineDistanceResponse(BaseModel):
    """Response de distancia Haversine (sin API)"""
    distance_km: float = Field(..., description="Distancia en kilómetros")
    method: str = Field("haversine", description="Método de cálculo")
    note: str = Field(
        "Distancia en línea recta, no por carretera",
        description="Nota sobre el método"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "distance_km": 4.5,
                "method": "haversine",
                "note": "Distancia en línea recta, no por carretera"
            }
        }


class MapsHealthResponse(BaseModel):
    """Response de health check"""
    status: str = Field(..., description="Estado: healthy, unavailable, error")
    message: str = Field(..., description="Mensaje descriptivo")
    api_key_set: bool = Field(..., description="Si la API key está configurada")
    test_geocode: Optional[str] = Field(
        None, 
        description="Resultado de test de geocoding"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "message": "Google Maps API funcionando correctamente",
                "api_key_set": True,
                "test_geocode": "Medellín, Antioquia, Colombia"
            }
        }


# ============================================
# SCHEMAS DE COORDENADAS (HELPERS)
# ============================================

class Coordinates(BaseModel):
    """Coordenadas geográficas"""
    latitude: float = Field(..., ge=-90, le=90, description="Latitud")
    longitude: float = Field(..., ge=-180, le=180, description="Longitud")
    
    class Config:
        json_schema_extra = {
            "example": {
                "latitude": 6.2442,
                "longitude": -75.5636
            }
        }


class AddressComponents(BaseModel):
    """Componentes de una dirección"""
    route: Optional[str] = Field(None, description="Nombre de la calle")
    street_number: Optional[str] = Field(None, description="Número")
    neighborhood: Optional[str] = Field(None, description="Barrio")
    city: Optional[str] = Field(None, description="Ciudad")
    state: Optional[str] = Field(None, description="Departamento")
    country: Optional[str] = Field(None, description="País")
    postal_code: Optional[str] = Field(None, description="Código postal")
    
    class Config:
        json_schema_extra = {
            "example": {
                "route": "Calle 50",
                "street_number": "45-30",
                "neighborhood": "El Poblado",
                "city": "Medellín",
                "state": "Antioquia",
                "country": "Colombia",
                "postal_code": "050021"
            }
        }