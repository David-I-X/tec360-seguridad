"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Shield, MapPin, Phone, Star, CheckCircle, X } from "lucide-react"
import { ProtectedRoute, useAuth } from "@/lib/auth-context"
import { getServiceById } from "@/lib/api"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"

// Lazy load map
const WaitingMap = dynamic(() => import("@/components/services/service-map"), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted/20 animate-pulse" />,
})

/* ─── Radar animation ────────────────────────────────── */
function RadarPulse() {
    return (
        <div className="relative flex items-center justify-center w-32 h-32">
            {[1, 2, 3].map((i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full border border-blue-500/40"
                    initial={{ width: 48, height: 48, opacity: 0.8 }}
                    animate={{ width: 32 + i * 30, height: 32 + i * 30, opacity: 0 }}
                    transition={{
                        duration: 2,
                        delay: i * 0.6,
                        repeat: Infinity,
                        ease: "easeOut",
                    }}
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

/* ─── Dots loader ────────────────────────────────────── */
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

/* ─── Status messages ────────────────────────────────── */
const searchMessages = [
    "Buscando técnicos en tu zona...",
    "Analizando disponibilidad...",
    "Contactando técnicos certificados...",
    "Tu solicitud está siendo procesada...",
]

function WaitingContent() {
    const params = useParams()
    const router = useRouter()
    const { user } = useAuth()
    const [service, setService] = useState<any>(null)
    const [msgIndex, setMsgIndex] = useState(0)
    const [technicianFound, setTechnicianFound] = useState(false)
    const pollRef = useRef<NodeJS.Timeout | null>(null)

    // Cycle through search messages
    useEffect(() => {
        const t = setInterval(() => {
            setMsgIndex((i) => (i + 1) % searchMessages.length)
        }, 3000)
        return () => clearInterval(t)
    }, [])

    // Poll service status every 5 seconds
    useEffect(() => {
        const fetchAndCheck = async () => {
            try {
                const data = await getServiceById(params.id as string)
                setService(data)
                // If technician was found (not pending anymore), show the found state
                if (data.status !== "pending") {
                    setTechnicianFound(true)
                    if (pollRef.current) clearInterval(pollRef.current)
                    // Auto redirect to service detail after 3s
                    setTimeout(() => {
                        router.push(`/servicios/${params.id}`)
                    }, 3000)
                }
            } catch { }
        }

        fetchAndCheck()
        pollRef.current = setInterval(fetchAndCheck, 5000)
        return () => { if (pollRef.current) clearInterval(pollRef.current) }
    }, [params.id])

    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null

    return (
        <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
            {/* Map background — full screen */}
            <div className="absolute inset-0 z-0">
                {service && (
                    <WaitingMap
                        lat={service.service_lat || 6.2442}
                        lng={service.service_lon || -75.5636}
                        address={service.service_address}
                    />
                )}
                {/* Dark overlay so map doesn't overpower */}
                <div className="absolute inset-0 bg-background/60" />
            </div>

            {/* Top bar */}
            <div className="relative z-10 flex items-center justify-between px-5 pt-safe-top pt-6 pb-4">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 bg-background/80 backdrop-blur-md border border-border/40 rounded-full px-4 py-2"
                >
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs font-mono font-semibold text-green-400">SISTEMA ACTIVO</span>
                </motion.div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="bg-background/80 backdrop-blur-md rounded-full border border-border/30"
                    onClick={() => router.push(`/servicios/${params.id}`)}
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Bottom sheet — glass card Uber style */}
            <div className="relative z-10 mt-auto">
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="bg-background/95 backdrop-blur-2xl border-t border-border/40 rounded-t-3xl px-5 pb-safe-bottom pb-8 pt-6 shadow-2xl"
                >
                    <AnimatePresence mode="wait">
                        {!technicianFound ? (
                            /* ─── Searching state ─── */
                            <motion.div
                                key="searching"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center text-center gap-5"
                            >
                                {/* Handle bar */}
                                <div className="w-10 h-1 rounded-full bg-border/60 -mt-2 mb-1" />

                                <RadarPulse />

                                <div>
                                    <h2 className="text-xl font-bold mb-2">Buscando técnico</h2>
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

                                {/* Service summary */}
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
                                                {service.estimated_price
                                                    ? `$${service.estimated_price.toLocaleString()}`
                                                    : "Por cotizar"}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <Button
                                    variant="outline"
                                    className="w-full border-red-500/30 text-red-400 hover:bg-red-500/5"
                                    onClick={() => router.push(`/servicios/${params.id}`)}
                                >
                                    Ver detalle del servicio
                                </Button>
                            </motion.div>
                        ) : (
                            /* ─── Technician found! ─── */
                            <motion.div
                                key="found"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center text-center gap-4"
                            >
                                <div className="w-10 h-1 rounded-full bg-border/60 -mt-2 mb-1" />

                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                    className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center"
                                >
                                    <CheckCircle className="w-8 h-8 text-green-400" />
                                </motion.div>

                                <div>
                                    <h2 className="text-xl font-bold text-green-400">
                                        {service?.status === "pending" ? "¡Solicitud enviada!" : "¡Técnico encontrado!"}
                                    </h2>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {service?.technician?.full_name
                                            ? `${service.technician.full_name} está en camino`
                                            : "Redirigiendo al detalle..."}
                                    </p>
                                </div>

                                {service?.technician && (
                                    <div className="flex items-center gap-3 bg-muted/20 rounded-2xl px-4 py-3 w-full">
                                        <div className="w-12 h-12 rounded-full gradient-brand flex items-center justify-center text-white font-bold">
                                            {(service.technician.full_name || "T").charAt(0)}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="font-semibold text-sm">{service.technician.full_name}</p>
                                            <div className="flex items-center gap-1">
                                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                                <span className="text-xs text-muted-foreground">4.9 · Técnico verificado</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <p className="text-xs text-muted-foreground">Redirigiendo automáticamente...</p>
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
