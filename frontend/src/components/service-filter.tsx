"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"

interface ServiceFilterProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  typeFilter?: string
  onTypeChange?: (value: string) => void
}

export function ServiceFilter({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
}: ServiceFilterProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end">
      <div className="flex-1">
        <Label htmlFor="search" className="text-sm font-medium mb-2 block">
          Buscar
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            placeholder="Buscar servicios..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="w-full md:w-48">
        <Label htmlFor="status" className="text-sm font-medium mb-2 block">
          Estado
        </Label>
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger id="status">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="assigned">Asignado</SelectItem>
            <SelectItem value="in_progress">En Progreso</SelectItem>
            <SelectItem value="completed">Completado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {typeFilter !== undefined && onTypeChange && (
        <div className="w-full md:w-52">
          <Label htmlFor="type" className="text-sm font-medium mb-2 block">
            Tipo de servicio
          </Label>
          <Select value={typeFilter} onValueChange={onTypeChange}>
            <SelectTrigger id="type">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="gps_install">Instalación GPS</SelectItem>
              <SelectItem value="alarm_install">Instalación Alarma</SelectItem>
              <SelectItem value="camera_install">Instalación Cámaras</SelectItem>
              <SelectItem value="gps_maintenance">Mantenimiento GPS</SelectItem>
              <SelectItem value="alarm_maintenance">Mantenimiento Alarma</SelectItem>
              <SelectItem value="camera_maintenance">Mantenimiento Cámaras</SelectItem>
              <SelectItem value="other">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
