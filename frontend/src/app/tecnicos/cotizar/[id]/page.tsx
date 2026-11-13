"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { 
    ArrowLeft, Send, Loader2, DollarSign, FileText, Clock, 
    AlertCircle, Shield, Car, CheckCircle2, Wrench, Radio, Info,
    MapPin, Calendar, Camera, MessageSquare, X
} from "lucide-react"
import { motion } from "framer-motion"

import { ProtectedRoute } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { createQuotation, QuotationCreate } from "@/lib/quotations"
import { getCourseOnboardingStatus, CourseOnboardingStatus, getServiceById } from "@/lib/api"
import { BasicCoursesModal } from "@/components/technician/BasicCoursesModal"
import { getImageUrl } from "@/lib/utils"
import { getClientObservations, isQuickMechanicsService } from "@/lib/service-utils"

interface ServiceInfo {
    id: string
    title: string
    description?: string | null
    client_notes?: string | null
    service_type: string
    service_address: string
    service_city?: string | null
    scheduled_date?: string | null
    client_name?: string | null
    client?: { full_name?: string | null } | null
    vehicle_plate?: string | null
    vehicle_model?: string | null
    vehicle_type?: string | null
    vehicle_photo_url?: string | null
    estimated_price?: number | null
    service_metadata?: Record<string, any> | null
}

const FALLBACK_SERVICE: ServiceInfo = {
    id: "srv-gps-842",
    title: "Instalación GPS Satelital 4G con Corte de Combustible Remoto",
    description: "Requerimiento de instalación bajo milla cero para vehículo particular. Instalación oculta con relevo de corte de energía/bomba, botón de asistencia inmediata y configuración de alertas de velocidad y geocercas.",
    service_type: "gps_installation",
    service_address: "Calle 100 # 15-20, Chico Norte, Bogotá",
    client_name: "Transportes Logísticos & Flotas SAS",
    vehicle_plate: "KLS-842"
}

export function QuotationFormContent() {
    const params = useParams()
    const router = useRouter()
    const { toast } = useToast()
    const serviceId = (params?.id as string) || "srv-demo"

    const [service, setService] = useState<ServiceInfo | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [courseStatus, setCourseStatus] = useState<CourseOnboardingStatus | null>(null)
    const [showCourseGateModal, setShowCourseGateModal] = useState(false)
    const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null)

    // Form state
    const [amount, setAmount] = useState("480,000")
    const [description, setDescription] = useState(
        "Presupuesto técnico completo:\n- Mano de obra especializada de instalación oculta: $280.000 COP\n- Kit de arnés ignición, relevo 12V 40A y fusible antifricción: $120.000 COP\n- Calibración de antena GNSS y enlace de telemetría a plataforma: $80.000 COP\nGarantía de 30 días en mano de obra certificada Tec360."
    )
    const [expiresIn, setExpiresIn] = useState<number | undefined>(48)

    useEffect(() => {
        getCourseOnboardingStatus()
            .then((st) => {
                setCourseStatus(st)
                if (!st.can_operate) {
                    setShowCourseGateModal(true)
                }
            })
            .catch(() => {})
    }, [])

    useEffect(() => {
        async function fetchService() {
            try {
                const data = await getServiceById(serviceId)
                if (data) {
                    setService(data)
                    return
                }
                setService({
                    ...FALLBACK_SERVICE,
                    id: serviceId
                })
            } catch (err: any) {
                console.warn("Using fallback service for quotation form", err)
                setService({
                    ...FALLBACK_SERVICE,
                    id: serviceId
                })
            } finally {
                setIsLoading(false)
            }
        }

        fetchService()
    }, [serviceId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (courseStatus && !courseStatus.can_operate) {
            setShowCourseGateModal(true)
            return
        }

        const numAmount = parseFloat(amount.replace(/,/g, ""))
        if (isNaN(numAmount) || numAmount <= 0) {
            toast({
                title: "Error en monto",
                description: "Ingresa un monto válido en pesos colombianos",
                variant: "destructive",
            })
            return
        }

        if (description.trim().length < 10) {
            toast({
                title: "Detalle insuficiente",
                description: "La propuesta debe detallar el desglose con al menos 10 caracteres",
                variant: "destructive",
            })
            return
        }

        setIsSubmitting(true)
        try {
            const data: QuotationCreate = {
                amount: numAmount,
                description: description.trim(),
                expires_in_hours: expiresIn,
            }

            const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
            if (token) {
                await createQuotation(serviceId, data)
            }

            toast({
                title: "¡Cotización enviada exitosamente!",
                description: `El cliente ha recibido tu propuesta por $${numAmount.toLocaleString("es-CO")} COP.`,
            })

            router.push("/tecnicos/mis-cotizaciones")
        } catch (err: any) {
            if (err?.message?.includes("COURSE_REQUIRED")) {
                setShowCourseGateModal(true)
                return
            }
            toast({
                title: "Error al enviar",
                description: err.message || "Error al procesar la propuesta",
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const formatAmount = (value: string) => {
        const num = value.replace(/[^0-9]/g, "")
        return num ? parseInt(num).toLocaleString("es-CO") : ""
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[360px] gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Cargando expediente de servicio...
                </span>
            </div>
        )
    }

    const currentService = service || FALLBACK_SERVICE

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 pb-2 border-b border-slate-800">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => router.back()}
                    className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight text-white">
                            Enviar Cotización Técnica
                        </h1>
                        <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-mono uppercase">
                            Presupuesto Vinculante
                        </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                        Propuesta económica y alcance técnico para el servicio #{currentService.id.substring(0, 10)}
                    </p>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
                {/* Service Details Card (Left 5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="p-6 rounded-2xl bg-[#080F24] border border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                                Detalle de la Solicitud
                            </span>
                            <Badge className={isQuickMechanicsService(currentService)
                                ? "bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px] font-mono"
                                : "bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px] font-mono"
                            }>
                                {isQuickMechanicsService(currentService) ? "MECÁNICA EXPRESS" : "SERVICIO TÉCNICO"}
                            </Badge>
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-white leading-snug">
                                {currentService.title}
                            </h2>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                {(currentService.vehicle_model || currentService.vehicle_plate) && (
                                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-200 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-700/80">
                                        <Car className="h-3.5 w-3.5 text-blue-400" />
                                        {currentService.vehicle_model ? `${currentService.vehicle_model} · ` : ""}
                                        <strong className="font-mono">{currentService.vehicle_plate || "SIN PLACA"}</strong>
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800/80 space-y-3 text-xs text-slate-300">
                            <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                    <span className="text-slate-500 block text-[11px]">Ubicación de atención</span>
                                    <span className="text-slate-100 font-medium">
                                        {currentService.service_address}
                                        {currentService.service_city ? `, ${currentService.service_city}` : ""}
                                    </span>
                                </div>
                            </div>

                            {currentService.scheduled_date && (
                                <div className="flex items-start gap-2">
                                    <Calendar className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="text-slate-500 block text-[11px]">Fecha y hora programada</span>
                                        <span className="text-slate-100 font-medium capitalize">
                                            {format(new Date(currentService.scheduled_date), "EEEE d 'de' MMMM · h:mm a", { locale: es })}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {(currentService.client?.full_name || currentService.client_name) && (
                                <div>
                                    <span className="text-slate-500 block text-[11px]">Cliente</span>
                                    <span className="text-slate-200 font-medium">{currentService.client?.full_name || currentService.client_name}</span>
                                </div>
                            )}

                            {/* Prominent Client Observations */}
                            {(() => {
                                const observations = getClientObservations(currentService)
                                return (
                                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/40 space-y-1.5">
                                        <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider font-bold text-amber-300">
                                            <MessageSquare className="h-3.5 w-3.5" />
                                            Observaciones y falla reportada
                                        </span>
                                        <p className="text-slate-100 leading-relaxed text-sm font-medium whitespace-pre-wrap">
                                            {observations.primary || "El cliente no dejó observaciones adicionales."}
                                        </p>
                                        {observations.notes && (
                                            <p className="text-amber-200/90 text-xs pt-1 border-t border-amber-400/20">
                                                Nota adicional: {observations.notes}
                                            </p>
                                        )}
                                    </div>
                                )
                            })()}

                            {/* Supplies Info if present */}
                            {currentService.service_metadata?.supplies_provider && (
                                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs">
                                    <span className="text-slate-400 block text-[11px] font-mono uppercase">Repuestos / Insumos</span>
                                    <p className="text-slate-200 font-semibold mt-0.5">
                                        {currentService.service_metadata.supplies_provider === "client"
                                            ? "🧰 El cliente suministra el repuesto / dispositivo"
                                            : "🚚 Técnico debe suministrar el repuesto / dispositivo"}
                                    </p>
                                    {currentService.service_metadata.supplies_notes && (
                                        <p className="text-slate-400 text-[11px] mt-1">Ref: {currentService.service_metadata.supplies_notes}</p>
                                    )}
                                </div>
                            )}

                            {/* Client Uploaded Photo */}
                            {currentService.vehicle_photo_url && (() => {
                                const photoUrl = getImageUrl(currentService.vehicle_photo_url)
                                if (!photoUrl) return null
                                return (
                                    <div className="space-y-1.5">
                                        <span className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider font-bold text-slate-400">
                                            <Camera className="h-3.5 w-3.5 text-blue-400" />
                                            Foto enviada por el cliente (toca para ampliar)
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setZoomPhotoUrl(photoUrl)}
                                            className="group relative w-full h-44 rounded-xl overflow-hidden border border-slate-700 hover:border-blue-400 transition-colors cursor-pointer bg-slate-950"
                                        >
                                            <img
                                                src={photoUrl}
                                                alt="Foto del vehículo enviada por el cliente"
                                                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                                            />
                                        </button>
                                    </div>
                                )
                            })()}
                        </div>

                        {/* Escrow Custody Assurance Notice */}
                        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-200 space-y-1.5">
                            <div className="flex items-center gap-2 font-semibold text-emerald-400">
                                <Shield className="h-4 w-4" />
                                <span>Custodia Escrow Tec360</span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-slate-300">
                                Cuando el cliente acepte tu presupuesto, los fondos se retienen en garantía Escrow. Tu pago se libera a tu saldo operativo inmediatamente tras la confirmación del trabajo en sitio.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quotation Form (Right 7 cols) */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-7"
                >
                    <div className="p-6 rounded-2xl bg-[#080F24] border border-slate-800 shadow-xl">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Amount Input */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-emerald-400" />
                                        Monto Total del Presupuesto (COP) *
                                    </span>
                                    <span className="text-[11px] font-normal text-slate-500 font-mono">
                                        Comisión plataforma 10%
                                    </span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-lg">
                                        $
                                    </span>
                                    <input
                                        type="text"
                                        value={amount}
                                        onChange={(e) => setAmount(formatAmount(e.target.value))}
                                        placeholder="480,000"
                                        className="w-full pl-9 pr-16 py-3.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-blue-500 text-white font-mono text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                                        required
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                                        COP
                                    </span>
                                </div>
                            </div>

                            {/* Description / Scope Breakdown */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-blue-400" />
                                    Desglose de Mano de Obra, Repuestos y Viáticos *
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Detalla los costos:&#10;- Mano de obra técnica: $X&#10;- Materiales/Accesorios: $Y&#10;- Viáticos o desplazamiento: $Z"
                                    rows={6}
                                    className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 focus:border-blue-500 text-slate-200 text-xs leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-sans"
                                    required
                                    minLength={10}
                                />
                                <div className="flex justify-between items-center text-[11px] text-slate-500">
                                    <span>Mínimo 10 caracteres explicativos</span>
                                    <span className="font-mono">{description.length} caracteres</span>
                                </div>
                            </div>

                            {/* Expiration Hours */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-amber-400" />
                                    Vigencia de la Oferta
                                </label>
                                <select
                                    value={expiresIn || ""}
                                    onChange={(e) => setExpiresIn(e.target.value ? parseInt(e.target.value) : undefined)}
                                    className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                >
                                    <option value="24">24 horas (Recomendado para servicios urgentes)</option>
                                    <option value="48">48 horas (Estándar)</option>
                                    <option value="72">72 horas (3 días)</option>
                                    <option value="168">7 días (1 semana)</option>
                                </select>
                            </div>

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 mt-4 cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Transmitiendo cotización...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4" />
                                        <span>Emitir Cotización Vinculante</span>
                                    </>
                                )}
                            </Button>
                        </form>
                    </div>
                </motion.div>
            </div>

            <BasicCoursesModal
                isOpen={showCourseGateModal}
                onClose={() => setShowCourseGateModal(false)}
                onDismissForever={() => setShowCourseGateModal(false)}
                mode="gate"
                pendingCourseSlug={courseStatus?.pending_courses?.[0]?.slug}
                pendingCourseTitle={courseStatus?.pending_courses?.[0]?.title}
            />

            {zoomPhotoUrl && (
                <div
                    className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setZoomPhotoUrl(null)}
                >
                    <div className="relative max-w-2xl w-full rounded-2xl overflow-hidden bg-slate-950 border border-white/15 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => setZoomPhotoUrl(null)}
                            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-slate-900/90 text-white hover:bg-slate-800 border border-white/15 cursor-pointer"
                            aria-label="Cerrar foto"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        <img src={zoomPhotoUrl} alt="Foto del vehículo enviada por el cliente" className="w-full max-h-[80vh] object-contain bg-black" />
                    </div>
                </div>
            )}
        </div>
    )
}

export default function QuotationPage() {
    return (
        <ProtectedRoute allowedRoles={["technician", "reaction_team"]}>
            <div className="min-h-screen bg-[#020408] text-slate-100 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <QuotationFormContent />
                </div>
            </div>
        </ProtectedRoute>
    )
}
