"use client"

import { useState } from "react"
import { QuotationCard } from "./quotation-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText } from "lucide-react"

interface Quotation {
  id: string
  technicianName: string
  technicianRating: number
  price: number
  breakdown?: Array<{ item: string; price: number }>
  notes?: string
  proposedDate?: string
  status: "pending" | "accepted" | "rejected"
  createdAt: string
}

interface QuotationListProps {
  quotations: Quotation[]
  onAccept?: (id: string) => void
  onReject?: (id: string) => void
  showActions?: boolean
}

export function QuotationList({ quotations, onAccept, onReject, showActions = true }: QuotationListProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all")

  const filteredQuotations = quotations.filter((q) => (filter === "all" ? true : q.status === filter))

  if (quotations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No hay cotizaciones</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Aún no has recibido cotizaciones para este servicio. Los técnicos interesados enviarán sus propuestas pronto.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Cotizaciones ({filteredQuotations.length})</h3>
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="accepted">Aceptadas</SelectItem>
            <SelectItem value="rejected">Rechazadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filteredQuotations.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No hay cotizaciones con el filtro seleccionado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuotations.map((quotation) => (
            <QuotationCard
              key={quotation.id}
              quotation={quotation}
              onAccept={onAccept}
              onReject={onReject}
              showActions={showActions}
            />
          ))}
        </div>
      )}
    </div>
  )
}
