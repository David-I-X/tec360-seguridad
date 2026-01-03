"use client"

import { useState } from "react"
import { MapView } from "@/components/map-view"
import { TechnicianCard } from "@/components/technician-card"
import { ArrowLeft, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"

export default function MapPage() {
  const [selectedLocation] = useState({
    lat: 6.2476,
    lng: -75.5658,
    address: "Medellín, Antioquia, Colombia",
  })

  const [technicians] = useState([
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
  ])

  const markers = technicians.map((tech, index) => ({
    id: tech.id,
    position: {
      lat: selectedLocation.lat + index * 0.01,
      lng: selectedLocation.lng + index * 0.01,
    },
    title: tech.name,
    type: "technician" as const,
  }))

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
