"""
Service Layer para integración con Google Maps Platform
Path: backend/app/services/maps_service.py

Requiere:
pip install googlemaps
"""
from typing import Optional, List, Dict, Any, Tuple
from fastapi import HTTPException, status
import googlemaps
import os
from datetime import datetime
import math


class MapsService:
    """
    Servicio para integración con Google Maps Platform
    
    APIs utilizadas:
    - Geocoding API: Convertir direcciones a coordenadas
    - Reverse Geocoding: Convertir coordenadas a direcciones
    - Distance Matrix API: Calcular distancias y tiempos
    - Places API (Autocomplete): Sugerencias de direcciones
    """
    
    def __init__(self):
        """
        Inicializa el cliente de Google Maps
        
        Requiere variable de entorno GOOGLE_API_KEY
        """
        self.api_key = os.getenv("GOOGLE_API_KEY")
        
        if not self.api_key:
            # En desarrollo, permitir continuar sin API key
            # En producción, esto debería ser un error crítico
            print("⚠️ WARNING: GOOGLE_API_KEY no está configurada")
            self.gmaps = None
        else:
            try:
                self.gmaps = googlemaps.Client(key=self.api_key)
            except Exception as e:
                print(f"❌ Error al inicializar Google Maps: {e}")
                self.gmaps = None
    
    
    def _check_client(self):
        """Verifica que el cliente de Google Maps esté inicializado"""
        if not self.gmaps:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Servicio de mapas no disponible. API key no configurada."
            )
    
    
    async def geocode_address(
        self,
        address: str,
        city: Optional[str] = None,
        country: str = "Colombia"
    ) -> Dict[str, Any]:
        """
        Convierte una dirección en coordenadas geográficas
        
        Args:
            address: Dirección a geocodificar
            city: Ciudad (opcional, mejora precisión)
            country: País (default: Colombia)
        
        Returns:
            Dict con lat, lon, formatted_address y components
        
        Example:
            >>> await geocode_address("Calle 50 #45-30", "Medellín")
            {
                "latitude": 6.2442,
                "longitude": -75.5636,
                "formatted_address": "Calle 50 #45-30, El Poblado, Medellín, Colombia",
                "place_id": "ChIJ...",
                "address_components": {...}
            }
        """
        self._check_client()
        
        try:
            # Construir query completa
            full_address = address
            if city:
                full_address = f"{address}, {city}"
            if country:
                full_address = f"{full_address}, {country}"
            
            # Llamar API de Geocoding
            results = self.gmaps.geocode(full_address)
            
            if not results:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"No se encontraron resultados para: {full_address}"
                )
            
            # Tomar el primer resultado (más relevante)
            result = results[0]
            location = result["geometry"]["location"]
            
            # Extraer componentes de dirección
            address_components = self._parse_address_components(
                result.get("address_components", [])
            )
            
            return {
                "latitude": location["lat"],
                "longitude": location["lng"],
                "formatted_address": result["formatted_address"],
                "place_id": result["place_id"],
                "address_components": address_components,
                "location_type": result["geometry"].get("location_type"),
            }
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al geocodificar dirección: {str(e)}"
            )
    
    
    async def reverse_geocode(
        self,
        latitude: float,
        longitude: float
    ) -> Dict[str, Any]:
        """
        Convierte coordenadas en una dirección legible
        
        Args:
            latitude: Latitud
            longitude: Longitud
        
        Returns:
            Dict con dirección formateada y componentes
        
        Example:
            >>> await reverse_geocode(6.2442, -75.5636)
            {
                "formatted_address": "Calle 50 #45-30, Medellín, Colombia",
                "street": "Calle 50",
                "neighborhood": "El Poblado",
                "city": "Medellín",
                "state": "Antioquia",
                "country": "Colombia"
            }
        """
        self._check_client()
        
        try:
            # Validar coordenadas
            if not (-90 <= latitude <= 90):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Latitud debe estar entre -90 y 90"
                )
            if not (-180 <= longitude <= 180):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Longitud debe estar entre -180 y 180"
                )
            
            # Llamar API de Reverse Geocoding
            results = self.gmaps.reverse_geocode((latitude, longitude))
            
            if not results:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No se encontró dirección para estas coordenadas"
                )
            
            result = results[0]
            
            # Parsear componentes
            components = self._parse_address_components(
                result.get("address_components", [])
            )
            
            return {
                "formatted_address": result["formatted_address"],
                "place_id": result["place_id"],
                "street": components.get("route"),
                "street_number": components.get("street_number"),
                "neighborhood": components.get("neighborhood"),
                "city": components.get("city"),
                "state": components.get("state"),
                "country": components.get("country"),
                "postal_code": components.get("postal_code"),
                "address_components": components
            }
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al obtener dirección: {str(e)}"
            )
    
    
    async def calculate_distance(
        self,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        mode: str = "driving"
    ) -> Dict[str, Any]:
        """
        Calcula distancia y tiempo entre dos puntos
        
        Args:
            origin_lat: Latitud origen
            origin_lon: Longitud origen
            dest_lat: Latitud destino
            dest_lon: Longitud destino
            mode: Modo de transporte (driving, walking, bicycling, transit)
        
        Returns:
            Dict con distancia en km, duración en minutos y ruta
        
        Example:
            >>> await calculate_distance(6.2442, -75.5636, 6.2518, -75.5636)
            {
                "distance_km": 0.85,
                "distance_text": "850 m",
                "duration_minutes": 3,
                "duration_text": "3 mins",
                "origin": "Calle 50, Medellín",
                "destination": "Calle 60, Medellín"
            }
        """
        self._check_client()
        
        try:
            # Validar modo de transporte
            valid_modes = ["driving", "walking", "bicycling", "transit"]
            if mode not in valid_modes:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Modo inválido. Debe ser uno de: {', '.join(valid_modes)}"
                )
            
            origin = (origin_lat, origin_lon)
            destination = (dest_lat, dest_lon)
            
            # Llamar Distance Matrix API
            result = self.gmaps.distance_matrix(
                origins=[origin],
                destinations=[destination],
                mode=mode,
                units="metric",
                language="es"
            )
            
            if result["status"] != "OK":
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error en Distance Matrix API: {result['status']}"
                )
            
            # Extraer datos
            element = result["rows"][0]["elements"][0]
            
            if element["status"] != "OK":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No se pudo calcular la ruta: {element['status']}"
                )
            
            distance_meters = element["distance"]["value"]
            duration_seconds = element["duration"]["value"]
            
            return {
                "distance_km": round(distance_meters / 1000, 2),
                "distance_meters": distance_meters,
                "distance_text": element["distance"]["text"],
                "duration_minutes": round(duration_seconds / 60, 1),
                "duration_seconds": duration_seconds,
                "duration_text": element["duration"]["text"],
                "origin_address": result["origin_addresses"][0],
                "destination_address": result["destination_addresses"][0],
                "mode": mode
            }
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al calcular distancia: {str(e)}"
            )
    
    
    async def autocomplete_address(
        self,
        input_text: str,
        city: Optional[str] = None,
        country: str = "co",  # código ISO de Colombia
        radius: int = 50000  # 50km de radio
    ) -> List[Dict[str, Any]]:
        """
        Autocompletar direcciones (sugerencias mientras el usuario escribe)
        
        Args:
            input_text: Texto ingresado por el usuario
            city: Ciudad para filtrar resultados
            country: Código de país ISO (default: co = Colombia)
            radius: Radio de búsqueda en metros
        
        Returns:
            Lista de sugerencias de direcciones
        
        Example:
            >>> await autocomplete_address("Calle 50", "Medellín")
            [
                {
                    "description": "Calle 50, Medellín, Antioquia, Colombia",
                    "place_id": "ChIJ...",
                    "main_text": "Calle 50",
                    "secondary_text": "Medellín, Antioquia, Colombia"
                },
                ...
            ]
        """
        self._check_client()
        
        try:
            # Parámetros de búsqueda
            params = {
                "input": input_text,
                "types": "address",  # Solo direcciones
                "language": "es",
                "components": f"country:{country}"
            }
            
            # Si se especifica ciudad, añadir como sesgo de ubicación
            if city:
                # Intentar geocodificar la ciudad para obtener sus coordenadas
                try:
                    city_geocode = self.gmaps.geocode(f"{city}, Colombia")
                    if city_geocode:
                        city_location = city_geocode[0]["geometry"]["location"]
                        params["location"] = (city_location["lat"], city_location["lng"])
                        params["radius"] = radius
                except:
                    pass  # Si falla, continuar sin location bias
            
            # Llamar Places Autocomplete API
            predictions = self.gmaps.places_autocomplete(**params)
            
            # Formatear resultados
            suggestions = []
            for prediction in predictions:
                suggestions.append({
                    "description": prediction["description"],
                    "place_id": prediction["place_id"],
                    "main_text": prediction["structured_formatting"]["main_text"],
                    "secondary_text": prediction["structured_formatting"].get("secondary_text", ""),
                    "types": prediction.get("types", [])
                })
            
            return suggestions
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error en autocompletado: {str(e)}"
            )
    
    
    async def validate_address(
        self,
        address: str,
        city: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Valida si una dirección existe y está bien formateada
        
        Args:
            address: Dirección a validar
            city: Ciudad (opcional)
        
        Returns:
            Dict con validación y dirección corregida si aplica
        
        Example:
            >>> await validate_address("Calle 50 45 30", "Medellín")
            {
                "is_valid": True,
                "original_address": "Calle 50 45 30",
                "corrected_address": "Calle 50 #45-30, Medellín, Colombia",
                "latitude": 6.2442,
                "longitude": -75.5636,
                "confidence": "high"
            }
        """
        self._check_client()
        
        try:
            # Intentar geocodificar
            geocode_result = await self.geocode_address(address, city)
            
            # Determinar nivel de confianza según location_type
            location_type = geocode_result.get("location_type", "APPROXIMATE")
            confidence_map = {
                "ROOFTOP": "high",           # Dirección exacta
                "RANGE_INTERPOLATED": "medium",  # Interpolada
                "GEOMETRIC_CENTER": "low",   # Centro geométrico
                "APPROXIMATE": "low"         # Aproximada
            }
            confidence = confidence_map.get(location_type, "low")
            
            return {
                "is_valid": True,
                "original_address": address,
                "corrected_address": geocode_result["formatted_address"],
                "latitude": geocode_result["latitude"],
                "longitude": geocode_result["longitude"],
                "confidence": confidence,
                "place_id": geocode_result["place_id"]
            }
        
        except HTTPException as e:
            # Si no se encuentra, retornar como inválida
            if e.status_code == 404:
                return {
                    "is_valid": False,
                    "original_address": address,
                    "corrected_address": None,
                    "reason": "Dirección no encontrada",
                    "confidence": None
                }
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al validar dirección: {str(e)}"
            )
    
    
    def calculate_distance_haversine(
        self,
        lat1: float,
        lon1: float,
        lat2: float,
        lon2: float
    ) -> float:
        """
        Calcula distancia entre dos puntos usando fórmula Haversine
        (distancia en línea recta, no ruta real)
        
        Útil para cálculos rápidos sin consumir API de Google Maps
        
        Args:
            lat1, lon1: Coordenadas punto 1
            lat2, lon2: Coordenadas punto 2
        
        Returns:
            Distancia en kilómetros
        """
        # Radio de la Tierra en km
        R = 6371.0
        
        # Convertir a radianes
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        # Diferencias
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        # Fórmula Haversine
        a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        distance = R * c
        return round(distance, 2)
    
    
    # ============================================
    # MÉTODOS PRIVADOS (HELPERS)
    # ============================================
    
    def _parse_address_components(
        self,
        components: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """
        Parsea los componentes de dirección de Google Maps
        a un formato más amigable
        """
        parsed = {}
        
        type_mapping = {
            "street_number": "street_number",
            "route": "route",
            "neighborhood": "neighborhood",
            "sublocality": "neighborhood",
            "locality": "city",
            "administrative_area_level_2": "city",
            "administrative_area_level_1": "state",
            "country": "country",
            "postal_code": "postal_code"
        }
        
        for component in components:
            for type_key, parsed_key in type_mapping.items():
                if type_key in component["types"]:
                    parsed[parsed_key] = component["long_name"]
                    break
        
        return parsed


# Instancia global del servicio
maps_service = MapsService()