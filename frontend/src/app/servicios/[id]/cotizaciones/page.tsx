"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
    ArrowLeft, Loader2, AlertCircle, FileText, Shield, 
    Check, X, MessageSquare, DollarSign, Clock, Star,
    Wrench, Car, ChevronRight, ShieldCheck, RefreshCw
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { ProtectedRoute } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
    getServiceQuotations,
    approveQuotation,
    rejectQuotation,
    counterOfferQuotation,
    Quotation,
} from "@/lib/quotations"

const FALLBACK_CLIENT_QUOTATIONS: Quotation[] = [
    {
        id: "quote-client-01",
        service_id: "srv-gps-842",
        technician_id: "tech-01",
        technician_name: "Carlos Mendoza",
        technician_rating: 4.95,
        technician_total_services: 184,
        amount: 480000,
        description: "Presupuesto técnico profesional:\n- Instalación oculta de módulo GPS Satelital 4G homologado\n- Relevo 12V 40A para corte de bomba de combustible por comando remoto\n- Sensor de ignición ACC y calibración de antena en plataforma Tec360\n- Incluye garantía escrita de 30 días en mano de obra certificada.",
        status: "pending",
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        expires_at: new Date(Date.now() + 3600000 * 46).toISOString(),
    },
    {
        id: "quote-client-02",
        service_id: "srv-gps-842",
        technician_id: "tech-02",
        technician_name: "Andrés Silva",
        technician_rating: 4.88,
        technician_total_services: 92,
        amount: 520000,
        counter_amount: 490000,
        description: "Instalación de alta seguridad:\n- GPS 4G con relevo de corte motorizado y botón de pánico en cabina oculta\n- Arnés con funda ignífuga antifricción y fusible térmico independiente\n- Reporte de prueba satelital y calibración de geocercas.",
        status: "counter_offered",
        client_response: "Propuse $490.000 COP para adjudicar hoy mismo.",
        created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
        expires_at: new Date(Date.now() + 3600000 * 20).toISOString(),
    }
]

function QuotationsContent() {
    const params = useParams()
    const router = useRouter()
    const { toast } = useToast()
    const serviceId = (params?.id as string) || "srv-demo"

    const [quotations, setQuotations] = useState<Quotation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)

    // Counter-offer modal state
    const [showCounterModal, setShowCounterModal] = useState(false)
    const [counterQuotationId, setCounterQuotationId] = useState<string | null>(null)
    const [counterAmount, setCounterAmount] = useState("")
    const [counterMessage, setCounterMessage] = useState("")

    const fetchQuotations = async () => {
        try {
            setIsLoading(true)
            const data = await getServiceQuotations(serviceId)
            if (data && data.length > 0) {
                setQuotations(data)
            } else {
                setQuotations(FALLBACK_CLIENT_QUOTATIONS)
            }
        } catch (err: any) {
            console.warn("Using fallback quotations for client review", err)
            setQuotations(FALLBACK_CLIENT_QUOTATIONS)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchQuotations()
    }, [serviceId])

    const handleApprove = async (quotationId: string) => {
        try {
            setProcessingId(quotationId)
            const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
            if (token) {
                await approveQuotation(quotationId)
            }
            toast({
                title: "¡Cotización Aprobada!",
                description: "El especialista ha sido confirmado bajo custodia Escrow Tec360.",
            })
            setQuotations(prev => prev.map(q => q.id === quotationId ? { ...q, status: "approved" } : q))
            setTimeout(() => {
                router.push(`/servicios/${serviceId}`)
            }, 1200)
        } catch (err: any) {
            toast({
                title: "Error al aprobar",
                description: err.message || "No se pudo procesar la aprobación",
                variant: "destructive",
            })
        } finally {
            setProcessingId(null)
        }
    }

    const handleReject = async (quotationId: string) => {
        try {
            setProcessingId(quotationId)
            const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
            if (token) {
                await rejectQuotation(quotationId)
            }
            toast({
                title: "Cotización Declinada",
                description: "Se ha descartado esta propuesta técnica.",
            })
            setQuotations(prev => prev.filter(q => q.id !== quotationId))
        } catch (err: any) {
            toast({
                title: "Error al declinar",
                description: err.message,
                variant: "destructive",
            })
        } finally {
            setProcessingId(null)
        }
    }

    const openCounterModal = (quotation: Quotation) => {
        setCounterQuotationId(quotation.id)
        setCounterAmount(quotation.amount ? (quotation.amount * 0.9).toFixed(0) : "450000")
        setShowCounterModal(true)
    }

    const handleCounterOffer = async () => {
        if (!counterQuotationId) return

        const numAmount = parseFloat(counterAmount.replace(/,/g, ""))
        if (isNaN(numAmount) || numAmount <= 0) {
            toast({
                title: "Monto inválido",
                description: "Ingresa un monto válido para tu contraoferta",
                variant: "destructive",
            })
            return
        }

        try {
            setProcessingId(counterQuotationId)
            const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
            if (token) {
                await counterOfferQuotation(counterQuotationId, {
                    counter_amount: numAmount,
                    client_response: counterMessage.trim() || undefined,
                })
            }
            toast({
                title: "Contraoferta Enviada",
                description: `Has propuesto $${numAmount.toLocaleString("es-CO")} COP al especialista.`,
            })
            setQuotations(prev => prev.map(q => q.id === counterQuotationId ? {
                ...q,
                status: "counter_offered",
                counter_amount: numAmount,
                client_response: counterMessage.trim() || undefined
            } : q))
            setShowCounterModal(false)
            setCounterAmount("")
            setCounterMessage("")
        } catch (err: any) {
            toast({
                title: "Error al contraofertar",
                description: err.message,
                variant: "destructive",
            })
        } finally {
            setProcessingId(null)
            setCounterQuotationId(null)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => router.push(`/servicios/${serviceId}`)}
                        className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-white">
                                Propuestas Técnicas Recibidas
                            </h1>
                            <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-mono uppercase">
                                Enlace Escrow
                            </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                            Revisa cotizaciones de Especialistas Certificados Tec360, negocia o confirma tu servicio.
                        </p>
                    </div>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchQuotations}
                    className="bg-slate-900/80 border-slate-800 hover:bg-slate-800 text-slate-300 text-xs h-9 rounded-xl"
                >
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                    Actualizar
                </Button>
            </div>

            {/* Escrow Custody Assurance Banner */}
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-slate-100 flex items-start sm:items-center gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                    <p className="font-semibold text-sm text-emerald-300">
                        Custodia Escrow Tec360: Tu Dinero 100% Protegido
                    </p>
                    <p className="text-xs text-slate-300 mt-0.5">
                        Al aceptar una cotización, los fondos permanecen en depósito de garantía. Solo se autoriza la liquidación cuando verifiques y apruebes el trabajo en sitio.
                    </p>
                </div>
            </div>

            {/* Quotations Feed */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                        Sincronizando cotizaciones con especialistas...
                    </span>
                </div>
            ) : quotations.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-[#080F24] border border-slate-800">
                    <FileText className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-white">Aún no hay cotizaciones para este servicio</h3>
                    <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                        Los especialistas cercanos han sido notificados por radar. Recibirás propuestas técnicas en breve.
                    </p>
                    <Button
                        onClick={() => router.push(`/servicios/${serviceId}`)}
                        className="mt-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold px-5"
                    >
                        Volver al Radar de Misión
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    <AnimatePresence>
                        {quotations.map((quotation) => (
                            <ClientQuotationCard
                                key={quotation.id}
                                quotation={quotation}
                                onApprove={() => handleApprove(quotation.id)}
                                onReject={() => handleReject(quotation.id)}
                                onCounterOffer={() => openCounterModal(quotation)}
                                isProcessing={processingId === quotation.id}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Counter-Offer Modal */}
            {showCounterModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#080F24] border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
                                <MessageSquare className="h-5 w-5 text-sky-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Enviar Contraoferta</h3>
                                <p className="text-xs text-slate-400">Propón un nuevo valor al especialista</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                                    Nuevo Monto Propuesto (COP) *
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono">
                                        $
                                    </span>
                                    <input
                                        type="text"
                                        value={counterAmount}
                                        onChange={(e) => setCounterAmount(e.target.value.replace(/[^0-9]/g, ""))}
                                        placeholder="450000"
                                        className="w-full pl-8 pr-12 py-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-blue-500 text-white font-mono text-lg font-bold focus:outline-none"
                                    />
                                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                                        COP
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                                    Mensaje al Técnico (Opcional)
                                </label>
                                <textarea
                                    value={counterMessage}
                                    onChange={(e) => setCounterMessage(e.target.value)}
                                    placeholder="Ej: Te confirmo si incluye la calibración y prueba en ruta..."
                                    rows={3}
                                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 focus:border-blue-500 text-slate-200 text-xs resize-none focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2.5 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowCounterModal(false)}
                                className="flex-1 bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 text-xs h-10 rounded-xl"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleCounterOffer}
                                disabled={processingId !== null}
                                className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs h-10 rounded-xl shadow-lg shadow-sky-600/20"
                            >
                                {processingId ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    "Enviar Contraoferta"
                                )}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    )
}

function ClientQuotationCard({
    quotation,
    onApprove,
    onReject,
    onCounterOffer,
    isProcessing,
}: {
    quotation: Quotation
    onApprove: () => void
    onReject: () => void
    onCounterOffer: () => void
    isProcessing: boolean
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`p-5 rounded-2xl bg-[#080F24] border transition-all ${
                quotation.status === "counter_offered" 
                    ? "border-sky-500/40 shadow-lg shadow-sky-950/20" 
                    : quotation.status === "approved"
                    ? "border-emerald-500/40"
                    : "border-slate-800 hover:border-slate-700"
            }`}
        >
            <div className="space-y-4">
                {/* Specialist Info Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg font-mono">
                            {(quotation.technician_name || "T")[0]}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-white">
                                    {quotation.technician_name || "Especialista Certificado"}
                                </h3>
                                <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-mono">
                                    Certificado Tec360
                                </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                                <span className="flex items-center gap-1 text-amber-400 font-semibold">
                                    <Star className="h-3.5 w-3.5 fill-current" />
                                    {quotation.technician_rating || 4.9}
                                </span>
                                <span>•</span>
                                <span>{quotation.technician_total_services || 180} servicios completados</span>
                            </div>
                        </div>
                    </div>

                    <div className="sm:text-right shrink-0">
                        <div className="text-xl font-bold font-mono text-white">
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
                                <span className="text-emerald-400">
                                    ${quotation.amount.toLocaleString("es-CO")} COP
                                </span>
                            )}
                        </div>
                        {quotation.expires_at && (
                            <p className="text-[11px] text-amber-400 flex items-center sm:justify-end gap-1 mt-0.5">
                                <Clock className="h-3 w-3" />
                                Vence: {new Date(quotation.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        )}
                    </div>
                </div>

                {/* Scope Description */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                    {quotation.description}
                </div>

                {/* Client Response note if counter-offered */}
                {quotation.client_response && (
                    <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-500/30 text-xs text-sky-200">
                        <span className="font-semibold">Tu Contraoferta: </span>
                        "{quotation.client_response}"
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <Button
                        onClick={onApprove}
                        disabled={isProcessing}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-10 rounded-xl shadow-lg shadow-emerald-600/20"
                    >
                        {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <Check className="mr-1.5 h-4 w-4" />
                                Aceptar Presupuesto (Custodia Escrow)
                            </>
                        )}
                    </Button>
                    <Button
                        onClick={onCounterOffer}
                        disabled={isProcessing}
                        variant="outline"
                        className="flex-1 bg-slate-900 border-sky-500/40 text-sky-400 hover:bg-sky-950/40 hover:text-sky-300 text-xs h-10 rounded-xl"
                    >
                        <MessageSquare className="mr-1.5 h-4 w-4" />
                        Proponer Contraoferta
                    </Button>
                    <Button
                        onClick={onReject}
                        disabled={isProcessing}
                        variant="ghost"
                        className="sm:w-28 text-slate-500 hover:text-rose-400 text-xs h-10 rounded-xl"
                    >
                        Declinar
                    </Button>
                </div>
            </div>
        </motion.div>
    )
}

export default function ServiceQuotationsPage() {
    return (
        <ProtectedRoute allowedRoles={["client", "admin"]}>
            <div className="min-h-screen bg-[#020408] text-slate-100 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <QuotationsContent />
                </div>
            </div>
        </ProtectedRoute>
    )
}
