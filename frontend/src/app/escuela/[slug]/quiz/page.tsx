"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Award,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Download,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  BookOpen,
  Copy,
  Check,
  ChevronRight,
  Flame
} from "lucide-react"
import api from "@/lib/api"
import { ProtectedRoute, useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"

interface Question {
  id: string
  question_text: string
  options: string[]
  sort_order: number
}

interface CourseDetail {
  id: string
  title: string
  slug: string
  category: string
  rank_points_reward: number
  badge_name?: string
  quiz_passed: boolean
  certificate_code?: string
  lessons_count: number
}

interface EvaluationResult {
  score: number
  passed: boolean
  total_questions: number
  correct_answers: number
  required_score: number
  certificate_code?: string | null
  rank_points_awarded: number
  badge_awarded?: string | null
  message: string
}

export default function CourseQuizPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string
  const { user } = useAuth()

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<EvaluationResult | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)

  // Load course info & quiz questions
  useEffect(() => {
    async function loadQuiz() {
      if (!slug) return
      try {
        setIsLoading(true)
        const [cRes, qRes] = await Promise.all([
          api.courses.getDetail(slug),
          api.courses.getQuiz(slug),
        ])
        setCourse(cRes.data)
        setQuestions(qRes.data || [])

        // If already passed, set initial result view
        if (cRes.data.quiz_passed && cRes.data.certificate_code) {
          setResult({
            score: 100.0,
            passed: true,
            total_questions: qRes.data?.length || 0,
            correct_answers: qRes.data?.length || 0,
            required_score: 100.0,
            certificate_code: cRes.data.certificate_code,
            rank_points_awarded: cRes.data.rank_points_reward,
            badge_awarded: cRes.data.badge_name,
            message: "¡Ya has aprobado esta evaluación con el 100% de efectividad!",
          })
        }
      } catch (err: any) {
        console.error("Error al cargar evaluación:", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadQuiz()
  }, [slug])

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }))
  }

  const answeredCount = Object.keys(answers).length
  const allAnswered = questions.length > 0 && answeredCount === questions.length

  const handleSubmit = async () => {
    if (!allAnswered || !course) return
    try {
      setIsSubmitting(true)
      const payloadAnswers = Object.entries(answers).map(([qId, optIdx]) => ({
        question_id: qId,
        selected_option_index: optIdx,
      }))

      const res = await api.courses.submitQuiz(course.slug, payloadAnswers)
      setResult(res.data)

      // Scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err: any) {
      console.error("Error al enviar evaluación:", err)
      alert("Hubo un problema al evaluar las respuestas. Por favor intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetry = () => {
    setAnswers({})
    setResult(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-slate-950 text-slate-100 pt-24 pb-20 px-4 md:px-8">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="h-8 w-48 bg-slate-900 rounded-lg animate-pulse" />
            <div className="h-44 bg-slate-900 rounded-2xl animate-pulse" />
            <div className="h-64 bg-slate-900 rounded-2xl animate-pulse" />
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!course) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-slate-950 text-slate-100 pt-24 pb-20 px-4 text-center">
          <div className="max-w-md mx-auto py-20 space-y-4">
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
            <h2 className="text-xl font-bold">Evaluación no disponible</h2>
            <p className="text-slate-400 text-sm">El curso solicitado no existe.</p>
            <Link href="/escuela">
              <Button variant="outline" className="rounded-xl border-slate-700">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver a Escuela Tec
              </Button>
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-slate-100 pt-24 pb-24 px-4 md:px-8 relative overflow-hidden">
        {/* Glow ambient effects */}
        <div className="absolute top-10 left-1/3 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-80 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto space-y-8 relative z-10">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link
              href={`/escuela/${course.slug}`}
              className="hover:text-purple-400 transition-colors flex items-center gap-1 font-semibold text-slate-300"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Volver al Curso
            </Link>
            <span>/</span>
            <span className="text-slate-200 truncate">Evaluación de Certificación</span>
          </div>

          {/* ============================================================ */}
          {/* RESULTS STATE (IF ALREADY SUBMITTED OR ALREADY PASSED) */}
          {/* ============================================================ */}
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {result.passed ? (
                /* PASSED 100% CELEBRATION CARD */
                <div className="relative rounded-3xl p-8 md:p-12 border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-purple-950/40 backdrop-blur-2xl shadow-2xl overflow-hidden text-center space-y-6">
                  {/* Glowing background burst */}
                  <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

                  {/* Big Gold & Emerald Badge */}
                  <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500 via-emerald-400 to-cyan-400 p-0.5 shadow-2xl shadow-emerald-500/30">
                    <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
                      <Award className="w-12 h-12 text-amber-400" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      Calificación Perfecta: 100%
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white">
                      ¡Certificación Aprobada con Honores!
                    </h1>
                    <p className="text-slate-300 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
                      {result.message}
                    </p>
                  </div>

                  {/* Rewards Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto pt-2">
                    <div className="p-4 rounded-2xl bg-slate-900/80 border border-purple-500/30 flex items-center gap-3 text-left">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                        <Flame className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Puntos de Rango</span>
                        <span className="text-lg font-extrabold text-purple-300">
                          +{result.rank_points_awarded || course.rank_points_reward} pts
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/30 flex items-center gap-3 text-left">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Insignia Oficial</span>
                        <span className="text-xs font-bold text-amber-300 truncate block">
                          {result.badge_awarded || course.badge_name || "Técnico Especialista"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Unique Certificate Code Box */}
                  {result.certificate_code && (
                    <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/15 max-w-md mx-auto space-y-2">
                      <span className="text-xs text-slate-400 font-medium block">
                        Código de Validación Oficial Tec360:
                      </span>
                      <div className="flex items-center justify-center gap-3">
                        <code className="text-lg md:text-xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-400 tracking-wider">
                          {result.certificate_code}
                        </code>
                        <button
                          onClick={() => handleCopyCode(result.certificate_code!)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="Copiar código"
                        >
                          {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions: Download PDF, Verify, Back */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                    {result.certificate_code && (
                      <a
                        href={`${apiBase}/api/courses/certificates/${result.certificate_code}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full sm:w-auto"
                      >
                        <Button
                          size="lg"
                          className="w-full rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-xl shadow-emerald-600/30 gap-2"
                        >
                          <Download className="w-4 h-4" /> Descargar Diploma Oficial PDF
                        </Button>
                      </a>
                    )}

                    {result.certificate_code && (
                      <Link
                        href={`/escuela/verificar?code=${result.certificate_code}`}
                        className="w-full sm:w-auto"
                      >
                        <Button
                          variant="outline"
                          size="lg"
                          className="w-full rounded-xl border-slate-700 hover:bg-slate-800 text-slate-200 gap-1.5"
                        >
                          <ExternalLink className="w-4 h-4" /> Verificar Autenticidad
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                /* FAILED EXAM CARD (< 100%) */
                <div className="rounded-3xl p-8 md:p-12 border border-rose-500/40 bg-gradient-to-br from-rose-950/30 via-slate-900 to-slate-950 backdrop-blur-2xl shadow-2xl text-center space-y-6">
                  <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 shadow-xl">
                    <XCircle className="w-10 h-10" />
                  </div>

                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Resultado: {result.score}% ({result.correct_answers}/{result.total_questions} correctas)
                    </div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                      Rigor Técnico 100% no alcanzado
                    </h2>
                    <p className="text-slate-300 text-sm md:text-base max-w-md mx-auto leading-relaxed">
                      {result.message}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 max-w-md mx-auto text-xs text-slate-400 space-y-2">
                    <p className="font-semibold text-slate-200">¿Por qué Tec360 exige el 100%?</p>
                    <p className="leading-relaxed">
                      Un error en un relé de corte de motor o una mala polaridad en una cámara puede apagar el vehículo a alta velocidad o vaciar la batería. La seguridad automotriz no permite margen de error.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <Button
                      onClick={handleRetry}
                      size="lg"
                      className="w-full sm:w-auto rounded-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white gap-2 shadow-lg shadow-purple-600/30"
                    >
                      <RotateCcw className="w-4 h-4" /> Reintentar Evaluación Ahora
                    </Button>

                    <Link href={`/escuela/${course.slug}`} className="w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full rounded-xl border-slate-800 hover:bg-slate-900 text-slate-300 gap-2"
                      >
                        <BookOpen className="w-4 h-4" /> Repasar Lecciones
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* QUIZ FORM STATE (QUESTIONS & ANSWERS) */}
          {/* ============================================================ */}
          {!result && (
            <div className="space-y-8">
              {/* Header Banner with 100% Strict Warning */}
              <div className="rounded-3xl p-6 md:p-8 border border-purple-500/30 bg-gradient-to-br from-slate-900/90 via-slate-900 to-purple-950/40 backdrop-blur-xl shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Estándar Militar: 100% Requerido
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {answeredCount} de {questions.length} preguntas respondidas
                  </span>
                </div>

                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-white">
                    Evaluación de Certificación: {course.title}
                  </h1>
                  <p className="text-slate-300 text-sm mt-1 leading-relaxed">
                    Responde todas las preguntas de opción múltiple. Para emitir tu diploma oficial y acreditar los{" "}
                    <strong className="text-purple-300">+{course.rank_points_reward} puntos de rango</strong>, debes responder correctamente todas las preguntas sin excepción.
                  </p>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-blue-400 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-6">
                {questions.map((question, qIdx) => {
                  const selectedOpt = answers[question.id]

                  return (
                    <motion.div
                      key={question.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: qIdx * 0.05 }}
                      className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-xl p-6 md:p-8 space-y-5 shadow-lg"
                    >
                      {/* Question Prompt */}
                      <div className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-purple-500/20 text-purple-300 font-bold text-xs shrink-0 border border-purple-500/30 mt-0.5">
                          {qIdx + 1}
                        </span>
                        <h3 className="text-base md:text-lg font-bold text-white leading-snug">
                          {question.question_text}
                        </h3>
                      </div>

                      {/* Options */}
                      <div className="space-y-3 pt-1">
                        {question.options.map((optionText, optIdx) => {
                          const isSelected = selectedOpt === optIdx

                          return (
                            <button
                              type="button"
                              key={optIdx}
                              onClick={() => handleSelectOption(question.id, optIdx)}
                              className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center gap-4 ${
                                isSelected
                                  ? "bg-purple-900/30 border-purple-500 text-white shadow-md shadow-purple-900/20"
                                  : "bg-slate-900/50 hover:bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected
                                    ? "border-purple-400 bg-purple-500 text-white"
                                    : "border-slate-600 bg-slate-800"
                                }`}
                              >
                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>

                              <span className="text-sm leading-relaxed">{optionText}</span>
                            </button>
                          )
                        })}
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Submit Action Bar */}
              <div className="sticky bottom-6 rounded-2xl p-4 md:p-6 border border-white/10 bg-slate-900/90 backdrop-blur-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-400 block">
                    {allAnswered
                      ? "¡Todas las preguntas respondidas! Listo para calificar."
                      : `Faltan ${questions.length - answeredCount} preguntas por responder`}
                  </span>
                  <span className="text-xs font-semibold text-purple-300">
                    Recompensa al aprobar: +{course.rank_points_reward} Puntos de Rango
                  </span>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={!allAnswered || isSubmitting}
                  size="lg"
                  className="w-full sm:w-auto rounded-xl font-extrabold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white shadow-xl shadow-purple-600/30 px-8"
                >
                  {isSubmitting ? (
                    "Evaluando con rigor..."
                  ) : (
                    <>
                      <Award className="w-4 h-4 mr-2" /> Enviar y Calificar 100%
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}