"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"
import {
    ArrowLeft, MapPin, Calendar, Phone, Navigation,
    Loader2, CheckCircle, Camera, X, AlertCircle, Car,
    ReceiptText, MessageSquare, Clock, PanelRightClose,
    PanelRightOpen, Shield, ExternalLink, ChevronRight,
    Wifi, Check, Copy, Star, Wrench, ShieldCheck, Download, FileText
} from "lucide-react"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ServiceChat } from "@/components/chat/ServiceChat"
import { VehicleInspectionModal } from "@/components/technician/vehicle-inspection-modal"

import { ProtectedRoute, useAuth } from "@/lib/auth-context"
import { getServiceById, getApiBaseUrl } from "@/lib/api"
import { getImageUrl } from "@/lib/utils"
import { useLocationTracking } from "@/lib/use-location-tracking"
import { serviceWebSocket } from "@/lib/websocket"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

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
    confirmed: { label: "Terminado", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", dotColor: "bg-emerald-500" },
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

/* ─── Photo modal ─────────────────────────────────── */
type PhotoStage = "before" | "during" | "after"

const STAGE_META: Record<PhotoStage, { label: string; hint: string; emoji: string; color: string }> = {
    before: { label: "Foto de inicio", hint: "Toma una foto del vehículo ANTES de comenzar", emoji: "📷", color: "text-blue-400" },
    during: { label: "Foto del proceso", hint: "Captura el trabajo en progreso", emoji: "🔧", color: "text-orange-400" },
    after: { label: "Foto final", hint: "Foto del resultado completado", emoji: "✅", color: "text-green-400" },
}

function PhotoRequiredModal({
    stage,
    onCapture,
}: {
    stage: PhotoStage
    onCapture: (file: File) => Promise<void>
}) {
    const meta = STAGE_META[stage]
    const inputRef = useRef<HTMLInputElement>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [preview, setPreview] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setPreview(URL.createObjectURL(file))
        setSelectedFile(file)
    }

    const handleConfirm = async () => {
        if (!selectedFile) return
        setIsUploading(true)
        try {
            await onCapture(selectedFile)
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center sm:items-center"
        >
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="w-full max-w-md bg-white dark:bg-slate-900 border-t border-slate-200 sm:border dark:border-white/10 sm:rounded-2xl rounded-t-3xl px-6 pt-5 pb-10 sm:pb-6 shadow-2xl"
            >
                <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-5" />

                <div className="flex flex-col items-center text-center gap-3 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-blue-600/15 text-blue-600 dark:text-blue-400 flex items-center justify-center text-3xl shadow-xl shadow-blue-500/10">
                        {meta.emoji}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{meta.label}</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{meta.hint}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Foto obligatoria para continuar
                    </div>
                </div>

                {preview && (
                    <div className="relative w-full aspect-video max-h-48 rounded-2xl overflow-hidden mb-4 border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800">
                        <img src={preview} alt="preview" className="w-full h-full object-contain" />
                        {isUploading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-white" />
                            </div>
                        )}
                    </div>
                )}

                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFile}
                />

                {!selectedFile ? (
                    <Button
                        onClick={() => inputRef.current?.click()}
                        disabled={isUploading}
                        size="lg"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white h-13 text-sm font-bold shadow-lg shadow-blue-600/25 rounded-xl cursor-pointer"
                    >
                        <Camera className="w-5 h-5 mr-2" />
                        Abrir cámara o galería
                    </Button>
                ) : (
                    <div className="flex gap-3">
                        <Button
                            onClick={() => inputRef.current?.click()}
                            disabled={isUploading}
                            variant="outline"
                            size="lg"
                            className="flex-1 h-13 rounded-xl cursor-pointer"
                        >
                            Cambiar foto
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={isUploading}
                            size="lg"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-13 text-sm font-bold shadow-lg shadow-emerald-600/25 rounded-xl cursor-pointer"
                        >
                            {isUploading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                            {isUploading ? "Subiendo..." : "Confirmar y Subir"}
                        </Button>
                    </div>
                )}
            </motion.div>
        </motion.div>
    )
}

/* ─── Progress stepper ─────────────────────────────── */
const STATUS_STEPS = [
    { key: "assigned", label: "Asignado", short: "Asignado" },
    { key: "en_route", label: "En camino", short: "En camino" },
    { key: "arrived", label: "Llegó", short: "Llegó" },
    { key: "in_progress", label: "Trabajando", short: "Trabajo" },
    { key: "completed", label: "Completado", short: "Listo" },
]

function ServiceStepper({ status }: { status: string }) {
    const current = STATUS_STEPS.findIndex(s => s.key === status)
    const effectiveCurrent = current >= 0 ? current : (status === "confirmed" ? 4 : 0)

    return (
        <div className="flex items-center w-full gap-1">
            {STATUS_STEPS.map((step, i) => {
                const done = i < effectiveCurrent
                const active = i === effectiveCurrent
                return (
                    <div key={step.key} className="flex items-center flex-1 min-w-0">
                        <div className="flex flex-col items-center flex-1 min-w-0">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                                done ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" :
                                active ? "bg-blue-600/20 border-blue-600 text-blue-600 dark:text-blue-400" :
                                "bg-slate-100 dark:bg-slate-800/60 border-slate-300 dark:border-white/10 text-slate-400"
                            }`}>
                                {done ? (
                                    <CheckCircle className="w-4 h-4" />
                                ) : (
                                    <div className={`w-2 h-2 rounded-full ${active ? "bg-blue-600 dark:bg-blue-400 animate-pulse" : "bg-slate-400 dark:bg-slate-600"}`} />
                                )}
                            </div>
                            <span className={`text-[9px] mt-1 font-medium truncate max-w-[56px] text-center ${
                                active ? "text-blue-600 dark:text-blue-400 font-bold" : done ? "text-slate-800 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"
                            }`}>
                                {step.short}
                            </span>
                        </div>
                        {i < STATUS_STEPS.length - 1 && (
                            <div className={`h-0.5 flex-1 mx-0.5 rounded-full transition-all duration-500 ${
                                i < effectiveCurrent ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"
                            }`} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

/* ─── Main Technician Service Content ──────────────── */
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
    const [confirmComplete, setConfirmComplete] = useState(false)

    // UI Drawer state (parity with client view)
    const [isSlideOpen, setIsSlideOpen] = useState(true)
    const [isMobile, setIsMobile] = useState(false)
    const [isChatOpen, setIsChatOpen] = useState(false)

    // Detect mobile viewport (< 640px)
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640)
        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [])

    const isRecovery = service?.service_type === "vehicle_recovery"
    const displayStages: PhotoStage[] = isRecovery ? ["after"] : ["before", "during", "after"]

    const getStageMeta = (stage: PhotoStage) => {
        if (isRecovery && stage === "after") {
            return {
                label: "Vehículo Asegurado",
                hint: "Toma una foto clara del vehículo tras asegurarlo",
                emoji: "🚨",
                color: "text-red-500"
            }
        }
        return STAGE_META[stage]
    }

    // Photo state
    const [photos, setPhotos] = useState<Record<PhotoStage, string | null>>({
        before: null, during: null, after: null
    })
    const [pendingPhotoFor, setPendingPhotoFor] = useState<PhotoStage | null>(null)
    const pendingStatusRef = useRef<string | null>(null)

    const API_URL = getApiBaseUrl()
    const [token, setToken] = useState<string | null>(null)

    const isActiveService = service && ["assigned", "en_route", "arrived", "in_progress"].includes(service.status)

    // Live GPS tracking for technician
    const { lastPosition, error: trackingError } = useLocationTracking({
        serviceId: params.id as string,
        enabled: isTracking && isActiveService,
        intervalMs: 5000,
    })

    useEffect(() => {
        if (trackingError) toast({ title: "Error de ubicación", description: trackingError, variant: "destructive" })
    }, [trackingError, toast])

    const [paymentInfo, setPaymentInfo] = useState<any>(null)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [paymentAmount, setPaymentAmount] = useState<string>("")
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
    const [showInspectionModal, setShowInspectionModal] = useState(false)

    // Initial Data Load
    useEffect(() => {
        const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("access_token") : null)
        if (activeToken && !token) {
            setToken(activeToken)
        }
        
        async function fetchService() {
            try {
                const data = await getServiceById(params.id as string)
                setService(data)
                if (data.estimated_price) {
                    setPaymentAmount(String(data.estimated_price))
                }
                if (["assigned", "en_route", "arrived", "in_progress"].includes(data.status)) {
                    setIsTracking(true)
                }
            } catch (err: any) {
                setError(err.message || "Error al cargar servicio")
            } finally {
                setIsLoading(false)
            }
        }

        async function fetchExistingPhotos() {
            const currentToken = activeToken || token
            if (!currentToken) return
            try {
                const res = await fetch(`${API_URL}/uploads/${params.id}/photos`, {
                    headers: { Authorization: `Bearer ${currentToken}` },
                })
                if (res.ok) {
                    const data = await res.json()
                    const photoMap: Record<PhotoStage, string | null> = { before: null, during: null, after: null }
                    for (const photo of (data.photos || [])) {
                        if (photo.image_type in photoMap) {
                            photoMap[photo.image_type as PhotoStage] = getImageUrl(photo.image_url) || photo.file_url || null
                        }
                    }
                    setPhotos(photoMap)
                }
            } catch { /* non-critical */ }
        }

        async function fetchPaymentInfo() {
            const currentToken = activeToken || token
            if (!currentToken) return
            try {
                const res = await fetch(`${API_URL}/payments/service/${params.id}`, {
                    headers: { Authorization: `Bearer ${currentToken}` },
                })
                if (res.ok) {
                    const data = await res.json()
                    if (data && data.id) {
                        setPaymentInfo(data)
                    }
                }
            } catch { /* non-critical */ }
        }

        fetchService()
        fetchExistingPhotos()
        fetchPaymentInfo()
    }, [params.id, token, API_URL])

    // Auto-resume tracking when technician returns to tab
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === "visible" && isActiveService) {
                setIsTracking(true)
            }
        }
        document.addEventListener("visibilitychange", handleVisibility)
        return () => document.removeEventListener("visibilitychange", handleVisibility)
    }, [isActiveService])

    // Real-time WebSocket listener for inspection confirmation
    useEffect(() => {
        if (service?.id && token) {
            serviceWebSocket.connect(service.id, token)

            const handleWsMessage = (message: any) => {
                if (message.type === "inspection_confirmed") {
                    toast({
                        title: "✅ Inspección confirmada",
                        description: "El cliente ha confirmado el estado de su vehículo. Ya puedes iniciar el trabajo.",
                    })
                    setService((prev: any) => {
                        if (!prev) return prev
                        const meta = { ...(prev.service_metadata || {}) }
                        if (meta.vehicle_inspection) {
                            meta.vehicle_inspection.client_confirmed = true
                            meta.vehicle_inspection.client_confirmed_at = message.data?.confirmed_at || new Date().toISOString()
                        }
                        return { ...prev, service_metadata: meta }
                    })
                }
            }

            const unsub = serviceWebSocket.onMessage(handleWsMessage)
            return () => {
                unsub()
                serviceWebSocket.disconnect()
            }
        }
    }, [service?.id, token, toast])

    /* ─── Status update ─────────────────────────── */
    const updateStatus = async (newStatus: string) => {
        if (!token) return
        setIsUpdating(true)
        try {
            const response = await fetch(`${API_URL}/services/${params.id}/status?new_status=${newStatus}`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.detail || "Error al actualizar estado")
            }
            setService((prev: any) => ({ ...prev, status: newStatus }))
            const msgs: Record<string, string> = {
                en_route: "🚗 En camino — cliente notificado",
                arrived: "📍 Llegaste al lugar",
                in_progress: "🔧 Servicio en progreso",
                completed: "✅ ¡Servicio completado!",
            }
            toast({ title: msgs[newStatus] || "Estado actualizado" })
            if (newStatus === "completed" && !paymentInfo) {
                setShowPaymentModal(true)
            }
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" })
        } finally {
            setIsUpdating(false)
        }
    }

    const handleConfirmCashPayment = async () => {
        const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem("access_token") : null)
        if (!activeToken) return
        const amt = parseFloat(paymentAmount || String(service?.estimated_price || 0))
        if (!amt || amt <= 0) {
            toast({ title: "Monto inválido", description: "Ingresa un monto en COP válido", variant: "destructive" })
            return
        }
        setIsSubmittingPayment(true)
        try {
            const res = await fetch(`${API_URL}/payments/cash/confirm`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${activeToken}`,
                },
                body: JSON.stringify({
                    service_id: params.id,
                    amount: amt,
                    notes: "Pago recibido en efectivo por técnico"
                }),
            })
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.detail || "Error al registrar pago")
            }
            const data = await res.json()
            setPaymentInfo(data)
            setShowPaymentModal(false)
            toast({ title: "💰 Pago registrado", description: `$${amt.toLocaleString("es-CO")} COP recibido en efectivo.` })
        } catch (err: any) {
            toast({ title: "Error en pago", description: err.message, variant: "destructive" })
        } finally {
            setIsSubmittingPayment(false)
        }
    }

    /* ─── Photo upload & compression ─────────────── */
    const compressImage = (file: File, maxSizePx = 1200, quality = 0.82): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = (event) => {
                const img = new Image()
                img.src = event.target?.result as string
                img.onload = () => {
                    const canvas = document.createElement("canvas")
                    let { width, height } = img

                    if (width > height) {
                        if (width > maxSizePx) {
                            height = Math.round((height * maxSizePx) / width)
                            width = maxSizePx
                        }
                    } else {
                        if (height > maxSizePx) {
                            width = Math.round((width * maxSizePx) / height)
                            height = maxSizePx
                        }
                    }

                    canvas.width = width
                    canvas.height = height
                    const ctx = canvas.getContext("2d")
                    ctx?.drawImage(img, 0, 0, width, height)

                    canvas.toBlob(
                        (blob) => {
                            if (blob) resolve(blob)
                            else reject(new Error("Canvas toBlob failed"))
                        },
                        "image/jpeg",
                        quality
                    )
                }
                img.onerror = (err) => reject(err)
            }
            reader.onerror = (err) => reject(err)
        })
    }

    const uploadPhoto = async (stage: PhotoStage, file: File): Promise<void> => {
        try {
            const compressedBlob = await compressImage(file)
            const compressedFile = new File([compressedBlob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
            })

            const formData = new FormData()
            formData.append("file", compressedFile)
            formData.append("service_id", params.id as string)
            formData.append("image_type", stage)

            const response = await fetch(`${API_URL}/uploads/service-photo`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            })

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                throw new Error(errData.detail || "Error al subir la foto")
            }
            const data = await response.json()
            const url = data.image_url || URL.createObjectURL(file)
            setPhotos(prev => ({ ...prev, [stage]: url }))
            toast({ title: `Foto "${STAGE_META[stage].label}" guardada ✓` })
            
            if (pendingStatusRef.current) {
                await updateStatus(pendingStatusRef.current)
                pendingStatusRef.current = null
            }
            setPendingPhotoFor(null)
        } catch (err: any) {
            toast({ title: "Error al subir foto", description: err.message, variant: "destructive" })
        }
    }

    /* ─── Action handlers with photo gate ───────── */
    const handleArrived = () => {
        if (!isRecovery && !photos.before) {
            pendingStatusRef.current = "arrived"
            setPendingPhotoFor("before")
        } else {
            updateStatus("arrived")
        }
    }

    const handleInProgress = () => {
        if (!isRecovery) {
            const inspection = service?.service_metadata?.vehicle_inspection
            if (!inspection) {
                setShowInspectionModal(true)
                return
            }
            if (!inspection.client_confirmed) {
                const inspectedAtStr = inspection.inspected_at
                let timeoutPassed = false
                if (inspectedAtStr) {
                    const diffMs = Date.now() - new Date(inspectedAtStr).getTime()
                    if (diffMs >= 15 * 60 * 1000) {
                        timeoutPassed = true
                    }
                }
                if (!timeoutPassed) {
                    setShowInspectionModal(true)
                    return
                }
            }
        }

        if (!isRecovery && !photos.during) {
            pendingStatusRef.current = "in_progress"
            setPendingPhotoFor("during")
        } else {
            updateStatus("in_progress")
        }
    }

    const handleComplete = () => {
        if (!photos.after) {
            pendingStatusRef.current = "completed"
            setPendingPhotoFor("after")
        } else if (!confirmComplete) {
            setConfirmComplete(true)
        } else {
            setConfirmComplete(false)
            updateStatus("completed")
        }
    }

    const handleEnRoute = () => updateStatus("en_route")

    if (isLoading) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm font-mono tracking-wider uppercase text-slate-400">Cargando consola del técnico...</p>
            </div>
        )
    }

    if (error || !service) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
                <div className="p-8 rounded-2xl bg-slate-900 border border-white/10 max-w-md w-full shadow-2xl">
                    <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-white mb-2">Error al cargar servicio</h3>
                    <p className="text-sm text-slate-400 mb-6">{error || "Servicio no encontrado"}</p>
                    <Button onClick={() => router.push("/tecnicos/dashboard")} className="w-full bg-blue-600 hover:bg-blue-700 text-white cursor-pointer">
                        Volver al Panel
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

    const latValue = service.service_lat || 6.2442
    const lonValue = service.service_lon || -75.5636
    const allPhotos = photos.before && photos.during && photos.after

    return (
        <div className="relative w-full h-full overflow-hidden flex">
            {/* ─── Photo required modal overlay ─── */}
            <AnimatePresence>
                {pendingPhotoFor && (
                    <PhotoRequiredModal
                        stage={pendingPhotoFor}
                        onCapture={(file) => uploadPhoto(pendingPhotoFor, file)}
                    />
                )}
            </AnimatePresence>

            {/* ─── Vehicle Inspection Modal ─── */}
            <VehicleInspectionModal
                isOpen={showInspectionModal}
                onClose={() => setShowInspectionModal(false)}
                serviceId={service.id}
                vehicleModel={service.vehicle_model}
                vehiclePlate={service.vehicle_plate}
                existingInspection={service.service_metadata?.vehicle_inspection}
                token={token || ""}
                onInspectionConfirmed={() => {
                    setService((prev: any) => {
                        if (!prev) return prev
                        const meta = { ...(prev.service_metadata || {}) }
                        if (meta.vehicle_inspection) {
                            meta.vehicle_inspection.client_confirmed = true
                        }
                        return { ...prev, service_metadata: meta }
                    })
                    handleInProgress()
                }}
            />

            {/* ══════════════════════════════════════════════════════════
                1. FULLSCREEN MAP BACKGROUND
            ══════════════════════════════════════════════════════════ */}
            <div className="absolute inset-0 w-full h-full z-0">
                <FullScreenServiceMap
                    lat={latValue}
                    lng={lonValue}
                    address={service.service_address}
                    technicianLat={lastPosition?.lat}
                    technicianLng={lastPosition?.lng}
                    className="w-full h-full"
                />
            </div>

            {/* ══════════════════════════════════════════════════════════
                2. FLOATING CONTROLS OVER THE MAP
            ══════════════════════════════════════════════════════════ */}
            {/* Top-Left: Navigation Back + Live GPS Status Pill */}
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/tecnicos/dashboard")}
                    className="rounded-xl bg-white/95 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/90 dark:border-white/10 backdrop-blur-xl shadow-lg text-xs font-semibold text-slate-800 dark:text-slate-200 gap-1.5 px-3 py-1.5 h-8 sm:h-9 cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Panel</span>
                </Button>

                <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 h-8 sm:h-9 rounded-xl bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-white/10 backdrop-blur-xl shadow-lg text-xs font-mono font-medium">
                    <span className="relative flex h-2 w-2 shrink-0">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isTracking ? "bg-emerald-500" : "bg-slate-400"} opacity-75`} />
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${isTracking ? "bg-emerald-500" : "bg-slate-400"}`} />
                    </span>
                    <span className="hidden sm:inline text-slate-700 dark:text-slate-300 font-sans font-medium">
                        {isTracking ? "GPS EN VIVO" : "SIN TRACKING"}
                    </span>
                    <span className="sm:hidden text-[10px] font-bold text-slate-700 dark:text-slate-300">
                        {isTracking ? "GPS ACTIVO" : "GPS OFF"}
                    </span>
                </div>
            </div>

            {/* Top-Right: Open Details Slide (Floating button when slide is closed) */}
            <AnimatePresence>
                {!isSlideOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20"
                    >
                        <Button
                            onClick={() => setIsSlideOpen(true)}
                            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/25 font-semibold text-xs flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 h-8 sm:h-9 cursor-pointer transition-all"
                        >
                            <PanelRightOpen className="w-4 h-4" />
                            <span>Ver Consola</span>
                            <span className="hidden xs:inline-block px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono uppercase">
                                {statusInfo.label}
                            </span>
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Bottom Peek Bar when slide is closed */}
            <AnimatePresence>
                {!isSlideOpen && isMobile && (
                    <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        className="fixed bottom-3 inset-x-3 z-20 sm:hidden"
                    >
                        <button
                            onClick={() => setIsSlideOpen(true)}
                            className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-xl cursor-pointer active:scale-[0.99] transition-transform"
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusInfo.dotColor}`} />
                                <div className="text-left truncate">
                                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                        {service.title || "Servicio Técnico"}
                                    </p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                        {statusInfo.label} {service.estimated_price ? `· $${service.estimated_price.toLocaleString()}` : ""}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 shrink-0 bg-blue-500/10 px-2.5 py-1 rounded-xl">
                                <span>Acciones</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Backdrop to tap-to-dismiss */}
            <AnimatePresence>
                {isSlideOpen && isMobile && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSlideOpen(false)}
                        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-25 sm:hidden"
                    />
                )}
            </AnimatePresence>

            {/* ══════════════════════════════════════════════════════════
                3. SLIDE-OUT LATERAL TELEMETRY DRAWER / MOBILE SHEET
            ══════════════════════════════════════════════════════════ */}
            <AnimatePresence>
                {isSlideOpen && (
                    <motion.aside
                        key="telemetry-slide"
                        variants={{
                            hidden: isMobile ? { y: "100%", opacity: 0 } : { x: "100%", opacity: 0 },
                            visible: isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 },
                        }}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        transition={{ type: "spring", damping: 28, stiffness: 280 }}
                        className="fixed sm:absolute bottom-0 left-0 right-0 sm:top-0 sm:left-auto sm:right-0 sm:bottom-0 w-full sm:w-[450px] md:w-[480px] max-h-[82dvh] sm:max-h-full h-auto sm:h-full z-30 flex flex-col bg-white/98 dark:bg-slate-950/95 backdrop-blur-2xl border-t sm:border-t-0 sm:border-l border-slate-200/90 dark:border-white/10 rounded-t-3xl sm:rounded-none shadow-2xl overflow-hidden"
                    >
                        {/* Mobile Drag Handle */}
                        <div
                            className="sm:hidden pt-3 pb-1 flex justify-center cursor-pointer"
                            onClick={() => setIsSlideOpen(false)}
                        >
                            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 transition-colors" />
                        </div>

                        {/* ── Slide Header ────────────────────────────────── */}
                        <div className="p-3.5 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/40">
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
                                    {isRecovery ? <Car className="w-4 h-4 sm:w-5 sm:h-5" /> : <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                                        {service.title || "Servicio Técnico"}
                                    </h2>
                                    <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                                        {typeLabels[service.service_type] || service.service_type}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <span className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-medium border ${statusInfo.color}`}>
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
                            
                            {/* 1. Timestamp & Address Banner */}
                            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pb-1">
                                <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                    <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                    <span>
                                        {service.scheduled_date ? (
                                            <>
                                                <strong className="text-slate-800 dark:text-slate-200">Hora del servicio:</strong>{" "}
                                                {format(new Date(service.scheduled_date), "PPP 'a las' p", { locale: es })}
                                            </>
                                        ) : (
                                            `Creado: ${format(new Date(service.created_at), "PPP p", { locale: es })}`
                                        )}
                                    </span>
                                </div>
                                <div className="flex items-start gap-1.5 text-slate-800 dark:text-slate-200">
                                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                                    <span className="leading-snug">{service.service_address}{service.service_city ? `, ${service.service_city}` : ""}</span>
                                </div>
                            </div>

                            {/* 2. NAVIGATION / DESTINATION (Google Maps link) */}
                            <div className="rounded-2xl p-4 bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/10 shadow-sm space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                                        DESTINO // NAVEGACIÓN
                                    </span>
                                    <span className="text-[11px] font-mono text-slate-400 font-medium">
                                        {latValue.toFixed(4)}, {lonValue.toFixed(4)}
                                    </span>
                                </div>
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${latValue},${lonValue}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full"
                                >
                                    <Button
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                                    >
                                        <Navigation className="w-4 h-4" />
                                        <span>Ir a Google Maps</span>
                                        <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                                    </Button>
                                </a>
                            </div>

                            {/* 3. SERVICE PROGRESS STEPPER */}
                            <div className="rounded-2xl p-4 bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/10 shadow-sm space-y-2.5">
                                <span className="block text-[10px] font-mono uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                                    PROGRESO DEL SERVICIO
                                </span>
                                <ServiceStepper status={service.status} />
                            </div>

                            {/* 4. CURRENT STATUS HUD (4-Column Bar) */}
                            <div className="rounded-2xl p-4 bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/10 shadow-sm">
                                <span className="block text-[10px] font-mono uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                                    ESTADO Y VALORES
                                </span>
                                <div className="grid grid-cols-4 divide-x divide-slate-200 dark:divide-white/10 text-center">
                                    <div className="px-1">
                                        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">Estado</p>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                            {statusInfo.label}
                                        </p>
                                    </div>
                                    <div className="px-1">
                                        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">Precio</p>
                                        <p className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 truncate">
                                            {service.estimated_price ? `$${service.estimated_price.toLocaleString()}` : "Por cotizar"}
                                        </p>
                                    </div>
                                    <div className="px-1">
                                        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">Fecha</p>
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                            {service.scheduled_date ? format(new Date(service.scheduled_date), "dd/MM/yy", { locale: es }) : "Hoy"}
                                        </p>
                                    </div>
                                    <div className="px-1">
                                        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">Hora</p>
                                        <p className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 truncate">
                                            {service.scheduled_date ? format(new Date(service.scheduled_date), "hh:mm a", { locale: es }) : "Definida"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 5. CLIENT CARD WITH CONTACT ACTIONS */}
                            {service.client && (
                                <div className="rounded-2xl p-4 bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/10 shadow-sm space-y-3">
                                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                                        DATOS DEL CLIENTE
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-lg font-bold text-white shadow-md shrink-0">
                                            {(service.client.full_name || "C").charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                {service.client.full_name || "Cliente"}
                                            </p>
                                            {service.client.phone && (
                                                <a href={`tel:${service.client.phone}`} className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5 font-medium">
                                                    <Phone className="w-3 h-3" /> {service.client.phone}
                                                </a>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {service.client.phone && (
                                                <a
                                                    href={`https://wa.me/57${service.client.phone.replace(/\D/g, "")}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <Button size="sm" variant="outline" className="rounded-xl text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer h-9 px-2.5">
                                                        WhatsApp
                                                    </Button>
                                                </a>
                                            )}
                                            {token && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => setIsChatOpen(true)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold gap-1.5 shrink-0 shadow-md cursor-pointer h-9 px-2.5"
                                                >
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                    <span>Chat</span>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 6. RECOVERY VEHICLE DETAILS (if recovery) */}
                            {isRecovery && service.service_metadata && (
                                <div className="rounded-2xl p-4 bg-orange-500/10 border border-orange-500/30 shadow-sm space-y-3">
                                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold text-xs">
                                        <Car className="w-4 h-4" />
                                        <span className="font-mono uppercase tracking-wider">DATOS DE RECUPERACIÓN</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-orange-500/20">
                                            <p className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Vehículo</p>
                                            <p className="font-semibold text-slate-900 dark:text-white truncate">
                                                {service.vehicle_type === 'car' ? 'Carro' : service.vehicle_type === 'motorcycle' ? 'Moto' : service.vehicle_type} {service.vehicle_model}
                                            </p>
                                        </div>
                                        <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-orange-500/20">
                                            <p className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Placa</p>
                                            <p className="font-mono font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                                                {service.vehicle_plate}
                                            </p>
                                        </div>
                                        {service.service_metadata.vehicle_color && (
                                            <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-orange-500/20">
                                                <p className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Color</p>
                                                <p className="font-semibold text-slate-900 dark:text-white capitalize truncate">
                                                    {service.service_metadata.vehicle_color}
                                                </p>
                                            </div>
                                        )}
                                        {service.service_metadata.has_gps && (
                                            <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-orange-500/20">
                                                <p className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">¿Tiene GPS?</p>
                                                <p className="font-semibold text-slate-900 dark:text-white truncate">
                                                    {service.service_metadata.has_gps === "yes" ? `Sí (${service.service_metadata.gps_brand || "N/A"})` : "No"}
                                                </p>
                                            </div>
                                        )}
                                        {service.service_metadata.police_report_number && (
                                            <div className="col-span-2 p-2 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-orange-500/20">
                                                <p className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">N° Denuncia</p>
                                                <p className="font-mono font-semibold text-slate-900 dark:text-white">
                                                    {service.service_metadata.police_report_number}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 7. VEHICLE PHOTO REFERENCE (if client uploaded one) */}
                            {service.vehicle_photo_url && (
                                <div className="rounded-2xl p-4 bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/10 shadow-sm space-y-2">
                                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                        <Camera className="w-3.5 h-3.5" /> FOTO REFERENCIA DEL VEHÍCULO
                                    </span>
                                    <div className="rounded-xl overflow-hidden aspect-video border border-slate-200 dark:border-white/10 bg-slate-950">
                                        <img
                                            src={getImageUrl(service.vehicle_photo_url)}
                                            alt="Vehículo del cliente"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 8. VEHICLE INSPECTION (Checklist Previo) */}
                            {!isRecovery && (
                                (() => {
                                    const inspection = service?.service_metadata?.vehicle_inspection
                                    const isConfirmed = inspection?.client_confirmed
                                    const hasInspection = !!inspection

                                    if (!hasInspection) {
                                        return (
                                            <div className="rounded-2xl p-4 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-amber-500/10 border border-blue-500/30 space-y-3 shadow-sm">
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 rounded-xl bg-blue-500/20 text-blue-500 shrink-0 text-xl">
                                                        📋
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                                            Inspección Previa Pendiente
                                                        </h4>
                                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                                                            Debes realizar el checklist inicial del vehículo antes de iniciar los trabajos técnicos.
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() => setShowInspectionModal(true)}
                                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md cursor-pointer py-2.5 rounded-xl"
                                                >
                                                    📋 Realizar Inspección Previa del Auto
                                                </Button>
                                            </div>
                                        )
                                    }

                                    if (!isConfirmed) {
                                        return (
                                            <div className="rounded-2xl p-4 bg-amber-500/10 border border-amber-500/30 space-y-2.5 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                                                        <Clock className="w-4 h-4 animate-pulse" />
                                                        <span>Inspección Enviada — Esperando Cliente</span>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setShowInspectionModal(true)}
                                                        className="h-7 text-[11px] text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 px-2 rounded-lg cursor-pointer"
                                                    >
                                                        Ver / Editar
                                                    </Button>
                                                </div>
                                                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                                                    El cliente debe confirmar la inspección en su pantalla para habilitar el inicio de trabajo (se auto-confirmará tras 15 minutos).
                                                </p>
                                            </div>
                                        )
                                    }

                                    return (
                                        <div className="rounded-2xl p-4 bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 shadow-sm">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate">
                                                        Inspección Inicial Confirmada
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                                        Validada por el cliente antes de la intervención.
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setShowInspectionModal(true)}
                                                className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 h-8 text-xs rounded-xl cursor-pointer shrink-0"
                                            >
                                                Ver Resumen
                                            </Button>
                                        </div>
                                    )
                                })()
                            )}

                            {/* 9. PHOTO EVIDENCE PANEL */}
                            <div className="rounded-2xl p-4 bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/10 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                        <Camera className="w-3.5 h-3.5 text-blue-500" />
                                        EVIDENCIAS FOTOGRÁFICAS
                                    </span>
                                    <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                                        {Object.values(photos).filter(Boolean).length}/{isRecovery ? 1 : 3}
                                    </span>
                                </div>
                                <div className={`grid gap-2.5 ${isRecovery ? "grid-cols-1 max-w-xs mx-auto" : "grid-cols-3"}`}>
                                    {displayStages.map((stage) => {
                                        const meta = getStageMeta(stage)
                                        const url = photos[stage]
                                        const isCurrentStage = (
                                            (stage === "before" && ["assigned", "en_route"].includes(service.status)) ||
                                            (stage === "during" && service.status === "arrived") ||
                                            (stage === "after" && service.status === "in_progress")
                                        )
                                        return (
                                            <div key={stage} className="flex flex-col gap-1">
                                                <div className={`relative aspect-square rounded-xl border-2 overflow-hidden transition-all ${
                                                    url ? "border-emerald-500/60" :
                                                    isCurrentStage ? "border-blue-500 animate-pulse bg-blue-500/5" :
                                                    "border-slate-200 dark:border-white/10 bg-slate-200/50 dark:bg-slate-800/50"
                                                }`}>
                                                    {url ? (
                                                        <img src={url} alt={meta.label} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                                                            <span className="text-lg">{meta.emoji}</span>
                                                            {isCurrentStage && (
                                                                <span className="text-[9px] text-blue-500 font-bold">Pendiente</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {url && (
                                                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                                                            <Check className="w-2.5 h-2.5 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`text-[10px] text-center font-medium truncate ${url ? "text-emerald-600 dark:text-emerald-400" : isCurrentStage ? "text-blue-600 dark:text-blue-400 font-bold" : "text-slate-500 dark:text-slate-400"}`}>
                                                    {meta.label}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                                {allPhotos && (
                                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 text-center font-medium pt-1">
                                        ✓ Todas las evidencias fotográficas registradas
                                    </p>
                                )}
                            </div>

                            {/* 10. PAYMENT / CASH REGISTER PANEL */}
                            {(service.status === "completed" || service.status === "confirmed" || paymentInfo || service.payment_status === "completed") && (
                                <div className="rounded-2xl p-4 bg-emerald-500/10 border border-emerald-500/30 space-y-3 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-xs flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                            <span>💳 ESTADO DEL PAGO</span>
                                        </h3>
                                        <Badge className={(paymentInfo || service.payment_status === "completed") ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"}>
                                            {paymentInfo 
                                                ? (paymentInfo.status === "confirmed_by_admin" 
                                                    ? "Validado por Admin" 
                                                    : paymentInfo.payment_method === "online" 
                                                    ? "Pagado en Línea" 
                                                    : "Cobrado por Técnico") 
                                                : service.payment_status === "completed"
                                                ? "Pagado"
                                                : "Pago Pendiente"}
                                        </Badge>
                                    </div>

                                    {(paymentInfo || service.payment_status === "completed") ? (
                                        <div className="space-y-2 text-xs">
                                            <div className="flex justify-between items-center bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-emerald-500/20">
                                                <span className="text-slate-500 dark:text-slate-400">Monto Recibido</span>
                                                <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                                                    ${(paymentInfo?.amount || service.final_price || service.estimated_price || 0).toLocaleString()} COP
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 px-1">
                                                <span>
                                                    Método: {paymentInfo?.payment_method === 'cash' ? 'Efectivo 💵' : paymentInfo?.payment_method === 'online' ? 'Pago en Línea 🌐' : (paymentInfo?.payment_method || service.payment_method || 'Registrado')}
                                                </span>
                                                {paymentInfo?.created_at && (
                                                    <span>{new Date(paymentInfo.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                                                )}
                                            </div>

                                            {/* Factura Electrónica DIAN */}
                                            {(paymentInfo?.pdf_url || service.pdf_url) && (
                                                <div className="pt-2 border-t border-emerald-500/20 mt-2 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                            <FileText className="w-3.5 h-3.5 text-emerald-500" />
                                                            <span>Factura DIAN: {paymentInfo?.invoice_number || service.invoice_number || "Emitida"}</span>
                                                        </span>
                                                        <span className="text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                                            Oficial
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <a
                                                            href={paymentInfo?.pdf_url || service.pdf_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="block"
                                                        >
                                                            <Button
                                                                size="sm"
                                                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl gap-1.5 h-8 cursor-pointer"
                                                            >
                                                                <Download className="w-3 h-3" />
                                                                <span>Ver Factura PDF</span>
                                                            </Button>
                                                        </a>
                                                        {(paymentInfo?.qr_url || service.qr_url) && (
                                                            <a
                                                                href={paymentInfo?.qr_url || service.qr_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="block"
                                                            >
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="w-full border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 font-semibold text-xs rounded-xl gap-1.5 h-8 cursor-pointer"
                                                                >
                                                                    <ExternalLink className="w-3 h-3" />
                                                                    <span>Validar DIAN</span>
                                                                </Button>
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-2.5">
                                            <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                                El servicio fue marcado como terminado. Registra el cobro en efectivo recibido del cliente.
                                            </p>
                                            <Button 
                                                onClick={() => setShowPaymentModal(true)} 
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer shadow-md"
                                            >
                                                💰 Registrar Cobro en Efectivo
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 11. PRIMARY ACTION BUTTON ACCORDING TO SERVICE STATUS */}
                            <div className="pt-2 space-y-2.5">
                                {service.status === "assigned" && (
                                    <Button
                                        onClick={handleEnRoute}
                                        size="lg"
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20 rounded-xl cursor-pointer"
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
                                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg shadow-orange-600/20 rounded-xl cursor-pointer"
                                        disabled={isUpdating}
                                    >
                                        <MapPin className="mr-2 h-5 w-5" />
                                        {isUpdating ? "Actualizando..." : "📍 He llegado al lugar"}
                                        {!isRecovery && !photos.before && <span className="ml-2 text-xs opacity-80">(requiere foto)</span>}
                                    </Button>
                                )}

                                {service.status === "arrived" && (() => {
                                    const inspection = service?.service_metadata?.vehicle_inspection
                                    const isConfirmed = inspection?.client_confirmed
                                    const hasInspection = !!inspection

                                    if (isRecovery) {
                                        return (
                                            <Button
                                                onClick={handleInProgress}
                                                size="lg"
                                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg shadow-purple-600/20 rounded-xl cursor-pointer"
                                                disabled={isUpdating}
                                            >
                                                🔧 {isUpdating ? "Actualizando..." : "Iniciar trabajo"}
                                                {!photos.during && <span className="ml-2 text-xs opacity-80">(requiere foto)</span>}
                                            </Button>
                                        )
                                    }

                                    if (!hasInspection) {
                                        return (
                                            <Button
                                                onClick={() => setShowInspectionModal(true)}
                                                size="lg"
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20 rounded-xl cursor-pointer"
                                                disabled={isUpdating}
                                            >
                                                📋 Realizar Inspección Previa del Vehículo
                                            </Button>
                                        )
                                    }

                                    if (!isConfirmed) {
                                        return (
                                            <Button
                                                onClick={() => setShowInspectionModal(true)}
                                                size="lg"
                                                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-lg shadow-amber-600/20 rounded-xl cursor-pointer"
                                                disabled={isUpdating}
                                            >
                                                <Clock className="mr-2 h-5 w-5 animate-pulse" />
                                                ⏳ Inspección enviada — Esperando confirmación
                                            </Button>
                                        )
                                    }

                                    return (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                                                <CheckCircle className="w-4 h-4 shrink-0" />
                                                <span>Inspección previa confirmada por el cliente</span>
                                            </div>
                                            <Button
                                                onClick={handleInProgress}
                                                size="lg"
                                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg shadow-purple-600/20 rounded-xl cursor-pointer"
                                                disabled={isUpdating}
                                            >
                                                🔧 {isUpdating ? "Actualizando..." : "Iniciar trabajo"}
                                                {!photos.during && <span className="ml-2 text-xs opacity-80">(requiere foto)</span>}
                                            </Button>
                                        </div>
                                    )
                                })()}

                                {service.status === "in_progress" && (
                                    <div className="space-y-2">
                                        {confirmComplete && (
                                            <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
                                                <span className="text-amber-500 text-sm">⚠️</span>
                                                <p className="text-xs font-medium text-amber-700 dark:text-amber-300 flex-1">¿Confirmas que el trabajo está terminado?</p>
                                                <button onClick={() => setConfirmComplete(false)} className="text-xs text-slate-500 hover:underline cursor-pointer">Cancelar</button>
                                            </div>
                                        )}
                                        <Button
                                            onClick={handleComplete}
                                            size="lg"
                                            className={`w-full text-white font-bold rounded-xl shadow-lg cursor-pointer ${
                                                confirmComplete ? "bg-emerald-600 hover:bg-emerald-700 animate-pulse shadow-emerald-600/20" : "bg-emerald-600/90 hover:bg-emerald-600"
                                            }`}
                                            disabled={isUpdating}
                                        >
                                            <CheckCircle className="mr-2 h-5 w-5" />
                                            {isUpdating ? "Completando..." : confirmComplete ? "✅ Sí, marcar como completado" : "Marcar como Completado"}
                                            {!photos.after && <span className="ml-2 text-xs opacity-80">(requiere foto)</span>}
                                        </Button>
                                    </div>
                                )}

                                {(service.status === "completed" || service.status === "confirmed") && (
                                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1">
                                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                            ✓ Servicio Finalizado Exitosamente
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Gracias por tu labor técnico con Tec360 Seguridad.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* 12. SECONDARY ACTIONS (Ajuste de Monto & Reportar Incidente) */}
                            {["arrived", "in_progress"].includes(service.status) && (
                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    <Button 
                                        onClick={() => router.push(`/tecnicos/servicio/${service.id}/ajuste`)} 
                                        variant="outline" 
                                        size="sm" 
                                        className="w-full border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-xl text-xs font-semibold cursor-pointer h-10"
                                    >
                                        <ReceiptText className="mr-1.5 h-4 w-4" />
                                        Ajuste Monto
                                    </Button>
                                    
                                    <Button 
                                        onClick={() => router.push(`/tecnicos/servicio/${service.id}/incidente`)} 
                                        variant="outline" 
                                        size="sm" 
                                        className="w-full border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl text-xs font-semibold cursor-pointer h-10"
                                    >
                                        <AlertCircle className="mr-1.5 h-4 w-4" />
                                        Reportar Incidente
                                    </Button>
                                </div>
                            )}

                            {/* 13. WHATSAPP SUPPORT LINK */}
                            <a
                                href={`https://wa.me/573052156601?text=${encodeURIComponent(`Hola, soy técnico y necesito soporte para el servicio #${service.id}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block pt-1"
                            >
                                <div className="p-3.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/10 hover:border-emerald-500/30 transition-colors flex items-center justify-between gap-3 group cursor-pointer shadow-xs">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 transition-colors">¿Requieres Asistencia?</p>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Canal directo con Soporte Tec360</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            </a>

                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* ─── Cash Payment Modal ──────────────── */}
            <AnimatePresence>
                {showPaymentModal && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    💵 Confirmar Pago en Efectivo
                                </h3>
                                <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Ingresa el monto cobrado al cliente. Al confirmar, el pago quedará registrado en el sistema para validación administrativa.
                            </p>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Monto Recibido (COP)</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                                    <input
                                        type="number"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        placeholder="150000"
                                        className="w-full pl-8 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-base text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button variant="outline" onClick={() => setShowPaymentModal(false)} className="flex-1 rounded-xl cursor-pointer">
                                    Cancelar
                                </Button>
                                <Button 
                                    onClick={handleConfirmCashPayment} 
                                    disabled={isSubmittingPayment}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer shadow-md"
                                >
                                    {isSubmittingPayment ? "Registrando..." : "Confirmar Cobro"}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ─── Client Chat Sheet ────────────────── */}
            {token && (
                <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
                    <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-[100dvh]">
                        <SheetHeader className="p-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950">
                            <SheetTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                                <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                <span>Chat con el Cliente</span>
                            </SheetTitle>
                        </SheetHeader>
                        <div className="flex-1 overflow-hidden">
                            <ServiceChat serviceId={service.id} />
                        </div>
                    </SheetContent>
                </Sheet>
            )}
        </div>
    )
}

export default function TechnicianServicePage() {
    return (
        <ProtectedRoute allowedRoles={["technician", "reaction_team"]}>
            {/* Full-viewport container under fixed navbar (h-16) */}
            <div className="fixed inset-x-0 top-16 bottom-0 w-full h-[calc(100dvh-4rem)] overflow-hidden bg-slate-100 dark:bg-slate-950">
                <TechnicianServiceContent />
            </div>
        </ProtectedRoute>
    )
}
