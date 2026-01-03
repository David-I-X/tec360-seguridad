import { ServiceList } from "@/components/service-list"

// Mock data for demonstration
const mockServices = [
  {
    id: "1",
    title: "Instalación de GPS en camioneta",
    type: "gps_install",
    status: "pending" as const,
    address: "Calle 50 #45-67, Medellín",
    date: "2025-01-15",
    price: undefined,
  },
  {
    id: "2",
    title: "Mantenimiento sistema de alarma",
    type: "alarm_maintenance",
    status: "assigned" as const,
    address: "Carrera 80 #30-15, Bogotá",
    date: "2025-01-10",
    price: 150000,
  },
  {
    id: "3",
    title: "Instalación de cámaras de seguridad",
    type: "camera_install",
    status: "completed" as const,
    address: "Avenida 6N #25-30, Cali",
    date: "2025-01-05",
    price: 450000,
  },
]

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <ServiceList services={mockServices} />
      </div>
    </div>
  )
}
