"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Send, Loader2, DollarSign, FileText, Clock, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"

import { ProtectedRoute, useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/ui/glass-card"
import { useToast } from "@/components/ui/use-toast"
import { createQuotation, QuotationCreate } from "@/lib/quotations"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface ServiceInfo {
    id: string
    title: string
    description: string
    service_type: string
    service_address: string
    client_name?: string
}

function QuotationFormContent() {
    const params = useParams()
    const router = useRouter()
    const { toast } = useToast()
    const serviceId = params.id as string

    const [service, setService] = useState<ServiceInfo | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState("")

    // Form state
    const [amount, setAmount] = useState("")
    const [description, setDescription] = useState("")
    const [expiresIn, setExpiresIn] = useState<number | undefined>(48)

    useEffect(() => {
        async function fetchService() {
            const token = localStorage.getItem("access_token")
            if (!token) return

            try {
                const response = await fetch(`${API_URL}/services/${serviceId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })

                if (!response.ok) throw new Error("No se pudo cargar el servicio")

                const data = await response.json()
                setService(data)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setIsLoading(false)
            }
        }

        fetchService()
    }, [serviceId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const numAmount = parseFloat(amount.replace(/,/g, ""))
        if (isNaN(numAmount) || numAmount <= 0) {
            toast({
                title: "Error",
                description: "Ingresa un monto válido",
                variant: "destructive",
            })
            return
        }

        if (description.trim().length < 10) {
            toast({
                title: "Error",
                description: "La descripción debe tener al menos 10 caracteres",
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

            await createQuotation(serviceId, data)

            toast({
                title: "¡Cotización enviada!",
                description: "El cliente recibirá tu propuesta",
            })

            router.push("/tecnicos/dashboard")
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const formatAmount = (value: string) => {
        const num = value.replace(/[^0-9]/g, "")
        return num ? parseInt(num).toLocaleString() : ""
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error || !service) {
        return (
            <GlassCard className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-500">{error || "Servicio no encontrado"}</p>
                <Button onClick={() => router.back()} className="mt-4">
                    Volver
                </Button>
            </GlassCard>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Enviar Cotización</h1>
                    <p className="text-muted-foreground">
                        Propuesta para: {service.title}
                    </p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Service Info */}
                <GlassCard className="p-6 space-y-4">
                    <h2 className="font-semibold text-lg">Detalles del Servicio</h2>
                    <div className="space-y-3 text-sm">
                        <div>
                            <span className="text-muted-foreground">Tipo:</span>
                            <span className="ml-2 font-medium">{service.service_type}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Dirección:</span>
                            <span className="ml-2">{service.service_address}</span>
                        </div>
                        {service.description && (
                            <div>
                                <span className="text-muted-foreground">Descripción:</span>
                                <p className="mt-1">{service.description}</p>
                            </div>
                        )}
                    </div>
                </GlassCard>

                {/* Quotation Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <GlassCard className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Amount */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" />
                                    Monto del Presupuesto *
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                        $
                                    </span>
                                    <input
                                        type="text"
                                        value={amount}
                                        onChange={(e) => setAmount(formatAmount(e.target.value))}
                                        placeholder="450,000"
                                        className="w-full pl-8 pr-4 py-3 rounded-xl bg-background/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Desglose del Presupuesto *
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Detalla los costos:&#10;- Materiales: $X&#10;- Mano de obra: $Y&#10;- Otros: $Z"
                                    rows={5}
                                    className="w-full p-4 rounded-xl bg-background/50 border border-border/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    required
                                    minLength={10}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Mínimo 10 caracteres ({description.length}/10)
                                </p>
                            </div>

                            {/* Expiration */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Validez de la cotización
                                </label>
                                <select
                                    value={expiresIn || ""}
                                    onChange={(e) => setExpiresIn(e.target.value ? parseInt(e.target.value) : undefined)}
                                    className="w-full p-3 rounded-xl bg-background/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="">Sin expiración</option>
                                    <option value="24">24 horas</option>
                                    <option value="48">48 horas</option>
                                    <option value="72">72 horas (3 días)</option>
                                    <option value="168">1 semana</option>
                                </select>
                            </div>

                            {/* Submit */}
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-12 text-lg"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-5 w-5" />
                                        Enviar Cotización
                                    </>
                                )}
                            </Button>
                        </form>
                    </GlassCard>
                </motion.div>
            </div>
        </div>
    )
}

export default function QuotationPage() {
    return (
        <ProtectedRoute allowedRoles={["technician"]}>
            <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
                <div className="container max-w-4xl mx-auto px-4 py-8">
                    <QuotationFormContent />
                </div>
            </div>
        </ProtectedRoute>
    )
}
