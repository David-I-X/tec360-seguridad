import { Button } from "@/components/ui/button"
import { Shield, Clock, Award } from "lucide-react"
import Link from "next/link"

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-background to-background" />

      <div className="container relative z-10 mx-auto px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-600/20 bg-blue-600/10 px-4 py-2 text-sm font-medium text-blue-600">
            <Award className="h-4 w-4" />
            Técnicos Certificados SENA
          </div>

          {/* Main heading */}
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-balance md:text-6xl lg:text-7xl">
            Seguridad Electrónica <span className="text-blue-600">Profesional</span>
          </h1>

          {/* Subheading */}
          <p className="mb-10 text-lg text-muted-foreground text-pretty md:text-xl">
            Conectamos clientes con técnicos certificados por el SENA para instalación y mantenimiento de sistemas de
            seguridad electrónica en toda Colombia
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 sm:w-auto">
                Comenzar Ahora
              </Button>
            </Link>
            <Link href="/services">
              <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
                Ver Servicios
              </Button>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-2">
              <Shield className="h-10 w-10 text-blue-600" />
              <p className="text-sm font-medium">100% Certificado</p>
              <p className="text-xs text-muted-foreground">Técnicos verificados</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Clock className="h-10 w-10 text-blue-600" />
              <p className="text-sm font-medium">24/7 Disponible</p>
              <p className="text-xs text-muted-foreground">Servicio continuo</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Award className="h-10 w-10 text-blue-600" />
              <p className="text-sm font-medium">Calidad Garantizada</p>
              <p className="text-xs text-muted-foreground">Satisfacción asegurada</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
