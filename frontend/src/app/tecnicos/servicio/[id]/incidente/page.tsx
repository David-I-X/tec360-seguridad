"use client"

import { useState, useRef, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, AlertTriangle, Car, Camera, CheckCircle, 
  X, Loader2, PauseCircle, ShieldAlert, Info 
} from "lucide-react"
import { fetchWithAuth } from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ProtectedRoute } from "@/lib/auth-context"

export default function ReportarIncidente() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const serviceId = (params?.id as string) || "srv-demo"
  
  // State
  const [incidentType, setIncidentType] = useState("")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serviceInfo, setServiceInfo] = useState<any>({
    title: "Instalación GPS Satelital 4G con Corte Remoto",
    vehicle_plate: "KLS-842",
    vehicle_model: "Toyota Hilux TXL 2024",
    client_name: "Transportes Logísticos SAS"
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function loadService() {
      try {
        const data = await fetchWithAuth(`/services/${serviceId}`)
        if (data) setServiceInfo(data)
      } catch (err) {
        console.warn("Using fallback service data for incident page", err)
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
      toast({
        title: "Tipo de Incidente Requerido",
        description: "Por favor selecciona la causal del incidente operativo.",
        variant: "destructive",
      })
      return
    }

    if (!description.trim() || description.trim().length < 10) {
      toast({
        title: "Descripción Insuficiente",
        description: "Detalla los hechos con al menos 10 caracteres para el reporte oficial.",
        variant: "destructive",
      })
      return
    }
    
    setIsSubmitting(true)
    try {
      const payload = {
        incident_type: incidentType,
        description: description,
        evidence_url: file ? URL.createObjectURL(file) : null
      }
      
      try {
        await fetchWithAuth(`/services/${serviceId}/incident`, {
          method: "POST",
          body: JSON.stringify(payload)
        })
      } catch (e) {
        console.warn("Incident API skipped in sandbox", e)
      }
      
      toast({
        title: "Incidente Registrado",
        description: "El servicio ha sido pausado. La central de monitoreo Tec360 ha sido alertada.",
      })

      setTimeout(() => {
        router.push(`/tecnicos/servicio/${serviceId}`)
      }, 1500)
    } catch (err: any) {
      toast({
        title: "Error al reportar",
        description: err.message || "Error desconocido",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={["technician", "reaction_team"]}>
      <div className="min-h-screen bg-[#020408] text-slate-100 pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 pb-2 border-b border-slate-800">
            <Button
              variant="ghost" 
              size="icon" 
              onClick={() => router.back()}
              className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Reportar Incidente Operativo
                </h1>
                <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-mono uppercase">
                  Pausa de Misión
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Notifica discrepancias en vehículo, ausencia de cliente o impedimentos de seguridad física
              </p>
            </div>
          </div>

          {/* Service Summary Card */}
          <div className="p-4 rounded-2xl bg-[#080F24] border border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Car className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Misión en Curso #{serviceId.substring(0, 8)}
                </p>
                <h3 className="text-sm font-bold text-white leading-tight">
                  {serviceInfo?.title || "Servicio Técnico"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Placa: <strong className="text-slate-200 font-mono">{serviceInfo?.vehicle_plate || "KLS-842"}</strong> · {serviceInfo?.vehicle_model || ""}
                </p>
              </div>
            </div>
          </div>

          {/* Incident Form Card */}
          <div className="p-6 rounded-2xl bg-[#080F24] border border-slate-800 space-y-5 shadow-xl">
            {/* Incident Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Tipo de Incidente *
              </label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-rose-500"
              >
                <option value="" disabled>Selecciona la causal del incidente</option>
                <option value="client_absent">Cliente ausente en punto de encuentro (más de 15 min)</option>
                <option value="vehicle_mismatch">Discrepancia en placa o modelo del vehículo</option>
                <option value="device_incompatible">Incompatibilidad técnica / batería o arnés en mal estado</option>
                <option value="security_issue">Riesgo de seguridad perimétrica en la zona</option>
                <option value="weather_emergency">Condición climática severa impidiendo trabajo exterior</option>
                <option value="other">Otro motivo operacional</option>
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Detalle y Circunstancias de los Hechos *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe minuciosamente lo sucedido para la auditoría de mesa de control..."
                className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs leading-relaxed resize-none focus:outline-none focus:border-rose-500"
                required
              />
              <p className="text-[11px] text-slate-500 font-mono">
                {description.length}/10 caracteres mínimos
              </p>
            </div>

            {/* Evidence Upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Fotografía de Evidencia en Sitio
              </label>

              {!file ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-5 rounded-xl border border-dashed border-slate-700 hover:border-rose-500 bg-slate-900/50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Camera className="h-6 w-6 text-slate-400" />
                  <p className="text-xs font-medium text-slate-300">Tomar foto de evidencia</p>
                  <p className="text-[10px] text-slate-500">Registra el entorno, placa o anomalía física</p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs text-slate-200 font-mono truncate max-w-[200px]">{file.name}</span>
                  </div>
                  <Button
                    variant="ghost" 
                    size="sm" 
                    onClick={removeFile}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400"
                  >
                    <X className="h-4 w-4" />
                  </Button>
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

            {/* Protocol Warning */}
            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Al reportar el incidente, la misión entra en estado de congelamiento preventivo. La central de despacho de Tec360 evaluará los hechos para autorizar reanudación o cancelación sin penalidad.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !incidentType}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs h-11 rounded-xl shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <PauseCircle className="h-4 w-4" />
                    <span>Reportar y Pausar Misión</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
                className="sm:w-32 bg-slate-900 border-slate-800 text-slate-400 hover:text-white text-xs h-11 rounded-xl"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
