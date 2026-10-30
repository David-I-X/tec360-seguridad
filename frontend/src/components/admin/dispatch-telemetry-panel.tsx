"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  Zap,
  Clock,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Layers,
  Shield,
  Loader2,
  RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { getDispatchAnalytics, getDispatchStats, DispatchAnalytics, DispatchStats } from "@/lib/api"

export function DispatchTelemetryPanel() {
  const [analytics, setAnalytics] = useState<DispatchAnalytics | null>(null)
  const [stats, setStats] = useState<DispatchStats | null>(null)
  const [days, setDays] = useState<number>(30)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const [analyticsData, statsData] = await Promise.all([
        getDispatchAnalytics(days),
        getDispatchStats()
      ])
      setAnalytics(analyticsData)
      setStats(statsData)
    } catch (error) {
      console.error("Error al cargar telemetría de despacho:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [days])

  if (isLoading && !analytics) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Cargando telemetría del motor de despacho...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Barra de Filtro de Período y Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div>
          <h4 className="text-base font-bold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Telemetría y Rendimiento del Despacho Inteligente
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Métricas de asignación por olas, velocidad de respuesta en tráfico y conversión.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border/40">
            {[7, 30, 90].map((d) => (
              <Button
                key={d}
                size="sm"
                variant={days === d ? "default" : "ghost"}
                onClick={() => setDays(d)}
                className={`h-7 px-3 text-xs font-mono rounded-lg ${
                  days === d ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"
                }`}
              >
                {d}d
              </Button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={fetchData}
            disabled={isLoading}
            className="h-8 px-2.5 rounded-xl border-border/40 text-xs font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Grid de KPIs Principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Tasa de Aceptación */}
        <div className="bg-card/70 border border-border/40 rounded-2xl p-4 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">Tasa de Aceptación</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
            {analytics?.overall_acceptance_rate ?? stats?.acceptance_rate ?? 0}%
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {stats ? `${stats.accepted_offers} aceptadas de ${stats.total_offers}` : "Ofertas confirmadas"}
          </p>
        </div>

        {/* Mediana p50 */}
        <div className="bg-card/70 border border-border/40 rounded-2xl p-4 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">Tiempo Mediano (p50)</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-cyan-400">
            {analytics?.assignment_p50_seconds !== null && analytics?.assignment_p50_seconds !== undefined
              ? `${Math.round(analytics.assignment_p50_seconds)}s`
              : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            50% asignados en este lapso
          </p>
        </div>

        {/* Percentil p95 */}
        <div className="bg-card/70 border border-border/40 rounded-2xl p-4 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">Percentil 95 (p95)</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
            {analytics?.assignment_p95_seconds !== null && analytics?.assignment_p95_seconds !== undefined
              ? `${Math.round(analytics.assignment_p95_seconds)}s`
              : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Límite de casos complejos
          </p>
        </div>

        {/* Total Servicios Despachados */}
        <div className="bg-card/70 border border-border/40 rounded-2xl p-4 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider">Servicios Despachados</span>
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-primary">
            {analytics?.total_services_dispatched ?? 0}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {analytics?.total_offers_sent ?? 0} ofertas totales enviadas
          </p>
        </div>
      </div>

      {/* Embudo de Conversión por Olas */}
      <div className="bg-card/70 border border-border/40 rounded-2xl p-5 backdrop-blur-md shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h5 className="text-sm font-bold text-foreground">
              Embudo de Asignación por Olas de Proximidad
            </h5>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-bold">
            MOTOR V2
          </span>
        </div>

        {analytics?.wave_conversion_funnel && analytics.wave_conversion_funnel.length > 0 ? (
          <div className="space-y-3">
            {analytics.wave_conversion_funnel.map((item) => (
              <div key={item.wave} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-foreground">
                    OLA {item.wave} {item.wave === 1 ? "(Radio Corto / Máx Proximidad)" : item.wave === 2 ? "(Radio Medio)" : "(Expansión Completa)"}
                  </span>
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">{item.accepted_count}</strong> aceptados ({item.percentage}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-muted/40 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      item.wave === 1
                        ? "bg-emerald-500"
                        : item.wave === 2
                        ? "bg-blue-500"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.max(4, Math.min(100, item.percentage))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Aún no hay suficientes ofertas de despacho registradas en el período seleccionado.
          </div>
        )}
      </div>

      {/* Distribución por Tipo de Servicio */}
      {analytics?.by_service_type && Object.keys(analytics.by_service_type).length > 0 && (
        <div className="bg-card/70 border border-border/40 rounded-2xl p-5 backdrop-blur-md shadow-sm space-y-3">
          <h5 className="text-sm font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Distribución de Demanda por Línea Operativa
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(analytics.by_service_type).map(([key, count]: [string, any]) => (
              <div key={key} className="p-3 rounded-xl bg-muted/20 border border-border/20 flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground uppercase truncate">
                  {key.replace(/_/g, " ")}
                </span>
                <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                  {count} ops
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
