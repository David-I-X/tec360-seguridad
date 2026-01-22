"use client"

import { useState } from "react"
import { ServiceCard } from "./service-card"
import { ServiceFilter } from "./service-filter"
import { Button } from "@/components/ui/button"
import { Plus, Inbox } from "lucide-react"
import Link from "next/link"
import { Card } from "@/components/ui/card"

interface Service {
  id: string
  title: string
  type: string
  status: "pending" | "assigned" | "in_progress" | "completed" | "cancelled"
  address: string
  date: string
  price?: number
}

interface ServiceListProps {
  services: Service[]
  showCreateButton?: boolean
}

export function ServiceList({ services, showCreateButton = true }: ServiceListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [actionError, setActionError] = useState("")

  // Filter services
  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.address.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || service.status === statusFilter
    const matchesType = typeFilter === "all" || service.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const handleView = async (id: string) => {
    try {
      setActionError("")
      // TODO: Implementar navegación o modal de detalles
      window.location.href = `/servicios/${id}`
    } catch (err) {
      setActionError("Error al ver el servicio")
    }
  }

  const handleEdit = async (id: string) => {
    try {
      setActionError("")
      // TODO: Implementar navegación a edición
      window.location.href = `/servicios/${id}/editar`
    } catch (err) {
      setActionError("Error al editar el servicio")
    }
  }

  const handleCancel = async (id: string) => {
    try {
      setActionError("")
      
      if (!confirm("¿Estás seguro que deseas cancelar este servicio?")) {
        return
      }

      // TODO: Integrar con backend
      // await fetch(`${process.env.NEXT_PUBLIC_API_URL}/services/${id}/cancel`, {
      //   method: 'POST'
      // })

      // Simulación temporal
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Recargar página o actualizar estado
      window.location.reload()
    } catch (err) {
      setActionError("Error al cancelar el servicio. Por favor, intenta de nuevo.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Mis Servicios</h2>
          <p className="text-muted-foreground mt-1">
            {filteredServices.length} {filteredServices.length === 1 ? "servicio" : "servicios"}
          </p>
        </div>

        {showCreateButton && (
          <Link href="/servicios/nuevo">
            <Button className="w-full md:w-auto bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Solicitar Servicio
            </Button>
          </Link>
        )}
      </div>

      <ServiceFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
      />

      {actionError && (
        <Card className="p-4 bg-destructive/10 border-destructive/20">
          <p className="text-destructive text-sm">{actionError}</p>
        </Card>
      )}

      {filteredServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <Inbox className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No hay servicios</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            {searchQuery || statusFilter !== "all" || typeFilter !== "all"
              ? "No se encontraron servicios con los filtros aplicados."
              : "Aún no has solicitado ningún servicio. Comienza ahora."}
          </p>
          {showCreateButton && !searchQuery && statusFilter === "all" && typeFilter === "all" && (
            <Link href="/servicios/nuevo">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Solicitar mi primer servicio
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              {...service}
              onView={() => handleView(service.id)}
              onEdit={() => handleEdit(service.id)}
              onCancel={() => handleCancel(service.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}