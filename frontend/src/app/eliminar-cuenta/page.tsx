"use client"

import { useState } from "react"
import { Trash2, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react"

export default function EliminarCuentaPage() {
  const [phone, setPhone] = useState("")
  const [reason, setReason] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) return

    setLoading(true)
    // Simular recepción o envío de solicitud de eliminación
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
    }, 1000)
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-red-500/10 border border-red-500/20 rounded-2xl mb-4 text-red-400">
            <Trash2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Solicitud de Eliminación de Cuenta y Datos Personales
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Portal oficial de Habeas Data y Supresión de Datos • <strong>TrackTec S.A.S.</strong> (Plataforma Tec360)
          </p>
        </div>

        {submitted ? (
          <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-2xl p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Solicitud Registrada</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Hemos recibido tu solicitud de supresión para el número <strong>{phone}</strong>. TrackTec S.A.S. procederá con la anonimización y eliminación de tus datos personales, fotografías y registros en un plazo máximo de 48 a 72 horas hábiles, conforme a la Ley 1581 de 2012 y las políticas de Google Play Store.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 flex gap-3 text-amber-300 text-xs sm:text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>
                Esta acción es irreversible. Al eliminar tu cuenta perderás tu historial de servicios, calificaciones, puntos acumulados y acceso a la plataforma.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Número de Teléfono Registrado *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ej: +57 300 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Motivo de la solicitud (Opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Cuéntanos por qué deseas eliminar tu cuenta..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
              >
                {loading ? "Procesando solicitud..." : "Solicitar Eliminación Definitiva"}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-slate-500" />
              <span>También puedes solicitarlo directamente escribiendo a <strong>soporte@tec-360.tech</strong></span>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
