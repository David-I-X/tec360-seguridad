"use client"

import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, ReceiptText, Car, Camera, CheckCircle, X, Loader2, ArrowRight } from "lucide-react"
import { fetchWithAuth } from "@/lib/api"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function AjusteMonto() {
  const router = useRouter()
  const params = useParams()
  const serviceId = params.id as string
  
  // State
  const [amount, setAmount] = useState("")
  const [concept, setConcept] = useState("")
  const [justification, setJustification] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serviceInfo, setServiceInfo] = useState<any>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch service info on mount
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
    if (!amount || parseFloat(amount) <= 0) {
      alert("Por favor ingresa un monto válido mayor a 0")
      return
    }
    if (!concept) {
      alert("Por favor selecciona un concepto")
      return
    }
    if (!justification) {
      alert("Por favor ingresa una justificación")
      return
    }
    
    setIsSubmitting(true)
    try {
      // 1. Upload evidence photo if exists
      let evidence_url = null
      if (file) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("service_id", serviceId)
        formData.append("image_type", "adjustment")
        
        const uploadRes = await fetchWithAuth(`/uploads/service-photo`, {
          method: "POST",
          body: formData
        })
        
        const uploadData = await uploadRes.json()
        evidence_url = uploadData.image_url
      }

      // 2. Submit adjustment request
      const payload = {
        amount: parseFloat(amount),
        description: `${concept}: ${justification}`,
        evidence_url: evidence_url
      }
      
      await fetchWithAuth(`/services/${serviceId}/price-adjustment`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })
      
      alert("Solicitud de ajuste enviada con éxito. El servicio quedará pausado a la espera de aprobación del cliente.")
      router.push(`/tecnicos/servicio/${serviceId}`)
    } catch (err: any) {
      alert("Error al enviar solicitud: " + (err.message || "Error desconocido"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen pb-36 text-slate-100 bg-[#1d1b26] overflow-x-hidden font-sans">
      {/* Mesh gradient background */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
        style={{ background: "#1d1b26" }}
      >
        <div 
          className="absolute w-[50vw] h-[50vw]"
          style={{
            top: "-10%", left: "-10%",
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)",
            filter: "blur(60px)"
          }}
        />
        <div 
          className="absolute w-[60vw] h-[60vw]"
          style={{
            bottom: "-10%", right: "-10%",
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)",
            filter: "blur(60px)"
          }}
        />
      </div>

      <div className="max-w-md mx-auto relative z-10 flex flex-col shadow-2xl bg-[#1d1b26]/20 border-x border-white/5 min-h-screen">
        {/* Header */}
        <header className="fixed top-0 w-full max-w-md z-50 h-16 px-4 flex items-center justify-between bg-[#1d1b26]/60 backdrop-blur-xl border-b border-white/10 shadow-sm">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-slate-100" />
          </button>
          <h1 className="text-base font-semibold tracking-wide">Ajuste de Monto</h1>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
            <ReceiptText className="w-5 h-5 text-slate-300" />
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 pt-24 pb-36 space-y-6 overflow-y-auto">
          {/* Service Info Card */}
          <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400 font-medium tracking-wide uppercase mb-0.5">Servicio Actual</p>
              <h2 className="text-sm font-semibold text-slate-100 truncate">
                {serviceInfo ? `${serviceInfo.title || "Servicio"}` : "Cargando..."}
              </h2>
              <p className="text-[11px] font-mono text-slate-500 mt-1">
                ID: #{serviceId ? serviceId.split('-')[0].toUpperCase() : "..."}
              </p>
            </div>
          </section>

          {/* Form Section */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-5 space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 fill-mode-forwards">
            
            {/* Monto Adicional */}
            <div className="space-y-2">
              <label htmlFor="amount" className="text-sm font-medium text-slate-300 ml-1">Monto Adicional</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-xl font-bold text-slate-400">$</span>
                </div>
                <input 
                  type="number" 
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="0"
                  className="w-full h-16 pl-9 pr-4 rounded-2xl text-2xl font-bold font-mono tracking-wider bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500 focus:bg-white/10 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-500"
                  style={{ appearance: "textfield" }}
                />
              </div>
            </div>

            {/* Concepto */}
            <div className="space-y-2">
              <label htmlFor="concept" className="text-sm font-medium text-slate-300 ml-1">Concepto</label>
              <div className="relative">
                <select 
                  id="concept" 
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  className="w-full h-14 px-4 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500 focus:bg-white/10 focus:ring-1 focus:ring-indigo-500/50 appearance-none transition-all"
                >
                  <option value="" disabled className="bg-slate-800 text-slate-400">Seleccione el motivo...</option>
                  <option value="Materiales extra" className="bg-slate-800">Materiales extra</option>
                  <option value="Tiempo adicional" className="bg-slate-800">Tiempo adicional</option>
                  <option value="Viáticos" className="bg-slate-800">Viáticos</option>
                  <option value="Otro" className="bg-slate-800">Otro</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>

            {/* Justificación */}
            <div className="space-y-2">
              <label htmlFor="justification" className="text-sm font-medium text-slate-300 ml-1">Justificación</label>
              <textarea 
                id="justification" 
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Explique brevemente por qué se requiere este ajuste..."
                className="w-full p-4 rounded-xl text-sm min-h-[100px] resize-none leading-relaxed bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500 focus:bg-white/10 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-500"
              ></textarea>
            </div>

            {/* Evidencia Fotográfica */}
            <div className="space-y-2 pt-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Evidencia Fotográfica <span className="text-slate-500 font-normal">(Opcional)</span></label>
              
              {!file ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-white/20 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-slate-400 hover:bg-white/5 hover:border-white/30 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera className="w-5 h-5 text-slate-300" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-300">Tomar foto o subir recibo</p>
                    <p className="text-xs text-slate-500 mt-1">Formatos JPG, PNG</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-medium truncate">{file.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Lista para enviar</p>
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
        </main>

        {/* Footer */}
        <footer className="fixed bottom-0 w-full max-w-md z-50 p-4 pb-8 bg-[#1d1b26]/60 backdrop-blur-xl border-t border-white/10 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || !amount || !concept || !justification}
            className={`w-full h-14 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 text-base transition-all
              ${(isSubmitting || !amount || !concept || !justification) ? "opacity-50 cursor-not-allowed" : "hover:scale-[0.98] active:scale-95"}
            `}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Enviar Solicitud al Cliente</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          <button 
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="w-full h-12 text-slate-400 font-medium rounded-xl hover:text-slate-200 hover:bg-white/5 transition-colors text-sm"
          >
            Cancelar
          </button>
        </footer>
      </div>
    </div>
  )
}
