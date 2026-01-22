"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

const serviceTypes = [
  { id: "gps_install", label: "Instalación GPS", icon: "🛰️" },
  { id: "alarm_install", label: "Instalación Alarma", icon: "🚨" },
  { id: "camera_install", label: "Instalación Cámaras", icon: "📹" },
  { id: "gps_maintenance", label: "Mantenimiento GPS", icon: "🔧" },
  { id: "alarm_maintenance", label: "Mantenimiento Alarma", icon: "🔧" },
  { id: "camera_maintenance", label: "Mantenimiento Cámaras", icon: "🔧" },
  { id: "other", label: "Otro", icon: "⚙️" },
]

const cities = ["Medellín", "Bogotá", "Cali", "Barranquilla", "Cartagena", "Bucaramanga", "Pereira", "Santa Marta"]

export default function RequestServicePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    serviceType: "",
    title: "",
    description: "",
    address: "",
    city: "",
    preferredDate: "",
    additionalNotes: "",
  })

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleSubmit = async () => {
    setError("")
    setIsLoading(true)

    try {
      // TODO: Enviar al backend
      // const response = await fetch('/api/servicios', {
      //   method: 'POST',
      //   body: JSON.stringify(formData)
      // })

      // Simulación temporal
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      router.push("/servicios")
    } catch (err) {
      setError("Error al crear el servicio. Por favor, intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  const canProceed = () => {
    if (step === 1) return formData.serviceType !== ""
    if (step === 2)
      return formData.title && formData.description && formData.address && formData.city && formData.preferredDate
    return true
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-4xl mx-auto px-4">
        <Link
          href="/servicios"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a mis servicios
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Solicitar Servicio</h1>
          <p className="text-muted-foreground">Completa los siguientes pasos para solicitar tu servicio</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                  i <= step ? "bg-blue-600 border-blue-600 text-white" : "border-border text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="h-5 w-5" /> : i}
              </div>
              {i < 3 && (
                <div className={`h-0.5 w-16 md:w-24 mx-2 transition-all ${i < step ? "bg-blue-600" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        <Card className="p-8">
          {/* Step 1: Service Type */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Tipo de Servicio</h2>
                <p className="text-sm text-muted-foreground">Selecciona el tipo de servicio que necesitas</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {serviceTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setFormData({ ...formData, serviceType: type.id })}
                    className={`flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all hover:border-blue-600 hover:bg-accent ${
                      formData.serviceType === type.id ? "border-blue-600 bg-blue-600/10" : "border-border"
                    }`}
                    disabled={isLoading}
                  >
                    <div className="text-4xl mb-3">{type.icon}</div>
                    <span className="text-sm font-medium text-center">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Details & Location */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Detalles y Ubicación</h2>
                <p className="text-sm text-muted-foreground">Proporciona información sobre el servicio</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Título del servicio</Label>
                  <Input
                    id="title"
                    placeholder="Ej: Instalación de GPS en vehículo"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="mt-1.5"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe los detalles del servicio que necesitas..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="mt-1.5"
                    disabled={isLoading}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="city">Ciudad</Label>
                    <Select 
                      value={formData.city} 
                      onValueChange={(value) => setFormData({ ...formData, city: value })}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="city" className="mt-1.5">
                        <SelectValue placeholder="Selecciona una ciudad" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="preferredDate">Fecha preferida</Label>
                    <Input
                      id="preferredDate"
                      type="date"
                      value={formData.preferredDate}
                      onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                      className="mt-1.5"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    placeholder="Dirección completa del servicio"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1.5"
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Incluye detalles como número de apartamento, piso, etc.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Additional Info */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Información Adicional</h2>
                <p className="text-sm text-muted-foreground">Agrega cualquier detalle adicional (opcional)</p>
              </div>

              <div>
                <Label htmlFor="additionalNotes">Notas adicionales</Label>
                <Textarea
                  id="additionalNotes"
                  placeholder="¿Hay algo más que el técnico deba saber?"
                  value={formData.additionalNotes}
                  onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                  rows={6}
                  className="mt-1.5"
                  disabled={isLoading}
                />
              </div>

              <Card className="bg-muted p-6">
                <h3 className="font-semibold mb-4">Resumen de tu solicitud</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Servicio:</span>
                    <p className="font-medium">{serviceTypes.find((t) => t.id === formData.serviceType)?.label}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Título:</span>
                    <p className="font-medium">{formData.title}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ubicación:</span>
                    <p className="font-medium">
                      {formData.city}, {formData.address}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha preferida:</span>
                    <p className="font-medium">{formData.preferredDate}</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <Button 
              variant="outline" 
              onClick={handleBack} 
              disabled={step === 1 || isLoading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>

            {step < 3 ? (
              <Button 
                onClick={handleNext} 
                disabled={!canProceed() || isLoading}
              >
                Siguiente
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={!canProceed() || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Solicitar Servicio
                    <Check className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}