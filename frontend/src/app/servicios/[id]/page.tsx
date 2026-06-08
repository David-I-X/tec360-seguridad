"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import dynamic from "next/dynamic"
import { ArrowLeft, Calendar, MapPin, User, Wrench, Clock, Loader2, FileText, XCircle, MessageSquare } from "lucide-react"

import { ProtectedRoute, useAuth } from "@/lib/auth-context"
import { getServiceById, cancelService, confirmService } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GlassCard } from "@/components/ui/glass-card"
import { LiveTrackingView } from "@/components/services/live-tracking-view"
import { RatingModal } from "@/components/ratings/rating-modal"
import PaymentModal from "@/components/PaymentModal"
import { TrackingSimulator } from "@/components/services/tracking-simulator"
import { StarDisplay } from "@/components/ui/star-rating"
import { getAvatarUrl } from "@/lib/utils"
import Link from "next/link"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ServiceChat } from "@/components/chat/ServiceChat"

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
    camera_installation: "Instalación Dashcam",
    alarm_installation: "Instalación de Alarma",
    gps_installation: "Instalación de GPS",
    camera_maintenance: "Mantenimiento Dashcam",
    alarm_maintenance: "Mantenimiento Alarma",
    gps_maintenance: "Mantenimiento GPS",
    vehicle_recovery: "Equipo de Reacción",
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
    const [isCancelling, setIsCancelling] = useState(false)
    const [isConfirming, setIsConfirming] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)

    const handleCancel = async () => {
        setIsCancelling(true)
        try {
            await cancelService(params.id as string)
            setService((prev: any) => ({ ...prev, status: "cancelled" }))
        } catch (err: any) {
            console.error("Cancel error:", err)
        } finally {
            setIsCancelling(false)
        }
    }

    const handleConfirm = async (method: string) => {
        setIsConfirming(true)
        try {
            await confirmService(params.id as string, method)
            setService((prev: any) => ({ ...prev, status: "confirmed", payment_method: method }))
        } catch (err: any) {
            console.error("Confirm error:", err)
        } finally {
            setIsConfirming(false)
        }
    }

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

                {/* Cancel button — only for pending/quoted services */}
                {user?.role === "client" && ["pending", "quoted"].includes(service.status) && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/5 hover:border-red-500/50"
                                disabled={isCancelling}
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                {isCancelling ? "Cancelando..." : "Cancelar servicio"}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Cancelar este servicio?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. El servicio pasará a estado cancelado
                                    y los técnicos ya no podrán verlo ni aceptarlo.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>No, mantener</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleCancel}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                    Sí, cancelar servicio
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
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
                                    {service.service_type === "vehicle_recovery" ? "Equipo Asignado" : "Técnico Asignado"}
                                </h3>
                                <div className="flex items-center gap-4">
                                    {service.technician.avatar_url ? (
                                        <img src={getAvatarUrl(service.technician.avatar_url)} alt="" className="w-14 h-14 rounded-2xl object-cover" />
                                    ) : (
                                        <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center text-xl font-bold text-white">
                                            {(service.technician.full_name || "T").charAt(0)}
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <p className="font-semibold">{service.technician.full_name || (service.service_type === "vehicle_recovery" ? "Agente" : "Técnico")}</p>
                                        {service.technician.average_rating > 0 && (
                                            <StarDisplay rating={service.technician.average_rating} size="sm" className="mt-0.5" />
                                        )}
                                        <p className="text-xs text-muted-foreground mt-0.5">{service.technician.email}</p>
                                    </div>
                                    {service.technician.user_id && (
                                        <Link href={`/tecnicos/perfil/${service.technician.user_id}`}>
                                            <Button variant="outline" size="sm" className="shrink-0">
                                                Ver perfil
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            </GlassCard>
                        )}
                        
                        {/* FAB for Chat - visible when technician is assigned */}
                        {service.technician && token && (
                            <div className="fixed bottom-6 right-6 z-50">
                                <Sheet>
                                    <SheetTrigger asChild>
                                        <Button className="h-14 w-14 rounded-full shadow-xl bg-brand hover:bg-brand-dark p-0 flex items-center justify-center group relative">
                                            <MessageSquare className="h-6 w-6 text-white" />
                                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 hidden group-hover:flex">
                                                Chat
                                            </span>
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-[100dvh]">
                                        <SheetHeader className="p-4 border-b bg-white dark:bg-slate-950">
                                            <SheetTitle className="flex items-center gap-2">
                                                <MessageSquare className="h-5 w-5 text-brand" />
                                                Chat del Servicio
                                            </SheetTitle>
                                        </SheetHeader>
                                        <div className="flex-1 overflow-hidden">
                                            <ServiceChat serviceId={service.id} />
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </div>
                        )}
                    </>
                )}

                {/* Confirmation prompt for completed services */}
                {service.status === "completed" && user?.role === "client" && (
                    <GlassCard className="p-6 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/20">
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="text-4xl">🛠️</div>
                            <div className="flex-1 text-center sm:text-left">
                                <h3 className="font-semibold text-lg">Servicio Finalizado</h3>
                                <p className="text-sm text-muted-foreground">
                                    El técnico ha indicado que terminó el trabajo. Por favor, confirma que todo quedó bien.
                                </p>
                            </div>
                            <Button
                                onClick={() => setShowPaymentModal(true)}
                                disabled={isConfirming}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isConfirming ? "Confirmando..." : "Confirmar y Pagar"}
                            </Button>
                        </div>
                    </GlassCard>
                )}

                {/* Rating prompt — shown on BOTH completed and confirmed */}
                {["completed", "confirmed"].includes(service.status) && user?.role === "client" && !hasRated && (
                    <GlassCard className="p-6 bg-gradient-to-br from-yellow-500/15 via-orange-500/10 to-amber-500/15 border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
                        <div className="flex flex-col sm:flex-row items-center gap-5">
                            <div className="text-5xl animate-bounce">⭐</div>
                            <div className="flex-1 text-center sm:text-left">
                                <h3 className="font-bold text-xl text-yellow-500">¡Tu opinión vale mucho!</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Califica al técnico y ayuda a otros clientes a elegir mejor.
                                    Tu calificación impacta directamente el nivel del técnico.
                                </p>
                            </div>
                            <Button
                                onClick={() => setShowRatingModal(true)}
                                className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold shadow-lg shadow-yellow-500/20 px-6"
                                size="lg"
                            >
                                ⭐ Calificar Servicio
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

            {/* Payment Modal */}
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                amount={service?.estimated_price || 0}
                onConfirm={handleConfirm}
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
