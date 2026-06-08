"use client"

import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, TriangleAlert, Car, Camera, CheckCircle, X, Loader2, PauseCircle } from "lucide-react"
import { fetchWithAuth } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

export default function ReportarIncidente() {
  const router = useRouter()
  const params = useParams()
  const serviceId = params.id as string
  const { user } = useAuth()
  
  // State
  const [incidentType, setIncidentType] = useState("")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serviceInfo, setServiceInfo] = useState<any>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch service info on mount to show "Servicio Actual" correctly
  useEffect(() => {
    async function loadService() {
      try {
        const data = await fetchWithAuth(`/services/${serviceId}`)
        setServiceInfo(data)
      } catch (err) {
        console.error("Error loading service", err)
      }
    }
    if (serviceId) loadService()
  }, [serviceId])
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const removeFile = () => {
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async () => {
    if (!incidentType) {
      alert("Por favor selecciona un tipo de incidente")
      return
    }
    
    setIsSubmitting(true)
    try {
      // Create IncidentCreate payload
      const payload = {
        incident_type: incidentType,
        description: description,
        evidence_url: file ? URL.createObjectURL(file) : null
      }
      
      await fetchWithAuth(`/services/${serviceId}/incident`, {
        method: "POST",
        body: JSON.stringify(payload)
      })
      
      alert("Reporte enviado con éxito. El servicio ha sido pausado.")
      router.push(`/tecnicos/servicio/${serviceId}`)
    } catch (err: any) {
      alert("Error al reportar incidente: " + (err.message || "Error desconocido"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen pb-32 text-slate-100 bg-[#1d1b26] overflow-x-hidden">
      {/* Mesh gradient background */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 0% 0%, rgba(79, 70, 229, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.05) 0%, transparent 100%)
          `
        }}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/5 backdrop-blur-xl border-b border-white/10 z-50 flex items-center justify-between px-4">
        <button 
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold tracking-tight">Reportar Incidente</h1>
        <div className="p-2 -mr-2 text-orange-500">
          <TriangleAlert className="w-6 h-6" />
        </div>
      </header>

      <main className="pt-24 px-4 space-y-6 max-w-lg mx-auto relative z-10">
        {/* Service Info Card */}
        <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shrink-0">
            <Car className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Servicio Actual</p>
            <h2 className="text-base font-semibold leading-tight line-clamp-1">
              {serviceInfo ? `${serviceInfo.title || "Servicio"} - ${serviceInfo.vehicle_model || ""}` : "Cargando..."}
            </h2>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5 tracking-tight truncate">
              ID: #{serviceId ? serviceId.split('-')[0].toUpperCase() : "..."}
            </p>
          </div>
        </section>

        {/* Form Section */}
        <section className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 fill-mode-forwards">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.37)] rounded-3xl p-6 space-y-6">
            
            {/* Incident Type */}
            <div className="space-y-2">
              <label htmlFor="incident-type" className="text-sm font-medium text-slate-300 ml-1">Tipo de Incidente</label>
              <div className="relative">
                <select 
                  id="incident-type" 
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  className="w-full h-14 px-4 rounded-2xl text-base bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/20 appearance-none transition-all"
                >
                  <option value="" disabled>Selecciona una opción</option>
                  <option value="client_absent" className="bg-slate-800">Cliente ausente</option>
                  <option value="vehicle_mismatch" className="bg-slate-800">Vehículo no corresponde</option>
                  <option value="device_incompatible" className="bg-slate-800">Problema técnico (Dispositivo incompatible)</option>
                  <option value="security_issue" className="bg-slate-800">Problema de seguridad</option>
                  <option value="other" className="bg-slate-800">Otro</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-slate-300 ml-1">Descripción del problema</label>
              <textarea 
                id="description" 
                rows={4} 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-4 rounded-2xl text-base resize-none bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-500" 
                placeholder="Explica detalladamente qué sucedió..."
              ></textarea>
            </div>

            {/* Evidence Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Evidencia Fotográfica</label>
              
              {!file ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-white/5 border-2 border-dashed border-white/10 cursor-pointer hover:bg-white/10 hover:border-indigo-500/50 active:scale-[0.98] transition-all group"
                >
                  <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Camera className="w-7 h-7 text-slate-400 group-hover:text-white transition-colors" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-200">Subir foto de evidencia</p>
                    <p className="text-xs text-slate-500 mt-1">Toca para seleccionar un archivo</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl mt-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-medium truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Listo para enviar</p>
                  </div>
                  <button 
                    onClick={removeFile}
                    className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/5 backdrop-blur-xl border-t border-white/10 z-50">
        <div className="max-w-lg mx-auto space-y-3">
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || !incidentType}
            className={`w-full h-14 rounded-2xl text-white font-bold text-base bg-gradient-to-br from-red-500 to-red-700 shadow-xl flex items-center justify-center gap-2 transition-all
              ${(isSubmitting || !incidentType) ? "opacity-50 cursor-not-allowed" : "hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-5px_rgba(239,68,68,0.3)]"}
            `}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <PauseCircle className="w-5 h-5" />
                Reportar y Pausar Servicio
              </>
            )}
          </button>
          <button 
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="w-full h-12 rounded-2xl text-slate-400 font-medium text-sm hover:text-white hover:bg-white/5 transition-all"
          >
            Cancelar
          </button>
        </div>
      </footer>
    </div>
  )
}
