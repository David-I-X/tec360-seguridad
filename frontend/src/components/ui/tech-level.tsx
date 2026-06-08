"use client"

import { Star } from "lucide-react"

const RANK_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string; border: string }> = {
    bronze: { label: "Bronce", emoji: "🥉", color: "text-amber-700", bg: "bg-amber-700/10", border: "border-amber-700/30" },
    silver: { label: "Plata", emoji: "🥈", color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/30" },
    gold: { label: "Oro", emoji: "🥇", color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
    elite: { label: "Élite", emoji: "👑", color: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-400/30" },
}

interface TechLevelProps {
    rank?: string
    points?: number
    rating?: number
    totalServices?: number
    size?: "sm" | "md" | "lg"
    showPoints?: boolean
    showStars?: boolean
}

export function TechLevel({
    rank = "bronze",
    points = 0,
    rating = 0,
    totalServices = 0,
    size = "md",
    showPoints = false,
    showStars = true,
}: TechLevelProps) {
    const config = RANK_CONFIG[rank] || RANK_CONFIG.bronze

    const badgeSizes = {
        sm: "text-[10px] px-1.5 py-0.5 gap-1",
        md: "text-xs px-2 py-0.5 gap-1",
        lg: "text-sm px-3 py-1 gap-1.5",
    }

    const starSizes = { sm: "h-2.5 w-2.5", md: "h-3 w-3", lg: "h-3.5 w-3.5" }

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Rank badge */}
            <span className={`inline-flex items-center font-bold rounded-full border ${config.bg} ${config.color} ${config.border} ${badgeSizes[size]}`}>
                <span>{config.emoji}</span>
                <span>{config.label}</span>
            </span>

            {/* Stars */}
            {showStars && rating > 0 && (
                <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                        <Star
                            key={s}
                            className={`${starSizes[size]} ${s <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}`}
                        />
                    ))}
                    <span className={`ml-1 font-semibold ${size === "sm" ? "text-[10px]" : "text-xs"} text-muted-foreground`}>
                        {rating.toFixed(1)}
                    </span>
                </div>
            )}

            {/* Points */}
            {showPoints && (
                <span className={`font-mono font-bold ${size === "sm" ? "text-[10px]" : "text-xs"} ${config.color}`}>
                    {points} pts
                </span>
            )}

            {/* Services count */}
            {totalServices > 0 && (
                <span className={`${size === "sm" ? "text-[10px]" : "text-xs"} text-muted-foreground`}>
                    · {totalServices} servicios
                </span>
            )}
        </div>
    )
}

/** Returns the rank border color for avatar glow */
export function getRankGlowClass(rank?: string): string {
    switch (rank) {
        case "elite": return "ring-violet-400/50"
        case "gold": return "ring-yellow-500/50"
        case "silver": return "ring-slate-400/40"
        default: return "ring-amber-700/30"
    }
}
