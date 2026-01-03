import { TechnicianList } from "@/components/technician-list"

// Mock data for demonstration
const mockTechnicians = [
  {
    id: "1",
    name: "Carlos Rodríguez",
    avatar: "/diverse-technician-team.png",
    specializations: ["GPS", "Alarmas", "Cámaras"],
    rating: 4.9,
    reviewCount: 127,
    distance: 2.3,
    city: "Medellín",
    certified: true,
  },
  {
    id: "2",
    name: "Ana María Gómez",
    avatar: "/technician-woman.jpg",
    specializations: ["Cámaras", "Sistemas integrados"],
    rating: 4.8,
    reviewCount: 95,
    distance: 4.1,
    city: "Medellín",
    certified: true,
  },
  {
    id: "3",
    name: "Jorge Martínez",
    avatar: "/technician-male.jpg",
    specializations: ["GPS", "Mantenimiento"],
    rating: 4.7,
    reviewCount: 68,
    distance: 5.8,
    city: "Bogotá",
    certified: true,
  },
  {
    id: "4",
    name: "Sandra López",
    avatar: "/technician-woman-2.jpg",
    specializations: ["Alarmas", "Cámaras"],
    rating: 4.9,
    reviewCount: 142,
    distance: 1.5,
    city: "Medellín",
    certified: true,
  },
  {
    id: "5",
    name: "Miguel Torres",
    avatar: "/technician-male-2.jpg",
    specializations: ["GPS", "Alarmas"],
    rating: 4.6,
    reviewCount: 54,
    distance: 7.2,
    city: "Cali",
    certified: true,
  },
]

export default function TechniciansPage() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        <TechnicianList technicians={mockTechnicians} />
      </div>
    </div>
  )
}
