"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Calendar, DollarSign, MoreVertical } from "lucide-react"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type ServiceStatus = "pending" | "assigned" | "in_progress" | "completed" | "cancelled"

interface ServiceCardProps {
  id: string
  title: string
  type: string
  status: ServiceStatus
  address: string
  date: string
  price?: number
  onView?: () => void
  onEdit?: () => void
  onCancel?: () => void
}

const statusConfig: Record<
  ServiceStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pendiente", variant: "secondary" },
  assigned: { label: "Asignado", variant: "default" },
  in_progress: { label: "En Progreso", variant: "outline" },
  completed: { label: "Completado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
}

const typeIcons: Record<string, string> = {
  gps_install: "🛰️",
  alarm_install: "🚨",
  camera_install: "📹",
  gps_maintenance: "🔧",
  alarm_maintenance: "🔧",
  camera_maintenance: "🔧",
  other: "⚙️",
}

export function ServiceCard({
  id,
  title,
  type,
  status,
  address,
  date,
  price,
  onView,
  onEdit,
  onCancel,
}: ServiceCardProps) {
  const statusInfo = statusConfig[status]
  const icon = typeIcons[type] || typeIcons.other

  return (
    <Card className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 border-border/50">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{icon}</div>
            <div>
              <h3 className="font-semibold text-lg text-foreground leading-tight">{title}</h3>
              <Badge variant={statusInfo.variant} className="mt-1.5">
                {statusInfo.label}
              </Badge>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>Ver detalles</DropdownMenuItem>
              {status === "pending" && (
                <>
                  <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
                  <DropdownMenuItem onClick={onCancel} className="text-destructive focus:text-destructive">
                    Cancelar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{address}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>{date}</span>
          </div>

          {price && (
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <DollarSign className="h-4 w-4 flex-shrink-0" />
              <span>${price.toLocaleString("es-CO")}</span>
            </div>
          )}
        </div>

        <Link href={`/servicios/${id}`} className="mt-4 block">
          <Button variant="outline" className="w-full bg-transparent">
            Ver servicio
          </Button>
        </Link>
      </div>
    </Card>
  )
}
