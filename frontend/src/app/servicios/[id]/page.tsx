"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import dynamic from "next/dynamic"
import { ArrowLeft, Calendar, MapPin, User, Wrench, Clock, Loader2, FileText } from "lucide-react"

import { ProtectedRoute, useAuth } from "@/lib/auth-context"
import { getServiceById } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GlassCard } from "@/components/ui/glass-card"
import { LiveTrackingView } from "@/components/services/live-tracking-view"
import { RatingModal } from "@/components/ratings/rating-modal"

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Pendiente", variant: "secondary" },
    quoted: { label: "Con Cotizaciones", variant: "default" },
    assigned: { label: "Asignado", variant: "default" },
    en_route: { label: "En camino", variant: "default" },
    arrived: { label: "Llegó", variant: "default" },
    in_progress: { label: "En Progreso", variant: "default" },
    completed: { label: "Completado", variant: "outline" },
    cancelled: { label: "Cancelado", variant: "destructive" },
}

const typeLabels: Record<string, string> = {
    camera_installation: "Instalación de Cámaras",
    alarm_installation: "Instalación de Alarma",
    gps_installation: "Instalación de GPS",
    camera_maintenance: "Mantenimiento CCTV",
    alarm_maintenance: "Mantenimiento Alarma",
    gps_maintenance: "Mantenimiento GPS",
    other: "Servicio Técnico",
}

function ServiceDetailContent() {
    const params = useParams()
    const router = useRouter()
    const { user } = useAuth()
    const [service, setService] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")
    const [showRatingModal, setShowRatingModal] = useState(false)
    const [hasRated, setHasRated] = useState(false)

    // Get token for WebSocket
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null

    useEffect(() => {
        async function fetchService() {
            try {
                const data = await getServiceById(params.id as string)
                setService(data)
            } catch (err: any) {
                setError(err.message || "Error al cargar servicio")
            } finally {
                setIsLoading(false)
            }
        }
        fetchService()
    }, [params.id])

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error) {
        return (
            <GlassCard className="p-8 text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={() => router.back()}>Volver</Button>
            </GlassCard>
        )
    }

    if (!service) return null

    const statusInfo = statusLabels[service.status] || { label: service.status, variant: "secondary" as const }

    // Show live tracking for client when service is active (not completed/cancelled)
    const showLiveTracking = user?.role === "client" &&
        ["assigned", "en_route", "arrived", "in_progress"].includes(service.status)

    // Show quotations card for clients when service is pending or quoted
    const showQuotationsCard = user?.role === "client" &&
        ["pending", "quoted"].includes(service.status)

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold">{service.title}</h1>
                        <p className="text-muted-foreground">{typeLabels[service.service_type] || service.service_type}</p>
                    </div>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </div>

                {/* Quotations Card - for clients with pending/quoted services */}
                {showQuotationsCard && (
                    <GlassCard className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <FileText className="h-7 w-7 text-blue-500" />
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <h3 className="font-semibold text-lg">
                                    {service.status === "quoted"
                                        ? "¡Tienes cotizaciones!"
                                        : "Esperando cotizaciones"}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {service.status === "quoted"
                                        ? "Los técnicos han enviado propuestas para tu servicio"
                                        : "Los técnicos pronto enviarán sus presupuestos"}
                                </p>
                            </div>
                            <Button
                                onClick={() => router.push(`/servicios/${params.id}/cotizaciones`)}
                                className="bg-blue-500 hover:bg-blue-600"
                            >
                                Ver Cotizaciones
                            </Button>
                        </div>
                    </GlassCard>
                )}

                {/* Live Tracking View (for clients with active services) */}
                {showLiveTracking && token ? (
                    <LiveTrackingView service={service} token={token} />
                ) : (
                    <>
                        {/* Static Map for completed/cancelled services or technicians */}
                        <GlassCard className="p-0 overflow-hidden">
                            <ServiceMapStatic
                                lat={service.service_lat}
                                lng={service.service_lon}
                                address={service.service_address}
                            />
                        </GlassCard>

                        {/* Details Grid */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <GlassCard className="p-6">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    Ubicación
                                </h3>
                                <p className="text-sm text-muted-foreground">{service.service_address}</p>
                                <p className="text-xs text-muted-foreground mt-1">{service.service_city}</p>
                            </GlassCard>

                            <GlassCard className="p-6">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Fecha Programada
                                </h3>
                                <p className="text-sm">
                                    {service.scheduled_date
                                        ? format(new Date(service.scheduled_date), "PPP", { locale: es })
                                        : "Por definir"}
                                </p>
                            </GlassCard>

                            <GlassCard className="p-6">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <Wrench className="h-4 w-4" />
                                    Descripción
                                </h3>
                                <p className="text-sm text-muted-foreground">{service.description || "Sin descripción"}</p>
                            </GlassCard>

                            <GlassCard className="p-6">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Información
                                </h3>
                                <div className="text-sm space-y-1">
                                    <p><span className="text-muted-foreground">Creado:</span> {format(new Date(service.created_at), "Pp", { locale: es })}</p>
                                    {service.estimated_price && (
                                        <p><span className="text-muted-foreground">Precio Estimado:</span> ${service.estimated_price.toLocaleString()}</p>
                                    )}
                                </div>
                            </GlassCard>
                        </div>

                        {/* Technician Info (if assigned) */}
                        {service.technician && (
                            <GlassCard className="p-6">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Técnico Asignado
                                </h3>
                                <div className="flex items-center gap-4">
                                    {service.technician.avatar_url ? (
                                        <img src={service.technician.avatar_url} alt="" className="w-12 h-12 rounded-full" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                            <User className="h-6 w-6 text-primary" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-medium">{service.technician.full_name || "Técnico"}</p>
                                        <p className="text-sm text-muted-foreground">{service.technician.email}</p>
                                    </div>
                                </div>
                            </GlassCard>
                        )}
                    </>
                )}

                {/* Rating prompt for completed services */}
                {service.status === "completed" && user?.role === "client" && !hasRated && (
                    <GlassCard className="p-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="text-4xl">⭐</div>
                            <div className="flex-1 text-center sm:text-left">
                                <h3 className="font-semibold text-lg">¿Cómo fue tu experiencia?</h3>
                                <p className="text-sm text-muted-foreground">
                                    Tu opinión nos ayuda a mejorar
                                </p>
                            </div>
                            <Button
                                onClick={() => setShowRatingModal(true)}
                                className="bg-yellow-500 hover:bg-yellow-600 text-black"
                            >
                                Calificar Servicio
                            </Button>
                        </div>
                    </GlassCard>
                )}

                {hasRated && (
                    <GlassCard className="p-4 bg-green-500/10 border-green-500/20 text-center">
                        <p className="text-green-500 font-medium">✅ ¡Gracias por tu calificación!</p>
                    </GlassCard>
                )}
            </div>

            {/* Rating Modal */}
            <RatingModal
                serviceId={params.id as string}
                technicianName={service.technician?.full_name}
                isOpen={showRatingModal}
                onClose={() => setShowRatingModal(false)}
                onSuccess={() => setHasRated(true)}
            />
        </>
    )
}

// Static map component (lazy loaded)
const ServiceMapStatic = dynamic(
    () => import("@/components/services/service-map"),
    {
        ssr: false,
        loading: () => <div className="h-[300px] w-full bg-muted/20 animate-pulse rounded-xl" />
    }
)

export default function ServiceDetailPage() {
    return (
        <ProtectedRoute>
            <div className="container pt-24 pb-8 px-4 max-w-4xl">
                <ServiceDetailContent />
            </div>
        </ProtectedRoute>
    )
}
