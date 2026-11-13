"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Zap, Clock, MapPin, Car, CheckCircle2, XCircle, Loader2, Calendar, Camera, MessageSquare, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DispatchOffer } from "@/lib/api"
import { getImageUrl } from "@/lib/utils"
import { getClientObservations } from "@/lib/service-utils"

interface DispatchOffersBannerProps {
  offers: DispatchOffer[]
  onAccept: (offerId: string) => Promise<void>
  onReject: (offerId: string) => Promise<void>
  isProcessing: boolean
}

export function DispatchOffersBanner({
  offers,
  onAccept,
  onReject,
  isProcessing
}: DispatchOffersBannerProps) {
  // Manejo de temporizador en segundos para cada oferta activa
  const [countdowns, setCountdowns] = useState<Record<string, number>>({})
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null)

  useEffect(() => {
    // Inicializar segundos de cada oferta
    const initialTimers: Record<string, number> = {}
    offers.forEach(o => {
      const remaining = o.time_left_seconds !== undefined && o.time_left_seconds !== null 
        ? Math.max(0, o.time_left_seconds)
        : 60
      initialTimers[o.id] = remaining
    })
    setCountdowns(initialTimers)

    const interval = setInterval(() => {
      setCountdowns(prev => {
        const next: Record<string, number> = {}
        let hasChanges = false
        Object.keys(prev).forEach(id => {
          const current = prev[id]
          const newVal = current > 0 ? current - 1 : 0
          next[id] = newVal
          if (newVal !== current) hasChanges = true
        })
        return hasChanges ? next : prev
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [offers])

  const pendingOffers = offers.filter(o => o.status === "pending" && (countdowns[o.id] ?? 1) > 0)

  if (pendingOffers.length === 0) {
    return null
  }

  return (
    <div className="space-y-3 w-full">
      <AnimatePresence>
        {pendingOffers.map((offer) => {
          const secondsLeft = countdowns[offer.id] ?? (offer.time_left_seconds || 60)
          const isUrgent = secondsLeft <= 15
          const formattedPrice = offer.estimated_price
            ? new Intl.NumberFormat("es-CO", {
                style: "currency",
                currency: "COP",
                maximumFractionDigits: 0
              }).format(offer.estimated_price)
            : null

          return (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className={`relative overflow-hidden rounded-2xl border p-5 backdrop-blur-xl shadow-2xl transition-all ${
                isUrgent
                  ? "bg-rose-950/80 border-rose-500/60 shadow-rose-950/50 animate-pulse"
                  : "bg-slate-950/90 border-amber-500/60 shadow-amber-950/30"
              }`}
            >
              {/* Barra de progreso superior indicando tiempo restante */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-800">
                <div
                  className={`h-full transition-all duration-1000 ${
                    isUrgent ? "bg-rose-500" : "bg-amber-400"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, (secondsLeft / 60) * 100))}%` }}
                />
              </div>

              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                {/* Lado izquierdo: Info de la Misión y Ola */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold tracking-wider bg-amber-500 text-slate-950 shadow-md">
                      <Zap className="h-3.5 w-3.5 fill-current" />
                      MISIÓN PRIORITARIA DIRECTA
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border border-white/20 bg-slate-800/80 text-white">
                      OLA {offer.wave} {offer.wave === 1 ? "· MÁXIMA PROXIMIDAD" : ""}
                    </span>
                    {offer.distance_km !== null && offer.distance_km !== undefined && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono bg-blue-950/80 text-blue-300 border border-blue-500/30">
                        <MapPin className="h-3 w-3" />
                        a {offer.distance_km.toFixed(1)} km
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                      {offer.service_title || "Servicio Táctico Asignado"}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-1.5 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">
                        {offer.service_address || "Medellín, Antioquia"}
                        {offer.service_city ? `, ${offer.service_city}` : ""}
                      </span>
                    </p>
                  </div>

                  {/* Datos del vehículo, horario y precio */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono pt-1">
                    {(offer.vehicle_model || offer.vehicle_plate) && (
                      <span className="inline-flex items-center gap-1.5 text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-white/10">
                        <Car className="h-3.5 w-3.5 text-blue-400" />
                        {offer.vehicle_model ? `${offer.vehicle_model.toUpperCase()} · ` : ""}
                        <strong className="text-white">
                          {offer.vehicle_plate ? offer.vehicle_plate.toUpperCase() : "REGISTRADO"}
                        </strong>
                      </span>
                    )}
                    {offer.scheduled_date && (
                      <span className="inline-flex items-center gap-1.5 text-slate-200 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-white/10">
                        <Calendar className="h-3.5 w-3.5 text-amber-400" />
                        {format(new Date(offer.scheduled_date), "d MMM · h:mm a", { locale: es })}
                      </span>
                    )}
                    {formattedPrice && (
                      <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-lg">
                        {formattedPrice}
                      </span>
                    )}
                  </div>

                  {/* Observaciones destacadas + Foto del cliente */}
                  {(() => {
                    const obs = getClientObservations({
                      description: offer.service_description,
                      client_notes: offer.client_notes,
                      service_metadata: offer.service_metadata,
                    })
                    const photoUrl = offer.vehicle_photo_url ? getImageUrl(offer.vehicle_photo_url) : ""
                    if (!obs.primary && !photoUrl) return null
                    return (
                      <div className="mt-2 flex flex-col sm:flex-row gap-2.5 items-stretch">
                        {obs.primary && (
                          <div className="flex-1 p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-xs">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 mb-0.5">
                              <MessageSquare className="h-3 w-3" />
                              Observaciones del cliente
                            </span>
                            <p className="text-slate-100 leading-snug line-clamp-3 font-medium">
                              {obs.primary}
                            </p>
                            {obs.notes && (
                              <p className="text-amber-200/90 text-[11px] mt-1">Nota: {obs.notes}</p>
                            )}
                          </div>
                        )}
                        {photoUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewPhotoUrl(photoUrl)}
                            className="group relative w-full sm:w-24 h-20 rounded-xl overflow-hidden border border-amber-400/40 bg-slate-900 shrink-0 cursor-pointer"
                            title="Ampliar foto enviada por el cliente"
                          >
                            <img src={photoUrl} alt="Foto del cliente" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <span className="absolute inset-x-0 bottom-0 bg-slate-950/80 text-[10px] font-mono text-amber-300 py-0.5 px-1 flex items-center justify-center gap-1">
                              <Camera className="h-3 w-3" /> Ver foto
                            </span>
                          </button>
                        )}
                      </div>
                    )
                  })()}
                </div>

                {/* Lado derecho: Contador regresivo y botones de acción */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
                  {/* Cronómetro visual */}
                  <div
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-mono font-black text-sm shrink-0 ${
                      isUrgent
                        ? "bg-rose-900/60 border-rose-500 text-rose-200 animate-bounce"
                        : "bg-slate-900/90 border-amber-500/50 text-amber-300"
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                    <span>{secondsLeft}s restantes</span>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2">
                    <Button
                      disabled={isProcessing}
                      onClick={() => onReject(offer.id)}
                      variant="outline"
                      className="flex-1 sm:flex-none border-white/20 bg-slate-900/80 hover:bg-rose-950 hover:border-rose-500/50 text-slate-300 hover:text-rose-200 text-xs font-mono h-11 px-4 rounded-xl"
                    >
                      <XCircle className="h-4 w-4 mr-1.5 text-slate-400" />
                      Declinar
                    </Button>

                    <Button
                      disabled={isProcessing}
                      onClick={() => onAccept(offer.id)}
                      className="flex-1 sm:flex-none bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs font-mono h-11 px-6 rounded-xl shadow-lg shadow-amber-500/30 gap-2"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-slate-950" />
                      )}
                      ACEPTAR MISIÓN
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div className="relative max-w-2xl w-full rounded-2xl overflow-hidden bg-slate-950 border border-white/15 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-slate-900/90 text-white hover:bg-slate-800 border border-white/15 cursor-pointer"
              aria-label="Cerrar vista previa"
            >
              <X className="h-4 w-4" />
            </button>
            <img src={previewPhotoUrl} alt="Foto del vehículo enviada por el cliente" className="w-full max-h-[80vh] object-contain bg-black" />
          </div>
        </div>
      )}
    </div>
  )
}
