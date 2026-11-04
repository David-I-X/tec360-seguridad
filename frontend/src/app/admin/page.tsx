"use client"

import { useEffect, useState } from "react"
import {
    Users, CheckCircle,
    BarChart3, Clock, Lock,
    ChevronRight, AlertTriangle, ShieldCheck, Download, RefreshCw
} from "lucide-react"
import api, { getDispatchAnalytics, DispatchAnalytics } from "@/lib/api"
import Link from "next/link"
import { toast } from "react-hot-toast"

interface AdminStats {
    users: {
        clients: number
        technicians: number
        reaction_team: number
        total: number
        pending_verifications?: number
        unverified_technicians?: number
    }
    services: {
        total: number
        completed: number
        active?: number
        completion_rate: string
        by_status: Record<string, number>
    }
    revenue: {
        total: number
        average_ticket: number
        currency: string
        gross_volume?: number
        escrow_active?: number
        month_income?: number
        month_expenses?: number
        month_net_profit?: number
        accounting_connected?: boolean
    }
    recovery: {
        total: number
        active: number
    }
    quick_mechanics?: {
        total: number
        active: number
    }
    installations?: {
        total: number
        active: number
    }
}

interface TimelineEntry {
    week: string
    services: number
    revenue: number
}

interface RecentServiceItem {
    id: string
    title: string
    service_type: string
    status: string
    service_address: string
    estimated_price: number | null
    vehicle_plate: string | null
    client_name: string | null
    technician_name: string | null
    created_at: string
}

function formatCOP(amount: number): string {
    if (amount >= 1_000_000) {
        return `$${(amount / 1_000_000).toFixed(1)}M COP`
    }
    return `$${Math.round(amount).toLocaleString("es-CO")} COP`
}

export default function AdminOverview() {
    const [stats, setStats] = useState<AdminStats | null>(null)
    const [timeline, setTimeline] = useState<TimelineEntry[]>([])
    const [recentServices, setRecentServices] = useState<RecentServiceItem[]>([])
    const [dispatchAnalytics, setDispatchAnalytics] = useState<DispatchAnalytics | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const fetchAll = async () => {
        try {
            const [statsRes, timelineRes, servicesRes, dispatchRes] = await Promise.allSettled([
                api.get("/admin/stats"),
                api.get("/admin/stats/timeline?weeks=12"),
                api.get("/admin/services?limit=6"),
                getDispatchAnalytics(30),
            ])
            if (statsRes.status === "fulfilled") setStats(statsRes.value.data)
            if (timelineRes.status === "fulfilled") setTimeline(timelineRes.value.data.timeline || [])
            if (servicesRes.status === "fulfilled") setRecentServices(servicesRes.value.data.items || [])
            if (dispatchRes.status === "fulfilled") setDispatchAnalytics(dispatchRes.value)
        } catch (error) {
            console.error("Error fetching admin stats:", error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchAll()
    }, [])

    if (loading) {
        return (
            <div className="flex h-80 flex-col items-center justify-center space-y-3 font-mono">
                <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                <p className="text-xs text-slate-400 uppercase tracking-wider">
                    Sincronizando métricas ejecutivas y custodia Escrow...
                </p>
            </div>
        )
    }

    const m: AdminStats = stats || {
        users: { total: 0, clients: 0, technicians: 0, reaction_team: 0, pending_verifications: 0 },
        services: { total: 0, completed: 0, active: 0, completion_rate: "0%", by_status: {} },
        revenue: { total: 0, average_ticket: 0, currency: "COP", gross_volume: 0, escrow_active: 0, accounting_connected: false },
        recovery: { total: 0, active: 0 },
        quick_mechanics: { total: 0, active: 0 },
        installations: { total: 0, active: 0 },
    }

    const activeServicesCount =
        m.services.active ??
        Object.entries(m.services.by_status || {})
            .filter(([st]) => !["completed", "confirmed", "cancelled"].includes(st))
            .reduce((acc, [, count]) => acc + count, 0)

    const totalServicesCount = Math.max(m.services.total, 0)
    const recoveryTotal = m.recovery?.total ?? 0
    const mechanicsTotal = m.quick_mechanics?.total ?? 0
    const installationsTotal = m.installations?.total ?? Math.max(0, totalServicesCount - recoveryTotal - mechanicsTotal)

    const instSharePct = totalServicesCount > 0 ? Math.round((installationsTotal / totalServicesCount) * 100) : 0
    const reacSharePct = totalServicesCount > 0 ? Math.round((recoveryTotal / totalServicesCount) * 100) : 0
    const mecSharePct = totalServicesCount > 0 ? Math.max(0, 100 - instSharePct - reacSharePct) : 0

    const grossVolume = m.revenue.gross_volume ?? m.revenue.total ?? 0
    const escrowActive = m.revenue.escrow_active ?? 0
    const avgTicket = m.revenue.average_ticket > 0 ? m.revenue.average_ticket : 0

    // Timeline growth vs previous week
    const displayTimeline = timeline
    const maxServices = Math.max(...displayTimeline.map(t => t.services), 1)
    const lastWeekServices = displayTimeline.length >= 1 ? displayTimeline[displayTimeline.length - 1].services : 0
    const prevWeekServices = displayTimeline.length >= 2 ? displayTimeline[displayTimeline.length - 2].services : 0
    const weeklyDeltaPct =
        prevWeekServices > 0
            ? (((lastWeekServices - prevWeekServices) / prevWeekServices) * 100).toFixed(1)
            : lastWeekServices > 0
            ? "+100.0"
            : "0.0"

    const handleDownloadReportCSV = () => {
        const rows = [
            ["Metrica", "Valor"],
            ["Total Usuarios", String(m.users.total)],
            ["Clientes", String(m.users.clients)],
            ["Tecnicos Certificados Tec360", String(m.users.technicians)],
            ["Equipo Reaccion 24/7", String(m.users.reaction_team)],
            ["Verificaciones Pendientes", String(m.users.pending_verifications ?? 0)],
            ["Total Servicios", String(m.services.total)],
            ["Servicios Completados/Confirmados", String(m.services.completed)],
            ["Servicios Activos en Curso", String(activeServicesCount)],
            ["Tasa de Exito", m.services.completion_rate],
            ["Instalaciones Vehiculares", String(installationsTotal)],
            ["Reaccion Inmediata 24/7", String(recoveryTotal)],
            ["Mecanica Express", String(mechanicsTotal)],
            ["Volumen Bruto Completado (COP)", String(grossVolume)],
            ["Custodia Activa Escrow (COP)", String(escrowActive)],
            ["Comision / Ingreso Plataforma (COP)", String(m.revenue.total)],
            ["Ticket Promedio (COP)", String(Math.round(avgTicket))],
            [],
            ["Semana", "Servicios", "Volumen COP"],
            ...displayTimeline.map((t) => [t.week, String(t.services), String(t.revenue)]),
        ]
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map((r) => r.join(",")).join("\n")
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `tec360_reporte_ejecutivo_${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success("Reporte ejecutivo CSV descargado")
    }

    return (
        <div className="space-y-6 font-sans">
            {/* ─── Page Header (FigCraft Board 11) ─── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
                <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
                        Centro de Control Administrativo // Métricas Ejecutivas
                    </h2>
                    <p className="text-xs font-mono text-slate-400 mt-1">
                        Monitoreo central en tiempo real de usuarios, custodia de fondos Escrow y velocidad operativa
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setRefreshing(true)
                            fetchAll()
                        }}
                        disabled={refreshing}
                        className="px-3 py-1.5 rounded-xl bg-[#0B132B] hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${refreshing ? "animate-spin" : ""}`} />
                        <span>Actualizar</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleDownloadReportCSV}
                        className="px-3 py-1.5 rounded-xl bg-[#0B1736] hover:bg-[#102456] border border-[#1E3A8A] text-[#93C5FD] text-xs font-mono font-semibold flex items-center gap-2 shadow-sm transition-all"
                    >
                        <Download className="w-3.5 h-3.5 text-blue-400" />
                        <span>Descargar Reporte CSV</span>
                    </button>
                </div>
            </div>

            {/* ─── Top 4 Executive KPI Cards Matrix ─── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* KPI 1: Total Usuarios */}
                <Link
                    href="/admin/usuarios"
                    className="bg-[#0B132B] border border-slate-800/80 hover:border-blue-500/40 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-md transition-colors block"
                >
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-[10px] sm:text-[11px] font-mono font-semibold tracking-wider text-slate-300 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-blue-400" /> TOTAL USUARIOS ACTIVOS
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black font-mono text-slate-100">
                            {m.users.total.toLocaleString("es-CO")}
                        </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-mono text-slate-400 mt-1.5 truncate">
                        {m.users.clients} Clientes · {m.users.technicians} Especialistas · {m.users.reaction_team} Reacción
                    </p>
                </Link>

                {/* KPI 2: Tasa de Éxito Servicios */}
                <Link
                    href="/admin/servicios"
                    className="bg-[#0B132B] border border-slate-800/80 hover:border-sky-500/40 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-md transition-colors block"
                >
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-[10px] sm:text-[11px] font-mono font-semibold tracking-wider text-slate-300 flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-sky-400" /> TASA DE ÉXITO SERVICIOS
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black font-mono text-sky-400">
                            {m.services.completion_rate}
                        </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-mono text-slate-400 mt-1.5 truncate">
                        {activeServicesCount} Activos en vivo · {m.services.completed} Completados ({m.services.total} total)
                    </p>
                </Link>

                {/* KPI 3: Volumen Escrow */}
                <Link
                    href="/admin/finanzas"
                    className="bg-[#0B132B] border border-slate-800/80 hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-md transition-colors block"
                >
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-[10px] sm:text-[11px] font-mono font-semibold tracking-wider text-slate-300 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-amber-400" /> VOLUMEN OPERATIVO ESCROW
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
                            {formatCOP(grossVolume)}
                        </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-mono text-slate-400 mt-1.5 truncate">
                        En custodia: ${Math.round(escrowActive).toLocaleString("es-CO")} · Comisión: ${Math.round(m.revenue.total).toLocaleString("es-CO")}
                    </p>
                </Link>

                {/* KPI 4: Reacción 24/7 & Despacho */}
                <Link
                    href="/admin/servicios"
                    className="bg-[#0B132B] border border-slate-800/80 hover:border-rose-500/40 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-md transition-colors block"
                >
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-[10px] sm:text-[11px] font-mono font-semibold tracking-wider text-slate-300 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> REACCIÓN 24/7 & DESPACHO
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black font-mono text-rose-400">
                            {dispatchAnalytics?.assignment_p50_seconds !== null && dispatchAnalytics?.assignment_p50_seconds !== undefined
                                ? `${Math.round(dispatchAnalytics.assignment_p50_seconds)} seg`
                                : `${m.recovery.active} activas`}
                        </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-mono text-slate-400 mt-1.5 truncate">
                        {m.recovery.active} incidentes activos · {m.recovery.total} alertas registradas
                    </p>
                </Link>
            </div>

            {/* ─── Middle Grid: Chart + Pillars Breakdown ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: 12-Week Evolution Chart */}
                <div className="lg:col-span-8 bg-[#080F24] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                        <div>
                            <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-blue-400" />
                                Evolución Semanal de Servicios y Volumen Operativo
                            </h3>
                            <p className="text-xs font-mono text-slate-400 mt-0.5">
                                Métricas históricas reales registradas en los últimos 3 meses
                            </p>
                        </div>
                        <span className="px-3 py-1 rounded-lg bg-[#064E3B] border border-[#059669] text-[#6EE7B7] text-xs font-mono font-bold self-start sm:self-auto">
                            {Number(weeklyDeltaPct) >= 0 ? `▲ +${weeklyDeltaPct.replace("+", "")}%` : `▼ ${weeklyDeltaPct}%`} vs sem. previa
                        </span>
                    </div>

                    {/* Chart container */}
                    {displayTimeline.length === 0 ? (
                        <div className="h-56 flex flex-col items-center justify-center border-b border-slate-800/80 text-xs font-mono text-slate-500">
                            No hay servicios registrados en las últimas 12 semanas.
                        </div>
                    ) : (
                        <div className="h-56 flex items-end gap-2 pt-4 pb-2 border-b border-slate-800/80">
                            {displayTimeline.map((entry, i) => {
                                const totalHeightPx = Math.max(Math.round((entry.services / maxServices) * 160), 16)
                                const instRatio = totalServicesCount > 0 ? installationsTotal / totalServicesCount : 0.6
                                const mecRatio = totalServicesCount > 0 ? mechanicsTotal / totalServicesCount : 0.25
                                const reacRatio = Math.max(0, 1 - instRatio - mecRatio)

                                const reacPx = Math.max(Math.round(totalHeightPx * reacRatio), entry.services > 0 && recoveryTotal > 0 ? 4 : 0)
                                const mecPx = Math.max(Math.round(totalHeightPx * mecRatio), entry.services > 0 && mechanicsTotal > 0 ? 4 : 0)
                                const instPx = Math.max(totalHeightPx - reacPx - mecPx, 8)
                                const isCurrent = i === displayTimeline.length - 1

                                return (
                                    <div
                                        key={entry.week}
                                        className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                                        title={`Semana ${entry.week}: ${entry.services} servicios ($${entry.revenue.toLocaleString("es-CO")} COP)`}
                                    >
                                        {/* Tooltip on hover */}
                                        <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 border border-slate-700 px-2 py-1 rounded text-[10px] font-mono text-slate-200 pointer-events-none whitespace-nowrap z-20 shadow-xl">
                                            <strong>{entry.services} ops</strong> · ${entry.revenue.toLocaleString("es-CO")}
                                        </div>

                                        {/* Stacked Pillar Bars */}
                                        <div className="w-full max-w-[36px] flex flex-col items-center gap-0.5 transition-transform duration-200 group-hover:scale-y-105 origin-bottom">
                                            {reacPx > 0 && (
                                                <div
                                                    className="w-full rounded-t-sm bg-[#E11D48] shadow-sm shadow-rose-500/20"
                                                    style={{ height: `${reacPx}px` }}
                                                />
                                            )}
                                            {mecPx > 0 && (
                                                <div
                                                    className="w-full bg-[#F59E0B] shadow-sm shadow-amber-500/20"
                                                    style={{ height: `${mecPx}px` }}
                                                />
                                            )}
                                            <div
                                                className="w-full rounded-b-sm bg-[#2563EB] shadow-sm shadow-blue-500/20"
                                                style={{ height: `${instPx}px` }}
                                            />
                                        </div>

                                        <span className={`text-[9px] font-mono mt-2 truncate max-w-full ${
                                            isCurrent ? "text-sky-400 font-bold" : "text-slate-500"
                                        }`}>
                                            {entry.week.slice(5)}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-3 text-[11px] font-mono text-slate-400">
                        <div className="flex flex-wrap items-center gap-4">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-[#2563EB]" /> Instalaciones ({instSharePct}%)
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-[#F59E0B]" /> Mecánica ({mecSharePct}%)
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-sm bg-[#E11D48]" /> Reacción 24/7 ({reacSharePct}%)
                            </span>
                        </div>
                        <span className="text-slate-500 hidden sm:inline">{displayTimeline.length} Semanas con Actividad</span>
                    </div>
                </div>

                {/* Right: Pillars Breakdown */}
                <div className="lg:col-span-4 bg-[#080F24] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between space-y-4">
                    <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            Demanda por Pilar Operativo
                        </h3>
                        <p className="text-xs font-mono text-slate-400 mt-0.5">
                            Distribución real en base de datos ({totalServicesCount} servicios totales)
                        </p>
                    </div>

                    <div className="space-y-3">
                        {/* Card 1: Instalaciones */}
                        <div className="p-3.5 rounded-xl bg-[#0B1736] border border-[#1E3A8A] space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-mono font-bold text-[#93C5FD]">
                                    🛰️ INSTALACIONES VEHICULARES ({instSharePct}%)
                                </span>
                                <span className="text-[10px] font-mono text-blue-400 font-bold">{installationsTotal} ops</span>
                            </div>
                            <p className="text-[11px] font-mono text-[#BFDBFE]">
                                {m.installations?.active ?? 0} activas · Ticket prom. ${Math.round(avgTicket).toLocaleString("es-CO")} COP
                            </p>
                        </div>

                        {/* Card 2: Reacción */}
                        <div className="p-3.5 rounded-xl bg-[#200A14] border border-[#4C0519] space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-mono font-bold text-[#FDA4AF]">
                                    🚨 REACCIÓN INMEDIATA 24/7 ({reacSharePct}%)
                                </span>
                                <span className="text-[10px] font-mono text-rose-400 font-bold">{recoveryTotal} ops</span>
                            </div>
                            <p className="text-[11px] font-mono text-[#FECDD3]">
                                {m.recovery.active} activas en calle · {m.users.reaction_team} agentes de reacción
                            </p>
                        </div>

                        {/* Card 3: Mecánica */}
                        <div className="p-3.5 rounded-xl bg-[#241908] border border-[#451A03] space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-mono font-bold text-[#FDE68A]">
                                    🧰 MECÁNICA EXPRESS ({mecSharePct}%)
                                </span>
                                <span className="text-[10px] font-mono text-amber-400 font-bold">{mechanicsTotal} ops</span>
                            </div>
                            <p className="text-[11px] font-mono text-[#FEF08A]">
                                {m.quick_mechanics?.active ?? 0} activas · {m.users.technicians} Técnicos Certificados Tec360
                            </p>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80">
                        <Link
                            href="/admin/servicios"
                            className="text-xs font-mono text-sky-400 hover:text-sky-300 font-semibold flex items-center justify-between"
                        >
                            <span>Supervisar Servicios en Vivo</span>
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* ─── Bottom Section: Live Audit Feed (Real Services from DB) ─── */}
            <div className="bg-[#080F24] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-400" />
                            Actividad Operativa Reciente & Auditoría Escrow
                        </h3>
                        <p className="text-xs font-mono text-slate-400 mt-0.5">
                            Últimos servicios reales registrados en la plataforma (haz clic en cualquiera para abrir su expediente)
                        </p>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        Sincronizado con Base de Datos
                    </span>
                </div>

                {recentServices.length === 0 ? (
                    <div className="p-6 rounded-xl bg-[#070D1E] border border-slate-800 text-center text-xs font-mono text-slate-400">
                        No hay servicios registrados todavía.
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {recentServices.map((svc) => {
                            const isRecovery = svc.service_type === "vehicle_recovery"
                            const isMechanics = [
                                "oil_change", "tire_change", "battery_service",
                                "brake_service", "chain_kit_service", "spark_bulbs_wipers"
                            ].includes(svc.service_type)
                            const boxStyle = isRecovery
                                ? "bg-[#200A14] border-[#4C0519] text-[#FDA4AF]"
                                : isMechanics
                                ? "bg-[#241908] border-[#451A03] text-[#FDE68A]"
                                : "bg-[#0B1736] border-[#1E3A8A] text-[#93C5FD]"

                            return (
                                <Link
                                    key={svc.id}
                                    href={`/admin/servicios?search=${encodeURIComponent(svc.vehicle_plate || svc.id.slice(0, 8))}`}
                                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono hover:brightness-110 transition-all block ${boxStyle}`}
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="px-2 py-0.5 rounded bg-black/30 font-bold text-[10px] uppercase">
                                            {svc.status}
                                        </span>
                                        <span>
                                            <strong>#{svc.id.slice(0, 8)}</strong> · {svc.title}
                                            {svc.vehicle_plate && (
                                                <>
                                                    {" "}·{" "}
                                                    <span className="text-white bg-slate-950 px-1.5 py-0.5 rounded border border-slate-700">
                                                        {svc.vehicle_plate}
                                                    </span>
                                                </>
                                            )}
                                            {" "}— Cliente: <strong>{svc.client_name || "Titular Tec360"}</strong>
                                            {svc.technician_name && (
                                                <> · Especialista: <strong>{svc.technician_name}</strong></>
                                            )}
                                        </span>
                                    </div>
                                    <span className="text-emerald-400 font-bold shrink-0">
                                        {svc.estimated_price ? `$${svc.estimated_price.toLocaleString("es-CO")} COP` : "Por cotizar"}
                                    </span>
                                </Link>
                            )
                        })}
                    </div>
                )}

                <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] font-mono text-slate-500">
                    <span>🔒 Centro de Control Central Tec360 v3.0 · Custodia Escrow · Red de Especialistas Certificados Tec360</span>
                    <div className="flex items-center gap-3">
                        <Link href="/admin/finanzas" className="hover:text-slate-300 underline">Finanzas & Recaudos</Link>
                        <span>·</span>
                        <Link href="/admin/contabilidad" className="hover:text-slate-300 underline">Contabilidad DIAN</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
