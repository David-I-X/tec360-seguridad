"""
Service Layer para el sistema de calificaciones
Path: backend/app/services/rating_service.py
"""
from typing import Dict, Any
from fastapi import HTTPException, status
from app.core.security import supabase_client
from app.schemas.rating import (
    RatingCreate, RatingResponse, RatingListResponse, 
    RatingStats, ServiceRatingResponse, RatingListItem
)
from decimal import Decimal
import math


class RatingService:
    """Servicio para gestión de calificaciones"""
    
    def __init__(self):
        self.supabase = supabase_client
    
    
    async def create_rating(
        self,
        service_id: str,
        rating_data: RatingCreate,
        client_id: str
    ) -> RatingResponse:
        """
        Crear calificación de un servicio
        
        Validaciones:
        - El servicio debe existir
        - El servicio debe estar en estado 'completed'
        - El cliente debe ser el dueño del servicio
        - No debe existir ya una calificación para este servicio
        """
        try:
            # 1. Verificar que el servicio existe y obtener sus datos
            service_response = self.supabase.table("services").select(
                "id, client_id, technician_id, status, service_type, title"
            ).eq("id", service_id).execute()
            
            if not service_response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Servicio no encontrado"
                )
            
            service = service_response.data[0]
            
            # 2. Verificar que el cliente es el dueño del servicio
            if service["client_id"] != client_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes permiso para calificar este servicio"
                )
            
            # 3. Verificar que el servicio está completado
            if service["status"] != "completed":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Solo puedes calificar servicios completados. Estado actual: {service['status']}"
                )
            
            # 4. Verificar que no haya técnico asignado (edge case)
            if not service["technician_id"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Este servicio no tiene técnico asignado"
                )
            
            # 5. Verificar que no exista ya una calificación
            existing_rating = self.supabase.table("service_ratings").select(
                "id"
            ).eq("service_id", service_id).execute()
            
            if existing_rating.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Este servicio ya ha sido calificado"
                )
            
            # 6. Crear la calificación
            rating_insert = {
                "service_id": service_id,
                "client_id": client_id,
                "technician_id": service["technician_id"],
                "rating": rating_data.rating,
                "comment": rating_data.comment
            }
            
            rating_response = self.supabase.table("service_ratings").insert(
                rating_insert
            ).execute()
            
            if not rating_response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error al crear la calificación"
                )
            
            created_rating = rating_response.data[0]
            
            # 7. Obtener nombre del cliente para la respuesta
            client_response = self.supabase.table("users").select(
                "full_name, avatar_url"
            ).eq("id", client_id).execute()
            
            client_data = client_response.data[0] if client_response.data else {}
            
            # 8. Trigger de PostgreSQL recalculará automáticamente el average_rating del técnico
            # (Ver schema_v2_corregido.sql - trigger update_technician_rating)
            
            return RatingResponse(
                id=created_rating["id"],
                service_id=created_rating["service_id"],
                client_id=created_rating["client_id"],
                technician_id=created_rating["technician_id"],
                rating=created_rating["rating"],
                comment=created_rating.get("comment"),
                created_at=created_rating["created_at"],
                client_name=client_data.get("full_name"),
                client_avatar_url=client_data.get("avatar_url"),
                service_type=service["service_type"],
                service_title=service["title"]
            )
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al crear calificación: {str(e)}"
            )
    
    
    async def get_technician_ratings(
        self,
        technician_id: str,
        page: int = 1,
        page_size: int = 10
    ) -> RatingListResponse:
        """
        Obtener calificaciones de un técnico con paginación
        """
        try:
            # Calcular offset
            offset = (page - 1) * page_size
            
            # Obtener total de calificaciones
            count_response = self.supabase.table("service_ratings").select(
                "id", count="exact"
            ).eq("technician_id", technician_id).execute()
            
            total = count_response.count or 0
            total_pages = math.ceil(total / page_size) if total > 0 else 0
            
            # Obtener calificaciones con datos de cliente y servicio
            ratings_response = self.supabase.table("service_ratings").select(
                """
                id,
                rating,
                comment,
                created_at,
                client_id,
                services (
                    service_type,
                    title
                )
                """
            ).eq("technician_id", technician_id).order(
                "created_at", desc=True
            ).range(offset, offset + page_size - 1).execute()
            
            ratings_list = []
            
            for rating in ratings_response.data:
                # Obtener datos del cliente
                client_response = self.supabase.table("users").select(
                    "full_name, avatar_url"
                ).eq("id", rating["client_id"]).execute()
                
                client_data = client_response.data[0] if client_response.data else {}
                
                service_data = rating.get("services", {}) or {}
                
                ratings_list.append(RatingListItem(
                    id=rating["id"],
                    rating=rating["rating"],
                    comment=rating.get("comment"),
                    created_at=rating["created_at"],
                    client_name=client_data.get("full_name", "Cliente"),
                    client_avatar_url=client_data.get("avatar_url"),
                    service_type=service_data.get("service_type")
                ))
            
            # Obtener promedio de calificaciones del técnico
            tech_response = self.supabase.table("technicians").select(
                "average_rating"
            ).eq("user_id", technician_id).execute()
            
            average_rating = None
            if tech_response.data:
                avg = tech_response.data[0].get("average_rating")
                average_rating = Decimal(str(avg)) if avg else None
            
            return RatingListResponse(
                ratings=ratings_list,
                total=total,
                page=page,
                page_size=page_size,
                total_pages=total_pages,
                average_rating=average_rating
            )
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al obtener calificaciones: {str(e)}"
            )
    
    
    async def get_technician_rating_stats(
        self,
        technician_id: str
    ) -> RatingStats:
        """
        Obtener estadísticas detalladas de calificaciones de un técnico
        """
        try:
            # Obtener todas las calificaciones
            ratings_response = self.supabase.table("service_ratings").select(
                "rating"
            ).eq("technician_id", technician_id).execute()
            
            ratings = ratings_response.data
            total_ratings = len(ratings)
            
            if total_ratings == 0:
                return RatingStats(
                    average_rating=Decimal("0.0"),
                    total_ratings=0,
                    rating_distribution={"5": 0, "4": 0, "3": 0, "2": 0, "1": 0},
                    five_stars=0,
                    four_stars=0,
                    three_stars=0,
                    two_stars=0,
                    one_star=0
                )
            
            # Calcular distribución
            distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            for rating in ratings:
                distribution[rating["rating"]] += 1
            
            # Obtener promedio del técnico
            tech_response = self.supabase.table("technicians").select(
                "average_rating"
            ).eq("user_id", technician_id).execute()
            
            average_rating = Decimal("0.0")
            if tech_response.data:
                avg = tech_response.data[0].get("average_rating")
                average_rating = Decimal(str(avg)) if avg else Decimal("0.0")
            
            return RatingStats(
                average_rating=average_rating,
                total_ratings=total_ratings,
                rating_distribution={
                    "5": distribution[5],
                    "4": distribution[4],
                    "3": distribution[3],
                    "2": distribution[2],
                    "1": distribution[1]
                },
                five_stars=distribution[5],
                four_stars=distribution[4],
                three_stars=distribution[3],
                two_stars=distribution[2],
                one_star=distribution[1]
            )
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al obtener estadísticas: {str(e)}"
            )
    
    
    async def get_service_rating(
        self,
        service_id: str,
        user_id: str,
        user_role: str
    ) -> ServiceRatingResponse:
        """
        Obtener calificación de un servicio específico
        
        Permisos:
        - Cliente: solo puede ver la calificación de sus servicios
        - Técnico: solo puede ver la calificación de sus servicios
        - Admin: puede ver cualquier calificación
        """
        try:
            # Verificar que el servicio existe
            service_response = self.supabase.table("services").select(
                "id, client_id, technician_id"
            ).eq("id", service_id).execute()
            
            if not service_response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Servicio no encontrado"
                )
            
            service = service_response.data[0]
            
            # Verificar permisos
            if user_role != "admin":
                if service["client_id"] != user_id and service["technician_id"] != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="No tienes permiso para ver esta calificación"
                    )
            
            # Buscar calificación
            rating_response = self.supabase.table("service_ratings").select(
                """
                id,
                service_id,
                client_id,
                technician_id,
                rating,
                comment,
                created_at
                """
            ).eq("service_id", service_id).execute()
            
            if not rating_response.data:
                return ServiceRatingResponse(
                    service_id=service_id,
                    has_rating=False,
                    rating=None
                )
            
            rating_data = rating_response.data[0]
            
            # Obtener datos del cliente
            client_response = self.supabase.table("users").select(
                "full_name, avatar_url"
            ).eq("id", rating_data["client_id"]).execute()
            
            client_data = client_response.data[0] if client_response.data else {}
            
            return ServiceRatingResponse(
                service_id=service_id,
                has_rating=True,
                rating=RatingResponse(
                    id=rating_data["id"],
                    service_id=rating_data["service_id"],
                    client_id=rating_data["client_id"],
                    technician_id=rating_data["technician_id"],
                    rating=rating_data["rating"],
                    comment=rating_data.get("comment"),
                    created_at=rating_data["created_at"],
                    client_name=client_data.get("full_name"),
                    client_avatar_url=client_data.get("avatar_url")
                )
            )
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al obtener calificación: {str(e)}"
            )
    
    
    async def can_rate_service(
        self,
        service_id: str,
        client_id: str
    ) -> Dict[str, Any]:
        """
        Verificar si un cliente puede calificar un servicio
        """
        try:
            # Obtener servicio
            service_response = self.supabase.table("services").select(
                "id, client_id, status"
            ).eq("id", service_id).execute()
            
            if not service_response.data:
                return {
                    "can_rate": False,
                    "reason": "Servicio no encontrado",
                    "service_status": "unknown"
                }
            
            service = service_response.data[0]
            
            # Verificar que es el cliente
            if service["client_id"] != client_id:
                return {
                    "can_rate": False,
                    "reason": "No eres el cliente de este servicio",
                    "service_status": service["status"]
                }
            
            # Verificar estado
            if service["status"] != "completed":
                return {
                    "can_rate": False,
                    "reason": f"El servicio debe estar completado (estado actual: {service['status']})",
                    "service_status": service["status"]
                }
            
            # Verificar si ya fue calificado
            existing_rating = self.supabase.table("service_ratings").select(
                "id"
            ).eq("service_id", service_id).execute()
            
            if existing_rating.data:
                return {
                    "can_rate": False,
                    "reason": "Este servicio ya ha sido calificado",
                    "service_status": service["status"]
                }
            
            return {
                "can_rate": True,
                "reason": None,
                "service_status": service["status"]
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al verificar permisos: {str(e)}"
            )


# Instancia global del servicio
rating_service = RatingService()