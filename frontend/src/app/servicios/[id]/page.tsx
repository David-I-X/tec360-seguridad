"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import dynamic from "next/dynamic"
import {
    ArrowLeft, Calendar, MapPin, User, Wrench, Clock, Loader2,
    FileText, XCircle, MessageSquare, Copy, Check, X, PanelRightClose,
    PanelRightOpen, Shield, Navigation, AlertTriangle, Wifi, WifiOff,
    Star, Phone, ShieldCheck, ChevronRight, ExternalLink
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { ProtectedRoute, useAuth } from "@/lib/auth-context"
import { getServiceById, cancelService, confirmService } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { serviceWebSocket, type WebSocketMessage } from "@/lib/websocket"

// Dynamic Google Maps component for full-screen rendering
const FullScreenServiceMap = dynamic(
    () => import("@/components/services/service-map"),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                <span className="text-xs font-mono tracking-wider uppercase">Iniciando Enlace Satelital...</span>
            </div>
        )
    }
)

const statusLabels: Record<string, { label: string; color: string; dotColor: string }> = {
    pending: { label: "Pendiente", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30", dotColor: "bg-amber-500" },
    quoted: { label: "Con Cotizaciones", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30", dotColor: "bg-indigo-500" },
    assigned: { label: "Asignado", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30", dotColor: "bg-blue-500" },
    en_route: { label: "En camino", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30", dotColor: "bg-sky-500" },
    arrived: { label: "Llegó al sitio", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30", dotColor: "bg-orange-500" },
    in_progress: { label: "En Progreso", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30", dotColor: "bg-purple-500" },
    completed: { label: "Completado", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", dotColor: "bg-emerald-500" },
    confirmed: { label: "Confirmado", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", dotColor: "bg-emerald-500" },
    cancelled: { label: "Cancelado", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30", dotColor: "bg-rose-500" },
}

const typeLabels: Record<string, string> = {
    camera_installation: "Instalación Dashcam HD",
    alarm_installation: "Instalación de Alarma",
    gps_installation: "Instalación GPS Satelital",
    camera_maintenance: "Mantenimiento Dashcam",
    alarm_maintenance: "Mantenimiento Alarma",
    gps_maintenance: "Mantenimiento GPS",
    vehicle_recovery: "Equipo de Reacción Inmediata",
    other: "Servicio Técnico Especializado",
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

function ServiceDetailContent() {
    const params = useParams()
    const router = useRouter()
    const { user } = useAuth()
    const [service, setService] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")
    
    // UI Drawer state
    const [isSlideOpen, setIsSlideOpen] = useState(true)
    const [copiedCoord, setCopiedCoord] = useState(false)
    const [isChatOpen, setIsChatOpen] = useState(false)

    // Modals state
    const [showRatingModal, setShowRatingModal] = useState(false)
    const [hasRated, setHasRated] = useState(false)
    const [isCancelling, setIsCancelling] = useState(false)
    const [isConfirming, setIsConfirming] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)

    // Live Tracking & WebSocket state
    const [token, setToken] = useState<string | null>(null)
    const [technicianLocation, setTechnicianLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const wsLocationReceived = useRef(false)
    const pollingRef = useRef<NodeJS.Timeout | null>(null)

    // ─── Initial Data Load ─────────────────────────────────────
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

        if (typeof window !== "undefined") {
            setToken(localStorage.getItem("access_token"))
        }
    }, [params.id])

    // ─── REST Polling Fallback ──────────────────────────────────
    const fetchLocationViaREST = useCallback(async () => {
        if (!params.id || !token) return
        try {
            const response = await fetch(`${API_URL}/location/${params.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                const data = await response.json()
                if (data.technician_location) {
                    setTechnicianLocation({
                        lat: data.technician_location.lat,
                        lng: data.technician_location.lng,
                    })
                }
            }
        } catch (err) {
            console.warn("[LiveTracking] REST location fetch failed:", err)
        }
    }, [params.id, token])

    // ─── WebSocket Live Connection ─────────────────────────────
    useEffect(() => {
        if (!service?.id || !token) return

        const activeTracking = ["assigned", "en_route", "arrived", "in_progress"].includes(service.status)
        if (!activeTracking) return

        serviceWebSocket.connect(service.id, token)

        const unsubscribe = serviceWebSocket.onMessage((message: WebSocketMessage) => {
            if (message.type === "connected") {
                setIsConnected(true)
            } else if (message.type === "status_update") {
                const { status: newStatus, technician: techData } = message.data
                setService((prev: any) => ({
                    ...prev,
                    status: newStatus,
                    technician: techData || prev?.technician,
                }))
            } else if (message.type === "location_update") {
                const { lat, lng } = message.data
                setTechnicianLocation({ lat, lng })
                wsLocationReceived.current = true
            }
        })

        // Poll fallback
        fetchLocationViaREST()
        pollingRef.current = setInterval(() => {
            if (!wsLocationReceived.current) {
                fetchLocationViaREST()
            }
        }, 8000)

        return () => {
            unsubscribe()
            serviceWebSocket.disconnect()
            if (pollingRef.current) clearInterval(pollingRef.current)
        }
    }, [service?.id, service?.status, token, fetchLocationViaREST])

    // ─── Action Handlers ───────────────────────────────────────
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

    const copyCoordinates = () => {
        const lat = service?.service_lat || 6.2442
        const lon = service?.service_lon || -75.5812
        const coordsText = `${lat.toFixed(6)}, ${lon.toFixed(6)}`
        navigator.clipboard.writeText(coordsText)
        setCopiedCoord(true)
        setTimeout(() => setCopiedCoord(false), 2000)
    }

    // ─── Loading & Error Screens ───────────────────────────────
    if (isLoading) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-300 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
                <p className="text-sm font-mono tracking-wider uppercase text-slate-400">Cargando consola de servicio...</p>
            </div>
        )
    }

    if (error || !service) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
                <div className="p-8 rounded-2xl bg-slate-900 border border-white/10 max-w-md w-full shadow-2xl">
                    <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-white mb-2">Error al cargar servicio</h3>
                    <p className="text-sm text-slate-400 mb-6">{error || "Servicio no encontrado"}</p>
                    <Button onClick={() => router.push("/servicios")} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
                        Volver a Servicios
                    </Button>
                </div>
            </div>
        )
    }

    const statusInfo = statusLabels[service.status] || {
        label: service.status,
        color: "bg-slate-500/10 text-slate-400 border-slate-500/30",
        dotColor: "bg-slate-400"
    }

    const isLive = ["assigned", "en_route", "arrived", "in_progress"].includes(service.status)
    const showQuotationsCard = user?.role === "client" && ["pending", "quoted"].includes(service.status)
    const latValue = service.service_lat || 6.2442
    const lonValue = service.service_lon || -75.5636

    return (
        <div className="relative w-full h-full overflow-hidden flex">
            {/* ══════════════════════════════════════════════════════════
                1. FULLSCREEN MAP BACKGROUND
            ══════════════════════════════════════════════════════════ */}
            <div className="absolute inset-0 w-full h-full z-0">
                <FullScreenServiceMap
                    lat={latValue}
                    lng={lonValue}
                    address={service.service_address}
                    technicianLat={technicianLocation?.lat}
                    technicianLng={technicianLocation?.lng}
                    className="w-full h-full"
                />
            </div>

            {/* ══════════════════════════════════════════════════════════
                2. FLOATING OVERLAYS ON THE MAP
            ══════════════════════════════════════════════════════════ */}
            {/* Top-Left: Navigation Back + Live Connection Pill */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2.5">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/servicios")}
                    className="rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 border-slate-200/90 dark:border-white/10 backdrop-blur-xl shadow-lg text-xs font-semibold text-slate-800 dark:text-slate-200 gap-1.5 cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver</span>
                </Button>

                {isLive && (
                    <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-white/10 backdrop-blur-xl shadow-lg text-xs font-mono font-medium">
                        <span className="relative flex h-2 w-2">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isConnected ? "bg-emerald-500" : "bg-amber-500"} opacity-75`} />
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? "bg-emerald-500" : "bg-amber-500"}`} />
                        </span>
                        <span className="text-slate-700 dark:text-slate-300">
                            {isConnected ? "ENLACE EN VIVO" : "RECONECTANDO"}
                        </span>
                    </div>
                )}
            </div>

            {/* Top-Right: Open Details Slide (Floating button when slide is closed) */}
            <AnimatePresence>
                {!isSlideOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="absolute top-4 right-4 z-20"
                    >
                        <Button
                            onClick={() => setIsSlideOpen(true)}
                            className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-xl shadow-violet-600/20 font-semibold text-xs flex items-center gap-2 px-4 py-2 cursor-pointer transition-all"
                        >
                            <PanelRightOpen className="w-4 h-4" />
                            <span>Ver Detalles</span>
                            <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono uppercase">
                                {statusInfo.label}
                            </span>
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom-Left: Tracking Simulator in Development */}
            {process.env.NODE_ENV === "development" && (
                <div className="absolute bottom-4 left-4 z-20 max-w-xs">
                    <TrackingSimulator
                        serviceId={service.id}
                        destLat={latValue}
                        destLng={lonValue}
                    />
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                3. SLIDE-OUT LATERAL TELEMETRY DRAWER ("Slide que abre y cierra")
            ══════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {isSlideOpen && (
                    <motion.aside
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 28, stiffness: 280 }}
                        className="absolute top-0 right-0 bottom-0 w-full sm:w-[440px] md:w-[470px] z-30 flex flex-col bg-white/95 dark:bg-slate-950/92 backdrop-blur-2xl border-l border-slate-200/90 dark:border-white/10 shadow-2xl h-full"
                    >
                        {/* ── Slide Header ────────────────────────────────── */}
                        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-violet-600/10 dark:bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0 text-violet-600 dark:text-violet-400">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                                        {service.title || "Servicio Técnico"}
                                    </h2>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                                        {typeLabels[service.service_type] || service.service_type}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${statusInfo.color}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`} />
                                    {statusInfo.label}
                                </span>
                                <button
                                    onClick={() => setIsSlideOpen(false)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
                                    aria-label="Cerrar panel lateral"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* ── Slide Scrollable Body ───────────────────────── */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
                            
                            {/* 1. Timestamp & Location Banner (Matching Reference) */}
                            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pb-1">
                                <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                    <Clock className="w-3.5 h-3.5 text-violet-500" />
                                    <span>Creado: {format(new Date(service.created_at), "PPP p", { locale: es })}</span>
                                </div>
                                <div className="flex items-start gap-1.5 text-slate-800 dark:text-slate-200">
                                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                                    <span className="leading-snug">{service.service_address}{service.service_city ? `, ${service.service_city}` : ""}</span>
                                </div>
                            </div>

                            {/* 2. COORDINATES Card (Matching Reference Layout) */}
                            <div className="rounded-2xl p-4 bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/10 shadow-sm">
                                <div className="flex items-center justify-between mb-2.5">
                                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                                        COORDINATES
                                    </span>
                                    <button
                                        onClick={copyCoordinates}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-xs"
                                    >
                                        {copiedCoord ? (
                                            <>
                                                <Check className="w-3 h-3 text-emerald-500" />
                                                <span className="text-emerald-600 dark:text-emerald-400">¡Copiado!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3 h-3" />
                                                <span>Copiar</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-950/60 border border-slate-200/60 dark:border-white/5">
                                        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">Latitud</p>
                                        <p className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                                            {latValue.toFixed(6)}
                                        </p>
                                    </div>
                                    <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-950/60 border border-slate-200/60 dark:border-white/5">
                                        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">Longitud</p>
                                        <p className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                                            {lonValue.toFixed(6)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 3. CURRENT STATUS HUD (Matching Reference 3-Column Bar) */}
                            <div className="rounded-2xl p-4 bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/10 shadow-sm">
                                <span className="block text-[10px] font-mono uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                                    CURRENT STATUS
                                </span>
                                <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-white/10 text-center">
                                    <div className="px-2">
                                        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">Estado</p>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                            {statusInfo.label}
                                        </p>
                                    </div>
                                    <div className="px-2">
                                        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">Precio Est.</p>
                                        <p className="text-xs font-mono font-bold text-violet-600 dark:text-violet-400">
                                            {service.estimated_price ? `$${service.estimated_price.toLocaleString()}` : "Por cotizar"}
                                        </p>
                                    </div>
                                    <div className="px-2">
                                        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">Fecha</p>
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                            {service.scheduled_date ? format(new Date(service.scheduled_date), "dd/MM/yyyy", { locale: es }) : "Inmediata"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 4. Quotations Card (for pending/quoted clients) */}
                            {showQuotationsCard && (
                                <div className="rounded-2xl p-4 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-indigo-500/10 border border-blue-500/30 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                                {service.status === "quoted" ? "¡Tienes cotizaciones disponibles!" : "Esperando cotizaciones"}
                                            </h4>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                                                {service.status === "quoted" ? "Revisa las propuestas de los técnicos" : "Los técnicos pronto enviarán propuestas"}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => router.push(`/servicios/${params.id}/cotizaciones`)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 cursor-pointer"
                                        >
                                            Ver Cotizaciones
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* 5. Assigned Technician Card (if assigned) */}
                            {service.technician && (
                                <div className="rounded-2xl p-4 bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/10 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                                            {service.service_type === "vehicle_recovery" ? "EQUIPO ASIGNADO" : "TÉCNICO ASIGNADO"}
                                        </span>
                                        {service.technician.user_id && (
                                            <Link
                                                href={`/tecnicos/perfil/${service.technician.user_id}`}
                                                className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-0.5"
                                            >
                                                <span>Ver perfil</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </Link>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {service.technician.avatar_url ? (
                                            <img
                                                src={getAvatarUrl(service.technician.avatar_url)}
                                                alt=""
                                                className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-white/10"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-lg font-bold text-white shadow-md">
                                                {(service.technician.full_name || "T").charAt(0)}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                {service.technician.full_name || "Técnico Certificado"}
                                            </p>
                                            {service.technician.average_rating > 0 && (
                                                <StarDisplay rating={service.technician.average_rating} size="sm" className="mt-0.5" />
                                            )}
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                {service.technician.email || "Técnico Verificado SENA"}
                                            </p>
                                        </div>

                                        {/* Direct Chat Button */}
                                        {token && (
                                            <Button
                                                size="sm"
                                                onClick={() => setIsChatOpen(true)}
                                                className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold gap-1.5 shrink-0 shadow-md cursor-pointer"
                                            >
                                                <MessageSquare className="w-3.5 h-3.5" />
                                                <span>Chat</span>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 6. Service Description & Details */}
                            <div className="rounded-2xl p-4 bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/10 shadow-sm space-y-2">
                                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                                    DETALLES DEL SERVICIO
                                </span>
                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                    {service.description || "Sin descripción proporcionada por el usuario."}
                                </p>
                            </div>

                            {/* 7. Confirmation & Payment (if status === 'completed') */}
                            {service.status === "completed" && user?.role === "client" && (
                                <div className="rounded-2xl p-4 bg-blue-500/10 border border-blue-500/30 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-xl bg-blue-500/20 text-blue-500 shrink-0">
                                            <ShieldCheck className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Servicio Finalizado</h4>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                                                El técnico ha concluido la labor. Por favor verifica y confirma el trabajo.
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => setShowPaymentModal(true)}
                                        disabled={isConfirming}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md cursor-pointer py-2.5 rounded-xl"
                                    >
                                        {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        {isConfirming ? "Confirmando..." : "Confirmar y Pagar"}
                                    </Button>
                                </div>
                            )}

                            {/* 8. Rating Prompt (if completed or confirmed) */}
                            {["completed", "confirmed"].includes(service.status) && user?.role === "client" && !hasRated && (
                                <div className="rounded-2xl p-4 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-yellow-500/15 border border-amber-500/30 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="text-2xl">⭐</div>
                                        <div className="flex-1">
                                            <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400">¡Califica tu Servicio!</h4>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                                Tu calificación respalda la calidad de nuestros técnicos certificados.
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => setShowRatingModal(true)}
                                        className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-bold text-xs shadow-md cursor-pointer rounded-xl"
                                    >
                                        ⭐ Calificar Técnico
                                    </Button>
                                </div>
                            )}

                            {hasRated && (
                                <div className="rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/20 text-center">
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                                        ✅ ¡Gracias por tu calificación!
                                    </p>
                                </div>
                            )}

                            {/* 9. Cancel Service (only for pending/quoted) */}
                            {user?.role === "client" && ["pending", "quoted"].includes(service.status) && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full border-rose-500/30 text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/50 rounded-xl text-xs font-semibold py-2.5 cursor-pointer"
                                            disabled={isCancelling}
                                        >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            {isCancelling ? "Cancelando..." : "Cancelar servicio"}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-2xl">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Cancelar este servicio?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta acción no se puede deshacer. El servicio pasará a estado cancelado
                                                y los técnicos ya no podrán cotizarlo ni aceptarlo.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="rounded-xl">No, mantener</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleCancel}
                                                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
                                            >
                                                Sí, cancelar servicio
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}

                            {/* 10. Support Button (WhatsApp) */}
                            <a
                                href={`https://wa.me/573052156601?text=${encodeURIComponent(`Hola, necesito ayuda con mi servicio #${params.id}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                            >
                                <div className="p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 hover:border-emerald-500/30 transition-all flex items-center gap-3 cursor-pointer group shadow-xs">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                        <Phone className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-500 transition-colors truncate">
                                            ¿Necesitas asistencia?
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                            Contacta soporte 24/7 por WhatsApp
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            </a>

                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* ══════════════════════════════════════════════════════════
                4. CHAT SHEET / DRAWER
            ══════════════════════════════════════════════════════════ */}
            {service.technician && token && (
                <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
                    <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-[100dvh] z-50">
                        <SheetHeader className="p-4 border-b bg-white dark:bg-slate-950">
                            <SheetTitle className="flex items-center gap-2 text-sm font-bold">
                                <MessageSquare className="h-4 w-4 text-violet-600" />
                                Chat del Servicio #{service.id?.slice(0, 8)}
                            </SheetTitle>
                        </SheetHeader>
                        <div className="flex-1 overflow-hidden">
                            <ServiceChat serviceId={service.id} />
                        </div>
                    </SheetContent>
                </Sheet>
            )}

            {/* ══════════════════════════════════════════════════════════
                5. MODALS (Rating & Payment)
            ══════════════════════════════════════════════════════════ */}
            <RatingModal
                serviceId={params.id as string}
                technicianName={service.technician?.full_name}
                isOpen={showRatingModal}
                onClose={() => setShowRatingModal(false)}
                onSuccess={() => setHasRated(true)}
            />

            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                amount={service?.estimated_price || 0}
                onConfirm={handleConfirm}
            />
        </div>
    )
}

export default function ServiceDetailPage() {
    return (
        <ProtectedRoute>
            {/* Full-viewport container under fixed navbar (h-16) */}
            <div className="fixed inset-x-0 top-16 bottom-0 w-full h-[calc(100dvh-4rem)] overflow-hidden bg-slate-950">
                <ServiceDetailContent />
            </div>
        </ProtectedRoute>
    )
}
