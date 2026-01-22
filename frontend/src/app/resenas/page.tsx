"use client"

import { useState, useEffect } from "react"
import { ReviewForm } from "@/components/review-form"
import { ReviewList } from "@/components/review-list"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"

const mockReviews = [
  {
    id: "1",
    userName: "María González",
    rating: 5,
    comment: "Excelente servicio, muy profesional y puntual. El trabajo quedó impecable.",
    createdAt: "2025-01-05T10:00:00Z",
    helpful: 12,
  },
  {
    id: "2",
    userName: "Pedro Ramírez",
    rating: 4,
    comment: "Buen trabajo, aunque tardó un poco más de lo esperado. En general satisfecho.",
    createdAt: "2025-01-03T14:30:00Z",
    helpful: 5,
  },
  {
    id: "3",
    userName: "Laura Sánchez",
    rating: 5,
    comment: "Súper recomendado. Muy atento y explica todo claramente.",
    createdAt: "2024-12-28T09:15:00Z",
    helpful: 8,
  },
]

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<typeof mockReviews>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setIsLoading(true)
        setError("")
        
        // TODO: Reemplazar con fetch real al backend
        // const response = await fetch(
        //   `${process.env.NEXT_PUBLIC_API_URL}/technicians/{technicianId}/reviews`
        // )
        // const data = await response.json()
        
        // Simulación temporal de fetch
        await new Promise(resolve => setTimeout(resolve, 800))
        setReviews(mockReviews)
      } catch (err) {
        setError("Error al cargar las reseñas. Por favor, intenta de nuevo.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchReviews()
  }, [])

  const handleSubmitReview = async (data: { rating: number; comment: string }) => {
    try {
      setIsSubmitting(true)
      setError("")
      setSuccess(false)

      // TODO: Integrar con backend
      // const response = await fetch(
      //   `${process.env.NEXT_PUBLIC_API_URL}/technicians/{technicianId}/reviews`,
      //   {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify(data),
      //   }
      // )

      // Simulación temporal
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Agregar reseña al estado local
      const newReview = {
        id: Date.now().toString(),
        userName: "Tú",
        rating: data.rating,
        comment: data.comment,
        createdAt: new Date().toISOString(),
        helpful: 0,
      }
      setReviews(prev => [newReview, ...prev])

      setSuccess(true)
      setShowForm(false)

      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError("Error al enviar la reseña. Por favor, intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
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
            <p className="text-muted-foreground">Cargando reseñas...</p>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Reseñas del Técnico</h1>
              <p className="text-muted-foreground">Carlos Rodríguez - Técnico Certificado SENA</p>
            </div>
            {!showForm && (
              <Button 
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Dejar Reseña
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Card className="mb-6 p-4 bg-destructive/10 border-destructive/20">
            <p className="text-destructive text-sm">{error}</p>
          </Card>
        )}

        {success && (
          <Card className="mb-6 p-4 bg-green-500/10 border-green-500/20">
            <p className="text-green-600 text-sm font-medium">
              ✓ Reseña enviada exitosamente
            </p>
          </Card>
        )}

        {showForm && (
          <div className="mb-8">
            <ReviewForm 
              technicianName="Carlos Rodríguez" 
              onSubmit={handleSubmitReview}
              isSubmitting={isSubmitting}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        <ReviewList reviews={reviews} />
      </div>
    </div>
  )
}