"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
    ShieldAlert, MapPin, CalendarClock, User, X,
    Camera, DollarSign, Phone, CheckCircle, Clock, Loader2
} from "lucide-react"
import { toast } from "react-hot-toast"
import api from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { es } from "date-fns/locale"

/* ─── Types ──────────────────────────────────────── */
interface AdminService {
    id: string
    title: string
    service_type: string
    status: string
    service_address: string
    client_id: string
    technician_id: string | null
    created_at: string
}

interface ServiceDetail extends AdminService {
    description?: string
    estimated_price?: number
    scheduled_date?: string
    service_city?: string
    client?: { full_name?: string; phone?: string; email?: string }
    technician?: { full_name?: string; phone?: string; average_rating?: number }
}

interface ServicePhoto {
    id: string
    image_url: string
    image_type: "before" | "during" | "after"
    created_at: string
}

/* ─── Status helpers ─────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: "Pendiente", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
    assigned: { label: "Asignado", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
    en_route: { label: "En camino", color: "text-sky-400", bg: "bg-sky-400/10 border-sky-400/20" },
    arrived: { label: "Llegó", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20" },
    in_progress: { label: "En progreso", color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20" },
    completed: { label: "Completado", color: "text-green-400", bg: "bg-green-400/10 border-green-400/20" },
    cancelled: { label: "Cancelado", color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
    quoted: { label: "Cotizado", color: "text-cyan-400", bg: "bg-cyan-400/10 border-cyan-400/20" },
}

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] || { label: status, color: "text-muted-foreground", bg: "bg-muted/20 border-border/30" }
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.bg}`}>
            {cfg.label.toUpperCase()}
        </span>
    )
}

/* ─── Photo stage labels ─────────────────────────── */
const PHOTO_LABELS: Record<string, { label: string; emoji: string }> = {
    before: { label: "Antes del trabajo", emoji: "📷" },
    during: { label: "Durante el trabajo", emoji: "🔧" },
    after: { label: "Trabajo finalizado", emoji: "✅" },
}

/* ─── Detail drawer ──────────────────────────────── */
function ServiceDetailDrawer({
    serviceId,
    onClose,
}: {
    serviceId: string
    onClose: () => void
}) {
    const [detail, setDetail] = useState<ServiceDetail | null>(null)
    const [photos, setPhotos] = useState<ServicePhoto[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true)
            try {
                const [detailRes, photoRes] = await Promise.allSettled([
                    api.get(`/admin/services/${serviceId}`),
                    api.get(`/uploads/service-photos/${serviceId}`),
                ])
                if (detailRes.status === "fulfilled") setDetail(detailRes.value.data)
                if (photoRes.status === "fulfilled") setPhotos(photoRes.value.data.photos || [])
            } catch {
                toast.error("Error cargando detalle")
            } finally {
                setLoading(false)
            }
        }
        fetchAll()
    }, [serviceId])

    const PHOTO_ORDER: Array<"before" | "during" | "after"> = ["before", "during", "after"]

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Drawer */}
            <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 280 }}
                className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-background border-l border-border/40 shadow-2xl overflow-y-auto"
            >
                {/* Header */}
                <div className="sticky top-0 bg-background/95 backdrop-blur border-b border-border/30 px-6 py-4 flex items-center gap-3 z-10">
                    <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
                        <X className="w-5 h-5" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-base truncate">{detail?.title || "Detalle del servicio"}</h2>
                        <p className="text-xs text-muted-foreground">{serviceId.substring(0, 16)}...</p>
                    </div>
                    {detail?.status && <StatusBadge status={detail.status} />}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : !detail ? (
                    <div className="p-8 text-center text-muted-foreground">No se pudo cargar el servicio</div>
                ) : (
                    <div className="p-6 space-y-6">

                        {/* ─── General info ─────────────────── */}
                        <section className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Información General</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-muted/20 rounded-xl p-3 border border-border/20">
                                    <p className="text-[10px] text-muted-foreground mb-1">Tipo de servicio</p>
                                    <p className="text-sm font-semibold capitalize">{detail.service_type?.replace("_", " ") || "—"}</p>
                                </div>
                                <div className="bg-muted/20 rounded-xl p-3 border border-border/20">
                                    <p className="text-[10px] text-muted-foreground mb-1">Precio</p>
                                    <p className="text-sm font-bold text-green-400">
                                        {detail.estimated_price ? `$${detail.estimated_price.toLocaleString()}` : "Sin cotizar"}
                                    </p>
                                </div>
                                <div className="bg-muted/20 rounded-xl p-3 border border-border/20 col-span-2">
                                    <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> Dirección
                                    </p>
                                    <p className="text-sm font-medium">{detail.service_address}</p>
                                    {detail.service_city && <p className="text-xs text-muted-foreground">{detail.service_city}</p>}
                                </div>
                                {detail.scheduled_date && (
                                    <div className="bg-muted/20 rounded-xl p-3 border border-border/20 col-span-2">
                                        <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> Fecha programada
                                        </p>
                                        <p className="text-sm font-medium">
                                            {format(new Date(detail.scheduled_date), "PPP 'a las' p", { locale: es })}
                                        </p>
                                    </div>
                                )}
                                <div className="bg-muted/20 rounded-xl p-3 border border-border/20">
                                    <p className="text-[10px] text-muted-foreground mb-1">Creado</p>
                                    <p className="text-xs font-medium">
                                        {format(new Date(detail.created_at), "dd MMM yyyy", { locale: es })}
                                    </p>
                                </div>
                            </div>
                            {detail.description && (
                                <div className="bg-muted/20 rounded-xl p-3 border border-border/20">
                                    <p className="text-[10px] text-muted-foreground mb-1">Descripción</p>
                                    <p className="text-sm text-muted-foreground">{detail.description}</p>
                                </div>
                            )}
                        </section>

                        {/* ─── Client & Technician ──────────── */}
                        <section className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Personas</h3>
                            <div className="grid gap-3">
                                {/* Client */}
                                <div className="flex items-center gap-3 bg-muted/20 rounded-xl p-3 border border-border/20">
                                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                                        <User className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-muted-foreground">Cliente</p>
                                        <p className="text-sm font-semibold truncate">
                                            {detail.client?.full_name || detail.client_id.substring(0, 12) + "..."}
                                        </p>
                                        {detail.client?.phone && (
                                            <a href={`tel:${detail.client.phone}`} className="text-xs text-blue-400 flex items-center gap-1">
                                                <Phone className="w-3 h-3" /> {detail.client.phone}
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Technician */}
                                {detail.technician_id ? (
                                    <div className="flex items-center gap-3 bg-muted/20 rounded-xl p-3 border border-border/20">
                                        <div className="w-9 h-9 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
                                            <CheckCircle className="w-4 h-4 text-green-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-muted-foreground">Técnico</p>
                                            <p className="text-sm font-semibold truncate">
                                                {detail.technician?.full_name || detail.technician_id.substring(0, 12) + "..."}
                                            </p>
                                            {detail.technician?.phone && (
                                                <a href={`tel:${detail.technician.phone}`} className="text-xs text-green-400 flex items-center gap-1">
                                                    <Phone className="w-3 h-3" /> {detail.technician.phone}
                                                </a>
                                            )}
                                        </div>
                                        {detail.technician?.average_rating && (
                                            <div className="text-right shrink-0">
                                                <p className="text-xs font-bold text-amber-400">⭐ {detail.technician.average_rating.toFixed(1)}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-muted/10 rounded-xl p-3 border border-border/20 text-center">
                                        <p className="text-xs text-muted-foreground">Sin técnico asignado</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* ─── Photo evidence ───────────────── */}
                        <section className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <Camera className="w-3.5 h-3.5" />
                                Evidencias fotográficas ({photos.length}/3)
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                                {PHOTO_ORDER.map((photoType) => {
                                    const photo = photos.find(p => p.image_type === photoType)
                                    const meta = PHOTO_LABELS[photoType]
                                    return (
                                        <div key={photoType} className="flex flex-col gap-1.5">
                                            <div
                                                className={`relative aspect-square rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${photo
                                                    ? "border-green-500/50 hover:border-green-400"
                                                    : "border-border/30 bg-muted/10"
                                                    }`}
                                                onClick={() => photo && setSelectedPhoto(
                                                    photo.image_url.startsWith("/")
                                                        ? `${API_URL}${photo.image_url}`
                                                        : photo.image_url
                                                )}
                                            >
                                                {photo ? (
                                                    <>
                                                        <img
                                                            src={photo.image_url.startsWith("/") ? `${API_URL}${photo.image_url}` : photo.image_url}
                                                            alt={meta.label}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                                            <CheckCircle className="w-3 h-3 text-white" />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                                                        <span className="text-xl">{meta.emoji}</span>
                                                        <p className="text-[9px] text-muted-foreground/50 text-center px-1">Sin foto</p>
                                                    </div>
                                                )}
                                            </div>
                                            <p className={`text-[10px] text-center font-medium leading-tight ${photo ? "text-green-400" : "text-muted-foreground/50"}`}>
                                                {meta.label}
                                            </p>
                                        </div>
                                    )
                                })}
                            </div>
                            {photos.length === 3 && (
                                <p className="text-xs text-green-400 text-center font-medium">✅ Todas las evidencias capturadas</p>
                            )}
                        </section>
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
                        className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
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
                            alt="Evidencia"
                            className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
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

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const response = await api.get("/admin/services?limit=100")
                setServices(response.data.items)
                setTotal(response.data.total)
            } catch {
                toast.error("Error al cargar servicios")
            } finally {
                setLoading(false)
            }
        }
        fetchServices()
    }, [])

    return (
        <>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-primary" /> Gestión de Servicios
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Haz clic en una fila para ver el detalle completo con fotos de evidencia.
                        </p>
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">{total} total</span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Servicio</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden md:table-cell">Cliente / Técnico</th>
                                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 hidden sm:table-cell">Fecha</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-500">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    Cargando servicios...
                                </td></tr>
                            ) : services.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-500">No hay servicios registrados</td></tr>
                            ) : (
                                services.map((service) => (
                                    <tr
                                        key={service.id}
                                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                                        onClick={() => setSelectedId(service.id)}
                                    >
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-semibold group-hover:text-primary transition-colors">{service.title}</p>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                                <span className="capitalize">{service.service_type?.replace("_", " ")}</span>
                                                <span className="text-slate-300">·</span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {service.service_address.substring(0, 28)}...
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={service.status} />
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <div className="space-y-0.5">
                                                <p className="text-xs flex items-center gap-1 text-slate-500">
                                                    <User className="w-3 h-3 text-slate-400" />
                                                    {service.client_id.substring(0, 10)}...
                                                </p>
                                                {service.technician_id ? (
                                                    <p className="text-xs flex items-center gap-1 text-primary">
                                                        <CheckCircle className="w-3 h-3" />
                                                        {service.technician_id.substring(0, 10)}...
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-slate-400 italic">Sin técnico</p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden sm:table-cell">
                                            <span className="text-xs text-slate-500 flex items-center gap-1">
                                                <CalendarClock className="w-3.5 h-3.5" />
                                                {new Date(service.created_at).toLocaleDateString("es-CO")}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    <p className="text-xs text-slate-500 font-medium">Mostrando {services.length} de {total} servicios</p>
                </div>
            </div>

            {/* Detail drawer */}
            <AnimatePresence>
                {selectedId && (
                    <ServiceDetailDrawer
                        serviceId={selectedId}
                        onClose={() => setSelectedId(null)}
                    />
                )}
            </AnimatePresence>
        </>
    )
}
