"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
    Loader2, Filter, MapPin, Calendar, ChevronRight, Star,
    Briefcase, ArrowLeft, FileText, ShieldCheck, CheckCircle2,
    Clock, AlertTriangle
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { ProtectedRoute, useAuth } from "@/lib/auth-context"

const statusLabels: Record<string, { label: string; color: string; bg: string; border: string }> = {
    pending: { label: "Pendiente", color: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/30" },
    assigned: { label: "Asignado", color: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/30" },
    en_route: { label: "En camino", color: "text-sky-400", bg: "bg-sky-500/15", border: "border-sky-500/30" },
    arrived: { label: "En sitio", color: "text-orange-400", bg: "bg-orange-500/15", border: "border-orange-500/30" },
    in_progress: { label: "En Progreso", color: "text-indigo-400", bg: "bg-indigo-500/15", border: "border-indigo-500/30" },
    completed: { label: "Completado", color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/30" },
    confirmed: { label: "Completado", color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/30" },
    cancelled: { label: "Cancelado", color: "text-rose-400", bg: "bg-rose-500/15", border: "border-rose-500/30" },
}

const typeConfig: Record<string, { label: string; color: string; bg: string; border: string; pillar: string }> = {
    gps_installation: { label: "📍 GPS 4G + Corte", color: "text-[#93C5FD]", bg: "bg-[#0B1736]", border: "border-[#1E3A8A]", pillar: "instalaciones" },
    gps_maintenance: { label: "🔧 Mtto. GPS", color: "text-[#93C5FD]", bg: "bg-[#0B1736]", border: "border-[#1E3A8A]", pillar: "instalaciones" },
    camera_installation: { label: "📹 Dashcam HD", color: "text-[#93C5FD]", bg: "bg-[#0B1736]", border: "border-[#1E3A8A]", pillar: "instalaciones" },
    alarm_installation: { label: "🔔 Alarma Perimétrica", color: "text-[#93C5FD]", bg: "bg-[#0B1736]", border: "border-[#1E3A8A]", pillar: "instalaciones" },
    oil_change: { label: "🛢️ Aceite Sintético", color: "text-[#FDE68A]", bg: "bg-[#241908]", border: "border-[#451A03]", pillar: "mecanica" },
    tire_change: { label: "🛞 Llantas / Desvare", color: "text-[#FDE68A]", bg: "bg-[#241908]", border: "border-[#451A03]", pillar: "mecanica" },
    battery_service: { label: "🔋 Batería 12V", color: "text-[#FDE68A]", bg: "bg-[#241908]", border: "border-[#451A03]", pillar: "mecanica" },
    brake_service: { label: "🛑 Pastillas de Freno", color: "text-[#FDE68A]", bg: "bg-[#241908]", border: "border-[#451A03]", pillar: "mecanica" },
    vehicle_recovery: { label: "🚨 Reacción Inmediata 24/7", color: "text-[#FDA4AF]", bg: "bg-[#200A14]", border: "border-[#4C0519]", pillar: "reaccion" },
}

type StatusFilter = "all" | "active" | "completed" | "warranty_active" | "warranty_expired"
type Radius = 5 | 10 | 20 | 50

interface ServiceItem {
    id: string
    title: string
    service_type: string
    status: string
    service_address: string
    service_city: string
    estimated_price?: number
    commission_amount?: number
    warranty_status?: string
    warranty_days_left?: number
    vehicle_plate?: string
    created_at: string
    service_lat?: number
    service_lon?: number
    tech_invoice_number?: string
    tech_pdf_url?: string
    invoice_number?: string
    pdf_url?: string
}

const fallbackJobs: ServiceItem[] = [
    {
        id: "SRV-101",
        title: "Instalación GPS 4G + Corte Remoto de Motor",
        service_type: "gps_installation",
        status: "completed",
        service_address: "Cl 10 # 43E-12, El Poblado",
        service_city: "Medellín",
        estimated_price: 320000,
        commission_amount: 32000,
        warranty_status: "active",
        warranty_days_left: 28,
        vehicle_plate: "KLS-842",
        created_at: "2026-10-30T09:15:00Z",
        tech_invoice_number: "DIAN-COM-089",
        invoice_number: "SETT-2026-001",
    },
    {
        id: "SRV-102",
        title: "Alerta de Reacción Táctica Inmediata 24/7",
        service_type: "vehicle_recovery",
        status: "in_progress",
        service_address: "Autopista Sur Km 8, Itagüí",
        service_city: "Medellín",
        estimated_price: 450000,
        commission_amount: 45000,
        vehicle_plate: "UYT-109",
        created_at: "2026-10-30T14:30:00Z",
    },
    {
        id: "SRV-103",
        title: "Mecánica Express · Cambio Aceite Sintético + Filtro",
        service_type: "oil_change",
        status: "en_route",
        service_address: "Cra 43A # 1Sur-150, Poblado",
        service_city: "Medellín",
        estimated_price: 240000,
        commission_amount: 24000,
        vehicle_plate: "WZX-332",
        created_at: "2026-10-30T13:40:00Z",
    },
    {
        id: "SRV-104",
        title: "Instalación Dashcam Dual HD con Sensor de Parqueo",
        service_type: "camera_installation",
        status: "completed",
        service_address: "Circular 4 # 73-20, Laureles",
        service_city: "Medellín",
        estimated_price: 180000,
        commission_amount: 18000,
        warranty_status: "active",
        warranty_days_left: 22,
        vehicle_plate: "UBP-781",
        created_at: "2026-10-28T11:00:00Z",
        tech_invoice_number: "DIAN-COM-086",
        invoice_number: "SETT-2026-003",
    },
]

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function TechnicianJobsContent() {
    const [services, setServices] = useState<ServiceItem[]>([])
    const [stats, setStats] = useState({ total: 124, completed: 118, avgRating: 4.95 })
    const [isLoading, setIsLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
    const [radius, setRadius] = useState<Radius>(20)
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => {}
            )
        }
    }, [])

    useEffect(() => {
        async function fetchData() {
            const token = localStorage.getItem("access_token")
            setIsLoading(true)
            try {
                const response = await fetch(`${API_URL}/services?page_size=50`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                })

                if (response.ok) {
                    const data = await response.json()
                    const items = data.items || []
                    if (items.length > 0) {
                        setServices(items)
                        setStats({
                            total: items.length,
                            completed: items.filter((s: ServiceItem) => ["completed", "confirmed"].includes(s.status)).length,
                            avgRating: 4.95,
                        })
                    } else {
                        setServices(fallbackJobs)
                    }
                } else {
                    setServices(fallbackJobs)
                }
            } catch {
                setServices(fallbackJobs)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [API_URL])

    const filteredServices = services.filter((service) => {
        if (statusFilter === "active") {
            if (!["assigned", "en_route", "arrived", "in_progress"].includes(service.status)) return false
        } else if (statusFilter === "completed") {
            if (!["completed", "confirmed"].includes(service.status)) return false
        } else if (statusFilter === "warranty_active") {
            if (service.warranty_status !== "active") return false
        } else if (statusFilter === "warranty_expired") {
            if (service.warranty_status !== "expired") return false
        }
        if (userLocation && service.service_lat && service.service_lon) {
            const dist = haversineKm(userLocation.lat, userLocation.lng, service.service_lat, service.service_lon)
            if (dist > radius) return false
        }
        return true
    })

    const filterButtons: { key: StatusFilter; label: string }[] = [
        { key: "all", label: "Todos los Trabajos" },
        { key: "active", label: "Misiones Activas" },
        { key: "completed", label: "Completados" },
        { key: "warranty_active", label: "🛡️ Garantía Activa (30d)" },
    ]

    return (
        <div className="space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div className="flex items-center gap-3">
                    <Link
                        href="/tecnicos/dashboard"
                        className="p-2 rounded-xl bg-[#0B132B] border border-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                            <Briefcase className="h-6 w-6 text-blue-400" />
                            Mis Trabajos & Misiones // Red Tec360
                        </h1>
                        <p className="text-xs font-mono text-slate-400 mt-0.5">
                            Historial operativo de servicios ejecutados por Técnico Certificado Tec360
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-xl bg-[#0B1736] border border-[#1E3A8A] text-[#93C5FD] text-xs font-mono font-bold flex items-center gap-2 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Técnico Certificado Tec360
                    </span>
                </div>
            </div>

            {/* ─── Top 3 KPI Cards ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 font-mono">
                <div className="bg-[#0B132B] border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-md text-center">
                    <span className="text-[10px] sm:text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                        Total Trabajos
                    </span>
                    <p className="text-3xl font-black text-slate-100 mt-1">{stats.total}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Misiones asignadas</p>
                </div>

                <div className="bg-[#0B132B] border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-md text-center">
                    <span className="text-[10px] sm:text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                        Completados con Éxito
                    </span>
                    <p className="text-3xl font-black text-emerald-400 mt-1">{stats.completed}</p>
                    <p className="text-[10px] text-emerald-400/70 mt-0.5">Liquidación directa</p>
                </div>

                <div className="bg-[#0B132B] border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-md text-center">
                    <span className="text-[10px] sm:text-[11px] font-semibold uppercase text-slate-400 tracking-wider">
                        Calificación Promedio
                    </span>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                        <Star className="h-6 w-6 text-amber-400 fill-amber-400" />
                        <p className="text-3xl font-black text-amber-300">{stats.avgRating.toFixed(2)}</p>
                    </div>
                    <p className="text-[10px] text-amber-400/70 mt-0.5">Nivel Élite Tec360</p>
                </div>
            </div>

            {/* ─── Filters Bar ─── */}
            <div className="bg-[#080F24] border border-slate-800/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5 text-slate-500 mr-1" />
                    {filterButtons.map((btn) => (
                        <button
                            key={btn.key}
                            onClick={() => setStatusFilter(btn.key)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                statusFilter === btn.key
                                    ? "bg-[#0B1736] text-[#93C5FD] border border-[#1E3A8A] shadow-sm"
                                    : "bg-[#0B132B] text-slate-400 hover:text-slate-200 border border-slate-800/80"
                            }`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                {userLocation && (
                    <div className="flex items-center gap-2 bg-[#0B132B] border border-slate-800 rounded-xl px-3 py-1">
                        <MapPin className="h-3.5 w-3.5 text-blue-400" />
                        <span className="text-[10px] text-slate-400">Radio:</span>
                        {([5, 10, 20, 50] as Radius[]).map((r) => (
                            <button
                                key={r}
                                onClick={() => setRadius(r)}
                                className={`text-[10px] px-2 py-0.5 rounded-lg transition-all ${
                                    radius === r
                                        ? "bg-blue-600 text-white font-bold"
                                        : "text-slate-400 hover:text-white"
                                }`}
                            >
                                {r}km
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Service Jobs List ─── */}
            <div className="space-y-3 font-mono">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-xs">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                        <p>Cargando tus misiones operativas...</p>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {filteredServices.length === 0 ? (
                            <div className="bg-[#080F24] border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
                                <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-30 text-blue-400" />
                                <p className="font-bold text-slate-300">No se encontraron trabajos con los filtros seleccionados</p>
                            </div>
                        ) : (
                            filteredServices.map((service, index) => {
                                const stBadge = statusLabels[service.status] || {
                                    label: service.status,
                                    color: "text-slate-400",
                                    bg: "bg-slate-800",
                                    border: "border-slate-700"
                                }
                                const typeCfg = typeConfig[service.service_type] || {
                                    label: service.service_type,
                                    color: "text-slate-300",
                                    bg: "bg-slate-800",
                                    border: "border-slate-700",
                                    pillar: "general"
                                }

                                return (
                                    <motion.div
                                        key={service.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ delay: index * 0.04 }}
                                    >
                                        <Link href={`/tecnicos/servicio/${service.id}`}>
                                            <div className="p-4 sm:p-5 rounded-2xl bg-[#080F24] border border-slate-800/80 hover:border-slate-700 hover:bg-[#080F24]/90 transition-all shadow-lg group cursor-pointer space-y-3">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-700 text-xs font-bold font-mono">
                                                            {service.vehicle_plate || "VEH-360"}
                                                        </span>
                                                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${typeCfg.bg} ${typeCfg.color} ${typeCfg.border}`}>
                                                            {typeCfg.label}
                                                        </span>
                                                        {service.warranty_status === "active" && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 rounded-lg">
                                                                🛡️ Garantía ({service.warranty_days_left}d)
                                                            </span>
                                                        )}
                                                    </div>

                                                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border self-start sm:self-auto ${stBadge.bg} ${stBadge.color} ${stBadge.border}`}>
                                                        {stBadge.label}
                                                    </span>
                                                </div>

                                                <div>
                                                    <h3 className="font-bold text-sm text-slate-100 group-hover:text-blue-300 transition-colors">
                                                        {service.title}
                                                    </h3>
                                                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                                                        <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                                        <span>{service.service_address}, {service.service_city}</span>
                                                    </p>
                                                </div>

                                                <div className="pt-2 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                                    <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="h-3.5 w-3.5 text-slate-500" />
                                                            {format(new Date(service.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                                                        </span>
                                                        {service.estimated_price && (
                                                            <span className="font-bold text-emerald-400">
                                                                Cobro: ${service.estimated_price.toLocaleString("es-CO")} COP
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 self-end sm:self-auto">
                                                        {service.tech_invoice_number && (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0B1736] text-[#93C5FD] border border-[#1E3A8A]">
                                                                {service.tech_invoice_number}
                                                            </span>
                                                        )}
                                                        <span className="text-blue-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 text-[11px] font-bold">
                                                            <span>Ver Misión</span>
                                                            <ChevronRight className="w-3.5 h-3.5" />
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    </motion.div>
                                )
                            })
                        )}
                    </AnimatePresence>
                )}
            </div>
        </div>
    )
}

export default function TechnicianJobsPage() {
    return (
        <ProtectedRoute>
            <div className="pt-24 pb-12 px-4 md:px-6 lg:px-8 min-h-screen bg-[#020408]">
                <div className="max-w-4xl mx-auto">
                    <TechnicianJobsContent />
                </div>
            </div>
        </ProtectedRoute>
    )
}
