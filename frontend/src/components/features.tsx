"use client"

import { ShieldCheck, Camera, Wifi, Radio, Lock, Eye, ArrowRight, Search, FileText, CheckCircle } from "lucide-react"
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
        initial={{ opacity: 0, y: 40 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </div>
  )
}

/* ─── Section Label ────────────────────────────────── */
function SectionLabel({ label, title, highlight }: { label: string; title: string; highlight: string }) {
  return (
    <div className="mb-14 text-center">
      <span className="text-xs font-semibold text-blue-400 uppercase tracking-[0.2em] font-mono">{label}</span>
      <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
        {title}{" "}
        <span className="gradient-text">{highlight}</span>
      </h2>
    </div>
  )
}

/* ════════════════════════════════════════════════════
   BENTO GRID SERVICES
   ════════════════════════════════════════════════════ */
const services = [
  { icon: Camera, title: "Dashcam", sub: "Cámara Vehicular HD", desc: "Monitoreo y grabación continua en calidad 4K con almacenamiento cloud", color: "blue", span: "md:col-span-2 md:row-span-2", large: true },
  { icon: Radio, title: "Rastreo GPS", sub: "Seguimiento de flota en tiempo real", color: "purple", span: "md:col-span-1", large: false },
  { icon: Lock, title: "Alarmas", sub: "Respuesta inmediata anti-intrusión", color: "emerald", span: "md:col-span-1", large: false },
  { icon: Wifi, title: "IoT Domótica", sub: "Control total desde tu smartphone", color: "cyan", span: "md:col-span-1", large: false },
  { icon: Eye, title: "Biometría", sub: "Reconocimiento facial y dactilar", color: "amber", span: "md:col-span-1", large: false },
]

const palette: Record<string, { border: string; bg: string; text: string; iconBg: string }> = {
  blue: { border: "border-blue-500/15", bg: "bg-blue-500/[0.04]", text: "text-blue-400", iconBg: "bg-blue-500/15" },
  purple: { border: "border-purple-500/15", bg: "bg-purple-500/[0.04]", text: "text-purple-400", iconBg: "bg-purple-500/15" },
  emerald: { border: "border-emerald-500/15", bg: "bg-emerald-500/[0.04]", text: "text-emerald-400", iconBg: "bg-emerald-500/15" },
  cyan: { border: "border-cyan-500/15", bg: "bg-cyan-500/[0.04]", text: "text-cyan-400", iconBg: "bg-cyan-500/15" },
  amber: { border: "border-amber-500/15", bg: "bg-amber-500/[0.04]", text: "text-amber-400", iconBg: "bg-amber-500/15" },
}

function BentoCard({ s, i }: { s: typeof services[0]; i: number }) {
  const c = palette[s.color]
  return (
    <Reveal className={s.span} delay={i * 0.08}>
      <motion.div
        className={`group relative h-full overflow-hidden rounded-2xl border ${c.border} ${c.bg} backdrop-blur-md ${s.large ? "p-8 md:p-10" : "p-6"} transition-all duration-300 cursor-pointer`}
        whileHover={{ scale: 1.02, y: -4 }}
      >
        {/* Hover glow */}
        <div className={`absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${c.bg}`} />

        {/* Hover scan line */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
          style={{ background: "linear-gradient(180deg, transparent 0%, transparent 45%, rgba(59,130,246,0.04) 50%, transparent 55%, transparent 100%)" }}
          animate={{ y: [-200, 400] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />

        <div className="relative z-10">
          <div className={`inline-flex items-center justify-center rounded-xl ${c.iconBg} ${c.text} ${s.large ? "h-16 w-16 mb-5" : "h-11 w-11 mb-3"}`}>
            <s.icon className={s.large ? "h-8 w-8" : "h-5 w-5"} />
          </div>
          <h3 className={`font-bold ${s.large ? "text-2xl md:text-3xl mb-2" : "text-lg mb-1"}`}>{s.title}</h3>
          <p className={`${c.text} font-medium ${s.large ? "text-sm mb-1" : "text-xs"}`}>{s.sub}</p>
          {s.large && s.desc && <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>}
          {s.large && (
            <div className="mt-6 flex gap-2">
              {["24/7", "4K", "Cloud"].map((tag) => (
                <span key={tag} className="py-1.5 px-3 rounded-lg border border-blue-500/10 bg-blue-500/5 text-[11px] font-mono text-blue-400/80">{tag}</span>
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
   DATA FLOW — Red neuronal de seguridad
   ════════════════════════════════════════════════════ */
function DataFlow() {
  const nodes = [
    { label: "Cámara IP", x: 8, y: 20, icon: Camera },
    { label: "Sensor", x: 8, y: 50, icon: Radio },
    { label: "Alarma", x: 8, y: 80, icon: Lock },
    { label: "Cloud", x: 50, y: 50, icon: Wifi },
    { label: "Dashboard", x: 88, y: 25, icon: Eye },
    { label: "App Móvil", x: 88, y: 75, icon: ShieldCheck },
  ]
  const conns = [
    [0, 3], [1, 3], [2, 3], [3, 4], [3, 5],
  ]

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 50%, rgba(59,130,246,0.04) 0%, transparent 60%)" }} />
      <div className="container mx-auto px-4">
        <Reveal><SectionLabel label="Arquitectura" title="Red Neuronal de" highlight="Seguridad" /></Reveal>
        <Reveal>
          <p className="text-center text-muted-foreground text-sm mb-10 -mt-8 max-w-lg mx-auto">
            Todos tus dispositivos conectados en una red neuronal interconectada con respuesta en milisegundos
          </p>
        </Reveal>
        <Reveal>
          <div className="relative mx-auto max-w-4xl h-[320px] md:h-[380px] rounded-2xl border border-blue-500/10 bg-white/[0.02] backdrop-blur-sm overflow-hidden">
            {/* Grid bg */}
            <div className="absolute inset-0 opacity-15" style={{ backgroundImage: "linear-gradient(rgba(59,130,246,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.12) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />

            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="particle-glow"><feGaussianBlur stdDeviation="3" result="g" /><feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              {conns.map(([fi, ti], i) => {
                const f = nodes[fi], t = nodes[ti]
                return (
                  <g key={i}>
                    <line x1={`${f.x + 3}%`} y1={`${f.y}%`} x2={`${t.x - 3}%`} y2={`${t.y}%`} stroke="rgba(59,130,246,0.15)" strokeWidth="1" strokeDasharray="6 4" />
                    <motion.circle
                      r="3" fill="#3b82f6" filter="url(#particle-glow)"
                      initial={{ cx: `${f.x + 3}%`, cy: `${f.y}%` }}
                      animate={{ cx: [`${f.x + 3}%`, `${t.x - 3}%`], cy: [`${f.y}%`, `${t.y}%`] }}
                      transition={{ duration: 2.5 + Math.random(), delay: i * 0.4, repeat: Infinity, ease: "linear" }}
                    />
                  </g>
                )
              })}
            </svg>

            {nodes.map((n, i) => (
              <motion.div
                key={i}
                className="absolute flex flex-col items-center gap-1"
                style={{ left: `${n.x}%`, top: `${n.y}%`, transform: "translate(-50%, -50%)" }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.12, duration: 0.5 }}
              >
                <motion.div
                  className="flex items-center justify-center w-11 h-11 md:w-14 md:h-14 rounded-xl border border-blue-500/25 bg-blue-500/8 backdrop-blur-md text-blue-400"
                  whileHover={{ scale: 1.15, borderColor: "rgba(59,130,246,0.5)" }}
                  animate={{ boxShadow: ["0 0 0 rgba(59,130,246,0)", "0 0 18px rgba(59,130,246,0.25)", "0 0 0 rgba(59,130,246,0)"] }}
                  transition={{ duration: 3, delay: i * 0.3, repeat: Infinity }}
                >
                  <n.icon className="w-4 h-4 md:w-5 md:h-5" />
                </motion.div>
                <span className="text-[9px] md:text-[10px] font-mono text-muted-foreground mt-1 whitespace-nowrap">{n.label}</span>
              </motion.div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════
   STEPS — Scroll storytelling
   ════════════════════════════════════════════════════ */
const steps = [
  { num: "01", icon: Search, title: "Solicita", desc: "Describe tu necesidad de seguridad. El sistema analizará tus requerimientos.", visual: "📍" },
  { num: "02", icon: FileText, title: "Cotiza", desc: "Recibe ofertas de técnicos certificados y empresas verificadas en minutos.", visual: "📋" },
  { num: "03", icon: CheckCircle, title: "Protege", desc: "Selecciona la mejor opción, programa la instalación y disfruta 360°.", visual: "🛡️" },
]

function Steps() {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <Reveal><SectionLabel label="Proceso" title="Tres pasos." highlight="Protección total." /></Reveal>
        <div className="max-w-4xl mx-auto">
          {steps.map((s, i) => (
            <Reveal key={i} delay={i * 0.12}>
              <div className={`flex items-center gap-6 md:gap-10 py-8 ${i < steps.length - 1 ? "border-b border-border/20" : ""}`}>
                <motion.div className="flex-shrink-0 relative" whileHover={{ scale: 1.08 }}>
                  <div className="flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-2xl border border-purple-500/15 bg-purple-500/[0.04] backdrop-blur-sm">
                    <span className="text-4xl md:text-5xl">{s.visual}</span>
                  </div>
                  <span className="absolute -top-2 -left-2 flex h-7 w-7 items-center justify-center rounded-full gradient-brand text-white text-xs font-bold shadow-lg">{s.num}</span>
                </motion.div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl md:text-2xl font-bold mb-1">{s.title}</h3>
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
   CTA
   ════════════════════════════════════════════════════ */
function CTA() {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl p-10 md:p-16 text-center">
            <div className="absolute inset-0 rounded-3xl border border-blue-500/15 bg-white/[0.02]" />
            <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/[0.04] rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-purple-500/[0.04] rounded-full blur-3xl" />

            <div className="relative z-10">
              <motion.div
                animate={{ boxShadow: ["0 0 20px rgba(59,130,246,0.2)", "0 0 50px rgba(59,130,246,0.4)", "0 0 20px rgba(59,130,246,0.2)"] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-brand mb-6"
              >
                <ShieldCheck className="h-8 w-8 text-white" />
              </motion.div>

              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                ¿Listo para la <span className="gradient-text">protección 360°</span>?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto text-sm">
                Únete a la red de seguridad más confiable de Colombia
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/register">
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}
                    className="w-full sm:w-auto px-8 py-3 gradient-brand text-white rounded-xl font-bold shadow-xl shadow-blue-500/20 hover:shadow-blue-500/35 transition-shadow"
                  >
                    Registrarse Gratis <ArrowRight className="inline ml-2 h-4 w-4" />
                  </motion.button>
                </Link>
                <Link href="/login">
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}
                    className="w-full sm:w-auto px-8 py-3 border border-blue-500/15 text-foreground rounded-xl font-medium hover:bg-blue-500/5 transition-all"
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
    <footer className="border-t border-border/20 py-12 bg-white/[0.01]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand"><ShieldCheck className="h-4 w-4 text-white" /></div>
              <span className="text-lg font-bold">Tec360 Seguridad</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              Innovando en seguridad tecnológica para hogares y empresas en toda Colombia.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Plataforma</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/servicios" className="hover:text-foreground transition-colors">Soluciones</a></li>
              <li><a href="/mapa" className="hover:text-foreground transition-colors">Técnicos</a></li>
              <li><a href="/register" className="hover:text-foreground transition-colors">Registrarse</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Contacto</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>📧 oscarvasquezbroker@gmail.com</li>
              <li>🏢 Créame Incubadora</li>
              <li>📍 Colombia</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/20 mt-8 pt-8 text-center">
          <p className="text-xs text-muted-foreground">© 2026 Tec360 Seguridad. Todos los derechos reservados. Ruta del Emprendimiento — Créame Incubadora de Empresas.</p>
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
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <Reveal><SectionLabel label="Servicios" title="Soluciones de Seguridad" highlight="Completas" /></Reveal>
          <Reveal>
            <p className="text-center text-muted-foreground text-sm mb-10 -mt-8 max-w-lg mx-auto">
              Protección integral adaptada a la era digital
            </p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 max-w-5xl mx-auto auto-rows-[170px]">
            {services.map((s, i) => <BentoCard key={i} s={s} i={i} />)}
          </div>
        </div>
      </section>
      <DataFlow />
      <Steps />
      <CTA />
      <Footer />
    </>
  )
}
