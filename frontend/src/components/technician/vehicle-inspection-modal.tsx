"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
    X, AlertCircle, ChevronDown, ChevronUp, 
    Car, Lightbulb, Shield, Disc, Gauge, Send, Loader2, Clock, CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

export interface InspectionCategoryDef {
    id: string
    title: string
    icon: any
    items: { key: string; label: string }[]
}

export const INSPECTION_CATEGORIES: InspectionCategoryDef[] = [
    {
        id: "luces",
        title: "Sistema de Luces",
        icon: Lightbulb,
        items: [
            { key: "estacionamiento", label: "Estacionamiento" },
            { key: "bajas", label: "Luces Bajas" },
            { key: "altas", label: "Luces Altas" },
            { key: "freno", label: "Luz de Freno (3ª luz)" },
            { key: "marcha_atras", label: "Marcha Atrás" },
            { key: "viraje", label: "Direccionales / Viraje" },
            { key: "emergencia", label: "Luces de Emergencia" },
            { key: "patente", label: "Luz de Placa / Patente" },
        ],
    },
    {
        id: "frenos",
        title: "Sistema de Frenos",
        icon: Shield,
        items: [
            { key: "freno_mano", label: "Freno de Mano" },
            { key: "freno_pedal", label: "Pedal de Freno" },
        ],
    },
    {
        id: "neumaticos",
        title: "Neumáticos",
        icon: Disc,
        items: [
            { key: "delantero_der", label: "Delantero Derecho" },
            { key: "delantero_izq", label: "Delantero Izquierdo" },
            { key: "trasero_der", label: "Trasero Derecho" },
            { key: "trasero_izq", label: "Trasero Izquierdo" },
            { key: "repuesto", label: "Llanta de Repuesto" },
        ],
    },
    {
        id: "carroceria",
        title: "Carrocería y Vidrios",
        icon: Car,
        items: [
            { key: "parabrisas", label: "Parabrisas y Vidrios" },
            { key: "retrovisores", label: "Espejos Retrovisores" },
            { key: "latoneria", label: "Pintura / Rayones Previos" },
            { key: "parachoques", label: "Parachoques / Bómper" },
        ],
    },
    {
        id: "interior",
        title: "Interior y Tablero",
        icon: Gauge,
        items: [
            { key: "tablero", label: "Tablero / Testigos encendidos" },
            { key: "tapiceria", label: "Tapicería y Asientos" },
            { key: "radio", label: "Radio / Pantalla" },
        ],
    },
]

export type ItemStatus = "good" | "regular" | "bad"

export interface InspectionDataState {
    [catId: string]: {
        [itemKey: string]: {
            status: ItemStatus
            notes: string
        }
    }
}

interface VehicleInspectionModalProps {
    isOpen: boolean
    onClose: () => void
    serviceId: string
    vehicleModel?: string
    vehiclePlate?: string
    existingInspection?: any
    onInspectionConfirmed: () => void
    token: string
}

export function VehicleInspectionModal({
    isOpen,
    onClose,
    serviceId,
    vehicleModel,
    vehiclePlate,
    existingInspection,
    onInspectionConfirmed,
    token
}: VehicleInspectionModalProps) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

    // Initialize default categories where everything defaults to "good" (fast completion)
    const [categoriesState, setCategoriesState] = useState<InspectionDataState>(() => {
        if (existingInspection?.categories) {
            return existingInspection.categories
        }
        const initial: InspectionDataState = {}
        INSPECTION_CATEGORIES.forEach(cat => {
            initial[cat.id] = {}
            cat.items.forEach(item => {
                initial[cat.id][item.key] = { status: "good", notes: "" }
            })
        })
        return initial
    })

    const [vehicleKm, setVehicleKm] = useState<string>(existingInspection?.vehicle_km || "")
    const [generalNotes, setGeneralNotes] = useState<string>(existingInspection?.general_notes || "")
    const [expandedCategory, setExpandedCategory] = useState<string>(INSPECTION_CATEGORIES[0].id)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(!!existingInspection)
    const [isClientConfirmed, setIsClientConfirmed] = useState(!!existingInspection?.client_confirmed)
    const [elapsedMinutes, setElapsedMinutes] = useState(0)

    // Watch existingInspection updates
    useEffect(() => {
        if (existingInspection) {
            setIsSubmitted(true)
            if (existingInspection.client_confirmed) {
                setIsClientConfirmed(true)
            }
            if (existingInspection.categories) {
                setCategoriesState(existingInspection.categories)
            }
        }
    }, [existingInspection])

    // Timer if waiting for client confirmation
    useEffect(() => {
        if (!isSubmitted || isClientConfirmed) return
        const timer = setInterval(() => {
            setElapsedMinutes(prev => prev + 1)
        }, 60000)
        return () => clearInterval(timer)
    }, [isSubmitted, isClientConfirmed])

    if (!isOpen) return null

    const handleSetStatus = (catId: string, itemKey: string, status: ItemStatus) => {
        setCategoriesState(prev => ({
            ...prev,
            [catId]: {
                ...prev[catId],
                [itemKey]: {
                    ...prev[catId]?.[itemKey],
                    status,
                    notes: prev[catId]?.[itemKey]?.notes || ""
                }
            }
        }))
    }

    const handleSetNote = (catId: string, itemKey: string, note: string) => {
        setCategoriesState(prev => ({
            ...prev,
            [catId]: {
                ...prev[catId],
                [itemKey]: {
                    ...prev[catId]?.[itemKey],
                    notes: note
                }
            }
        }))
    }

    const handleSubmitInspection = async () => {
        if (!token) return
        setIsSubmitting(true)
        try {
            const res = await fetch(`${API_URL}/services/${serviceId}/inspection`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    vehicle_km: vehicleKm.trim() || undefined,
                    general_notes: generalNotes.trim() || undefined,
                    categories: categoriesState
                })
            })

            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.detail || "Error al enviar la inspección")
            }

            setIsSubmitted(true)
            toast({
                title: "📋 Inspección enviada al cliente",
                description: "Se envió una copia a la pantalla del cliente para su confirmación."
            })
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

    const totalItems = INSPECTION_CATEGORIES.reduce((acc, cat) => acc + cat.items.length, 0)
    let badCount = 0
    let regularCount = 0
    Object.values(categoriesState).forEach(cat => {
        Object.values(cat).forEach(item => {
            if (item.status === "bad") badCount++
            if (item.status === "regular") regularCount++
        })
    })

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="relative w-full max-w-2xl bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-4 sm:p-5 border-b border-border/40 bg-muted/20 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xl">🔍</span>
                                <h2 className="text-lg font-bold">Inspección de Vehículo</h2>
                                <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">
                                    Pre-Servicio
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {vehicleModel || "Vehículo"} {vehiclePlate ? `• Placa: ${vehiclePlate}` : ""}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body Content */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                        {isSubmitted ? (
                            /* State after submission: waiting for client or confirmed */
                            <div className="py-6 px-4 text-center space-y-5">
                                {isClientConfirmed ? (
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="space-y-4"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 border border-green-500/40 flex items-center justify-center mx-auto shadow-lg shadow-green-500/10">
                                            <CheckCircle2 className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-foreground">¡Inspección Confirmada por el Cliente!</h3>
                                            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                                                El cliente revisó y aceptó el registro del estado de su vehículo. Ya estás habilitado para comenzar el trabajo.
                                            </p>
                                        </div>
                                        <div className="pt-3">
                                            <Button
                                                onClick={() => {
                                                    onInspectionConfirmed()
                                                    onClose()
                                                }}
                                                size="lg"
                                                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold px-8 h-12 shadow-lg shadow-green-600/25"
                                            >
                                                🔧 Iniciar Trabajo Ahora
                                            </Button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="relative w-16 h-16 mx-auto">
                                            <div className="w-16 h-16 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center animate-pulse">
                                                <Clock className="w-8 h-8" />
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-foreground">Esperando confirmación del cliente</h3>
                                            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                                                Se ha enviado una copia en tiempo real a la pantalla del cliente. Tan pronto como presione <strong>"Confirmar"</strong>, podrás comenzar.
                                            </p>
                                        </div>

                                        <div className="bg-muted/20 border border-border/50 rounded-xl p-3.5 max-w-md mx-auto text-xs text-muted-foreground space-y-1">
                                            <div className="flex justify-between font-medium">
                                                <span>Tiempo transcurrido:</span>
                                                <span className="text-blue-400 font-mono">{elapsedMinutes} min</span>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground/80 text-left">
                                                ⚠️ Si el cliente no confirma en 15 minutos, podrás iniciar el trabajo automáticamente por timeout de seguridad.
                                            </p>
                                        </div>

                                        {elapsedMinutes >= 15 && (
                                            <Button
                                                onClick={() => {
                                                    onInspectionConfirmed()
                                                    onClose()
                                                }}
                                                variant="outline"
                                                className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                                            >
                                                Continuar por Timeout (15 min)
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Checklist form */
                            <>
                                {/* Instructions Banner */}
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-start gap-2.5">
                                    <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-blue-300 leading-relaxed">
                                        Revisa el vehículo antes de iniciar. Por defecto todos los ítems están marcados como <strong>Bueno (B)</strong>. Si encuentras un daño o desgaste previo, márcalo como <strong>Regular (R)</strong> o <strong>Malo (M)</strong> para protegerte ante reclamos.
                                    </p>
                                </div>

                                {/* Summary metrics */}
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground">Resumen:</span>
                                    <span className="bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-md font-semibold">
                                        {totalItems - badCount - regularCount} Buenos
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

                                {/* Vehicle Km */}
                                <div className="bg-muted/15 border border-border/40 rounded-xl p-3 flex items-center justify-between gap-3">
                                    <label className="text-xs font-semibold text-foreground shrink-0">
                                        Kilometraje actual (opcional):
                                    </label>
                                    <input
                                        type="number"
                                        value={vehicleKm}
                                        onChange={(e) => setVehicleKm(e.target.value)}
                                        placeholder="Ej: 45200"
                                        className="w-36 bg-background/80 border border-border/50 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Accordion Categories */}
                                <div className="space-y-2.5">
                                    {INSPECTION_CATEGORIES.map((category) => {
                                        const isExpanded = expandedCategory === category.id
                                        const CatIcon = category.icon

                                        // Count non-good items in this category
                                        const issuesCount = category.items.filter(item => {
                                            const status = categoriesState[category.id]?.[item.key]?.status
                                            return status === "regular" || status === "bad"
                                        }).length

                                        return (
                                            <div
                                                key={category.id}
                                                className="border border-border/40 rounded-xl overflow-hidden bg-card/50"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedCategory(isExpanded ? "" : category.id)}
                                                    className="w-full flex items-center justify-between p-3.5 hover:bg-muted/20 transition-colors text-left"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                                                            <CatIcon className="w-4 h-4" />
                                                        </div>
                                                        <span className="text-sm font-bold text-foreground">
                                                            {category.title}
                                                        </span>
                                                        {issuesCount > 0 && (
                                                            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold">
                                                                {issuesCount} novedades
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
                                                    <div className="p-3 border-t border-border/30 bg-muted/10 space-y-2">
                                                        {category.items.map((item) => {
                                                            const itemState = categoriesState[category.id]?.[item.key] || { status: "good", notes: "" }
                                                            const status = itemState.status

                                                            return (
                                                                <div
                                                                    key={item.key}
                                                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg hover:bg-background/40 transition-colors"
                                                                >
                                                                    <span className="text-xs font-medium text-foreground">
                                                                        {item.label}
                                                                    </span>

                                                                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                                                        {/* Bueno (B) */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSetStatus(category.id, item.key, "good")}
                                                                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                                                                                status === "good"
                                                                                    ? "bg-green-500 text-white shadow-sm shadow-green-500/20"
                                                                                    : "bg-muted/40 text-muted-foreground hover:text-foreground"
                                                                            }`}
                                                                        >
                                                                            B
                                                                        </button>

                                                                        {/* Regular (R) */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSetStatus(category.id, item.key, "regular")}
                                                                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                                                                                status === "regular"
                                                                                    ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
                                                                                    : "bg-muted/40 text-muted-foreground hover:text-foreground"
                                                                            }`}
                                                                        >
                                                                            R
                                                                        </button>

                                                                        {/* Malo (M) */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSetStatus(category.id, item.key, "bad")}
                                                                            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                                                                                status === "bad"
                                                                                    ? "bg-red-500 text-white shadow-sm shadow-red-500/20"
                                                                                    : "bg-muted/40 text-muted-foreground hover:text-foreground"
                                                                            }`}
                                                                        >
                                                                            M
                                                                        </button>
                                                                    </div>

                                                                    {/* Note input if regular or bad */}
                                                                    {(status === "regular" || status === "bad") && (
                                                                        <div className="w-full sm:col-span-2 pt-1">
                                                                            <input
                                                                                type="text"
                                                                                placeholder="Describe la novedad encontrada..."
                                                                                value={itemState.notes}
                                                                                onChange={(e) => handleSetNote(category.id, item.key, e.target.value)}
                                                                                className="w-full bg-background/60 border border-amber-500/30 rounded-lg px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* General Observations */}
                                <div className="space-y-1.5 pt-1">
                                    <label className="text-xs font-semibold text-foreground">
                                        Observaciones Generales (opcional):
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={generalNotes}
                                        onChange={(e) => setGeneralNotes(e.target.value)}
                                        placeholder="Ej: Rayón menor en bómper delantero, vehículo recibido sucio por lluvia..."
                                        className="w-full bg-muted/15 border border-border/40 rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer Actions */}
                    {!isSubmitted && (
                        <div className="p-4 border-t border-border/40 bg-muted/20 flex gap-3">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="flex-1"
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleSubmitInspection}
                                disabled={isSubmitting}
                                className="flex-1 gradient-brand text-white font-bold h-11 shadow-lg shadow-blue-500/20"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Enviar al Cliente
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
