"use client"

import { Star, ThumbsUp } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Review {
  id: string
  userName: string
  rating: number
  comment: string
  createdAt: string
  helpful?: number
}

interface ReviewListProps {
  reviews: Review[]
}

export function ReviewList({ reviews }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Star className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No hay reseñas aún</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Sé el primero en dejar una reseña sobre este técnico
        </p>
      </div>
    )
  }

  const averageRating = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-foreground mb-1">{averageRating.toFixed(1)}</div>
            <div className="flex items-center justify-center gap-1 mb-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= Math.round(averageRating) ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {reviews.length} {reviews.length === 1 ? "reseña" : "reseñas"}
            </p>
          </div>

          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = reviews.filter((r) => r.rating === stars).length
              const percentage = (count / reviews.length) * 100

              return (
                <div key={stars} className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-8">{stars}★</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500 transition-all" style={{ width: `${percentage}%` }} />
                  </div>
                  <span className="text-sm text-muted-foreground w-8">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Reviews */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id} className="p-6 bg-card border-border">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {review.userName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{review.userName}</h4>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3 w-3 ${
                          star <= review.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(review.createdAt).toLocaleDateString("es-CO")}
              </span>
            </div>

            {review.comment && <p className="text-sm text-foreground mb-3">{review.comment}</p>}

            {review.helpful !== undefined && (
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <ThumbsUp className="h-4 w-4 mr-2" />
                Útil ({review.helpful})
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
