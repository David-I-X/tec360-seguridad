"use client"

import { TechnicianList } from "@/components/technician-list"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

// Mock data for demonstration
const mockTechnicians = [
  {
    id: "1",
    name: "Carlos Rodríguez",
    avatar: "/diverse-technician-team.png",
    specializations: ["GPS", "Alarmas", "Cámaras"],
    rating: 4.9,
    reviewCount: 127,
    distance: 2.3,
    city: "Medellín",
    certified: true,
  },
  {
    id: "2",
    name: "Ana María Gómez",
    avatar: "/technician-woman.jpg",
    specializations: ["Cámaras", "Sistemas integrados"],
    rating: 4.8,
    reviewCount: 95,
    distance: 4.1,
    city: "Medellín",
    certified: true,
  },
  {
    id: "3",
    name: "Jorge Martínez",
    avatar: "/technician-male.jpg",
    specializations: ["GPS", "Mantenimiento"],
    rating: 4.7,
    reviewCount: 68,
    distance: 5.8,
    city: "Bogotá",
    certified: true,
  },
  {
    id: "4",
    name: "Sandra López",
    avatar: "/technician-woman-2.jpg",
    specializations: ["Alarmas", "Cámaras"],
    rating: 4.9,
    reviewCount: 142,
    distance: 1.5,
    city: "Medellín",
    certified: true,
  },
  {
    id: "5",
    name: "Miguel Torres",
    avatar: "/technician-male-2.jpg",
    specializations: ["GPS", "Alarmas"],
    rating: 4.6,
    reviewCount: 54,
    distance: 7.2,
    city: "Cali",
    certified: true,
  },
]

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<typeof mockTechnicians>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        setIsLoading(true)
        setError("")
        
        // TODO: Reemplazar con fetch real al backend
        // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/technicians`)
        // const data = await response.json()
        
        // Simulación temporal de fetch
        await new Promise(resolve => setTimeout(resolve, 800))
        setTechnicians(mockTechnicians)
      } catch (err) {
        setError("Error al cargar los técnicos. Por favor, intenta de nuevo.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTechnicians()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-muted-foreground">Cargando técnicos...</p>
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
        <TechnicianList technicians={technicians} />
      </div>
    </div>
  )
}