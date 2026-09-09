"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Plus, MapPin, ChevronRight,
  ClipboardList, CheckCircle2, XCircle, ArrowLeft, Search,
  LayoutGrid, List, Map as MapIcon, Radio, Video, BellRing,
  ShieldAlert, Wrench, Clock, FileText, Activity,
  Navigation, User, Sparkles, X
} from "lucide-react"
import { motion } from "framer-motion"

import { ProtectedRoute } from "@/lib/auth-context"
import { getApiBaseUrl } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getAvatarUrl } from "@/lib/utils"
import { StarDisplay } from "@/components/ui/star-rating"
import { FleetOverviewMap } from "@/components/services/fleet-overview-map"

const statusLabels: Record<string, { label: string; color: string; dotColor: string }> = {
  pending: { label: "Pendiente", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30", dotColor: "bg-amber-500" },
  quoted: { label: "Con Cotizaciones", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30", dotColor: "bg-indigo-500" },
  assigned: { label: "Asignado", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30", dotColor: "bg-blue-500" },
  en_route: { label: "En camino", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30", dotColor: "bg-sky-500" },
  arrived: { label: "Llegó al sitio", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30", dotColor: "bg-orange-500" },
  in_progress: { label: "En Progreso", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30", dotColor: "bg-purple-500" },
  completed: { label: "Completado", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", dotColor: "bg-emerald-500" },
  confirmed: { label: "Confirmado", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", dotColor: "bg-emerald-500" },
  cancelled: { label: "Cancelado", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30", dotColor: "bg-rose-500" },
}

interface ServiceTypeConfig {
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const serviceTypeConfigs: Record<string, ServiceTypeConfig> = {
  gps_installation: { label: "Instalación GPS Satelital", icon: Radio, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  gps_maintenance: { label: "Mantenimiento GPS", icon: Radio, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  camera_installation: { label: "Instalación Dashcam HD", icon: Video, color: "text-violet-500 bg-violet-500/10 border-violet-500/20" },
  camera_maintenance: { label: "Mantenimiento Dashcam", icon: Video, color: "text-violet-500 bg-violet-500/10 border-violet-500/20" },
  alarm_installation: { label: "Instalación de Alarma", icon: BellRing, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  alarm_maintenance: { label: "Mantenimiento de Alarma", icon: BellRing, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  vehicle_recovery: { label: "Equipo de Reacción", icon: ShieldAlert, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
  other: { label: "Servicio Técnico", icon: Wrench, color: "text-slate-500 bg-slate-500/10 border-slate-500/20" },
}

type StatusFilter = "all" | "active" | "quoted" | "completed"
type ViewMode = "grid" | "list" | "map"

const ACTIVE_STATUSES = ["assigned", "en_route", "arrived", "in_progress"]

function MyServicesContent() {
  const [services, setServices] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    async function fetchServices() {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
      if (!token) return

      setIsLoading(true)
      try {
        const apiUrl = getApiBaseUrl()
        const response = await fetch(`${apiUrl}/services?page_size=100`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
          throw new Error("Error al cargar servicios")
        }

        const data = await response.json()
        const servicesList = data.services || data.items || []
        setServices(Array.isArray(servicesList) ? servicesList : [])
      } catch (err: any) {
        setError(err.message || "Error al conectar con el servidor")
      } finally {
        setIsLoading(false)
      }
    }

    fetchServices()
  }, [])

  // Filter and Search Logic
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      // 1. Status Filter
      if (statusFilter === "active" && !ACTIVE_STATUSES.includes(service.status)) {
        return false
      }
      if (statusFilter === "quoted" && service.status !== "quoted" && service.status !== "pending") {
        return false
      }
      if (statusFilter === "completed" && service.status !== "completed" && service.status !== "confirmed") {
        return false
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const titleMatch = (service.title || "").toLowerCase().includes(query)
        const typeMatch = (service.service_type || "").toLowerCase().includes(query)
        const cityMatch = (service.service_city || "").toLowerCase().includes(query)
        const addressMatch = (service.service_address || "").toLowerCase().includes(query)
        const descMatch = (service.description || "").toLowerCase().includes(query)
        const techMatch = service.technician?.full_name?.toLowerCase().includes(query)

        return titleMatch || typeMatch || cityMatch || addressMatch || descMatch || techMatch
      }

      return true
    })
  }, [services, statusFilter, searchQuery])

  // Counts for tabs
  const activeCount = useMemo(() => services.filter(s => ACTIVE_STATUSES.includes(s.status)).length, [services])
  const quotedCount = useMemo(() => services.filter(s => ["quoted", "pending"].includes(s.status)).length, [services])
  const completedCount = useMemo(() => services.filter(s => ["completed", "confirmed"].includes(s.status)).length, [services])

  // Find the primary live service (if any) to pin on the top Live Operations Banner
  const liveMissionService = useMemo(() => {
    return services.find(s => ACTIVE_STATUSES.includes(s.status))
  }, [services])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-60 rounded-xl" />
            <Skeleton className="h-4 w-80 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-2xl" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl p-8 text-center bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/10 shadow-xl max-w-md mx-auto">
        <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Error al cargar servicios</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{error}</p>
        <Button onClick={() => window.location.reload()} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
          Reintentar conexión
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ══════════════════════════════════════════════════════════
          1. HEADER & PRIMARY ACTION
      ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-2 gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Volver al Inicio</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Centro de Control // Mis Servicios
            </h1>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              TELEMÁTICA 360°
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitoreo en tiempo real, gestión satelital y trazabilidad de instalaciones vehiculares
          </p>
        </div>

        <Button
          asChild
          size="lg"
          className="bg-violet-600 hover:bg-violet-700 text-white shadow-xl shadow-violet-600/25 font-semibold text-xs sm:text-sm rounded-xl shrink-0 cursor-pointer"
        >
          <Link href="/servicios/nuevo" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>Solicitar Nuevo Servicio</span>
          </Link>
        </Button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          2. LIVE MISSION HERO BANNER (If any active operation)
      ══════════════════════════════════════════════════════════ */}
      {liveMissionService && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 sm:p-6 bg-gradient-to-r from-blue-600/15 via-violet-600/15 to-transparent border border-blue-500/40 shadow-xl backdrop-blur-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs font-mono font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
                  OPERACIÓN EN CURSO // ENLACE SATELITAL ACTIVO
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                  {statusLabels[liveMissionService.status]?.label || liveMissionService.status}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                {liveMissionService.title}
              </h2>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  <span className="truncate">{liveMissionService.service_address || "Medellín, Colombia"}</span>
                </span>
                {liveMissionService.scheduled_date && (
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                    <span>{format(new Date(liveMissionService.scheduled_date), "PPP 'a las' p", { locale: es })}</span>
                  </span>
                )}
                {liveMissionService.technician?.full_name && (
                  <span className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white">
                    <User className="h-3.5 w-3.5 text-blue-500" />
                    <span>Técnico: {liveMissionService.technician.full_name}</span>
                  </span>
                )}
              </div>
            </div>

            <Button
              asChild
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/25 shrink-0 cursor-pointer"
            >
              <Link href={`/servicios/${liveMissionService.id}`} className="flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                <span>Abrir Telemetría en Vivo</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════
          3. HUD METRICS STRIP (4 Columns)
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/10 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider">TOTAL REGISTROS</span>
            <ClipboardList className="h-4 w-4 text-violet-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {services.length}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Historial acumulado</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/10 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider">EN OPERACIÓN</span>
            <Activity className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {activeCount}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Rastreo y cuadrilla activa</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/10 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider">COTIZACIONES</span>
            <FileText className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums">
            {quotedCount}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Propuestas por revisar</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/10 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider">COMPLETADOS</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {completedCount}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Instalaciones finalizadas</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          4. TOOLBAR (Search, Filters & View Switcher)
      ══════════════════════════════════════════════════════════ */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/10 shadow-sm backdrop-blur-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === "all"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            Todos ({services.length})
          </button>

          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === "active"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>En Operación ({activeCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter("quoted")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === "quoted"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <span>Cotizaciones ({quotedCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter("completed")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === "completed"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            Completados ({completedCount})
          </button>
        </div>

        {/* Right: Search & View Switcher */}
        <div className="flex items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar servicio, técnico..."
              className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Buttons */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-xs font-bold"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
              title="Vista en Cuadrícula"
              aria-label="Vista en Cuadrícula"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "list"
                  ? "bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-xs font-bold"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
              title="Vista en Lista Compacta"
              aria-label="Vista en Lista Compacta"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === "map"
                  ? "bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-xs font-bold"
                  : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
              title="Mapa de Cobertura"
              aria-label="Mapa de Cobertura"
            >
              <MapIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          5. CONTENT VIEWS (Grid / List / Map)
      ══════════════════════════════════════════════════════════ */}
      {filteredServices.length === 0 ? (
        <div className="rounded-2xl p-12 text-center bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/10 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto mb-4 border border-violet-500/20">
            <ClipboardList className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            {searchQuery ? "Sin resultados para tu búsqueda" : "No tienes servicios en esta categoría"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            {searchQuery
              ? `No encontramos coincidencias para "${searchQuery}". Prueba con otros términos.`
              : "Comienza blindando tu vehículo con instalación de GPS satelital 4G o cámaras de seguridad."}
          </p>
          {searchQuery ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="rounded-xl text-xs font-semibold"
            >
              Limpiar búsqueda
            </Button>
          ) : (
            <Button asChild size="sm" className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold">
              <Link href="/servicios/nuevo">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Solicitar mi primer servicio
              </Link>
            </Button>
          )}
        </div>
      ) : viewMode === "map" ? (
        /* MAP VIEW */
        <FleetOverviewMap services={filteredServices} className="h-[580px]" />
      ) : viewMode === "list" ? (
        /* COMPACT LIST VIEW */
        <div className="rounded-2xl overflow-hidden bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/10 shadow-sm backdrop-blur-xl">
          <div className="divide-y divide-slate-200/80 dark:divide-white/10">
            {filteredServices.map((service) => {
              const statusInfo = statusLabels[service.status] || { label: service.status, color: "", dotColor: "bg-slate-400" }
              const typeConfig = serviceTypeConfigs[service.service_type] || serviceTypeConfigs.other
              const TypeIcon = typeConfig.icon
              const isLive = ACTIVE_STATUSES.includes(service.status)

              return (
                <Link
                  key={service.id}
                  href={`/servicios/${service.id}`}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${typeConfig.color}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                          {service.title}
                        </h4>
                        {isLive && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                            EN VIVO
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-500" />
                          <span>{service.service_city || "Sin ciudad"}</span>
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Clock className="w-3 h-3 text-violet-500" />
                          <span>
                            {service.scheduled_date
                              ? format(new Date(service.scheduled_date), "dd/MM/yyyy · p", { locale: es })
                              : format(new Date(service.created_at), "dd/MM/yyyy", { locale: es })}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${statusInfo.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`} />
                      {statusInfo.label}
                    </span>

                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                      {service.estimated_price ? `$${service.estimated_price.toLocaleString()}` : "Por cotizar"}
                    </span>

                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      ) : (
        /* GRID VIEW (3 Columns) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServices.map((service, index) => {
            const statusInfo = statusLabels[service.status] || { label: service.status, color: "", dotColor: "bg-slate-400" }
            const typeConfig = serviceTypeConfigs[service.service_type] || serviceTypeConfigs.other
            const TypeIcon = typeConfig.icon
            const isLive = ACTIVE_STATUSES.includes(service.status)

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Link href={`/servicios/${service.id}`} className="block h-full">
                  <div className={`h-full rounded-2xl p-5 bg-white/90 dark:bg-slate-900/80 border transition-all flex flex-col justify-between group shadow-sm hover:shadow-xl cursor-pointer ${
                    isLive
                      ? "border-emerald-500/40 hover:border-emerald-500/60 bg-emerald-500/[0.02]"
                      : "border-slate-200/90 dark:border-white/10 hover:border-violet-500/50"
                  }`}>
                    {/* Top Row: Icon + Badges */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${typeConfig.color}`}>
                          <TypeIcon className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isLive && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse">
                              EN VIVO
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${statusInfo.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`} />
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>

                      {/* Title & Service Type */}
                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-1 mb-1">
                        {service.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1 mb-3">
                        {typeConfig.label}
                      </p>

                      {/* Location & Scheduled Details */}
                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 mb-4">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate">
                            {service.service_address ? `${service.service_address}${service.service_city ? `, ${service.service_city}` : ""}` : "Ubicación por definir"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                          <span>
                            {service.scheduled_date
                              ? format(new Date(service.scheduled_date), "dd/MM/yyyy · p", { locale: es })
                              : `Creado ${format(new Date(service.created_at), "dd/MM/yyyy", { locale: es })}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle Section: Technician or Quotations Callout */}
                    <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 mb-4">
                      {service.technician ? (
                        <div className="flex items-center gap-2.5">
                          {service.technician.avatar_url ? (
                            <img
                              src={getAvatarUrl(service.technician.avatar_url)}
                              alt=""
                              className="w-7 h-7 rounded-lg object-cover border border-slate-200 dark:border-white/10"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-violet-600/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-xs">
                              {(service.technician.full_name || "T").charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                              {service.technician.full_name}
                            </p>
                            {service.technician.average_rating > 0 && (
                              <StarDisplay rating={service.technician.average_rating} size="sm" />
                            )}
                          </div>
                        </div>
                      ) : service.status === "quoted" ? (
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                          <FileText className="w-4 h-4 shrink-0" />
                          <span className="truncate">Cotizaciones disponibles</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400 text-xs">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="text-[11px] truncate">Buscando técnicos certificados</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Row: Price + CTA Button */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200/80 dark:border-white/10">
                      <div>
                        <span className="block text-[9px] font-mono uppercase font-bold text-slate-400">
                          {service.estimated_price ? "PRECIO ESTIMADO" : "COTIZACIÓN"}
                        </span>
                        <span className="text-sm font-mono font-extrabold text-slate-900 dark:text-white">
                          {service.estimated_price ? `$${service.estimated_price.toLocaleString()}` : "Por definir"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 group-hover:translate-x-1 transition-transform">
                        <span>{isLive ? "Telemetría" : service.status === "quoted" ? "Cotizaciones" : "Detalles"}</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function MyServicesPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <MyServicesContent />
        </div>
      </div>
    </ProtectedRoute>
  )
}
