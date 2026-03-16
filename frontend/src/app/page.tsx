import { Hero } from "@/components/hero"
import { Features } from "@/components/features"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tec360 Seguridad | Instalación de GPS, Alarmas y Cámaras a Domicilio",
  description: "Solicita técnicos expertos y certificados por el SENA en tu ubicación. Instalación a domicilio de rastreo GPS para vehículos, cámaras de seguridad CCTV y sistemas de alarmas en toda Colombia. ¡Cotiza rápido tu servicio experto hoy mismo!",
  openGraph: {
    title: "Expertos en Instalación de GPS y Seguridad | Cotiza con Tec360",
    description: "Técnicos especialistas del SENA en Medellín y Colombia, listos para instalar tu sistema de rastreo satelital GPS, cámaras de seguridad y alarmas vehiculares.",
  }
}

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Features />
    </main>
  )
}
