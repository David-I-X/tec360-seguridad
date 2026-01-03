"use client"

import { useState } from "react"
import { QuotationList } from "@/components/quotation-list"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function QuotationsPage() {
  const [quotations] = useState([
    {
      id: "1",
      technicianName: "Carlos Rodríguez",
      technicianRating: 4.8,
      price: 450000,
      breakdown: [
        { item: "Mano de obra", price: 200000 },
        { item: "Materiales", price: 150000 },
        { item: "Desplazamiento", price: 100000 },
      ],
      notes: "Incluye instalación completa y pruebas del sistema. Garantía de 6 meses.",
      proposedDate: "2025-01-15",
      status: "pending" as const,
      createdAt: "2025-01-10T10:00:00Z",
    },
    {
      id: "2",
      technicianName: "Ana Martínez",
      technicianRating: 4.9,
      price: 420000,
      breakdown: [
        { item: "Mano de obra", price: 180000 },
        { item: "Materiales", price: 160000 },
        { item: "Desplazamiento", price: 80000 },
      ],
      notes: "Puedo comenzar la próxima semana. Trabajo con materiales de primera calidad.",
      proposedDate: "2025-01-12",
      status: "accepted" as const,
      createdAt: "2025-01-09T14:30:00Z",
    },
    {
      id: "3",
      technicianName: "Luis García",
      technicianRating: 4.6,
      price: 500000,
      notes: "Incluye mantenimiento gratuito por 3 meses.",
      status: "pending" as const,
      createdAt: "2025-01-11T09:15:00Z",
    },
  ])

  const handleAccept = (id: string) => {
    console.log("Accepting quotation:", id)
    // Handle accept logic
  }

  const handleReject = (id: string) => {
    console.log("Rejecting quotation:", id)
    // Handle reject logic
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link href="/servicios">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a servicios
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Cotizaciones Recibidas</h1>
          <p className="text-muted-foreground">Revisa y compara las propuestas de los técnicos</p>
        </div>

        <QuotationList quotations={quotations} onAccept={handleAccept} onReject={handleReject} />
      </div>
    </div>
  )
}
