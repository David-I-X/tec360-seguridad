import { Hero } from "@/components/hero"
import { Features } from "@/components/features"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tec360 Seguridad | Telemetría Satelital, Reacción 24/7 & Mecánica a Domicilio",
  description:
    "Plataforma de seguridad y asistencia vehicular en Colombia: instalaciones de GPS 4G anti-jammer y dashcams HD, equipo de reacción 24/7 y mecánica básica a domicilio por técnicos certificados.",
  openGraph: {
    title: "Blindaje Vehicular 360°, Equipo de Reacción & Mecánica Básica | Tec360 Seguridad",
    description:
      "Instalaciones telemáticas, corte de motor remoto inmediato, equipo de reacción 24/7 y mecánica básica express con técnicos certificados en toda Colombia.",
  },
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050810] text-[#F8FAFC] overflow-x-clip">
      <Hero />
      <Features />
    </main>
  )
}
