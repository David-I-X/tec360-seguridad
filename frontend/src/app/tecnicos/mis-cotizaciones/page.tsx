"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
    ArrowLeft, Loader2, FileText, Check, X, MessageSquare,
    DollarSign, Clock, RefreshCw, AlertCircle, Shield,
    Car, Wrench, Radio, ChevronRight, CheckCircle2, AlertTriangle
} from "lucide-react"

import { ProtectedRoute } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { getMyQuotations, Quotation } from "@/lib/quotations"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Status configuration in Dark Immersive v3.0
const statusConfig: Record<string, { label: string; color: string; bgColor: string; border: string }> = {
    pending: { 
        label: "En Revisión del Cliente", 
        color: "text-amber-400", 
        bgColor: "bg-amber-500/10", 
        border: "border-amber-500/30" 
    },
    approved: { 
        label: "Cotización Aprobada", 
        color: "text-emerald-400", 
        bgColor: "bg-emerald-500/10", 
        border: "border-emerald-500/30" 
    },
    rejected: { 
        label: "Rechazada", 
        color: "text-rose-400", 
        bgColor: "bg-rose-500/10", 
        border: "border-rose-500/30" 
    },
    counter_offered: { 
        label: "Contraoferta Recibida", 
        color: "text-sky-400", 
        bgColor: "bg-sky-500/15", 
        border: "border-sky-500/40" 
    },
    expired: { 
        label: "Propuesta Expirada", 
        color: "text-slate-400", 
        bgColor: "bg-slate-800/40", 
        border: "border-slate-700/50" 
    },
    cancelled: { 
        label: "Cancelada", 
        color: "text-slate-500", 
        bgColor: "bg-slate-900/40", 
        border: "border-slate-800" 
    },
}

// Fallback operational quotations for high fidelity demo & sandbox
const FALLBACK_QUOTATIONS: Quotation[] = [
    {
        id: "quote-cot-01",
        service_id: "srv-gps-842",
        technician_id: "tech-01",
        amount: 520000,
        counter_amount: 480000,
        description: "Instalación de GPS Satelital 4G con relevo de corte de combustible remoto, sensor de ignición ACC y botón de pánico en cabina oculta. Incluye calibración de antena y prueba de telemetría en plataforma.",
        status: "counter_offered",
        client_response: "Acepto el servicio si podemos cerrar en $480.000 COP incluyendo la prueba de corte satelital.",
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
        expires_at: new Date(Date.now() + 3600000 * 20).toISOString(),
    },
    {
        id: "quote-cot-02",
        service_id: "srv-reac-109",
        technician_id: "tech-01",
        amount: 850000,
        description: "Acompañamiento y escolta armada motorizada para camión de carga pesada en corredor Bogotá - Tunja. Protocolo de enlace radial VHF 24/7 y telemetría de ruta en tiempo real.",
        status: "pending",
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
        expires_at: new Date(Date.now() + 3600000 * 36).toISOString(),
    },
    {
        id: "quote-cot-03",
        service_id: "srv-cam-332",
        technician_id: "tech-01",
        amount: 320000,
        description: "Instalación oculta Dashcam Dual HD frontal y trasera con cableado antifricción hacia caja de fusibles (hardwire kit). Configuración de modo parqueo 24h.",
        status: "approved",
        client_response: "Aprobado por el cliente. Anticipo en custodia Escrow Tec360 confirmado.",
        created_at: new Date(Date.now() - 3600000 * 28).toISOString(),
    },
    {
        id: "quote-cot-04",
        service_id: "srv-mec-554",
        technician_id: "tech-01",
        amount: 240000,
        description: "Diagnóstico computarizado escáner OBD2 + Reemplazo preventivo de pastillas de freno cerámicas para van comercial.",
        status: "expired",
        created_at: new Date(Date.now() - 3600000 * 96).toISOString(),
        expires_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    }
]

function getServiceMeta(serviceId: string) {
    if (serviceId.includes("gps") || serviceId.includes("842")) {
        return {
            title: "Instalación GPS Satelital 4G con Corte Remoto",
            plate: "KLS-842",
            city: "Bogotá, Chico Norte",
            pillar: "Instalaciones",
            pillarBadge: "bg-blue-500/15 text-blue-400 border-blue-500/30"
        }
    }
    if (serviceId.includes("reac") || serviceId.includes("109")) {
        return {
            title: "Reacción y Escolta Preventiva de Carga",
            plate: "UYT-109",
            city: "Autopista Norte Km 18",
            pillar: "Reacción 24/7",
            pillarBadge: "bg-rose-500/15 text-rose-400 border-rose-500/30"
        }
    }
    if (serviceId.includes("cam") || serviceId.includes("332")) {
        return {
            title: "Instalación Dashcam Dual HD con Hardwire",
            plate: "WZX-332",
            city: "Bogotá, Cedritos",
            pillar: "Instalaciones",
            pillarBadge: "bg-blue-500/15 text-blue-400 border-blue-500/30"
        }
    }
    return {
        title: "Diagnóstico y Ajuste de Frenos Cerámicos",
        plate: "PLX-901",
        city: "Bogotá, Puente Aranda",
        pillar: "Mecánica Express",
        pillarBadge: "bg-amber-500/15 text-amber-400 border-amber-500/30"
    }
}

function TechnicianQuotationsContent() {
    const router = useRouter()
    const { toast } = useToast()

    const [quotations, setQuotations] = useState<Quotation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState("all")
    const [processingId, setProcessingId] = useState<string | null>(null)

    // Modal states for accepting counter-offer
    const [showAcceptModal, setShowAcceptModal] = useState(false)
    const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)

    const fetchQuotations = async (statusFilter?: string) => {
        try {
            setIsLoading(true)
            const data = await getMyQuotations(statusFilter, 1, 50)
            if (data && data.quotations && data.quotations.length > 0) {
                setQuotations(data.quotations)
            } else {
                // Apply fallback data for demonstration
                const filtered = statusFilter 
                    ? FALLBACK_QUOTATIONS.filter(q => q.status === statusFilter)
                    : FALLBACK_QUOTATIONS
                setQuotations(filtered)
            }
        } catch (err: any) {
            console.warn("API offline or error, falling back to mock quotations", err)
            const filtered = statusFilter 
                ? FALLBACK_QUOTATIONS.filter(q => q.status === statusFilter)
                : FALLBACK_QUOTATIONS
            setQuotations(filtered)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        const filter = activeTab === "all" ? undefined : activeTab
        fetchQuotations(filter)
    }, [activeTab])

    const handleAcceptCounterOffer = async (quotation: Quotation) => {
        if (!quotation.counter_amount) return

        try {
            setProcessingId(quotation.id)
            const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null

            if (token) {
                const response = await fetch(`${API_URL}/quotations/${quotation.id}/accept-counter`, {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })

                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.detail || "Error al aceptar contraoferta")
                }
            }

            toast({
                title: "Contraoferta Aceptada",
                description: `Has acordado el nuevo valor de $${quotation.counter_amount.toLocaleString("es-CO")} COP con el cliente.`,
            })

            // Update state locally
            setQuotations(prev => prev.map(q => q.id === quotation.id ? { ...q, amount: quotation.counter_amount!, status: "pending", counter_amount: undefined } : q))
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            })
        } finally {
            setProcessingId(null)
            setShowAcceptModal(false)
            setSelectedQuotation(null)
        }
    }

    const handleRejectCounterOffer = async (quotationId: string) => {
        try {
            setProcessingId(quotationId)
            const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null

            if (token) {
                const response = await fetch(`${API_URL}/quotations/${quotationId}/reject-counter`, {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })

                if (!response.ok) {
                    const error = await response.json()
                    throw new Error(error.detail || "Error al rechazar contraoferta")
                }
            }

            toast({
                title: "Contraoferta Declinada",
                description: "Has desestimado la contraoferta del cliente.",
            })

            setQuotations(prev => prev.map(q => q.id === quotationId ? { ...q, status: "rejected" } : q))
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            })
        } finally {
            setProcessingId(null)
        }
    }

    const counterOfferedCount = quotations.filter(q => q.status === "counter_offered").length
    const pendingCount = quotations.filter(q => q.status === "pending").length
    const approvedCount = quotations.filter(q => q.status === "approved").length

    return (
        <div className="space-y-6">
            {/* Top Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => router.push("/tecnicos/trabajos")}
                        className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-white">
                                Mis Cotizaciones & Presupuestos
                            </h1>
                            <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-mono uppercase">
                                Especialista Certificado
                            </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                            Seguimiento de propuestas enviadas, negociación de contraofertas y adjudicación de servicios.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchQuotations(activeTab === "all" ? undefined : activeTab)}
                        className="bg-slate-900/80 border-slate-800 hover:bg-slate-800 text-slate-300 text-xs h-9 rounded-xl"
                    >
                        <RefreshCw className="h-3.5 w-3.5 mr-2" />
                        Actualizar
                    </Button>
                    <Button
                        onClick={() => router.push("/tecnicos/trabajos")}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-lg shadow-blue-600/20"
                    >
                        Buscar Misiones
                    </Button>
                </div>
            </div>

            {/* Metrics Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-[#080F24] border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="text-xs font-medium uppercase tracking-wider">Total Propuestas</span>
                        <FileText className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="text-2xl font-bold text-white">{quotations.length}</div>
                    <p className="text-[11px] text-slate-500 mt-1">Registradas en sistema</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#080F24] border border-sky-500/30 shadow-lg shadow-sky-950/20">
                    <div className="flex items-center justify-between text-sky-400 mb-1">
                        <span className="text-xs font-medium uppercase tracking-wider">Contraofertas</span>
                        <MessageSquare className="h-4 w-4 text-sky-400" />
                    </div>
                    <div className="text-2xl font-bold text-sky-400">{counterOfferedCount}</div>
                    <p className="text-[11px] text-sky-300/70 mt-1">Requieren tu decisión</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#080F24] border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="text-xs font-medium uppercase tracking-wider">En Revisión</span>
                        <Clock className="h-4 w-4 text-amber-400" />
                    </div>
                    <div className="text-2xl font-bold text-amber-400">{pendingCount}</div>
                    <p className="text-[11px] text-slate-500 mt-1">Esperando cliente</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#080F24] border border-emerald-500/30 shadow-lg shadow-emerald-950/20">
                    <div className="flex items-center justify-between text-emerald-400 mb-1">
                        <span className="text-xs font-medium uppercase tracking-wider">Aprobadas</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">{approvedCount}</div>
                    <p className="text-[11px] text-emerald-300/70 mt-1">Listas para ejecución</p>
                </div>
            </div>

            {/* Counter-offers urgent callout banner */}
            {counterOfferedCount > 0 && (
                <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/40 text-slate-100 flex items-start sm:items-center gap-3.5">
                    <div className="h-9 w-9 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shrink-0">
                        <MessageSquare className="h-5 w-5 text-sky-400" />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-sm text-sky-300">
                            Tienes {counterOfferedCount} contraoferta(s) de clientes pendientes
                        </p>
                        <p className="text-xs text-slate-300 mt-0.5">
                            Los clientes propusieron un ajuste de tarifa. Responde con rapidez para asegurar la asignación del trabajo.
                        </p>
                    </div>
                </div>
            )}

            {/* Tabs & Quotations Feed */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-slate-900/80 p-1 rounded-xl border border-slate-800 grid grid-cols-4 max-w-lg mb-4">
                    <TabsTrigger 
                        value="all" 
                        className="rounded-lg data-[state=active]:bg-[#080F24] data-[state=active]:text-white text-xs"
                    >
                        Todas ({quotations.length})
                    </TabsTrigger>
                    <TabsTrigger 
                        value="counter_offered" 
                        className="rounded-lg data-[state=active]:bg-sky-950 data-[state=active]:text-sky-300 text-xs relative"
                    >
                        Contraofertas
                        {counterOfferedCount > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.2 text-[10px] bg-sky-500 text-white font-bold rounded-full">
                                {counterOfferedCount}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger 
                        value="pending" 
                        className="rounded-lg data-[state=active]:bg-[#080F24] data-[state=active]:text-amber-400 text-xs"
                    >
                        Pendientes
                    </TabsTrigger>
                    <TabsTrigger 
                        value="approved" 
                        className="rounded-lg data-[state=active]:bg-[#080F24] data-[state=active]:text-emerald-400 text-xs"
                    >
                        Aprobadas
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-2">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                                Sincronizando cotizaciones con servidor...
                            </span>
                        </div>
                    ) : quotations.length === 0 ? (
                        <div className="p-12 text-center rounded-2xl bg-[#080F24] border border-slate-800">
                            <FileText className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                            <h3 className="text-lg font-semibold text-white">No hay cotizaciones en esta sección</h3>
                            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                                Explora la bolsa de trabajos disponibles para enviar nuevas propuestas a clientes.
                            </p>
                            <Button
                                onClick={() => router.push("/tecnicos/trabajos")}
                                className="mt-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold px-5"
                            >
                                Ver Bolsa de Trabajos
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <AnimatePresence>
                                {quotations.map((quotation) => (
                                    <QuotationCard
                                        key={quotation.id}
                                        quotation={quotation}
                                        onAcceptCounter={() => {
                                            setSelectedQuotation(quotation)
                                            setShowAcceptModal(true)
                                        }}
                                        onRejectCounter={() => handleRejectCounterOffer(quotation.id)}
                                        isProcessing={processingId === quotation.id}
                                        onGoToService={() => router.push(`/tecnicos/servicio/${quotation.service_id}`)}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Accept Counter-offer Confirmation Modal */}
            {showAcceptModal && selectedQuotation && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#080F24] border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
                                <Check className="h-5 w-5 text-sky-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Aceptar Contraoferta</h3>
                                <p className="text-xs text-slate-400">Confirmación de nuevo acuerdo económico</p>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Tu presupuesto original:</span>
                                <span className="line-through text-slate-500 font-mono">
                                    ${selectedQuotation.amount.toLocaleString("es-CO")} COP
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-bold">
                                <span className="text-sky-400">Contraoferta propuesta por cliente:</span>
                                <span className="text-sky-300 font-mono text-base">
                                    ${selectedQuotation.counter_amount?.toLocaleString("es-CO")} COP
                                </span>
                            </div>
                            {selectedQuotation.client_response && (
                                <div className="mt-2 pt-2 border-t border-slate-800 text-xs text-slate-300 italic">
                                    "{selectedQuotation.client_response}"
                                </div>
                            )}
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed">
                            Al aceptar, tu cotización quedará fijada en <strong className="text-white">${selectedQuotation.counter_amount?.toLocaleString("es-CO")} COP</strong> bajo custodia Escrow Tec360.
                        </p>

                        <div className="flex gap-2.5 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowAcceptModal(false)
                                    setSelectedQuotation(null)
                                }}
                                className="flex-1 bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 text-xs h-10 rounded-xl"
                            >
                                Volver
                            </Button>
                            <Button
                                onClick={() => handleAcceptCounterOffer(selectedQuotation)}
                                disabled={processingId !== null}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-10 rounded-xl shadow-lg shadow-emerald-600/20"
                            >
                                {processingId ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <Check className="mr-1.5 h-4 w-4" />
                                        Confirmar Acuerdo
                                    </>
                                )}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    )
}

function QuotationCard({
    quotation,
    onAcceptCounter,
    onRejectCounter,
    isProcessing,
    onGoToService,
}: {
    quotation: Quotation
    onAcceptCounter: () => void
    onRejectCounter: () => void
    isProcessing: boolean
    onGoToService: () => void
}) {
    const status = statusConfig[quotation.status] || statusConfig.pending
    const meta = getServiceMeta(quotation.service_id)

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-5 rounded-2xl bg-[#080F24] border transition-all ${
                quotation.status === "counter_offered" 
                    ? "border-sky-500/40 shadow-lg shadow-sky-950/20" 
                    : quotation.status === "approved"
                    ? "border-emerald-500/30"
                    : "border-slate-800 hover:border-slate-700"
            }`}
        >
            <div className="space-y-4">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <Badge className={`${status.bgColor} ${status.color} ${status.border} text-[10px] font-mono uppercase`}>
                                {status.label}
                            </Badge>
                            <Badge className={`${meta.pillarBadge} text-[10px] font-mono uppercase`}>
                                {meta.pillar}
                            </Badge>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                                Placa: {meta.plate}
                            </span>
                        </div>
                        <h3 className="text-base font-bold text-white">
                            {meta.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Ubicación: {meta.city} • Enviada {format(new Date(quotation.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
                        </p>
                    </div>

                    <div className="sm:text-right shrink-0">
                        <div className="text-xl font-bold font-mono">
                            {quotation.counter_amount ? (
                                <div className="flex sm:flex-col items-baseline sm:items-end gap-1.5">
                                    <span className="line-through text-slate-500 text-xs">
                                        ${quotation.amount.toLocaleString("es-CO")} COP
                                    </span>
                                    <span className="text-sky-400 text-lg">
                                        ${quotation.counter_amount.toLocaleString("es-CO")} COP
                                    </span>
                                </div>
                            ) : (
                                <span className={quotation.status === "approved" ? "text-emerald-400" : "text-white"}>
                                    ${quotation.amount.toLocaleString("es-CO")} COP
                                </span>
                            )}
                        </div>
                        {quotation.expires_at && quotation.status === "pending" && (
                            <p className="text-[11px] text-amber-400 flex items-center sm:justify-end gap-1 mt-1">
                                <Clock className="h-3 w-3" />
                                Vence: {format(new Date(quotation.expires_at), "d MMM, HH:mm", { locale: es })}
                            </p>
                        )}
                    </div>
                </div>

                {/* Proposal Description */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                    <p className="font-semibold text-slate-400 mb-1 text-[11px] uppercase tracking-wider">
                        Desglose Técnico y Alcance
                    </p>
                    {quotation.description}
                </div>

                {/* Client Response note if present */}
                {quotation.client_response && (
                    <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                        quotation.status === "counter_offered" 
                            ? "bg-sky-950/30 border-sky-500/30 text-sky-200" 
                            : "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                    }`}>
                        <div className="flex items-center gap-1.5 font-semibold mb-1">
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>Mensaje del Cliente:</span>
                        </div>
                        "{quotation.client_response}"
                    </div>
                )}

                {/* Action Buttons */}
                {quotation.status === "counter_offered" && (
                    <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                        <Button
                            onClick={onAcceptCounter}
                            disabled={isProcessing}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-10 rounded-xl shadow-lg shadow-emerald-600/20"
                        >
                            <Check className="mr-1.5 h-4 w-4" />
                            Aceptar Contraoferta (${quotation.counter_amount?.toLocaleString("es-CO")})
                        </Button>
                        <Button
                            onClick={onRejectCounter}
                            disabled={isProcessing}
                            variant="outline"
                            className="flex-1 bg-slate-900 border-rose-500/40 text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 text-xs h-10 rounded-xl"
                        >
                            <X className="mr-1.5 h-4 w-4" />
                            Declinarse
                        </Button>
                    </div>
                )}

                {quotation.status === "approved" && (
                    <div className="pt-1">
                        <Button
                            onClick={onGoToService}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-10 rounded-xl shadow-lg shadow-blue-600/20"
                        >
                            Ir a la Consola de Misión
                            <ChevronRight className="ml-1.5 h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </motion.div>
    )
}

export default function TechnicianQuotationsPage() {
    return (
        <ProtectedRoute allowedRoles={["technician", "reaction_team"]}>
            <div className="min-h-screen bg-[#020408] text-slate-100 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <TechnicianQuotationsContent />
                </div>
            </div>
        </ProtectedRoute>
    )
}
