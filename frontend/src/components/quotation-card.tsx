"use client"

import { DollarSign, Calendar, CheckCircle, XCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface QuotationCardProps {
  quotation: {
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
  onAccept?: (id: string) => void
  onReject?: (id: string) => void
  showActions?: boolean
}

export function QuotationCard({ quotation, onAccept, onReject, showActions = true }: QuotationCardProps) {
  const statusConfig = {
    pending: { label: "Pendiente", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
    accepted: { label: "Aceptada", color: "bg-green-500/10 text-green-500 border-green-500/20" },
    rejected: { label: "Rechazada", color: "bg-red-500/10 text-red-500 border-red-500/20" },
  }

  const status = statusConfig[quotation.status]

  return (
    <Card className="p-6 bg-card border-border hover:border-blue-500/50 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
            {quotation.technicianName.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{quotation.technicianName}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>⭐</span>
              <span>{quotation.technicianRating.toFixed(1)}</span>
            </div>
          </div>
        </div>
        <Badge className={status.color}>{status.label}</Badge>
      </div>

      {/* Price */}
      <div className="mb-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
        <div className="flex items-baseline gap-2">
          <DollarSign className="h-5 w-5 text-blue-500" />
          <span className="text-3xl font-bold text-foreground">${quotation.price.toLocaleString("es-CO")}</span>
          <span className="text-sm text-muted-foreground">COP</span>
        </div>
      </div>

      {/* Breakdown */}
      {quotation.breakdown && quotation.breakdown.length > 0 && (
        <div className="mb-4 space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Desglose:</h4>
          {quotation.breakdown.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.item}</span>
              <span className="text-foreground font-medium">${item.price.toLocaleString("es-CO")}</span>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {quotation.notes && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-foreground">{quotation.notes}</p>
        </div>
      )}

      {/* Proposed Date */}
      {quotation.proposedDate && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Calendar className="h-4 w-4" />
          <span>Fecha propuesta: {new Date(quotation.proposedDate).toLocaleDateString("es-CO")}</span>
        </div>
      )}

      {/* Actions */}
      {showActions && quotation.status === "pending" && (
        <div className="flex gap-2 pt-4 border-t border-border">
          <Button onClick={() => onAccept?.(quotation.id)} className="flex-1 bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Aceptar
          </Button>
          <Button onClick={() => onReject?.(quotation.id)} variant="destructive" className="flex-1">
            <XCircle className="h-4 w-4 mr-2" />
            Rechazar
          </Button>
        </div>
      )}

      {/* Created At */}
      <p className="text-xs text-muted-foreground mt-4">
        Enviada el {new Date(quotation.createdAt).toLocaleDateString("es-CO")}
      </p>
    </Card>
  )
}
