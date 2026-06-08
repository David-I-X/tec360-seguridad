"use client"

import {
  ShieldCheck, Camera, Wifi, Radio, Lock, Eye, ArrowRight,
  Search, FileText, CheckCircle, Star, Clock, MapPin, BadgeCheck,
  Car, Radar, Fingerprint, AlertTriangle, Siren, Crosshair,
  Gauge, Cctv
} from "lucide-react"
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
function SectionLabel({ label, title, highlight, neonColor = "purple" }: { label: string; title: string; highlight: string; neonColor?: "purple" | "blue" }) {
  return (
    <div className="mb-12 text-center">
      <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-[0.2em] font-mono">{label}</span>
      <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl text-slate-900 dark:text-white">
        {title}{" "}
        <span
          className={neonColor === "blue" ? "text-blue-600 dark:text-blue-500" : "text-violet-600 dark:text-violet-500"}
          style={{ textShadow: neonColor === "blue" ? "0 0 15px rgba(59,130,246,0.2)" : "0 0 15px rgba(139,92,246,0.2)" }}
        >
          {highlight}
        </span>
      </h2>
    </div>
  )
}

/* ════════════════════════════════════════════════════
   TWO PILLARS SECTION
   ════════════════════════════════════════════════════ */

const installationItems = [
  { icon: Radar, label: "GPS Vehicular" },
  { icon: Camera, label: "Dashcam HD" },
  { icon: Siren, label: "Alarmas Vehiculares" },
  { icon: Lock, label: "Bloqueo Remoto" },
]

const recoveryItems = [
  { icon: Crosshair, label: "Rastreo GPS 4G", color: "blue" },
  { icon: MapPin, label: "Ubicación Activa", color: "blue" },
  { icon: AlertTriangle, label: "Respuesta Rápida", color: "red" },
  { icon: Gauge, label: "Corte de Motor", color: "blue" },
]

function PillarsSection() {
  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-4">
        <Reveal>
          <SectionLabel label="Nuestros servicios" title="Dos Pilares." highlight="Protección Total." />
        </Reveal>
        <Reveal>
          <p className="text-center text-slate-600 dark:text-slate-400 text-sm mb-12 -mt-8 max-w-2xl mx-auto">
            Soluciones especializadas diseñadas para cubrir todas tus necesidades de seguridad vehicular.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Pilar 1: Instalaciones Vehiculares */}
          <Reveal delay={0}>
            <motion.div
              className="group relative h-full rounded-2xl p-8 flex flex-col gap-6 overflow-hidden transition-colors duration-500 bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-xl border border-slate-200 dark:border-violet-500/15 shadow-sm dark:shadow-none"
              whileHover={{ borderColor: "rgba(139,92,246,0.4)" }}
            >
              {/* Gradient border overlay */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ boxShadow: "inset 0 0 0 1px rgba(139,92,246,0.3)" }} />

              <div className="flex items-start justify-between">
                <div
                  className="w-14 h-14 rounded-xl bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center transition-all"
                >
                  <Car className="w-7 h-7 text-violet-600 dark:text-violet-500" />
                </div>
                <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Motos · Carros · Carga Pesada
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  Instalaciones Vehiculares
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm mb-6">
                  Conecta con técnicos certificados para la instalación de dispositivos de seguridad en tu vehículo: GPS, dashcam, alarmas y más para motos, carros y carga pesada.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
                {installationItems.map((item) => (
                  <div
                    key={item.label}
                    className="bg-slate-50 dark:bg-[#0a0a0a]/50 border border-slate-200 dark:border-white/5 rounded-xl p-4 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-6">
                <Link href="/servicios/nuevo" className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40">
                  Solicitar Instalación
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </Reveal>

          {/* Pilar 2: Recuperación */}
          <Reveal delay={0.1}>
            <motion.div
              className="group relative h-full rounded-2xl p-8 flex flex-col gap-6 overflow-hidden transition-colors duration-500 bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-xl border border-slate-200 dark:border-blue-500/15 shadow-sm dark:shadow-none"
              whileHover={{ borderColor: "rgba(59,130,246,0.4)" }}
            >
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ boxShadow: "inset 0 0 0 1px rgba(59,130,246,0.3)" }} />

              <div className="flex items-start justify-between">
                <div
                  className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center transition-all"
                >
                  <Car className="w-7 h-7 text-blue-600 dark:text-blue-500" />
                </div>
                <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Flotas &amp; Particulares
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  Recuperación de Vehículos
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm mb-6">
                  Sistema avanzado de rastreo y protocolo de respuesta inmediata para garantizar la localización de tu vehículo en caso de siniestro.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
                {recoveryItems.map((item) => {
                  const isRed = item.color === "red"
                  return (
                    <div
                      key={item.label}
                      className="bg-slate-50 dark:bg-[#0a0a0a]/50 border border-slate-200 dark:border-white/5 rounded-xl p-4 flex items-center gap-3"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isRed ? "bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20" : "bg-blue-100 dark:bg-blue-500/10"}`}>
                        <item.icon className={`w-4 h-4 ${isRed ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`} />
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6">
                <Link href="/servicios/nuevo" className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40">
                  Solicitar Recuperación
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════
   WHY TEC360 — 3 differentiators
   ════════════════════════════════════════════════════ */
const whys = [
  {
    icon: BadgeCheck,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-500/10",
    title: "Técnicos verificados",
    desc: "Cada técnico pasa por validación de identidad, certificación SENA y revisión de antecedentes antes de operar en la plataforma.",
  },
  {
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-500/10",
    title: "Mismo día disponible",
    desc: "Servicios express disponibles hoy mismo. Sin esperas de días — un técnico llega en horas cuando lo necesitas.",
  },
  {
    icon: MapPin,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-500/10",
    title: "Seguimiento en vivo",
    desc: "Sabe exactamente dónde está tu técnico en tiempo real. Rastreo GPS integrado durante todo el recorrido.",
  },
]

function WhySection() {
  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-4">
        <Reveal>
          <SectionLabel label="Por qué elegirnos" title="Expertos en" highlight="Seguridad Integral" />
        </Reveal>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {whys.map((w, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className="group p-7 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all duration-300 shadow-sm dark:shadow-none">
                <div className={`w-12 h-12 rounded-xl ${w.bg} flex items-center justify-center mb-5`}>
                  <w.icon className={`w-6 h-6 ${w.color}`} />
                </div>
                <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">{w.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{w.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════
   STEPS — SIDE BY SIDE (Instalación + Recuperación)
   ════════════════════════════════════════════════════ */
const installSteps = [
  { num: "01", title: "Elige tu servicio", desc: "Selecciona qué necesitas: dashcam, GPS o alarma vehicular. Ingresa tu dirección y la fecha.", visual: "📍" },
  { num: "02", title: "Un técnico acepta", desc: "En minutos un técnico certificado cerca de ti acepta el trabajo. Ves su perfil, calificación y precio.", visual: "🤝" },
  { num: "03", title: "Llega y trabaja", desc: "El técnico llega a tu ubicación, toma fotos de evidencia y tú confirmas el trabajo completado.", visual: "🛡️" },
]

const recoverySteps = [
  { num: "01", title: "Realiza la denuncia", desc: "Haz la denuncia formal ante las autoridades (Fiscalía / Policía). Este paso es obligatorio.", visual: "🚨", highlight: true },
  { num: "02", title: "Notifica a Tec360", desc: "Reporta el siniestro en la plataforma. Adjunta el número de denuncia y los datos del vehículo.", visual: "📲" },
  { num: "03", title: "Rastreo y localización", desc: "Activamos el rastreo GPS en tiempo real y coordinamos con las autoridades para ubicar tu vehículo.", visual: "📡" },
  { num: "04", title: "Recuperación asistida", desc: "Se recupera el vehículo en coordinación con las autoridades. Recibes actualizaciones en tiempo real.", visual: "✅" },
]

function StepItem({ s, i, total, accentColor = "purple" }: { s: { num: string; title: string; desc: string; visual: string; highlight?: boolean }; i: number; total: number; accentColor?: "purple" | "blue" }) {
  const isHighlight = s.highlight
  return (
    <Reveal delay={i * 0.1}>
      <div className={`flex items-start gap-4 py-5 ${i < total - 1 ? "border-b border-slate-200 dark:border-white/5" : ""}`}>
        <motion.div className="flex-shrink-0 relative" whileHover={{ scale: 1.06 }}>
          <div className={`flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-xl border ${
            isHighlight ? "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5" : "border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.03]"
          }`}>
            <span className="text-2xl md:text-3xl">{s.visual}</span>
          </div>
          <span className={`absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full text-white text-[9px] font-bold shadow-lg ${
            isHighlight ? "bg-amber-500" : accentColor === "blue" ? "bg-gradient-to-r from-blue-500 to-indigo-600" : "gradient-brand"
          }`}>{s.num}</span>
        </motion.div>
        <div className="flex-1 min-w-0 pt-1">
          <h4 className={`text-base font-bold mb-1 ${isHighlight ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>{s.title}</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{s.desc}</p>
        </div>
      </div>
    </Reveal>
  )
}

function ParallelSteps() {
  return (
    <section className="py-20 relative">
      <div className="container mx-auto px-4">
        <Reveal>
          <SectionLabel label="¿Cómo funciona?" title="Dos procesos," highlight="una sola plataforma" />
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Columna Izquierda — Instalación */}
          <Reveal delay={0}>
            <div
              className="rounded-2xl p-6 md:p-8 h-full bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-xl border border-slate-200 dark:border-violet-500/15 shadow-sm dark:shadow-none"
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-white/5">
                <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center">
                  <Car className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Instalación</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Tan fácil como pedir un taxi</p>
                </div>
              </div>
              {/* Steps */}
              {installSteps.map((s, i) => (
                <StepItem key={i} s={s} i={i} total={installSteps.length} accentColor="purple" />
              ))}
            </div>
          </Reveal>

          {/* Columna Derecha — Recuperación */}
          <Reveal delay={0.1}>
            <div
              className="rounded-2xl p-6 md:p-8 h-full bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-xl border border-slate-200 dark:border-blue-500/15 shadow-sm dark:shadow-none"
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200 dark:border-white/5">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recuperación</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Protocolo de respuesta inmediata</p>
                </div>
              </div>
              {/* Warning */}
              <div className="mb-4 p-3 rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/5 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300/90 leading-relaxed">
                  <strong className="text-amber-800 dark:text-amber-300">Obligatorio:</strong> Primero debes realizar la denuncia formal ante las autoridades.
                </p>
              </div>
              {/* Steps */}
              {recoverySteps.map((s, i) => (
                <StepItem key={i} s={s} i={i} total={recoverySteps.length} accentColor="blue" />
              ))}
            </div>
          </Reveal>
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
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.03]"
        style={{ background: "radial-gradient(circle at 50% 50%, rgba(59,130,246,1) 0%, transparent 60%)" }}
      />
      <div className="container mx-auto px-4">
        <Reveal><SectionLabel label="Reseñas" title="Lo que dicen" highlight="nuestros clientes" /></Reveal>
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <motion.div
                className="p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/60 dark:bg-white/[0.025] flex flex-col gap-4 shadow-sm dark:shadow-none"
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
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed flex-1">&quot;{t.text}&quot;</p>
                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-xs font-bold text-white`}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
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
          <div
            className="w-full relative rounded-3xl p-10 md:p-16 text-center overflow-hidden border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-black/60 backdrop-blur-xl shadow-lg dark:shadow-none"
          >
            {/* Big glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-violet-500/10 dark:bg-violet-500/30 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center gap-6">
              <div
                className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-white/10 mb-2"
              >
                <Lock className="h-9 w-9 text-slate-800 dark:text-white" />
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight">
                ¿Listo para la protección 360°?
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg max-w-lg mx-auto">
                Únete a la red de seguridad tecnológica y monitoreo vehicular más confiable de Colombia.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full justify-center">
                <Link href="/register">
                  <motion.button
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-500 hover:to-blue-400 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-violet-500/30"
                  >
                    Crear Cuenta Gratis
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
    <footer className="border-t border-slate-200 dark:border-white/5 py-14 bg-slate-50 dark:bg-[#0a0a0a]">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-brand shadow-lg">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                Tec360 <span className="text-violet-600 dark:text-violet-500">Seguridad</span>
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs leading-relaxed mb-5">
              Plataforma líder de servicios de seguridad técnica. Conectamos clientes con técnicos certificados para instalaciones y recuperación vehicular en toda Colombia.
            </p>
            <div className="flex gap-2">
              {["SENA", "Créame", "2026"].map((tag) => (
                <span key={tag} className="text-[10px] font-mono border border-slate-300 dark:border-white/10 px-2 py-1 rounded text-slate-500">{tag}</span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm text-slate-900 dark:text-white">Plataforma</h4>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              {[
                { label: "Servicios", href: "/servicios" },
                { label: "Registrarse", href: "/register" },
                { label: "Iniciar sesión", href: "/login" },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="hover:text-violet-600 dark:hover:text-white transition-colors inline-flex items-center gap-1.5">
                    <ArrowRight className="w-3 h-3 opacity-40" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm text-slate-900 dark:text-white">Contacto</h4>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <span className="text-base">📧</span>
                <a href="mailto:oscarvasquezbroker@gmail.com" className="hover:text-violet-600 dark:hover:text-white transition-colors truncate">
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
        <div className="border-t border-slate-200 dark:border-white/5 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">© 2026 Tec360 Seguridad. Todos los derechos reservados.</p>
          <p className="text-xs text-slate-500">Ruta del Emprendimiento — Créame Incubadora de Empresas</p>
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
      {/* Two Pillars */}
      <PillarsSection />

      {/* Why us */}
      <WhySection />

      {/* Steps — Side by Side */}
      <ParallelSteps />

      {/* Testimonials */}
      <Testimonials />

      {/* CTA */}
      <CTA />

      {/* Footer */}
      <Footer />
    </>
  )
}
