"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
    ArrowLeft, Clock, CheckCircle, XCircle, Loader2,
    ChevronRight, Shield, Wrench, MapPin, CalendarIcon
} from "lucide-react"
import { ProtectedRoute, useAuth } from "@/lib/auth-context"
import { getUserServices } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GlassCard } from "@/components/ui/glass-card"

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; badge: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Pendiente", color: "text-yellow-400", icon: Clock, badge: "secondary" },
    quoted: { label: "Con cotizaciones", color: "text-blue-400", icon: Clock, badge: "default" },
    assigned: { label: "Asignado", color: "text-blue-400", icon: Shield, badge: "default" },
    en_route: { label: "En camino", color: "text-blue-400", icon: Shield, badge: "default" },
    arrived: { label: "Llegó", color: "text-blue-400", icon: Shield, badge: "default" },
    in_progress: { label: "En progreso", color: "text-blue-400", icon: Wrench, badge: "default" },
    completed: { label: "Completado", color: "text-green-400", icon: CheckCircle, badge: "outline" },
    cancelled: { label: "Cancelado", color: "text-red-400", icon: XCircle, badge: "destructive" },
}

const TYPE_LABELS: Record<string, string> = {
    camera_installation: "Dashcam HD",
    alarm_installation: "Alarma",
    gps_installation: "GPS Tracker",
    camera_maintenance: "Mant. Dashcam",
    alarm_maintenance: "Mant. Alarma",
    gps_maintenance: "Mant. GPS",
    vehicle_recovery: "Reacción",
    other: "Servicio Técnico",
}

const FILTERS = ["Todos", "Activos", "Completados", "Cancelados"] as const
type Filter = typeof FILTERS[number]

function matchesFilter(status: string, filter: Filter): boolean {
    if (filter === "Todos") return true
    if (filter === "Activos") return ["pending", "quoted", "assigned", "en_route", "arrived", "in_progress"].includes(status)
    if (filter === "Completados") return status === "completed"
    if (filter === "Cancelados") return status === "cancelled"
    return true
}

function ServiceCard({ service, index }: { service: any; index: number }) {
    const router = useRouter()
    const cfg = STATUS_CONFIG[service.status] || STATUS_CONFIG.pending
    const Icon = cfg.icon

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.4 }}
        >
            <button
                onClick={() => router.push(`/servicios/${service.id}`)}
                className="w-full text-left group"
            >
                <GlassCard className="p-5 hover:border-border/60 transition-all duration-200 group-hover:bg-white/[0.04]">
                    <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${service.status === "completed" ? "bg-green-500/10" :
                                service.status === "cancelled" ? "bg-red-500/10" : "bg-blue-500/10"
                            }`}>
                            <Icon className={`w-5 h-5 ${cfg.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="font-semibold text-sm leading-tight">
                                        {TYPE_LABELS[service.service_type] || "Servicio"}
                                    </p>
                                    {service.vehicle_model && (
                                        <p className="text-xs text-muted-foreground mt-0.5">{service.vehicle_model}</p>
                                    )}
                                </div>
                                <Badge variant={cfg.badge} className="shrink-0 text-[10px]">{cfg.label}</Badge>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                                {service.scheduled_date && (
                                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                        <CalendarIcon className="w-3 h-3" />
                                        {format(new Date(service.scheduled_date), "dd MMM yyyy", { locale: es })}
                                    </span>
                                )}
                                {service.service_address && (
                                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-[180px]">
                                        <MapPin className="w-3 h-3 shrink-0" />
                                        {service.service_address}
                                    </span>
                                )}
                                {service.estimated_price && (
                                    <span className="text-[11px] font-semibold text-foreground ml-auto">
                                        ${Number(service.estimated_price).toLocaleString()}
                                    </span>
                                )}
                            </div>

                            {service.technician?.full_name && (
                                <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    {service.technician.full_name}
                                </p>
                            )}
                        </div>

                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 mt-1 transition-colors" />
                    </div>
                </GlassCard>
            </button>
        </motion.div>
    )
}

function HistorialContent() {
    const router = useRouter()
    const { user } = useAuth()
    const [services, setServices] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [filter, setFilter] = useState<Filter>("Todos")

    useEffect(() => {
        getUserServices()
            .then((data) => {
                const list = Array.isArray(data) ? data : (data.services || data.items || [])
                // Sort newest first
                list.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                setServices(list)
            })
            .catch(console.error)
            .finally(() => setIsLoading(false))
    }, [])

    const filtered = services.filter((s) => matchesFilter(s.status, filter))

    const active = services.filter((s) => matchesFilter(s.status, "Activos")).length
    const completed = services.filter((s) => s.status === "completed").length

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Mis Servicios</h1>
                    <p className="text-muted-foreground text-sm">Historial completo de solicitudes</p>
                </div>
            </div>

            {/* Summary pills */}
            {!isLoading && (
                <div className="flex gap-3 mb-6">
                    <div className="flex-1 bg-blue-500/8 border border-blue-500/15 rounded-2xl p-4 text-center">
                        <p className="text-2xl font-bold gradient-text">{active}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Activos</p>
                    </div>
                    <div className="flex-1 bg-green-500/8 border border-green-500/15 rounded-2xl p-4 text-center">
                        <p className="text-2xl font-bold text-green-400">{completed}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Completados</p>
                    </div>
                    <div className="flex-1 bg-white/[0.03] border border-border/30 rounded-2xl p-4 text-center">
                        <p className="text-2xl font-bold">{services.length}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Total</p>
                    </div>
                </div>
            )}

            {/* Filter tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {FILTERS.map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${filter === f
                                ? "gradient-brand text-white shadow-md"
                                : "bg-white/[0.04] border border-border/30 hover:bg-white/[0.07]"
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : filtered.length === 0 ? (
                <GlassCard className="p-12 text-center">
                    <p className="text-4xl mb-3">🛡️</p>
                    <p className="font-semibold mb-1">
                        {filter === "Todos" ? "Sin servicios todavía" : `Sin servicios ${filter.toLowerCase()}`}
                    </p>
                    <p className="text-muted-foreground text-sm mb-6">
                        {filter === "Todos" ? "Solicita tu primer servicio de seguridad" : "Prueba otro filtro"}
                    </p>
                    {filter === "Todos" && (
                        <Button onClick={() => router.push("/servicios/nuevo")} className="gradient-brand text-white">
                            Solicitar servicio
                        </Button>
                    )}
                </GlassCard>
            ) : (
                <div className="space-y-3">
                    {filtered.map((svc, i) => (
                        <ServiceCard key={svc.id} service={svc} index={i} />
                    ))}
                </div>
            )}
        </div>
    )
}

export default function HistorialPage() {
    return (
        <ProtectedRoute>
            <div className="container pt-24 pb-10 px-4">
                <HistorialContent />
            </div>
        </ProtectedRoute>
    )
}
