"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { 
  GraduationCap, 
  ArrowLeft, 
  Clock, 
  BookOpen, 
  Award, 
  CheckCircle2, 
  PlayCircle, 
  Lock, 
  Star, 
  FileText, 
  Download, 
  Sparkles,
  ShieldCheck,
  ChevronRight,
  AlertTriangle
} from "lucide-react"
import api from "@/lib/api"
import { ProtectedRoute, useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface LessonItem {
  id: string
  course_id: string
  title: string
  slug: string
  video_duration_seconds: number
  sort_order: number
  is_free_preview: boolean
  is_completed: boolean
}

interface CourseDetail {
  id: string
  title: string
  slug: string
  description?: string
  category: string
  thumbnail_url?: string
  difficulty: string
  estimated_hours: number
  instructor_name?: string
  is_published: boolean
  is_paid: boolean
  price: number
  is_required_for_technicians: boolean
  rank_points_reward: number
  badge_name?: string
  badge_icon?: string
  sort_order: number
  enrolled_count: number
  rating: number
  lessons: LessonItem[]
  is_enrolled: boolean
  enrollment_status?: string
  progress_pct: number
  completed_lessons: number
  quiz_passed: boolean
  certificate_code?: string
}

const CATEGORY_NAMES: Record<string, string> = {
  dashcam: "Dashcams HD",
  gps_alarmas: "GPS y Alarmas",
  basicos: "Fundamentos",
  mecanica_basica: "Mecánica y Redes",
  proveedor: "Por Proveedor",
}

function DetailCourseImage({
  thumbnailUrl,
  title,
  category,
}: {
  thumbnailUrl?: string
  title: string
  category: string
}) {
  const [hasError, setHasError] = useState(false)

  if (!thumbnailUrl || hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-900/30 to-slate-900 p-4">
        <GraduationCap className="w-12 h-12 text-purple-400/50 mb-1" />
        <span className="text-[10px] font-semibold text-slate-400">
          {CATEGORY_NAMES[category] || "Escuela Tec"}
        </span>
      </div>
    )
  }

  return (
    <img
      src={thumbnailUrl}
      alt={title}
      onError={() => setHasError(true)}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="w-full h-full object-cover"
    />
  )
}

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string
  const { user } = useAuth()

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    async function loadCourseDetail() {
      if (!slug) return
      try {
        setIsLoading(true)
        const res = await api.courses.getDetail(slug)
        setCourse(res.data)
      } catch (err: any) {
        console.error("Error al cargar detalle del curso:", err)
        setErrorMsg("No se pudo cargar la información del curso.")
      } finally {
        setIsLoading(false)
      }
    }
    loadCourseDetail()
  }, [slug])

  const handleEnroll = async () => {
    if (!course) return
    try {
      setIsEnrolling(true)
      await api.courses.enroll(course.slug)
      // Refresh detail
      const res = await api.courses.getDetail(course.slug)
      setCourse(res.data)
    } catch (err: any) {
      console.error("Error al inscribirse:", err)
      alert("No se pudo completar la inscripción. Intenta nuevamente.")
    } finally {
      setIsEnrolling(false)
    }
  }

  const allLessonsCompleted = course 
    ? course.lessons.length > 0 && course.completed_lessons >= course.lessons.length
    : false

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-slate-950 text-slate-100 pt-24 pb-20 px-4 md:px-8">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="h-8 w-40 bg-slate-900 rounded-lg animate-pulse" />
            <div className="h-72 bg-slate-900 rounded-2xl animate-pulse" />
            <div className="h-96 bg-slate-900 rounded-2xl animate-pulse" />
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!course || errorMsg) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-slate-950 text-slate-100 pt-24 pb-20 px-4 text-center">
          <div className="max-w-md mx-auto py-20 space-y-4">
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
            <h2 className="text-xl font-bold">Curso no encontrado</h2>
            <p className="text-slate-400 text-sm">{errorMsg || "El curso solicitado no existe o fue deshabilitado."}</p>
            <Link href="/escuela">
              <Button variant="outline" className="rounded-xl border-slate-700">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver al Catálogo
              </Button>
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-slate-100 pt-24 pb-24 px-4 md:px-8 relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-10 left-1/3 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-60 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto space-y-8 relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/escuela" className="hover:text-purple-400 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Escuela Tec
            </Link>
            <span>/</span>
            <span className="text-slate-200 truncate">{course.title}</span>
          </div>

          {/* Hero Banner Card */}
          <div className="relative rounded-3xl p-6 md:p-10 border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-purple-950/40 backdrop-blur-2xl shadow-2xl overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              {/* Left Details */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {CATEGORY_NAMES[course.category] || course.category}
                  </span>
                  <span className="px-3 py-1 rounded-md text-xs font-semibold capitalize bg-slate-800 text-slate-300 border border-slate-700">
                    {course.difficulty}
                  </span>
                  {course.is_required_for_technicians && (
                    <span className="px-3 py-1 rounded-md text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-300" /> Requisito Oficial
                    </span>
                  )}
                </div>

                <h1 className="text-2xl md:text-4xl font-extrabold text-white leading-tight">
                  {course.title}
                </h1>

                <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                  {course.description}
                </p>

                {/* Metadata Pills */}
                <div className="flex flex-wrap items-center gap-5 text-xs text-slate-400 pt-2">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-500" /> {course.estimated_hours} horas estimadas
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-slate-500" /> {course.lessons.length} lecciones prácticas
                  </span>
                  <span className="flex items-center gap-1.5 text-purple-400 font-semibold">
                    <Award className="w-4 h-4" /> +{course.rank_points_reward} puntos de rango
                  </span>
                </div>

                {/* Progress if Enrolled */}
                {course.is_enrolled && (
                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Progreso del programa:</span>
                      <span className="font-bold text-white">{course.progress_pct}% completado</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(course.progress_pct, 4)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Action / Thumbnail Card */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-center space-y-5 shadow-xl">
                <div className="rounded-xl overflow-hidden h-36 w-full bg-slate-800 relative">
                  <DetailCourseImage
                    thumbnailUrl={course.thumbnail_url}
                    title={course.title}
                    category={course.category}
                  />
                </div>

                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">Acceso</span>
                  {course.is_paid ? (
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                      ${course.price.toLocaleString("es-CO")} COP
                    </span>
                  ) : (
                    <span className="text-2xl font-black text-emerald-400">
                      100% Gratuito
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                {!course.is_enrolled ? (
                  <Button
                    onClick={handleEnroll}
                    disabled={isEnrolling}
                    className="w-full h-11 font-bold rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-600/30"
                  >
                    {isEnrolling ? "Inscribiendo..." : "Inscribirme al Curso"}
                  </Button>
                ) : course.lessons.length > 0 ? (
                  <Link href={`/escuela/${course.slug}/leccion/${course.lessons[0].slug}`} className="block">
                    <Button className="w-full h-11 font-bold rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-600/30">
                      <PlayCircle className="w-5 h-5 mr-2" /> Continuar Aula Virtual
                    </Button>
                  </Link>
                ) : null}

                <p className="text-[11px] text-slate-500">
                  Acceso 24/7 en plataforma web y app móvil.
                </p>
              </div>
            </div>
          </div>

          {/* Temario / Syllabus */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                Temario de Formación Técnica ({course.lessons.length} lecciones)
              </h2>
            </div>

            <div className="space-y-3">
              {course.lessons.map((lesson, idx) => {
                const isLocked = course.is_paid && !course.is_enrolled && !lesson.is_free_preview

                return (
                  <div
                    key={lesson.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      lesson.is_completed
                        ? "bg-emerald-950/20 border-emerald-500/30 text-white"
                        : "bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-purple-500/30 text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                        lesson.is_completed
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "bg-slate-800 text-slate-400"
                      }`}>
                        {lesson.is_completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          idx + 1
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-white">
                            {lesson.title}
                          </h4>
                          {lesson.is_free_preview && !course.is_enrolled && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                              Vista Gratuita
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {Math.round(lesson.video_duration_seconds / 60)} min de duración
                        </span>
                      </div>
                    </div>

                    <div>
                      {isLocked ? (
                        <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                          <Lock className="w-3.5 h-3.5" /> Bloqueado
                        </span>
                      ) : (
                        <Link href={`/escuela/${course.slug}/leccion/${lesson.slug}`}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="rounded-lg text-xs font-semibold text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                          >
                            {lesson.is_completed ? "Repasar" : "Ver Lección"} <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Final Certification Exam Card */}
          <div className="rounded-2xl p-6 md:p-8 border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-400">
                  <Award className="w-4 h-4 text-amber-400" />
                  Certificación Oficial con 100% de Rigor
                </div>
                <h3 className="text-xl font-bold text-white">
                  Examen de Evaluación Técnica
                </h3>
                <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                  Para emitir tu diploma con código de validación satelital y sumar los <strong className="text-purple-300">+{course.rank_points_reward} puntos</strong> a tu perfil, debes responder correctamente el 100% del cuestionario.
                </p>
              </div>

              <div>
                {course.quiz_passed ? (
                  <div className="space-y-2 text-right">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aprobado al 100%
                    </span>
                    <p className="text-xs text-slate-400 font-mono">
                      Cód: {course.certificate_code}
                    </p>
                    <div className="flex items-center gap-2 justify-end pt-1">
                      <a 
                        href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/courses/certificates/${course.certificate_code}/download`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button size="sm" className="rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                          <Download className="w-3.5 h-3.5" /> Descargar Diploma PDF
                        </Button>
                      </a>
                    </div>
                  </div>
                ) : allLessonsCompleted ? (
                  <Link href={`/escuela/${course.slug}/quiz`}>
                    <Button className="rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20">
                      <Award className="w-4 h-4 mr-2" /> Iniciar Examen de Certificación
                    </Button>
                  </Link>
                ) : (
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block mb-1">
                      {course.completed_lessons} de {course.lessons.length} lecciones vistas
                    </span>
                    <Button disabled variant="outline" className="rounded-xl border-slate-800 text-slate-500">
                      <Lock className="w-3.5 h-3.5 mr-2" /> Completa las lecciones primero
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}