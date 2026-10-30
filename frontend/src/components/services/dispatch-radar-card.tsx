"use client"

import { motion } from "framer-motion"
import { Radio, ShieldAlert, Zap, Navigation, Clock, CheckCircle } from "lucide-react"

interface DispatchRadarCardProps {
  service: any
}

export function DispatchRadarCard({ service }: DispatchRadarCardProps) {
  const isRecovery = service?.service_type === "vehicle_recovery"

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 border backdrop-blur-xl shadow-lg transition-all ${
        isRecovery
          ? "bg-gradient-to-br from-rose-950/40 via-slate-900/80 to-slate-950 border-rose-500/50 shadow-rose-950/40"
          : "bg-gradient-to-br from-blue-950/30 via-slate-900/80 to-slate-950 border-blue-500/40 shadow-blue-950/30"
      }`}
    >
      {/* Luz ambiental de fondo */}
      <div
        className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-20 ${
          isRecovery ? "bg-rose-500" : "bg-blue-500"
        }`}
      />

      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* Animación del Radar Concéntrico */}
        <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
          {/* Onda 3 externa */}
          <motion.div
            animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeOut" }}
            className={`absolute inset-0 rounded-full border ${
              isRecovery ? "border-rose-500" : "border-blue-400"
            }`}
          />
          {/* Onda 2 media */}
          <motion.div
            animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, delay: 0.8, ease: "easeOut" }}
            className={`absolute inset-2 rounded-full border ${
              isRecovery ? "border-rose-400" : "border-cyan-400"
            }`}
          />
          {/* Núcleo central pulsante */}
          <div
            className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full shadow-lg ${
              isRecovery
                ? "bg-rose-600 text-white shadow-rose-600/50"
                : "bg-blue-600 text-white shadow-blue-600/50"
            }`}
          >
            {isRecovery ? (
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            ) : (
              <Radio className="w-6 h-6 animate-pulse" />
            )}
          </div>
        </div>

        {/* Información de despacho */}
        <div className="flex-1 text-center sm:text-left space-y-1.5">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase border ${
                isRecovery
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : "bg-blue-500/20 text-blue-300 border-blue-500/40"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full animate-ping ${
                  isRecovery ? "bg-rose-400" : "bg-blue-400"
                }`}
              />
              {isRecovery ? "DESPACHO DE EMERGENCIA 24/7" : "DESPACHADOR INTELIGENTE ACTIVO"}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10 font-bold">
              OLAS DE ASIGNACIÓN V2
            </span>
          </div>

          <h3 className="text-sm sm:text-base font-bold text-white">
            {isRecovery
              ? "Localizando Unidad de Reacción Más Cercana"
              : "Buscando al Especialista Óptimo en tu Zona"}
          </h3>

          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            {isRecovery
              ? "Prioridad máxima activada. El algoritmo contacta motorizados tácticos a menos de 5 km para respuesta de emergencia inmediata."
              : "El motor de despacho evalúa proximidad satelital, calificación de clientes y congestión de tráfico para notificarte la asignación."}
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Notificación prioritaria en curso
            </span>
            <span className="flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-cyan-400" />
              Valle de Aburrá
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
