"use client"

import { useEffect, useState } from "react"
import { ShieldAlert, ChevronLeft, ChevronRight, MapPin, CalendarClock, User } from "lucide-react"
import { toast } from "react-hot-toast"
import api from "@/lib/api"
import { Badge } from "@/components/ui/badge"

interface AdminService {
    id: string
    title: string
    service_type: string
    status: string
    service_address: string
    client_id: string
    technician_id: string | null
    created_at: string
}

export default function AdminServicesPage() {
    const [services, setServices] = useState<AdminService[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)

    const fetchServices = async () => {
        try {
            const response = await api.get("/admin/services")
            setServices(response.data.items)
            setTotal(response.data.total)
        } catch (error) {
            console.error("Error fetching services:", error)
            toast.error("Error al cargar servicios")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchServices()
    }, [])

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-primary" /> Gestión de Servicios</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Supervisión global de todas las solicitudes, cotizaciones y trabajos activos.</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Servicio & Detalles</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Cliente / Técnico</th>
                            <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">Fecha</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">Cargando servicios...</td></tr>
                        ) : services.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">No hay servicios registrados</td></tr>
                        ) : (
                            services.map((service) => (
                                <tr key={service.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-semibold">{service.title}</p>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                            <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0">
                                                {service.service_type.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {service.service_address.substring(0, 30)}...</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant={
                                            service.status === 'completed' ? 'default' :
                                                service.status === 'cancelled' ? 'destructive' :
                                                    service.status === 'pending' ? 'outline' : 'secondary'
                                        }>
                                            {service.status.toUpperCase()}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <p className="text-xs flex items-center gap-1"><User className="w-3 h-3 text-slate-400" /> Cli: {service.client_id.substring(0, 8)}...</p>
                                            {service.technician_id ? (
                                                <p className="text-xs flex items-center gap-1 text-primary"><User className="w-3 h-3" /> Tec: {service.technician_id.substring(0, 8)}...</p>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic">Sin técnico asignado</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-medium flex items-center gap-1 text-slate-500">
                                            <CalendarClock className="w-3.5 h-3.5" /> {new Date(service.created_at).toLocaleDateString()}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">Mostrando {services.length} de {total} servicios</p>
            </div>
        </div>
    )
}
