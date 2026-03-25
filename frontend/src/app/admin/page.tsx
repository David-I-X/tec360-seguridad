"use client"

import { useEffect, useState } from "react"
import { Users, CheckCircle, DollarSign, TrendingUp, ShieldCheck, ChevronRight, AlertTriangle, BarChart3 } from "lucide-react"
import api from "@/lib/api"

interface AdminStats {
    users: {
        clients: number
        technicians: number
        reaction_team: number
        total: number
    }
    services: {
        total: number
        completed: number
        completion_rate: string
        by_status: Record<string, number>
    }
    revenue: {
        total: number
        average_ticket: number
        currency: string
    }
    recovery: {
        total: number
        active: number
    }
}

interface TimelineEntry {
    week: string
    services: number
    revenue: number
}

export default function AdminOverview() {
    const [stats, setStats] = useState<AdminStats | null>(null)
    const [timeline, setTimeline] = useState<TimelineEntry[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [statsRes, timelineRes] = await Promise.allSettled([
                    api.get("/admin/stats"),
                    api.get("/admin/stats/timeline?weeks=12"),
                ])
                if (statsRes.status === "fulfilled") setStats(statsRes.value.data)
                if (timelineRes.status === "fulfilled") setTimeline(timelineRes.value.data.timeline || [])
            } catch (error) {
                console.error("Error fetching admin stats:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchAll()
    }, [])

    if (loading) {
        return <div className="flex h-64 items-center justify-center text-slate-500">Cargando métricas...</div>
    }

    const m = stats || {
        users: { total: 0, clients: 0, technicians: 0, reaction_team: 0 },
        services: { total: 0, completed: 0, completion_rate: "0%", by_status: {} },
        revenue: { total: 0, average_ticket: 0, currency: "COP" },
        recovery: { total: 0, active: 0 },
    }

    const maxServices = Math.max(...timeline.map(t => t.services), 1)

    return (
        <div className="space-y-8">
            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Total Users */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Usuarios</p>
                        <span className="text-primary bg-primary/10 p-2 rounded-lg"><Users className="w-5 h-5" /></span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-4">
                        <h2 className="text-3xl font-bold">{m.users.total}</h2>
                        <span className="text-xs font-semibold text-emerald-500 flex items-center">
                            <TrendingUp className="w-3 h-3 mr-1" /> Activos
                        </span>
                    </div>
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex-1">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Clientes</p>
                            <p className="text-sm font-semibold">{m.users.clients}</p>
                        </div>
                        <div className="w-[1px] h-8 bg-slate-100 dark:bg-slate-800"></div>
                        <div className="flex-1 text-center">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Técnicos</p>
                            <p className="text-sm font-semibold">{m.users.technicians}</p>
                        </div>
                        <div className="w-[1px] h-8 bg-slate-100 dark:bg-slate-800"></div>
                        <div className="flex-1 text-right">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Reacción</p>
                            <p className="text-sm font-semibold text-orange-500">{m.users.reaction_team}</p>
                        </div>
                    </div>
                </div>

                {/* Completed Services */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Servicios Completados</p>
                        <span className="text-emerald-500 bg-emerald-500/10 p-2 rounded-lg"><CheckCircle className="w-5 h-5" /></span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-4">
                        <h2 className="text-3xl font-bold">{m.services.completed}</h2>
                        <span className="text-xs font-semibold text-emerald-500 flex items-center">
                            de {m.services.total} ({m.services.completion_rate})
                        </span>
                    </div>
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                        {Object.entries(m.services.by_status || {}).filter(([, v]) => v > 0).map(([key, value]) => (
                            <div key={key} className="text-center">
                                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{key.replace("_", " ")}</p>
                                <p className="text-sm font-semibold">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Revenue */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Ingresos Reales</p>
                        <span className="text-amber-500 bg-amber-500/10 p-2 rounded-lg"><DollarSign className="w-5 h-5" /></span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-4">
                        <h2 className="text-3xl font-bold">${m.revenue.total.toLocaleString("es-CO")}</h2>
                        <span className="text-xs font-semibold text-slate-400">COP</span>
                    </div>
                    <div className="flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Ticket Promedio</p>
                            <p className="text-sm font-semibold text-emerald-500">${m.revenue.average_ticket.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</p>
                        </div>
                    </div>
                </div>

                {/* Recovery */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-orange-300 dark:border-orange-700 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">🚨 Recuperaciones</p>
                        <span className="text-orange-500 bg-orange-500/10 p-2 rounded-lg"><AlertTriangle className="w-5 h-5" /></span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-4">
                        <h2 className="text-3xl font-bold text-orange-500">{m.recovery.active}</h2>
                        <span className="text-xs font-semibold text-slate-400">activas</span>
                    </div>
                    <div className="pt-4 border-t border-orange-200 dark:border-orange-800">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total Históricas</p>
                        <p className="text-sm font-semibold">{m.recovery.total}</p>
                    </div>
                </div>
            </div>

            {/* Timeline Chart */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-base font-bold flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-primary" /> Servicios por Semana
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Últimas 12 semanas</p>
                    </div>
                </div>
                {timeline.length > 0 ? (
                    <div className="flex items-end gap-2 h-40">
                        {timeline.map((entry, i) => {
                            const height = (entry.services / maxServices) * 100
                            const weekLabel = new Date(entry.week).toLocaleDateString("es-CO", { month: "short", day: "numeric" })
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1 group cursor-pointer" title={`${weekLabel}: ${entry.services} servicios, $${entry.revenue.toLocaleString("es-CO")} COP`}>
                                    <span className="text-[9px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {entry.services}
                                    </span>
                                    <div
                                        className="w-full bg-primary/80 hover:bg-primary rounded-t-sm transition-all min-h-[4px]"
                                        style={{ height: `${Math.max(height, 4)}%` }}
                                    ></div>
                                    <span className="text-[8px] text-slate-400 truncate max-w-full">{weekLabel}</span>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
                        No hay datos de timeline disponibles
                    </div>
                )}
            </div>

            {/* Quick Navigation */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-8 text-center">
                <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-bold mb-2">Panel Operativo Activo</h3>
                <p className="text-slate-500 mb-6 max-w-md mx-auto">
                    Dirígete a la pestaña de Usuarios para verificar y gestionar técnicos, o a la pestaña de Servicios para monitorear las operaciones en curso.
                </p>
                <div className="flex justify-center gap-4">
                    <a href="/admin/usuarios" className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 flex items-center gap-2">
                        Ver Usuarios <ChevronRight className="w-4 h-4" />
                    </a>
                    <a href="/admin/servicios" className="px-6 py-2 border border-primary text-primary rounded-lg font-medium hover:bg-primary/10 flex items-center gap-2">
                        Ver Servicios <ChevronRight className="w-4 h-4" />
                    </a>
                </div>
            </div>
        </div>
    )
}
