"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2, AlertCircle, FileText } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { ProtectedRoute, useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/ui/glass-card"
import { useToast } from "@/components/ui/use-toast"
import { QuotationCard } from "@/components/quotations/quotation-card"
import {
    getServiceQuotations,
    approveQuotation,
    rejectQuotation,
    counterOfferQuotation,
    Quotation,
} from "@/lib/quotations"

function QuotationsContent() {
    const params = useParams()
    const router = useRouter()
    const { toast } = useToast()
    const serviceId = params.id as string

    const [quotations, setQuotations] = useState<Quotation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [error, setError] = useState("")

    // Counter-offer modal state
    const [showCounterModal, setShowCounterModal] = useState(false)
    const [counterQuotationId, setCounterQuotationId] = useState<string | null>(null)
    const [counterAmount, setCounterAmount] = useState("")
    const [counterMessage, setCounterMessage] = useState("")

    useEffect(() => {
        fetchQuotations()
    }, [serviceId])

    const fetchQuotations = async () => {
        try {
            const data = await getServiceQuotations(serviceId)
            setQuotations(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleApprove = async (quotationId: string) => {
        try {
            setProcessingId(quotationId)
            await approveQuotation(quotationId)
            toast({
                title: "¡Cotización aprobada!",
                description: "El técnico ha sido asignado a tu servicio.",
            })
            await fetchQuotations()
            router.push(`/servicios/${serviceId}`)
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

    const handleReject = async (quotationId: string) => {
        try {
            setProcessingId(quotationId)
            await rejectQuotation(quotationId)
            toast({
                title: "Cotización rechazada",
                description: "El técnico será notificado.",
            })
            await fetchQuotations()
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

    const openCounterModal = (quotationId: string) => {
        setCounterQuotationId(quotationId)
        setShowCounterModal(true)
    }

    const handleCounterOffer = async () => {
        if (!counterQuotationId) return

        const numAmount = parseFloat(counterAmount.replace(/,/g, ""))
        if (isNaN(numAmount) || numAmount <= 0) {
            toast({
                title: "Error",
                description: "Ingresa un monto válido",
                variant: "destructive",
            })
            return
        }

        try {
            setProcessingId(counterQuotationId)
            await counterOfferQuotation(counterQuotationId, {
                counter_amount: numAmount,
                client_response: counterMessage.trim() || undefined,
            })
            toast({
                title: "Contraoferta enviada",
                description: "El técnico recibirá tu propuesta.",
            })
            setShowCounterModal(false)
            setCounterAmount("")
            setCounterMessage("")
            await fetchQuotations()
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            })
        } finally {
            setProcessingId(null)
            setCounterQuotationId(null)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error) {
        return (
            <GlassCard className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-500">{error}</p>
                <Button onClick={() => router.back()} className="mt-4">
                    Volver
                </Button>
            </GlassCard>
        )
    }

    const pendingQuotations = quotations.filter((q) => q.status === "pending")
    const otherQuotations = quotations.filter((q) => q.status !== "pending")

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Cotizaciones Recibidas</h1>
                    <p className="text-muted-foreground">
                        {quotations.length} cotización(es) para tu servicio
                    </p>
                </div>
            </div>

            {quotations.length === 0 ? (
                <GlassCard className="p-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No hay cotizaciones aún</h3>
                    <p className="text-muted-foreground mt-2">
                        Los técnicos podrán enviarte presupuestos para tu servicio.
                    </p>
                </GlassCard>
            ) : (
                <div className="space-y-6">
                    {/* Pending quotations */}
                    {pendingQuotations.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="font-semibold text-lg">Pendientes de revisión</h2>
                            <AnimatePresence>
                                {pendingQuotations.map((q) => (
                                    <QuotationCard
                                        key={q.id}
                                        quotation={q}
                                        variant="client"
                                        onApprove={() => handleApprove(q.id)}
                                        onReject={() => handleReject(q.id)}
                                        onCounterOffer={() => openCounterModal(q.id)}
                                        isProcessing={processingId === q.id}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Other quotations */}
                    {otherQuotations.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="font-semibold text-lg text-muted-foreground">
                                Historial
                            </h2>
                            {otherQuotations.map((q) => (
                                <QuotationCard key={q.id} quotation={q} variant="client" />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Counter-offer Modal */}
            {showCounterModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-background rounded-xl p-6 max-w-md w-full space-y-4"
                    >
                        <h3 className="text-lg font-semibold">Hacer contraoferta</h3>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tu propuesta ($)</label>
                            <input
                                type="text"
                                value={counterAmount}
                                onChange={(e) =>
                                    setCounterAmount(
                                        e.target.value.replace(/[^0-9]/g, "")
                                            ? parseInt(e.target.value.replace(/[^0-9]/g, "")).toLocaleString()
                                            : ""
                                    )
                                }
                                placeholder="400,000"
                                className="w-full p-3 rounded-lg border bg-background"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Mensaje (opcional)</label>
                            <textarea
                                value={counterMessage}
                                onChange={(e) => setCounterMessage(e.target.value)}
                                placeholder="Explica tu contraoferta..."
                                rows={3}
                                className="w-full p-3 rounded-lg border bg-background resize-none"
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowCounterModal(false)}
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleCounterOffer}
                                disabled={processingId !== null}
                                className="flex-1"
                            >
                                {processingId ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    "Enviar"
                                )}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    )
}

export default function ServiceQuotationsPage() {
    return (
        <ProtectedRoute allowedRoles={["client"]}>
            <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
                <div className="container max-w-3xl mx-auto px-4 py-8">
                    <QuotationsContent />
                </div>
            </div>
        </ProtectedRoute>
    )
}
