"use client"

import { useState, useEffect } from "react"
import {
    Shield, FileText, CheckCircle, XCircle,
    Clock, ChevronRight, UserCheck, ArrowLeft, ShieldCheck,
    X, Search, ExternalLink, RefreshCw
} from "lucide-react"
import { fetchWithAuth } from "@/lib/api"
import { getImageUrl } from "@/lib/utils"
import Link from "next/link"
import { toast } from "react-hot-toast"

type PendingVerification = {
    technician_id: string
    full_name: string
    phone: string
    uploaded_at: string
    documents_count: number
    specialty?: string
}

type TechnicianDocument = {
    id: string
    document_type: string
    document_url: string
    status: string
    uploaded_at: string
}

export default function VerificacionesAdmin() {
    const [pending, setPending] = useState<PendingVerification[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedTech, setSelectedTech] = useState<PendingVerification | null>(null)
    const [docs, setDocs] = useState<TechnicianDocument[]>([])
    const [docsLoading, setDocsLoading] = useState(false)
    const [rejectionReason, setRejectionReason] = useState("")
    const [actionMessage, setActionMessage] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search)
            const q = urlParams.get("search")
            if (q) setSearchQuery(q)
        }
        loadPending()
    }, [])

    const loadPending = async () => {
        try {
            setLoading(true)
            const res = await fetchWithAuth("/verification/admin/pending")
            if (!res.ok) {
                setPending([])
                setSelectedTech(null)
                return
            }
            const data = await res.json()
            const list = Array.isArray(data) ? data : []
            setPending(list)
            if (list.length > 0) {
                handleSelectTech(list[0])
            } else {
                setSelectedTech(null)
                setDocs([])
            }
        } catch (error) {
            console.error("Error cargando verificaciones:", error)
            setPending([])
            setSelectedTech(null)
        } finally {
            setLoading(false)
        }
    }

    const handleSelectTech = async (tech: PendingVerification) => {
        setSelectedTech(tech)
        setDocsLoading(true)
        setRejectionReason("")
        setActionMessage(null)
        try {
            const res = await fetchWithAuth(`/verification/admin/${tech.technician_id}/documents`)
            const data = await res.json()
            setDocs(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error("Error cargando documentos:", error)
            setDocs([])
        } finally {
            setDocsLoading(false)
        }
    }

    const handleReview = async (status: "approved" | "rejected") => {
        if (!selectedTech) return
        if (status === "rejected" && !rejectionReason.trim()) {
            toast.error("Debes proporcionar una razón de rechazo formal")
            return
        }

        try {
            const res = await fetchWithAuth(`/verification/admin/${selectedTech.technician_id}/review`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status,
                    rejection_reason: status === "rejected" ? rejectionReason : null
                })
            })
            if (!res.ok) {
                toast.error("No se pudo procesar la revisión del especialista")
                return
            }
            const msg = `Especialista ${status === "approved" ? "aprobado como Técnico Certificado Tec360" : "rechazado"} exitosamente.`
            setActionMessage(msg)
            toast.success(msg)
            const remaining = pending.filter(t => t.technician_id !== selectedTech.technician_id)
            setPending(remaining)
            if (remaining.length > 0) {
                handleSelectTech(remaining[0])
            } else {
                setSelectedTech(null)
                setDocs([])
            }
        } catch (error) {
            console.error("Error revisando documentos:", error)
            toast.error("Error de red al revisar documentos")
        }
    }

    const filteredPending = pending.filter((t) => {
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase().trim()
        return (
            t.full_name?.toLowerCase().includes(q) ||
            t.phone?.toLowerCase().includes(q) ||
            String(t.technician_id).toLowerCase().includes(q)
        )
    })

    return (
        <div className="space-y-6 font-sans">
            {/* ─── Header ─── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/admin/usuarios" className="text-slate-400 hover:text-slate-200 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                            <ShieldCheck className="w-6 h-6 text-emerald-400" />
                            Mesa de Control // Verificación de Especialistas Tec360
                        </h2>
                    </div>
                    <p className="text-xs font-mono text-slate-400 mt-1">
                        Validación estricta de documentos de identidad, antecedentes judiciales y certificación técnica de competencias
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={loadPending}
                        disabled={loading}
                        className="px-3 py-1.5 rounded-xl bg-[#0B132B] hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${loading ? "animate-spin" : ""}`} />
                        <span>Sincronizar</span>
                    </button>
                    <span className="px-3 py-1.5 rounded-xl bg-[#0B1736] border border-[#1E3A8A] text-[#93C5FD] text-xs font-mono font-semibold flex items-center gap-2 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        {pending.length} Pendientes en Cola
                    </span>
                </div>
            </div>

            {/* ─── Action Alert ─── */}
            {actionMessage && (
                <div className="p-3.5 rounded-xl bg-[#064E3B]/40 border border-[#059669] text-[#6EE7B7] text-xs font-mono flex items-center justify-between animate-fadeIn">
                    <span>✓ {actionMessage}</span>
                    <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ─── Main 2-Column Review Grid ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Lista de Pendientes (4 cols) */}
                <div className="lg:col-span-4 bg-[#080F24] border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-xl overflow-hidden flex flex-col h-[700px]">
                    <div className="p-4 border-b border-slate-800/80 bg-[#060B1A] space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-xs font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                Aspirantes por Validar ({filteredPending.length})
                            </h3>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar por nombre o teléfono..."
                                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#0B132B] border border-slate-800 text-xs font-mono text-slate-200 placeholder:text-slate-500 outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>
                    
                    <div className="overflow-y-auto flex-1 p-3 space-y-2.5">
                        {loading ? (
                            <div className="text-center p-8 text-slate-400 font-mono text-xs">
                                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                <span>Cargando aspirantes...</span>
                            </div>
                        ) : filteredPending.length === 0 ? (
                            <div className="text-center p-8 text-slate-400 font-mono text-xs">
                                <Shield className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-400" />
                                <p className="font-bold text-slate-300">
                                    {searchQuery ? "Sin coincidencias en la cola" : "Todos los documentos están validados"}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-1">
                                    {searchQuery ? "Prueba otro término de búsqueda" : "No hay aspirantes pendientes en este momento"}
                                </p>
                            </div>
                        ) : (
                            filteredPending.map(tech => {
                                const isSelected = selectedTech?.technician_id === tech.technician_id
                                return (
                                    <div 
                                        key={tech.technician_id}
                                        onClick={() => handleSelectTech(tech)}
                                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                                            isSelected 
                                                ? "border-[#1E3A8A] bg-[#0B1736] shadow-md" 
                                                : "border-slate-800/70 bg-[#0B132B]/60 hover:border-slate-700 hover:bg-[#0B132B]"
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <p className="font-bold text-xs font-mono text-slate-100">{tech.full_name}</p>
                                                <p className="text-[10px] font-mono text-slate-400 mt-0.5">{tech.phone}</p>
                                                {tech.specialty && (
                                                    <span className="inline-block mt-1.5 px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/25 text-[#93C5FD] text-[9px] font-mono font-semibold">
                                                        {tech.specialty}
                                                    </span>
                                                )}
                                            </div>
                                            <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? "text-blue-400 translate-x-1" : "text-slate-600"}`} />
                                        </div>
                                        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <FileText className="w-3 h-3 text-slate-500" />
                                                <span>{tech.documents_count} documentos</span>
                                            </span>
                                            <span className="text-slate-500">
                                                {tech.uploaded_at
                                                    ? new Date(tech.uploaded_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" })
                                                    : "Reciente"}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Right: Panel de Revisión Documental (8 cols) */}
                <div className="lg:col-span-8 bg-[#080F24] border border-slate-800/80 rounded-2xl shadow-xl backdrop-blur-xl h-[700px] flex flex-col overflow-hidden">
                    {selectedTech ? (
                        <>
                            {/* Panel Header */}
                            <div className="p-4 border-b border-slate-800/80 bg-[#060B1A] flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                                        <UserCheck className="w-4 h-4 text-blue-400" />
                                        Expediente de {selectedTech.full_name}
                                    </h3>
                                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                                        ID Técnico: {selectedTech.technician_id}
                                        {selectedTech.uploaded_at && (
                                            <> · Subido el {new Date(selectedTech.uploaded_at).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}</>
                                        )}
                                    </p>
                                </div>
                                <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] font-mono font-bold">
                                    En Evaluación
                                </span>
                            </div>

                            {/* Document Viewer Body */}
                            <div className="p-5 flex-1 overflow-y-auto space-y-4">
                                {docsLoading ? (
                                    <div className="flex flex-col items-center justify-center py-16 font-mono text-xs text-slate-400">
                                        <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                                        <span>Cargando legajo documental...</span>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {docs.map(doc => {
                                                const resolvedUrl = getImageUrl(doc.document_url) || doc.document_url
                                                return (
                                                    <div key={doc.id} className="p-3.5 rounded-xl bg-[#0B132B] border border-slate-800/80 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <FileText className="text-blue-400 w-4 h-4" />
                                                                <h4 className="font-mono font-bold text-xs text-slate-200 capitalize">
                                                                    {doc.document_type.replace(/_/g, ' ')}
                                                                </h4>
                                                            </div>
                                                            <a
                                                                href={resolvedUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 font-bold border border-blue-500/30 flex items-center gap-1"
                                                            >
                                                                <span>Abrir</span>
                                                                <ExternalLink className="w-2.5 h-2.5" />
                                                            </a>
                                                        </div>

                                                        <div className="h-44 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-center overflow-hidden relative group">
                                                            {resolvedUrl.toLowerCase().endsWith('.pdf') ? (
                                                                <a
                                                                    href={resolvedUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="text-blue-400 hover:text-blue-300 flex flex-col items-center gap-2 p-4 font-mono text-xs"
                                                                >
                                                                    <FileText className="w-8 h-8 text-blue-400" />
                                                                    <span>Abrir PDF Adjunto</span>
                                                                </a>
                                                            ) : (
                                                                <a
                                                                    href={resolvedUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="w-full h-full block relative"
                                                                >
                                                                    <img
                                                                        src={resolvedUrl}
                                                                        alt={doc.document_type}
                                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                                    />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        {/* Rejection Note */}
                                        <div className="pt-3 border-t border-slate-800/80 space-y-2 font-mono">
                                            <label className="block text-xs font-semibold text-slate-300">
                                                Motivo de Rechazo (Requerido únicamente si se rechaza):
                                            </label>
                                            <textarea 
                                                className="w-full bg-[#0B132B] border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-blue-500"
                                                rows={2}
                                                placeholder="Ej: Documento de antecedentes con vigencia superior a 30 días o cédula ilegible..."
                                                value={rejectionReason}
                                                onChange={e => setRejectionReason(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Panel Footer Controls */}
                            <div className="p-4 border-t border-slate-800/80 bg-[#060B1A] flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
                                <span className="text-[10px] text-slate-500">
                                    Al aprobar, el aspirante queda registrado como Técnico Certificado Tec360
                                </span>
                                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                                    <button 
                                        onClick={() => handleReview('rejected')}
                                        className="flex-1 sm:flex-initial px-4 py-2 border border-rose-500/40 bg-rose-500/10 text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <XCircle className="w-4 h-4" /> Rechazar
                                    </button>
                                    <button 
                                        onClick={() => handleReview('approved')}
                                        className="flex-1 sm:flex-initial px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                        <CheckCircle className="w-4 h-4" /> Aprobar Certificación Tec360
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center font-mono">
                            <ShieldCheck className="w-14 h-14 mb-3 text-slate-700" />
                            <h3 className="text-sm font-bold text-slate-200">Selecciona un aspirante</h3>
                            <p className="mt-1 text-xs text-slate-400 max-w-xs">
                                Haz clic en un especialista de la columna izquierda para auditar sus credenciales y antecedentes
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
