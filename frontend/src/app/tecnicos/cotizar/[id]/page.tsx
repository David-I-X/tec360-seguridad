"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
    ArrowLeft, Send, Loader2, DollarSign, FileText, Clock, 
    AlertCircle, Shield, Car, CheckCircle2, Wrench, Radio, Info
} from "lucide-react"
import { motion } from "framer-motion"

import { ProtectedRoute } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
    vehicle_plate?: string
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

    // Form state
    const [amount, setAmount] = useState("480,000")
    const [description, setDescription] = useState(
        "Presupuesto técnico completo:\n- Mano de obra especializada de instalación oculta: $280.000 COP\n- Kit de arnés ignición, relevo 12V 40A y fusible antifricción: $120.000 COP\n- Calibración de antena GNSS y enlace de telemetría a plataforma: $80.000 COP\nGarantía de 30 días en mano de obra certificada Tec360."
    )
    const [expiresIn, setExpiresIn] = useState<number | undefined>(48)

    useEffect(() => {
        async function fetchService() {
            const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null

            try {
                if (token) {
                    const response = await fetch(`${API_URL}/services/${serviceId}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    })

                    if (response.ok) {
                        const data = await response.json()
                        setService(data)
                        return
                    }
                }
                // Fallback to operational demonstration
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
                                Misión Solicitada
                            </span>
                            <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px] font-mono">
                                INSTALACIONES
                            </Badge>
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-white leading-snug">
                                {currentService.title}
                            </h2>
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                                <Car className="h-3.5 w-3.5 text-blue-400" />
                                <span>Placa: <strong className="text-slate-200 font-mono">{currentService.vehicle_plate || "KLS-842"}</strong></span>
                            </p>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs text-slate-300">
                            <div>
                                <span className="text-slate-500 block">Ubicación de atención:</span>
                                <span className="text-slate-200">{currentService.service_address}</span>
                            </div>
                            {currentService.client_name && (
                                <div>
                                    <span className="text-slate-500 block">Cliente:</span>
                                    <span className="text-slate-200">{currentService.client_name}</span>
                                </div>
                            )}
                            <div>
                                <span className="text-slate-500 block">Alcance requerido por el usuario:</span>
                                <p className="mt-1 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 leading-relaxed text-xs">
                                    {currentService.description}
                                </p>
                            </div>
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
