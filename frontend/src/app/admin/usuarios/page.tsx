"use client"

import { useEffect, useState } from "react"
import { Ban, CheckCircle, ChevronLeft, ChevronRight, UserCog } from "lucide-react"
import { toast } from "react-hot-toast"
import api from "@/lib/api"
import { Badge } from "@/components/ui/badge"

interface AdminUser {
    id: string
    email: string
    full_name: string | null
    role: string
    is_active: boolean
    created_at: string
    avatar_url: string | null
    // Tech specific
    is_verified?: boolean
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)

    const fetchUsers = async () => {
        try {
            const response = await api.get("/admin/users")
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
    }, [])

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

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2"><UserCog className="w-5 h-5 text-primary" /> Gestión de Usuarios</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Directorio completo de clientes y técnicos registrados en la plataforma.</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Nombre</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Rol</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Validado SENA</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">Cargando usuarios...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">No hay usuarios registrados</td></tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex-shrink-0 overflow-hidden">
                                                {user.avatar_url ? (
                                                    <img src={`https://tec-360.tech${user.avatar_url}`} alt="avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 text-sm">
                                                        {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold">{user.full_name || "Sin Nombre"}</p>
                                                <p className="text-xs text-slate-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.role === "technician" ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                                Técnico
                                            </span>
                                        ) : user.role === "admin" ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                Admin
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                                Cliente
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                            <span className="text-xs font-medium">{user.is_active ? 'Activo' : 'Suspendido'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.role === "technician" ? (
                                            user.is_verified ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                                    Sí
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                                    No
                                                </span>
                                            )
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
                                                    <CheckCircle className="w-3.5 h-3.5" /> {user.is_verified ? "Quitar Verificación" : "Validar SENA"}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">Mostrando {users.length} de {total} usuarios</p>
                <div className="flex items-center gap-2">
                    <button className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-400 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-400 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
