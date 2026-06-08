"""
Servicio de reputación — recalcula puntos y rank de un técnico
"""
from uuid import UUID
from datetime import datetime
from sqlmodel import Session, select, func
from app.models.technician import (
    Technician, calculate_rank_points, RANK_CONFIG, RATING_POINTS, RANK_THRESHOLDS,
)
from app.models.extras import ServiceRating
from app.models.service import Service
from app.models.user import User
from app.schemas.reputation import TechnicianReputation, PointsBreakdown


class ReputationService:

    async def recalculate(self, session: Session, technician_id: str) -> None:
        """Recalculate rank_points and rank for a technician and persist."""
        tech = session.exec(
            select(Technician).where(Technician.user_id == UUID(technician_id))
        ).first()
        if not tech:
            return

        user = session.get(User, UUID(technician_id))

        # Rating breakdown
        rating_breakdown = {}
        for stars in range(1, 6):
            count = session.exec(
                select(func.count()).select_from(ServiceRating).where(
                    ServiceRating.rater_id != technician_id,
                    ServiceRating.rated_by == "client",
                    ServiceRating.rating == stars,
                    ServiceRating.service_id.in_(
                        select(Service.id).where(Service.technician_id == tech.id)
                    ),
                )
            ).one()
            rating_breakdown[str(stars)] = count

        # Completed services count
        completed = session.exec(
            select(func.count()).select_from(Service).where(
                Service.technician_id == tech.id,
                Service.status.in_(["completed", "confirmed"]),
            )
        ).one()

        points, rank = calculate_rank_points(
            total_services=completed,
            experience_years=tech.experience_years,
            certifications_count=tech.certifications_count,
            average_rating=tech.average_rating,
            is_verified=tech.is_verified,
            specializations_count=len(tech.specializations) if tech.specializations else 0,
            has_bio=bool(tech.bio and len(tech.bio) > 10),
            has_avatar=bool(user and user.avatar_url),
            has_phone=bool(user and user.phone),
            rating_breakdown=rating_breakdown,
        )

        tech.rank_points = points
        tech.rank = rank
        tech.total_services = completed
        session.add(tech)
        session.commit()

    async def get_reputation(
        self, session: Session, technician_id: str
    ) -> TechnicianReputation:
        """Get full reputation info for a technician."""
        tech = session.exec(
            select(Technician).where(Technician.user_id == UUID(technician_id))
        ).first()

        if not tech:
            return TechnicianReputation(technician_id=technician_id)

        user = session.get(User, UUID(technician_id))

        # Rating breakdown for detailed points
        rating_breakdown = {}
        total_ratings = 0
        rating_points_total = 0
        for stars in range(1, 6):
            count = session.exec(
                select(func.count()).select_from(ServiceRating).where(
                    ServiceRating.rated_by == "client",
                    ServiceRating.rating == stars,
                    ServiceRating.service_id.in_(
                        select(Service.id).where(Service.technician_id == tech.id)
                    ),
                )
            ).one()
            rating_breakdown[str(stars)] = count
            total_ratings += count
            rating_points_total += RATING_POINTS.get(stars, 0) * count

        completed = tech.total_services or 0
        config = RANK_CONFIG.get(tech.rank, RANK_CONFIG["bronze"])

        # Progress calculation
        progress_percent = 0.0
        points_to_next = None
        next_rank_label = None

        if config["next_at"] is not None:
            # Find current rank threshold
            current_threshold = {"bronze": 0, "silver": 50, "gold": 150, "elite": 300}.get(tech.rank, 0)
            next_threshold = config["next_at"]
            range_size = next_threshold - current_threshold
            if range_size > 0:
                progress_percent = min(100, ((tech.rank_points - current_threshold) / range_size) * 100)
            points_to_next = max(0, next_threshold - tech.rank_points)
            next_config = RANK_CONFIG.get(config["next"], {})
            next_rank_label = next_config.get("label")
        else:
            progress_percent = 100.0

        # Build breakdown
        profile_bonus = 15 if (
            tech.bio and len(tech.bio) > 10
            and user and user.avatar_url
            and user and user.phone
        ) else 0

        breakdown = PointsBreakdown(
            services=completed * 10,
            ratings=rating_points_total,
            profile=profile_bonus,
            certifications=(25 if tech.is_verified else 0) + tech.certifications_count * 15,
            specializations=len(tech.specializations) * 5 if tech.specializations else 0,
            experience=tech.experience_years * 3,
        )

        return TechnicianReputation(
            technician_id=technician_id,
            points=tech.rank_points,
            rank=tech.rank,
            rank_label=config["label"],
            rank_emoji=config["emoji"],
            rank_color=config["color"],
            progress_percent=round(progress_percent, 1),
            points_to_next=points_to_next,
            next_rank_label=next_rank_label,
            breakdown=breakdown,
            total_services=completed,
            average_rating=tech.average_rating,
            total_ratings=total_ratings,
        )

    async def penalize_cancellation(
        self, session: Session, technician_id: str
    ) -> dict:
        """
        Penaliza al técnico por cancelar un servicio asignado.
        - -15 puntos de reputación
        - Si cancela 2+ veces en 7 días → suspensión 24h
        """
        from datetime import timedelta

        tech = session.exec(
            select(Technician).where(Technician.user_id == UUID(technician_id))
        ).first()
        if not tech:
            return {"penalized": False, "reason": "Técnico no encontrado"}

        now = datetime.utcnow()

        # Deduct 15 points
        tech.rank_points = max(0, tech.rank_points - 15)

        # Recalculate rank
        rank = "bronze"
        for rank_name, threshold in RANK_THRESHOLDS:
            if tech.rank_points >= threshold:
                rank = rank_name
        tech.rank = rank

        # Update cancellation tracking
        tech.cancellation_count += 1
        tech.last_cancellation_at = now

        # Check if within 7-day window
        seven_days_ago = now - timedelta(days=7)
        if tech.last_cancellation_at and tech.last_cancellation_at >= seven_days_ago:
            tech.cancellation_week_count += 1
        else:
            tech.cancellation_week_count = 1

        # Suspend if 2+ cancellations in 7 days
        suspended = False
        if tech.cancellation_week_count >= 2:
            tech.suspended_until = now + timedelta(hours=24)
            tech.is_available = False
            suspended = True

        session.add(tech)
        session.commit()

        return {
            "penalized": True,
            "points_deducted": 15,
            "new_points": tech.rank_points,
            "new_rank": tech.rank,
            "suspended": suspended,
            "suspended_until": tech.suspended_until.isoformat() if suspended else None,
            "week_cancellations": tech.cancellation_week_count,
        }

    async def is_suspended(
        self, session: Session, technician_id: str
    ) -> bool:
        """Check if the technician is currently suspended."""
        tech = session.exec(
            select(Technician).where(Technician.user_id == UUID(technician_id))
        ).first()
        if not tech or not tech.suspended_until:
            return False

        now = datetime.utcnow()
        if now >= tech.suspended_until:
            # Suspension expired — clear it
            tech.suspended_until = None
            tech.is_available = True
            tech.cancellation_week_count = 0
            session.add(tech)
            session.commit()
            return False

        return True


reputation_service = ReputationService()
