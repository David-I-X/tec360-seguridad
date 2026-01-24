"use client"

import { motion } from "framer-motion"
import { Check, Shield, MapPin, Video, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ServiceType {
    id: string
    label: string
    icon: React.ElementType
    color: string
}

const services: ServiceType[] = [
    { id: "installation_cctv", label: "Cámaras (CCTV)", icon: Video, color: "bg-blue-500" },
    { id: "installation_alarm", label: "Alarmas", icon: AlertTriangle, color: "bg-red-500" },
    { id: "installation_gps", label: "GPS Vehicular", icon: MapPin, color: "bg-green-500" },
    { id: "maintenance_cctv", label: "Mant. Cámaras", icon: Shield, color: "bg-blue-400" },
    { id: "maintenance_alarm", label: "Mant. Alarmas", icon: Shield, color: "bg-red-400" },
    { id: "maintenance_gps", label: "Mant. GPS", icon: Shield, color: "bg-green-400" },
]

interface ServiceTypeSelectorProps {
    selected: string
    onChange: (value: string) => void
}

export function ServiceTypeSelector({ selected, onChange }: ServiceTypeSelectorProps) {
    return (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {services.map((item) => {
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
                            "relative flex flex-col items-center justify-center gap-3 rounded-xl border p-4 text-center transition-colors",
                            "border-muted bg-card hover:bg-accent/50",
                            isSelected && "border-primary ring-1 ring-primary bg-accent"
                        )}
                    >
                        {isSelected && (
                            <div className="absolute right-2 top-2 rounded-full bg-primary p-0.5 text-primary-foreground">
                                <Check className="h-3 w-3" />
                            </div>
                        )}

                        <div className={cn("rounded-full p-3 text-white shadow-lg", item.color)}>
                            <Icon className="h-6 w-6" />
                        </div>

                        <span className="text-sm font-medium leading-none">
                            {item.label}
                        </span>
                    </motion.button>
                )
            })}
        </div>
    )
}
