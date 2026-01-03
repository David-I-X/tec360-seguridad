"""
Service Layer para manejo de técnicos
Lógica de negocio separada de los endpoints
"""
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
from app.core.config import settings
from app.core.security import supabase_client
from app.schemas.technician import (
    TechnicianCreate,
    TechnicianUpdate,
    TechnicianResponse,
    TechnicianListItem,
    TechnicianPublicProfile,
    TechnicianStatsResponse,
    NearbyTechnicianResult,
    TechnicianLocationUpdate
)
import math


class TechnicianService:
    """
    Clase para manejar toda la lógica de negocio de técnicos.
    """
    
    def __init__(self):
        self.supabase = supabase_client
    
    
    async def create_technician_profile(
        self,
        technician_data: TechnicianCreate,
        user_id: str
    ) -> TechnicianResponse:
        """
        Crea el perfil de técnico para un usuario.
        El usuario ya debe existir con rol 'technician'.
        
        Args:
            technician_data: Datos del perfil técnico
            user_id: UUID del usuario
        
        Returns:
            TechnicianResponse con el perfil creado
        
        Raises:
            HTTPException 400: Si el perfil ya existe o datos inválidos
            HTTPException 404: Si el usuario no existe
        """
        try:
            # Verificar que el usuario existe y es técnico
            user_response = self.supabase.table("users")\
                .select("id, role")\
                .eq("id", user_id)\
                .single()\
                .execute()
            
            if not user_response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Usuario no encontrado"
                )
            
            if user_response.data["role"] != "technician":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El usuario debe tener rol 'technician'"
                )
            
            # Verificar que no existe ya un perfil
            existing = self.supabase.table("technicians")\
                .select("id")\
                .eq("user_id", user_id)\
                .execute()
            
            if existing.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El técnico ya tiene un perfil creado"
                )
            
            # Preparar datos para inserción
            tech_dict = {
                "user_id": user_id,
                "sena_certification_number": technician_data.sena_certification_number,
                "specializations": technician_data.specializations,
                "experience_years": technician_data.experience_years,
                "bio": technician_data.bio,
                "service_radius_km": technician_data.service_radius_km,
                "is_available": True,  # Por defecto disponible
                "is_verified": False,  # Requiere verificación de admin
            }
            
            # Agregar ubicación si se proporcionó
            if technician_data.current_lat and technician_data.current_lon:
                tech_dict["current_location"] = f"POINT({technician_data.current_lon} {technician_data.current_lat})"
            
            # Insertar en Supabase
            response = self.supabase.table("technicians")\
                .insert(tech_dict)\
                .execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error al crear perfil de técnico"
                )
            
            # Retornar perfil completo
            return await self.get_technician_by_user_id(user_id)
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al crear perfil: {str(e)}"
            )
    
    
    async def get_technician_by_user_id(
        self,
        user_id: str,
        include_user_info: bool = True
    ) -> TechnicianResponse:
        """
        Obtiene el perfil de técnico por user_id.
        
        Args:
            user_id: UUID del usuario
            include_user_info: Si incluir info del usuario relacionado
        
        Returns:
            TechnicianResponse con el perfil
        
        Raises:
            HTTPException 404: Si el técnico no existe
        """
        try:
            query = self.supabase.table("technicians")\
                .select("*")
            
            if include_user_info:
                query = query.select("*, user:users!user_id(*)")
            
            response = query.eq("user_id", user_id).single().execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Perfil de técnico no encontrado"
                )
            
            return self._parse_technician_response(response.data)
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al obtener técnico: {str(e)}"
            )
    
    
    async def get_technician_by_id(
        self,
        technician_id: str
    ) -> TechnicianResponse:
        """
        Obtiene técnico por su ID de técnico (no user_id).
        """
        try:
            response = self.supabase.table("technicians")\
                .select("*, user:users!user_id(*)")\
                .eq("id", technician_id)\
                .single()\
                .execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Técnico no encontrado"
                )
            
            return self._parse_technician_response(response.data)
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al obtener técnico: {str(e)}"
            )
    
    
    async def update_technician_profile(
        self,
        user_id: str,
        technician_data: TechnicianUpdate
    ) -> TechnicianResponse:
        """
        Actualiza el perfil de un técnico.
        
        Args:
            user_id: UUID del usuario técnico
            technician_data: Datos a actualizar
        
        Returns:
            TechnicianResponse actualizado
        """
        try:
            # Verificar que el perfil existe
            await self.get_technician_by_user_id(user_id)
            
            # Preparar datos para actualizar (solo campos no nulos)
            update_dict = technician_data.model_dump(exclude_none=True)
            
            if not update_dict:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No se proporcionaron datos para actualizar"
                )
            
            # Actualizar en Supabase
            response = self.supabase.table("technicians")\
                .update(update_dict)\
                .eq("user_id", user_id)\
                .execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error al actualizar perfil"
                )
            
            return await self.get_technician_by_user_id(user_id)
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al actualizar: {str(e)}"
            )
    
    
    async def update_location(
        self,
        user_id: str,
        location_data: TechnicianLocationUpdate
    ) -> Dict[str, Any]:
        """
        Actualiza solo la ubicación actual del técnico.
        Útil para tracking en tiempo real.
        
        Args:
            user_id: UUID del usuario técnico
            location_data: Nueva ubicación (lat, lon)
        
        Returns:
            Dict con confirmación
        """
        try:
            # Verificar que el técnico existe
            await self.get_technician_by_user_id(user_id, include_user_info=False)
            
            # Actualizar ubicación
            location_str = f"POINT({location_data.current_lon} {location_data.current_lat})"
            
            response = self.supabase.table("technicians")\
                .update({"current_location": location_str})\
                .eq("user_id", user_id)\
                .execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error al actualizar ubicación"
                )
            
            return {
                "message": "Ubicación actualizada correctamente",
                "latitude": location_data.current_lat,
                "longitude": location_data.current_lon
            }
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al actualizar ubicación: {str(e)}"
            )
    
    
    async def toggle_availability(
        self,
        user_id: str,
        is_available: bool
    ) -> Dict[str, Any]:
        """
        Cambia la disponibilidad del técnico (on/off).
        
        Args:
            user_id: UUID del usuario técnico
            is_available: True = disponible, False = no disponible
        
        Returns:
            Dict con confirmación
        """
        try:
            response = self.supabase.table("technicians")\
                .update({"is_available": is_available})\
                .eq("user_id", user_id)\
                .execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error al cambiar disponibilidad"
                )
            
            status_text = "disponible" if is_available else "no disponible"
            return {
                "message": f"Ahora estás {status_text} para nuevos servicios",
                "is_available": is_available
            }
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al cambiar disponibilidad: {str(e)}"
            )
    
    
    async def list_technicians(
        self,
        specialization: Optional[str] = None,
        city: Optional[str] = None,
        min_rating: Optional[float] = None,
        is_available: Optional[bool] = None,
        verified_only: bool = True,
        page: int = 1,
        page_size: int = 10
    ) -> Dict[str, Any]:
        """
        Lista técnicos con filtros y paginación.
        
        Args:
            specialization: Filtrar por especialización
            city: Filtrar por ciudad
            min_rating: Rating mínimo
            is_available: Solo disponibles o no
            verified_only: Solo técnicos verificados
            page: Número de página
            page_size: Tamaño de página
        
        Returns:
            Dict con técnicos paginados
        """
        try:
            # Query base con info de usuario
            query = self.supabase.table("technicians")\
                .select("*, user:users!user_id(full_name, city, avatar_url)", count="exact")
            
            # Aplicar filtros
            if verified_only:
                query = query.eq("is_verified", True)
            
            if is_available is not None:
                query = query.eq("is_available", is_available)
            
            if min_rating is not None:
                query = query.gte("average_rating", min_rating)
            
            if specialization:
                # PostgreSQL array contains
                query = query.contains("specializations", [specialization])
            
            # Filtro por ciudad (en tabla users)
            if city:
                # Nota: Esto requiere un JOIN, Supabase lo maneja automáticamente
                query = query.eq("user.city", city)
            
            # Paginación
            start = (page - 1) * page_size
            end = start + page_size - 1
            
            query = query.range(start, end).order("average_rating", desc=True)
            
            # Ejecutar query
            response = query.execute()
            
            technicians = response.data or []
            total = response.count or 0
            total_pages = math.ceil(total / page_size) if total > 0 else 0
            
            # Parsear a formato de respuesta
            tech_list = []
            for tech in technicians:
                user_data = tech.get("user", {}) or {}
                tech_list.append({
                    "id": tech["id"],
                    "user_id": tech["user_id"],
                    "full_name": user_data.get("full_name"),
                    "specializations": tech["specializations"],
                    "experience_years": tech["experience_years"],
                    "service_radius_km": tech["service_radius_km"],
                    "is_available": tech["is_available"],
                    "is_verified": tech["is_verified"],
                    "average_rating": tech["average_rating"],
                    "total_services": tech["total_services"],
                    "city": user_data.get("city"),
                    "avatar_url": user_data.get("avatar_url")
                })
            
            return {
                "technicians": tech_list,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages
            }
        
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al listar técnicos: {str(e)}"
            )
    
    
    async def get_technician_stats(
        self,
        user_id: str
    ) -> TechnicianStatsResponse:
        """
        Obtiene estadísticas del técnico.
        
        Args:
            user_id: UUID del usuario técnico
        
        Returns:
            TechnicianStatsResponse con estadísticas
        """
        try:
            # Obtener datos básicos del técnico
            tech = await self.get_technician_by_user_id(user_id, include_user_info=False)
            
            # Contar servicios por estado
            services_response = self.supabase.table("services")\
                .select("status, final_price", count="exact")\
                .eq("technician_id", user_id)\
                .execute()
            
            services = services_response.data or []
            
            completed = sum(1 for s in services if s["status"] == "completed")
            in_progress = sum(1 for s in services if s["status"] == "in_progress")
            cancelled = sum(1 for s in services if s["status"] == "cancelled")
            
            # Calcular ingresos totales
            total_earned = sum(
                float(s["final_price"] or 0)
                for s in services
                if s["status"] == "completed" and s["final_price"]
            )
            
            # Servicios este mes (mock por ahora)
            # TODO: Implementar filtro por fecha
            services_this_month = 0
            services_this_week = 0
            
            return TechnicianStatsResponse(
                total_services=tech.total_services,
                completed_services=completed,
                in_progress_services=in_progress,
                cancelled_services=cancelled,
                average_rating=tech.average_rating,
                total_earned=Decimal(str(total_earned)),
                services_this_month=services_this_month,
                services_this_week=services_this_week
            )
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al obtener estadísticas: {str(e)}"
            )
    
    
    # ============================================
    # MÉTODOS PRIVADOS (HELPERS)
    # ============================================
    
    def _parse_technician_response(self, tech: Dict[str, Any]) -> TechnicianResponse:
        """
        Parsea un técnico de Supabase a TechnicianResponse.
        Extrae coordenadas del POINT de PostGIS si existe.
        """
        # TODO: Extraer lat/lon del current_location (PostGIS POINT)
        current_lat = None
        current_lon = None
        
        return TechnicianResponse(
            id=tech["id"],
            user_id=tech["user_id"],
            sena_certification_number=tech.get("sena_certification_number"),
            specializations=tech.get("specializations", []),
            experience_years=tech["experience_years"],
            bio=tech.get("bio"),
            current_lat=current_lat,
            current_lon=current_lon,
            service_radius_km=tech["service_radius_km"],
            is_available=tech["is_available"],
            is_verified=tech["is_verified"],
            total_services=tech["total_services"],
            average_rating=tech["average_rating"],
            created_at=tech["created_at"],
            updated_at=tech["updated_at"]
        )


# Instancia global del servicio
technician_service = TechnicianService()