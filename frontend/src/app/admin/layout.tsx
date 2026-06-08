"use client"

import { ReactNode, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Shield, LayoutDashboard, Users, Wrench, Settings, LogOut, Search, Bell, Menu, X, DollarSign } from "lucide-react"

export default function AdminLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const navItems = [
        { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
        { href: "/admin/usuarios", icon: Users, label: "Usuarios" },
        { href: "/admin/servicios", icon: Wrench, label: "Servicios" },
        { href: "/admin/finanzas", icon: DollarSign, label: "Finanzas" },
        { href: "/configuracion", icon: Settings, label: "Configuración" },
    ]

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#101822] text-slate-900 dark:text-slate-100 font-sans">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar — hidden on mobile, slide-in when toggled */}
            <aside className={`
                fixed md:relative z-50 md:z-auto
                w-64 flex-shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col
                h-full transition-transform duration-200 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-white text-base font-bold leading-tight">Tec360</h1>
                            <p className="text-slate-400 text-xs font-medium">Seguridad Admin</p>
                        </div>
                    </div>
                    <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-1 mt-4">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${isActive
                                    ? "bg-primary text-white"
                                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="text-sm">{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 px-2 py-3 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer">
                        <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                            <div className="w-full h-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
                                AD
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-semibold truncate">Admin User</p>
                            <p className="text-slate-500 text-[10px] truncate">admin@tec360.com</p>
                        </div>
                        <LogOut className="w-4 h-4 text-slate-400" />
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col overflow-y-auto w-full">
                {/* Header */}
                <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 bg-white/50 dark:bg-[#101822]/50 backdrop-blur-md sticky top-0 z-10">
                    {/* Mobile hamburger */}
                    <button
                        className="md:hidden p-2 -ml-1 text-slate-500 hover:text-primary transition-colors"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <div className="max-w-md w-full hidden sm:block">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                className="w-full pl-10 pr-4 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary placeholder:text-slate-500 outline-none"
                                placeholder="Buscar usuarios, servicios..."
                                type="text"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2 text-slate-500 hover:text-primary transition-colors">
                            <Bell className="w-5 h-5" />
                        </button>
                        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium hidden md:block">Centro de Control</span>
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Shield className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
