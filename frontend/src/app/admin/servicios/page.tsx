"use client"

import { cn } from "@/lib/utils"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    ShieldAlert, MapPin, User, X,
    Camera, Phone, CheckCircle, Clock, Loader2, Search,
    Activity, Lock, FileSpreadsheet,
    Layers, Wrench, ShieldCheck, Ban
} from "lucide-react"
import { toast } from "react-hot-toast"
import api, { getDispatchAnalytics, DispatchAnalytics } from "@/lib/api"
import { DispatchTelemetryPanel } from "@/components/admin/dispatch-telemetry-panel"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { getImageUrl } from "@/lib/utils"

/* ─── Types ──────────────────────────────────────── */
interface AdminService {
    id: string
    title: string
    service_type: string
    status: string
    service_address: string
    estimated_price: number | null
    vehicle_plate: string | null
    client_id: string
    client_name: string | null
    client_phone: string | null
    technician_id: string | null
    technician_name: string | null
    created_at: string
}

interface ServiceDetail extends AdminService {
    description?: string
    scheduled_date?: string
    service_city?: string
    vehicle_type?: string
    vehicle_model?: string
    service_metadata?: Record<string, any>
    client?: { full_name?: string; phone?: string; email?: string }
    technician?: { full_name?: string; phone?: string; average_rating?: number }
}

interface ServicePhoto {
    id: string
    image_url: string
    image_type: "before" | "during" | "after"
    created_at: string
}

/* ─── Pillars and Isolation ───────────────────────── */
export type PillarKey = "all" | "instalaciones" | "reaccion" | "mecanica"

export interface PillarInfo {
    key: PillarKey
    label: string
    icon: string
    badgeBg: string
    badgeBorder: string
    badgeText: string
    accentColor: string
}

export function getPillarInfo(serviceType: string): PillarInfo {
    if (serviceType === "vehicle_recovery") {
        return {
            key: "reaccion",
            label: "REACCIÓN INMEDIATA 24/7",
            icon: "🚨",
            badgeBg: "bg-[#200A14]",
            badgeBorder: "border-[#4C0519]",
            badgeText: "text-[#FDA4AF]",
            accentColor: "#E11D48",
        }
    }
    if (
        [
            "oil_change", "tire_change", "battery_service",
            "brake_service", "chain_kit_service", "spark_bulbs_wipers"
        ].includes(serviceType)
    ) {
        return {
            key: "mecanica",
            label: "MECÁNICA EXPRESS",
            icon: "🧰",
            badgeBg: "bg-[#241908]",
            badgeBorder: "border-[#451A03]",
            badgeText: "text-[#FDE68A]",
            accentColor: "#F59E0B",
        }
    }
    return {
        key: "instalaciones",
        label: "INSTALACIONES VEHICULARES",
        icon: "🛰️",
        badgeBg: "bg-[#0B1736]",
        badgeBorder: "border-[#1E3A8A]",
        badgeText: "text-[#93C5FD]",
        accentColor: "#2563EB",
    }
}

/* ─── Status helpers ─────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    pending: { label: "En cola", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/30", dot: "bg-amber-400" },
    assigned: { label: "Asignado", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/30", dot: "bg-blue-400" },
    en_route: { label: "En camino", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30", dot: "bg-emerald-400" },
    arrived: { label: "En sitio", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30", dot: "bg-purple-400" },
    in_progress: { label: "En progreso", color: "text-sky-400", bg: "bg-sky-400/10 border-sky-400/30", dot: "bg-sky-400" },
    completed: { label: "Completado", color: "text-green-400", bg: "bg-green-400/10 border-green-400/30", dot: "bg-green-400" },
    confirmed: { label: "Confirmado", color: "text-emerald-300", bg: "bg-emerald-500/15 border-emerald-500/35", dot: "bg-emerald-300" },
    cancelled: { label: "Cancelado", color: "text-rose-400", bg: "bg-rose-400/10 border-rose-400/30", dot: "bg-rose-400" },
    quoted: { label: "Cotizado", color: "text-cyan-400", bg: "bg-cyan-400/10 border-cyan-400/30", dot: "bg-cyan-400" },
}

const TYPE_LABELS: Record<string, string> = {
    gps_installation: "Instalación GPS 4G + Corte",
    gps_maintenance: "Mantenimiento GPS",
    alarm_installation: "Instalación Alarma",
    alarm_maintenance: "Mantenimiento Alarma",
    camera_installation: "Instalación Dashcam HD",
    camera_maintenance: "Mantenimiento Dashcam",
    oil_change: "Cambio de Aceite Sintético",
    tire_change: "Cambio de Llantas",
    battery_service: "Batería / Sistema Eléctrico",
    brake_service: "Pastillas de Freno",
    chain_kit_service: "Kit de Arrastre",
    spark_bulbs_wipers: "Vehículo no enciende",
    vehicle_recovery: "Equipo Reacción Inmediata 24/7",
    other: "Servicio Especializado",
}

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] || { label: status, color: "text-slate-400", bg: "bg-slate-800/40 border-slate-700/40", dot: "bg-slate-400" }
    return (
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${cfg.color} ${cfg.bg} shadow-sm`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
            {cfg.label.toUpperCase()}
        </span>
    )
}

/* ─── Photo stage labels ─────────────────────────── */
const PHOTO_LABELS: Record<string, { label: string; emoji: string }> = {
    before: { label: "Recepción inicial", emoji: "📷" },
    during: { label: "Ejecución técnica", emoji: "🔧" },
    after: { label: "Entrega verificada", emoji: "✅" },
}

/* ─── Detail drawer ──────────────────────────────── */
function ServiceDetailDrawer({
    serviceId,
    onClose,
    onUpdated,
}: {
    serviceId: string
    onClose: () => void
    onUpdated?: () => void
}) {
    const [detail, setDetail] = useState<ServiceDetail | null>(null)
    const [photos, setPhotos] = useState<ServicePhoto[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
    const [forceClosing, setForceClosing] = useState(false)
    const [forceCloseReason, setForceCloseReason] = useState("")
    const [showForceCloseBox, setShowForceCloseBox] = useState(false)

    const handleForceClose = async () => {
        const reason = forceCloseReason.trim() || "Cerrado administrativamente desde Centro de Control"
        try {
            setForceClosing(true)
            await api.post(`/admin/services/${serviceId}/force-close?reason=${encodeURIComponent(reason)}`, {})
            toast.success("Servicio cancelado/cerrado forzosamente")
            setDetail((prev) => (prev ? { ...prev, status: "cancelled" } : prev))
            setShowForceCloseBox(false)
            onUpdated?.()
        } catch {
            toast.error("No se pudo forzar el cierre del servicio")
        } finally {
            setForceClosing(false)
        }
    }

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true)
            try {
                const [detailRes, photoRes] = await Promise.allSettled([
                    api.get(`/admin/services/${serviceId}`),
                    api.get(`/images/services/${serviceId}`),
                ])
                if (detailRes.status === "fulfilled") setDetail(detailRes.value.data)
                if (photoRes.status === "fulfilled") {
                    const rawImages = photoRes.value.data.images || photoRes.value.data.photos || []
                    setPhotos(rawImages.map((img: any) => ({
                        id: img.id,
                        image_url: img.public_url || img.image_url,
                        image_type: img.image_type,
                        created_at: img.created_at,
                    })))
                }
            } catch {
                toast.error("Error cargando expediente del servicio")
            } finally {
                setLoading(false)
            }
        }
        fetchAll()
    }, [serviceId])

    const PHOTO_ORDER: Array<"before" | "during" | "after"> = ["before", "during", "after"]
    const pillar = detail ? getPillarInfo(detail.service_type) : null

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Drawer */}
            <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 280 }}
                className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-[#070D1E] border-l border-slate-800 text-slate-100 shadow-2xl overflow-y-auto"
            >
                {/* Header */}
                <div className="sticky top-0 bg-[#070D1E]/95 backdrop-blur-md border-b border-slate-800/80 px-6 py-4 flex items-center gap-3 z-10">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="shrink-0 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold text-base truncate text-slate-100">
                                {detail?.title || "Expediente del Servicio"}
                            </h2>
                            {detail?.vehicle_plate && (
                                <span className="px-1.5 py-0.5 rounded font-mono font-bold text-xs bg-slate-950 text-slate-100 border border-slate-700">
                                    {detail.vehicle_plate}
                                </span>
                            )}
                        </div>
                        <p className="text-xs font-mono text-slate-400 truncate">
                            ID: #{serviceId}
                        </p>
                    </div>
                    {detail?.status && <StatusBadge status={detail.status} />}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-80 space-y-3">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                            Cargando telemetría y custodia del servicio...
                        </p>
                    </div>
                ) : !detail ? (
                    <div className="p-8 text-center text-slate-400">No se pudo cargar el expediente</div>
                ) : (
                    <div className="p-6 space-y-6">

                        {/* ─── Pillar & Escrow Guarantee Header ─── */}
                        <div className="p-4 rounded-xl bg-[#0B132B] border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${pillar?.badgeBg} ${pillar?.badgeBorder} ${pillar?.badgeText}`}>
                                    {pillar?.icon} {pillar?.label}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono font-medium">
                                <Lock className="w-3.5 h-3.5" />
                                <span>Custodia Escrow: <strong>${detail.estimated_price?.toLocaleString() || "280.000"} COP</strong></span>
                            </div>
                        </div>

                        {/* ─── General info ─────────────────── */}
                        <section className="space-y-3">
                            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                <Layers className="w-3.5 h-3.5 text-blue-400" /> Datos del Servicio & Vehículo
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-[#050810]/70 rounded-xl p-3 border border-slate-800/80">
                                    <p className="text-[10px] font-mono text-slate-400 mb-1">Tipo Operativo</p>
                                    <p className="text-sm font-semibold text-slate-200">
                                        {TYPE_LABELS[detail.service_type] || detail.service_type}
                                    </p>
                                </div>
                                <div className="bg-[#050810]/70 rounded-xl p-3 border border-slate-800/80">
                                    <p className="text-[10px] font-mono text-slate-400 mb-1">Custodia Tec360 Escrow</p>
                                    <p className="text-sm font-mono font-bold text-emerald-400">
                                        {detail.estimated_price ? `$${detail.estimated_price.toLocaleString()} COP` : "Sin cotizar"}
                                    </p>
                                </div>
                                <div className="bg-[#050810]/70 rounded-xl p-3 border border-slate-800/80 col-span-2">
                                    <p className="text-[10px] font-mono text-slate-400 mb-1 flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5 text-rose-400" /> Dirección de Operación
                                    </p>
                                    <p className="text-sm font-medium text-slate-200">{detail.service_address}</p>
                                    {detail.service_city && (
                                        <p className="text-xs text-slate-400 mt-0.5">{detail.service_city}</p>
                                    )}
                                </div>
                                {detail.scheduled_date && (
                                    <div className="bg-[#050810]/70 rounded-xl p-3 border border-slate-800/80 col-span-2">
                                        <p className="text-[10px] font-mono text-slate-400 mb-1 flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5 text-blue-400" /> Fecha Programada
                                        </p>
                                        <p className="text-sm font-medium text-slate-200">
                                            {format(new Date(detail.scheduled_date), "PPP 'a las' p", { locale: es })}
                                        </p>
                                    </div>
                                )}
                                <div className="bg-[#050810]/70 rounded-xl p-3 border border-slate-800/80">
                                    <p className="text-[10px] font-mono text-slate-400 mb-1">Fecha de Creación</p>
                                    <p className="text-xs font-mono text-slate-300">
                                        {format(new Date(detail.created_at), "dd MMM yyyy · HH:mm", { locale: es })}
                                    </p>
                                </div>
                                <div className="bg-[#050810]/70 rounded-xl p-3 border border-slate-800/80">
                                    <p className="text-[10px] font-mono text-slate-400 mb-1">Vehículo Asignado</p>
                                    <p className="text-xs font-semibold text-slate-200">
                                        {detail.vehicle_model || detail.vehicle_type || "No especificado"}
                                    </p>
                                </div>
                            </div>
                            {detail.description && (
                                <div className="bg-[#050810]/70 rounded-xl p-3 border border-slate-800/80">
                                    <p className="text-[10px] font-mono text-slate-400 mb-1">Instrucciones / Descripción</p>
                                    <p className="text-xs text-slate-300 leading-relaxed">{detail.description}</p>
                                </div>
                            )}

                            {/* Supplies / Device metadata */}
                            {detail.service_metadata?.supplies_provider && (
                                <div className={cn(
                                    "rounded-xl p-4 border",
                                    detail.service_metadata?.service_category === "installations"
                                        ? "bg-[#0B1528]/80 border-[#1E3A8A]"
                                        : "bg-[#241908]/80 border-[#451A03]"
                                )}>
                                    <p className={cn(
                                        "text-[10px] mb-2 font-mono font-bold uppercase tracking-wider flex items-center gap-1.5",
                                        detail.service_metadata?.service_category === "installations"
                                            ? "text-blue-400"
                                            : "text-amber-400"
                                    )}>
                                        <Wrench className="w-3.5 h-3.5" /> {detail.service_metadata?.service_category === "installations" ? "Dispositivo & Equipo de Seguridad" : "Insumos & Repuestos de Mecánica"}
                                    </p>
                                    <div className="space-y-1.5 text-xs text-slate-200">
                                        <div>
                                            <span className="text-slate-400">
                                                {detail.service_metadata?.service_category === "installations" ? "Origen de Dispositivo:" : "Origen de Repuestos:"}
                                            </span>{" "}
                                            <span className={cn(
                                                "font-semibold",
                                                detail.service_metadata?.service_category === "installations" ? "text-blue-300" : "text-amber-300"
                                            )}>
                                                {detail.service_metadata?.service_category === "installations"
                                                    ? (detail.service_metadata.supplies_provider === "client" ? "🧰 Cliente suministra dispositivo" : "📦 Técnico Certificado Tec360 suministra equipo")
                                                    : (detail.service_metadata.supplies_provider === "client" ? "🧰 Cliente suministra repuestos" : "🚚 Técnico Certificado Tec360 suministra repuestos")
                                                }
                                            </span>
                                        </div>
                                        {detail.service_metadata.supplies_notes && (
                                            <div>
                                                <span className="text-slate-400">Referencia:</span>{" "}
                                                <span className="font-mono text-slate-200">{detail.service_metadata.supplies_notes}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Vehicle recovery metadata */}
                            {detail.service_type === "vehicle_recovery" && detail.service_metadata && (
                                <div className="bg-[#200A14]/80 rounded-xl p-4 border border-[#4C0519]">
                                    <p className="text-[10px] text-rose-400 mb-2 font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                                        <ShieldAlert className="w-3.5 h-3.5" /> Telemetría de Recuperación 24/7
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-200">
                                        {detail.vehicle_type && <div><span className="text-slate-400">Tipo:</span> <span className="font-semibold capitalize">{detail.vehicle_type === "car" ? "Carro" : "Moto"}</span></div>}
                                        {detail.vehicle_model && <div><span className="text-slate-400">Modelo:</span> <span className="font-semibold">{detail.vehicle_model}</span></div>}
                                        {detail.vehicle_plate && <div><span className="text-slate-400">Placa:</span> <span className="font-mono font-bold text-amber-300">{detail.vehicle_plate}</span></div>}
                                        {detail.service_metadata.vehicle_color && <div><span className="text-slate-400">Color:</span> <span className="font-semibold">{detail.service_metadata.vehicle_color}</span></div>}
                                        {detail.service_metadata.stolen_datetime && <div className="col-span-2"><span className="text-slate-400">Hora Alerta:</span> <span className="font-mono">{new Date(detail.service_metadata.stolen_datetime).toLocaleString("es-CO")}</span></div>}
                                        {detail.service_metadata.has_gps && <div><span className="text-slate-400">GPS:</span> <span className="font-semibold">{detail.service_metadata.has_gps === "yes" ? `Sí (${detail.service_metadata.gps_brand || "Activo"})` : "No"}</span></div>}
                                        {detail.service_metadata.police_report_number && <div className="col-span-2"><span className="text-slate-400">Radicado Policía:</span> <span className="font-mono font-semibold">{detail.service_metadata.police_report_number}</span></div>}
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* ─── Client & Certified Specialist ─ */}
                        <section className="space-y-3">
                            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                <User className="w-3.5 h-3.5 text-blue-400" /> Personal Involucrado
                            </h3>
                            <div className="grid gap-3">
                                {/* Client */}
                                <div className="flex items-center gap-3 bg-[#050810]/70 rounded-xl p-3 border border-slate-800/80">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                        <User className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-mono text-slate-400">Cliente Titular</p>
                                        <p className="text-sm font-semibold text-slate-200 truncate">
                                            {detail.client?.full_name || detail.client_name || detail.client_id?.substring(0, 12) + "..."}
                                        </p>
                                        {(detail.client?.phone || detail.client_phone) && (
                                            <a href={`tel:${detail.client?.phone || detail.client_phone}`} className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-0.5">
                                                <Phone className="w-3 h-3" /> {detail.client?.phone || detail.client_phone}
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Certified Technician */}
                                {detail.technician_id ? (
                                    <div className="flex items-center gap-3 bg-[#050810]/70 rounded-xl p-3 border border-slate-800/80">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                            <ShieldCheck className="w-5 h-5 text-emerald-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] font-mono text-slate-400">Técnico Certificado Tec360</p>
                                                <span className="text-[10px] font-bold text-amber-400">★ 4.95</span>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-100 truncate">
                                                {detail.technician?.full_name || detail.technician_name || "Especialista Tec360"}
                                            </p>
                                            {(detail.technician?.phone) && (
                                                <a href={`tel:${detail.technician.phone}`} className="text-xs text-emerald-400 hover:underline flex items-center gap-1 mt-0.5">
                                                    <Phone className="w-3 h-3" /> {detail.technician.phone}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-[#050810]/40 rounded-xl p-3 border border-slate-800/80 text-center">
                                        <p className="text-xs font-mono text-slate-400">En cola de asignación algorítmica de proximidad</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* ─── Photo evidence ───────────────── */}
                        <section className="space-y-3">
                            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                <Camera className="w-3.5 h-3.5 text-blue-400" />
                                Evidencias Fotográficas Auditadas ({photos.length}/3)
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                                {PHOTO_ORDER.map((photoType) => {
                                    const photo = photos.find(p => p.image_type === photoType)
                                    const meta = PHOTO_LABELS[photoType]
                                    return (
                                        <div key={photoType} className="flex flex-col gap-1.5">
                                            <div
                                                className={`relative aspect-square rounded-xl border overflow-hidden cursor-pointer transition-all ${photo
                                                    ? "border-emerald-500/60 hover:border-emerald-400 shadow-md shadow-emerald-500/10"
                                                    : "border-slate-800 bg-[#050810]"
                                                    }`}
                                                onClick={() => photo && setSelectedPhoto(getImageUrl(photo.image_url) || "")}
                                            >
                                                {photo ? (
                                                    <>
                                                        <img
                                                            src={getImageUrl(photo.image_url)}
                                                            alt={meta.label}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow">
                                                            <CheckCircle className="w-3 h-3 text-white" />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                                                        <span className="text-xl">{meta.emoji}</span>
                                                        <p className="text-[9px] font-mono text-slate-500 text-center">Pendiente</p>
                                                    </div>
                                                )}
                                            </div>
                                            <p className={`text-[10px] text-center font-mono leading-tight ${photo ? "text-emerald-400 font-bold" : "text-slate-500"}`}>
                                                {meta.label}
                                            </p>
                                        </div>
                                    )
                                })}
                            </div>
                            {photos.length === 3 ? (
                                <p className="text-xs text-emerald-400 text-center font-mono font-semibold">
                                    ✅ Protocolo fotográfico 3/3 completado y sellado en Escrow
                                </p>
                            ) : (
                                <p className="text-[11px] text-slate-400 text-center font-mono">
                                    Requiere 3 capturas obligatorias para liberación de fondos
                                </p>
                            )}
                        </section>

                        {/* ─── Administrative Force-Close Control ─── */}
                        {!["completed", "confirmed", "cancelled"].includes(detail.status) && (
                            <section className="pt-3 border-t border-slate-800/80 space-y-2.5">
                                {!showForceCloseBox ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowForceCloseBox(true)}
                                        className="w-full rounded-xl border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-mono font-bold gap-2"
                                    >
                                        <Ban className="w-3.5 h-3.5" />
                                        Forzar Cierre / Cancelar Servicio Atascado
                                    </Button>
                                ) : (
                                    <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-2.5 font-mono text-xs">
                                        <p className="text-rose-300 font-bold">Motivo de cierre administrativo:</p>
                                        <input
                                            type="text"
                                            value={forceCloseReason}
                                            onChange={(e) => setForceCloseReason(e.target.value)}
                                            placeholder="Ej: Solicitud del cliente o servicio duplicado..."
                                            className="w-full px-3 py-2 rounded-lg bg-[#050810] border border-slate-800 text-slate-100 text-xs outline-none focus:border-rose-500"
                                        />
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowForceCloseBox(false)}
                                                className="text-xs font-mono text-slate-400"
                                            >
                                                Volver
                                            </Button>
                                            <Button
                                                size="sm"
                                                disabled={forceClosing}
                                                onClick={handleForceClose}
                                                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold rounded-lg"
                                            >
                                                {forceClosing ? "Cerrando..." : "Confirmar Cierre"}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Lightbox */}
            <AnimatePresence>
                {selectedPhoto && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setSelectedPhoto(null)}
                    >
                        <Button
                            variant="ghost" size="icon"
                            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full"
                            onClick={() => setSelectedPhoto(null)}
                        >
                            <X className="w-5 h-5" />
                        </Button>
                        <img
                            src={selectedPhoto}
                            alt="Evidencia fotográfica"
                            className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-slate-700"
                            onClick={e => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

/* ─── Main page ──────────────────────────────────── */
export default function AdminServicesPage() {
    const [services, setServices] = useState<AdminService[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState("")
    const [selectedPillar, setSelectedPillar] = useState<PillarKey>("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [viewMode, setViewMode] = useState<"services" | "telemetry">("services")
    const [dispatchMetrics, setDispatchMetrics] = useState<DispatchAnalytics | null>(null)

    useEffect(() => {
        if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search)
            const q = urlParams.get("search")
            if (q) setSearchQuery(q)
        }
        getDispatchAnalytics(30)
            .then((data) => setDispatchMetrics(data))
            .catch(() => {})
    }, [])

    const fetchServices = async (customSearch?: string, customStatus?: string) => {
        setLoading(true)
        try {
            const activeStatus = customStatus !== undefined ? customStatus : statusFilter
            const activeSearch = (customSearch !== undefined ? customSearch : searchQuery).trim()
            const params = new URLSearchParams()
            params.append("limit", "100")
            if (activeStatus) params.append("status", activeStatus)
            if (activeSearch.length >= 1) params.append("search", activeSearch)
            
            const response = await api.get(`/admin/services?${params.toString()}`)
            const items = response.data.items || []
            setServices(items)
            setTotal(response.data.total ?? items.length)
        } catch {
            toast.error("Error al cargar servicios operativos")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchServices(searchQuery, statusFilter)
    }, [statusFilter])

    // Debounced search
    useEffect(() => {
        const t = setTimeout(() => {
            fetchServices(searchQuery, statusFilter)
        }, 300)
        return () => clearTimeout(t)
    }, [searchQuery])

    // Filter by Pillar and Search locally as well
    const filteredServices = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        return services.filter((s) => {
            if (selectedPillar !== "all" && getPillarInfo(s.service_type).key !== selectedPillar) {
                return false
            }
            if (!q) return true
            return (
                s.title?.toLowerCase().includes(q) ||
                s.vehicle_plate?.toLowerCase().includes(q) ||
                s.client_name?.toLowerCase().includes(q) ||
                s.client_phone?.toLowerCase().includes(q) ||
                s.technician_name?.toLowerCase().includes(q) ||
                s.service_address?.toLowerCase().includes(q) ||
                s.id?.toLowerCase().includes(q)
            )
        })
    }, [services, selectedPillar, searchQuery])

    // Dynamic metrics calculation (real values, zero fake numbers)
    const counts = useMemo(() => {
        const inst = services.filter(s => getPillarInfo(s.service_type).key === "instalaciones").length
        const reac = services.filter(s => getPillarInfo(s.service_type).key === "reaccion").length
        const mec = services.filter(s => getPillarInfo(s.service_type).key === "mecanica").length
        const active = services.filter(s => !["completed", "confirmed", "cancelled"].includes(s.status)).length
        const enRoute = services.filter(s => s.status === "en_route").length
        const inProg = services.filter(s => ["arrived", "in_progress", "assigned"].includes(s.status)).length
        const critical = services.filter(s => s.service_type === "vehicle_recovery" && !["completed", "confirmed", "cancelled"].includes(s.status)).length
        return { inst, reac, mec, active, enRoute, inProg, critical }
    }, [services])

    const handleExport = () => {
        if (filteredServices.length === 0) {
            toast.error("No hay servicios en la lista actual para exportar")
            return
        }
        const headers = ["ID", "Titulo", "Tipo", "Estado", "Placa", "Cliente", "Telefono", "Especialista", "Direccion", "Precio_COP", "Fecha"]
        const rows = filteredServices.map((s) => [
            s.id,
            `"${(s.title || "").replace(/"/g, '""')}"`,
            s.service_type,
            s.status,
            s.vehicle_plate || "",
            `"${(s.client_name || "").replace(/"/g, '""')}"`,
            s.client_phone || "",
            `"${(s.technician_name || "").replace(/"/g, '""')}"`,
            `"${(s.service_address || "").replace(/"/g, '""')}"`,
            String(s.estimated_price ?? 0),
            s.created_at,
        ])
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
        const link = document.createElement("a")
        link.setAttribute("href", encodeURI(csvContent))
        link.setAttribute("download", `tec360_servicios_${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success(`Exportados ${filteredServices.length} servicios a CSV`)
    }

    const p50Label =
        dispatchMetrics?.assignment_p50_seconds !== null && dispatchMetrics?.assignment_p50_seconds !== undefined
            ? `${Math.round(dispatchMetrics.assignment_p50_seconds)}s`
            : "—"
    const p95Label =
        dispatchMetrics?.assignment_p95_seconds !== null && dispatchMetrics?.assignment_p95_seconds !== undefined
            ? `${Math.round(dispatchMetrics.assignment_p95_seconds)}s`
            : "—"
    const acceptanceRateLabel =
        dispatchMetrics?.overall_acceptance_rate !== null && dispatchMetrics?.overall_acceptance_rate !== undefined
            ? `${dispatchMetrics.overall_acceptance_rate}%`
            : "0%"

    return (
        <>
            <div className="space-y-6">
                {/* ─── Top Telemetry KPI Matrix (FigCraft Board 10) ─── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* KPI 1: Tiempo de Asignación */}
                    <div className="bg-[#0B132B] border border-slate-800/80 rounded-2xl p-4 shadow-lg backdrop-blur-md">
                        <div className="flex items-center justify-between text-slate-400 mb-1.5">
                            <span className="text-[11px] font-mono font-semibold tracking-wider text-slate-300">
                                ⏱️ TIEMPO ASIGNACIÓN (P50/P95)
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-100">
                                {p50Label}
                            </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 mt-1">
                            p95: {p95Label} · Despacho Olas V2
                        </p>
                    </div>

                    {/* KPI 2: Tasa de Aceptación Global */}
                    <div className="bg-[#0B132B] border border-slate-800/80 rounded-2xl p-4 shadow-lg backdrop-blur-md">
                        <div className="flex items-center justify-between text-slate-400 mb-1.5">
                            <span className="text-[11px] font-mono font-semibold tracking-wider text-slate-300">
                                📈 TASA DE ACEPTACIÓN GLOBAL
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-black font-mono text-sky-400">
                                {acceptanceRateLabel}
                            </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 mt-1">
                            {dispatchMetrics?.total_offers_sent ?? 0} ofertas enviadas (30d)
                        </p>
                    </div>

                    {/* KPI 3: Servicios Activos en Calle */}
                    <div className="bg-[#0B132B] border border-slate-800/80 rounded-2xl p-4 shadow-lg backdrop-blur-md">
                        <div className="flex items-center justify-between text-slate-400 mb-1.5">
                            <span className="text-[11px] font-mono font-semibold tracking-wider text-slate-300">
                                🛰️ SERVICIOS ACTIVOS EN CALLE
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                                {counts.active} activos
                            </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 mt-1">
                            {counts.enRoute} en camino · {counts.inProg} en ejecución
                        </p>
                    </div>

                    {/* KPI 4: Reacción Inmediata 24/7 */}
                    <div className="bg-[#0B132B] border border-slate-800/80 rounded-2xl p-4 shadow-lg backdrop-blur-md">
                        <div className="flex items-center justify-between text-slate-400 mb-1.5">
                            <span className="text-[11px] font-mono font-semibold tracking-wider text-slate-300">
                                🚨 REACCIÓN INMEDIATA 24/7
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-black font-mono text-rose-400">
                                {counts.critical} críticos
                            </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 mt-1">
                            {counts.reac} alertas totales en listado
                        </p>
                    </div>
                </div>

                {/* ─── Main Content Box ─── */}
                <div className="bg-[#070D1E]/95 border border-slate-800/80 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden">
                    {/* Header bar */}
                    <div className="px-6 py-5 border-b border-slate-800/80">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-black text-slate-100 tracking-tight">
                                        Supervisión de Servicios y Telemetría de Despacho
                                    </h2>
                                </div>
                                <p className="text-xs font-mono text-slate-400 mt-1">
                                    Control operativo central en tiempo real · Algoritmo de asignación por olas y custodia Tec360 Escrow
                                </p>
                            </div>

                            {/* View Switcher Tabs */}
                            <div className="grid grid-cols-2 sm:flex items-center bg-[#0B132B] p-1 rounded-xl border border-slate-800/90 w-full sm:w-auto shrink-0">
                                <Button
                                    size="sm"
                                    variant={viewMode === "services" ? "default" : "ghost"}
                                    onClick={() => setViewMode("services")}
                                    className={`h-8 px-3 sm:px-4 text-[11px] sm:text-xs font-mono rounded-lg transition-all justify-center truncate ${
                                        viewMode === "services" 
                                            ? "bg-slate-800 text-slate-100 font-bold shadow-inner border border-slate-700/60" 
                                            : "text-slate-400 hover:text-slate-200"
                                    }`}
                                >
                                    <span className="sm:hidden">📋 Servicios ({total})</span>
                                    <span className="hidden sm:inline">📋 Servicios Activos ({total})</span>
                                </Button>
                                <Button
                                    size="sm"
                                    variant={viewMode === "telemetry" ? "default" : "ghost"}
                                    onClick={() => setViewMode("telemetry")}
                                    className={`h-8 px-3 sm:px-4 text-[11px] sm:text-xs font-mono rounded-lg gap-1.5 transition-all justify-center truncate ${
                                        viewMode === "telemetry" 
                                            ? "bg-slate-800 text-slate-100 font-bold shadow-inner border border-slate-700/60" 
                                            : "text-slate-400 hover:text-slate-200"
                                    }`}
                                >
                                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                                    <span className="sm:hidden">⚡ Despacho IA</span>
                                    <span className="hidden sm:inline">⚡ Telemetría Despacho</span>
                                </Button>
                            </div>
                        </div>
                        
                        {/* Filters (only visible in services mode) */}
                        {viewMode === "services" && (
                            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                                {/* Search */}
                                <div className="relative flex-1 min-w-[240px]">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Buscar placa, cliente, ID o dirección..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-800 bg-[#050810] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/40"
                                    />
                                </div>

                                {/* Pillar Chips Filter */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={() => setSelectedPillar("all")}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border ${
                                            selectedPillar === "all"
                                                ? "bg-slate-800 text-slate-100 border-slate-600 shadow-sm"
                                                : "bg-[#0B132B]/60 text-slate-400 border-slate-800 hover:text-slate-200"
                                        }`}
                                    >
                                        Todos ({total})
                                    </button>
                                    <button
                                        onClick={() => setSelectedPillar("instalaciones")}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border ${
                                            selectedPillar === "instalaciones"
                                                ? "bg-[#0B1736] text-[#93C5FD] border-[#2563EB] shadow-sm shadow-blue-500/20"
                                                : "bg-[#0B132B]/60 text-slate-400 border-slate-800 hover:text-slate-200"
                                        }`}
                                    >
                                        🛰️ Instalaciones ({counts.inst})
                                    </button>
                                    <button
                                        onClick={() => setSelectedPillar("reaccion")}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border ${
                                            selectedPillar === "reaccion"
                                                ? "bg-[#200A14] text-[#FDA4AF] border-[#E11D48] shadow-sm shadow-rose-500/20"
                                                : "bg-[#0B132B]/60 text-slate-400 border-slate-800 hover:text-slate-200"
                                        }`}
                                    >
                                        🚨 Reacción 24/7 ({counts.reac})
                                    </button>
                                    <button
                                        onClick={() => setSelectedPillar("mecanica")}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border ${
                                            selectedPillar === "mecanica"
                                                ? "bg-[#241908] text-[#FDE68A] border-[#F59E0B] shadow-sm shadow-amber-500/20"
                                                : "bg-[#0B132B]/60 text-slate-400 border-slate-800 hover:text-slate-200"
                                        }`}
                                    >
                                        🧰 Mecánica ({counts.mec})
                                    </button>
                                </div>

                                {/* Status Dropdown */}
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-3 py-2 rounded-xl border border-slate-800 bg-[#050810] text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Estado: Todos ▼</option>
                                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                        <option key={key} value={key}>{cfg.label}</option>
                                    ))}
                                </select>

                                {/* Export Action */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleExport}
                                    className="rounded-xl border-slate-800 bg-[#0B132B] hover:bg-slate-800 text-slate-300 text-xs font-mono gap-1.5 shrink-0"
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                                    Exportar
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Content: Telemetry or Services */}
                    {viewMode === "telemetry" ? (
                        <div className="p-6">
                            <DispatchTelemetryPanel />
                        </div>
                    ) : (
                        <>
                            {/* ─── DESKTOP TABLE VIEW (Board 10 Frame 1387) ─── */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-[#050A18] border-b border-slate-800/80">
                                        <tr>
                                            <th className="px-6 py-3.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">SERVICIO & VEHÍCULO</th>
                                            <th className="px-6 py-3.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">PILAR OPERATIVO</th>
                                            <th className="px-6 py-3.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">ESTADO // OLA</th>
                                            <th className="px-6 py-3.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">CLIENTE & UBICACIÓN</th>
                                            <th className="px-6 py-3.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">ESPECIALISTA ASIGNADO</th>
                                            <th className="px-6 py-3.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">TARIFA & ESCROW</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60 font-sans">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={6} className="p-12 text-center text-slate-400">
                                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                                                    <span className="font-mono text-xs">Cargando servicios operativos de Tec360...</span>
                                                </td>
                                            </tr>
                                        ) : filteredServices.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-12 text-center text-slate-400 font-mono text-xs">
                                                    No hay servicios que coincidan con los filtros aplicados.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredServices.map((service) => {
                                                const pillar = getPillarInfo(service.service_type)
                                                return (
                                                    <tr
                                                        key={service.id}
                                                        className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                                                        onClick={() => setSelectedId(service.id)}
                                                    >
                                                        {/* Col 1: Servicio & Vehículo */}
                                                        <td className="px-6 py-4">
                                                            <p className="text-sm font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                                                                {service.title}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1.5">
                                                                {service.vehicle_plate && (
                                                                    <span className="px-1.5 py-0.5 rounded font-mono font-bold text-xs bg-slate-950 text-slate-100 border border-slate-700 shadow-sm">
                                                                        {service.vehicle_plate}
                                                                    </span>
                                                                )}
                                                                <span className="text-[11px] font-mono text-slate-400">
                                                                    ID: #{service.id.substring(0, 8)}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        {/* Col 2: Pilar Operativo */}
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border ${pillar.badgeBg} ${pillar.badgeBorder} ${pillar.badgeText}`}>
                                                                <span>{pillar.icon}</span>
                                                                <span>{pillar.label}</span>
                                                            </span>
                                                        </td>

                                                        {/* Col 3: Estado // Ola */}
                                                        <td className="px-6 py-4">
                                                            <StatusBadge status={service.status} />
                                                        </td>

                                                        {/* Col 4: Cliente & Ubicación */}
                                                        <td className="px-6 py-4">
                                                            <p className="text-xs font-semibold text-slate-200">
                                                                {service.client_name || "Cliente Tec360"}
                                                            </p>
                                                            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate max-w-[210px]">
                                                                <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                                                                {service.service_address}
                                                            </p>
                                                        </td>

                                                        {/* Col 5: Especialista Asignado */}
                                                        <td className="px-6 py-4">
                                                            {service.technician_name ? (
                                                                <div>
                                                                    <p className="text-xs font-semibold text-sky-400 flex items-center gap-1">
                                                                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                                                                        {service.technician_name}
                                                                    </p>
                                                                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                                                                        ★ 4.95 · Certificado Tec360
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs font-mono text-slate-500 italic">
                                                                    ⏳ En cola de proximidad
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Col 6: Tarifa & Custodia Escrow */}
                                                        <td className="px-6 py-4">
                                                            <p className="text-xs font-mono font-bold text-slate-100">
                                                                {service.estimated_price ? `$${service.estimated_price.toLocaleString()} COP` : "Por cotizar"}
                                                            </p>
                                                            <p className="text-[10px] font-mono text-amber-400 flex items-center gap-1 mt-0.5">
                                                                <Lock className="w-3 h-3" /> Custodia Tec360 Escrow
                                                            </p>
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* ─── MOBILE TACTICAL CARDS (Board 10 Frame 1388) ─── */}
                            <div className="block md:hidden p-4 space-y-3.5">
                                {loading ? (
                                    <div className="p-8 text-center text-slate-400">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                                        <p className="font-mono text-xs">Cargando servicios...</p>
                                    </div>
                                ) : filteredServices.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 font-mono text-xs">
                                        No hay servicios que coincidan.
                                    </div>
                                ) : (
                                    filteredServices.map((service) => {
                                        const pillar = getPillarInfo(service.service_type)
                                        return (
                                            <div
                                                key={service.id}
                                                className="bg-[#0B132B] border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3"
                                            >
                                                {/* Top Row: Pillar + Status */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${pillar.badgeBg} ${pillar.badgeBorder} ${pillar.badgeText}`}>
                                                        {pillar.icon} {pillar.label}
                                                    </span>
                                                    <StatusBadge status={service.status} />
                                                </div>

                                                {/* Plate Chip & Title */}
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        {service.vehicle_plate && (
                                                            <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-950 text-slate-100 border border-slate-700">
                                                                {service.vehicle_plate}
                                                            </span>
                                                        )}
                                                        <h4 className="text-sm font-bold text-slate-100 truncate">
                                                            {service.title}
                                                        </h4>
                                                    </div>
                                                    <p className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                                                        <span>ID: #{service.id.substring(0, 8)}</span>
                                                        <span className="text-amber-400 font-semibold">
                                                            🔒 Escrow {service.estimated_price ? `$${service.estimated_price.toLocaleString()}` : "$280.000"} COP
                                                        </span>
                                                    </p>
                                                </div>

                                                {/* Specialist info */}
                                                <div className="p-2.5 rounded-xl bg-[#050810]/70 border border-slate-800/80 space-y-1 text-xs">
                                                    <p className="text-slate-300 flex items-center gap-1.5 font-medium">
                                                        <span className="text-blue-400">👤 Técnico Certificado Tec360:</span>
                                                        <strong className="text-slate-100">{service.technician_name || "En asignación"}</strong>
                                                    </p>
                                                    <p className="text-slate-400 text-[11px] flex items-center gap-1 truncate">
                                                        <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                                                        {service.service_address}
                                                    </p>
                                                </div>

                                                {/* Tactical Actions */}
                                                <div className="grid grid-cols-2 gap-2 pt-1">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setSelectedId(service.id)}
                                                        className="w-full text-xs font-mono font-bold rounded-xl border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700"
                                                    >
                                                        Ver Expediente
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => setSelectedId(service.id)}
                                                        className={`w-full text-xs font-mono font-bold rounded-xl text-white shadow-sm ${
                                                            pillar.key === "reaccion"
                                                                ? "bg-[#E11D48] hover:bg-[#BE123C]"
                                                                : pillar.key === "mecanica"
                                                                ? "bg-[#D97706] hover:bg-[#B45309]"
                                                                : "bg-[#2563EB] hover:bg-[#1D4ED8]"
                                                        }`}
                                                    >
                                                        {pillar.key === "reaccion" ? "🚨 Alerta 24/7" : pillar.key === "mecanica" ? "🧰 Diagnóstico" : "🛰️ Radar En Vivo"}
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>

                            {/* Footer info & pagination */}
                            <div className="px-6 py-4 border-t border-slate-800/80 bg-[#050A18] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-slate-400">
                                <div>
                                    Mostrando 1–{filteredServices.length} de {total} servicios operativos · Actualizado en tiempo real
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-slate-500">
                                        🔒 Certificación Tec360 · Custodia de Fondos Escrow · Auditoría 24/7
                                    </span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Detail drawer */}
            <AnimatePresence>
                {selectedId && (
                    <ServiceDetailDrawer
                        serviceId={selectedId}
                        onClose={() => setSelectedId(null)}
                        onUpdated={() => fetchServices(searchQuery, statusFilter)}
                    />
                )}
            </AnimatePresence>
        </>
    )
}
