"use client"

import { useState } from "react"
import { ServiceCard } from "./service-card"
import { ServiceFilter } from "./service-filter"
import { Button } from "@/components/ui/button"
import { Plus, Inbox } from "lucide-react"
import Link from "next/link"

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

  // Filter services
  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.address.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || service.status === statusFilter
    const matchesType = typeFilter === "all" || service.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

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
            <Button className="w-full md:w-auto">
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
              <Button>
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
              onView={() => console.log("[v0] View service:", service.id)}
              onEdit={() => console.log("[v0] Edit service:", service.id)}
              onCancel={() => console.log("[v0] Cancel service:", service.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
