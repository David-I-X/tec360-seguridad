"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2, Filter, MapPin, Calendar, ChevronRight, Star, Briefcase } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { ProtectedRoute, useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GlassCard } from "@/components/ui/glass-card"

const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: "Pendiente", color: "bg-yellow-500" },
    assigned: { label: "Asignado", color: "bg-blue-500" },
    en_route: { label: "En camino", color: "bg-blue-600" },
    arrived: { label: "En sitio", color: "bg-orange-500" },
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
    other: "🔧 Otro",
}

type StatusFilter = "all" | "active" | "completed"

function TechnicianJobsContent() {
    const { user } = useAuth()
    const [services, setServices] = useState<any[]>([])
    const [stats, setStats] = useState({ total: 0, completed: 0, avgRating: 0 })
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

    useEffect(() => {
        async function fetchData() {
            const token = localStorage.getItem("access_token")
            if (!token) return

            setIsLoading(true)
            try {
                // Fetch services assigned to this technician
                const response = await fetch(`${API_URL}/services?page_size=50`, {
                    headers: { Authorization: `Bearer ${token}` },
                })

                if (!response.ok) throw new Error("Error al cargar trabajos")

                const data = await response.json()
                setServices(data.items || [])

                // Fetch rating stats
                try {
                    const statsRes = await fetch(`${API_URL}/ratings/me/stats`, {
                        headers: { Authorization: `Bearer ${token}` },
                    })
                    if (statsRes.ok) {
                        const statsData = await statsRes.json()
                        setStats({
                            total: data.items?.length || 0,
                            completed: data.items?.filter((s: any) => s.status === "completed").length || 0,
                            avgRating: statsData.average_rating || 0,
                        })
                    }
                } catch (e) {
                    // Stats fetch is optional
                }
            } catch (err: any) {
                setError(err.message)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [API_URL])

    // Filter services
    const filteredServices = services.filter((service) => {
        if (statusFilter === "all") return true
        if (statusFilter === "active") {
            return ["assigned", "en_route", "arrived", "in_progress"].includes(service.status)
        }
        if (statusFilter === "completed") return service.status === "completed"
        return true
    })

    const filterButtons: { key: StatusFilter; label: string }[] = [
        { key: "all", label: "Todos" },
        { key: "active", label: "Activos" },
        { key: "completed", label: "Completados" },
    ]

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Cargando tus trabajos...</p>
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Briefcase className="h-8 w-8" />
                        Mis Trabajos
                    </h1>
                    <p className="text-muted-foreground">
                        Historial de servicios que has realizado
                    </p>
                </div>
                <Button asChild variant="outline">
                    <Link href="/tecnicos/dashboard">Ver Dashboard</Link>
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <GlassCard className="p-4 text-center">
                    <p className="text-3xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total Trabajos</p>
                </GlassCard>
                <GlassCard className="p-4 text-center">
                    <p className="text-3xl font-bold text-green-500">{stats.completed}</p>
                    <p className="text-xs text-muted-foreground">Completados</p>
                </GlassCard>
                <GlassCard className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                        <p className="text-3xl font-bold">{stats.avgRating.toFixed(1)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Calificación</p>
                </GlassCard>
            </div>

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

            {/* Service List */}
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {filteredServices.length === 0 ? (
                        <GlassCard className="p-8 text-center">
                            <p className="text-muted-foreground">
                                No hay trabajos {statusFilter !== "all" ? filterButtons.find(b => b.key === statusFilter)?.label.toLowerCase() : ""}.
                            </p>
                        </GlassCard>
                    ) : (
                        filteredServices.map((service, index) => (
                            <motion.div
                                key={service.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Link href={`/tecnicos/servicio/${service.id}`}>
                                    <GlassCard className="p-5 hover:border-primary/30 transition-all group cursor-pointer">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-3 h-3 rounded-full shrink-0 ${statusLabels[service.status]?.color || "bg-gray-400"}`} />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold truncate">{service.title}</h3>
                                                    <Badge variant="secondary" className="shrink-0">
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
                                                    {service.estimated_price && (
                                                        <span className="font-medium text-green-500">
                                                            ${service.estimated_price.toLocaleString()}
                                                        </span>
                                                    )}
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
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

export default function TechnicianJobsPage() {
    return (
        <ProtectedRoute>
            <div className="container pt-24 pb-8 px-4 max-w-4xl">
                <TechnicianJobsContent />
            </div>
        </ProtectedRoute>
    )
}
