"use client"

import { ServiceList } from "@/components/service-list"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

// Mock data for demonstration
const mockServices = [
  {
    id: "1",
    title: "Instalación de GPS en camioneta",
    type: "gps_install",
    status: "pending" as const,
    address: "Calle 50 #45-67, Medellín",
    date: "2025-01-15",
    price: undefined,
  },
  {
    id: "2",
    title: "Mantenimiento sistema de alarma",
    type: "alarm_maintenance",
    status: "assigned" as const,
    address: "Carrera 80 #30-15, Bogotá",
    date: "2025-01-10",
    price: 150000,
  },
  {
    id: "3",
    title: "Instalación de cámaras de seguridad",
    type: "camera_install",
    status: "completed" as const,
    address: "Avenida 6N #25-30, Cali",
    date: "2025-01-05",
    price: 450000,
  },
]

export default function ServicesPage() {
  const [services, setServices] = useState<typeof mockServices>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setIsLoading(true)
        setError("")
        
        // TODO: Reemplazar con fetch real al backend
        // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services`)
        // const data = await response.json()
        
        // Simulación temporal de fetch
        await new Promise(resolve => setTimeout(resolve, 800))
        setServices(mockServices)
      } catch (err) {
        setError("Error al cargar los servicios. Por favor, intenta de nuevo.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchServices()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-muted-foreground">Cargando servicios...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4">
          <Card className="p-8 text-center max-w-md mx-auto">
            <div className="mb-4 text-destructive">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Error al cargar</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Intentar de nuevo
            </button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <ServiceList services={services} />
      </div>
    </div>
  )
}