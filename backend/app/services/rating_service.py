"""
Service Layer para el sistema de calificaciones
Path: backend/app/services/rating_service.py
Refactorizado para usar SQLModel
"""
from typing import Dict, Any
from fastapi import HTTPException, status
from sqlmodel import Session, select, func
from app.models.service import Service, ServiceStatus
from app.models.extras import ServiceRating
from app.models.user import User
from app.models.technician import Technician
from app.schemas.rating import (
    RatingCreate, RatingResponse, RatingListResponse, 
    RatingStats, ServiceRatingResponse, RatingListItem
)
from decimal import Decimal
import math

class RatingService:
    """Servicio para gestión de calificaciones"""
    
    async def create_rating(
        self,
        session: Session,
        service_id: str,
        rating_data: RatingCreate,
        client_id: str
    ) -> RatingResponse:
        """
        Crear calificación de un servicio
        """
        from uuid import UUID as UUIDType
        try:
            # Convert string IDs to UUID
            try:
                service_uuid = UUIDType(service_id)
                client_uuid = UUIDType(client_id)
            except ValueError:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "ID de servicio o cliente inválido")
            
            # 1. Verificar que el servicio existe
            service = session.get(Service, service_uuid)
            if not service:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")
            
            # 2. Verificar que el cliente es el dueño
            if service.client_id != client_uuid:
                raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso para calificar este servicio")
            
            # 3. Verificar estado completed
            if service.status != ServiceStatus.completed:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Solo servicios completados. Estado: {service.status}")
            
            # 4. Verificar technician asignado
            if not service.technician_id:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Servicio sin técnico asignado")
            
            # 5. Verificar duplicados (ahora por rated_by para permitir bidireccional)
            existing = session.exec(
                select(ServiceRating).where(
                    ServiceRating.service_id == service_uuid,
                    ServiceRating.rated_by == "client"
                )
            ).first()
            if existing:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ya calificaste este servicio")
            
            # 6. Get client info BEFORE any commits (avoid transaction issues)
            client = session.get(User, client_uuid)
            client_name = client.full_name if client else "Cliente"
            client_avatar = client.avatar_url if client else None
            
            # 7. Crear calificación
            new_rating = ServiceRating(
                service_id=service_uuid,
                rating=rating_data.rating,
                comment=rating_data.comment,
                rated_by="client",
                rater_id=str(client_uuid)
            )
            session.add(new_rating)
            session.commit()
            session.refresh(new_rating)
            
            # 8. Actualizar promedio del técnico (non-blocking - failures are logged but don't break response)
            try:
                await self._update_technician_average(session, str(service.technician_id))
            except Exception as avg_error:
                import logging
                logging.warning(f"Failed to update technician average: {avg_error}")
            
            # 9. Response
            return RatingResponse(
                id=str(new_rating.id),
                service_id=str(new_rating.service_id),
                client_id=str(service.client_id),
                technician_id=str(service.technician_id),
                rating=new_rating.rating,
                comment=new_rating.comment,
                created_at=new_rating.created_at,
                client_name=client_name,
                client_avatar_url=client_avatar,
                service_type=service.service_type,
                service_title=service.title
            )
            
        except HTTPException:
            raise
        except Exception as e:
            import traceback
            import logging
            logging.error(f"create_rating failed: {type(e).__name__}: {e}")
            logging.error(traceback.format_exc())
            session.rollback()
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Error al calificar: {type(e).__name__}: {str(e)}")
            
    async def _update_technician_average(self, session: Session, technician_user_id: str):
        """Recalculate technician average rating AND rank points"""
        from uuid import UUID as UUIDType
        import logging
        
        try:
            tech_uuid = UUIDType(technician_user_id)
            
            # Find all CLIENT ratings for services by this technician
            statement = select(ServiceRating.rating)\
                .join(Service, ServiceRating.service_id == Service.id)\
                .where(Service.technician_id == tech_uuid)\
                .where(ServiceRating.rated_by == "client")
                
            ratings = session.exec(statement).all()
            
            avg = sum(ratings) / len(ratings) if ratings else 0.0
                
            tech = session.exec(select(Technician).where(Technician.user_id == tech_uuid)).first()
            if tech:
                tech.average_rating = float(avg)
                session.add(tech)
                session.commit()
                
                # Recalculate full reputation points
                from app.services.reputation_service import reputation_service
                await reputation_service.recalculate(session, technician_user_id)
        except Exception as e:
            logging.warning(f"Failed to update technician average/rank: {e}")

    async def create_technician_rating(
        self,
        session: Session,
        service_id: str,
        rating_data: RatingCreate,
        technician_user_id: str
    ) -> RatingResponse:
        """
        Técnico califica a un cliente después de completar servicio
        """
        from uuid import UUID as UUIDType
        try:
            service_uuid = UUIDType(service_id)
            tech_uuid = UUIDType(technician_user_id)
            
            service = session.get(Service, service_uuid)
            if not service:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Servicio no encontrado")
            
            if service.technician_id != tech_uuid:
                raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permiso")
            
            if service.status not in ["completed", "confirmed"]:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Servicio no completado aún")
            
            # Check duplicate
            existing = session.exec(
                select(ServiceRating).where(
                    ServiceRating.service_id == service_uuid,
                    ServiceRating.rated_by == "technician"
                )
            ).first()
            if existing:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ya calificaste a este cliente")
            
            new_rating = ServiceRating(
                service_id=service_uuid,
                rating=rating_data.rating,
                comment=rating_data.comment,
                rated_by="technician",
                rater_id=str(tech_uuid)
            )
            session.add(new_rating)
            session.commit()
            session.refresh(new_rating)
            
            # Get tech info
            tech_user = session.get(User, tech_uuid)
            tech_name = tech_user.full_name if tech_user else "Técnico"
            
            return RatingResponse(
                id=str(new_rating.id),
                service_id=str(new_rating.service_id),
                client_id=str(service.client_id),
                technician_id=str(service.technician_id),
                rating=new_rating.rating,
                comment=new_rating.comment,
                created_at=new_rating.created_at,
                client_name=tech_name,
                service_type=service.service_type,
                service_title=service.title
            )
        except HTTPException:
            raise
        except Exception as e:
            import traceback
            import logging
            logging.error(f"create_technician_rating failed: {e}")
            logging.error(traceback.format_exc())
            session.rollback()
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Error: {str(e)}")

    async def get_technician_ratings(
        self,
        session: Session,
        technician_id: str,
        page: int = 1,
        page_size: int = 10
    ) -> RatingListResponse:
        try:
            # Query ratings via Service
            query = select(ServiceRating, Service, User)\
                .join(Service, ServiceRating.service_id == Service.id)\
                .join(User, Service.client_id == User.id)\
                .where(Service.technician_id == technician_id)
            
            # Count
            total = session.exec(select(func.count()).select_from(query.subquery())).one()
            
            # Paginación
            query = query.order_by(ServiceRating.created_at.desc())\
                .offset((page - 1) * page_size)\
                .limit(page_size)
                
            results = session.exec(query).all()
            
            ratings_list = []
            for r, s, u in results:
                ratings_list.append(RatingListItem(
                    id=str(r.id),
                    rating=r.rating,
                    comment=r.comment,
                    created_at=r.created_at,
                    client_name=u.full_name,
                    client_avatar_url=u.avatar_url,
                    service_type=s.service_type
                ))
            
            # Get Technician stats
            tech = session.exec(select(Technician).where(Technician.user_id == technician_id)).first()
            avg = Decimal(tech.average_rating) if tech else Decimal(0)
            
            return RatingListResponse(
                ratings=ratings_list,
                total=total,
                page=page,
                page_size=page_size,
                total_pages=math.ceil(total / page_size) if total > 0 else 0,
                average_rating=avg
            )
        except Exception as e:
             raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, str(e))

    async def get_technician_rating_stats(
        self,
        session: Session,
        technician_id: str
    ) -> RatingStats:
        try:
            # Get all ratings
            query = select(ServiceRating.rating)\
                .join(Service, ServiceRating.service_id == Service.id)\
                .where(Service.technician_id == technician_id)
            
            ratings = session.exec(query).all()
            total = len(ratings)
            
            dist = {1:0, 2:0, 3:0, 4:0, 5:0}
            for r in ratings:
                dist[r] = dist.get(r, 0) + 1
                
            tech = session.exec(select(Technician).where(Technician.user_id == technician_id)).first()
            avg = Decimal(tech.average_rating) if tech else Decimal(0)
            
            return RatingStats(
                average_rating=avg,
                total_ratings=total,
                rating_distribution={str(k): v for k,v in dist.items()},
                five_stars=dist[5],
                four_stars=dist[4],
                three_stars=dist[3],
                two_stars=dist[2],
                one_star=dist[1]
            )
        except Exception as e:
            raise HTTPException(500, str(e))

    async def get_service_rating(
        self,
        session: Session,
        service_id: str,
        user_id: str,
        user_role: str
    ) -> ServiceRatingResponse:
        try:
            service = session.get(Service, service_id)
            if not service:
                raise HTTPException(404, "Servicio no encontrado")
                
            if user_role != "admin":
                if str(service.client_id) != user_id and str(service.technician_id) != user_id:
                     raise HTTPException(403, "No autorizado")
                     
            rating = session.exec(select(ServiceRating).where(ServiceRating.service_id == service_id)).first()
            
            if not rating:
                return ServiceRatingResponse(service_id=service_id, has_rating=False, rating=None)
            
            client = session.get(User, service.client_id)
            
            return ServiceRatingResponse(
                service_id=service_id,
                has_rating=True,
                rating=RatingResponse(
                    id=str(rating.id),
                    service_id=str(rating.service_id),
                    client_id=str(service.client_id),
                    technician_id=str(service.technician_id),
                    rating=rating.rating,
                    comment=rating.comment,
                    created_at=rating.created_at,
                    client_name=client.full_name if client else None,
                    client_avatar_url=client.avatar_url if client else None,
                    service_type=service.service_type,
                    service_title=service.title
                )
            )
        except Exception as e:
            raise HTTPException(500, str(e))

    async def can_rate_service(
        self,
        session: Session,
        service_id: str,
        client_id: str
    ) -> Dict[str, Any]:
        try:
            service = session.get(Service, service_id)
            if not service: 
                return {"can_rate": False, "reason": "Not found", "service_status": "unknown"}
            
            if str(service.client_id) != client_id:
                 return {"can_rate": False, "reason": "Not owner", "service_status": service.status}
                 
            if service.status != ServiceStatus.completed:
                 return {"can_rate": False, "reason": "Not completed", "service_status": service.status}
                 
            existing = session.exec(select(ServiceRating).where(ServiceRating.service_id == service_id)).first()
            if existing:
                 return {"can_rate": False, "reason": "Already rated", "service_status": service.status}
                 
            return {"can_rate": True, "reason": None, "service_status": service.status}
        except Exception as e:
            raise HTTPException(500, str(e))

rating_service = RatingService()