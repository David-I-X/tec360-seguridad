"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Plus, Loader2, Filter, MapPin, Calendar, ChevronRight, Shield, ClipboardList, CheckCircle, XCircle, ArrowLeft } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { ProtectedRoute, useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GlassCard } from "@/components/ui/glass-card"
import { Skeleton } from "@/components/ui/skeleton"

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-yellow-500" },
  quoted: { label: "Con Cotizaciones", color: "bg-indigo-500" },
  assigned: { label: "Asignado", color: "bg-blue-500" },
  en_route: { label: "En camino", color: "bg-blue-600" },
  arrived: { label: "Llegó", color: "bg-orange-500" },
  in_progress: { label: "En Progreso", color: "bg-purple-500" },
  completed: { label: "Completado", color: "bg-green-500" },
  cancelled: { label: "Cancelado", color: "bg-red-500" },
}

const typeLabels: Record<string, string> = {
  camera_installation: "📹 Dashcam",
  alarm_installation: "🔔 Alarma",
  gps_installation: "📍 GPS",
  camera_maintenance: "📹 Mtto. Dashcam",
  alarm_maintenance: "🔔 Mtto. Alarma",
  gps_maintenance: "📍 Mtto. GPS",
  vehicle_recovery: "🚨 Reacción",
  other: "🔧 Otro",
}

type StatusFilter = "all" | "active" | "completed" | "cancelled"

function MyServicesContent() {
  const { user } = useAuth()
  const [services, setServices] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  useEffect(() => {
    async function fetchServices() {
      const token = localStorage.getItem("access_token")
      if (!token) return

      setIsLoading(true)
      try {
        const response = await fetch(`${API_URL}/services?page_size=50`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
          throw new Error("Error al cargar servicios")
        }

        const data = await response.json()
        // Handle different response formats
        const servicesList = data.services || data.items || []
        console.log("[Client Dashboard] Loaded services:", servicesList.length)
        setServices(Array.isArray(servicesList) ? servicesList : [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchServices()
  }, [API_URL])

  const ACTIVE_STATUSES = ["pending", "quoted", "assigned", "en_route", "arrived", "in_progress"]

  const activeServices = services.filter(s => ACTIVE_STATUSES.includes(s.status))
  const historicalServices = services.filter(s => !ACTIVE_STATUSES.includes(s.status))

  const filteredServices = services.filter((service) => {
    if (statusFilter === "all") return true
    if (statusFilter === "active") return ACTIVE_STATUSES.includes(service.status)
    if (statusFilter === "completed") return service.status === "completed"
    if (statusFilter === "cancelled") return service.status === "cancelled"
    return true
  })

  const filterButtons: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "active", label: "Activos" },
    { key: "completed", label: "Completados" },
    { key: "cancelled", label: "Cancelados" },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
          <Skeleton className="h-10 w-40 rounded-md" />
        </div>
        
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-24 rounded-md" />)}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>

        <div className="space-y-4 mt-6">
          {[...Array(3)].map((_, i) => (
            <GlassCard key={i} className="p-5 flex items-center gap-4">
               <Skeleton className="h-4 w-4 rounded-full flex-shrink-0" />
               <div className="flex-1 space-y-2">
                 <Skeleton className="h-5 w-1/3" />
                 <Skeleton className="h-4 w-1/4" />
               </div>
               <Skeleton className="h-6 w-24 rounded-full flex-shrink-0" />
               <Skeleton className="h-5 w-5 rounded-md flex-shrink-0" />
            </GlassCard>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <GlassCard className="p-8 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Reintentar</Button>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Inicio
          </Link>
          <h1 className="text-3xl font-extrabold">
            Mis <span className="gradient-text">Servicios</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Historial y seguimiento de tus solicitudes
          </p>
        </div>
        <Button asChild size="lg" className="gradient-brand text-white hover:opacity-90 shadow-lg shadow-blue-500/20">
          <Link href="/servicios/nuevo">
            <Plus className="mr-2 h-5 w-5" />
            Nuevo Servicio
          </Link>
        </Button>
      </motion.div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        {filterButtons.map((btn) => (
          <Button
            key={btn.key}
            variant={statusFilter === btn.key ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(btn.key)}
            className="shrink-0"
          >
            {btn.label}
          </Button>
        ))}
      </div>

      {/* Stats summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <GlassCard className="p-4 text-center hover-lift">
          <ClipboardList className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-2xl font-bold">{services.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </GlassCard>
        <GlassCard className="p-4 text-center hover-lift">
          <Shield className="h-5 w-5 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-blue-500">
            {services.filter((s) => ["pending", "quoted", "assigned", "en_route", "arrived", "in_progress"].includes(s.status)).length}
          </p>
          <p className="text-xs text-muted-foreground">Activos</p>
        </GlassCard>
        <GlassCard className="p-4 text-center hover-lift">
          <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-green-500">
            {services.filter((s) => s.status === "completed").length}
          </p>
          <p className="text-xs text-muted-foreground">Completados</p>
        </GlassCard>
        <GlassCard className="p-4 text-center hover-lift">
          <XCircle className="h-5 w-5 text-red-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-red-500">
            {services.filter((s) => s.status === "cancelled").length}
          </p>
          <p className="text-xs text-muted-foreground">Cancelados</p>
        </GlassCard>
      </motion.div>

      {/* Service List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {statusFilter === "all" ? (
            <>
              {/* ── Active pinned ── */}
              {activeServices.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-xs font-bold uppercase tracking-wider text-green-400">Activos</p>
                  </div>
                  {activeServices.map((service, index) => (
                    <ServiceCard key={service.id} service={service} index={index} />
                  ))}
                </div>
              )}
              {/* ── History ── */}
              {historicalServices.length > 0 && (
                <div className="space-y-3">
                  {activeServices.length > 0 && (
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-4">Historial</p>
                  )}
                  {historicalServices.map((service, index) => (
                    <ServiceCard key={service.id} service={service} index={index} />
                  ))}
                </div>
              )}
              {services.length === 0 && (
                <EmptyState statusFilter={statusFilter} filterButtons={filterButtons} />
              )}
            </>
          ) : filteredServices.length === 0 ? (
            <EmptyState statusFilter={statusFilter} filterButtons={filterButtons} />
          ) : (
            filteredServices.map((service, index) => (
              <ServiceCard key={service.id} service={service} index={index} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function ServiceCard({ service, index }: { service: any; index: number }) {
  const isLive = ["en_route", "arrived", "in_progress"].includes(service.status)
  return (
    <motion.div
      key={service.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link href={isLive ? `/servicios/${service.id}/esperando` : `/servicios/${service.id}`}>
        <GlassCard className={`p-5 hover:border-primary/30 transition-all group cursor-pointer ${isLive ? "border-green-500/30 bg-green-500/5" : ""}`}>
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full shrink-0 ${isLive ? "bg-green-400 animate-pulse" : statusLabels[service.status]?.color || "bg-gray-400"}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{service.title}</h3>
                {isLive && <span className="text-[9px] font-bold text-green-400 bg-green-400/10 border border-green-400/20 rounded-full px-2 py-0.5 shrink-0">EN VIVO</span>}
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  {typeLabels[service.service_type] || service.service_type}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {service.service_city || "Sin ubicación"}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(service.created_at), "dd MMM yyyy", { locale: es })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={statusLabels[service.status]?.color}>
                {statusLabels[service.status]?.label || service.status}
              </Badge>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
        </GlassCard>
      </Link>
    </motion.div>
  )
}

function EmptyState({ statusFilter, filterButtons }: { statusFilter: StatusFilter; filterButtons: { key: StatusFilter; label: string }[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <GlassCard className="p-12 text-center border-dashed border-2 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="flex flex-col items-center gap-5 max-w-sm mx-auto">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10 flex items-center justify-center relative shadow-2xl">
              <ClipboardList className="h-10 w-10 text-blue-400 drop-shadow-lg" />
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-2">
              {statusFilter === "all" ? "No tienes servicios" : "Sin resultados"}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {statusFilter === "all"
                ? "Aún no has solicitado ningún servicio. ¡Nuestros técnicos certificados están listos para ayudarte hoy mismo!"
                : `No encontramos servicios ${filterButtons.find(b => b.key === statusFilter)?.label.toLowerCase()} en este momento.`
              }
            </p>
          </div>
          
          {statusFilter === "all" && (
            <Button asChild size="lg" className="mt-4 gradient-brand text-white shadow-xl shadow-blue-500/20 w-full sm:w-auto">
              <Link href="/servicios/nuevo">
                <Plus className="mr-2 h-5 w-5" />
                Solicitar mi primer servicio
              </Link>
            </Button>
          )}
        </div>
      </GlassCard>
    </motion.div>
  )
}

export default function MyServicesPage() {
  return (
    <ProtectedRoute>
      <div className="container pt-24 pb-8 px-4 max-w-4xl">
        <MyServicesContent />
      </div>
    </ProtectedRoute>
  )
}
