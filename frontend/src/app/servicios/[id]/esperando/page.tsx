"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, MapPin, Star, CheckCircle, X, Navigation, Phone, Clock, ChevronDown } from "lucide-react"
import { ProtectedRoute, useAuth } from "@/lib/auth-context"
import { getServiceById } from "@/lib/api"
import { serviceWebSocket, type WebSocketMessage } from "@/lib/websocket"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"

const WaitingMap = dynamic(() => import("@/components/services/service-map"), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted/20 animate-pulse" />,
})

const RANK_INFO: Record<string, { label: string; color: string; icon: string; border: string }> = {
    bronze: { label: "Bronce", color: "text-amber-700 dark:text-amber-600 bg-amber-700/10", border: "border-amber-700/20", icon: "🥉" },
    silver: { label: "Plata", color: "text-slate-500 dark:text-slate-400 bg-slate-500/10", border: "border-slate-500/20", icon: "🥈" },
    gold: { label: "Oro", color: "text-yellow-600 dark:text-yellow-500 bg-yellow-500/10", border: "border-yellow-500/20", icon: "🥇" },
}

/* ─── Radar animation ────────────────────────────────── */
function RadarPulse() {
    return (
        <div className="relative flex items-center justify-center w-28 h-28">
            {[1, 2, 3].map((i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full border border-blue-500/40"
                    initial={{ width: 48, height: 48, opacity: 0.8 }}
                    animate={{ width: 32 + i * 26, height: 32 + i * 26, opacity: 0 }}
                    transition={{ duration: 2, delay: i * 0.6, repeat: Infinity, ease: "easeOut" }}
                />
            ))}
            <motion.div
                className="relative z-10 w-14 h-14 rounded-full gradient-brand flex items-center justify-center shadow-xl shadow-blue-500/30"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
                <Shield className="w-7 h-7 text-white" />
            </motion.div>
        </div>
    )
}

function DotsLoader() {
    return (
        <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-blue-400"
                    animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
                />
            ))}
        </div>
    )
}

/* ─── Live service status stepper ───────────────────────── */
const SERVICE_STEPS = [
    { key: "assigned", label: "Técnico asignado", icon: "🔔", detail: "Tu técnico aceptó el servicio" },
    { key: "en_route", label: "En camino", icon: "🚗", detail: "El técnico está en ruta" },
    { key: "arrived", label: "Llegó", icon: "📍", detail: "El técnico está en tu ubicación" },
    { key: "in_progress", label: "Trabajando", icon: "🔧", detail: "El servicio está en progreso" },
    { key: "completed", label: "Completado", icon: "✅", detail: "¡Servicio terminado!" },
]

function StatusStepper({ status }: { status: string }) {
    const current = SERVICE_STEPS.findIndex(s => s.key === status)
    const activeStep = SERVICE_STEPS[current]

    return (
        <div className="w-full">
            {/* Current status */}
            <div className="flex items-center gap-3 mb-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3">
                <span className="text-2xl">{activeStep?.icon || "🔍"}</span>
                <div>
                    <p className="font-semibold text-sm">{activeStep?.label || "Procesando"}</p>
                    <p className="text-xs text-muted-foreground">{activeStep?.detail || ""}</p>
                </div>
            </div>

            {/* Steps */}
            <div className="space-y-2">
                {SERVICE_STEPS.map((step, i) => {
                    const done = i < current
                    const active = i === current
                    const upcoming = i > current
                    return (
                        <motion.div
                            key={step.key}
                            initial={false}
                            animate={{ opacity: upcoming ? 0.4 : 1 }}
                            className="flex items-center gap-3"
                        >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 shrink-0 transition-all ${done ? "bg-green-500 border-green-500" :
                                active ? "bg-blue-500/20 border-blue-500" :
                                    "bg-muted/20 border-border/30"
                                }`}>
                                {done ? (
                                    <CheckCircle className="w-4 h-4 text-white" />
                                ) : (
                                    <span className="text-xs">{step.icon}</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <p className={`text-xs font-medium ${done ? "text-green-400" :
                                    active ? "text-blue-400" :
                                        "text-muted-foreground/50"
                                    }`}>
                                    {step.label}
                                </p>
                            </div>
                            {active && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}

/* ─── Technician card ──────────────────────────────────── */
function TechnicianCard({ technician, serviceId }: { technician: any; serviceId: string }) {
    const router = useRouter()
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    const STATIC_URL = API_URL.replace(/\/api\/?$/, "")
    const [imgError, setImgError] = useState(false)

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-muted/10 border border-border/40 rounded-3xl p-5 shadow-lg relative overflow-hidden"
        >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Técnico Asignado</h3>

            <div className="flex items-center gap-4 mb-4">
                {technician.avatar_url && !imgError ? (
                    <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border-2 border-background shadow-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={technician.avatar_url.startsWith('http') ? technician.avatar_url : `${STATIC_URL}${technician.avatar_url}`}
                            alt={technician.full_name || "Técnico"}
                            className="w-full h-full object-cover"
                            onError={() => setImgError(true)}
                        />
                    </div>
                ) : (
                    <div className="w-16 h-16 rounded-full gradient-brand flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-md">
                        {(technician.full_name || "T").charAt(0).toUpperCase()}
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg leading-tight">{technician.full_name || "Técnico"}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <div className="flex items-center gap-1.5 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                                {technician.average_rating?.toFixed(1) || "Nuevo"}
                            </span>
                        </div>
                        {technician.rank && RANK_INFO[technician.rank] && (
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${RANK_INFO[technician.rank].color} ${RANK_INFO[technician.rank].border}`}>
                                <span className="text-[10px] leading-none">{RANK_INFO[technician.rank].icon}</span>
                                <span className="text-[10px] font-bold uppercase tracking-wider">{RANK_INFO[technician.rank].label}</span>
                            </div>
                        )}
                        <span className="text-xs text-muted-foreground">· Verificado</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
                <Button
                    variant="outline"
                    className="w-full h-11 rounded-xl text-sm border-blue-500/30 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    onClick={() => router.push(`/tecnicos/perfil/${technician.id || technician.user_id}`)}
                >
                    Ver perfil completo
                </Button>

                {technician.phone ? (
                    <Button className="w-full h-11 rounded-xl text-sm bg-green-600 hover:bg-green-700 text-white" asChild>
                        <a href={`tel:${technician.phone}`}>
                            <Phone className="w-4 h-4 mr-2" />
                            Llamar
                        </a>
                    </Button>
                ) : (
                    <Button className="w-full h-11 rounded-xl text-sm" disabled>
                        <Phone className="w-4 h-4 mr-2" />
                        Llamar
                    </Button>
                )}
            </div>
        </motion.div>
    )
}

/* ─── Search messages ─────────────────────────────────── */
const searchMessages = [
    "Buscando técnicos en tu zona...",
    "Analizando disponibilidad...",
    "Contactando técnicos certificados...",
    "Tu solicitud está siendo procesada...",
]

/* ─── Main content ────────────────────────────────────── */
function WaitingContent() {
    const params = useParams()
    const router = useRouter()
    const [service, setService] = useState<any>(null)
    const [msgIndex, setMsgIndex] = useState(0)
    const [technicianFound, setTechnicianFound] = useState(false)
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const pollRef = useRef<NodeJS.Timeout | null>(null)
    const startTime = useRef(Date.now())
    const isMounted = useRef(true)  // Bug #3: prevent state updates after unmount

    // Bug #3: Cleanup isMounted on unmount
    useEffect(() => {
        isMounted.current = true
        return () => { isMounted.current = false }
    }, [])

    // Cycle search messages
    useEffect(() => {
        const t = setInterval(() => setMsgIndex(i => (i + 1) % searchMessages.length), 3000)
        return () => clearInterval(t)
    }, [])

    // Bug #4: Track elapsed time every second, show 'Justo ahora' for first 60s
    useEffect(() => {
        const t = setInterval(() => {
            if (isMounted.current) {
                setElapsedSeconds(Math.floor((Date.now() - startTime.current) / 1000))
            }
        }, 1000)
        return () => clearInterval(t)
    }, [])

    // Fetch initial state and connect WebSocket
    useEffect(() => {
        const fetchAndSubscribe = async () => {
            try {
                const data = await getServiceById(params.id as string)
                if (!isMounted.current) return
                setService(data)

                if (data.status !== "pending") {
                    setTechnicianFound(true)
                    if (data.status === "completed") {
                        setTimeout(() => router.push(`/servicios/${params.id}`), 2000)
                    }
                }

                // Connect WebSocket for real-time updates
                const token = localStorage.getItem("access_token")
                if (token && isMounted.current) {
                    serviceWebSocket.connect(params.id as string, token)
                }

            } catch (err) {
                console.error("Failed to load service", err)
            }
        }

        fetchAndSubscribe()

        // Subscribe to real-time status updates
        const unsubscribe = serviceWebSocket.onMessage((message: WebSocketMessage) => {
            if (message.type === "status_update" && isMounted.current) {
                console.log("[WaitingPage] WS status_update:", message.data)

                setService((prev: any) => {
                    const updated = { ...prev, status: message.data.status }
                    // If technician data comes in the payload, merge it
                    if (message.data.technician) {
                        updated.technician = message.data.technician
                    }
                    return updated
                })

                if (message.data.status !== "pending") {
                    setTechnicianFound(true)
                }

                // Session 4: Auto-redirect to live tracking map if technician is en_route or in_progress
                if (message.data.status === "en_route" || message.data.status === "in_progress") {
                    console.log("[WaitingPage] Redirecting to Live Tracking map")
                    router.push(`/servicios/${params.id}`)
                }

                if (message.data.status === "completed") {
                    setTimeout(() => router.push(`/servicios/${params.id}`), 2000)
                }
            }
        })

        // Fallback polling just in case WebSocket disconnects
        pollRef.current = setInterval(async () => {
            if (!serviceWebSocket.isConnected && isMounted.current) {
                try {
                    const data = await getServiceById(params.id as string)
                    setService(data)
                    if (data.status !== "pending") {
                        setTechnicianFound(true)
                    }
                    if (data.status === "en_route" || data.status === "in_progress") {
                        clearInterval(pollRef.current!)
                        router.push(`/servicios/${params.id}`)
                    }
                    if (data.status === "completed") {
                        clearInterval(pollRef.current!)
                        setTimeout(() => router.push(`/servicios/${params.id}`), 2000)
                    }
                } catch { }
            }
        }, 8000)

        return () => {
            isMounted.current = false
            unsubscribe()
            serviceWebSocket.disconnect()
            if (pollRef.current) clearInterval(pollRef.current)
        }
    }, [params.id, router])

    return (
        <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
            {/* Map background */}
            <div className="absolute inset-0 z-0">
                {service && (
                    <WaitingMap
                        lat={service.service_lat || 6.2442}
                        lng={service.service_lon || -75.5636}
                        address={service.service_address}
                    />
                )}
                <div className="absolute inset-0 bg-background/60" />
            </div>

            {/* Top bar */}
            <div className="relative z-10 flex items-center justify-between px-5 pt-6 pb-4">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 bg-background/80 backdrop-blur-md border border-border/40 rounded-full px-4 py-2"
                >
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs font-mono font-semibold text-green-400">SISTEMA ACTIVO</span>
                </motion.div>

                {elapsedSeconds > 0 && (
                    <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-md border border-border/40 rounded-full px-3 py-1.5">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                            {elapsedSeconds < 60 ? "Justo ahora" : `${Math.floor(elapsedSeconds / 60)} min`}
                        </span>
                    </div>
                )}

                {/* UX #10: Smart close — minimize if active, close if done */}
                <Button
                    variant="ghost" size="icon"
                    className="bg-background/80 backdrop-blur-md rounded-full border border-border/30"
                    onClick={() => router.push(`/servicios/${params.id}`)}
                >
                    {service && !["completed", "cancelled"].includes(service.status)
                        ? <ChevronDown className="w-4 h-4" />
                        : <X className="w-4 h-4" />}
                </Button>
            </div>

            {/* Bottom sheet */}
            <div className="relative z-10 mt-auto">
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="bg-background/95 backdrop-blur-2xl border-t border-border/40 rounded-t-3xl px-5 pb-8 pt-5 shadow-2xl max-h-[70vh] overflow-y-auto"
                >
                    <div className="w-10 h-1 rounded-full bg-border/60 mx-auto mb-5" />

                    <AnimatePresence mode="wait">
                        {!technicianFound ? (
                            /* ─── Searching ─── */
                            <motion.div key="searching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="flex flex-col items-center text-center gap-5">
                                <RadarPulse />
                                <div>
                                    <h2 className="text-xl font-bold mb-1">Buscando técnico</h2>
                                    <AnimatePresence mode="wait">
                                        <motion.p
                                            key={msgIndex}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            className="text-sm text-muted-foreground"
                                        >
                                            {searchMessages[msgIndex]}
                                        </motion.p>
                                    </AnimatePresence>
                                </div>
                                <DotsLoader />

                                {service && (
                                    <div className="w-full bg-muted/20 rounded-2xl p-4 grid grid-cols-2 gap-3 text-sm">
                                        <div className="flex items-start gap-2">
                                            <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-muted-foreground">Ubicación</p>
                                                <p className="font-medium text-xs leading-tight line-clamp-2">{service.service_address}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Precio ofrecido</p>
                                            <p className="font-bold text-base gradient-text">
                                                {service.estimated_price ? `$${service.estimated_price.toLocaleString()}` : "Por cotizar"}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <Button variant="outline" className="w-full border-muted/30 text-muted-foreground text-sm"
                                    onClick={() => router.push(`/servicios/${params.id}`)}>
                                    Ver detalle del servicio
                                </Button>
                            </motion.div>
                        ) : (
                            /* ─── Technician assigned — live progress ─── */
                            <motion.div key="found" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="flex flex-col gap-5">
                                {/* Technician card */}
                                {service?.technician && (
                                    <TechnicianCard technician={service.technician} serviceId={params.id as string} />
                                )}

                                {/* Status stepper */}
                                {service?.status && service.status !== "pending" && (
                                    <StatusStepper status={service.status} />
                                )}

                                {/* Navigate button if technician location available */}
                                {service?.status === "completed" ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-14 h-14 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                                            <CheckCircle className="w-7 h-7 text-green-400" />
                                        </div>
                                        <p className="text-sm font-semibold text-green-400">¡Servicio completado!</p>
                                        <p className="text-xs text-muted-foreground">Redirigiendo al resumen...</p>
                                    </div>
                                ) : (
                                    <Button onClick={() => router.push(`/servicios/${params.id}`)} className="w-full gradient-brand text-white">
                                        Ver detalle completo
                                    </Button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    )
}

export default function EsperandoPage() {
    return (
        <ProtectedRoute>
            <WaitingContent />
        </ProtectedRoute>
    )
}
