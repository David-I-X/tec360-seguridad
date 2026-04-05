"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import {
    Loader2, MapPin, Phone, User, Navigation, CheckCircle2,
    AlertTriangle, Wifi, WifiOff, Clock
} from "lucide-react"
import { serviceWebSocket, type WebSocketMessage } from "@/lib/websocket"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrackingSimulator } from "./tracking-simulator"
import { getAvatarUrl } from "@/lib/utils"

// Lazy load map
const ServiceMap = dynamic(
    () => import("@/components/services/service-map"),
    { ssr: false, loading: () => <div className="h-[350px] bg-muted/20 animate-pulse rounded-xl" /> }
)

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface LiveTrackingViewProps {
    service: any
    token: string
}

type TrackingStatus = "searching" | "found" | "en_route" | "arriving" | "arrived" | "completed"

export function LiveTrackingView({ service, token }: LiveTrackingViewProps) {
    const [status, setStatus] = useState<TrackingStatus>(
        service.status === "pending" ? "searching" :
            service.status === "assigned" ? "en_route" :
                service.status === "en_route" ? "en_route" :
                    service.status === "arrived" ? "arrived" :
                        service.status === "in_progress" ? "arrived" :
                            service.status === "completed" ? "completed" : "en_route"
    )
    const [technician, setTechnician] = useState(service.technician || null)
    const [technicianLocation, setTechnicianLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [locationError, setLocationError] = useState<string | null>(null)
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
    const [updateCount, setUpdateCount] = useState(0)
    const wsLocationReceived = useRef(false)
    const pollingRef = useRef<NodeJS.Timeout | null>(null)

    // ============================================================
    // REST polling fallback — fetches location if WS is not providing it
    // ============================================================
    const fetchLocationViaREST = useCallback(async () => {
        if (!service.id || !token) return

        try {
            const response = await fetch(`${API_URL}/location/${service.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            })

            if (response.ok) {
                const data = await response.json()
                if (data.technician_location) {
                    const loc = {
                        lat: data.technician_location.lat,
                        lng: data.technician_location.lng,
                    }
                    setTechnicianLocation(loc)
                    setLastUpdate(new Date())
                    console.log("[LiveTracking] REST position:", loc)
                }
            }
        } catch (err) {
            console.warn("[LiveTracking] REST location fetch failed:", err)
        }
    }, [service.id, token])

    // ============================================================
    // WebSocket connection
    // ============================================================
    useEffect(() => {
        if (!service.id || !token) return

        console.log("[LiveTracking] Connecting WebSocket for service:", service.id)
        serviceWebSocket.connect(service.id, token)

        const unsubscribe = serviceWebSocket.onMessage((message: WebSocketMessage) => {
            console.log("[LiveTracking] WS Message:", message.type, message.type === "location_update" ? message.data : "")

            if (message.type === "connected") {
                setIsConnected(true)
                console.log("[LiveTracking] ✅ WS connected to room")
            } else if (message.type === "status_update") {
                const { status: newStatus, technician: techData } = message.data

                if (newStatus === "assigned") {
                    setStatus("found")
                    if (techData) setTechnician(techData)
                    setTimeout(() => setStatus("en_route"), 2000)
                } else if (newStatus === "en_route") {
                    setStatus("en_route")
                } else if (newStatus === "arrived") {
                    setStatus("arrived")
                } else if (newStatus === "in_progress") {
                    setStatus("arrived")
                } else if (newStatus === "completed") {
                    setStatus("completed")
                }
            } else if (message.type === "location_update") {
                const { lat, lng } = message.data
                setTechnicianLocation({ lat, lng })
                setLastUpdate(new Date())
                setUpdateCount(prev => prev + 1)
                wsLocationReceived.current = true
                setLocationError(null)
            }
        })

        return () => {
            unsubscribe()
            serviceWebSocket.disconnect()
        }
    }, [service.id, token])

    // ============================================================
    // REST polling: fetch initial + periodic fallback every 8s
    // ============================================================
    useEffect(() => {
        if (!service.id || !token) return

        // Fetch initial position immediately
        fetchLocationViaREST()

        // Poll as fallback
        pollingRef.current = setInterval(() => {
            if (!wsLocationReceived.current) {
                fetchLocationViaREST()
            }
        }, 8000)

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current)
                pollingRef.current = null
            }
        }
    }, [service.id, token, fetchLocationViaREST])

    return (
        <div className="space-y-4">
            {/* Status Banner */}
            <AnimatePresence mode="wait">
                {status === "searching" && <SearchingBanner key="searching" isRecovery={service.service_type === "vehicle_recovery"} />}
                {status === "found" && <FoundBanner key="found" technician={technician} isRecovery={service.service_type === "vehicle_recovery"} />}
                {status === "en_route" && <EnRouteBanner key="en_route" technician={technician} isRecovery={service.service_type === "vehicle_recovery"} />}
                {status === "arrived" && <ArrivedBanner key="arrived" technician={technician} isRecovery={service.service_type === "vehicle_recovery"} />}
                {status === "completed" && <CompletedBanner key="completed" isRecovery={service.service_type === "vehicle_recovery"} />}
            </AnimatePresence>

            {/* Location error banner */}
            {locationError && (
                <GlassCard className="p-3 bg-amber-500/10 border-amber-500/20">
                    <div className="flex items-center gap-2 text-sm text-amber-600">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{locationError}</span>
                    </div>
                </GlassCard>
            )}

            {/* Map with live tracking */}
            <GlassCard className="p-0 overflow-hidden rounded-xl">
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
                <TechnicianCard technician={technician} isRecovery={service.service_type === "vehicle_recovery"} />
            )}

            {/* Connection status bar */}
            <div className="flex items-center justify-center gap-3">
                <Badge variant={isConnected ? "default" : "secondary"} className="text-xs gap-1">
                    {isConnected ? (
                        <><Wifi className="h-3 w-3" /> Conectado en vivo</>
                    ) : (
                        <><WifiOff className="h-3 w-3" /> Reconectando...</>
                    )}
                </Badge>

                {lastUpdate && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {updateCount} updates
                    </span>
                )}
            </div>

            {/* Dev: Tracking Simulator */}
            {process.env.NODE_ENV === "development" && (
                <TrackingSimulator
                    serviceId={service.id}
                    destLat={service.service_lat}
                    destLng={service.service_lon}
                />
            )}
        </div>
    )
}

// ============================================================
// Sub-components for different tracking states
// ============================================================

function SearchingBanner({ isRecovery }: { isRecovery?: boolean }) {
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
                        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">{isRecovery ? "Buscando equipo de reacción..." : "Buscando técnico disponible..."}</h3>
                        <p className="text-sm text-muted-foreground">{isRecovery ? "Asignando la alerta a los agentes cercanos" : "Te notificaremos cuando uno acepte tu solicitud"}</p>
                    </div>
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
            </GlassCard>
        </motion.div>
    )
}

function FoundBanner({ technician, isRecovery }: { technician: any, isRecovery?: boolean }) {
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
                <h3 className="text-xl font-bold text-green-600">{isRecovery ? "¡Equipo asignado!" : "¡Técnico encontrado!"}</h3>
                <p className="text-muted-foreground">{technician?.full_name || "Un técnico"} {isRecovery ? "atenderá tu alerta" : "aceptó tu solicitud"}</p>
            </GlassCard>
        </motion.div>
    )
}

function EnRouteBanner({ technician, isRecovery }: { technician: any, isRecovery?: boolean }) {
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
                        <h3 className="font-semibold">{isRecovery ? "Equipo en camino" : "Técnico en camino"}</h3>
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

function ArrivedBanner({ technician, isRecovery }: { technician: any, isRecovery?: boolean }) {
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
                        <h3 className="font-semibold">{isRecovery ? "Equipo en el lugar" : "Técnico ha llegado"}</h3>
                        <p className="text-sm text-muted-foreground">{technician?.full_name} {isRecovery ? "ha llegado al perímetro" : "está en el lugar"}</p>
                    </div>
                    <Badge className="bg-green-500">{isRecovery ? "Operando" : "Trabajando"}</Badge>
                </div>
            </GlassCard>
        </motion.div>
    )
}

function CompletedBanner({ isRecovery }: { isRecovery?: boolean }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            <GlassCard className="p-6 text-center bg-gradient-to-r from-green-500/20 to-emerald-500/20">
                <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-xl font-bold">{isRecovery ? "¡Vehículo asegurado!" : "¡Servicio completado!"}</h3>
                <p className="text-muted-foreground">{isRecovery ? "El operativo ha concluido exitosamente" : "Gracias por usar Tec360"}</p>
            </GlassCard>
        </motion.div>
    )
}

const RANK_INFO: Record<string, { label: string; color: string; icon: string; border: string }> = {
    bronze: { 
        label: "Bronce", 
        color: "text-amber-700 bg-gradient-to-r from-amber-700/10 to-amber-900/10 shadow-[0_0_10px_rgba(180,83,9,0.2)]", 
        border: "border-amber-700/40", 
        icon: "🥉" 
    },
    silver: { 
        label: "Plata", 
        color: "text-slate-200 bg-gradient-to-r from-slate-400/10 to-slate-600/10 shadow-[0_0_10px_rgba(148,163,184,0.2)]", 
        border: "border-slate-400/40", 
        icon: "🥈" 
    },
    gold: { 
        label: "Oro", 
        color: "text-yellow-400 bg-gradient-to-r from-yellow-400/10 to-transparent shadow-[0_0_15px_rgba(250,204,21,0.3)] font-bold", 
        border: "border-yellow-400/50", 
        icon: "🥇" 
    },
}

function TechnicianCard({ technician, isRecovery }: { technician: any, isRecovery?: boolean }) {
    return (
        <GlassCard className="p-4">
            <div className="flex items-center gap-4">
                {technician.avatar_url ? (
                    <img src={getAvatarUrl(technician.avatar_url)} alt="" className="w-14 h-14 rounded-full object-cover" />
                ) : (
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-7 w-7 text-primary" />
                    </div>
                )}
                <div className="flex-1">
                    <h4 className="font-semibold">{technician.full_name || (isRecovery ? "Agente Tec360" : "Técnico Tec360")}</h4>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground">{isRecovery ? "Equipo Especializado" : "Técnico certificado"}</p>
                        {technician.rank && RANK_INFO[technician.rank] && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${RANK_INFO[technician.rank].color} ${RANK_INFO[technician.rank].border}`}>
                                {RANK_INFO[technician.rank].icon} {RANK_INFO[technician.rank].label}
                            </span>
                        )}
                    </div>
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
