import { Hero } from "@/components/hero"
import { Features } from "@/components/features"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tec360 Seguridad | Instalación de Seguridad y Recuperación de Vehículos",
  description: "Plataforma integral de seguridad: instalación de GPS, alarmas, cámaras y domótica por técnicos certificados SENA, más servicio de recuperación de vehículos con rastreo GPS 24/7 en toda Colombia.",
  openGraph: {
    title: "Protección 360° en Tiempo Real | Tec360 Seguridad",
    description: "Conectamos expertos certificados SENA para instalación de dispositivos de seguridad y recuperación de vehículos con monitoreo GPS en tiempo real.",
  }
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Hero />
      <Features />
    </main>
  )
}
