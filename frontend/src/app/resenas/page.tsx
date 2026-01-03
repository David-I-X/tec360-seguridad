"use client"

import { useState } from "react"
import { ReviewForm } from "@/components/review-form"
import { ReviewList } from "@/components/review-list"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ReviewsPage() {
  const [reviews] = useState([
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
  ])

  const [showForm, setShowForm] = useState(false)

  const handleSubmitReview = async (data: { rating: number; comment: string }) => {
    console.log("Submitting review:", data)
    // Handle review submission
    setShowForm(false)
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
            {!showForm && <Button onClick={() => setShowForm(true)}>Dejar Reseña</Button>}
          </div>
        </div>

        {showForm && (
          <div className="mb-8">
            <ReviewForm technicianName="Carlos Rodríguez" onSubmit={handleSubmitReview} />
          </div>
        )}

        <ReviewList reviews={reviews} />
      </div>
    </div>
  )
}
