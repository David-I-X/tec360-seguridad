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
    { id: "camera_installation", label: "Dashcam Vehicular", subtitle: "Instalación nueva", icon: Video, color: "bg-blue-500" },
    { id: "alarm_installation", label: "Alarmas", subtitle: "Instalación nueva", icon: AlertTriangle, color: "bg-red-500" },
    { id: "gps_installation", label: "GPS Vehicular", subtitle: "Instalación nueva", icon: MapPin, color: "bg-green-500" },
    { id: "camera_maintenance", label: "Mant. Dashcam", subtitle: "Revisión técnica", icon: Shield, color: "bg-blue-400" },
    { id: "alarm_maintenance", label: "Mant. Alarmas", subtitle: "Revisión técnica", icon: Shield, color: "bg-red-400" },
    { id: "gps_maintenance", label: "Mant. GPS", subtitle: "Revisión técnica", icon: Shield, color: "bg-green-400" },
]

const quickMechanicsServices: ServiceType[] = [
    { id: "oil_change", label: "Cambio de Aceite", subtitle: "Aceite + filtro (< 45 min)", icon: Droplets, color: "bg-amber-500" },
    { id: "tire_change", label: "Cambio de Llantas", subtitle: "Desvare / repuesto (< 30 min)", icon: Disc, color: "bg-orange-500" },
    { id: "battery_service", label: "Batería / Corriente", subtitle: "Inicio o reemplazo (< 30 min)", icon: BatteryCharging, color: "bg-emerald-500" },
    { id: "brake_service", label: "Pastillas de Freno", subtitle: "Cambio y ajuste (< 1 hora)", icon: OctagonAlert, color: "bg-rose-500" },
    { id: "chain_kit_service", label: "Kit de Arrastre", subtitle: "Cadena moto (< 45 min)", icon: Link2, color: "bg-purple-500" },
    { id: "spark_bulbs_wipers", label: "Bujías y Bombillos", subtitle: "Luces / plumillas (< 30 min)", icon: Lightbulb, color: "bg-yellow-500" },
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
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {items.map((item) => {
                    const isSelected = selected === item.id
                    const Icon = item.icon

                    return (
                        <motion.button
                            key={item.id}
                            type="button"
                            onClick={() => onChange(item.id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                                "relative flex flex-col items-center justify-center gap-2.5 rounded-xl border p-4 text-center transition-colors",
                                "border-muted bg-card hover:bg-accent/50",
                                isSelected && (category === "mechanics"
                                    ? "border-amber-500 ring-1 ring-amber-500 bg-amber-500/10"
                                    : "border-primary ring-1 ring-primary bg-accent")
                            )}
                        >
                            {isSelected && (
                                <div className={cn(
                                    "absolute right-2 top-2 rounded-full p-0.5 text-white",
                                    category === "mechanics" ? "bg-amber-500" : "bg-primary text-primary-foreground"
                                )}>
                                    <Check className="h-3 w-3" />
                                </div>
                            )}

                            <div className={cn("rounded-full p-3 text-white shadow-lg", item.color)}>
                                <Icon className="h-6 w-6" />
                            </div>

                            <div className="space-y-1">
                                <span className="block text-sm font-semibold leading-tight">
                                    {item.label}
                                </span>
                                {item.subtitle && (
                                    <span className="block text-[11px] text-muted-foreground leading-tight">
                                        {item.subtitle}
                                    </span>
                                )}
                            </div>
                        </motion.button>
                    )
                })}
            </div>

            {category === "mechanics" && (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-4">
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
                            ¿Quién suministra el repuesto o insumo?
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => onSuppliesProviderChange?.("client")}
                                className={cn(
                                    "flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all",
                                    suppliesProvider === "client"
                                        ? "border-amber-500 bg-amber-500/10 text-amber-400"
                                        : "border-muted hover:border-amber-500/40 bg-background/60"
                                )}
                            >
                                <span className="text-2xl shrink-0">🧰</span>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Ya tengo el repuesto</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Solo requiero la mano de obra del técnico</p>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => onSuppliesProviderChange?.("technician")}
                                className={cn(
                                    "flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all",
                                    suppliesProvider === "technician"
                                        ? "border-amber-500 bg-amber-500/10 text-amber-400"
                                        : "border-muted hover:border-amber-500/40 bg-background/60"
                                )}
                            >
                                <span className="text-2xl shrink-0">🚚</span>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">El técnico debe llevarlo</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">El técnico cotizará e incluirá el insumo</p>
                                </div>
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                            Referencia del repuesto / aceite / medida <span className="normal-case font-normal">(opcional)</span>
                        </label>
                        <Input
                            placeholder="Ej: Aceite 10W-40 sintético, Llanta 205/55 R16, Batería 60Ah..."
                            value={suppliesNotes}
                            onChange={(e) => onSuppliesNotesChange?.(e.target.value)}
                            className="bg-background"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
