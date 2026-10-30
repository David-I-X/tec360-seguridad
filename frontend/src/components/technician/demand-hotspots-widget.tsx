"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Flame, MapPin, TrendingUp, ChevronDown, ChevronUp, AlertCircle } from "lucide-react"
import { DemandHotspot } from "@/lib/api"
import { Button } from "@/components/ui/button"

interface DemandHotspotsWidgetProps {
  hotspots: DemandHotspot[]
}

export function DemandHotspotsWidget({ hotspots }: DemandHotspotsWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!hotspots || hotspots.length === 0) {
    return null
  }

  const displayedHotspots = isExpanded ? hotspots : hotspots.slice(0, 3)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-amber-500/30 bg-slate-950/70 backdrop-blur-md p-4 overflow-hidden"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Zonas de Alta Demanda · Valle de Aburrá
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                EN VIVO
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Posiciónate cerca de estos sectores para recibir ofertas prioritarias inmediatas
            </p>
          </div>
        </div>

        {hotspots.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-mono text-amber-400 hover:text-amber-300 hover:bg-amber-950/30 gap-1 h-7 px-2"
          >
            {isExpanded ? (
              <>
                Menos <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Ver todas ({hotspots.length}) <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {displayedHotspots.map((spot, idx) => {
          const isHigh = spot.urgency_level === "high"
          return (
            <div
              key={idx}
              className={`p-3 rounded-xl border transition-all ${
                isHigh
                  ? "bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50"
                  : "bg-slate-900/40 border-amber-500/20 hover:border-amber-500/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                  <MapPin className={`h-3.5 w-3.5 shrink-0 ${isHigh ? "text-rose-400" : "text-amber-400"}`} />
                  {spot.zone_name}
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 font-bold ${
                    isHigh
                      ? "bg-rose-950/70 text-rose-300 border-rose-500/40"
                      : "bg-amber-950/70 text-amber-300 border-amber-500/40"
                  }`}
                >
                  {spot.active_requests_count} en cola
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
                {spot.recommendation}
              </p>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
