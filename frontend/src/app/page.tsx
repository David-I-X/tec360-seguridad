import { Hero } from "@/components/hero"
import { Features } from "@/components/features"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tec360 Seguridad | Telemetría Satelital & Protección Vehicular 360°",
  description: "Plataforma telemática avanzada de seguridad vehicular: telemetría satelital 4G, corte de motor remoto, dashcams HD y respuesta táctica 24/7 con técnicos verificados en toda Colombia.",
  openGraph: {
    title: "Blindaje Tecnológico & Telemetría 360° en Tiempo Real | Tec360 Seguridad",
    description: "Monitoreo satelital 24/7, corte de corriente remoto instantáneo y red de técnicos especializados en seguridad vehicular en Colombia.",
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
