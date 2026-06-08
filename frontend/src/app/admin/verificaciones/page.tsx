"use client"

import { useState, useEffect } from "react"
import { Shield, FileText, CheckCircle, XCircle, AlertCircle, Clock, ChevronRight } from "lucide-react"
import { fetchWithAuth } from "@/lib/api"
import Image from "next/image"

type PendingVerification = {
    technician_id: string
    full_name: string
    phone: string
    uploaded_at: string
    documents_count: number
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

    useEffect(() => {
        loadPending()
    }, [])

    const loadPending = async () => {
        try {
            setLoading(true)
            const res = await fetchWithAuth("/verification/admin/pending")
            const data = await res.json()
            setPending(data)
        } catch (error) {
            console.error("Error cargando verificaciones:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleSelectTech = async (tech: PendingVerification) => {
        setSelectedTech(tech)
        setDocsLoading(true)
        setRejectionReason("")
        try {
            const res = await fetchWithAuth(`/verification/admin/${tech.technician_id}/documents`)
            const data = await res.json()
            setDocs(data)
        } catch (error) {
            console.error("Error cargando documentos:", error)
        } finally {
            setDocsLoading(false)
        }
    }

    const handleReview = async (status: "approved" | "rejected") => {
        if (status === "rejected" && !rejectionReason.trim()) {
            alert("Debes proporcionar una razón de rechazo")
            return
        }

        try {
            await fetchWithAuth(`/verification/admin/${selectedTech?.technician_id}/review`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status,
                    rejection_reason: status === "rejected" ? rejectionReason : null
                })
            })
            
            alert(`Documentos ${status === "approved" ? "aprobados" : "rechazados"} exitosamente.`)
            setSelectedTech(null)
            loadPending()
        } catch (error) {
            console.error("Error revisando documentos:", error)
            alert("Ocurrió un error")
        }
    }

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Verificación de Técnicos</h1>
                    <p className="text-slate-500 mt-1">
                        Revisa los documentos de identidad y certificados para desbloquear el quiz de conocimientos.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lista de pendientes */}
                <div className="lg:col-span-1 border rounded-xl bg-white dark:bg-[#101822] border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[600px]">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                        <h2 className="font-semibold">Pendientes ({pending.length})</h2>
                        <Clock className="w-4 h-4 text-slate-500" />
                    </div>
                    
                    <div className="overflow-y-auto flex-1 p-2 space-y-2">
                        {pending.length === 0 ? (
                            <div className="text-center p-8 text-slate-500">
                                <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No hay técnicos pendientes de revisión.</p>
                            </div>
                        ) : (
                            pending.map(tech => (
                                <div 
                                    key={tech.technician_id}
                                    onClick={() => handleSelectTech(tech)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                        selectedTech?.technician_id === tech.technician_id 
                                            ? "border-primary bg-primary/5 dark:bg-primary/10" 
                                            : "border-slate-200 dark:border-slate-800 hover:border-primary/50"
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-sm">{tech.full_name}</p>
                                            <p className="text-xs text-slate-500">{tech.phone}</p>
                                        </div>
                                        <ChevronRight className={`w-4 h-4 ${selectedTech?.technician_id === tech.technician_id ? "text-primary" : "text-slate-300"}`} />
                                    </div>
                                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                                        <FileText className="w-3 h-3" />
                                        <span>{tech.documents_count} documentos</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Panel de revisión */}
                <div className="lg:col-span-2 border rounded-xl bg-white dark:bg-[#101822] border-slate-200 dark:border-slate-800 h-[600px] flex flex-col">
                    {selectedTech ? (
                        <>
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                                <h2 className="font-semibold text-lg">{selectedTech.full_name}</h2>
                                <p className="text-sm text-slate-500">Documentos subidos: {new Date(selectedTech.uploaded_at).toLocaleDateString()}</p>
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto">
                                {docsLoading ? (
                                    <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                                ) : (
                                    <div className="space-y-6">
                                        {docs.map(doc => (
                                            <div key={doc.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <FileText className="text-primary w-5 h-5" />
                                                    <h3 className="font-medium capitalize">{doc.document_type.replace('_', ' ')}</h3>
                                                </div>
                                                <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-2 flex justify-center">
                                                    {/* Usar img tag genérico o link si es PDF */}
                                                    {doc.document_url.endsWith('.pdf') ? (
                                                        <a href={doc.document_url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-2 p-4">
                                                            <FileText /> Ver PDF adjunto
                                                        </a>
                                                    ) : (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img 
                                                            src={doc.document_url} 
                                                            alt={doc.document_type} 
                                                            className="max-h-[300px] object-contain rounded"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                            <label className="block text-sm font-medium mb-2">Razón de rechazo (opcional si apruebas):</label>
                                            <textarea 
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                                                rows={3}
                                                placeholder="Ej: La foto de la cédula está borrosa..."
                                                value={rejectionReason}
                                                onChange={e => setRejectionReason(e.target.value)}
                                            ></textarea>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-3 justify-end">
                                <button 
                                    onClick={() => handleReview('rejected')}
                                    className="px-4 py-2 border border-red-200 bg-red-50 text-red-600 dark:bg-red-900/20 dark:border-red-800 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center gap-2"
                                >
                                    <XCircle className="w-4 h-4" /> Rechazar
                                </button>
                                <button 
                                    onClick={() => handleReview('approved')}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    <CheckCircle className="w-4 h-4" /> Aprobar y Desbloquear Quiz
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                            <Shield className="w-16 h-16 mb-4 text-slate-300 dark:text-slate-700" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Selecciona un técnico</h3>
                            <p className="mt-1 text-sm max-w-xs">
                                Haz clic en un técnico de la lista para revisar sus documentos de identidad y certificados.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
