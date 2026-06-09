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
    ReceiptText, MessageSquare
} from "lucide-react"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ServiceChat } from "@/components/chat/ServiceChat"

import { ProtectedRoute, useAuth } from "@/lib/auth-context"
import { getServiceById } from "@/lib/api"
import { getImageUrl } from "@/lib/utils"
import { useLocationTracking } from "@/lib/use-location-tracking"
import { serviceWebSocket } from "@/lib/websocket"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GlassCard } from "@/components/ui/glass-card"
import { useToast } from "@/components/ui/use-toast"

const ServiceMap = dynamic(
    () => import("@/components/services/service-map"),
    { ssr: false, loading: () => <div className="h-[260px] bg-muted/20 animate-pulse rounded-xl" /> }
)

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
    onSkip,
}: {
    stage: PhotoStage
    onCapture: (file: File) => Promise<void>
    onSkip?: () => void  // only show for non-blocking stages
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
                className="w-full max-w-md bg-background border-t border-border/40 sm:border sm:rounded-2xl rounded-t-3xl px-6 pt-5 pb-10 sm:pb-6 shadow-2xl"
            >
                {/* Handle */}
                <div className="w-10 h-1 rounded-full bg-border/60 mx-auto mb-5" />

                {/* Icon */}
                <div className="flex flex-col items-center text-center gap-3 mb-6">
                    <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center text-3xl shadow-xl shadow-blue-500/20">
                        {meta.emoji}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">{meta.label}</h2>
                        <p className="text-sm text-muted-foreground mt-1">{meta.hint}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-3 py-1">
                        <AlertCircle className="w-3 h-3" />
                        Foto obligatoria para continuar
                    </div>
                </div>

                {/* Preview */}
                {preview && (
                    <div className="relative w-full aspect-video max-h-48 rounded-2xl overflow-hidden mb-4 border border-border/30 bg-muted/10">
                        <img src={preview} alt="preview" className="w-full h-full object-contain" />
                        {isUploading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-white" />
                            </div>
                        )}
                    </div>
                )}

                {/* Camera button */}
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
                        className="w-full gradient-brand text-white h-14 text-base font-semibold shadow-lg shadow-blue-500/20"
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
                            className="flex-1 h-14"
                        >
                            Cambiar foto
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={isUploading}
                            size="lg"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white h-14 text-base font-semibold shadow-lg shadow-green-500/20"
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
    { key: "in_progress", label: "Trabajando", short: "Trabajando" },
    { key: "completed", label: "Completado", short: "Listo" },
]

function ServiceStepper({ status }: { status: string }) {
    const current = STATUS_STEPS.findIndex(s => s.key === status)
    return (
        <div className="flex items-center w-full overflow-x-auto gap-0">
            {STATUS_STEPS.map((step, i) => {
                const done = i < current
                const active = i === current
                return (
                    <div key={step.key} className="flex items-center flex-1 min-w-0">
                        <div className="flex flex-col items-center flex-1 min-w-0">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${done ? "bg-blue-500 border-blue-500" :
                                active ? "bg-blue-500/20 border-blue-500" :
                                    "bg-muted/20 border-border/40"
                                }`}>
                                {done ? (
                                    <CheckCircle className="w-4 h-4 text-white" />
                                ) : (
                                    <div className={`w-2 h-2 rounded-full ${active ? "bg-blue-400 animate-pulse" : "bg-border/60"}`} />
                                )}
                            </div>
                            <span className={`text-[9px] mt-1 font-medium truncate max-w-[52px] text-center ${active ? "text-blue-400" : done ? "text-foreground/80" : "text-muted-foreground/50"
                                }`}>
                                {step.short}
                            </span>
                        </div>
                        {i < STATUS_STEPS.length - 1 && (
                            <div className={`h-0.5 flex-1 mx-1 rounded-full transition-all duration-500 ${i < current ? "bg-blue-500" : "bg-border/30"}`} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

/* ─── Main component ───────────────────────────────── */
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
    const [confirmComplete, setConfirmComplete] = useState(false)  // UX #7: confirm before complete

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

    // Photo state — url once uploaded
    const [photos, setPhotos] = useState<Record<PhotoStage, string | null>>({
        before: null, during: null, after: null
    })
    // Which photo modal is blocking the UI
    const [pendingPhotoFor, setPendingPhotoFor] = useState<PhotoStage | null>(null)
    // Next status once photo is confirmed
    const pendingStatusRef = useRef<string | null>(null)

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    const [token, setToken] = useState<string | null>(null)

    const isActiveService = service && ["assigned", "en_route", "arrived", "in_progress"].includes(service.status)

    const { lastPosition, error: trackingError } = useLocationTracking({
        serviceId: params.id as string,
        enabled: isTracking && isActiveService,
        intervalMs: 5000,
    })

    useEffect(() => {
        if (trackingError) toast({ title: "Error de ubicación", description: trackingError, variant: "destructive" })
    }, [trackingError, toast])

    useEffect(() => {
        if (typeof window !== "undefined") {
            setToken(localStorage.getItem("access_token"))
        }
        
        async function fetchService() {
            try {
                const data = await getServiceById(params.id as string)
                setService(data)
                if (["assigned", "en_route", "arrived", "in_progress"].includes(data.status)) {
                    setIsTracking(true)
                }
            } catch (err: any) {
                setError(err.message || "Error al cargar servicio")
            } finally {
                setIsLoading(false)
            }
        }

        // Bug #1: Load already-uploaded photos so the modal doesn't re-block
        async function fetchExistingPhotos() {
            if (!token) return
            try {
                const res = await fetch(`${API_URL}/uploads/${params.id}/photos`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (res.ok) {
                    const data = await res.json()
                    const photoMap: Record<PhotoStage, string | null> = { before: null, during: null, after: null }
                    for (const photo of (data.photos || [])) {
                        if (photo.image_type in photoMap) {
                            // image_url is like /uploads/service-photos/file.jpg
                            photoMap[photo.image_type as PhotoStage] = getImageUrl(photo.image_url) || null
                        }
                    }
                    setPhotos(photoMap)
                }
            } catch { /* non-critical */ }
        }


        fetchService()
        fetchExistingPhotos()
    }, [params.id])

    // Bug #2: Auto-resume tracking when user returns to the tab/PWA
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === "visible" && isActiveService) {
                setIsTracking(true)
            }
        }
        document.addEventListener("visibilitychange", handleVisibility)
        return () => document.removeEventListener("visibilitychange", handleVisibility)
    }, [isActiveService])

    useEffect(() => {
        if (service?.id && token) {
            serviceWebSocket.connect(service.id, token)
            return () => serviceWebSocket.disconnect()
        }
    }, [service?.id, token])

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
            if (newStatus === "completed") setTimeout(() => router.push("/tecnicos/dashboard"), 1500)
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" })
        } finally {
            setIsUpdating(false)
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
            // After photo, proceed with the pending status change
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
    // "Arrived" → require before photo first
    const handleArrived = () => {
        if (!isRecovery && !photos.before) {
            pendingStatusRef.current = "arrived"
            setPendingPhotoFor("before")
        } else {
            updateStatus("arrived")
        }
    }

    // "Start work" → require during photo then move to in_progress
    const handleInProgress = () => {
        if (!isRecovery && !photos.during) {
            pendingStatusRef.current = "in_progress"
            setPendingPhotoFor("during")
        } else {
            updateStatus("in_progress")
        }
    }

    // UX #7: "Complete" → require after photo, then show confirmation
    const handleComplete = () => {
        if (!photos.after) {
            pendingStatusRef.current = "completed"
            setPendingPhotoFor("after")
        } else if (!confirmComplete) {
            setConfirmComplete(true)  // first tap → show confirmation
        } else {
            setConfirmComplete(false)
            updateStatus("completed")
        }
    }

    /* ─── "En route" doesn't need photo ─────────── */
    const handleEnRoute = () => updateStatus("en_route")

    if (isLoading) return (
        <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )

    if (error) return (
        <GlassCard className="p-8 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => router.back()}>Volver</Button>
        </GlassCard>
    )

    if (!service) return null

    const allPhotos = photos.before && photos.during && photos.after

    return (
        <>
            {/* ─── Photo required modal overlay ─── */}
            <AnimatePresence>
                {pendingPhotoFor && (
                    <PhotoRequiredModal
                        stage={pendingPhotoFor}
                        onCapture={(file) => uploadPhoto(pendingPhotoFor, file)}
                    />
                )}
            </AnimatePresence>

            <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/tecnicos/dashboard")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold truncate">{service.title}</h1>
                        <p className="text-xs text-muted-foreground">Servicio asignado</p>
                    </div>
                    <Badge className={`text-xs shrink-0 ${isTracking ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-muted/20"}`}>
                        {isTracking ? "📍 Tracking" : "Sin tracking"}
                    </Badge>
                </div>

                {/* Progress stepper */}
                <GlassCard className="p-4">
                    <ServiceStepper status={service.status} />
                </GlassCard>

                {/* Map */}
                <GlassCard className="p-0 overflow-hidden">
                    <ServiceMap 
                        lat={service.service_lat} 
                        lng={service.service_lon} 
                        address={service.service_address} 
                        technicianLat={lastPosition?.lat}
                        technicianLng={lastPosition?.lng}
                    />
                </GlassCard>

                {/* Location + navigation */}
                <GlassCard className="p-5">
                    <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-blue-400 mt-1 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{service.service_address}</p>
                            <p className="text-xs text-muted-foreground">{service.service_city}</p>
                        </div>
                        <Button asChild size="sm" variant="outline" className="shrink-0">
                            <a href={`https://www.google.com/maps/dir/?api=1&destination=${service.service_lat},${service.service_lon}`} target="_blank" rel="noopener noreferrer">
                                <Navigation className="w-3 h-3 mr-1.5" /> Maps
                            </a>
                        </Button>
                    </div>
                </GlassCard>

                {/* Client + details */}
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-4">
                        {service.client && (
                            <GlassCard className="p-5">
                                <h3 className="text-sm font-semibold mb-3">Cliente</h3>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center text-white font-bold text-sm">
                                        {(service.client.full_name || "C").charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-sm">{service.client.full_name || "Cliente"}</p>
                                        {service.client.phone && (
                                            <a href={`tel:${service.client.phone}`} className="text-xs text-blue-400 flex items-center gap-1 mt-0.5">
                                                <Phone className="w-3 h-3" /> {service.client.phone}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </GlassCard>
                        )}
                        {/* Vehicle photo reference */}
                        {service.vehicle_photo_url && (
                            <GlassCard className="p-5">
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <Camera className="w-4 h-4" /> Foto del Vehículo (Referencia)
                                </h3>
                                <div className="rounded-xl overflow-hidden aspect-video border border-border/50">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={getImageUrl(service.vehicle_photo_url)}
                                        alt="Vehículo del cliente"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </GlassCard>
                        )}
                    </div>

                    <GlassCard className="p-5">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Fecha
                        </h3>
                        <p className="text-sm">
                            {service.scheduled_date
                                ? format(new Date(service.scheduled_date), "PPP", { locale: es })
                                : "Por definir"}
                        </p>
                        {service.estimated_price && (
                            <p className="text-lg font-bold gradient-text mt-2">
                                ${service.estimated_price.toLocaleString()}
                            </p>
                        )}
                    </GlassCard>
                </div>

                {/* Vehicle/Recovery Metadata */}
                {service.service_type === "vehicle_recovery" && service.service_metadata && (
                    <GlassCard className="p-5 border-orange-500/30 bg-orange-500/5">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-orange-500">
                            <Car className="w-4 h-4" /> Datos de Recuperación de Vehículo
                        </h3>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mt-3">
                            <div className="col-span-2 sm:col-span-1 bg-background/50 p-2.5 rounded-lg border border-border/40">
                                <span className="text-muted-foreground block text-xs mb-1">Vehículo</span>
                                <span className="font-semibold">{service.vehicle_type === 'car' ? 'Carro' : service.vehicle_type === 'motorcycle' ? 'Moto' : service.vehicle_type} {service.vehicle_model}</span>
                            </div>
                            <div className="bg-background/50 p-2.5 rounded-lg border border-border/40">
                                <span className="text-muted-foreground block text-xs mb-1">Placa</span>
                                <span className="font-bold text-base uppercase tracking-wider">{service.vehicle_plate}</span>
                            </div>
                            {service.service_metadata.vehicle_color && (
                                <div className="bg-background/50 p-2.5 rounded-lg border border-border/40">
                                    <span className="text-muted-foreground block text-xs mb-1">Color</span>
                                    <span className="font-semibold capitalize">{service.service_metadata.vehicle_color}</span>
                                </div>
                            )}
                            {service.service_metadata.stolen_datetime && (
                                <div className="col-span-2 sm:col-span-1 bg-background/50 p-2.5 rounded-lg border border-border/40">
                                    <span className="text-muted-foreground block text-xs mb-1">Fecha / Hora de robo</span>
                                    <span className="font-semibold">{new Date(service.service_metadata.stolen_datetime).toLocaleString("es-CO")}</span>
                                </div>
                            )}
                            {service.service_metadata.has_gps && (
                                <div className="bg-background/50 p-2.5 rounded-lg border border-border/40">
                                    <span className="text-muted-foreground block text-xs mb-1">¿Tiene GPS?</span>
                                    <span className="font-semibold">
                                        {service.service_metadata.has_gps === "yes" ? `Sí (${service.service_metadata.gps_brand || "N/A"})` : service.service_metadata.has_gps === "no" ? "No" : "No sabe"}
                                    </span>
                                </div>
                            )}
                            {service.service_metadata.police_report_number && (
                                <div className="col-span-2 sm:col-span-1 bg-background/50 p-2.5 rounded-lg border border-border/40">
                                    <span className="text-muted-foreground block text-xs mb-1">N° Denuncia Policial</span>
                                    <span className="font-semibold font-mono">{service.service_metadata.police_report_number}</span>
                                </div>
                            )}
                            {service.service_metadata.additional_phone && (
                                <div className="col-span-2 sm:col-span-1 bg-background/50 p-2.5 rounded-lg border border-border/40">
                                    <span className="text-muted-foreground block text-xs mb-1">Teléfono Alterno</span>
                                    <span className="font-semibold">{service.service_metadata.additional_phone}</span>
                                </div>
                            )}
                            {service.service_metadata.distinctive_marks && (
                                <div className="col-span-2 bg-background/50 p-2.5 rounded-lg border border-border/40">
                                    <span className="text-muted-foreground block text-xs mb-1">Marcas distintivas</span>
                                    <span className="font-semibold">{service.service_metadata.distinctive_marks}</span>
                                </div>
                            )}
                        </div>
                    </GlassCard>
                )}

                {/* Description */}
                {service.description && (
                    <GlassCard className="p-5">
                        <h3 className="text-sm font-semibold mb-2">Descripción del trabajo</h3>
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                    </GlassCard>
                )}

                {/* ─── Photo evidence panel ──────────────────────── */}
                <GlassCard className="p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                            <Camera className="w-4 h-4 text-blue-400" />
                            Evidencias fotográficas
                        </h3>
                        <span className="text-xs text-muted-foreground">
                            {Object.values(photos).filter(Boolean).length}/{isRecovery ? 1 : 3}
                        </span>
                    </div>
                    <div className={`grid gap-3 ${isRecovery ? "grid-cols-1 max-w-sm mx-auto" : "grid-cols-3"}`}>
                        {displayStages.map((stage) => {
                            const meta = getStageMeta(stage)
                            const url = photos[stage]
                            const isCurrentStage = (
                                (stage === "before" && ["assigned", "en_route"].includes(service.status)) ||
                                (stage === "during" && service.status === "arrived") ||
                                (stage === "after" && service.status === "in_progress")
                            )
                            return (
                                <div key={stage} className="flex flex-col gap-1.5">
                                    <div className={`relative aspect-square rounded-xl border-2 overflow-hidden transition-all ${url ? "border-green-500/50" :
                                        isCurrentStage ? "border-blue-500/50 animate-pulse" :
                                            "border-border/30"
                                        }`}>
                                        {url ? (
                                            <img src={url} alt={meta.label} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-muted/10">
                                                <span className="text-xl">{meta.emoji}</span>
                                                {isCurrentStage && (
                                                    <span className="text-[9px] text-blue-400 font-medium">Pendiente</span>
                                                )}
                                            </div>
                                        )}
                                        {url && (
                                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                                <CheckCircle className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <span className={`text-[10px] text-center font-medium ${url ? "text-green-400" : isCurrentStage ? "text-blue-400" : "text-muted-foreground/60"}`}>
                                        {meta.label}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                    {allPhotos && (
                        <p className="text-xs text-green-400 text-center mt-3 font-medium">
                            ✅ Las 3 evidencias han sido capturadas
                        </p>
                    )}
                </GlassCard>

                {/* ─── Action buttons ─────────────────────────────── */}
                <div className="space-y-3 pb-4">
                    {service.status === "assigned" && (
                        <Button onClick={handleEnRoute} size="lg" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isUpdating}>
                            <Navigation className="mr-2 h-5 w-5" />
                            {isUpdating ? "Actualizando..." : "🚗 Estoy en camino"}
                        </Button>
                    )}

                    {/* Normal Technicians Action Button Prompts */}
                    {service.status === "en_route" && (
                        <Button onClick={handleArrived} size="lg" className="w-full bg-orange-600 hover:bg-orange-700" disabled={isUpdating}>
                            <MapPin className="mr-2 h-5 w-5" />
                            {isUpdating ? "Actualizando..." : "📍 He llegado al lugar"}
                            {!isRecovery && !photos.before && <span className="ml-2 text-xs opacity-70">(requiere foto)</span>}
                        </Button>
                    )}

                    {service.status === "arrived" && (
                        <Button onClick={handleInProgress} size="lg" className="w-full bg-purple-600 hover:bg-purple-700" disabled={isUpdating}>
                            🔧 {isUpdating ? "Actualizando..." : "Iniciar trabajo"}
                            {!isRecovery && !photos.during && <span className="ml-2 text-xs opacity-70">(requiere foto)</span>}
                        </Button>
                    )}

                    {service.status === "in_progress" && (
                        <div className="space-y-2">
                            {confirmComplete && (
                                <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
                                    <span className="text-amber-400 text-sm">⚠️</span>
                                    <p className="text-sm text-amber-300 flex-1">¿Confirmas que el trabajo está terminado?</p>
                                    <button onClick={() => setConfirmComplete(false)} className="text-xs text-muted-foreground underline">Cancelar</button>
                                </div>
                            )}
                            <Button onClick={handleComplete} size="lg" className={`w-full ${confirmComplete ? "bg-green-600 hover:bg-green-700 animate-pulse" : "bg-green-600/80 hover:bg-green-600"}`} disabled={isUpdating}>
                                <CheckCircle className="mr-2 h-5 w-5" />
                                {isUpdating ? "Completando..." : confirmComplete ? "✅ Sí, marcar como completado" : "Marcar como Completado"}
                                {!photos.after && <span className="ml-2 text-xs opacity-70">(requiere foto)</span>}
                            </Button>
                        </div>
                    )}

                    {["arrived", "in_progress"].includes(service.status) && (
                        <div className="pt-4 border-t border-border/20 mt-4 space-y-3">
                            <Button 
                                onClick={() => router.push(`/tecnicos/servicio/${service.id}/ajuste`)} 
                                variant="outline" 
                                size="lg" 
                                className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                            >
                                <ReceiptText className="mr-2 h-5 w-5" />
                                Ajuste de Monto
                            </Button>
                            
                            <Button 
                                onClick={() => router.push(`/tecnicos/servicio/${service.id}/incidente`)} 
                                variant="outline" 
                                size="lg" 
                                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                            >
                                <AlertCircle className="mr-2 h-5 w-5" />
                                Reportar Incidente
                            </Button>
                        </div>
                    )}

                </div>
            </div>

            {/* FAB for Chat - visible for active services */}
            {token && (
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
                                    Chat con el Cliente
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
    )
}

export default function TechnicianServicePage() {
    return (
        <ProtectedRoute allowedRoles={["technician", "reaction_team"]}>
            <div className="container pt-24 pb-8 px-4 max-w-2xl">
                <TechnicianServiceContent />
            </div>
        </ProtectedRoute>
    )
}
