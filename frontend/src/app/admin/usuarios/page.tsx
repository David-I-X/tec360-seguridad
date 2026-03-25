"use client"

import { useEffect, useState } from "react"
import { Ban, CheckCircle, ChevronLeft, ChevronRight, UserCog, Search } from "lucide-react"
import { toast } from "react-hot-toast"
import api from "@/lib/api"
import { getAvatarUrl } from "@/lib/utils"

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
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    client: { label: "Cliente", color: "text-slate-800 dark:text-slate-200", bg: "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700" },
    technician: { label: "Técnico", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
    admin: { label: "Admin", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
    reaction_team: { label: "Eq. Reacción", color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20" },
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [roleFilter, setRoleFilter] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const [changingRole, setChangingRole] = useState<string | null>(null)

    const fetchUsers = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (roleFilter) params.append("role", roleFilter)
            if (searchQuery.length >= 2) params.append("search", searchQuery)
            const response = await api.get(`/admin/users?${params.toString()}`)
            setUsers(response.data.items)
            setTotal(response.data.total)
        } catch (error) {
            console.error("Error fetching users:", error)
            toast.error("Error al cargar usuarios")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [roleFilter])

    useEffect(() => {
        if (searchQuery.length >= 2 || searchQuery.length === 0) {
            const t = setTimeout(fetchUsers, 400)
            return () => clearTimeout(t)
        }
    }, [searchQuery])

    const handleVerify = async (userId: string, currentStatus: boolean | undefined) => {
        try {
            await api.put(`/admin/users/${userId}/verify?is_verified=${!currentStatus}`)
            toast.success(currentStatus ? "Verificación removida" : "Técnico verificado exitosamente")
            fetchUsers()
        } catch (error) {
            toast.error("Error al verificar técnico")
        }
    }

    const handleStatusChange = async (userId: string, currentActive: boolean) => {
        try {
            await api.put(`/admin/users/${userId}/status?is_active=${!currentActive}`)
            toast.success(currentActive ? "Usuario suspendido" : "Usuario activado")
            fetchUsers()
        } catch (error) {
            toast.error("Error al cambiar estado")
        }
    }

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            setChangingRole(userId)
            await api.put(`/admin/users/${userId}/role`, { role: newRole })
            toast.success(`Rol cambiado a ${ROLE_CONFIG[newRole]?.label || newRole}`)
            fetchUsers()
        } catch (error) {
            toast.error("Error al cambiar rol")
        } finally {
            setChangingRole(null)
        }
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2"><UserCog className="w-5 h-5 text-primary" /> Gestión de Usuarios</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Directorio completo de clientes, técnicos y equipos de reacción.</p>
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">{total} total</span>
                </div>
                
                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, email o teléfono..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                    >
                        <option value="">Todos los roles</option>
                        {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                            <option key={key} value={key}>{cfg.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Nombre</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Rol</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">SENA</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">Cargando usuarios...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">No hay usuarios que coincidan</td></tr>
                        ) : (
                            users.map((user) => {
                                const roleCfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.client
                                return (
                                    <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex-shrink-0 overflow-hidden">
                                                    {user.avatar_url ? (
                                                        <img src={getAvatarUrl(user.avatar_url)} alt="avatar" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 text-sm">
                                                            {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold">{user.full_name || "Sin Nombre"}</p>
                                                    <p className="text-xs text-slate-500">{user.email}</p>
                                                    {user.phone && <p className="text-xs text-slate-400">{user.phone}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                disabled={changingRole === user.id || user.role === "admin"}
                                                className={`text-xs font-medium px-2.5 py-1 rounded-full border cursor-pointer ${roleCfg.color} ${roleCfg.bg} disabled:opacity-50`}
                                            >
                                                {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                                                    <option key={key} value={key}>{cfg.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                                <span className="text-xs font-medium">{user.is_active ? 'Activo' : 'Suspendido'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.role === "technician" ? (
                                                <div>
                                                    {user.is_verified ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                                            ✅ Verificado
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                                            No
                                                        </span>
                                                    )}
                                                    {user.rank && <p className="text-[10px] text-slate-400 mt-1">{user.rank} · {user.total_services || 0} servicios</p>}
                                                </div>
                                            ) : (
                                                <span className="text-xs font-bold text-slate-400">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {user.role !== "admin" && (
                                                    <button
                                                        onClick={() => handleStatusChange(user.id, user.is_active)}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-xs font-bold ${user.is_active
                                                            ? 'border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white'
                                                            : 'border-emerald-500/50 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                                                            }`}
                                                    >
                                                        <Ban className="w-3.5 h-3.5" /> {user.is_active ? "Suspender" : "Activar"}
                                                    </button>
                                                )}

                                                {user.role === "technician" && (
                                                    <button
                                                        onClick={() => handleVerify(user.id, user.is_verified)}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-xs font-bold ${user.is_verified
                                                            ? 'border-slate-300 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
                                                            : 'bg-primary border-primary text-white hover:bg-primary/90'
                                                            }`}
                                                    >
                                                        <CheckCircle className="w-3.5 h-3.5" /> {user.is_verified ? "Quitar SENA" : "Validar SENA"}
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

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">Mostrando {users.length} de {total} usuarios</p>
            </div>
        </div>
    )
}
