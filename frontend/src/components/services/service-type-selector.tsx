"use client"

import { motion } from "framer-motion"
import {
    Check,
    Shield,
    MapPin,
    Video,
    AlertTriangle,
    Droplets,
    Disc,
    BatteryCharging,
    OctagonAlert,
    Link2,
    Lightbulb,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface ServiceType {
    id: string
    label: string
    subtitle?: string
    icon: React.ElementType
    color: string
}

const installationServices: ServiceType[] = [
    { id: "camera_installation", label: "Dashcam Vehicular", subtitle: "Instalación nueva", icon: Video, color: "bg-violet-600 text-white" },
    { id: "alarm_installation", label: "Alarmas", subtitle: "Instalación nueva", icon: AlertTriangle, color: "bg-rose-600 text-white" },
    { id: "gps_installation", label: "GPS Satelital", subtitle: "Instalación nueva", icon: MapPin, color: "bg-cyan-600 text-white" },
    { id: "camera_maintenance", label: "Mant. Dashcam", subtitle: "Revisión técnica", icon: Shield, color: "bg-violet-500/80 text-white" },
    { id: "alarm_maintenance", label: "Mant. Alarmas", subtitle: "Revisión técnica", icon: Shield, color: "bg-rose-500/80 text-white" },
    { id: "gps_maintenance", label: "Mant. GPS", subtitle: "Revisión técnica", icon: Shield, color: "bg-cyan-500/80 text-white" },
]

const quickMechanicsServices: ServiceType[] = [
    { id: "oil_change", label: "Cambio de Aceite", subtitle: "Aceite + filtro (< 45 min)", icon: Droplets, color: "bg-amber-500 text-white" },
    { id: "tire_change", label: "Cambio de Llantas", subtitle: "Desvare / repuesto (< 30 min)", icon: Disc, color: "bg-orange-500 text-white" },
    { id: "battery_service", label: "Batería / Corriente", subtitle: "Inicio o reemplazo (< 30 min)", icon: BatteryCharging, color: "bg-emerald-500 text-white" },
    { id: "brake_service", label: "Pastillas de Freno", subtitle: "Cambio y ajuste (< 1 hora)", icon: OctagonAlert, color: "bg-rose-500 text-white" },
    { id: "chain_kit_service", label: "Kit de Arrastre", subtitle: "Cadena moto (< 45 min)", icon: Link2, color: "bg-violet-500 text-white" },
    { id: "spark_bulbs_wipers", label: "Bujías y Bombillos", subtitle: "Luces / plumillas (< 30 min)", icon: Lightbulb, color: "bg-amber-400 text-slate-950" },
]

interface ServiceTypeSelectorProps {
    selected: string
    onChange: (value: string) => void
    category?: "installations" | "mechanics"
    suppliesProvider?: "client" | "technician"
    onSuppliesProviderChange?: (value: "client" | "technician") => void
    suppliesNotes?: string
    onSuppliesNotesChange?: (value: string) => void
}

export function ServiceTypeSelector({
    selected,
    onChange,
    category = "installations",
    suppliesProvider = "client",
    onSuppliesProviderChange,
    suppliesNotes = "",
    onSuppliesNotesChange,
}: ServiceTypeSelectorProps) {
    const items = category === "mechanics" ? quickMechanicsServices : installationServices

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                {items.map((item) => {
                    const isSelected = selected === item.id
                    const Icon = item.icon

                    return (
                        <motion.button
                            key={item.id}
                            type="button"
                            onClick={() => onChange(item.id)}
                            whileHover={{ scale: 1.015 }}
                            whileTap={{ scale: 0.985 }}
                            className={cn(
                                "relative flex flex-col items-center justify-center gap-2.5 rounded-xl border p-4 text-center transition-all duration-200 cursor-pointer",
                                "border-white/[0.08] bg-[#0B0F19]/90 backdrop-blur-md hover:border-white/20 hover:bg-[#111827]/70",
                                isSelected && (category === "mechanics"
                                    ? "border-amber-500/80 ring-1 ring-amber-500/50 bg-amber-500/10 text-amber-300"
                                    : "border-violet-500/80 ring-1 ring-violet-500/50 bg-violet-500/10 text-violet-300")
                            )}
                        >
                            {isSelected && (
                                <div className={cn(
                                    "absolute right-2.5 top-2.5 rounded-full p-0.5",
                                    category === "mechanics" ? "bg-amber-500 text-slate-950" : "bg-violet-500 text-white"
                                )}>
                                    <Check className="h-3 w-3" />
                                </div>
                            )}

                            <div className={cn("rounded-xl p-3 shadow-md", item.color)}>
                                <Icon className="h-5 w-5" />
                            </div>

                            <div className="space-y-1">
                                <span className="block text-xs sm:text-sm font-bold font-display text-white leading-tight">
                                    {item.label}
                                </span>
                                {item.subtitle && (
                                    <span className="block text-[11px] font-mono text-slate-400 leading-tight">
                                        {item.subtitle}
                                    </span>
                                )}
                            </div>
                        </motion.button>
                    )
                })}
            </div>

            {category === "mechanics" && (
                <div className="p-4 sm:p-5 rounded-xl border border-amber-500/25 bg-amber-500/5 backdrop-blur-md space-y-4">
                    <div>
                        <p className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2.5">
                          Telemetría de Repuestos · ¿Quién suministra el insumo?
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => onSuppliesProviderChange?.("client")}
                                className={cn(
                                    "flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer",
                                    suppliesProvider === "client"
                                        ? "border-amber-500 bg-amber-500/15 text-amber-300"
                                        : "border-white/[0.08] hover:border-amber-500/40 bg-[#0B0F19]/80 text-slate-400"
                                )}
                            >
                                <span className="text-2xl shrink-0">🧰</span>
                                <div>
                                    <p className="text-xs sm:text-sm font-bold text-white font-display">Ya tengo el repuesto / insumo</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Solo requiero la mano de obra del técnico certificado</p>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => onSuppliesProviderChange?.("technician")}
                                className={cn(
                                    "flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer",
                                    suppliesProvider === "technician"
                                        ? "border-amber-500 bg-amber-500/15 text-amber-300"
                                        : "border-white/[0.08] hover:border-amber-500/40 bg-[#0B0F19]/80 text-slate-400"
                                )}
                            >
                                <span className="text-2xl shrink-0">🚚</span>
                                <div>
                                    <p className="text-xs sm:text-sm font-bold text-white font-display">El técnico debe suministrarlo</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">El técnico cotizará e incluirá el repuesto homologado</p>
                                </div>
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wide block mb-1.5">
                            Referencia del repuesto / lubricante / medida <span className="text-slate-500 normal-case font-normal">(opcional)</span>
                        </label>
                        <Input
                            placeholder="Ej: Aceite 10W-40 sintético Motul, Llanta 205/55 R16, Batería 60Ah..."
                            value={suppliesNotes}
                            onChange={(e) => onSuppliesNotesChange?.(e.target.value)}
                            className="bg-[#111827]/80 border-white/[0.12] text-white font-mono text-xs rounded-xl"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
