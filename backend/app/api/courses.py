"""
Escuela Tec API Router
Plataforma de formación y certificación e-learning estilo Platzi
para técnicos de instalación de seguridad vehicular.
"""
import uuid
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status, Response
from sqlmodel import Session, select, func, or_
from app.core.database import get_session
from app.core.security import get_current_user, get_optional_user, require_roles
from app.models.user import User
from app.models.technician import Technician, calculate_rank_points
from app.models.course import (
    Course,
    Lesson,
    CourseQuiz,
    Enrollment,
    LessonProgress,
    CourseCategory,
    EnrollmentStatus,
)
from app.schemas.course import (
    CourseListItem,
    CourseDetailResponse,
    CourseCreate,
    CourseUpdate,
    LessonCreate,
    LessonDetail,
    LessonSummary,
    QuizQuestionCreate,
    QuizQuestionResponse,
    QuizSubmission,
    QuizEvaluationResult,
    CertificateInfo,
)

from app.services.pdf_service import PDFService

router = APIRouter(prefix="/courses", tags=["Escuela Tec"])


# ============================================
# ENDPOINTS PÚBLICOS DEL CATÁLOGO
# ============================================

@router.get("", response_model=List[CourseListItem])
async def list_courses(
    category: Optional[str] = Query(None, description="Filtrar por categoría (dashcam, gps_alarmas, basicos, mecanica_basica, proveedor)"),
    difficulty: Optional[str] = Query(None, description="Filtrar por dificultad (beginner, intermediate, advanced)"),
    search: Optional[str] = Query(None, description="Búsqueda por título o descripción"),
    is_free: Optional[bool] = Query(None, description="Filtrar cursos gratuitos"),
    is_required: Optional[bool] = Query(None, description="Filtrar cursos obligatorios para técnicos"),
    session: Session = Depends(get_session),
    current_user: Optional[dict] = Depends(get_optional_user),
):
    """
    Lista todos los cursos publicados en la Escuela Tec.
    Si el usuario está autenticado, incluye el estado de inscripción y avance.
    """
    query = select(Course).where(Course.is_published.is_(True)).order_by(Course.sort_order.asc(), Course.created_at.asc())

    if category:
        query = query.where(Course.category == category)
    if difficulty:
        query = query.where(Course.difficulty == difficulty)
    if is_free is not None:
        query = query.where(Course.is_paid == (not is_free))
    if is_required is not None:
        query = query.where(Course.is_required_for_technicians == is_required)
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            or_(
                Course.title.ilike(search_filter),
                Course.description.ilike(search_filter),
            )
        )

    courses = session.exec(query).all()

    # Pre-fetch user enrollments if authenticated
    enrollments_by_course = {}
    if current_user and current_user.get("id"):
        try:
            u_id = uuid.UUID(str(current_user["id"]))
            user_enrollments = session.exec(
                select(Enrollment).where(Enrollment.user_id == u_id)
            ).all()
            enrollments_by_course = {e.course_id: e for e in user_enrollments}
        except Exception:
            pass

    # Pre-fetch lesson counts
    lesson_counts = {}
    lessons = session.exec(
        select(Lesson.course_id, func.count(Lesson.id))
        .where(Lesson.is_published.is_(True))
        .group_by(Lesson.course_id)
    ).all()
    for c_id, count in lessons:
        lesson_counts[c_id] = count


    result = []
    for c in courses:
        enrollment = enrollments_by_course.get(c.id)
        result.append(
            CourseListItem(
                id=c.id,
                title=c.title,
                slug=c.slug,
                description=c.description,
                category=c.category,
                thumbnail_url=c.thumbnail_url,
                difficulty=c.difficulty,
                estimated_hours=c.estimated_hours,
                instructor_name=c.instructor_name,
                is_published=c.is_published,
                is_paid=c.is_paid,
                price=c.price,
                is_required_for_technicians=c.is_required_for_technicians,
                rank_points_reward=c.rank_points_reward,
                badge_name=c.badge_name,
                badge_icon=c.badge_icon,
                sort_order=c.sort_order,
                enrolled_count=c.enrolled_count,
                rating=c.rating,
                lessons_count=lesson_counts.get(c.id, 0),
                is_enrolled=enrollment is not None,
                progress_pct=enrollment.progress_pct if enrollment else 0.0,
                is_completed=(enrollment.status == EnrollmentStatus.completed.value) if enrollment else False,
            )
        )

    return result


@router.get("/categories")
async def list_course_categories():
    """Retorna las categorías disponibles y sus metadatos visuales."""
    return [
        {
            "id": CourseCategory.dashcam.value,
            "label": "Dashcams HD y Cámaras",
            "icon": "camera",
            "color": "#38bdf8",
            "description": "Instalación oculta de cámaras frontal, cabina y trasera con modo centinela 24/7."
        },
        {
            "id": CourseCategory.gps_alarmas.value,
            "label": "GPS y Alarmas Inteligentes",
            "icon": "radio",
            "color": "#a855f7",
            "description": "Rastreadores 4G, relé de corte de motor y alarmas con vinculación telemática."
        },
        {
            "id": CourseCategory.basicos.value,
            "label": "Fundamentos e Inducción",
            "icon": "shield-check",
            "color": "#22c55e",
            "description": "Protocolos de seguridad, herramientas de oro y estándares de calidad Tec360."
        },
        {
            "id": CourseCategory.mecanica_basica.value,
            "label": "Mecánica Básica y Redes",
            "icon": "cpu",
            "color": "#eab308",
            "description": "Diagnóstico eléctrico, uso de multímetro y prevención de fallas en redes CAN-Bus."
        },
        {
            "id": CourseCategory.proveedor.value,
            "label": "Hardware por Proveedor",
            "icon": "truck",
            "color": "#ec4899",
            "description": "Telemetría avanzada de grado industrial en Queclink, Teltonika y flotas de 24V."
        },
    ]


@router.get("/my-courses")
async def get_my_courses(
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """Retorna los cursos en los que el usuario autenticado está inscrito."""
    u_id = uuid.UUID(str(current_user["id"]))
    enrollments = session.exec(
        select(Enrollment).where(Enrollment.user_id == u_id).order_by(Enrollment.updated_at.desc())
    ).all()

    items = []
    for enr in enrollments:
        course = session.get(Course, enr.course_id)
        if not course:
            continue
        lessons_count = session.exec(
            select(func.count(Lesson.id)).where(Lesson.course_id == course.id, Lesson.is_published.is_(True))
        ).one()

        items.append({
            "enrollment_id": enr.id,
            "course": {
                "id": course.id,
                "title": course.title,
                "slug": course.slug,
                "description": course.description,
                "category": course.category,
                "thumbnail_url": course.thumbnail_url,
                "difficulty": course.difficulty,
                "estimated_hours": course.estimated_hours,
                "badge_name": course.badge_name,
                "badge_icon": course.badge_icon,
                "rank_points_reward": course.rank_points_reward,
                "lessons_count": lessons_count,
            },
            "status": enr.status,
            "progress_pct": enr.progress_pct,
            "completed_lessons": enr.completed_lessons,
            "quiz_passed": enr.quiz_passed,
            "quiz_score": enr.quiz_score,
            "certificate_code": enr.certificate_code,
            "enrolled_at": enr.enrolled_at,
            "completed_at": enr.completed_at,
        })

    return items


# ============================================
# DETALLE DEL CURSO Y LECCIONES
# ============================================

@router.get("/{slug}", response_model=CourseDetailResponse)
async def get_course_detail(
    slug: str = Path(..., description="Slug del curso"),
    session: Session = Depends(get_session),
    current_user: Optional[dict] = Depends(get_optional_user),
):
    """Retorna la ficha técnica completa del curso, temario y avance del usuario."""
    course = session.exec(select(Course).where(Course.slug == slug)).first()
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")

    lessons = session.exec(
        select(Lesson)
        .where(Lesson.course_id == course.id, Lesson.is_published.is_(True))
        .order_by(Lesson.sort_order.asc(), Lesson.created_at.asc())
    ).all()

    # Check enrollment & completed lessons
    enrollment = None
    completed_lesson_ids = set()
    if current_user and current_user.get("id"):
        try:
            u_id = uuid.UUID(str(current_user["id"]))
            enrollment = session.exec(
                select(Enrollment).where(Enrollment.user_id == u_id, Enrollment.course_id == course.id)
            ).first()

            if enrollment:
                progress_records = session.exec(
                    select(LessonProgress).where(
                        LessonProgress.enrollment_id == enrollment.id,
                        LessonProgress.completed.is_(True)
                    )
                ).all()
                completed_lesson_ids = {p.lesson_id for p in progress_records}
        except Exception:
            pass

    lesson_summaries = [
        LessonSummary(
            id=les.id,
            course_id=les.course_id,
            title=les.title,
            slug=les.slug,
            video_duration_seconds=les.video_duration_seconds,
            sort_order=les.sort_order,
            is_free_preview=les.is_free_preview,
            is_completed=les.id in completed_lesson_ids,
        )
        for les in lessons
    ]

    return CourseDetailResponse(
        id=course.id,
        title=course.title,
        slug=course.slug,
        description=course.description,
        category=course.category,
        thumbnail_url=course.thumbnail_url,
        difficulty=course.difficulty,
        estimated_hours=course.estimated_hours,
        instructor_name=course.instructor_name,
        is_published=course.is_published,
        is_paid=course.is_paid,
        price=course.price,
        is_required_for_technicians=course.is_required_for_technicians,
        rank_points_reward=course.rank_points_reward,
        badge_name=course.badge_name,
        badge_icon=course.badge_icon,
        sort_order=course.sort_order,
        enrolled_count=course.enrolled_count,
        rating=course.rating,
        lessons=lesson_summaries,
        is_enrolled=enrollment is not None,
        enrollment_status=enrollment.status if enrollment else None,
        progress_pct=enrollment.progress_pct if enrollment else 0.0,
        completed_lessons=enrollment.completed_lessons if enrollment else 0,
        quiz_passed=enrollment.quiz_passed if enrollment else False,
        certificate_code=enrollment.certificate_code if enrollment else None,
    )


@router.get("/{slug}/lessons/{lesson_identifier}", response_model=LessonDetail)
async def get_lesson_detail(
    slug: str = Path(..., description="Slug del curso"),
    lesson_identifier: str = Path(..., description="Slug o ID de la lección"),
    session: Session = Depends(get_session),
    current_user: Optional[dict] = Depends(get_optional_user),
):
    """
    Retorna el contenido completo de una lección (video embebido y markdown explicativo).
    Valida permisos de acceso si el curso es de pago.
    """
    course = session.exec(select(Course).where(Course.slug == slug)).first()
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")

    # Find lesson by ID or slug
    lesson = None
    try:
        l_uuid = uuid.UUID(lesson_identifier)
        lesson = session.exec(
            select(Lesson).where(Lesson.id == l_uuid, Lesson.course_id == course.id)
        ).first()
    except ValueError:
        lesson = session.exec(
            select(Lesson).where(Lesson.slug == lesson_identifier, Lesson.course_id == course.id)
        ).first()

    if not lesson:
        raise HTTPException(status_code=404, detail="Lección no encontrada")

    # Check enrollment & payment access
    is_completed = False
    enrollment = None
    if current_user and current_user.get("id"):
        try:
            u_id = uuid.UUID(str(current_user["id"]))
            enrollment = session.exec(
                select(Enrollment).where(Enrollment.user_id == u_id, Enrollment.course_id == course.id)
            ).first()

            if enrollment:
                prog = session.exec(
                    select(LessonProgress).where(
                        LessonProgress.enrollment_id == enrollment.id,
                        LessonProgress.lesson_id == lesson.id
                    )
                ).first()
                if prog and prog.completed:
                    is_completed = True
        except Exception:
            pass

    # If course is paid and user is not enrolled and it's not a free preview -> block
    if course.is_paid and not enrollment and not lesson.is_free_preview:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este curso requiere inscripción o pago para acceder a esta lección."
        )

    # Next / Prev lessons
    all_lessons = session.exec(
        select(Lesson)
        .where(Lesson.course_id == course.id, Lesson.is_published.is_(True))
        .order_by(Lesson.sort_order.asc(), Lesson.created_at.asc())
    ).all()

    prev_slug = None
    next_slug = None
    for i, les in enumerate(all_lessons):
        if les.id == lesson.id:
            if i > 0:
                prev_slug = all_lessons[i - 1].slug
            if i < len(all_lessons) - 1:
                next_slug = all_lessons[i + 1].slug
            break

    return LessonDetail(
        id=lesson.id,
        course_id=lesson.course_id,
        title=lesson.title,
        slug=lesson.slug,
        content_markdown=lesson.content_markdown,
        video_url=lesson.video_url,
        video_duration_seconds=lesson.video_duration_seconds,
        sort_order=lesson.sort_order,
        is_free_preview=lesson.is_free_preview,
        is_completed=is_completed,
        next_lesson_slug=next_slug,
        prev_lesson_slug=prev_slug,
    )


# ============================================
# INSCRIPCIÓN Y AVANCE DE LECCIONES
# ============================================

@router.post("/{slug}/enroll")
async def enroll_course(
    slug: str = Path(..., description="Slug del curso"),
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """Inscribe al usuario actual en el curso."""
    course = session.exec(select(Course).where(Course.slug == slug)).first()
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")

    u_id = uuid.UUID(str(current_user["id"]))

    existing = session.exec(
        select(Enrollment).where(Enrollment.user_id == u_id, Enrollment.course_id == course.id)
    ).first()

    if existing:
        return {
            "success": True,
            "message": "Ya estás inscrito en este curso",
            "enrollment_id": existing.id,
            "status": existing.status,
            "progress_pct": existing.progress_pct,
        }

    enrollment = Enrollment(
        user_id=u_id,
        course_id=course.id,
        status=EnrollmentStatus.enrolled.value,
        progress_pct=0.0,
        completed_lessons=0,
    )
    session.add(enrollment)

    # Increment course count
    course.enrolled_count += 1
    session.add(course)
    session.commit()
    session.refresh(enrollment)

    return {
        "success": True,
        "message": f"Te has inscrito exitosamente en {course.title}",
        "enrollment_id": enrollment.id,
        "status": enrollment.status,
        "progress_pct": 0.0,
    }


@router.post("/{slug}/lessons/{lesson_id}/complete")
async def mark_lesson_complete(
    slug: str = Path(...),
    lesson_id: uuid.UUID = Path(...),
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """Marca una lección como completada y recalcula el progreso porcentual."""
    course = session.exec(select(Course).where(Course.slug == slug)).first()
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")

    lesson = session.get(Lesson, lesson_id)
    if not lesson or lesson.course_id != course.id:
        raise HTTPException(status_code=404, detail="Lección no encontrada")

    u_id = uuid.UUID(str(current_user["id"]))
    enrollment = session.exec(
        select(Enrollment).where(Enrollment.user_id == u_id, Enrollment.course_id == course.id)
    ).first()

    # If not enrolled yet, auto-enroll
    if not enrollment:
        enrollment = Enrollment(
            user_id=u_id,
            course_id=course.id,
            status=EnrollmentStatus.in_progress.value,
        )
        session.add(enrollment)
        course.enrolled_count += 1
        session.add(course)
        session.commit()
        session.refresh(enrollment)

    # Record lesson progress
    progress_rec = session.exec(
        select(LessonProgress).where(
            LessonProgress.enrollment_id == enrollment.id,
            LessonProgress.lesson_id == lesson.id
        )
    ).first()

    now = datetime.utcnow()
    if not progress_rec:
        progress_rec = LessonProgress(
            enrollment_id=enrollment.id,
            lesson_id=lesson.id,
            completed=True,
            completed_at=now,
        )
        session.add(progress_rec)
    else:
        progress_rec.completed = True
        progress_rec.completed_at = now
        session.add(progress_rec)

    session.commit()

    # Recalculate progress
    total_lessons = session.exec(
        select(func.count(Lesson.id)).where(Lesson.course_id == course.id, Lesson.is_published.is_(True))
    ).one()

    completed_count = session.exec(
        select(func.count(LessonProgress.id)).where(
            LessonProgress.enrollment_id == enrollment.id,
            LessonProgress.completed.is_(True)
        )
    ).one()

    pct = round((completed_count / total_lessons * 100.0), 1) if total_lessons > 0 else 100.0

    enrollment.completed_lessons = completed_count
    enrollment.progress_pct = min(pct, 100.0)
    if enrollment.status != EnrollmentStatus.completed.value:
        enrollment.status = EnrollmentStatus.in_progress.value
    enrollment.updated_at = now

    session.add(enrollment)
    session.commit()
    session.refresh(enrollment)

    return {
        "success": True,
        "completed": True,
        "completed_lessons": completed_count,
        "total_lessons": total_lessons,
        "progress_pct": enrollment.progress_pct,
        "can_take_quiz": completed_count >= total_lessons,
    }


# ============================================
# EVALUACIÓN / QUIZ DE CERTIFICACIÓN (ESTRICTO 100%)
# ============================================

@router.get("/{slug}/quiz", response_model=List[QuizQuestionResponse])
async def get_course_quiz(
    slug: str = Path(...),
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Retorna el cuestionario de certificación del curso.
    Oculta intencionalmente las respuestas correctas para evitar fraude.
    """
    course = session.exec(select(Course).where(Course.slug == slug)).first()
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")

    quizzes = session.exec(
        select(CourseQuiz)
        .where(CourseQuiz.course_id == course.id)
        .order_by(CourseQuiz.sort_order.asc(), CourseQuiz.id.asc())
    ).all()

    return [
        QuizQuestionResponse(
            id=q.id,
            question_text=q.question_text,
            options=q.options,
            sort_order=q.sort_order,
        )
        for q in quizzes
    ]


@router.post("/{slug}/quiz/submit", response_model=QuizEvaluationResult)
async def submit_course_quiz(
    slug: str = Path(...),
    payload: QuizSubmission = ...,
    session: Session = Depends(get_session),
    current_user: dict = Depends(get_current_user),
):
    """
    Evalúa el cuestionario de certificación.
    REGLA ESTRICTA DE SEGURIDAD: 100% de respuestas correctas requeridas para aprobar.
    Al aprobar, genera el código único de certificación, otorga los puntos de rango
    al perfil del técnico y asigna la insignia de especialización.
    """
    course = session.exec(select(Course).where(Course.slug == slug)).first()
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")

    u_id = uuid.UUID(str(current_user["id"]))
    enrollment = session.exec(
        select(Enrollment).where(Enrollment.user_id == u_id, Enrollment.course_id == course.id)
    ).first()

    if not enrollment:
        raise HTTPException(status_code=400, detail="Debes estar inscrito en el curso para tomar la evaluación.")

    questions = session.exec(
        select(CourseQuiz).where(CourseQuiz.course_id == course.id)
    ).all()

    if not questions:
        raise HTTPException(status_code=400, detail="Este curso no tiene preguntas de evaluación configuradas.")

    question_map = {q.id: q for q in questions}
    total_q = len(questions)
    correct_count = 0

    for item in payload.answers:
        q = question_map.get(item.question_id)
        if q and q.correct_option_index == item.selected_option_index:
            correct_count += 1

    score_pct = round((correct_count / total_q) * 100.0, 1)
    # REGLA ESTRICTA 100%: Solo aprueba si todas las respuestas son correctas
    passed = (correct_count == total_q)

    now = datetime.utcnow()
    enrollment.quiz_score = score_pct
    enrollment.updated_at = now

    rank_points_awarded = 0
    badge_awarded = None
    cert_code = enrollment.certificate_code

    if passed:
        enrollment.quiz_passed = True
        enrollment.status = EnrollmentStatus.completed.value
        enrollment.completed_at = now
        enrollment.progress_pct = 100.0

        if not cert_code:
            hex_part1 = uuid.uuid4().hex[:4].upper()
            hex_part2 = uuid.uuid4().hex[4:8].upper()
            cert_code = f"TEC-{course.category.upper()[:3]}-{hex_part1}-{hex_part2}"
            enrollment.certificate_code = cert_code

        # Recompensa a perfil de técnico si aplica
        try:
            technician = session.exec(
                select(Technician).where(Technician.user_id == u_id)
            ).first()

            if technician:
                rank_points_awarded = course.rank_points_reward
                technician.rank_points += rank_points_awarded
                technician.certifications_count += 1

                # Asignar especialización si no la tiene
                if course.badge_name:
                    badge_awarded = course.badge_name
                    specs = list(technician.specializations or [])
                    if badge_awarded not in specs:
                        specs.append(badge_awarded)
                        technician.specializations = specs

                # Recalcular Rango (Bronce -> Plata -> Oro -> Élite)
                pts, new_rank = calculate_rank_points(
                    total_services=technician.total_services,
                    experience_years=technician.experience_years,
                    certifications_count=technician.certifications_count,
                    average_rating=technician.average_rating,
                    is_verified=technician.is_verified,
                    specializations_count=len(technician.specializations or []),
                )
                technician.rank = new_rank
                session.add(technician)
        except Exception as tech_err:
            print(f"Aviso: no se pudo actualizar puntos del técnico: {tech_err}")

        message = (
            f"¡Felicitaciones! Has obtenido un puntaje perfecto del 100% ({correct_count}/{total_q}). "
            f"Tu certificado oficial ha sido emitido con el código {cert_code}."
        )
    else:
        message = (
            f"Obtuviste {correct_count} de {total_q} preguntas correctas ({score_pct}%). "
            f"El estándar de excelencia de Tec360 exige el 100% para certificar. "
            f"Revisa las lecciones y vuelve a intentarlo."
        )

    session.add(enrollment)
    session.commit()
    session.refresh(enrollment)

    return QuizEvaluationResult(
        score=score_pct,
        passed=passed,
        total_questions=total_q,
        correct_answers=correct_count,
        required_score=100.0,
        certificate_code=cert_code if passed else None,
        rank_points_awarded=rank_points_awarded,
        badge_awarded=badge_awarded,
        message=message,
    )


# ============================================
# CERTIFICADOS OFICIALES Y DESCARGA PDF
# ============================================

@router.get("/certificates/{certificate_code}", response_model=CertificateInfo)
async def verify_certificate(
    certificate_code: str = Path(...),
    session: Session = Depends(get_session),
):
    """Punto de verificación público para comprobar la autenticidad de un certificado."""
    enrollment = session.exec(
        select(Enrollment).where(Enrollment.certificate_code == certificate_code)
    ).first()

    if not enrollment or not enrollment.quiz_passed:
        raise HTTPException(status_code=404, detail="Certificado no encontrado o no válido.")

    course = session.get(Course, enrollment.course_id)
    user = None
    try:
        user = session.get(User, enrollment.user_id)
    except Exception:
        pass

    student_name = user.full_name if (user and user.full_name) else (user.email if user else "Técnico Certificado")

    return CertificateInfo(
        certificate_code=enrollment.certificate_code,
        student_name=student_name,
        course_title=course.title if course else "Especialización Técnica",
        category=course.category if course else "Seguridad Vehicular",
        completion_date=enrollment.completed_at or enrollment.updated_at,
        score=enrollment.quiz_score or 100.0,
        instructor_name=course.instructor_name if course else "Equipo Técnico Tec360",
        is_valid=True,
    )


@router.get("/certificates/{certificate_code}/download")
async def download_certificate_pdf(
    certificate_code: str = Path(...),
    session: Session = Depends(get_session),
):
    """Genera y descarga el diploma PDF oficial en alta resolución."""
    enrollment = session.exec(
        select(Enrollment).where(Enrollment.certificate_code == certificate_code)
    ).first()

    if not enrollment or not enrollment.quiz_passed:
        raise HTTPException(status_code=404, detail="Certificado no encontrado o no válido.")

    course = session.get(Course, enrollment.course_id)
    user = None
    try:
        user = session.get(User, enrollment.user_id)
    except Exception:
        pass

    student_name = (user.full_name or user.email) if user else "Técnico Certificado"

    course_title = course.title if course else "Especialización Técnica"
    category = course.category if course else "Seguridad Vehicular"
    completion_date_str = (enrollment.completed_at or enrollment.updated_at).strftime("%d/%m/%Y")
    instructor = course.instructor_name if course else "Equipo Técnico Tec360"

    pdf_bytes = PDFService.generate_certificate(
        student_name=student_name,
        course_title=course_title,
        category=category,
        completion_date=completion_date_str,
        cert_code=enrollment.certificate_code,
        instructor_name=instructor,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=Certificado_Tec360_{certificate_code}.pdf"
        }
    )


# ============================================
# ENDPOINTS ADMINISTRATIVOS (SOLO ADMIN)
# ============================================

@router.post("", dependencies=[Depends(require_roles("admin"))])
async def create_course(
    payload: CourseCreate,
    session: Session = Depends(get_session),
):
    """Crea un nuevo curso (solo administradores)."""
    slug = payload.slug or payload.title.lower().replace(" ", "-")
    existing = session.exec(select(Course).where(Course.slug == slug)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un curso con este slug.")

    course = Course(**payload.dict())
    course.slug = slug
    session.add(course)
    session.commit()
    session.refresh(course)
    return {"success": True, "course_id": course.id, "slug": course.slug}


@router.put("/{course_id}", dependencies=[Depends(require_roles("admin"))])
async def update_course(
    course_id: uuid.UUID,
    payload: CourseUpdate,
    session: Session = Depends(get_session),
):
    """Actualiza un curso existente (solo administradores)."""
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")

    for k, v in payload.dict(exclude_unset=True).items():
        setattr(course, k, v)

    course.updated_at = datetime.utcnow()
    session.add(course)
    session.commit()
    session.refresh(course)
    return {"success": True, "course_id": course.id}


@router.delete("/{course_id}", dependencies=[Depends(require_roles("admin"))])
async def delete_course(
    course_id: uuid.UUID,
    session: Session = Depends(get_session),
):
    """Elimina un curso (solo administradores)."""
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")

    session.delete(course)
    session.commit()
    return {"success": True, "message": "Curso eliminado correctamente."}


@router.post("/{course_id}/lessons", dependencies=[Depends(require_roles("admin"))])
async def add_lesson_to_course(
    course_id: uuid.UUID,
    payload: LessonCreate,
    session: Session = Depends(get_session),
):
    """Agrega una nueva lección a un curso (solo administradores)."""
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")

    slug = payload.slug or payload.title.lower().replace(" ", "-")
    lesson = Lesson(course_id=course.id, **payload.dict())
    lesson.slug = slug
    session.add(lesson)
    session.commit()
    session.refresh(lesson)
    return {"success": True, "lesson_id": lesson.id, "slug": lesson.slug}


@router.post("/{course_id}/quiz", dependencies=[Depends(require_roles("admin"))])
async def add_quiz_question(
    course_id: uuid.UUID,
    payload: QuizQuestionCreate,
    session: Session = Depends(get_session),
):
    """Agrega una pregunta al quiz del curso (solo administradores)."""
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Curso no encontrado")

    quiz = CourseQuiz(course_id=course.id, **payload.dict())
    session.add(quiz)
    session.commit()
    session.refresh(quiz)
    return {"success": True, "question_id": quiz.id}

