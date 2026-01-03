"""
Service Layer para manejo de servicios
Lógica de negocio separada de los endpoints
"""
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
from app.core.config import settings
from app.core.security import supabase_client
from app.schemas.service import (
    ServiceCreate,
    ServiceUpdate,
    ServiceResponse,
    ServiceListResponse,
    NearbyTechnicianResponse
)
import math


class ServiceService:
    """
    Clase para manejar toda la lógica de negocio de servicios.
    Separa la lógica de los endpoints para mejor testing y mantenibilidad.
    """
    
    def __init__(self):
        self.supabase = supabase_client
    
    
    async def create_service(
        self, 
        service_data: ServiceCreate, 
        client_id: str
    ) -> ServiceResponse:
        """
        Crea un nuevo servicio.
        
        Args:
            service_data: Datos del servicio a crear
            client_id: UUID del cliente que solicita el servicio
        
        Returns:
            ServiceResponse con el servicio creado
        
        Raises:
            HTTPException 400: Si hay error en los datos
            HTTPException 500: Si hay error de base de datos
        """
        try:
            # Preparar datos para inserción
            service_dict = {
                "client_id": client_id,
                "service_type": service_data.service_type,
                "status": "pending",  # Siempre inicia como pending
                "title": service_data.title,
                "description": service_data.description,
                "service_address": service_data.service_address,
                "service_city": service_data.service_city,
                # PostGIS requiere formato especial para GEOGRAPHY
                "service_location": f"POINT({service_data.service_lon} {service_data.service_lat})",
                "scheduled_date": service_data.scheduled_date.isoformat() if service_data.scheduled_date else None,
                "estimated_price": float(service_data.estimated_price) if service_data.estimated_price else None,
                "client_notes": service_data.client_notes,
            }
            
            # Insertar en Supabase
            response = self.supabase.table("services").insert(service_dict).execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error al crear el servicio"
                )
            
            service = response.data[0]
            
            # Convertir a schema de respuesta
            return self._parse_service_response(service)
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al crear servicio: {str(e)}"
            )
    
    
    async def get_service_by_id(
        self, 
        service_id: str, 
        user_id: str,
        user_role: str
    ) -> ServiceResponse:
        """
        Obtiene un servicio por ID.
        Valida que el usuario tenga permiso para verlo.
        
        Args:
            service_id: UUID del servicio
            user_id: UUID del usuario que solicita
            user_role: Rol del usuario (client, technician, admin)
        
        Returns:
            ServiceResponse con el servicio
        
        Raises:
            HTTPException 404: Si el servicio no existe
            HTTPException 403: Si el usuario no tiene permiso
        """
        try:
            # Obtener servicio con información de cliente y técnico
            response = self.supabase.table("services")\
                .select("*, client:users!client_id(*), technician:users!technician_id(*)")\
                .eq("id", service_id)\
                .single()\
                .execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Servicio no encontrado"
                )
            
            service = response.data
            
            # Validar permisos (RLS ya hace esto, pero doble check por seguridad)
            if user_role == "client" and service["client_id"] != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes permiso para ver este servicio"
                )
            elif user_role == "technician" and service.get("technician_id") != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes permiso para ver este servicio"
                )
            
            return self._parse_service_response(service)
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al obtener servicio: {str(e)}"
            )
    
    
    async def list_services(
        self,
        user_id: str,
        user_role: str,
        status_filter: Optional[str] = None,
        service_type_filter: Optional[str] = None,
        page: int = 1,
        page_size: int = 10
    ) -> Dict[str, Any]:
        """
        Lista servicios con paginación y filtros.
        
        Args:
            user_id: UUID del usuario
            user_role: Rol del usuario
            status_filter: Filtrar por estado (opcional)
            service_type_filter: Filtrar por tipo (opcional)
            page: Número de página (default 1)
            page_size: Tamaño de página (default 10)
        
        Returns:
            Dict con servicios paginados
        """
        try:
            # Construir query base según rol
            query = self.supabase.table("services")\
                .select("*, client:users!client_id(full_name), technician:users!technician_id(full_name)", count="exact")
            
            # Filtrar según rol
            if user_role == "client":
                query = query.eq("client_id", user_id)
            elif user_role == "technician":
                query = query.eq("technician_id", user_id)
            # admin ve todos (no filtra)
            
            # Aplicar filtros adicionales
            if status_filter:
                query = query.eq("status", status_filter)
            if service_type_filter:
                query = query.eq("service_type", service_type_filter)
            
            # Paginación
            start = (page - 1) * page_size
            end = start + page_size - 1
            
            query = query.range(start, end).order("created_at", desc=True)
            
            # Ejecutar query
            response = query.execute()
            
            services = response.data or []
            total = response.count or 0
            
            # Calcular total de páginas
            total_pages = math.ceil(total / page_size) if total > 0 else 0
            
            # Parsear servicios a formato de respuesta
            services_parsed = [
                {
                    "id": s["id"],
                    "service_type": s["service_type"],
                    "status": s["status"],
                    "title": s["title"],
                    "service_city": s["service_city"],
                    "scheduled_date": s.get("scheduled_date"),
                    "estimated_price": s.get("estimated_price"),
                    "created_at": s["created_at"],
                    "client_name": s.get("client", {}).get("full_name") if s.get("client") else None,
                    "technician_name": s.get("technician", {}).get("full_name") if s.get("technician") else None,
                }
                for s in services
            ]
            
            return {
                "services": services_parsed,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages
            }
        
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al listar servicios: {str(e)}"
            )
    
    
    async def update_service(
        self,
        service_id: str,
        service_data: ServiceUpdate,
        user_id: str,
        user_role: str
    ) -> ServiceResponse:
        """
        Actualiza un servicio existente.
        
        Args:
            service_id: UUID del servicio
            service_data: Datos a actualizar
            user_id: UUID del usuario
            user_role: Rol del usuario
        
        Returns:
            ServiceResponse con el servicio actualizado
        """
        try:
            # Verificar que el servicio existe y el usuario tiene permiso
            await self.get_service_by_id(service_id, user_id, user_role)
            
            # Preparar datos para actualizar (solo campos no nulos)
            update_dict = service_data.model_dump(exclude_none=True)
            
            # Convertir datetimes a string ISO
            if "scheduled_date" in update_dict and update_dict["scheduled_date"]:
                update_dict["scheduled_date"] = update_dict["scheduled_date"].isoformat()
            if "started_at" in update_dict and update_dict["started_at"]:
                update_dict["started_at"] = update_dict["started_at"].isoformat()
            if "completed_at" in update_dict and update_dict["completed_at"]:
                update_dict["completed_at"] = update_dict["completed_at"].isoformat()
            
            # Validar transiciones de estado
            if "status" in update_dict:
                await self._validate_status_transition(service_id, update_dict["status"], user_role)
            
            # Actualizar en Supabase
            response = self.supabase.table("services")\
                .update(update_dict)\
                .eq("id", service_id)\
                .execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error al actualizar servicio"
                )
            
            # Retornar servicio actualizado
            return await self.get_service_by_id(service_id, user_id, user_role)
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al actualizar servicio: {str(e)}"
            )
    
    
    async def assign_technician(
        self,
        service_id: str,
        technician_id: str,
        user_role: str
    ) -> ServiceResponse:
        """
        Asigna un técnico a un servicio.
        Solo admins pueden hacer esto (o sistema automático).
        
        Args:
            service_id: UUID del servicio
            technician_id: UUID del técnico
            user_role: Rol del usuario (debe ser admin)
        
        Returns:
            ServiceResponse con el servicio actualizado
        """
        try:
            # Validar que sea admin
            if user_role != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Solo administradores pueden asignar técnicos"
                )
            
            # Verificar que el técnico existe y está disponible
            tech_response = self.supabase.table("technicians")\
                .select("*")\
                .eq("user_id", technician_id)\
                .single()\
                .execute()
            
            if not tech_response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Técnico no encontrado"
                )
            
            if not tech_response.data["is_available"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El técnico no está disponible"
                )
            
            # Asignar técnico y cambiar estado
            response = self.supabase.table("services")\
                .update({
                    "technician_id": technician_id,
                    "status": "assigned"
                })\
                .eq("id", service_id)\
                .execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error al asignar técnico"
                )
            
            # Retornar servicio actualizado
            return await self.get_service_by_id(service_id, technician_id, "admin")
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al asignar técnico: {str(e)}"
            )
    
    
    async def find_nearby_technicians(
        self,
        service_id: str,
        max_distance_km: int = 20
    ) -> List[NearbyTechnicianResponse]:
        """
        Busca técnicos cercanos a un servicio.
        Usa la función PostGIS find_nearby_technicians.
        
        Args:
            service_id: UUID del servicio
            max_distance_km: Radio máximo de búsqueda en km
        
        Returns:
            Lista de técnicos cercanos ordenados por distancia
        """
        try:
            # Obtener coordenadas del servicio
            service_response = self.supabase.table("services")\
                .select("service_location, service_type")\
                .eq("id", service_id)\
                .single()\
                .execute()
            
            if not service_response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Servicio no encontrado"
                )
            
            # Extraer coordenadas (Supabase retorna geometry como string WKT)
            # TODO: Parsear correctamente el POINT de PostGIS
            # Por ahora usamos RPC para llamar la función directamente
            
            service_type = service_response.data["service_type"]
            
            # Llamar función de Supabase (RPC)
            # Nota: Necesitamos las coordenadas, por ahora usamos dummy
            # En producción, parsear el POINT correctamente
            
            technicians_response = self.supabase.rpc(
                "find_nearby_technicians",
                {
                    "service_lat": 6.2442,  # TODO: Extraer del service_location
                    "service_lon": -75.5636,
                    "max_distance_km": max_distance_km,
                    "service_specialization": service_type
                }
            ).execute()
            
            if not technicians_response.data:
                return []
            
            return [
                NearbyTechnicianResponse(**tech)
                for tech in technicians_response.data
            ]
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al buscar técnicos: {str(e)}"
            )
    
    
    # ============================================
    # MÉTODOS PRIVADOS (HELPERS)
    # ============================================
    
    def _parse_service_response(self, service: Dict[str, Any]) -> ServiceResponse:
        """
        Parsea un servicio de Supabase a ServiceResponse.
        Extrae las coordenadas del POINT de PostGIS.
        """
        # Extraer lat/lon del service_location (POINT geometry)
        # Supabase puede retornarlo como string WKT o dict
        service_lat = 0.0  # TODO: Extraer correctamente
        service_lon = 0.0
        
        return ServiceResponse(
            id=service["id"],
            client_id=service["client_id"],
            technician_id=service.get("technician_id"),
            service_type=service["service_type"],
            status=service["status"],
            title=service["title"],
            description=service.get("description"),
            service_address=service["service_address"],
            service_city=service["service_city"],
            service_lat=service_lat,
            service_lon=service_lon,
            requested_date=service["requested_date"],
            scheduled_date=service.get("scheduled_date"),
            started_at=service.get("started_at"),
            completed_at=service.get("completed_at"),
            estimated_price=service.get("estimated_price"),
            final_price=service.get("final_price"),
            client_notes=service.get("client_notes"),
            technician_notes=service.get("technician_notes"),
            created_at=service["created_at"],
            updated_at=service["updated_at"],
        )
    
    
    async def _validate_status_transition(
        self,
        service_id: str,
        new_status: str,
        user_role: str
    ):
        """
        Valida que la transición de estado sea válida.
        
        Reglas:
        - pending → assigned (solo admin)
        - assigned → in_progress (técnico o admin)
        - in_progress → completed (técnico o admin)
        - cualquier estado → cancelled (cliente o admin)
        """
        # Obtener estado actual
        response = self.supabase.table("services")\
            .select("status")\
            .eq("id", service_id)\
            .single()\
            .execute()
        
        current_status = response.data["status"]
        
        # Validar transiciones
        if current_status == "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede modificar un servicio completado"
            )
        
        if new_status == "assigned" and user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo administradores pueden asignar servicios"
            )
        
        if new_status == "cancelled" and user_role not in ["client", "admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo el cliente o admin pueden cancelar"
            )


# Instancia global del servicio
service_service = ServiceService()