import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Descargar App Móvil para Técnicos y Clientes | Tec360",
  description: "Descarga la aplicación oficial de Tec360 Seguridad para Android. Accede a servicios de rastreo, telemetría y gestión de servicios técnicos en tiempo real.",
}

export default function DescargarAppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
