"use client"

import { useEffect, useState } from "react"
import { Users, CheckCircle, DollarSign, TrendingUp, TrendingDown, ShieldCheck, Ban, ChevronRight } from "lucide-react"
import api from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function AdminOverview() {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get("/admin/stats")
                setStats(response.data)
            } catch (error) {
                console.error("Error fetching admin stats:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    if (loading) {
        return <div className="flex h-64 items-center justify-center">Cargando métricas...</div>
    }

    // Fallback if no stats
    const metrics = stats || {
        users: { total: 0, clients: 0, technicians: 0 },
        services: { total: 0, completed: 0, completion_rate: "0%" }
    }

    // Estimated revenue calculation (Mock based on completed services for the view)
    const estimatedRevenue = metrics.services.completed * 35000 // Mock avg price

    return (
        <div className="space-y-8">
            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Users */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Usuarios</p>
                        <span className="text-primary bg-primary/10 p-2 rounded-lg"><Users className="w-5 h-5" /></span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-4">
                        <h2 className="text-3xl font-bold">{metrics.users.total}</h2>
                        <span className="text-xs font-semibold text-emerald-500 flex items-center">
                            <TrendingUp className="w-3 h-3 mr-1" /> Activos
                        </span>
                    </div>
                    <div className="flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex-1">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Clientes</p>
                            <p className="text-sm font-semibold">{metrics.users.clients}</p>
                        </div>
                        <div className="w-[1px] h-8 bg-slate-100 dark:bg-slate-800"></div>
                        <div className="flex-1 text-right">
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Técnicos</p>
                            <p className="text-sm font-semibold">{metrics.users.technicians}</p>
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
                        <h2 className="text-3xl font-bold">{metrics.services.completed}</h2>
                        <span className="text-xs font-semibold text-emerald-500 flex items-center">
                            Tasa {metrics.services.completion_rate}
                        </span>
                    </div>
                    <div className="w-full h-12 flex items-end gap-1 overflow-hidden opacity-50">
                        {/* Fake bar chart like in the design */}
                        <div className="flex-1 bg-primary h-1/4 rounded-t-sm"></div>
                        <div className="flex-1 bg-primary h-2/4 rounded-t-sm"></div>
                        <div className="flex-1 bg-primary h-1/3 rounded-t-sm"></div>
                        <div className="flex-1 bg-primary h-3/4 rounded-t-sm"></div>
                        <div className="flex-1 bg-primary h-2/3 rounded-t-sm"></div>
                        <div className="flex-1 bg-primary h-full rounded-t-sm"></div>
                        <div className="flex-1 bg-primary h-4/5 rounded-t-sm"></div>
                    </div>
                </div>

                {/* Estimated Income */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Ingresos Estimados</p>
                        <span className="text-amber-500 bg-amber-500/10 p-2 rounded-lg"><DollarSign className="w-5 h-5" /></span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-4">
                        <h2 className="text-3xl font-bold">${estimatedRevenue.toLocaleString()}</h2>
                        <span className="text-xs font-semibold text-emerald-500 flex items-center">
                            <TrendingUp className="w-3 h-3 mr-1" /> Plataforma
                        </span>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-[75%] rounded-full"></div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">75% Meta</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions / Recent Activity Placeholder (Points to the detailed pages) */}
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
                </div>
            </div>
        </div>
    )
}
