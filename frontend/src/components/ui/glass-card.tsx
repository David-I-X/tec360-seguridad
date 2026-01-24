"use client"

import { cn } from "@/lib/utils"
// Importamos motion para permitir animaciones futuras si es necesario
// aunque por ahora es un wrapper de estilo
import { HTMLMotionProps, motion } from "framer-motion"

interface GlassCardProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode
    className?: string
    gradient?: boolean
}

export function GlassCard({ children, className, gradient = false, ...props }: GlassCardProps) {
    return (
        <motion.div
            className={cn(
                "relative overflow-hidden rounded-xl border border-white/20 bg-white/10 backdrop-blur-md shadow-xl",
                "dark:bg-black/20 dark:border-white/10",
                gradient && "bg-gradient-to-br from-white/10 to-white/5",
                className
            )}
            {...props}
        >
            {/* Optional: Noise texture or subtle gradient overlay could go here */}
            {children}
        </motion.div>
    )
}
