"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, MapPin, Star, CheckCircle, X, Navigation, Phone, Clock, ChevronDown, Radio, ShieldAlert } from "lucide-react"
import { ProtectedRoute } from "@/lib/auth-context"
import { getServiceById } from "@/lib/api"
import { getAvatarUrl } from "@/lib/utils"
import { serviceWebSocket, type WebSocketMessage } from "@/lib/websocket"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"

const WaitingMap = dynamic(() => import("@/components/services/service-map"), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-[#050810] animate-pulse" />,
})

const RANK_INFO: Record<string, { label: string; color: string; icon: string; border: string }> = {
    bronze: { 
        label: "Bronce", 
        color: "text-amber-500 bg-amber-500/10", 
        border: "border-amber-500/30", 
        icon: "🥉" 
    },
    silver: { 
        label: "Plata", 
        color: "text-slate-200 bg-slate-500/10", 
        border: "border-slate-400/40", 
        icon: "🥈" 
    },
    gold: { 
        label: "Oro", 
        color: "text-yellow-400 bg-yellow-500/10 font-bold", 
        border: "border-yellow-400/50", 
        icon: "🥇" 
    },
}

/* ─── Radar animation ────────────────────────────────── */
function RadarPulse({ isRecovery }: { isRecovery?: boolean }) {
    return (
        <div className="relative flex items-center justify-center w-32 h-32">
            {[1, 2, 3].map((i) => (
                <motion.div
                    key={i}
                    className={`absolute rounded-full border ${isRecovery ? "border-rose-500/40" : "border-blue-500/40"}`}
                    initial={{ width: 48, height: 48, opacity: 0.8 }}
                    animate={{ width: 40 + i * 32, height: 40 + i * 32, opacity: 0 }}
                    transition={{ duration: 2.2, delay: i * 0.6, repeat: Infinity, ease: "easeOut" }}
                />
            ))}
            <motion.div
                className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-xl ${
                    isRecovery 
                        ? "bg-rose-600 text-white shadow-rose-600/40" 
                        : "bg-blue-600 text-white shadow-blue-600/40"
                }`}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
                {isRecovery ? (
                    <ShieldAlert className="w-8 h-8 text-white" />
                ) : (
                    <Radio className="w-8 h-8 text-white" />
                )}
            </motion.div>
        </div>
    )
}

function DotsLoader({ isRecovery }: { isRecovery?: boolean }) {
    return (
        <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className={`w-2 h-2 rounded-full ${isRecovery ? "bg-rose-400" : "bg-blue-400"}`}
                    animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
                />
            ))}
        </div>
    )
}

/* ─── Live service status stepper ───────────────────────── */
function StatusStepper({ status, isRecovery }: { status: string, isRecovery?: boolean }) {
    const steps = [
        { key: "assigned", label: isRecovery ? "Equipo asignado" : "Técnico asignado", icon: "🔔", detail: isRecovery ? "Tu equipo aceptó la alerta" : "Especialista Certificado Tec360 asignado" },
        { key: "en_route", label: "En camino", icon: "🚗", detail: isRecovery ? "El equipo de reacción está en ruta" : "El técnico está desplazándose a tu ubicación" },
        { key: "arrived", label: "En sitio", icon: "📍", detail: isRecovery ? "Equipo presente en coordenadas" : "El especialista ha llegado a tu vehículo" },
        { key: "in_progress", label: isRecovery ? "Operando" : "En ejecución", icon: isRecovery ? "🚨" : "🔧", detail: isRecovery ? "Asegurando el vehículo" : "Instalación y pruebas de telemetría" },
        { key: "completed", label: "Completado", icon: "✅", detail: isRecovery ? "¡Vehículo asegurado!" : "¡Servicio verificado y completado!" },
    ]

    const current = steps.findIndex(s => s.key === status)
    const activeStep = steps[current] || steps[0]

    return (
        <div className="w-full space-y-4">
            {/* Current status banner */}
            <div className={`flex items-center gap-3 p-3.5 rounded-2xl border ${
                isRecovery 
                    ? "bg-rose-950/30 border-rose-500/40 text-rose-200" 
                    : "bg-blue-950/30 border-blue-500/40 text-blue-200"
            }`}>
                <span className="text-2xl">{activeStep?.icon || "🔍"}</span>
                <div>
                    <p className="font-bold text-sm text-white">{activeStep?.label || "Procesando"}</p>
                    <p className="text-xs text-slate-300">{activeStep?.detail || ""}</p>
                </div>
            </div>

            {/* Stepper progress */}
            <div className="space-y-2.5">
                {steps.map((step, i) => {
                    const done = i < current
                    const active = i === current
                    const upcoming = i > current
                    return (
                        <motion.div
                            key={step.key}
                            initial={false}
                            animate={{ opacity: upcoming ? 0.35 : 1 }}
                            className="flex items-center gap-3"
                        >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 shrink-0 transition-all ${
                                done ? "bg-emerald-600 border-emerald-500 text-white" :
                                active ? (isRecovery ? "bg-rose-600/30 border-rose-500 text-rose-300" : "bg-blue-600/30 border-blue-500 text-blue-300") :
                                "bg-slate-900 border-slate-700 text-slate-500"
                            }`}>
                                {done ? (
                                    <CheckCircle className="w-4 h-4" />
                                ) : (
                                    <span className="text-xs">{step.icon}</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <p className={`text-xs font-semibold ${
                                    done ? "text-emerald-400" :
                                    active ? (isRecovery ? "text-rose-400" : "text-blue-400") :
                                    "text-slate-500"
                                }`}>
                                    {step.label}
                                </p>
                            </div>
                            {active && (
                                <div className={`w-2 h-2 rounded-full animate-ping ${isRecovery ? "bg-rose-400" : "bg-blue-400"}`} />
                            )}
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}

/* ─── Technician card ──────────────────────────────────── */
function TechnicianCard({ technician, serviceId, isRecovery }: { technician: any; serviceId: string; isRecovery?: boolean }) {
    const router = useRouter()
    const [imgError, setImgError] = useState(false)

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-[#080F24] border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden"
        >
            <div className={`absolute top-0 left-0 w-full h-1 ${isRecovery ? "bg-rose-600" : "bg-blue-600"}`} />
            <h3 className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-4">
                {isRecovery ? "Unidad de Reacción Asignada" : "Especialista Certificado Asignado"}
            </h3>

            <div className="flex items-center gap-4 mb-4">
                {technician.avatar_url && !imgError ? (
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-slate-700 shadow-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={getAvatarUrl(technician.avatar_url)}
                            alt={technician.full_name || (isRecovery ? "Agente" : "Técnico")}
                            className="w-full h-full object-cover"
                            onError={() => setImgError(true)}
                        />
                    </div>
                ) : (
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold font-mono shrink-0 shadow-md ${
                        isRecovery ? "bg-rose-600/30 border border-rose-500/40 text-rose-300" : "bg-blue-600/30 border border-blue-500/40 text-blue-300"
                    }`}>
                        {(technician.full_name || "T").charAt(0).toUpperCase()}
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <p className="font-bold text-base text-white leading-tight truncate">
                        {technician.full_name || "Carlos Mendoza"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <span className="text-xs font-semibold text-amber-400">
                                {technician.average_rating?.toFixed(1) || "4.95"}
                            </span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                            Técnico Certificado Tec360
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
                <Button
                    variant="outline"
                    className="w-full h-11 rounded-xl text-xs bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-200"
                    onClick={() => router.push(`/tecnicos/perfil/${technician.id || technician.user_id || "tech-01"}`)}
                >
                    Ver Hoja de Vida
                </Button>

                {technician.phone ? (
                    <Button className="w-full h-11 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold" asChild>
                        <a href={`tel:${technician.phone}`}>
                            <Phone className="w-4 h-4 mr-1.5" />
                            Llamar
                        </a>
                    </Button>
                ) : (
                    <Button className="w-full h-11 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold" onClick={() => router.push(`/servicios/${serviceId}`)}>
                        <Phone className="w-4 h-4 mr-1.5" />
                        Contactar
                    </Button>
                )}
            </div>
        </motion.div>
    )
}

/* ─── Search messages ─────────────────────────────────── */
const normalSearchMessages = [
    "Contactando técnicos certificados en un radio de 15 km...",
    "Analizando telemetría y tiempos de arribo por tráfico...",
    "Evaluando competencias para tu tipo de vehículo...",
    "Transmitiendo expediente a especialistas disponibles...",
]

const recoverySearchMessages = [
    "Alerta de prioridad máxima: contactando patrullas de reacción...",
    "Localizando escuadrón motorizado a menos de 5 km...",
    "Coordinando canal radial de telemetría y geolocalización...",
    "Activando protocolo de protección y escolta inmediata...",
]

/* ─── Main content ────────────────────────────────────── */
function WaitingContent() {
    const params = useParams()
    const router = useRouter()
    const serviceId = (params?.id as string) || "srv-demo"
    const [service, setService] = useState<any>(null)
    const [msgIndex, setMsgIndex] = useState(0)
    const [technicianFound, setTechnicianFound] = useState(false)
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const startTime = useRef(Date.now())
    const isMounted = useRef(true)

    const isRecovery = service?.service_type === "vehicle_recovery"
    const currentMessages = isRecovery ? recoverySearchMessages : normalSearchMessages

    useEffect(() => {
        isMounted.current = true
        return () => { isMounted.current = false }
    }, [])

    useEffect(() => {
        const t = setInterval(() => setMsgIndex(i => (i + 1) % currentMessages.length), 3200)
        return () => clearInterval(t)
    }, [currentMessages.length])

    useEffect(() => {
        const t = setInterval(() => {
            if (isMounted.current) {
                setElapsedSeconds(Math.floor((Date.now() - startTime.current) / 1000))
            }
        }, 1000)
        return () => clearInterval(t)
    }, [])

    useEffect(() => {
        async function fetchService() {
            try {
                const data = await getServiceById(serviceId)
                if (data && isMounted.current) {
                    setService(data)
                    if (data.technician_id || ["assigned", "en_route", "arrived", "in_progress", "completed"].includes(data.status)) {
                        setTechnicianFound(true)
                    }
                }
            } catch (e) {
                console.warn("Using fallback service for waiting view", e)
                if (isMounted.current) {
                    setService({
                        id: serviceId,
                        title: "Instalación GPS Satelital 4G con Corte Remoto",
                        service_type: "gps_installation",
                        status: "pending",
                        service_lat: 4.6852,
                        service_lon: -74.0538,
                        service_address: "Calle 100 # 15-20, Chico Norte, Bogotá"
                    })
                }
            }
        }

        fetchService()
        const interval = setInterval(fetchService, 5000)
        return () => clearInterval(interval)
    }, [serviceId])

    return (
        <div className="fixed inset-0 flex flex-col bg-[#020408] text-slate-100 overflow-hidden">
            {/* Map background */}
            <div className="absolute inset-0 z-0">
                <WaitingMap
                    lat={service?.service_lat || 4.6852}
                    lng={service?.service_lon || -74.0538}
                    address={service?.service_address || "Bogotá, Colombia"}
                />
                <div className="absolute inset-0 bg-[#020408]/75 backdrop-blur-[2px]" />
            </div>

            {/* Top Bar */}
            <div className="relative z-10 flex items-center justify-between px-5 pt-6 pb-4">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 bg-[#080F24]/90 backdrop-blur-md border border-slate-800 rounded-full px-4 py-2"
                >
                    <div className={`w-2 h-2 rounded-full animate-pulse ${isRecovery ? "bg-rose-400" : "bg-emerald-400"}`} />
                    <span className={`text-xs font-mono font-bold tracking-wider ${isRecovery ? "text-rose-400" : "text-emerald-400"}`}>
                        {isRecovery ? "DESPACHO EMERGENCIA 24/7" : "RADAR DE DESPACHO ACTIVO"}
                    </span>
                </motion.div>

                {elapsedSeconds > 0 && (
                    <div className="flex items-center gap-1.5 bg-[#080F24]/90 backdrop-blur-md border border-slate-800 rounded-full px-3 py-1.5 text-xs text-slate-400 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{elapsedSeconds < 60 ? "Justo ahora" : `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`}</span>
                    </div>
                )}

                <Button
                    variant="ghost" 
                    size="icon"
                    className="bg-[#080F24]/90 backdrop-blur-md rounded-full border border-slate-800 text-slate-300 hover:text-white"
                    onClick={() => router.push(`/servicios/${serviceId}`)}
                >
                    <ChevronDown className="w-4 h-4" />
                </Button>
            </div>

            {/* Bottom Sheet */}
            <div className="relative z-10 mt-auto">
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="bg-[#080F24]/95 backdrop-blur-2xl border-t border-slate-800 rounded-t-3xl px-5 pb-8 pt-5 shadow-2xl max-h-[72vh] overflow-y-auto max-w-xl mx-auto"
                >
                    <div className="w-12 h-1 rounded-full bg-slate-700 mx-auto mb-5" />

                    <AnimatePresence mode="wait">
                        {!technicianFound ? (
                            /* ─── Searching State ─── */
                            <motion.div 
                                key="searching" 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center text-center gap-4 py-2"
                            >
                                <RadarPulse isRecovery={isRecovery} />
                                <div>
                                    <h2 className="text-xl font-bold text-white mb-1">
                                        {isRecovery ? "Coordinando Escuadrón de Reacción" : "Buscando al Especialista Óptimo"}
                                    </h2>
                                    <AnimatePresence mode="wait">
                                        <motion.p
                                            key={msgIndex}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            className="text-xs text-slate-300 h-6 max-w-md mx-auto"
                                        >
                                            {currentMessages[msgIndex]}
                                        </motion.p>
                                    </AnimatePresence>
                                </div>

                                <DotsLoader isRecovery={isRecovery} />

                                <div className="w-full pt-4 border-t border-slate-800/80 flex flex-col gap-2.5">
                                    <Button
                                        onClick={() => router.push(`/servicios/${serviceId}/cotizaciones`)}
                                        variant="outline"
                                        className="w-full bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800 text-xs h-11 rounded-xl"
                                    >
                                        Ver Cotizaciones Técnicas Recibidas
                                    </Button>
                                    <Button
                                        onClick={() => router.push(`/servicios/${serviceId}`)}
                                        className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs h-11 rounded-xl font-semibold shadow-lg shadow-blue-600/20"
                                    >
                                        Ir a la Consola de Misión
                                    </Button>
                                </div>
                            </motion.div>
                        ) : (
                            /* ─── Assigned State ─── */
                            <motion.div 
                                key="assigned" 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                exit={{ opacity: 0 }}
                                className="space-y-5"
                            >
                                {service?.technician && (
                                    <TechnicianCard
                                        technician={service.technician}
                                        serviceId={service.id}
                                        isRecovery={isRecovery}
                                    />
                                )}

                                {service?.status && service.status !== "pending" && (
                                    <StatusStepper status={service.status} isRecovery={isRecovery} />
                                )}

                                <Button 
                                    onClick={() => router.push(`/servicios/${serviceId}`)} 
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-11 rounded-xl shadow-lg shadow-blue-600/25"
                                >
                                    Ver Misión Completa
                                </Button>
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
