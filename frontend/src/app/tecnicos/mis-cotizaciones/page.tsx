"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
    ArrowLeft, Loader2, FileText, Check, X, MessageSquare,
    DollarSign, Clock, RefreshCw, AlertCircle
} from "lucide-react"

import { ProtectedRoute, useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/ui/glass-card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { getMyQuotations, Quotation, QuotationListResponse } from "@/lib/quotations"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Status configuration
const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    pending: { label: "Pendiente", color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
    approved: { label: "Aprobada", color: "text-green-500", bgColor: "bg-green-500/10" },
    rejected: { label: "Rechazada", color: "text-red-500", bgColor: "bg-red-500/10" },
    counter_offered: { label: "Contraoferta", color: "text-blue-500", bgColor: "bg-blue-500/10" },
    expired: { label: "Expirada", color: "text-gray-500", bgColor: "bg-gray-500/10" },
    cancelled: { label: "Cancelada", color: "text-gray-500", bgColor: "bg-gray-500/10" },
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
            setQuotations(data.quotations)
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        const filter = activeTab === "all" ? undefined : activeTab
        fetchQuotations(filter)
    }, [activeTab])

    // Accept counter-offer (update quotation amount and set to pending for client approval)
    const handleAcceptCounterOffer = async (quotation: Quotation) => {
        if (!quotation.counter_amount) return

        try {
            setProcessingId(quotation.id)
            const token = localStorage.getItem("access_token")

            // Call API to accept counter-offer
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

            toast({
                title: "Contraoferta aceptada",
                description: "La cotización ha sido actualizada con el nuevo monto.",
            })

            fetchQuotations(activeTab === "all" ? undefined : activeTab)
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

    // Reject counter-offer (cancel quotation)
    const handleRejectCounterOffer = async (quotationId: string) => {
        try {
            setProcessingId(quotationId)
            const token = localStorage.getItem("access_token")

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

            toast({
                title: "Contraoferta rechazada",
                description: "Has rechazado la contraoferta del cliente.",
            })

            fetchQuotations(activeTab === "all" ? undefined : activeTab)
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

    const counterOfferedQuotes = quotations.filter(q => q.status === "counter_offered")
    const pendingQuotes = quotations.filter(q => q.status === "pending")
    const approvedQuotes = quotations.filter(q => q.status === "approved")
    const otherQuotes = quotations.filter(q => !["counter_offered", "pending", "approved"].includes(q.status))

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/tecnicos/dashboard")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Mis Cotizaciones</h1>
                        <p className="text-muted-foreground">
                            {quotations.length} cotización(es) enviadas
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchQuotations(activeTab === "all" ? undefined : activeTab)}
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar
                </Button>
            </div>

            {/* Counter-offers alert */}
            {counterOfferedQuotes.length > 0 && (
                <GlassCard className="p-4 bg-blue-500/10 border-blue-500/30">
                    <div className="flex items-center gap-3">
                        <MessageSquare className="h-5 w-5 text-blue-500" />
                        <div className="flex-1">
                            <p className="font-medium text-blue-500">
                                ¡Tienes {counterOfferedQuotes.length} contraoferta(s) pendiente(s)!
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Los clientes han propuesto nuevos precios para tus cotizaciones.
                            </p>
                        </div>
                    </div>
                </GlassCard>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 w-full max-w-md">
                    <TabsTrigger value="all">Todas</TabsTrigger>
                    <TabsTrigger value="counter_offered" className="relative">
                        Contraoferta
                        {counterOfferedQuotes.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                                {counterOfferedQuotes.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="pending">Pendientes</TabsTrigger>
                    <TabsTrigger value="approved">Aprobadas</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : quotations.length === 0 ? (
                        <GlassCard className="p-12 text-center">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium">No hay cotizaciones</h3>
                            <p className="text-muted-foreground mt-2">
                                Ve a servicios disponibles para enviar cotizaciones.
                            </p>
                            <Button
                                onClick={() => router.push("/tecnicos/dashboard")}
                                className="mt-4"
                            >
                                Ver Servicios
                            </Button>
                        </GlassCard>
                    ) : (
                        <div className="space-y-4">
                            <AnimatePresence>
                                {quotations.map((quotation) => (
                                    <QuotationListCard
                                        key={quotation.id}
                                        quotation={quotation}
                                        onAcceptCounter={() => {
                                            setSelectedQuotation(quotation)
                                            setShowAcceptModal(true)
                                        }}
                                        onRejectCounter={() => handleRejectCounterOffer(quotation.id)}
                                        isProcessing={processingId === quotation.id}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Accept Counter-offer Modal */}
            {showAcceptModal && selectedQuotation && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-background rounded-xl p-6 max-w-md w-full space-y-4"
                    >
                        <h3 className="text-lg font-semibold">Aceptar Contraoferta</h3>

                        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tu precio original:</span>
                                <span className="line-through">${selectedQuotation.amount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold text-green-500">
                                <span>Contraoferta del cliente:</span>
                                <span>${selectedQuotation.counter_amount?.toLocaleString()}</span>
                            </div>
                            {selectedQuotation.client_response && (
                                <p className="text-sm text-muted-foreground mt-2">
                                    "{selectedQuotation.client_response}"
                                </p>
                            )}
                        </div>

                        <p className="text-sm text-muted-foreground">
                            Al aceptar, tu cotización se actualizará con el nuevo monto y quedará
                            pendiente de aprobación final del cliente.
                        </p>

                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowAcceptModal(false)
                                    setSelectedQuotation(null)
                                }}
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => handleAcceptCounterOffer(selectedQuotation)}
                                disabled={processingId !== null}
                                className="flex-1 bg-green-500 hover:bg-green-600"
                            >
                                {processingId ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Aceptar
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

// Quotation card for technician view
function QuotationListCard({
    quotation,
    onAcceptCounter,
    onRejectCounter,
    isProcessing,
}: {
    quotation: Quotation
    onAcceptCounter: () => void
    onRejectCounter: () => void
    isProcessing: boolean
}) {
    const status = statusConfig[quotation.status] || statusConfig.pending

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
        >
            <GlassCard className={`p-5 ${quotation.status === "counter_offered" ? "border-blue-500/30" : ""}`}>
                <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div>
                            <Badge className={`${status.bgColor} ${status.color} border-0`}>
                                {status.label}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                                Enviada: {format(new Date(quotation.created_at), "d MMM yyyy HH:mm", { locale: es })}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-1 text-xl font-bold">
                                <DollarSign className="h-5 w-5 text-green-500" />
                                {quotation.counter_amount ? (
                                    <>
                                        <span className="line-through text-muted-foreground text-base">
                                            ${quotation.amount.toLocaleString()}
                                        </span>
                                        <span className="text-blue-500 ml-2">
                                            ${quotation.counter_amount.toLocaleString()}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-green-600">${quotation.amount.toLocaleString()}</span>
                                )}
                            </div>
                            {quotation.expires_at && (
                                <p className="text-xs text-orange-500 flex items-center justify-end gap-1">
                                    <Clock className="h-3 w-3" />
                                    Expira: {format(new Date(quotation.expires_at), "d MMM HH:mm", { locale: es })}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {quotation.description}
                    </p>

                    {/* Client Response */}
                    {quotation.client_response && (
                        <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-sm">
                                <span className="font-medium">Respuesta del cliente: </span>
                                {quotation.client_response}
                            </p>
                        </div>
                    )}

                    {/* Counter-offer actions */}
                    {quotation.status === "counter_offered" && (
                        <div className="flex gap-2 pt-2">
                            <Button
                                onClick={onAcceptCounter}
                                disabled={isProcessing}
                                className="flex-1 bg-green-500 hover:bg-green-600"
                            >
                                <Check className="mr-2 h-4 w-4" />
                                Aceptar Contraoferta
                            </Button>
                            <Button
                                onClick={onRejectCounter}
                                disabled={isProcessing}
                                variant="destructive"
                                className="flex-1"
                            >
                                <X className="mr-2 h-4 w-4" />
                                Rechazar
                            </Button>
                        </div>
                    )}

                    {/* Approved action */}
                    {quotation.status === "approved" && (
                        <Button
                            onClick={() => window.location.href = `/tecnicos/servicio/${quotation.service_id}`}
                            className="w-full"
                        >
                            Ir al Servicio
                        </Button>
                    )}
                </div>
            </GlassCard>
        </motion.div>
    )
}

export default function TechnicianQuotationsPage() {
    return (
        <ProtectedRoute allowedRoles={["technician", "reaction_team"]}>
            <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
                <div className="container max-w-3xl mx-auto px-4 py-8">
                    <TechnicianQuotationsContent />
                </div>
            </div>
        </ProtectedRoute>
    )
}
