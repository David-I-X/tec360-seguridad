"use client"

import { Card } from "@/components/ui/card"
import { Camera, Wifi, ShieldCheck, ArrowRight, Search, FileText, CheckCircle } from "lucide-react"
import { motion } from "framer-motion"
import { useInView } from "framer-motion"
import { useRef } from "react"

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
}

const services = [
  {
    icon: Camera,
    title: "Cámaras de Seguridad",
    description: "Instalación y configuración profesional de sistemas CCTV, cámaras IP y videovigilancia avanzada",
    gradient: "from-blue-500/10 to-cyan-500/5",
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
  },
  {
    icon: Wifi,
    title: "Sistemas Conectados",
    description: "Integración de sistemas inteligentes, control remoto y monitoreo en tiempo real desde cualquier dispositivo",
    gradient: "from-purple-500/10 to-pink-500/5",
    iconColor: "text-purple-500",
    iconBg: "bg-purple-500/10",
  },
  {
    icon: ShieldCheck,
    title: "Alarmas y Control de Acceso",
    description: "Instalación de alarmas perimetrales, sensores de movimiento y sistemas biométricos de última generación",
    gradient: "from-emerald-500/10 to-teal-500/5",
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-500/10",
  },
]

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Solicita tu Servicio",
    description: "Describe lo que necesitas y selecciona tu ubicación en el mapa",
  },
  {
    number: "02",
    icon: FileText,
    title: "Recibe Cotizaciones",
    description: "Técnicos certificados envían presupuestos detallados para tu proyecto",
  },
  {
    number: "03",
    icon: CheckCircle,
    title: "Servicio Garantizado",
    description: "Aprueba la cotización, sigue el técnico en tiempo real y califica el resultado",
  },
]

function AnimatedSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <div ref={ref} className={className}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  )
}

export function Features() {
  return (
    <>
      {/* Services Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <AnimatedSection>
            <div className="mb-16 text-center">
              <span className="text-sm font-semibold text-blue-500 uppercase tracking-wider">Servicios</span>
              <h2 className="mt-3 mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
                Soluciones de Seguridad{" "}
                <span className="gradient-text">Completas</span>
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Todo lo que necesitas para proteger tu hogar o negocio, con técnicos especializados
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {services.map((feature, index) => (
              <AnimatedSection key={index}>
                <Card
                  className={`group relative overflow-hidden border-border bg-gradient-to-br ${feature.gradient} p-8 transition-all hover:border-blue-500/30 hover-lift h-full`}
                >
                  <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${feature.iconBg} ${feature.iconColor}`}>
                    <feature.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  <div className="mt-5 flex items-center text-sm font-medium text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    Saber más <ArrowRight className="ml-1 h-4 w-4" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-1 gradient-brand opacity-0 transition-opacity group-hover:opacity-100" />
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-24 relative bg-muted/30">
        <div className="container mx-auto px-4">
          <AnimatedSection>
            <div className="mb-16 text-center">
              <span className="text-sm font-semibold text-blue-500 uppercase tracking-wider">Proceso</span>
              <h2 className="mt-3 mb-4 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
                ¿Cómo{" "}
                <span className="gradient-text">Funciona?</span>
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                En tres simples pasos tendrás un técnico certificado en tu puerta
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3 max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <AnimatedSection key={index}>
                <div className="relative flex flex-col items-center text-center group">
                  {/* Connector line (visible on desktop between steps) */}
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-[calc(50%+40px)] w-[calc(100%-80px)] h-[2px] bg-gradient-to-r from-blue-500/30 to-purple-500/30" />
                  )}

                  {/* Step number circle */}
                  <div className="relative mb-6">
                    <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 group-hover:border-blue-500/40 transition-colors">
                      <step.icon className="h-10 w-10 text-blue-500" />
                    </div>
                    <span className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full gradient-brand text-white text-sm font-bold shadow-lg">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="mb-2 text-lg font-bold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-[250px]">
                    {step.description}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <AnimatedSection>
            <div className="relative overflow-hidden rounded-3xl gradient-brand p-12 md:p-16 text-center text-white">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

              <div className="relative z-10">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  ¿Listo para proteger lo que más importa?
                </h2>
                <p className="text-white/80 mb-8 max-w-lg mx-auto text-lg">
                  Únete a cientos de colombianos que confían en técnicos certificados del SENA
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a href="/register">
                    <button className="w-full sm:w-auto px-8 py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-white/90 transition-all shadow-xl hover:shadow-2xl">
                      Registrarse Gratis
                    </button>
                  </a>
                  <a href="/login">
                    <button className="w-full sm:w-auto px-8 py-3 bg-white/10 text-white border border-white/20 rounded-xl font-medium hover:bg-white/20 transition-all">
                      Ya tengo cuenta
                    </button>
                  </a>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand">
                  <ShieldCheck className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold">Tec360 Seguridad</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                Conectamos clientes con técnicos certificados por el SENA para instalación y mantenimiento de
                sistemas de seguridad electrónica en toda Colombia.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4 text-sm">Plataforma</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/servicios" className="hover:text-foreground transition-colors">Servicios</a></li>
                <li><a href="/mapa" className="hover:text-foreground transition-colors">Mapa</a></li>
                <li><a href="/register" className="hover:text-foreground transition-colors">Registrarse</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold mb-4 text-sm">Contacto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>📧 oscarvasquezbroker@gmail.com</li>
                <li>🏢 Créame Incubadora</li>
                <li>📍 Colombia</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-8 text-center">
            <p className="text-xs text-muted-foreground">
              © 2026 Tec360 Seguridad. Todos los derechos reservados. Ruta del Emprendimiento — Créame Incubadora de Empresas.
            </p>
          </div>
        </div>
      </footer>
    </>
  )
}
