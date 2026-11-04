"use client"

import { ReactNode, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
    Shield, LayoutDashboard, Users, Wrench, Settings,
    LogOut, Search, Bell, Menu, X, DollarSign, ReceiptText, ShieldCheck, AlertTriangle, ArrowRight
} from "lucide-react"
import { Tec360Logo } from "@/components/brand/tec360-logo"
import { useAuth } from "@/lib/auth-context"
import api from "@/lib/api"

interface AdminAlertStats {
    pendingVerifications: number
    activeRecovery: number
    activeServices: number
}

export default function AdminLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const { user, logout } = useAuth()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [globalSearch, setGlobalSearch] = useState("")
    const [searchFocused, setSearchFocused] = useState(false)
    const [notificationsOpen, setNotificationsOpen] = useState(false)
    const [alertStats, setAlertStats] = useState<AdminAlertStats>({
        pendingVerifications: 0,
        activeRecovery: 0,
        activeServices: 0,
    })

    useEffect(() => {
        let active = true
        const loadHeaderStats = async () => {
            try {
                const res = await api.get("/admin/stats")
                if (!active || !res.data) return
                setAlertStats({
                    pendingVerifications: res.data.users?.pending_verifications ?? 0,
                    activeRecovery: res.data.recovery?.active ?? 0,
                    activeServices: res.data.services?.active ?? 0,
                })
            } catch {
                // Silent fallback if stats endpoint not ready
            }
        }
        loadHeaderStats()
        return () => {
            active = false
        }
    }, [pathname])

    const handleGlobalSearch = (targetSection?: "servicios" | "usuarios" | "contabilidad" | "finanzas") => {
        const q = globalSearch.trim()
        if (!q) return
        setSearchFocused(false)
        if (targetSection) {
            router.push(`/admin/${targetSection}?search=${encodeURIComponent(q)}`)
            return
        }
        if (pathname.startsWith("/admin/usuarios")) {
            router.push(`/admin/usuarios?search=${encodeURIComponent(q)}`)
        } else if (pathname.startsWith("/admin/contabilidad")) {
            router.push(`/admin/contabilidad?search=${encodeURIComponent(q)}`)
        } else if (pathname.startsWith("/admin/finanzas")) {
            router.push(`/admin/finanzas?search=${encodeURIComponent(q)}`)
        } else if (pathname.startsWith("/admin/verificaciones")) {
            router.push(`/admin/verificaciones?search=${encodeURIComponent(q)}`)
        } else if (q.includes("@") || q.startsWith("+57") || q.startsWith("+52")) {
            router.push(`/admin/usuarios?search=${encodeURIComponent(q)}`)
        } else if (q.toUpperCase().startsWith("SETT-") || q.toUpperCase().startsWith("COM-") || q.length >= 24) {
            router.push(`/admin/contabilidad?search=${encodeURIComponent(q)}`)
        } else {
            router.push(`/admin/servicios?search=${encodeURIComponent(q)}`)
        }
    }

    const totalAlerts = alertStats.pendingVerifications + alertStats.activeRecovery

    const initials = (user?.full_name || "Admin Tec360")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()

    const navItems = [
        { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
        { href: "/admin/usuarios", icon: Users, label: "Usuarios" },
        {
            href: "/admin/verificaciones",
            icon: ShieldCheck,
            label: "Verificaciones",
            badge: alertStats.pendingVerifications > 0 ? String(alertStats.pendingVerifications) : undefined,
        },
        { href: "/admin/servicios", icon: Wrench, label: "Servicios" },
        { href: "/admin/finanzas", icon: DollarSign, label: "Finanzas & Recaudos" },
        { href: "/admin/contabilidad", icon: ReceiptText, label: "Contabilidad & DIAN" },
        { href: "/configuracion", icon: Settings, label: "Configuración" },
    ]

    return (
        <div className="flex h-screen overflow-hidden bg-[#020408] text-slate-100 font-sans">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar — hidden on mobile, slide-in when toggled */}
            <aside className={`
                fixed md:relative z-50 md:z-auto
                w-64 flex-shrink-0 bg-[#050810] border-r border-slate-800/80 flex flex-col
                h-full transition-transform duration-200 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-5 flex items-center justify-between border-b border-slate-800/60">
                    <Link href="/admin" className="flex items-center">
                        <Tec360Logo size="sm" badgeLabel="ADMIN CONSOLE" />
                    </Link>
                    <button className="md:hidden text-slate-400 hover:text-white p-1" onClick={() => setSidebarOpen(false)}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 px-3 space-y-1 mt-4 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-all text-xs font-mono tracking-tight ${isActive
                                    ? "bg-[#0B1736] text-[#93C5FD] border border-[#1E3A8A] shadow-sm font-semibold"
                                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent"
                                    }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <Icon className={`w-4 h-4 ${isActive ? "text-[#60A5FA]" : "text-slate-500"}`} />
                                    <span>{item.label}</span>
                                </div>
                                {item.badge && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800/80 bg-[#03060E]">
                    <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-slate-200 text-xs font-semibold truncate font-mono">
                                {user?.full_name || "Super Admin"}
                            </p>
                            <p className="text-slate-400 text-[10px] truncate font-mono">
                                {user?.email || user?.phone || "admin@tec360.co"}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={logout}
                            title="Cerrar sesión administrativa"
                            aria-label="Cerrar sesión administrativa"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-y-auto w-full bg-[#020408]">
                {/* Header */}
                <header className="h-16 border-b border-slate-800/80 flex items-center justify-between px-4 md:px-8 bg-[#050810]/80 backdrop-blur-md sticky top-0 z-20">
                    {/* Mobile hamburger */}
                    <button
                        className="md:hidden p-2 -ml-1 text-slate-400 hover:text-white transition-colors"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="max-w-md w-full hidden sm:block relative">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault()
                                handleGlobalSearch()
                            }}
                            className="relative"
                        >
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                            <input
                                value={globalSearch}
                                onChange={(e) => setGlobalSearch(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                                className="w-full pl-9 pr-16 py-1.5 bg-[#0B132B] border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-500 outline-none transition-all"
                                placeholder="Buscar usuarios, servicios, placas o CUFE..."
                                type="text"
                            />
                            {globalSearch && (
                                <button
                                    type="submit"
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg bg-blue-600/20 border border-blue-500/40 text-[10px] font-mono font-bold text-blue-300 hover:bg-blue-600/30"
                                >
                                    Ir ↵
                                </button>
                            )}
                        </form>

                        {searchFocused && globalSearch.trim().length > 0 && (
                            <div className="absolute left-0 right-0 mt-1.5 bg-[#070D1E] border border-slate-800 rounded-xl shadow-2xl p-1.5 z-50 text-xs font-mono space-y-1">
                                <button
                                    type="button"
                                    onMouseDown={() => handleGlobalSearch("servicios")}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#0B1736] text-slate-200 transition-colors"
                                >
                                    <span>🛰️ Buscar &ldquo;{globalSearch.trim()}&rdquo; en Servicios</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                                </button>
                                <button
                                    type="button"
                                    onMouseDown={() => handleGlobalSearch("usuarios")}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#0B1736] text-slate-200 transition-colors"
                                >
                                    <span>👤 Buscar &ldquo;{globalSearch.trim()}&rdquo; en Usuarios</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                                </button>
                                <button
                                    type="button"
                                    onMouseDown={() => handleGlobalSearch("contabilidad")}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#0B1736] text-slate-200 transition-colors"
                                >
                                    <span>🧾 Buscar &ldquo;{globalSearch.trim()}&rdquo; en Facturas / CUFE</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3 relative">
                        <button
                            type="button"
                            onClick={() => setNotificationsOpen((prev) => !prev)}
                            title="Centro de alertas operativas"
                            className="p-2 text-slate-400 hover:text-slate-200 transition-colors relative rounded-xl hover:bg-slate-900/60"
                        >
                            <Bell className="w-4 h-4" />
                            {totalAlerts > 0 && (
                                <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5 animate-pulse" />
                            )}
                        </button>

                        {notificationsOpen && (
                            <div className="absolute right-0 top-12 w-80 bg-[#070D1E] border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 font-mono text-xs space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                    <span className="font-bold text-slate-100">Alertas Operativas en Vivo</span>
                                    <button
                                        type="button"
                                        onClick={() => setNotificationsOpen(false)}
                                        className="text-slate-400 hover:text-white"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    <Link
                                        href="/admin/verificaciones"
                                        onClick={() => setNotificationsOpen(false)}
                                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B132B] hover:bg-[#0B1736] border border-slate-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                                            <span className="text-slate-200">Verificaciones pendientes</span>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                                            {alertStats.pendingVerifications}
                                        </span>
                                    </Link>
                                    <Link
                                        href="/admin/servicios"
                                        onClick={() => setNotificationsOpen(false)}
                                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B132B] hover:bg-[#0B1736] border border-slate-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                                            <span className="text-slate-200">Reacción 24/7 activas</span>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold">
                                            {alertStats.activeRecovery}
                                        </span>
                                    </Link>
                                    <Link
                                        href="/admin/servicios"
                                        onClick={() => setNotificationsOpen(false)}
                                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B132B] hover:bg-[#0B1736] border border-slate-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Wrench className="w-4 h-4 text-emerald-400 shrink-0" />
                                            <span className="text-slate-200">Servicios activos en curso</span>
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                                            {alertStats.activeServices}
                                        </span>
                                    </Link>
                                </div>
                            </div>
                        )}

                        <div className="h-6 w-[1px] bg-slate-800 hidden sm:block" />
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-mono text-slate-300 hidden md:block">Centro de Control Tec360</span>
                            <div className="w-8 h-8 rounded-xl bg-[#0B1736] border border-[#1E3A8A] flex items-center justify-center text-[#93C5FD]">
                                <Shield className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-4 md:p-8 flex-1">
                    {children}
                </div>
            </main>
        </div>
    )
}
