"use client"

import { useEffect, useState, useCallback } from "react"
import { api, fetchWithAuth } from "@/lib/api"
import {
    DollarSign, CheckCircle, XCircle, Clock, AlertTriangle,
    Eye, Filter, RefreshCw, TrendingUp, Users, Ban,
} from "lucide-react"

interface CommissionPayment {
    id: string
    technician_id: string
    technician_name: string | null
    technician_phone: string | null
    amount: number
    payment_method: string
    receipt_url: string | null
    reference_number: string | null
    status: string
    due_date: string | null
    submitted_at: string | null
    created_at: string
}

interface Stats {
    total_pending: number
    total_collected: number
    total_waived: number
    technicians_blocked: number
    commission_rate: string
    free_services_per_tech: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    pending: { label: "Pendiente", color: "text-orange-400", bg: "bg-orange-500/10", icon: Clock },
    submitted: { label: "En revisión", color: "text-yellow-400", bg: "bg-yellow-500/10", icon: Eye },
    approved: { label: "Aprobado", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle },
    rejected: { label: "Rechazado", color: "text-red-400", bg: "bg-red-500/10", icon: XCircle },
}

const METHOD_LABELS: Record<string, string> = {
    nequi: "Nequi",
    bancolombia: "Bancolombia",
    daviplata: "Daviplata",
}

export default function CommissionsPage() {
    const [payments, setPayments] = useState<CommissionPayment[]>([])
    const [stats, setStats] = useState<Stats | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState<string>("")
    const [reviewingId, setReviewingId] = useState<string | null>(null)
    const [receiptModal, setReceiptModal] = useState<string | null>(null)
    const [adminNotes, setAdminNotes] = useState("")

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    const staticUrl = API_BASE.replace(/\/api\/?$/, "")

    const load = useCallback(async () => {
        setIsLoading(true)
        try {
            // Load stats
            const statsRes = await fetchWithAuth("/commissions/stats")
            if (statsRes.ok) setStats(await statsRes.json())

            // Load payments
            const qs = statusFilter ? `?status=${statusFilter}` : ""
            const paymentsRes = await fetchWithAuth(`/commissions${qs}`)
            if (paymentsRes.ok) {
                const data = await paymentsRes.json()
                setPayments(data.items || [])
            }
        } catch (e) {
            console.error("Error loading commissions:", e)
        } finally {
            setIsLoading(false)
        }
    }, [statusFilter])

    useEffect(() => { load() }, [load])

    const handleReview = async (paymentId: string, approved: boolean) => {
        setReviewingId(paymentId)
        try {
            await api.put(`/commissions/${paymentId}/review`, {
                approved,
                admin_notes: adminNotes || null,
            })
            setAdminNotes("")
            load()
        } catch (e: any) {
            alert(e.message || "Error al procesar")
        } finally {
            setReviewingId(null)
        }
    }

    const formatCurrency = (n: number) =>
        new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

    const formatDate = (d: string) =>
        new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

    return (
        <div className="space-y-6">
            {/* Title */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Comisiones</h1>
                    <p className="text-sm text-slate-500 mt-1">Gestión de comisiones y pagos de técnicos</p>
                </div>
                <button
                    onClick={load}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Actualizar
                </button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-orange-400" />
                            </div>
                            <span className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Pendiente</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-400">{formatCurrency(stats.total_pending)}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-emerald-400" />
                            </div>
                            <span className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Recaudado</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.total_collected)}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                                <Users className="w-5 h-5 text-violet-400" />
                            </div>
                            <span className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Exonerado</span>
                        </div>
                        <p className="text-2xl font-bold text-violet-400">{formatCurrency(stats.total_waived)}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                                <Ban className="w-5 h-5 text-red-400" />
                            </div>
                            <span className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Bloqueados</span>
                        </div>
                        <p className="text-2xl font-bold text-red-400">{stats.technicians_blocked}</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-3">
                <Filter className="w-4 h-4 text-slate-500" />
                {["", "pending", "submitted", "approved", "rejected"].map((s) => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            statusFilter === s
                                ? "bg-primary text-white"
                                : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                    >
                        {s === "" ? "Todos" : STATUS_CONFIG[s]?.label || s}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : payments.length === 0 ? (
                    <div className="text-center py-20">
                        <DollarSign className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500">No hay pagos de comisiones{statusFilter ? ` con estado "${STATUS_CONFIG[statusFilter]?.label}"` : ""}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-800">
                                    <th className="text-left px-5 py-3 text-xs text-slate-500 uppercase tracking-wide font-semibold">Técnico</th>
                                    <th className="text-left px-5 py-3 text-xs text-slate-500 uppercase tracking-wide font-semibold">Monto</th>
                                    <th className="text-left px-5 py-3 text-xs text-slate-500 uppercase tracking-wide font-semibold">Método</th>
                                    <th className="text-left px-5 py-3 text-xs text-slate-500 uppercase tracking-wide font-semibold">Estado</th>
                                    <th className="text-left px-5 py-3 text-xs text-slate-500 uppercase tracking-wide font-semibold">Fecha</th>
                                    <th className="text-left px-5 py-3 text-xs text-slate-500 uppercase tracking-wide font-semibold">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {payments.map((p) => {
                                    const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending
                                    const StatusIcon = cfg.icon
                                    return (
                                        <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-slate-200">{p.technician_name || "—"}</p>
                                                <p className="text-xs text-slate-500">{p.technician_phone}</p>
                                            </td>
                                            <td className="px-5 py-4 font-bold text-white">
                                                {formatCurrency(p.amount)}
                                            </td>
                                            <td className="px-5 py-4 text-slate-400">
                                                {METHOD_LABELS[p.payment_method] || p.payment_method}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${cfg.color} ${cfg.bg}`}>
                                                    <StatusIcon className="w-3.5 h-3.5" />
                                                    {cfg.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-slate-400 text-xs">
                                                {formatDate(p.created_at)}
                                                {p.due_date && p.status === "pending" && (
                                                    <p className="text-red-400 mt-1 flex items-center gap-1">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Límite: {formatDate(p.due_date)}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    {/* View Receipt */}
                                                    {p.receipt_url && (
                                                        <button
                                                            onClick={() => setReceiptModal(p.receipt_url)}
                                                            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                                                            title="Ver comprobante"
                                                        >
                                                            <Eye className="w-4 h-4 text-blue-400" />
                                                        </button>
                                                    )}

                                                    {/* Approve / Reject */}
                                                    {p.status === "submitted" && (
                                                        <>
                                                            <button
                                                                onClick={() => handleReview(p.id, true)}
                                                                disabled={reviewingId === p.id}
                                                                className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors disabled:opacity-50"
                                                                title="Aprobar"
                                                            >
                                                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const note = prompt("Razón del rechazo (opcional):")
                                                                    setAdminNotes(note || "")
                                                                    handleReview(p.id, false)
                                                                }}
                                                                disabled={reviewingId === p.id}
                                                                className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                                                                title="Rechazar"
                                                            >
                                                                <XCircle className="w-4 h-4 text-red-400" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Receipt Modal */}
            {receiptModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={() => setReceiptModal(null)}
                >
                    <div
                        className="relative max-w-lg w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-slate-800">
                            <h3 className="font-semibold">Comprobante de Transferencia</h3>
                            <button
                                onClick={() => setReceiptModal(null)}
                                className="text-slate-500 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-4">
                            <img
                                src={receiptModal.startsWith("http") ? receiptModal : `${staticUrl}${receiptModal}`}
                                alt="Comprobante"
                                className="w-full rounded-lg"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
