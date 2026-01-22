"use client"

import { useState } from "react"
import { TechnicianCard } from "./technician-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Search, Users } from "lucide-react"

interface Technician {
  id: string
  name: string
  avatar?: string
  specializations: string[]
  rating: number
  reviewCount: number
  distance?: number
  city: string
  certified: boolean
}

interface TechnicianListProps {
  technicians: Technician[]
}

export function TechnicianList({ technicians }: TechnicianListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [cityFilter, setCityFilter] = useState("all")
  const [specializationFilter, setSpecializationFilter] = useState("all")
  const [sortBy, setSortBy] = useState("rating")
  const [actionError, setActionError] = useState("")

  // Filter and sort technicians
  let filteredTechnicians = technicians.filter((tech) => {
    const matchesSearch = tech.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCity = cityFilter === "all" || tech.city === cityFilter
    const matchesSpec =
      specializationFilter === "all" ||
      tech.specializations.some((s) => s.toLowerCase().includes(specializationFilter.toLowerCase()))

    return matchesSearch && matchesCity && matchesSpec
  })

  // Sort
  filteredTechnicians = [...filteredTechnicians].sort((a, b) => {
    if (sortBy === "rating") return b.rating - a.rating
    if (sortBy === "distance" && a.distance && b.distance) return a.distance - b.distance
    if (sortBy === "reviews") return b.reviewCount - a.reviewCount
    return 0
  })

  const handleContact = async (id: string) => {
    try {
      setActionError("")
      // TODO: Implementar modal de contacto o navegación a chat
      // Por ahora, redirigir a WhatsApp o mostrar modal
      alert("Funcionalidad de contacto próximamente disponible")
    } catch (err) {
      setActionError("Error al contactar al técnico. Por favor, intenta de nuevo.")
    }
  }

  const handleViewProfile = async (id: string) => {
    try {
      setActionError("")
      // TODO: Implementar navegación a perfil
      window.location.href = `/tecnicos/${id}`
    } catch (err) {
      setActionError("Error al ver el perfil. Por favor, intenta de nuevo.")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Técnicos Disponibles</h2>
        <p className="text-muted-foreground mt-1">
          {filteredTechnicians.length} {filteredTechnicians.length === 1 ? "técnico" : "técnicos"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Label htmlFor="search" className="text-sm font-medium mb-2 block">
            Buscar técnico
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Buscar por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="city" className="text-sm font-medium mb-2 block">
            Ciudad
          </Label>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger id="city">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="Medellín">Medellín</SelectItem>
              <SelectItem value="Bogotá">Bogotá</SelectItem>
              <SelectItem value="Cali">Cali</SelectItem>
              <SelectItem value="Barranquilla">Barranquilla</SelectItem>
              <SelectItem value="Cartagena">Cartagena</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="sort" className="text-sm font-medium mb-2 block">
            Ordenar por
          </Label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger id="sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Mejor calificación</SelectItem>
              <SelectItem value="distance">Más cercano</SelectItem>
              <SelectItem value="reviews">Más reseñas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {actionError && (
        <Card className="p-4 bg-destructive/10 border-destructive/20">
          <p className="text-destructive text-sm">{actionError}</p>
        </Card>
      )}

      {filteredTechnicians.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <Users className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No hay técnicos disponibles</h3>
          <p className="text-muted-foreground max-w-sm">
            No se encontraron técnicos con los filtros aplicados. Intenta ajustar tu búsqueda.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTechnicians.map((technician) => (
            <TechnicianCard
              key={technician.id}
              {...technician}
              onContact={() => handleContact(technician.id)}
              onViewProfile={() => handleViewProfile(technician.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
