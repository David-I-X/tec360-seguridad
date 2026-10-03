import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Escuela Técnica y Certificaciones | Tec360",
  description: "Cursos especializados, manuales técnicos y certificaciones en seguridad electrónica, instalación de GPS 4G y cámaras de seguridad.",
}

export default function EscuelaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
