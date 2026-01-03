import { Card } from "@/components/ui/card"
import { Camera, Wifi, ShieldCheck } from "lucide-react"

export function Features() {
  const features = [
    {
      icon: Camera,
      title: "Cámaras de Seguridad",
      description:
        "Instalación y configuración profesional de sistemas CCTV, cámaras IP, y sistemas de videovigilancia avanzados",
    },
    {
      icon: Wifi,
      title: "Sistemas Conectados",
      description:
        "Integración de sistemas inteligentes, control remoto, y monitoreo en tiempo real desde cualquier dispositivo",
    },
    {
      icon: ShieldCheck,
      title: "Alarmas y Control de Acceso",
      description:
        "Instalación de alarmas perimetrales, sensores de movimiento, y sistemas biométricos de última generación",
    },
  ]

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">Nuestros Servicios</h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-pretty">
            Ofrecemos una gama completa de soluciones de seguridad electrónica con técnicos especializados
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group relative overflow-hidden border-border bg-card p-6 transition-all hover:border-blue-600/50 hover:shadow-lg hover:shadow-blue-600/10"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-600 to-blue-400 opacity-0 transition-opacity group-hover:opacity-100" />
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
