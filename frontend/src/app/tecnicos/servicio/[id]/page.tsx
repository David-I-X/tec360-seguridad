"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowLeft, MapPin, Calendar, Phone, Navigation, Loader2, CheckCircle } from "lucide-react"

import { ProtectedRoute, useAuth } from "@/lib/auth-context"
import { getServiceById } from "@/lib/api"
import { useLocationTracking } from "@/lib/use-location-tracking"
import { serviceWebSocket } from "@/lib/websocket"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GlassCard } from "@/components/ui/glass-card"
import { useToast } from "@/components/ui/use-toast"

// Lazy load del mapa
const ServiceMap = dynamic(
    () => import("@/components/services/service-map"),
    { ssr: false, loading: () => <div className="h-[300px] bg-muted/20 animate-pulse rounded-xl" /> }
)

function TechnicianServiceContent() {
    const params = useParams()
    const router = useRouter()
    const { user } = useAuth()
    const { toast } = useToast()
    const [service, setService] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")
    const [isTracking, setIsTracking] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null

    // Location tracking hook - active for all in-progress states
    const isActiveService = service && ["assigned", "en_route", "arrived", "in_progress"].includes(service.status)

    useLocationTracking({
        serviceId: params.id as string,
        enabled: isTracking && isActiveService,
        intervalMs: 5000,
    })

    useEffect(() => {
        async function fetchService() {
            try {
                const data = await getServiceById(params.id as string)
                setService(data)

                // Auto-enable tracking if service is in active state
                if (["assigned", "en_route", "arrived", "in_progress"].includes(data.status)) {
                    setIsTracking(true)
                }
            } catch (err: any) {
                setError(err.message || "Error al cargar servicio")
            } finally {
                setIsLoading(false)
            }
        }
        fetchService()
    }, [params.id])

    // Connect to WebSocket for service room
    useEffect(() => {
        if (service?.id && token) {
            serviceWebSocket.connect(service.id, token)
            return () => serviceWebSocket.disconnect()
        }
    }, [service?.id, token])

    const handleStartTracking = () => {
        setIsTracking(true)
        toast({
            title: "Tracking activado",
            description: "Tu ubicación se está enviando al cliente",
        })
    }

    const handleStopTracking = () => {
        setIsTracking(false)
        toast({
            title: "Tracking desactivado",
            description: "Ya no se envía tu ubicación",
        })
    }

    const updateStatus = async (newStatus: string) => {
        const token = localStorage.getItem("access_token")
        if (!token) return

        setIsUpdating(true)
        try {
            const response = await fetch(
                `${API_URL}/services/${params.id}/status?new_status=${newStatus}`,
                {
                    method: "PATCH",
                    headers: { Authorization: `Bearer ${token}` },
                }
            )

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.detail || "Error al actualizar estado")
            }

            const result = await response.json()
            console.log("[Status Update] Changed to:", newStatus, "Response:", result)

            // Update local state
            setService((prev: any) => {
                console.log("[State] Previous status:", prev?.status, "New status:", newStatus)
                return { ...prev, status: newStatus }
            })

            const statusMessages: Record<string, string> = {
                en_route: "En camino - El cliente ha sido notificado",
                arrived: "Has llegado al lugar - Cliente notificado",
                in_progress: "Servicio en progreso",
                completed: "¡Servicio completado exitosamente!",
            }

            toast({
                title: statusMessages[newStatus] || "Estado actualizado",
            })

            if (newStatus === "completed") {
                setTimeout(() => router.push("/tecnicos/dashboard"), 1500)
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            })
        } finally {
            setIsUpdating(false)
        }
    }

    const handleEnRoute = () => updateStatus("en_route")
    const handleArrived = () => updateStatus("arrived")
    const handleInProgress = () => updateStatus("in_progress")
    const handleCompleteService = () => updateStatus("completed")

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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push("/tecnicos/dashboard")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">{service.title}</h1>
                    <p className="text-muted-foreground">Servicio asignado</p>
                </div>
                <Badge className={isTracking ? "bg-green-500" : "bg-gray-400"}>
                    {isTracking ? "📍 Tracking activo" : "Tracking inactivo"}
                </Badge>
            </div>

            {/* Map showing destination */}
            <GlassCard className="p-0 overflow-hidden">
                <ServiceMap
                    lat={service.service_lat}
                    lng={service.service_lon}
                    address={service.service_address}
                />
            </GlassCard>

            {/* Client Info */}
            <GlassCard className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Ubicación del Servicio
                </h3>
                <p className="text-lg font-medium">{service.service_address}</p>
                <p className="text-sm text-muted-foreground">{service.service_city}</p>

                <div className="mt-4 flex gap-2">
                    <Button asChild className="flex-1">
                        <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${service.service_lat},${service.service_lon}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Navigation className="mr-2 h-4 w-4" />
                            Navegar con Google Maps
                        </a>
                    </Button>
                </div>
            </GlassCard>

            {/* Service details */}
            <div className="grid gap-4 md:grid-cols-2">
                <GlassCard className="p-6">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Fecha programada
                    </h3>
                    <p className="text-sm">
                        {service.scheduled_date
                            ? format(new Date(service.scheduled_date), "PPP 'a las' p", { locale: es })
                            : "Por definir"}
                    </p>
                </GlassCard>

                {service.client && (
                    <GlassCard className="p-6">
                        <h3 className="font-semibold mb-2">Cliente</h3>
                        <p className="text-sm">{service.client.full_name || "Cliente"}</p>
                        {service.client.phone && (
                            <Button variant="outline" size="sm" className="mt-2" asChild>
                                <a href={`tel:${service.client.phone}`}>
                                    <Phone className="mr-2 h-4 w-4" />
                                    Llamar
                                </a>
                            </Button>
                        )}
                    </GlassCard>
                )}
            </div>

            {/* Description */}
            <GlassCard className="p-6">
                <h3 className="font-semibold mb-2">Descripción del trabajo</h3>
                <p className="text-sm text-muted-foreground">{service.description || "Sin descripción adicional"}</p>
            </GlassCard>

            {/* Action buttons - Status-aware */}
            <div className="space-y-3">
                {/* Tracking controls */}
                <div className="grid gap-3 md:grid-cols-2">
                    {!isTracking ? (
                        <Button onClick={handleStartTracking} size="lg" className="w-full" disabled={isUpdating}>
                            <Navigation className="mr-2 h-5 w-5" />
                            Iniciar Tracking
                        </Button>
                    ) : (
                        <Button onClick={handleStopTracking} variant="outline" size="lg" className="w-full" disabled={isUpdating}>
                            Pausar Tracking
                        </Button>
                    )}

                    {/* Navigate button */}
                    <Button asChild size="lg" variant="outline" className="w-full">
                        <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${service.service_lat},${service.service_lon}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Navigation className="mr-2 h-5 w-5" />
                            Abrir en Maps
                        </a>
                    </Button>
                </div>

                {/* Status action buttons - show based on current status */}
                {service.status === "assigned" && (
                    <Button
                        onClick={handleEnRoute}
                        size="lg"
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={isUpdating}
                    >
                        <Navigation className="mr-2 h-5 w-5" />
                        {isUpdating ? "Actualizando..." : "🚗 Estoy en camino"}
                    </Button>
                )}

                {service.status === "en_route" && (
                    <Button
                        onClick={handleArrived}
                        size="lg"
                        className="w-full bg-orange-600 hover:bg-orange-700"
                        disabled={isUpdating}
                    >
                        <MapPin className="mr-2 h-5 w-5" />
                        {isUpdating ? "Actualizando..." : "📍 He llegado al lugar"}
                    </Button>
                )}

                {service.status === "arrived" && (
                    <Button
                        onClick={handleInProgress}
                        size="lg"
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        disabled={isUpdating}
                    >
                        🔧 {isUpdating ? "Actualizando..." : "Iniciar trabajo"}
                    </Button>
                )}

                {(service.status === "in_progress" || service.status === "arrived") && (
                    <Button
                        onClick={handleCompleteService}
                        size="lg"
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={isUpdating}
                    >
                        <CheckCircle className="mr-2 h-5 w-5" />
                        {isUpdating ? "Completando..." : "✅ Marcar como Completado"}
                    </Button>
                )}
            </div>

            {/* Connection status */}
            <div className="flex justify-center">
                <Badge variant="outline" className="text-xs">
                    {serviceWebSocket.isConnected ? "🟢 Conectado" : "🔴 Desconectado"}
                </Badge>
            </div>
        </div>
    )
}

export default function TechnicianServicePage() {
    return (
        <ProtectedRoute requiredRole="technician">
            <div className="container py-8 px-4 max-w-4xl">
                <TechnicianServiceContent />
            </div>
        </ProtectedRoute>
    )
}
