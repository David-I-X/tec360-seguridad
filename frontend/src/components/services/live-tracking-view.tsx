"use client"

import { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, MapPin, Phone, User, Navigation, CheckCircle2 } from "lucide-react"
import { serviceWebSocket, type WebSocketMessage } from "@/lib/websocket"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// Lazy load map
const ServiceMap = dynamic(
    () => import("@/components/services/service-map"),
    { ssr: false, loading: () => <div className="h-[300px] bg-muted/20 animate-pulse rounded-xl" /> }
)

interface LiveTrackingViewProps {
    service: any
    token: string
}

type TrackingStatus = "searching" | "found" | "en_route" | "arriving" | "arrived" | "completed"

export function LiveTrackingView({ service, token }: LiveTrackingViewProps) {
    const [status, setStatus] = useState<TrackingStatus>(
        service.status === "pending" ? "searching" :
            service.status === "assigned" ? "en_route" :
                service.status === "in_progress" ? "arrived" :
                    service.status === "completed" ? "completed" : "en_route"
    )
    const [technician, setTechnician] = useState(service.technician || null)
    const [technicianLocation, setTechnicianLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [isConnected, setIsConnected] = useState(false)

    // Connect to WebSocket
    useEffect(() => {
        if (!service.id || !token) return

        serviceWebSocket.connect(service.id, token)

        const unsubscribe = serviceWebSocket.onMessage((message: WebSocketMessage) => {
            console.log("[LiveTracking] Message:", message)

            if (message.type === "connected") {
                setIsConnected(true)
            } else if (message.type === "status_update") {
                const { status: newStatus, technician: techData } = message.data

                if (newStatus === "assigned") {
                    setStatus("found")
                    if (techData) setTechnician(techData)

                    // After 2 seconds, change to en_route
                    setTimeout(() => setStatus("en_route"), 2000)
                } else if (newStatus === "in_progress") {
                    setStatus("arrived")
                } else if (newStatus === "completed") {
                    setStatus("completed")
                }
            } else if (message.type === "location_update") {
                const { lat, lng } = message.data
                setTechnicianLocation({ lat, lng })
            }
        })

        return () => {
            unsubscribe()
            serviceWebSocket.disconnect()
        }
    }, [service.id, token])

    return (
        <div className="space-y-4">
            {/* Status Banner */}
            <AnimatePresence mode="wait">
                {status === "searching" && <SearchingBanner key="searching" />}
                {status === "found" && <FoundBanner key="found" technician={technician} />}
                {status === "en_route" && <EnRouteBanner key="en_route" technician={technician} />}
                {status === "arrived" && <ArrivedBanner key="arrived" technician={technician} />}
                {status === "completed" && <CompletedBanner key="completed" />}
            </AnimatePresence>

            {/* Map with live tracking */}
            <GlassCard className="p-0 overflow-hidden">
                <ServiceMap
                    lat={service.service_lat}
                    lng={service.service_lon}
                    address={service.service_address}
                    technicianLat={technicianLocation?.lat}
                    technicianLng={technicianLocation?.lng}
                />
            </GlassCard>

            {/* Technician Info Card (when assigned) */}
            {technician && status !== "searching" && status !== "completed" && (
                <TechnicianCard technician={technician} />
            )}

            {/* Connection indicator */}
            <div className="flex justify-center">
                <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
                    {isConnected ? "🟢 Conectado en vivo" : "🔴 Reconectando..."}
                </Badge>
            </div>
        </div>
    )
}

// Sub-components for different states

function SearchingBanner() {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
        >
            <GlassCard className="p-6 text-center bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="h-8 w-8 text-primary" />
                        </div>
                        {/* Pulsing rings */}
                        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping animation-delay-200" style={{ animationDelay: "0.2s" }} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Buscando técnico disponible...</h3>
                        <p className="text-sm text-muted-foreground">Te notificaremos cuando uno acepte tu solicitud</p>
                    </div>
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
            </GlassCard>
        </motion.div>
    )
}

function FoundBanner({ technician }: { technician: any }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
        >
            <GlassCard className="p-6 text-center bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 10 }}
                    className="w-16 h-16 mx-auto rounded-full bg-green-500 flex items-center justify-center mb-4"
                >
                    <CheckCircle2 className="h-10 w-10 text-white" />
                </motion.div>
                <h3 className="text-xl font-bold text-green-600">¡Técnico encontrado!</h3>
                <p className="text-muted-foreground">{technician?.full_name || "Un técnico"} aceptó tu solicitud</p>
            </GlassCard>
        </motion.div>
    )
}

function EnRouteBanner({ technician }: { technician: any }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
        >
            <GlassCard className="p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Navigation className="h-6 w-6 text-blue-500 animate-pulse" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold">Técnico en camino</h3>
                        <p className="text-sm text-muted-foreground">{technician?.full_name} está yendo hacia ti</p>
                    </div>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                        En camino
                    </Badge>
                </div>
            </GlassCard>
        </motion.div>
    )
}

function ArrivedBanner({ technician }: { technician: any }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
        >
            <GlassCard className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-green-500" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold">Técnico ha llegado</h3>
                        <p className="text-sm text-muted-foreground">{technician?.full_name} está en el lugar</p>
                    </div>
                    <Badge className="bg-green-500">Trabajando</Badge>
                </div>
            </GlassCard>
        </motion.div>
    )
}

function CompletedBanner() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            <GlassCard className="p-6 text-center bg-gradient-to-r from-green-500/20 to-emerald-500/20">
                <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-xl font-bold">¡Servicio completado!</h3>
                <p className="text-muted-foreground">Gracias por usar Tec360</p>
            </GlassCard>
        </motion.div>
    )
}

function TechnicianCard({ technician }: { technician: any }) {
    return (
        <GlassCard className="p-4">
            <div className="flex items-center gap-4">
                {technician.avatar_url ? (
                    <img src={technician.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
                ) : (
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-7 w-7 text-primary" />
                    </div>
                )}
                <div className="flex-1">
                    <h4 className="font-semibold">{technician.full_name || "Técnico Tec360"}</h4>
                    <p className="text-sm text-muted-foreground">Técnico certificado</p>
                </div>
                {technician.phone && (
                    <Button variant="outline" size="icon" asChild>
                        <a href={`tel:${technician.phone}`}>
                            <Phone className="h-4 w-4" />
                        </a>
                    </Button>
                )}
            </div>
        </GlassCard>
    )
}
