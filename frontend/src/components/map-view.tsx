"use client"

import { useState, useEffect } from "react"
import { MapPin, Navigation, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface Location {
  lat: number
  lng: number
  address?: string
}

interface MapViewProps {
  location?: Location
  markers?: Array<{
    id: string
    position: Location
    title: string
    type?: "technician" | "service"
  }>
  height?: string
  showControls?: boolean
  onLocationSelect?: (location: Location) => void
}

export function MapView({
  location,
  markers = [],
  height = "400px",
  showControls = false,
  onLocationSelect,
}: MapViewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null)

  useEffect(() => {
    // Simulate map loading
    const timer = setTimeout(() => setIsLoading(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setCurrentLocation(newLocation)
          onLocationSelect?.(newLocation)
        },
        (error) => {
          console.error("Error getting location:", error)
        },
      )
    }
  }

  if (isLoading) {
    return (
      <Card className="flex items-center justify-center bg-card" style={{ height }}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Cargando mapa...</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="relative">
      <Card className="overflow-hidden bg-card border-border" style={{ height }}>
        {/* Map placeholder with gradient */}
        <div className="relative w-full h-full bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-blue-600/10">
          {/* Grid overlay for map effect */}
          <div className="absolute inset-0 bg-grid-pattern opacity-20" />

          {/* Center marker if location provided */}
          {location && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <div className="absolute -inset-4 bg-blue-500/20 rounded-full animate-ping" />
                <MapPin className="h-8 w-8 text-blue-500 fill-blue-500" />
              </div>
            </div>
          )}

          {/* Additional markers */}
          {markers.map((marker, index) => (
            <div
              key={marker.id}
              className="absolute animate-in fade-in zoom-in"
              style={{
                top: `${30 + index * 15}%`,
                left: `${40 + index * 10}%`,
                animationDelay: `${index * 100}ms`,
              }}
            >
              <div className="relative group cursor-pointer">
                <MapPin
                  className={`h-6 w-6 ${
                    marker.type === "technician" ? "text-green-500 fill-green-500" : "text-blue-500 fill-blue-500"
                  }`}
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {marker.title}
                </div>
              </div>
            </div>
          ))}

          {/* Map info overlay */}
          {location?.address && (
            <div className="absolute bottom-4 left-4 right-4">
              <Card className="p-3 bg-card/95 backdrop-blur-sm border-border">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Ubicación</p>
                    <p className="text-xs text-muted-foreground truncate">{location.address}</p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Controls */}
        {showControls && (
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Button
              size="icon"
              variant="secondary"
              onClick={handleGetCurrentLocation}
              className="bg-card/95 backdrop-blur-sm"
            >
              <Navigation className="h-4 w-4" />
            </Button>
          </div>
        )}
      </Card>

      {/* Note about Google Maps integration */}
      <p className="mt-2 text-xs text-muted-foreground text-center">Integración con Google Maps próximamente</p>
    </div>
  )
}
