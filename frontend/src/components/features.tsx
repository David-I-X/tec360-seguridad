"use client"

import { ShieldCheck, Camera, Wifi, Radio, Lock, Eye, ArrowRight, Search, FileText, CheckCircle, Star, Clock, MapPin, BadgeCheck } from "lucide-react"
import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import Link from "next/link"

/* ─── Scroll Reveal Wrapper ────────────────────────── */
function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })
  return (
    <div ref={ref} className={className}>
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  )
}

/* ─── Section Label ────────────────────────────────── */
function SectionLabel({ label, title, highlight }: { label: string; title: string; highlight: string }) {
  return (
    <div className="mb-12 text-center">
      <span className="text-xs font-semibold text-blue-400 uppercase tracking-[0.2em] font-mono">{label}</span>
      <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
        {title}{" "}<span className="gradient-text">{highlight}</span>
      </h2>
    </div>
  )
}

/* ════════════════════════════════════════════════════
   SERVICES BENTO GRID
   ════════════════════════════════════════════════════ */
const services = [
  { icon: Camera, title: "Dashcam HD", sub: "Cámara Vehicular 4K", desc: "Grabación continua con almacenamiento cloud. Evidencia siempre disponible.", color: "blue", span: "md:col-span-2 md:row-span-2", large: true, tags: ["4K", "24/7", "Cloud"] },
  { icon: Radio, title: "GPS Tracker", sub: "Seguimiento en tiempo real", color: "purple", span: "md:col-span-1", large: false },
  { icon: Lock, title: "Alarmas", sub: "Respuesta anti-intrusión", color: "emerald", span: "md:col-span-1", large: false },
  { icon: Wifi, title: "Domótica", sub: "Control desde tu smartphone", color: "cyan", span: "md:col-span-1", large: false },
  { icon: Eye, title: "Biometría", sub: "Acceso por huella o rostro", color: "amber", span: "md:col-span-1", large: false },
]

const palette: Record<string, { border: string; bg: string; text: string; iconBg: string }> = {
  blue: { border: "border-blue-500/20", bg: "bg-blue-500/[0.04]", text: "text-blue-400", iconBg: "bg-blue-500/15" },
  purple: { border: "border-purple-500/20", bg: "bg-purple-500/[0.04]", text: "text-purple-400", iconBg: "bg-purple-500/15" },
  emerald: { border: "border-emerald-500/20", bg: "bg-emerald-500/[0.04]", text: "text-emerald-400", iconBg: "bg-emerald-500/15" },
  cyan: { border: "border-cyan-500/20", bg: "bg-cyan-500/[0.04]", text: "text-cyan-400", iconBg: "bg-cyan-500/15" },
  amber: { border: "border-amber-500/20", bg: "bg-amber-500/[0.04]", text: "text-amber-400", iconBg: "bg-amber-500/15" },
}

function BentoCard({ s, i }: { s: typeof services[0]; i: number }) {
  const c = palette[s.color]
  return (
    <Reveal className={s.span} delay={i * 0.07}>
      <motion.div
        className={`group relative h-full min-h-[160px] overflow-hidden rounded-2xl border ${c.border} ${c.bg} backdrop-blur-md ${s.large ? "p-8 md:p-10" : "p-6"} transition-all duration-300 cursor-pointer`}
        whileHover={{ scale: 1.02, y: -3 }}
      >
        <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${c.bg}`} />
        <div className="relative z-10">
          <div className={`inline-flex items-center justify-center rounded-xl ${c.iconBg} ${c.text} ${s.large ? "h-14 w-14 mb-5" : "h-10 w-10 mb-3"}`}>
            <s.icon className={s.large ? "h-7 w-7" : "h-5 w-5"} />
          </div>
          <h3 className={`font-bold ${s.large ? "text-2xl md:text-3xl mb-1" : "text-lg mb-1"}`}>{s.title}</h3>
          <p className={`${c.text} font-medium ${s.large ? "text-sm" : "text-xs"}`}>{s.sub}</p>
          {s.large && s.desc && <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{s.desc}</p>}
          {s.large && s.tags && (
            <div className="mt-5 flex gap-2">
              {s.tags.map((tag) => (
                <span key={tag} className="py-1 px-3 rounded-lg border border-blue-500/15 bg-blue-500/5 text-[11px] font-mono text-blue-400/80">{tag}</span>
              ))}
            </div>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[2px] gradient-brand opacity-0 group-hover:opacity-100 transition-opacity" />
      </motion.div>
    </Reveal>
  )
}

/* ════════════════════════════════════════════════════
   WHY TEC360 — 3 differentiators
   ════════════════════════════════════════════════════ */
const whys = [
  {
    icon: BadgeCheck,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    title: "Técnicos verificados",
    desc: "Cada técnico pasa por validación de identidad, certificación SENA y revisión de antecedentes antes de operar en la plataforma.",
  },
  {
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    title: "Mismo día disponible",
    desc: "Servicios express disponibles hoy mismo. Sin esperas de días — un técnico llega en horas cuando lo necesitas.",
  },
  {
    icon: MapPin,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    title: "Seguimiento en vivo",
    desc: "Sabe exactamente dónde está tu técnico en tiempo real. Rastreo GPS integrado durante todo el recorrido.",
  },
]

function WhySection() {
  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-4">
        <Reveal>
          <SectionLabel label="Por qué elegirnos" title="La diferencia" highlight="Tec360" />
        </Reveal>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {whys.map((w, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className={`group p-7 rounded-2xl border border-border/30 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300`}>
                <div className={`w-12 h-12 rounded-xl ${w.bg} flex items-center justify-center mb-5`}>
                  <w.icon className={`w-6 h-6 ${w.color}`} />
                </div>
                <h3 className="font-bold text-lg mb-2">{w.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{w.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════
   STEPS
   ════════════════════════════════════════════════════ */
const steps = [
  { num: "01", icon: Search, title: "Elige tu servicio", desc: "Selecciona qué necesitas: dashcam, GPS, alarma o domótica. Ingresa tu dirección y la fecha.", visual: "📍" },
  { num: "02", icon: FileText, title: "Un técnico acepta", desc: "En minutos un técnico certificado cerca de ti acepta el trabajo. Ves su perfil, calificación y precio.", visual: "🤝" },
  { num: "03", icon: CheckCircle, title: "Llega y trabaja", desc: "El técnico llega a tu ubicación, toma fotos de evidencia y tú confirmas el trabajo completado.", visual: "🛡️" },
]

function Steps() {
  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-4">
        <Reveal><SectionLabel label="Proceso" title="Tan fácil como" highlight="pedir un taxi" /></Reveal>
        <div className="max-w-3xl mx-auto">
          {steps.map((s, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className={`flex items-center gap-6 md:gap-10 py-8 ${i < steps.length - 1 ? "border-b border-border/20" : ""}`}>
                <motion.div className="flex-shrink-0 relative" whileHover={{ scale: 1.06 }}>
                  <div className="flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-2xl border border-border/30 bg-white/[0.03]">
                    <span className="text-4xl md:text-5xl">{s.visual}</span>
                  </div>
                  <span className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-full gradient-brand text-white text-[10px] font-bold shadow-lg">{s.num}</span>
                </motion.div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold mb-1.5">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════
   TESTIMONIALS
   ════════════════════════════════════════════════════ */
const testimonials = [
  {
    name: "Luis M.",
    location: "Medellín",
    rating: 5,
    text: "Pedí la instalación de una dashcam y el técnico llegó en menos de 2 horas. Excelente trabajo, muy profesional.",
    initials: "LM",
    color: "from-blue-500 to-indigo-600",
  },
  {
    name: "Carolina V.",
    location: "Bogotá",
    rating: 5,
    text: "Nunca pensé que fuera tan fácil. Elegí el servicio, vi la foto del técnico y en minutos ya estaba en camino con seguimiento en el mapa.",
    initials: "CV",
    color: "from-purple-500 to-pink-600",
  },
  {
    name: "Andrés T.",
    location: "Cali",
    rating: 5,
    text: "Instalaron el GPS de mi camión con garantía. El técnico fue puntual, dejó todo limpio y me explicó cómo funciona la app.",
    initials: "AT",
    color: "from-emerald-500 to-teal-600",
  },
]

function Testimonials() {
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ background: "radial-gradient(circle at 50% 50%, rgba(59,130,246,1) 0%, transparent 60%)" }}
      />
      <div className="container mx-auto px-4">
        <Reveal><SectionLabel label="Reseñas" title="Lo que dicen" highlight="nuestros clientes" /></Reveal>
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <motion.div
                className="p-6 rounded-2xl border border-border/30 bg-white/[0.025] flex flex-col gap-4"
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
              >
                {/* Stars */}
                <div className="flex gap-0.5">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                {/* Text */}
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">"{t.text}"</p>
                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-xs font-bold text-white`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" />{t.location}
                    </p>
                  </div>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════
   CTA
   ════════════════════════════════════════════════════ */
function CTA() {
  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-4">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl p-10 md:p-16 text-center">
            <div className="absolute inset-0 rounded-3xl border border-blue-500/15 bg-white/[0.02]" />
            <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/[0.05] rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-purple-500/[0.05] rounded-full blur-3xl" />

            <div className="relative z-10">
              <motion.div
                animate={{ boxShadow: ["0 0 20px rgba(59,130,246,0.2)", "0 0 45px rgba(59,130,246,0.4)", "0 0 20px rgba(59,130,246,0.2)"] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-brand mb-6"
              >
                <ShieldCheck className="h-7 w-7 text-white" />
              </motion.div>

              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                ¿Listo para proteger tu vehículo?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-sm mx-auto text-sm leading-relaxed">
                Más de 200 técnicos certificados están esperando tu solicitud.
                Primer servicio con garantía total.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/register">
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    className="w-full sm:w-auto px-8 py-3.5 gradient-brand text-white rounded-xl font-bold shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow"
                  >
                    Comenzar gratis <ArrowRight className="inline ml-2 h-4 w-4" />
                  </motion.button>
                </Link>
                <Link href="/login">
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    className="w-full sm:w-auto px-8 py-3.5 border border-border/40 text-foreground rounded-xl font-medium hover:bg-white/[0.04] transition-all"
                  >
                    Ya tengo cuenta
                  </motion.button>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════
   FOOTER
   ════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="border-t border-border/20 py-14 bg-white/[0.01]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-brand shadow-lg">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold">Tec360 Seguridad</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-5">
              Plataforma líder de servicios de seguridad técnica vehicular. Conectamos clientes con técnicos certificados en toda Colombia.
            </p>
            <div className="flex gap-2">
              {["SENA", "Créame", "2026"].map((tag) => (
                <span key={tag} className="text-[10px] font-mono border border-border/30 px-2 py-1 rounded text-muted-foreground">{tag}</span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm">Plataforma</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {[
                { label: "Servicios", href: "/servicios" },
                { label: "Registrarse", href: "/register" },
                { label: "Iniciar sesión", href: "/login" },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="hover:text-foreground transition-colors inline-flex items-center gap-1.5">
                    <ArrowRight className="w-3 h-3 opacity-40" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm">Contacto</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="text-base">📧</span>
                <a href="mailto:oscarvasquezbroker@gmail.com" className="hover:text-foreground transition-colors truncate">
                  oscarvasquezbroker@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-base">🏢</span>
                <span>Créame Incubadora</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-base">📍</span>
                <span>Colombia</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/20 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">© 2026 Tec360 Seguridad. Todos los derechos reservados.</p>
          <p className="text-xs text-muted-foreground">Ruta del Emprendimiento — Créame Incubadora de Empresas</p>
        </div>
      </div>
    </footer>
  )
}

/* ════════════════════════════════════════════════════
   EXPORT
   ════════════════════════════════════════════════════ */
export function Features() {
  return (
    <>
      {/* Services Bento */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <Reveal><SectionLabel label="Servicios" title="Todo lo que tu vehículo" highlight="necesita" /></Reveal>
          <Reveal>
            <p className="text-center text-muted-foreground text-sm mb-10 -mt-8 max-w-lg mx-auto">
              Desde cámaras hasta alarmas — instalación profesional garantizada
            </p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 max-w-5xl mx-auto auto-rows-[180px]">
            {services.map((s, i) => <BentoCard key={i} s={s} i={i} />)}
          </div>
        </div>
      </section>

      <WhySection />
      <Steps />
      <Testimonials />
      <CTA />
      <Footer />
    </>
  )
}
