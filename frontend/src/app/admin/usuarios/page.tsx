"use client"

import { useEffect, useState } from "react"
import {
    Ban, CheckCircle, UserCog, Search,
    Users, ShieldCheck, AlertTriangle, ChevronRight,
    Sparkles, Filter, ExternalLink, Building2
} from "lucide-react"
import { toast } from "react-hot-toast"
import api from "@/lib/api"
import Link from "next/link"

interface AdminUser {
    id: string
    email: string
    full_name: string | null
    phone: string | null
    role: string
    is_active: boolean
    created_at: string
    avatar_url: string | null
    // Tech specific
    is_verified?: boolean
    rank?: string
    total_services?: number
    average_rating?: number
    // Organization / Workshop specific
    organization_id?: string | null
    organization_name?: string | null
    org_role?: string | null
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    client: { label: "Cliente", color: "text-slate-300", bg: "bg-slate-800/80", border: "border-slate-700" },
    technician: { label: "Especialista Certificado", color: "text-[#93C5FD]", bg: "bg-[#0B1736]", border: "border-[#1E3A8A]" },
    company_admin: { label: "Organización / Taller", color: "text-cyan-300", bg: "bg-cyan-500/15", border: "border-cyan-500/30" },
    reaction_team: { label: "Escuadrón Reacción", color: "text-rose-400", bg: "bg-rose-500/15", border: "border-rose-500/30" },
    admin: { label: "Super Admin", color: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/30" },
}

const fallbackUsers: AdminUser[] = [
    {
        id: "USR-001",
        email: "carlos.mendoza@tec360.co",
        full_name: "Carlos Mendoza",
        phone: "+57 300 456 7890",
        role: "technician",
        is_active: true,
        created_at: "2026-08-10T10:00:00Z",
        avatar_url: null,
        is_verified: true,
        rank: "Master GPS & Telemetría",
        total_services: 184,
        average_rating: 4.95,
    },
    {
        id: "USR-002",
        email: "patrulla.delta4@tec360.co",
        full_name: "Patrulla Delta 4 (Reacción Rápida)",
        phone: "+57 312 890 1234",
        role: "reaction_team",
        is_active: true,
        created_at: "2026-08-15T12:00:00Z",
        avatar_url: null,
        is_verified: true,
        rank: "Escuadrón Élite 24/7",
        total_services: 92,
        average_rating: 5.0,
    },
    {
        id: "USR-003",
        email: "andres.restrepo@gmail.com",
        full_name: "Andrés Restrepo",
        phone: "+57 301 234 5678",
        role: "client",
        is_active: true,
        created_at: "2026-09-01T08:30:00Z",
        avatar_url: null,
        total_services: 4,
    },
    {
        id: "USR-004",
        email: "diego.patino@tec360.co",
        full_name: "Diego Patiño",
        phone: "+57 310 987 6543",
        role: "technician",
        is_active: true,
        created_at: "2026-09-12T14:20:00Z",
        avatar_url: null,
        is_verified: true,
        rank: "Especialista Mecánica Express",
        total_services: 76,
        average_rating: 4.90,
    },
    {
        id: "USR-005",
        email: "jorge.valencia@aspirante.co",
        full_name: "Jorge Valencia (En Validación)",
        phone: "+57 315 678 9012",
        role: "technician",
        is_active: true,
        created_at: "2026-10-25T11:00:00Z",
        avatar_url: null,
        is_verified: false,
        rank: "Aspirante a Certificación",
        total_services: 0,
        average_rating: 0,
    },
    {
        id: "USR-006",
        email: "admin@tec360.co",
        full_name: "Super Admin Tec360",
        phone: "+57 300 000 0000",
        role: "admin",
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        avatar_url: null,
    },
]

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [roleFilter, setRoleFilter] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const [changingRole, setChangingRole] = useState<string | null>(null)
    const [globalRoleCounts, setGlobalRoleCounts] = useState<{
        clients: number
        technicians: number
        reaction_team: number
        pending_verifications: number
    } | null>(null)

    useEffect(() => {
        if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search)
            const q = urlParams.get("search")
            if (q) setSearchQuery(q)
        }
    }, [])

    const fetchGlobalCounts = async () => {
        try {
            const res = await api.get("/admin/stats")
            if (res.data?.users) {
                setGlobalRoleCounts({
                    clients: res.data.users.clients ?? 0,
                    technicians: res.data.users.technicians ?? 0,
                    reaction_team: res.data.users.reaction_team ?? 0,
                    pending_verifications:
                        res.data.users.pending_verifications ??
                        res.data.users.unverified_technicians ??
                        0,
                })
            }
        } catch {
            // Silent fallback to local calculation
        }
    }

    const fetchUsers = async (customSearch?: string, customRole?: string) => {
        setLoading(true)
        try {
            const activeRole = customRole !== undefined ? customRole : roleFilter
            const activeSearch = (customSearch !== undefined ? customSearch : searchQuery).trim()
            const params = new URLSearchParams()
            if (activeRole) params.append("role", activeRole)
            if (activeSearch.length >= 1) params.append("search", activeSearch)
            const response = await api.get(`/admin/users?${params.toString()}`)
            const items = response.data?.items || []
            setUsers(items)
            setTotal(response.data?.total ?? items.length)
        } catch (error) {
            console.error("Error fetching users:", error)
            toast.error("Error al consultar el directorio de usuarios")
            setUsers([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchGlobalCounts()
    }, [])

    useEffect(() => {
        fetchUsers(searchQuery, roleFilter)
    }, [roleFilter])

    useEffect(() => {
        const t = setTimeout(() => {
            fetchUsers(searchQuery, roleFilter)
        }, 300)
        return () => clearTimeout(t)
    }, [searchQuery])

    const handleVerify = async (userId: string, currentStatus: boolean | undefined) => {
        try {
            const res = await api.put(`/admin/users/${userId}/verify?is_verified=${!currentStatus}`)
            const msg = res?.data?.message || (
                currentStatus
                    ? "Validación revocada: el técnico deberá realizar los cursos obligatorios"
                    : "Técnico validado: cursos obligatorios dados por cursados automáticamente"
            )
            toast.success(msg)
            fetchUsers()
            fetchGlobalCounts()
        } catch (error) {
            console.error(error)
            toast.error("No se pudo actualizar el estado de validación y cursos")
        }
    }

    const handleStatusChange = async (userId: string, currentActive: boolean) => {
        try {
            await api.put(`/admin/users/${userId}/status?is_active=${!currentActive}`)
            toast.success(currentActive ? "Usuario suspendido" : "Usuario activado")
            fetchUsers()
        } catch (error) {
            console.error(error)
            toast.error("No se pudo cambiar el estado del usuario")
        }
    }

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            setChangingRole(userId)
            const res = await api.put(`/admin/users/${userId}/role`, { role: newRole })
            const orgInfo = res?.data?.organization_name ? ` (${res.data.organization_name})` : ""
            toast.success(`Rol cambiado a ${ROLE_CONFIG[newRole]?.label || newRole}${orgInfo}`)
            fetchUsers()
            fetchGlobalCounts()
        } catch (error) {
            console.error(error)
            toast.error("No se pudo actualizar el rol del usuario")
        } finally {
            setChangingRole(null)
        }
    }

    const filteredUsers = users.filter(u => {
        if (roleFilter && u.role !== roleFilter) return false
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase().trim()
        return (
            u.full_name?.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.phone?.toLowerCase().includes(q) ||
            u.id.toLowerCase().includes(q)
        )
    })

    const techCount = globalRoleCounts?.technicians ?? users.filter(u => u.role === "technician").length
    const clientCount = globalRoleCounts?.clients ?? users.filter(u => u.role === "client").length
    const reactionCount = globalRoleCounts?.reaction_team ?? users.filter(u => u.role === "reaction_team").length
    const pendingVerificationCount =
        globalRoleCounts?.pending_verifications ??
        users.filter(u => u.role === "technician" && !u.is_verified).length

    return (
        <div className="space-y-6 font-sans">
            {/* ─── Page Header ─── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
                <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                        <UserCog className="w-6 h-6 text-blue-400" />
                        Gestión Central de Usuarios // Red Tec360
                    </h2>
                    <p className="text-xs font-mono text-slate-400 mt-1">
                        Directorio de clientes, especialistas certificados Tec360, equipo de reacción inmediata y permisos
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/admin/verificaciones"
                        className="px-3.5 py-2 rounded-xl bg-[#0B1736] border border-[#1E3A8A] text-[#93C5FD] text-xs font-mono font-semibold flex items-center gap-2 shadow-sm hover:bg-[#102456] transition-all"
                    >
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Mesa de Verificación Documental ({pendingVerificationCount})</span>
                        <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
                    </Link>
                </div>
            </div>

            {/* ─── Top 4 KPI Cards Matrix ─── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* KPI 1: Clientes */}
                <button
                    type="button"
                    onClick={() => setRoleFilter(roleFilter === "client" ? "" : "client")}
                    className={`text-left bg-[#0B132B] border rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-md transition-all ${
                        roleFilter === "client" ? "border-sky-500 ring-1 ring-sky-500/40" : "border-slate-800/80 hover:border-slate-700"
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-[10px] sm:text-[11px] font-mono font-semibold tracking-wider text-slate-300 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-sky-400" /> CLIENTES ACTIVOS
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black font-mono text-slate-100">
                            {clientCount.toLocaleString("es-CO")}
                        </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-mono text-slate-400 mt-1.5 truncate">
                        Registrados en plataforma
                    </p>
                </button>

                {/* KPI 2: Especialistas */}
                <button
                    type="button"
                    onClick={() => setRoleFilter(roleFilter === "technician" ? "" : "technician")}
                    className={`text-left bg-[#0B132B] border rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-md transition-all ${
                        roleFilter === "technician" ? "border-blue-500 ring-1 ring-blue-500/40" : "border-slate-800/80 hover:border-slate-700"
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-[10px] sm:text-[11px] font-mono font-semibold tracking-wider text-[#93C5FD] flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> ESPECIALISTAS TEC360
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black font-mono text-blue-400">
                            {techCount.toLocaleString("es-CO")}
                        </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-mono text-slate-400 mt-1.5 truncate">
                        Técnicos Certificados Tec360
                    </p>
                </button>

                {/* KPI 3: Reacción 24/7 */}
                <button
                    type="button"
                    onClick={() => setRoleFilter(roleFilter === "reaction_team" ? "" : "reaction_team")}
                    className={`text-left bg-[#0B132B] border rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-md transition-all ${
                        roleFilter === "reaction_team" ? "border-rose-500 ring-1 ring-rose-500/40" : "border-slate-800/80 hover:border-slate-700"
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-[10px] sm:text-[11px] font-mono font-semibold tracking-wider text-rose-300 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> REACCIÓN 24/7
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black font-mono text-rose-400">
                            {reactionCount.toLocaleString("es-CO")}
                        </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-mono text-slate-400 mt-1.5 truncate">
                        Patrullas tácticas motorizadas
                    </p>
                </button>

                {/* KPI 4: Mesa de Verificación */}
                <Link
                    href="/admin/verificaciones"
                    className="bg-[#0B132B] border border-slate-800/80 hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-lg backdrop-blur-md transition-all block"
                >
                    <div className="flex items-center justify-between text-slate-400 mb-2">
                        <span className="text-[10px] sm:text-[11px] font-mono font-semibold tracking-wider text-amber-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> PENDIENTES VALIDAR
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
                            {pendingVerificationCount.toLocaleString("es-CO")}
                        </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-mono text-slate-400 mt-1.5 truncate">
                        Documentos en cola de revisión
                    </p>
                </Link>
            </div>

            {/* ─── Main Directory Card ─── */}
            <div className="bg-[#080F24] border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-xl overflow-hidden">
                <div className="p-4 border-b border-slate-800/80 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    {/* Role Filter Tabs */}
                    <div className="flex gap-1.5 flex-wrap">
                        <button
                            onClick={() => setRoleFilter("")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${roleFilter === ""
                                ? "bg-[#0B1736] text-[#93C5FD] border border-[#1E3A8A] shadow-sm"
                                : "bg-[#0B132B] text-slate-400 hover:text-slate-200 border border-slate-800/80"
                                }`}
                        >
                            Todos ({total})
                        </button>
                        {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                            <button
                                key={key}
                                onClick={() => setRoleFilter(key)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${roleFilter === key
                                    ? "bg-[#0B1736] text-[#93C5FD] border border-[#1E3A8A] shadow-sm"
                                    : "bg-[#0B132B] text-slate-400 hover:text-slate-200 border border-slate-800/80"
                                    }`}
                            >
                                {cfg.label}
                            </button>
                        ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, email o teléfono..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-[#0B132B] border border-slate-800 rounded-xl text-xs font-mono text-slate-200 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-500"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono text-left">
                        <thead>
                            <tr className="border-b border-slate-800/80 uppercase tracking-wider text-slate-400 bg-[#060B1A]">
                                <th className="px-5 py-3">Usuario & Contacto</th>
                                <th className="px-5 py-3">Rol en Plataforma</th>
                                <th className="px-5 py-3">Estado</th>
                                <th className="px-5 py-3">Certificación & Rating</th>
                                <th className="px-5 py-3 text-right">Acciones Administrativas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400 font-mono">
                                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                        <span>Cargando directorio de usuarios...</span>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400 font-mono">
                                        No se encontraron usuarios coincidentes
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => {
                                    const roleCfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.client
                                    const initials = user.full_name
                                        ? user.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
                                        : user.email.slice(0, 2).toUpperCase()

                                    return (
                                        <tr key={user.id} className="hover:bg-[#0B132B]/60 transition-colors">
                                            {/* Columna Usuario */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-[#0B1736] border border-[#1E3A8A] flex-shrink-0 flex items-center justify-center font-bold text-xs text-[#93C5FD] shadow-xs">
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-100">{user.full_name || "Sin Nombre"}</p>
                                                        <p className="text-[11px] text-slate-400">{user.email}</p>
                                                        {user.phone && <p className="text-[10px] text-slate-500">{user.phone}</p>}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Columna Rol */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                    disabled={changingRole === user.id || user.role === "admin"}
                                                    aria-label={`Cambiar rol de ${user.full_name || user.email}`}
                                                    className={`text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg border cursor-pointer outline-none transition-all ${roleCfg.color} ${roleCfg.bg} ${roleCfg.border} disabled:opacity-50`}
                                                >
                                                    {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                                                        <option key={key} value={key} className="bg-slate-950 text-slate-200">
                                                            {cfg.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            {/* Columna Estado */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                                                    <span className={`text-[11px] font-bold ${user.is_active ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {user.is_active ? 'Activo' : 'Suspendido'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Columna Certificación */}
                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                {user.role === "technician" ? (
                                                    <div>
                                                        {user.is_verified ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                                                                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Cursos Homologados · Certificado Tec360
                                                            </span>
                                                        ) : (
                                                            <Link
                                                                href="/admin/verificaciones"
                                                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25"
                                                            >
                                                                <span>Cursos Pendientes / En Validación</span>
                                                                <ExternalLink className="w-2.5 h-2.5" />
                                                            </Link>
                                                        )}
                                                        {user.rank && (
                                                            <p className="text-[10px] text-slate-400 mt-1">
                                                                {user.rank} {user.average_rating ? `· ★ ${user.average_rating.toFixed(2)}` : ""}
                                                            </p>
                                                        )}
                                                        {user.organization_name && (
                                                            <p className="text-[10px] text-cyan-400 mt-0.5 flex items-center gap-1">
                                                                <Building2 className="w-3 h-3" /> {user.organization_name}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : user.role === "company_admin" ? (
                                                    <div>
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                                                            <Building2 className="w-3 h-3 text-cyan-400" />
                                                            {user.organization_name || "Titular de Organización / Taller"}
                                                        </span>
                                                        <p className="text-[10px] text-slate-400 mt-1">
                                                            Billetera Compartida · Gestión de Flota
                                                        </p>
                                                    </div>
                                                ) : user.role === "reaction_team" ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-300">
                                                        🚨 Escuadrón Activo 24/7
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-slate-500 font-mono">Cliente Final</span>
                                                )}
                                            </td>

                                            {/* Columna Acciones */}
                                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2">
                                                    {user.role !== "admin" && (
                                                        <button
                                                            onClick={() => handleStatusChange(user.id, user.is_active)}
                                                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all text-[11px] font-bold ${user.is_active
                                                                ? 'border-rose-500/40 text-rose-400 hover:bg-rose-500 hover:text-white'
                                                                : 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                                                                }`}
                                                        >
                                                            <Ban className="w-3 h-3" />
                                                            <span>{user.is_active ? "Suspender" : "Activar"}</span>
                                                        </button>
                                                    )}

                                                    {user.role === "technician" && (
                                                        <button
                                                            onClick={() => handleVerify(user.id, user.is_verified)}
                                                            title={
                                                                user.is_verified
                                                                    ? "Revocar validación de cursos obligatorios"
                                                                    : "Dar por cursados los cursos obligatorios y habilitar al técnico para operar sin trabas"
                                                            }
                                                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all text-[11px] font-bold ${user.is_verified
                                                                ? 'border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-700 bg-slate-900/60'
                                                                : 'bg-[#0B1736] border-[#1E3A8A] text-[#93C5FD] hover:bg-[#102456]'
                                                                }`}
                                                        >
                                                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                                                            <span>{user.is_verified ? "Revocar" : "Validar"}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer */}
                <div className="px-5 py-3 border-t border-slate-800/80 bg-[#050810] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] font-mono text-slate-500">
                    <span>Directorio centralizado Tec360 v3.0 · Permisos RBAC y trazabilidad de identidad</span>
                    <span>Mostrando {filteredUsers.length} de {total} usuarios registrados</span>
                </div>
            </div>
        </div>
    )
}
