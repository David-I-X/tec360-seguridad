"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  PlayCircle,
  Clock,
  BookOpen,
  Award,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  AlertTriangle,
  FileText,
  Lock,
  Sparkles,
  ShieldCheck,
  Check,
  Tv,
  ListOrdered,
  ExternalLink
} from "lucide-react"
import api from "@/lib/api"
import { ProtectedRoute, useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"

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
  category: string
  lessons: LessonItem[]
  progress_pct: number
  completed_lessons: number
  quiz_passed: boolean
  rank_points_reward: number
}

interface LessonDetailData {
  id: string
  course_id: string
  title: string
  slug: string
  content_markdown?: string | null
  video_url?: string | null
  video_duration_seconds: number
  sort_order: number
  is_free_preview: boolean
  is_completed: boolean
  next_lesson_slug?: string | null
  prev_lesson_slug?: string | null
}

function getEmbedUrl(url?: string | null): string | null {
  if (!url) return null
  // YouTube
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`
  }
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/)
  if (vimeoMatch && vimeoMatch[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  }
  return url
}

// Markdown technical guide viewer
function TechnicalGuideViewer({ content }: { content?: string | null }) {
  if (!content) {
    return (
      <div className="p-8 text-center text-slate-500 border border-slate-800 rounded-2xl bg-slate-900/30">
        <FileText className="w-10 h-10 mx-auto mb-2 text-slate-600" />
        <p className="text-sm">Esta lección se enfoca en el video instructivo superior.</p>
      </div>
    )
  }

  // Split into lines/paragraphs and render technical elements
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []

  let listBuffer: { type: "bullet" | "number"; items: string[] } | null = null

  const flushList = (key: string) => {
    if (!listBuffer) return
    if (listBuffer.type === "bullet") {
      elements.push(
        <ul key={key} className="space-y-2.5 my-4">
          {listBuffer.items.map((item, idx) => {
            const hasColon = item.includes(":")
            const parts = hasColon ? item.split(":") : [item]
            const titlePart = parts[0].replace(/\*\*/g, "").trim()
            const bodyPart = parts.slice(1).join(":").trim()

            const isWarning = titlePart.toLowerCase().includes("prohibid") || titlePart.toLowerCase().includes("peligro")

            return (
              <li
                key={idx}
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
                  isWarning
                    ? "bg-rose-950/20 border-rose-500/30 text-rose-200"
                    : "bg-slate-900/50 border-slate-800/80 text-slate-300"
                }`}
              >
                <div className="mt-0.5">
                  {isWarning ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  )}
                </div>
                <div className="text-sm leading-relaxed">
                  {hasColon ? (
                    <>
                      <strong className={`font-semibold ${isWarning ? "text-rose-300" : "text-white"}`}>
                        {titlePart}:
                      </strong>{" "}
                      <span>{bodyPart}</span>
                    </>
                  ) : (
                    <span>{item.replace(/\*\*/g, "")}</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )
    } else {
      elements.push(
        <div key={key} className="space-y-3 my-4">
          {listBuffer.items.map((item, idx) => {
            const hasColon = item.includes(":")
            const parts = hasColon ? item.split(":") : [item]
            const titlePart = parts[0].replace(/\*\*/g, "").trim()
            const bodyPart = parts.slice(1).join(":").trim()

            return (
              <div
                key={idx}
                className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300"
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-bold shrink-0 border border-purple-500/30">
                  {idx + 1}
                </span>
                <div className="text-sm leading-relaxed">
                  {hasColon ? (
                    <>
                      <strong className="text-white font-semibold block mb-0.5">{titlePart}</strong>
                      <span className="text-slate-300">{bodyPart}</span>
                    </>
                  ) : (
                    <span>{item.replace(/\*\*/g, "")}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )
    }
    listBuffer = null
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim()
    if (!rawLine) {
      if (listBuffer) flushList(`list-${i}`)
      continue
    }

    if (rawLine.startsWith("### ")) {
      if (listBuffer) flushList(`list-before-h3-${i}`)
      elements.push(
        <div key={`h3-${i}`} className="mt-8 mb-4 pt-4 border-t border-slate-800/80 first:mt-0 first:pt-0 first:border-0">
          <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2.5">
            <span className="w-1.5 h-5 bg-gradient-to-b from-purple-400 to-blue-500 rounded-full" />
            {rawLine.replace("### ", "")}
          </h3>
        </div>
      )
      continue
    }

    if (rawLine.startsWith("#### ")) {
      if (listBuffer) flushList(`list-before-h4-${i}`)
      elements.push(
        <h4 key={`h4-${i}`} className="text-base font-bold text-purple-300 mt-6 mb-3 flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-purple-400" />
          {rawLine.replace("#### ", "")}
        </h4>
      )
      continue
    }

    if (rawLine.startsWith("- ")) {
      const itemText = rawLine.replace("- ", "")
      if (!listBuffer || listBuffer.type !== "bullet") {
        if (listBuffer) flushList(`list-switch-${i}`)
        listBuffer = { type: "bullet", items: [] }
      }
      listBuffer.items.push(itemText)
      continue
    }

    const numMatch = rawLine.match(/^([0-9]+)\.\s+(.*)/)
    if (numMatch) {
      const itemText = numMatch[2]
      if (!listBuffer || listBuffer.type !== "number") {
        if (listBuffer) flushList(`list-switch-${i}`)
        listBuffer = { type: "number", items: [] }
      }
      listBuffer.items.push(itemText)
      continue
    }

    // Normal paragraph
    if (listBuffer) flushList(`list-end-${i}`)
    elements.push(
      <p key={`p-${i}`} className="text-slate-300 text-sm md:text-base leading-relaxed my-3">
        {rawLine}
      </p>
    )
  }

  if (listBuffer) flushList("list-final")

  return <div className="space-y-2">{elements}</div>
}

export default function AulaVirtualPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string
  const lessonSlug = params?.lessonSlug as string
  const { user } = useAuth()

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [lesson, setLesson] = useState<LessonDetailData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCompleting, setIsCompleting] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [completionSuccess, setCompletionSuccess] = useState(false)

  // Load course and lesson
  useEffect(() => {
    async function loadData() {
      if (!slug || !lessonSlug) return
      try {
        setIsLoading(true)
        setCompletionSuccess(false)
        const [cRes, lRes] = await Promise.all([
          api.courses.getDetail(slug),
          api.courses.getLesson(slug, lessonSlug),
        ])
        setCourse(cRes.data)
        setLesson(lRes.data)
      } catch (err: any) {
        console.error("Error al cargar lección:", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [slug, lessonSlug])

  const handleCompleteLesson = async () => {
    if (!lesson || !course) return
    try {
      setIsCompleting(true)
      const res = await api.courses.completeLesson(course.slug, lesson.id)
      
      // Update local state
      setLesson((prev) => (prev ? { ...prev, is_completed: true } : null))
      setCompletionSuccess(true)

      // Refresh course progress
      const cRes = await api.courses.getDetail(course.slug)
      setCourse(cRes.data)

      // If there is a next lesson, we can either navigate or keep user informed
      if (lesson.next_lesson_slug) {
        setTimeout(() => {
          router.push(`/escuela/${course.slug}/leccion/${lesson.next_lesson_slug}`)
        }, 1200)
      }
    } catch (err: any) {
      console.error("Error completando lección:", err)
      alert("No se pudo registrar el avance de la lección.")
    } finally {
      setIsCompleting(false)
    }
  }

  const allLessonsCompleted = useMemo(() => {
    if (!course) return false
    return course.completed_lessons >= course.lessons.length && course.lessons.length > 0
  }, [course])

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-slate-950 text-slate-100 pt-24 pb-20 px-4 md:px-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="aspect-video bg-slate-900 rounded-2xl animate-pulse" />
              <div className="h-8 w-2/3 bg-slate-900 rounded-lg animate-pulse" />
              <div className="h-40 bg-slate-900 rounded-xl animate-pulse" />
            </div>
            <div className="hidden lg:block h-96 bg-slate-900 rounded-2xl animate-pulse" />
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!course || !lesson) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-slate-950 text-slate-100 pt-24 pb-20 px-4 text-center">
          <div className="max-w-md mx-auto py-20 space-y-4">
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
            <h2 className="text-xl font-bold">Lección no disponible</h2>
            <p className="text-slate-400 text-sm">
              La lección solicitada no existe o requiere inscripción previa.
            </p>
            <Link href={`/escuela/${slug}`}>
              <Button variant="outline" className="rounded-xl border-slate-700">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver al Curso
              </Button>
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  const embedUrl = getEmbedUrl(lesson.video_url)

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-slate-100 pt-24 pb-20 px-4 md:px-8 relative overflow-hidden">
        {/* Glow ambient background circles */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-6 relative z-10">
          {/* Top Bar: Navigation & Syllabus Drawer Trigger */}
          <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs md:text-sm text-slate-400 truncate">
              <Link
                href={`/escuela/${course.slug}`}
                className="hover:text-purple-400 transition-colors flex items-center gap-1 font-semibold text-slate-300"
              >
                <ArrowLeft className="w-4 h-4" /> {course.title}
              </Link>
              <span>/</span>
              <span className="text-purple-300 font-medium truncate">{lesson.title}</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Mobile drawer toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden rounded-xl border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white gap-1.5 text-xs"
              >
                {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                <span>Temario</span>
              </Button>

              {/* Progress counter */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-xs font-semibold text-purple-300">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>{course.progress_pct}% completado</span>
              </div>
            </div>
          </div>

          {/* Main Grid: Content (Video + Guide) & Sticky Syllabus Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left / Main Stage (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Video Player Card */}
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl">
                <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center">
                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      title={lesson.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                      <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                        <Tv className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white">Guía Práctica sin Video</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm">
                          Esta lección es un procedimiento técnico documental. Lee la guía detallada a continuación.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Lesson Header & Complete Action Bar */}
                <div className="p-6 md:p-8 space-y-4 border-t border-slate-800/80 bg-slate-900/40">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                          Lección #{lesson.sort_order}
                        </span>
                        {lesson.is_completed && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Completada
                          </span>
                        )}
                      </div>
                      <h1 className="text-xl md:text-2xl font-black text-white leading-tight">
                        {lesson.title}
                      </h1>
                      <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {Math.round(lesson.video_duration_seconds / 60)} minutos
                        </span>
                        <span>•</span>
                        <span className="text-slate-400">Especialidad Tec360</span>
                      </div>
                    </div>

                    {/* Complete Button */}
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleCompleteLesson}
                        disabled={isCompleting || lesson.is_completed}
                        className={`rounded-xl font-bold text-xs md:text-sm px-5 py-2.5 transition-all shadow-lg ${
                          lesson.is_completed
                            ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 cursor-default"
                            : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-purple-600/30"
                        }`}
                      >
                        {isCompleting ? (
                          "Guardando..."
                        ) : lesson.is_completed ? (
                          <>
                            <Check className="w-4 h-4 mr-1.5 text-emerald-400" /> Lección Completada
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Marcar como Completada
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Toast-like confirmation on complete */}
                  <AnimatePresence>
                    {completionSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ¡Progreso guardado!{" "}
                          {lesson.next_lesson_slug
                            ? "Cargando siguiente lección..."
                            : "¡Has completado el temario!"}
                        </span>
                        {lesson.next_lesson_slug && (
                          <span className="text-[11px] text-emerald-400 font-mono underline">
                            Siguiente &rarr;
                          </span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Technical Guide Document Card */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2 text-white font-bold text-base md:text-lg">
                    <FileText className="w-5 h-5 text-purple-400" />
                    <span>Procedimiento y Ficha Técnica de Instalación</span>
                  </div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Norma Técnica Tec360
                  </span>
                </div>

                {/* Structured Guide Content */}
                <TechnicalGuideViewer content={lesson.content_markdown} />
              </div>

              {/* Bottom Lesson Navigation bar */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                {lesson.prev_lesson_slug ? (
                  <Link href={`/escuela/${course.slug}/leccion/${lesson.prev_lesson_slug}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Lección Anterior
                    </Button>
                  </Link>
                ) : (
                  <div />
                )}

                {lesson.next_lesson_slug ? (
                  <Link href={`/escuela/${course.slug}/leccion/${lesson.next_lesson_slug}`}>
                    <Button
                      size="sm"
                      className="rounded-xl font-bold bg-slate-800 hover:bg-purple-600 text-white transition-colors"
                    >
                      Siguiente Lección <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/escuela/${course.slug}/quiz`}>
                    <Button
                      size="sm"
                      className="rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20"
                    >
                      <Award className="w-4 h-4 mr-1.5" /> Presentar Examen de Certificación
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Right / Syllabus Sidebar (4 cols on lg, drawer on mobile) */}
            <div
              className={`lg:col-span-4 transition-all duration-300 ${
                sidebarOpen
                  ? "fixed inset-0 z-50 bg-slate-950/95 p-6 overflow-y-auto block"
                  : "hidden lg:block lg:sticky lg:top-28 space-y-4"
              }`}
            >
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-xl space-y-5">
                {/* Header with close for mobile */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-400" />
                    <div>
                      <h3 className="font-bold text-white text-sm">Temario del Curso</h3>
                      <p className="text-[11px] text-slate-400">{course.lessons.length} lecciones en total</p>
                    </div>
                  </div>
                  {sidebarOpen && (
                    <button
                      onClick={() => setSidebarOpen(false)}
                      className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Progress Mini Card */}
                <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Progreso actual:</span>
                    <span className="font-bold text-purple-300">{course.progress_pct}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(course.progress_pct, 4)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                    <span>{course.completed_lessons} completadas</span>
                    <span>{course.lessons.length - course.completed_lessons} restantes</span>
                  </div>
                </div>

                {/* Lesson List */}
                <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                  {course.lessons.map((item, idx) => {
                    const isActive = item.slug === lessonSlug

                    return (
                      <Link
                        key={item.id}
                        href={`/escuela/${course.slug}/leccion/${item.slug}`}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-xs ${
                          isActive
                            ? "bg-purple-900/30 border-purple-500/60 text-white shadow-md shadow-purple-900/20"
                            : item.is_completed
                            ? "bg-slate-900/50 hover:bg-slate-900 border-emerald-500/20 text-slate-300"
                            : "bg-slate-900/30 hover:bg-slate-900/70 border-slate-800/80 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <div className="mt-0.5">
                          {item.is_completed ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                              <Check className="w-3 h-3" />
                            </div>
                          ) : (
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[10px] ${
                                isActive
                                  ? "bg-purple-500 text-white shadow-inner"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {idx + 1}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 space-y-0.5">
                          <p className={`font-semibold line-clamp-2 ${isActive ? "text-purple-200" : ""}`}>
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span>{Math.round(item.video_duration_seconds / 60)} min</span>
                            {item.is_free_preview && (
                              <span className="text-blue-400 font-medium">Gratis</span>
                            )}
                          </div>
                        </div>

                        {isActive && (
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0 animate-pulse" />
                        )}
                      </Link>
                    )
                  })}
                </div>

                {/* Bottom Certification Exam Link */}
                <div className="pt-3 border-t border-slate-800">
                  <Link
                    href={`/escuela/${course.slug}/quiz`}
                    onClick={() => setSidebarOpen(false)}
                    className={`block p-3.5 rounded-xl border text-center transition-all ${
                      course.quiz_passed
                        ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                        : allLessonsCompleted
                        ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-200 hover:border-amber-400"
                        : "bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2 text-xs font-bold">
                      <Award className="w-4 h-4 text-amber-400" />
                      <span>
                        {course.quiz_passed
                          ? "Certificado Aprobado (100%)"
                          : "Examen de Certificación (100%)"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {course.quiz_passed
                        ? "Descarga tu diploma oficial"
                        : `Otorga +${course.rank_points_reward} puntos de rango`}
                    </p>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}