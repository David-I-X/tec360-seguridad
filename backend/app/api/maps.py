"""
Endpoints de FastAPI para servicios de Google Maps
Path: backend/app/api/maps.py
"""
from fastapi import APIRouter, Query
from typing import List
from app.services.maps_service import maps_service
from app.schemas.maps import (
    GeocodeRequest,
    GeocodeResponse,
    ReverseGeocodeResponse,
    DistanceResponse,
    AutocompleteSuggestion,
    ValidateAddressResponse,
    HaversineDistanceResponse,
    MapsHealthResponse
)


router = APIRouter(prefix="/maps", tags=["maps"])


# ============================================
# ENDPOINTS
# ============================================

@router.post(
    "/geocode",
    response_model=GeocodeResponse,
    summary="Geocodificar dirección",
    description="""
    Convierte una dirección de texto en coordenadas geográficas (lat/lon).
    
    **Uso típico:**
    - Cuando el usuario ingresa una dirección manualmente
    - Para validar direcciones antes de guardarlas
    - Para obtener coordenadas exactas de una ubicación
    
    **No requiere autenticación** - Endpoint público
    """
)
async def geocode_address(
    request: GeocodeRequest
):
    """
    Geocodificar una dirección
    
    Retorna coordenadas y dirección formateada
    """
    return await maps_service.geocode_address(
        address=request.address,
        city=request.city,
        country=request.country
    )


@router.get(
    "/reverse-geocode",
    response_model=ReverseGeocodeResponse,
    summary="Geocodificación inversa",
    description="""
    Convierte coordenadas (lat/lon) en una dirección legible.
    
    **Uso típico:**
    - Cuando el usuario comparte su ubicación GPS
    - Para mostrar direcciones en un mapa
    - Para obtener la dirección de un técnico en tiempo real
    
    **No requiere autenticación** - Endpoint público
    """
)
async def reverse_geocode(
    latitude: float = Query(..., ge=-90, le=90, description="Latitud"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitud")
):
    """
    Obtener dirección desde coordenadas
    """
    return await maps_service.reverse_geocode(
        latitude=latitude,
        longitude=longitude
    )


@router.get(
    "/distance",
    response_model=DistanceResponse,
    summary="Calcular distancia entre dos puntos",
    description="""
    Calcula la distancia real por carretera y el tiempo estimado
    entre dos ubicaciones.
    
    **Modos disponibles:**
    - `driving`: En auto (default)
    - `walking`: Caminando
    - `bicycling`: En bicicleta
    - `transit`: Transporte público
    
    **Uso típico:**
    - Para calcular cuánto tardará un técnico en llegar
    - Para mostrar distancia entre cliente y técnico
    - Para filtrar técnicos por cercanía
    
    **No requiere autenticación** - Endpoint público
    """
)
async def calculate_distance(
    origin_lat: float = Query(..., description="Latitud origen"),
    origin_lon: float = Query(..., description="Longitud origen"),
    dest_lat: float = Query(..., description="Latitud destino"),
    dest_lon: float = Query(..., description="Longitud destino"),
    mode: str = Query("driving", description="Modo de transporte")
):
    """
    Calcular distancia y tiempo entre dos puntos
    """
    return await maps_service.calculate_distance(
        origin_lat=origin_lat,
        origin_lon=origin_lon,
        dest_lat=dest_lat,
        dest_lon=dest_lon,
        mode=mode
    )


@router.get(
    "/autocomplete",
    response_model=List[AutocompleteSuggestion],
    summary="Autocompletar direcciones",
    description="""
    Proporciona sugerencias de direcciones mientras el usuario escribe.
    
    **Uso típico:**
    - Campo de dirección con autocompletado
    - Búsqueda predictiva de ubicaciones
    - Mejorar UX al ingresar direcciones
    
    **Ejemplo de uso:**
    ```
    Usuario escribe: "Calle 50"
    → Retorna: ["Calle 50 #45-30", "Calle 50 #60-20", ...]
    ```
    
    **No requiere autenticación** - Endpoint público
    """
)
async def autocomplete_address(
    input_text: str = Query(..., min_length=3, description="Texto a autocompletar"),
    city: str = Query(None, description="Ciudad para filtrar"),
    country: str = Query("co", description="Código de país (ISO)")
):
    """
    Autocompletar dirección
    """
    suggestions = await maps_service.autocomplete_address(
        input_text=input_text,
        city=city,
        country=country
    )
    
    # Retornar lista directamente (el schema ya espera List[AutocompleteSuggestion])
    return suggestions


@router.post(
    "/validate",
    response_model=ValidateAddressResponse,
    summary="Validar dirección",
    description="""
    Valida si una dirección existe y está bien formateada.
    
    **Retorna:**
    - Si la dirección es válida o no
    - Dirección corregida (formato estándar de Google)
    - Nivel de confianza (high, medium, low)
    - Coordenadas si es válida
    
    **Uso típico:**
    - Antes de guardar una dirección en la base de datos
    - Para corregir direcciones mal escritas
    - Para validar formularios
    
    **No requiere autenticación** - Endpoint público
    """
)
async def validate_address(
    request: GeocodeRequest
):
    """
    Validar si una dirección existe
    """
    return await maps_service.validate_address(
        address=request.address,
        city=request.city
    )


@router.get(
    "/distance/haversine",
    response_model=HaversineDistanceResponse,
    summary="Calcular distancia en línea recta",
    description="""
    Calcula la distancia en línea recta entre dos puntos
    usando la fórmula Haversine.
    
    **Ventajas:**
    - No consume cuota de Google Maps API
    - Cálculo instantáneo
    - Útil para filtros rápidos
    
    **Desventajas:**
    - No considera carreteras ni obstáculos
    - Solo distancia "a vuelo de pájaro"
    
    **Uso típico:**
    - Para pre-filtrar técnicos antes de cálculo exacto
    - Para mostrar estimaciones rápidas
    - Para búsquedas por radio
    
    **No requiere autenticación** - Endpoint público
    """
)
async def calculate_haversine_distance(
    lat1: float = Query(..., description="Latitud punto 1"),
    lon1: float = Query(..., description="Longitud punto 1"),
    lat2: float = Query(..., description="Latitud punto 2"),
    lon2: float = Query(..., description="Longitud punto 2")
):
    """
    Calcular distancia en línea recta (no consume API)
    """
    distance = maps_service.calculate_distance_haversine(lat1, lon1, lat2, lon2)
    
    return HaversineDistanceResponse(
        distance_km=distance,
        method="haversine",
        note="Distancia en línea recta, no por carretera"
    )


# ============================================
# ENDPOINT DE SALUD
# ============================================

@router.get(
    "/health",
    response_model=MapsHealthResponse,
    summary="Verificar estado de Google Maps API",
    description="Verifica si la API key de Google Maps está configurada correctamente"
)
async def maps_health():
    """
    Verificar configuración de Google Maps
    """
    if not maps_service.gmaps:
        return MapsHealthResponse(
            status="unavailable",
            message="Google Maps API key no configurada",
            api_key_set=False,
            test_geocode=None
        )
    
    try:
        # Hacer un geocode simple para verificar que funciona
        test_result = await maps_service.geocode_address(
            "Medellín, Colombia",
            country="Colombia"
        )
        
        return MapsHealthResponse(
            status="healthy",
            message="Google Maps API funcionando correctamente",
            api_key_set=True,
            test_geocode=test_result["formatted_address"]
        )
    except Exception as e:
        return MapsHealthResponse(
            status="error",
            message=f"Error al conectar con Google Maps: {str(e)}",
            api_key_set=True,
            test_geocode=None
        )


# ============================================
# RESUMEN DE ENDPOINTS
# ============================================

"""
ENDPOINTS DISPONIBLES:

📍 GEOCODIFICACIÓN:
  POST   /maps/geocode              - Dirección → Coordenadas
  GET    /maps/reverse-geocode      - Coordenadas → Dirección

📏 DISTANCIAS:
  GET    /maps/distance             - Distancia real por carretera
  GET    /maps/distance/haversine   - Distancia en línea recta (rápido)

🔍 BÚSQUEDA:
  GET    /maps/autocomplete         - Autocompletar direcciones

✅ VALIDACIÓN:
  POST   /maps/validate             - Validar dirección

🏥 SALUD:
  GET    /maps/health               - Estado de Google Maps API

TOTAL: 7 endpoints

NOTA: Todos los endpoints son públicos (no requieren autenticación)
"""