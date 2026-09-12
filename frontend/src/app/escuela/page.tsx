"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { 
  GraduationCap, 
  Search, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  Award, 
  BookOpen, 
  CheckCircle2, 
  ArrowRight,
  Filter,
  Camera,
  Radio,
  Cpu,
  Truck,
  Layers,
  ChevronRight,
  Star
} from "lucide-react"
import api from "@/lib/api"
import { ProtectedRoute, useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface CourseItem {
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
  lessons_count: number
  is_enrolled: boolean
  progress_pct: number
  is_completed: boolean
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string; border: string }> = {
  dashcam: { label: "Dashcams HD", icon: Camera, color: "text-sky-400 bg-sky-500/10", border: "border-sky-500/30" },
  gps_alarmas: { label: "GPS y Alarmas", icon: Radio, color: "text-purple-400 bg-purple-500/10", border: "border-purple-500/30" },
  basicos: { label: "Fundamentos", icon: ShieldCheck, color: "text-emerald-400 bg-emerald-500/10", border: "border-emerald-500/30" },
  mecanica_basica: { label: "Mecánica y Redes", icon: Cpu, color: "text-amber-400 bg-amber-500/10", border: "border-amber-500/30" },
  proveedor: { label: "Por Proveedor", icon: Truck, color: "text-pink-400 bg-pink-500/10", border: "border-pink-500/30" },
}

const DIFFICULTY_MAP: Record<string, { label: string; badge: string }> = {
  beginner: { label: "Principiante", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  intermediate: { label: "Intermedio", badge: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  advanced: { label: "Avanzado", badge: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
}

function CourseCardImage({
  thumbnailUrl,
  title,
  category,
}: {
  thumbnailUrl?: string
  title: string
  category: string
}) {
  const [hasError, setHasError] = useState(false)
  const categoryFallback = CATEGORY_CONFIG[category]
  const FallbackIcon = categoryFallback?.icon || GraduationCap

  if (!thumbnailUrl || hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-950/40 to-slate-900 p-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 mb-2 shadow-lg">
          <FallbackIcon className="w-7 h-7" />
        </div>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {categoryFallback?.label || "Escuela Tec"}
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
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
    />
  )
}

export default function EscuelaPage() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [onlyRequired, setOnlyRequired] = useState(false)

  useEffect(() => {
    async function loadCourses() {
      try {
        setIsLoading(true)
        const res = await api.courses.list()
        setCourses(res.data || [])
      } catch (err) {
        console.error("Error al cargar cursos de Escuela Tec:", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadCourses()
  }, [])

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (selectedCategory !== "all" && c.category !== selectedCategory) return false
      if (selectedDifficulty !== "all" && c.difficulty !== selectedDifficulty) return false
      if (onlyRequired && !c.is_required_for_technicians) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = c.title.toLowerCase().includes(q)
        const matchDesc = c.description?.toLowerCase().includes(q)
        if (!matchTitle && !matchDesc) return false
      }
      return true
    })
  }, [courses, selectedCategory, selectedDifficulty, onlyRequired, searchQuery])

  // Enrolled active courses
  const myEnrolledCourses = useMemo(() => {
    return courses.filter((c) => c.is_enrolled)
  }, [courses])

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-950 text-slate-100 pt-24 pb-20 px-4 md:px-8 relative overflow-hidden">
        {/* Glow ambient background circles */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto space-y-10 relative z-10">
          {/* Header Banner - Impeccable Dark Tech Style */}
          <div className="relative rounded-2xl p-8 md:p-12 overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-purple-950/30 backdrop-blur-2xl shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent pointer-events-none" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-4 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Campus Técnico Especializado
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                  Escuela <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400">Tec</span>
                </h1>
                <p className="text-slate-300 text-base md:text-lg leading-relaxed">
                  Aprende. Certifícate con estándar militar y domina instalaciones de telemetría, GPS 4G, dashcams HD y redes CAN-Bus automotrices.
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-slate-400 pt-2">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Evaluaciones con 100% de rigor
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-400" /> Certificados Oficiales Verificables
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-400" /> Puntos para subir a rango Élite
                  </span>
                </div>
              </div>

              {/* Technician Rank Mini-Card */}
              {user && (
                <div className="bg-slate-900/80 border border-purple-500/30 rounded-xl p-5 md:w-80 shadow-lg backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center text-white shadow-inner">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Perfil del Técnico</p>
                      <p className="text-sm font-bold text-white truncate">{user.full_name || user.email}</p>
                      <span className="inline-block mt-0.5 text-xs text-purple-400 font-semibold capitalize">
                        {user.role === "technician" ? "Técnico Certificado" : user.role}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between text-xs text-slate-300">
                    <span>Cursos inscritos: <strong className="text-white">{myEnrolledCourses.length}</strong></span>
                    <span>Aprobados: <strong className="text-emerald-400">{myEnrolledCourses.filter(c => c.is_completed).length}</strong></span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enrolled Courses Progress Bar (If any) */}
          {myEnrolledCourses.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                  Tus Cursos en Progreso
                </h2>
                <span className="text-xs text-slate-400">
                  {myEnrolledCourses.length} curso{myEnrolledCourses.length > 1 ? "s" : ""} activo{myEnrolledCourses.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myEnrolledCourses.map((enrolled) => (
                  <Link
                    key={enrolled.id}
                    href={`/escuela/${enrolled.slug}`}
                    className="group bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-xl p-5 transition-all duration-200 shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                          {CATEGORY_CONFIG[enrolled.category]?.label || enrolled.category}
                        </span>
                        {enrolled.is_completed ? (
                          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Aprobado
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-mono">
                            {enrolled.progress_pct}%
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                        {enrolled.title}
                      </h3>
                      {/* Progress Bar */}
                      <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-blue-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(enrolled.progress_pct, 5)}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span>{enrolled.lessons_count} lecciones</span>
                      <span className="text-purple-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        {enrolled.is_completed ? "Ver Certificado" : "Continuar"} <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Catalog Controls (Filters & Search) */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar curso, tecnología o relé..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-900/80 border-slate-800 focus:border-purple-500 text-slate-100 placeholder:text-slate-500 rounded-xl"
                />
              </div>

              {/* Toggle Required Courses */}
              <div className="flex items-center gap-2">
                <Button
                  variant={onlyRequired ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOnlyRequired(!onlyRequired)}
                  className={`rounded-xl text-xs font-semibold gap-1.5 ${
                    onlyRequired 
                      ? "bg-purple-600 hover:bg-purple-700 text-white" 
                      : "border-slate-800 text-slate-300 hover:bg-slate-900"
                  }`}
                >
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  Cursos Obligatorios SENA/Tec360
                </Button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                  selectedCategory === "all"
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-600/20"
                    : "bg-slate-900/80 hover:bg-slate-800 text-slate-400 border border-slate-800/80"
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Todos los Cursos
              </button>

              {Object.entries(CATEGORY_CONFIG).map(([catKey, config]) => {
                const IconComponent = config.icon
                const isActive = selectedCategory === catKey
                return (
                  <button
                    key={catKey}
                    onClick={() => setSelectedCategory(catKey)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                      isActive
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20 border border-purple-400"
                        : "bg-slate-900/80 hover:bg-slate-800 text-slate-400 border border-slate-800"
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    {config.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Courses Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-80 bg-slate-900/40 rounded-2xl border border-slate-800/60 animate-pulse" />
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800/60 p-8">
              <Filter className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-300">No se encontraron cursos con estos filtros</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                Prueba a limpiar la búsqueda o seleccionar otra categoría técnica.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategory("all")
                  setSearchQuery("")
                  setOnlyRequired(false)
                }}
                className="mt-4 rounded-xl border-slate-700 text-slate-300"
              >
                Restablecer Filtros
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course, idx) => {
                const cat = CATEGORY_CONFIG[course.category] || { label: course.category, color: "text-slate-300 bg-slate-800", border: "border-slate-700" }
                const diff = DIFFICULTY_MAP[course.difficulty] || { label: course.difficulty, badge: "bg-slate-800 text-slate-300" }

                return (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                    className="group bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-purple-500/50 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 flex flex-col justify-between backdrop-blur-xl"
                  >
                    <div>
                      {/* Thumbnail with overlay badges */}
                      <div className="relative h-48 w-full overflow-hidden bg-slate-800">
                        <CourseCardImage
                          thumbnailUrl={course.thumbnail_url}
                          title={course.title}
                          category={course.category}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                          <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md backdrop-blur-md border ${cat.color} ${cat.border}`}>
                            {cat.label}
                          </span>
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md backdrop-blur-md border ${diff.badge}`}>
                            {diff.label}
                          </span>
                        </div>

                        {/* Required Tag */}
                        {course.is_required_for_technicians && (
                          <div className="absolute bottom-3 left-3">
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-amber-500/90 text-slate-950 flex items-center gap-1 shadow-md">
                              <Star className="w-3 h-3 fill-slate-950" /> Obligatorio SENA/Tec
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-6 space-y-3">
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {course.estimated_hours}h estimadas
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                            {course.lessons_count} lecciones
                          </span>
                          <span>•</span>
                          <span className="text-purple-400 font-semibold flex items-center gap-1">
                            <Award className="w-3.5 h-3.5" />
                            +{course.rank_points_reward} pts
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors leading-snug">
                          {course.title}
                        </h3>

                        <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                          {course.description || "Aprende los procedimientos técnicos de nivel profesional con el estándar de oro de Tec360."}
                        </p>

                        {/* Badge Name if Awarded */}
                        {course.badge_name && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-[11px] text-purple-300 font-medium">
                            <Award className="w-3 h-3 text-amber-400" /> Insignia: {course.badge_name}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Pricing & Action */}
                    <div className="p-6 pt-0 border-t border-slate-800/60 mt-4 flex items-center justify-between">
                      <div>
                        {course.is_paid ? (
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Inversión</span>
                            <span className="text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                              ${course.price.toLocaleString("es-CO")} COP
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Acceso</span>
                            <span className="text-sm font-bold text-emerald-400">Gratuito</span>
                          </div>
                        )}
                      </div>

                      <Link href={`/escuela/${course.slug}`}>
                        <Button 
                          size="sm"
                          className="rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-600/20 group/btn"
                        >
                          {course.is_enrolled ? (
                            <>
                              Continuar <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                            </>
                          ) : (
                            <>
                              Ver Curso <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                            </>
                          )}
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}

