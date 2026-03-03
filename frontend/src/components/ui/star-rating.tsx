"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
    value: number
    onChange?: (value: number) => void
    readonly?: boolean
    size?: "sm" | "md" | "lg"
    showLabel?: boolean
    className?: string
}

const LABELS = ["", "Muy malo", "Malo", "Regular", "Bueno", "¡Excelente!"]

const SIZE_MAP = {
    sm: "w-4 h-4",
    md: "w-7 h-7",
    lg: "w-11 h-11",
}

export function StarRating({
    value,
    onChange,
    readonly = false,
    size = "md",
    showLabel = false,
    className,
}: StarRatingProps) {
    const [hovered, setHovered] = useState(0)
    const active = hovered || value

    return (
        <div className={cn("flex flex-col items-center gap-2", className)}>
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <motion.button
                        key={star}
                        type="button"
                        disabled={readonly}
                        whileHover={!readonly ? { scale: 1.15 } : undefined}
                        whileTap={!readonly ? { scale: 0.9 } : undefined}
                        onClick={() => !readonly && onChange?.(star)}
                        onMouseEnter={() => !readonly && setHovered(star)}
                        onMouseLeave={() => !readonly && setHovered(0)}
                        className={cn(
                            "transition-colors p-0.5",
                            readonly ? "cursor-default" : "cursor-pointer"
                        )}
                    >
                        <Star
                            className={cn(
                                SIZE_MAP[size],
                                "transition-colors duration-150",
                                star <= active
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted-foreground/25"
                            )}
                        />
                    </motion.button>
                ))}
            </div>
            {showLabel && !readonly && (
                <motion.p
                    key={hovered || value}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm font-medium text-amber-400 h-5"
                >
                    {LABELS[hovered || value]}
                </motion.p>
            )}
        </div>
    )
}

/**
 * Read-only row of stars + numeric value. Compact.
 */
export function StarDisplay({
    rating,
    count,
    size = "sm",
    className,
}: {
    rating: number
    count?: number
    size?: "sm" | "md"
    className?: string
}) {
    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={cn(
                            size === "sm" ? "w-3.5 h-3.5" : "w-4.5 h-4.5",
                            star <= Math.round(rating)
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/25"
                        )}
                    />
                ))}
            </div>
            <span className="text-sm font-semibold">{rating.toFixed(1)}</span>
            {count !== undefined && (
                <span className="text-xs text-muted-foreground">({count})</span>
            )}
        </div>
    )
}
