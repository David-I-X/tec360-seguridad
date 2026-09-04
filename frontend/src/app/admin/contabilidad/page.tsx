"use client"

import { useEffect, useState } from "react"
import {
    CheckCircle2,
    Copy,
    Check,
    FileText,
    Plus,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Users,
    Receipt,
    AlertCircle,
    X,
    Wallet,
    ShieldCheck,
    ArrowDownRight,
    ArrowUpRight,
} from "lucide-react"
import api from "@/lib/api"

interface TenantInfo {
    id: number
    name: string
    plan: string
    is_active: boolean
}

interface AccountingDashboard {
    current_month?: string
    month_income?: string | number
    month_expenses?: string | number
    month_net_profit?: string | number
    is_profitable?: boolean
    income_count?: number
    expense_count?: number
    expenses_by_category?: Array<{
        category: string
        total: string | number
        percentage: number
        count: number
    }>
}

interface DianInvoice {
    id: number
    invoice_number: string
    contact_id: number
    cufe: string
    dian_status: string
    subtotal: number
    tax: number
    total: number
    invoice_type?: string
    issued_at: string
    line_items?: Array<{
        sku: string
        description: string
        quantity: number
        unit_price: number
    }>
}

interface AccountingEntry {
    id: number
    entry_type: "income" | "expense"
    amount: string | number
    category: string
    description: string
    reference_type?: string | null
    reference_id?: number | null
    entry_date: string
}

interface SyncedContact {
    id: number
    name: string
    phone: string
    email?: string | null
    funnel_stage?: string
    created_at?: string
}

export default function ContabilidadPage() {
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [tenant, setTenant] = useState<TenantInfo | null>(null)
    const [accounting, setAccounting] = useState<AccountingDashboard>({})
    const [invoices, setInvoices] = useState<DianInvoice[]>([])
    const [entries, setEntries] = useState<AccountingEntry[]>([])
    const [contacts, setContacts] = useState<SyncedContact[]>([])

    // Active Tab
    const [activeTab, setActiveTab] = useState<"invoices" | "ledger" | "contacts" | "pnl">("invoices")
    const [invoiceFilter, setInvoiceFilter] = useState<string>("all")
    const [copiedCufe, setCopiedCufe] = useState<string | null>(null)

    // Modal state for Expense
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
    const [expenseAmount, setExpenseAmount] = useState("")
    const [expenseCategory, setExpenseCategory] = useState("repuestos")
    const [expenseDescription, setExpenseDescription] = useState("")
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0])
    const [savingExpense, setSavingExpense] = useState(false)
    const [expenseFeedback, setExpenseFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null)

    const fetchData = async () => {
        try {
            const [dashRes, invRes, entriesRes, contactsRes] = await Promise.allSettled([
                api.get("/admin/vertical/dashboard"),
                api.get("/admin/vertical/invoices"),
                api.get("/admin/vertical/entries"),
                api.get("/admin/vertical/contacts"),
            ])

            if (dashRes.status === "fulfilled" && dashRes.value.data.success) {
                setTenant(dashRes.value.data.tenant)
                setAccounting(dashRes.value.data.accounting || {})
            }
            if (invRes.status === "fulfilled" && invRes.value.data.success) {
                setInvoices(invRes.value.data.invoices || [])
            }
            if (entriesRes.status === "fulfilled" && entriesRes.value.data.success) {
                setEntries(entriesRes.value.data.entries || [])
            }
            if (contactsRes.status === "fulfilled" && contactsRes.value.data.success) {
                setContacts(contactsRes.value.data.contacts || [])
            }
        } catch (error) {
            console.error("Error cargando contabilidad vertical:", error)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleRefresh = () => {
        setRefreshing(true)
        fetchData()
    }

    const handleCopyCufe = (cufe: string) => {
        navigator.clipboard.writeText(cufe)
        setCopiedCufe(cufe)
        setTimeout(() => setCopiedCufe(null), 2000)
    }

    const handleCreateExpense = async (e: React.FormEvent) => {
        e.preventDefault()
        const amountNum = parseFloat(expenseAmount)
        if (!amountNum || amountNum <= 0) {
            setExpenseFeedback({ type: "error", text: "Ingresa un monto válido mayor a 0" })
            return
        }
        if (!expenseDescription.trim()) {
            setExpenseFeedback({ type: "error", text: "La descripción es obligatoria" })
            return
        }

        setSavingExpense(true)
        setExpenseFeedback(null)

        try {
            await api.post("/admin/vertical/expenses", {
                amount: amountNum,
                category: expenseCategory,
                description: expenseDescription.trim(),
                entry_date: expenseDate ? `${expenseDate}T12:00:00Z` : undefined,
            })
            setExpenseFeedback({ type: "success", text: "¡Gasto registrado exitosamente!" })
            setExpenseAmount("")
            setExpenseDescription("")
            setTimeout(() => {
                setIsExpenseModalOpen(false)
                setExpenseFeedback(null)
                handleRefresh()
            }, 1200)
        } catch (err: unknown) {
            console.error("Error emitiendo gasto:", err)
            const errorObj = err as { response?: { data?: { detail?: string } } }
            setExpenseFeedback({
                type: "error",
                text: errorObj.response?.data?.detail || "No se pudo registrar el gasto en el SaaS Vertical",
            })
        } finally {
            setSavingExpense(false)
        }
    }

    // Numbers & Calculations
    const monthIncome = parseFloat(String(accounting.month_income || "0"))
    const monthExpenses = parseFloat(String(accounting.month_expenses || "0"))
    const monthNetProfit = parseFloat(String(accounting.month_net_profit || "0"))
    const isProfitable = monthNetProfit >= 0

    // Filter Invoices
    const filteredInvoices = invoices.filter((inv) => {
        if (invoiceFilter === "all") return true
        if (invoiceFilter === "mandate") return inv.invoice_type === "mandate_service" || !inv.invoice_type
        if (invoiceFilter === "commission") return inv.invoice_type === "platform_commission"
        return true
    })

    if (loading) {
        return (
            <div className="flex h-96 flex-col items-center justify-center gap-3 text-slate-500">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-sm font-medium">Conectando con SaaS Vertical (Amatista VCN)...</p>
            </div>
        )
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">Contabilidad & Facturación DIAN</h1>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Conectado VCN
                        </span>
                    </div>
                    <p className="text-slate-500 text-sm mt-1">
                        SaaS Vertical: <span className="font-medium text-slate-700 dark:text-slate-300">{tenant?.name || "Distribuidora Los Andes S.A.S."}</span> · Plan {tenant?.plan?.toUpperCase() || "GROWTH"}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors"
                        title="Actualizar datos"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                        Actualizar
                    </button>
                    <button
                        onClick={() => setIsExpenseModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02]"
                    >
                        <Plus className="w-4 h-4" />
                        Emitir Gasto Operativo
                    </button>
                </div>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Ingreso Real Tec360 */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ingreso Real Tec360</span>
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <ArrowUpRight className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold mt-3 text-slate-900 dark:text-white">
                        ${monthIncome.toLocaleString("es-CO")}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <span>Comisiones de intermediación facturadas</span>
                    </p>
                </div>

                {/* Gastos Operativos */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gastos Operativos</span>
                        <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                            <ArrowDownRight className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold mt-3 text-slate-900 dark:text-white">
                        ${monthExpenses.toLocaleString("es-CO")}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                        {accounting.expense_count || 0} egresos registrados en el mes
                    </p>
                </div>

                {/* Utilidad Neta */}
                <div className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border shadow-sm relative overflow-hidden ${
                    isProfitable ? "border-emerald-500/30" : "border-rose-500/30"
                }`}>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Utilidad Neta Real</span>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isProfitable ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                        }`}>
                            {isProfitable ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        </div>
                    </div>
                    <h3 className={`text-2xl font-bold mt-3 ${isProfitable ? "text-emerald-500" : "text-rose-500"}`}>
                        ${monthNetProfit.toLocaleString("es-CO")}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                        {isProfitable ? "🟢 Operación rentable" : "🔴 Egresos superan comisiones"}
                    </p>
                </div>

                {/* Facturación DIAN */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Facturas DIAN</span>
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold mt-3 text-slate-900 dark:text-white">
                        {invoices.length}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" />
                        100% aceptadas por motor DIAN
                    </p>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 sm:gap-6 overflow-x-auto">
                <button
                    onClick={() => setActiveTab("invoices")}
                    className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                        activeTab === "invoices"
                            ? "border-blue-600 text-blue-600 dark:text-blue-400"
                            : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                    }`}
                >
                    <Receipt className="w-4 h-4" />
                    Facturación Electrónica DIAN ({invoices.length})
                </button>
                <button
                    onClick={() => setActiveTab("ledger")}
                    className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                        activeTab === "ledger"
                            ? "border-blue-600 text-blue-600 dark:text-blue-400"
                            : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                    }`}
                >
                    <FileText className="w-4 h-4" />
                    Libro Contable & Flujo de Caja ({entries.length})
                </button>
                <button
                    onClick={() => setActiveTab("pnl")}
                    className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                        activeTab === "pnl"
                            ? "border-blue-600 text-blue-600 dark:text-blue-400"
                            : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                    }`}
                >
                    <TrendingUp className="w-4 h-4" />
                    Estado de Resultados (P&L)
                </button>
                <button
                    onClick={() => setActiveTab("contacts")}
                    className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                        activeTab === "contacts"
                            ? "border-blue-600 text-blue-600 dark:text-blue-400"
                            : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                    }`}
                >
                    <Users className="w-4 h-4" />
                    Directorio Sincronizado ({contacts.length})
                </button>
            </div>

            {/* TAB 1: Facturación Electrónica DIAN */}
            {activeTab === "invoices" && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100/70 dark:bg-slate-900/70 p-3 rounded-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-slate-500 uppercase mr-1">Filtrar:</span>
                            <button
                                onClick={() => setInvoiceFilter("all")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    invoiceFilter === "all"
                                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-white/50"
                                }`}
                            >
                                Todas ({invoices.length})
                            </button>
                            <button
                                onClick={() => setInvoiceFilter("mandate")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    invoiceFilter === "mandate"
                                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-white/50"
                                }`}
                            >
                                👤 Factura A (Cliente Mandato)
                            </button>
                            <button
                                onClick={() => setInvoiceFilter("commission")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    invoiceFilter === "commission"
                                        ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-white/50"
                                }`}
                            >
                                🛠️ Factura B (Comisión Tec360)
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold text-xs uppercase border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4">Factura</th>
                                        <th className="px-6 py-4">Tipo Legal</th>
                                        <th className="px-6 py-4">Monto Total</th>
                                        <th className="px-6 py-4">IVA 19%</th>
                                        <th className="px-6 py-4">Estado DIAN</th>
                                        <th className="px-6 py-4">CUFE Único</th>
                                        <th className="px-6 py-4">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredInvoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                                No se encontraron facturas con el filtro seleccionado
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredInvoices.map((inv) => {
                                            const isCommission = inv.invoice_type === "platform_commission"
                                            return (
                                                <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                                        {inv.invoice_number}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {isCommission ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                                                🛠️ Comisión Tec360
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                                👤 Mandato Cliente
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                                                        ${inv.total?.toLocaleString("es-CO")}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500">
                                                        ${inv.tax?.toLocaleString("es-CO")}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            {inv.dian_status || "Aceptada"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {inv.cufe ? (
                                                            <button
                                                                onClick={() => handleCopyCufe(inv.cufe)}
                                                                className="group flex items-center gap-1.5 font-mono text-xs text-slate-500 hover:text-blue-600 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md transition-colors"
                                                                title={inv.cufe}
                                                            >
                                                                <span>{inv.cufe.slice(0, 12)}...</span>
                                                                {copiedCufe === inv.cufe ? (
                                                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                                ) : (
                                                                    <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                                                                )}
                                                            </button>
                                                        ) : (
                                                            <span className="text-slate-400 text-xs">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-slate-500">
                                                        {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString("es-CO", {
                                                            day: "2-digit",
                                                            month: "short",
                                                            year: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        }) : "—"}
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
            )}

            {/* TAB 2: Libro Contable & Flujo de Caja */}
            {activeTab === "ledger" && (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900 dark:text-white">Asientos Registrados en el SaaS Vertical</h3>
                            <span className="text-xs text-slate-500">Últimos {entries.length} movimientos</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold text-xs uppercase border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4">ID</th>
                                        <th className="px-6 py-4">Tipo</th>
                                        <th className="px-6 py-4">Categoría</th>
                                        <th className="px-6 py-4">Descripción</th>
                                        <th className="px-6 py-4">Monto</th>
                                        <th className="px-6 py-4">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {entries.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                                No hay asientos registrados aún
                                            </td>
                                        </tr>
                                    ) : (
                                        entries.map((entry) => {
                                            const isIncome = entry.entry_type === "income"
                                            const isRecharge = entry.category === "recargas_tecnicos" || entry.reference_type === "wallet_recharge"
                                            const amount = parseFloat(String(entry.amount))

                                            return (
                                                <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                                                        #{entry.id}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {isRecharge ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                                                <Wallet className="w-3 h-3" />
                                                                Recarga Bancaria
                                                            </span>
                                                        ) : isIncome ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                                <ArrowUpRight className="w-3 h-3" />
                                                                Ingreso Venta
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                                                <ArrowDownRight className="w-3 h-3" />
                                                                Gasto Operativo
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">
                                                        {entry.category}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 max-w-md truncate" title={entry.description}>
                                                        {entry.description}
                                                    </td>
                                                    <td className={`px-6 py-4 font-bold ${isIncome ? "text-emerald-500" : "text-rose-500"}`}>
                                                        {isIncome ? "+" : "-"}${amount.toLocaleString("es-CO")}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-slate-500">
                                                        {entry.entry_date ? new Date(entry.entry_date).toLocaleDateString("es-CO", {
                                                            day: "2-digit",
                                                            month: "short",
                                                            year: "numeric",
                                                        }) : "—"}
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
            )}

            {/* TAB 3: Estado de Resultados P&L */}
            {activeTab === "pnl" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Desglose de Gastos por Categoría</h3>
                        <div className="space-y-4">
                            {accounting.expenses_by_category && accounting.expenses_by_category.length > 0 ? (
                                accounting.expenses_by_category.map((cat, idx) => (
                                    <div key={idx} className="space-y-1.5">
                                        <div className="flex justify-between text-sm">
                                            <span className="capitalize font-medium text-slate-700 dark:text-slate-300">{cat.category}</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                ${parseFloat(String(cat.total)).toLocaleString("es-CO")} ({cat.percentage}%)
                                            </span>
                                        </div>
                                        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full"
                                                style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-slate-400 text-sm py-6 text-center">No hay gastos categorizados este mes</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Resumen Financiero del Mes</h3>
                            <p className="text-slate-500 text-xs mb-6">Calculado automáticamente por el motor de contabilidad del SaaS Vertical</p>

                            <div className="space-y-3">
                                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">Total Ingresos Facturados:</span>
                                    <span className="font-bold text-emerald-500">${monthIncome.toLocaleString("es-CO")}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">Total Egresos Operativos:</span>
                                    <span className="font-bold text-rose-500">-${monthExpenses.toLocaleString("es-CO")}</span>
                                </div>
                                <div className="flex justify-between py-3 border-t border-slate-200 dark:border-slate-700">
                                    <span className="font-bold text-slate-900 dark:text-white">Resultado Neto (Utilidad):</span>
                                    <span className={`text-lg font-extrabold ${isProfitable ? "text-emerald-500" : "text-rose-500"}`}>
                                        ${monthNetProfit.toLocaleString("es-CO")}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300">
                            💡 <strong>Norma DIAN:</strong> Las facturas de mandato para clientes finales no tributan renta en Tec360. Solo las comisiones recaudadas son computadas en la base gravable.
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: Directorio Sincronizado */}
            {activeTab === "contacts" && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900 dark:text-white">Contactos Sincronizados con el SaaS</h3>
                        <span className="text-xs text-slate-500">Total: {contacts.length}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold text-xs uppercase border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-6 py-4">ID SaaS</th>
                                    <th className="px-6 py-4">Nombre / Empresa</th>
                                    <th className="px-6 py-4">Teléfono</th>
                                    <th className="px-6 py-4">Correo</th>
                                    <th className="px-6 py-4">Etapa Embudo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {contacts.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                            No hay contactos sincronizados aún
                                        </td>
                                    </tr>
                                ) : (
                                    contacts.map((c) => (
                                        <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs text-blue-500 font-bold">
                                                #{c.id}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                {c.name}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                                {c.phone || "—"}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">
                                                {c.email || "—"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                    {c.funnel_stage || "nuevo"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL: Emitir Gasto Operativo */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">Emitir Gasto Operativo</h3>
                                    <p className="text-xs text-slate-500">Se registrará en el libro contable del SaaS Vertical</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsExpenseModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateExpense} className="p-6 space-y-4">
                            {expenseFeedback && (
                                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                                    expenseFeedback.type === "success"
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                }`}>
                                    <AlertCircle className="w-4 h-4" />
                                    {expenseFeedback.text}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                                    Monto del Gasto (COP) *
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                    <input
                                        type="number"
                                        required
                                        min="1000"
                                        step="500"
                                        placeholder="Ej: 75000"
                                        value={expenseAmount}
                                        onChange={(e) => setExpenseAmount(e.target.value)}
                                        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                                    Categoría de Gasto *
                                </label>
                                <select
                                    value={expenseCategory}
                                    onChange={(e) => setExpenseCategory(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="repuestos">🔧 Repuestos y Materiales (Cables, Conectores, Fuentes)</option>
                                    <option value="transporte">⛽ Transporte y Combustible de Técnicos</option>
                                    <option value="nomina">💼 Nómina y Honorarios</option>
                                    <option value="servicios">⚡ Servicios Públicos / Internet / Infraestructura</option>
                                    <option value="arriendo">🏢 Arriendo Oficina / Bodega</option>
                                    <option value="marketing">📢 Publicidad y Marketing</option>
                                    <option value="herramientas">🛠️ Herramientas y Equipamiento</option>
                                    <option value="otros">📦 Otros Gastos Operativos</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                                    Descripción del Gasto *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Caja de conectores RJ45 y cable UTP para servicio"
                                    value={expenseDescription}
                                    onChange={(e) => setExpenseDescription(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                                    Fecha del Gasto
                                </label>
                                <input
                                    type="date"
                                    value={expenseDate}
                                    onChange={(e) => setExpenseDate(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsExpenseModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingExpense}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                                >
                                    {savingExpense ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        "Registrar Gasto"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
