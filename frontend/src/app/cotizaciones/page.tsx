"use client"

import { useState, useEffect } from "react"
import { QuotationList } from "@/components/quotation-list"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"

const mockQuotations = [
  {
    id: "1",
    technicianName: "Carlos Rodríguez",
    technicianRating: 4.8,
    price: 450000,
    breakdown: [
      { item: "Mano de obra", price: 200000 },
      { item: "Materiales", price: 150000 },
      { item: "Desplazamiento", price: 100000 },
    ],
    notes: "Incluye instalación completa y pruebas del sistema. Garantía de 6 meses.",
    proposedDate: "2025-01-15",
    status: "pending" as const,
    createdAt: "2025-01-10T10:00:00Z",
  },
  {
    id: "2",
    technicianName: "Ana Martínez",
    technicianRating: 4.9,
    price: 420000,
    breakdown: [
      { item: "Mano de obra", price: 180000 },
      { item: "Materiales", price: 160000 },
      { item: "Desplazamiento", price: 80000 },
    ],
    notes: "Puedo comenzar la próxima semana. Trabajo con materiales de primera calidad.",
    proposedDate: "2025-01-12",
    status: "accepted" as const,
    createdAt: "2025-01-09T14:30:00Z",
  },
  {
    id: "3",
    technicianName: "Luis García",
    technicianRating: 4.6,
    price: 500000,
    notes: "Incluye mantenimiento gratuito por 3 meses.",
    status: "pending" as const,
    createdAt: "2025-01-11T09:15:00Z",
  },
]

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<typeof mockQuotations>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        setIsLoading(true)
        setError("")
        
        // TODO: Reemplazar con fetch real al backend
        // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/quotations`)
        // const data = await response.json()
        
        // Simulación temporal de fetch
        await new Promise(resolve => setTimeout(resolve, 800))
        setQuotations(mockQuotations)
      } catch (err) {
        setError("Error al cargar las cotizaciones. Por favor, intenta de nuevo.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuotations()
  }, [])

  const handleAccept = async (id: string) => {
    try {
      setActionLoading(id)
      setError("")

      // TODO: Integrar con backend
      // await fetch(`${process.env.NEXT_PUBLIC_API_URL}/quotations/${id}/accept`, {
      //   method: 'POST'
      // })

      // Simulación temporal
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Actualizar estado local
      setQuotations(prev => 
        prev.map(q => q.id === id ? { ...q, status: 'accepted' as const } : q)
      )
    } catch (err) {
      setError("Error al aceptar la cotización. Por favor, intenta de nuevo.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (id: string) => {
    try {
      setActionLoading(id)
      setError("")

      // TODO: Integrar con backend
      // await fetch(`${process.env.NEXT_PUBLIC_API_URL}/quotations/${id}/reject`, {
      //   method: 'POST'
      // })

      // Simulación temporal
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Actualizar estado local
      setQuotations(prev => 
        prev.map(q => q.id === id ? { ...q, status: 'rejected' as const } : q)
      )
    } catch (err) {
      setError("Error al rechazar la cotización. Por favor, intenta de nuevo.")
    } finally {
      setActionLoading(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-6">
            <Link href="/servicios">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a servicios
              </Button>
            </Link>
          </div>
          
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-muted-foreground">Cargando cotizaciones...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link href="/servicios">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a servicios
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Cotizaciones Recibidas</h1>
          <p className="text-muted-foreground">Revisa y compara las propuestas de los técnicos</p>
        </div>

        {error && (
          <Card className="mb-6 p-4 bg-destructive/10 border-destructive/20">
            <p className="text-destructive text-sm">{error}</p>
          </Card>
        )}

        <QuotationList 
          quotations={quotations} 
          onAccept={handleAccept} 
          onReject={handleReject}
          actionLoading={actionLoading}
        />
      </div>
    </div>
  )
}