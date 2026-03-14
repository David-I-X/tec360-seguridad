import { Hero } from "@/components/hero"
import { Features } from "@/components/features"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Instalación de GPS, Cámaras y Alarmas | Tec360 Seguridad",
  description: "Solicita técnicos expertos y certificados por el SENA en tu ubicación. Instalación de GPS para vehículos, cámaras de seguridad y sistemas de alarmas en toda Colombia. ¡Cotiza tu servicio hoy!",
  openGraph: {
    title: "Expertos en Sistemas de Seguridad | Cotiza con Tec360",
    description: "Técnicos calificados del SENA en Medellín y Colombia listos para instalar tu sistema GPS, cámaras de seguridad y alarmas vehiculares aseguran tu tranquilidad.",
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
