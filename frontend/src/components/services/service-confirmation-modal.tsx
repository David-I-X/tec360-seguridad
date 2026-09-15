"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
    X, Check, AlertTriangle, AlertCircle, ChevronDown, ChevronUp, 
    Car, Lightbulb, Shield, Disc, Gauge, Star, Loader2, CheckCircle2, ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { INSPECTION_CATEGORIES } from "@/components/technician/vehicle-inspection-modal"

interface ServiceConfirmationModalProps {
    isOpen: boolean
    onClose: () => void
    mode: "inspection" | "completion"
    service: any
    token: string
    onSuccess: (updatedService?: any) => void
}

export function ServiceConfirmationModal({
    isOpen,
    onClose,
    mode,
    service,
    token,
    onSuccess,
}: ServiceConfirmationModalProps) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

    // Inspection review state
    const [expandedCategory, setExpandedCategory] = useState<string>("luces")
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Rating & completion state
    const [rating, setRating] = useState<number>(5)
    const [hoverRating, setHoverRating] = useState<number>(0)
    const [comment, setComment] = useState<string>("")
    const [paymentMethod, setPaymentMethod] = useState<string>(service?.payment_method || "cash")

    if (!isOpen || !service) return null

    const inspection = service.service_metadata?.vehicle_inspection

    // ─── Handle Confirm Inspection ─────────────────────────
    const handleConfirmInspection = async () => {
        if (!token) return
        setIsSubmitting(true)
        try {
            const res = await fetch(`${API_URL}/services/${service.id}/inspection/confirm`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                }
            })

            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.detail || "Error al confirmar la inspección")
            }

            toast({
                title: "✅ Inspección confirmada",
                description: "Has autorizado el inicio del servicio con el estado documentado."
            })
            onSuccess()
            onClose()
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive"
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    // ─── Handle Confirm Completion + Rating ────────────────
    const handleConfirmCompletion = async () => {
        if (!token) return
        setIsSubmitting(true)
        try {
            const res = await fetch(`${API_URL}/services/${service.id}/confirm`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    rating,
                    comment: comment.trim() || undefined,
                    payment_method: paymentMethod
                })
            })

            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.detail || "Error al confirmar la conformidad")
            }

            const updated = await res.json()
            toast({
                title: "🎉 ¡Servicio confirmado y calificado!",
                description: "Gracias por calificar la labor de nuestro técnico."
            })
            onSuccess(updated)
            onClose()
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive"
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    // Compute inspection stats if present
    let badCount = 0
    let regularCount = 0
    let goodCount = 0
    if (inspection?.categories) {
        Object.values(inspection.categories).forEach((cat: any) => {
            Object.values(cat).forEach((item: any) => {
                if (item.status === "bad") badCount++
                else if (item.status === "regular") regularCount++
                else goodCount++
            })
        })
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="relative w-full max-w-xl bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-4 sm:p-5 border-b border-border/40 bg-muted/20 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xl">
                                {mode === "inspection" ? "🔍" : "⭐"}
                            </span>
                            <div>
                                <h2 className="text-lg font-bold text-foreground">
                                    {mode === "inspection" 
                                        ? "Inspección Previa de tu Vehículo" 
                                        : "Confirmar Conformidad del Servicio"
                                    }
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {service.vehicle_model || service.title} {service.vehicle_plate ? `• ${service.vehicle_plate}` : ""}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                        {mode === "inspection" ? (
                            /* ─── MODE: Inspection Review ─── */
                            <>
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-start gap-2.5">
                                    <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                    <div className="text-xs text-blue-300 leading-relaxed">
                                        <p className="font-semibold text-blue-200">Revisión de Seguridad Pre-Servicio</p>
                                        El técnico ha documentado el estado actual de tu vehículo antes de intervenirlo. Por favor verifica que las observaciones correspondan con la realidad.
                                    </div>
                                </div>

                                {/* Metrics */}
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground">Estado verificado:</span>
                                    <span className="bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-md font-semibold">
                                        {goodCount} Buenos
                                    </span>
                                    {regularCount > 0 && (
                                        <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md font-semibold">
                                            {regularCount} Regulares
                                        </span>
                                    )}
                                    {badCount > 0 && (
                                        <span className="bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-md font-semibold">
                                            {badCount} Malos
                                        </span>
                                    )}
                                </div>

                                {inspection?.vehicle_km && (
                                    <div className="bg-muted/20 border border-border/40 rounded-xl p-3 text-xs flex justify-between">
                                        <span className="text-muted-foreground font-medium">Kilometraje registrado:</span>
                                        <span className="font-mono font-bold text-foreground">{inspection.vehicle_km} km</span>
                                    </div>
                                )}

                                {/* Categories & Items */}
                                <div className="space-y-2">
                                    {INSPECTION_CATEGORIES.map((category) => {
                                        const isExpanded = expandedCategory === category.id
                                        const CatIcon = category.icon
                                        const catData = inspection?.categories?.[category.id] || {}

                                        const issuesInCat = category.items.filter(it => {
                                            const itemData = catData[it.key]
                                            return itemData?.status === "regular" || itemData?.status === "bad"
                                        })

                                        return (
                                            <div
                                                key={category.id}
                                                className="border border-border/40 rounded-xl overflow-hidden bg-card/40"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedCategory(isExpanded ? "" : category.id)}
                                                    className="w-full flex items-center justify-between p-3 hover:bg-muted/20 transition-colors text-left"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-400 flex items-center justify-center">
                                                            <CatIcon className="w-3.5 h-3.5" />
                                                        </div>
                                                        <span className="text-xs font-bold text-foreground">
                                                            {category.title}
                                                        </span>
                                                        {issuesInCat.length > 0 && (
                                                            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold">
                                                                {issuesInCat.length} observación{issuesInCat.length > 1 ? "es" : ""}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isExpanded ? (
                                                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                    )}
                                                </button>

                                                {isExpanded && (
                                                    <div className="p-3 border-t border-border/30 bg-muted/10 space-y-1.5">
                                                        {category.items.map((item) => {
                                                            const itemData = catData[item.key] || { status: "good", notes: "" }
                                                            const isBad = itemData.status === "bad"
                                                            const isRegular = itemData.status === "regular"

                                                            return (
                                                                <div
                                                                    key={item.key}
                                                                    className="flex items-center justify-between p-1.5 rounded text-xs"
                                                                >
                                                                    <span className="text-muted-foreground">{item.label}</span>
                                                                    <div className="flex items-center gap-2">
                                                                        {itemData.notes && (
                                                                            <span className="text-[11px] text-amber-400/90 italic truncate max-w-[150px]">
                                                                                "{itemData.notes}"
                                                                            </span>
                                                                        )}
                                                                        <span
                                                                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                                                                isBad
                                                                                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                                                                    : isRegular
                                                                                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                                                                    : "bg-green-500/15 text-green-400 border border-green-500/30"
                                                                            }`}
                                                                        >
                                                                            {isBad ? "Malo" : isRegular ? "Regular" : "Bueno"}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>

                                {inspection?.general_notes && (
                                    <div className="bg-muted/15 border border-border/40 rounded-xl p-3 text-xs space-y-1">
                                        <span className="font-semibold text-foreground block">Observaciones del Técnico:</span>
                                        <p className="text-muted-foreground italic">"{inspection.general_notes}"</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            /* ─── MODE: Completion & Rating ─── */
                            <>
                                <div className="text-center py-2 space-y-2">
                                    <div className="w-14 h-14 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10 text-2xl">
                                        ⭐
                                    </div>
                                    <h3 className="text-base font-bold text-foreground">¿Cómo calificarías el servicio?</h3>
                                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                        El técnico {service.technician?.full_name || ""} ha completado el servicio. Tu opinión es fundamental para mantener la excelencia de Tec360.
                                    </p>
                                </div>

                                {/* Star Selector */}
                                <div className="flex items-center justify-center gap-2 py-3">
                                    {[1, 2, 3, 4, 5].map((starVal) => {
                                        const active = (hoverRating || rating) >= starVal
                                        return (
                                            <button
                                                key={starVal}
                                                type="button"
                                                onMouseEnter={() => setHoverRating(starVal)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                onClick={() => setRating(starVal)}
                                                className="p-1.5 transition-transform hover:scale-125 focus:outline-none"
                                            >
                                                <Star
                                                    className={`w-9 h-9 transition-colors ${
                                                        active
                                                            ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                                                            : "text-muted-foreground/30 hover:text-muted-foreground/60"
                                                    }`}
                                                />
                                            </button>
                                        )
                                    })}
                                </div>

                                <div className="text-center text-xs font-bold text-amber-400">
                                    {rating === 5 && "⭐⭐⭐⭐⭐ ¡Excelente servicio!"}
                                    {rating === 4 && "⭐⭐⭐⭐ Muy buen servicio"}
                                    {rating === 3 && "⭐⭐⭐ Servicio aceptable"}
                                    {rating === 2 && "⭐⭐ Regular, con aspectos por mejorar"}
                                    {rating === 1 && "⭐ Insatisfecho con el servicio"}
                                </div>

                                {/* Comment input */}
                                <div className="space-y-1.5 pt-2">
                                    <label className="text-xs font-semibold text-foreground">
                                        Comentario u opinión (opcional):
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="Cuéntanos los detalles de tu experiencia, puntualidad o profesionalismo del técnico..."
                                        className="w-full bg-muted/15 border border-border/40 rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>

                                {/* Payment Method selection if not settled */}
                                <div className="bg-muted/15 border border-border/40 rounded-xl p-3 space-y-2">
                                    <label className="text-xs font-semibold text-foreground">
                                        Método de Pago:
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod("cash")}
                                            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                                                paymentMethod === "cash"
                                                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold"
                                                    : "border-border/50 text-muted-foreground hover:bg-muted/20"
                                            }`}
                                        >
                                            💵 Efectivo al Técnico
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod("online")}
                                            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                                                paymentMethod === "online"
                                                    ? "bg-blue-500/15 border-blue-500 text-blue-400 font-bold"
                                                    : "border-border/50 text-muted-foreground hover:bg-muted/20"
                                            }`}
                                        >
                                            💳 Pago en Línea / Wompi
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-border/40 bg-muted/20 flex gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                            disabled={isSubmitting}
                        >
                            Cerrar
                        </Button>

                        {mode === "inspection" ? (
                            <Button
                                onClick={handleConfirmInspection}
                                disabled={isSubmitting}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-11 shadow-lg shadow-green-600/25"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Confirmando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Confirmar Estado de Mi Vehículo
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button
                                onClick={handleConfirmCompletion}
                                disabled={isSubmitting}
                                className="flex-1 gradient-brand text-white font-bold h-11 shadow-lg shadow-blue-600/25"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4 mr-2" />
                                        Confirmar Conformidad
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
