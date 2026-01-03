"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, MapPin, Shield, Phone } from "lucide-react"

interface TechnicianCardProps {
  id: string
  name: string
  avatar?: string
  specializations: string[]
  rating: number
  reviewCount: number
  distance?: number
  city: string
  certified: boolean
  onContact?: () => void
  onViewProfile?: () => void
}

export function TechnicianCard({
  id,
  name,
  avatar,
  specializations,
  rating,
  reviewCount,
  distance,
  city,
  certified,
  onContact,
  onViewProfile,
}: TechnicianCardProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 border-border/50">
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <Avatar className="h-16 w-16 ring-2 ring-border">
            <AvatarImage src={avatar || "/placeholder.svg"} alt={name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-lg text-foreground leading-tight">{name}</h3>
              {certified && (
                <Badge variant="default" className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700">
                  <Shield className="h-3 w-3" />
                  SENA
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                <span className="font-medium text-sm text-foreground">{rating.toFixed(1)}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                ({reviewCount} {reviewCount === 1 ? "reseña" : "reseñas"})
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex flex-wrap gap-1.5">
            {specializations.map((spec) => (
              <Badge key={spec} variant="secondary" className="text-xs">
                {spec}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span>
              {city}
              {distance && ` • ${distance.toFixed(1)} km`}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 bg-transparent" onClick={onViewProfile}>
            Ver perfil
          </Button>
          <Button className="flex-1" onClick={onContact}>
            <Phone className="h-4 w-4 mr-2" />
            Contactar
          </Button>
        </div>
      </div>
    </Card>
  )
}
