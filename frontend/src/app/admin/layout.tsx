"use client"

import { ReactNode, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    Shield, LayoutDashboard, Users, Wrench, Settings,
    LogOut, Search, Bell, Menu, X, DollarSign, ReceiptText, ShieldCheck
} from "lucide-react"
import { Tec360Logo } from "@/components/brand/tec360-logo"

export default function AdminLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const navItems = [
        { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
        { href: "/admin/usuarios", icon: Users, label: "Usuarios" },
        { href: "/admin/verificaciones", icon: ShieldCheck, label: "Verificaciones", badge: "6" },
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
                    <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700 transition-colors cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                            AD
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-slate-200 text-xs font-semibold truncate font-mono">Super Admin</p>
                            <p className="text-slate-400 text-[10px] truncate font-mono">admin@tec360.co</p>
                        </div>
                        <LogOut className="w-3.5 h-3.5 text-slate-400 hover:text-rose-400 transition-colors" />
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-y-auto w-full bg-[#020408]">
                {/* Header */}
                <header className="h-16 border-b border-slate-800/80 flex items-center justify-between px-4 md:px-8 bg-[#050810]/80 backdrop-blur-md sticky top-0 z-10">
                    {/* Mobile hamburger */}
                    <button
                        className="md:hidden p-2 -ml-1 text-slate-400 hover:text-white transition-colors"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="max-w-md w-full hidden sm:block">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                            <input
                                className="w-full pl-9 pr-4 py-1.5 bg-[#0B132B] border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-500 outline-none transition-all"
                                placeholder="Buscar usuarios, servicios, CUFE..."
                                type="text"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="p-2 text-slate-400 hover:text-slate-200 transition-colors relative">
                            <Bell className="w-4 h-4" />
                            <span className="w-2 h-2 rounded-full bg-blue-500 absolute top-1.5 right-1.5" />
                        </button>
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
