"use client"

import { useEffect, useState } from "react"
import { MapView } from "@/components/map-view"
import { TechnicianCard } from "@/components/technician-card"
import { ArrowLeft, MapPin, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"

const mockLocation = {
  lat: 6.2476,
  lng: -75.5658,
  address: "Medellín, Antioquia, Colombia",
}

const mockTechnicians = [
  {
    id: "1",
    name: "Carlos Rodríguez",
    avatar: "/technician-carlos.jpg",
    specialties: ["GPS", "Alarmas"],
    rating: 4.8,
    completedServices: 127,
    certifications: ["SENA", "ISO 9001"],
    distance: "2.3 km",
    available: true,
  },
  {
    id: "2",
    name: "Ana Martínez",
    avatar: "/technician-woman.jpg",
    specialties: ["Cámaras", "Alarmas"],
    rating: 4.9,
    completedServices: 98,
    certifications: ["SENA"],
    distance: "3.1 km",
    available: true,
  },
]

export default function MapPage() {
  const [selectedLocation, setSelectedLocation] = useState(mockLocation)
  const [technicians, setTechnicians] = useState<typeof mockTechnicians>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        setIsLoading(true)
        setError("")
        
        // TODO: Reemplazar con fetch real al backend
        // const response = await fetch(
        //   `${process.env.NEXT_PUBLIC_API_URL}/technicians/nearby?lat=${selectedLocation.lat}&lng=${selectedLocation.lng}`
        // )
        // const data = await response.json()
        
        // Simulación temporal de fetch
        await new Promise(resolve => setTimeout(resolve, 1000))
        setTechnicians(mockTechnicians)
      } catch (err) {
        setError("Error al cargar técnicos cercanos. Por favor, intenta de nuevo.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTechnicians()
  }, [selectedLocation])

  const markers = technicians.map((tech, index) => ({
    id: tech.id,
    position: {
      lat: selectedLocation.lat + index * 0.01,
      lng: selectedLocation.lng + index * 0.01,
    },
    title: tech.name,
    type: "technician" as const,
  }))

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Link href="/servicios/nuevo">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
          </div>
          
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-muted-foreground">Cargando técnicos cercanos...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Link href="/servicios/nuevo">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
          </div>
          
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/servicios/nuevo">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Técnicos Cercanos</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">{selectedLocation.address}</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <MapView location={selectedLocation} markers={markers} height="600px" showControls />
          </div>

          {/* Technicians List */}
          <div className="space-y-4">
            <Card className="p-4 bg-card border-border">
              <h3 className="font-semibold text-foreground mb-2">{technicians.length} técnicos disponibles</h3>
              <p className="text-sm text-muted-foreground">Ordenados por distancia a tu ubicación</p>
            </Card>

            {technicians.map((technician) => (
              <TechnicianCard key={technician.id} technician={technician} showDistance />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
