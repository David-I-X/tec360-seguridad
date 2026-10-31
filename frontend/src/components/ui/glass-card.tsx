"use client"

import { cn } from "@/lib/utils"
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
                "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0f19]/85 backdrop-blur-xl shadow-2xl transition-all duration-300",
                "hover:border-violet-500/25",
                gradient && "bg-gradient-to-br from-[#0b0f19] via-[#0b0f19]/95 to-[#111827]",
                className
            )}
            {...props}
        >
            {children}
        </motion.div>
    )
}
