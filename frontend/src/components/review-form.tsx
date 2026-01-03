"use client"

import type React from "react"

import { useState } from "react"
import { Star } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface ReviewFormProps {
  technicianName: string
  onSubmit?: (data: { rating: number; comment: string }) => void
}

export function ReviewForm({ technicianName, onSubmit }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) return

    setIsSubmitting(true)
    await onSubmit?.({ rating, comment })
    setIsSubmitting(false)
  }

  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-lg font-semibold text-foreground mb-4">Califica el servicio de {technicianName}</h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating Stars */}
        <div>
          <Label className="mb-2 block">Calificación</Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= (hoveredRating || rating) ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              {rating === 5 && "Excelente"}
              {rating === 4 && "Muy bueno"}
              {rating === 3 && "Bueno"}
              {rating === 2 && "Regular"}
              {rating === 1 && "Malo"}
            </p>
          )}
        </div>

        {/* Comment */}
        <div>
          <Label htmlFor="comment" className="mb-2 block">
            Comentario (opcional)
          </Label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Cuéntanos sobre tu experiencia..."
            className="min-h-[120px] resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">{comment.length}/500 caracteres</p>
        </div>

        {/* Submit */}
        <Button type="submit" disabled={rating === 0 || isSubmitting} className="w-full">
          {isSubmitting ? "Enviando..." : "Enviar Reseña"}
        </Button>
      </form>
    </Card>
  )
}
