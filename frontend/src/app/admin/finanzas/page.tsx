"use client"

import { useEffect, useState } from "react"
import { DollarSign, Clock, CheckCircle2, AlertCircle, Search } from "lucide-react"
import api from "@/lib/api"

interface Payment {
    id: string
    service_id: string
    client_id: string
    technician_id: string | null
    amount: number
    currency: string
    payment_method: string
    status: string
    notes: string | null
    paid_at: string | null
    created_at: string
    client_name: string | null
    technician_name: string | null
    service_title: string | null
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
    pending: { label: "Pendiente", color: "bg-yellow-500/10 text-yellow-500" },
    confirmed_by_technician: { label: "Por validar", color: "bg-orange-500/10 text-orange-500" },
    confirmed_by_admin: { label: "Validado", color: "bg-emerald-500/10 text-emerald-500" },
    approved: { label: "Aprobado", color: "bg-blue-500/10 text-blue-500" },
    failed: { label: "Fallido", color: "bg-red-500/10 text-red-500" },
    refunded: { label: "Reembolsado", color: "bg-slate-500/10 text-slate-400" },
}

const METHOD_LABELS: Record<string, string> = {
    cash: "💵 Efectivo",
    pse: "🏦 PSE",
    nequi: "📱 Nequi",
    daviplata: "📱 Daviplata",
    card: "💳 Tarjeta",
}

export default function FinanzasPage() {
    const [payments, setPayments] = useState<Payment[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>("all")
    const [validating, setValidating] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")

    const fetchPayments = async () => {
        try {
            const params = filter !== "all" ? `?status=${filter}` : ""
            const res = await api.get(`/payments${params}`)
            setPayments(res.data.items || [])
            setTotal(res.data.total || 0)
        } catch (error: any) {
            if (error.message?.includes("not enabled")) {
                setPayments([])
                setTotal(0)
            } else {
                console.error("Error fetching payments:", error)
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        setLoading(true)
        fetchPayments()
    }, [filter])

    const handleValidate = async (paymentId: string) => {
        setValidating(paymentId)
        try {
            await api.put(`/payments/${paymentId}/validate`)
            fetchPayments()
        } catch (error) {
            console.error("Error validating payment:", error)
        } finally {
            setValidating(null)
        }
    }

    // Computed stats
    const totalCollected = payments
        .filter(p => ["confirmed_by_technician", "confirmed_by_admin", "approved"].includes(p.status))
        .reduce((sum, p) => sum + p.amount, 0)
    const pendingCount = payments.filter(p => p.status === "confirmed_by_technician").length
    const validatedCount = payments.filter(p => p.status === "confirmed_by_admin").length

    // Filtered by search
    const filtered = payments.filter(p => {
        if (!searchTerm) return true
        const q = searchTerm.toLowerCase()
        return (
            p.service_title?.toLowerCase().includes(q) ||
            p.technician_name?.toLowerCase().includes(q) ||
            p.client_name?.toLowerCase().includes(q)
        )
    })

    if (loading) {
        return <div className="flex h-64 items-center justify-center text-slate-500">Cargando finanzas...</div>
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Finanzas</h1>
                <p className="text-slate-500 text-sm mt-1">Control de pagos y recaudos de la operación</p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-slate-500">Total Recaudado</p>
                        <span className="text-amber-500 bg-amber-500/10 p-2 rounded-lg"><DollarSign className="w-5 h-5" /></span>
                    </div>
                    <h2 className="text-3xl font-bold">${totalCollected.toLocaleString("es-CO")}</h2>
                    <p className="text-xs text-slate-400 mt-1">COP · {total} pagos totales</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-orange-200 dark:border-orange-800 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-slate-500">Pendientes de Validar</p>
                        <span className="text-orange-500 bg-orange-500/10 p-2 rounded-lg"><Clock className="w-5 h-5" /></span>
                    </div>
                    <h2 className="text-3xl font-bold text-orange-500">{pendingCount}</h2>
                    <p className="text-xs text-slate-400 mt-1">Confirmados por técnico, esperan validación admin</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-slate-500">Pagos Validados</p>
                        <span className="text-emerald-500 bg-emerald-500/10 p-2 rounded-lg"><CheckCircle2 className="w-5 h-5" /></span>
                    </div>
                    <h2 className="text-3xl font-bold text-emerald-500">{validatedCount}</h2>
                    <p className="text-xs text-slate-400 mt-1">Dinero que fue entregado y confirmado</p>
                </div>
            </div>

            {/* Filters + Search */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex gap-2 flex-wrap">
                        {[
                            { value: "all", label: "Todos" },
                            { value: "confirmed_by_technician", label: "Por validar" },
                            { value: "confirmed_by_admin", label: "Validados" },
                        ].map(f => (
                            <button
                                key={f.value}
                                onClick={() => setFilter(f.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === f.value
                                    ? "bg-primary text-white"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-primary"
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar por técnico o servicio..."
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary placeholder:text-slate-500"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Servicio</th>
                                <th className="px-4 py-3">Técnico</th>
                                <th className="px-4 py-3 text-right">Monto</th>
                                <th className="px-4 py-3">Método</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        {total === 0 ? "No hay pagos registrados aún" : "Sin resultados para esta búsqueda"}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(p => {
                                    const badge = STATUS_BADGE[p.status] || { label: p.status, color: "bg-slate-500/10 text-slate-400" }
                                    return (
                                        <tr key={p.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                                {p.paid_at ? new Date(p.paid_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "2-digit" }) : "—"}
                                            </td>
                                            <td className="px-4 py-3 font-medium max-w-[200px] truncate">{p.service_title || "—"}</td>
                                            <td className="px-4 py-3 text-slate-500">{p.technician_name || "—"}</td>
                                            <td className="px-4 py-3 text-right font-bold text-emerald-500">${p.amount.toLocaleString("es-CO")}</td>
                                            <td className="px-4 py-3">{METHOD_LABELS[p.payment_method] || p.payment_method}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${badge.color}`}>{badge.label}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {p.status === "confirmed_by_technician" ? (
                                                    <button
                                                        onClick={() => handleValidate(p.id)}
                                                        disabled={validating === p.id}
                                                        className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                                                    >
                                                        {validating === p.id ? "..." : "Validar"}
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
