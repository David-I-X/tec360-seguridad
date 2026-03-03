"use client"

import { Button } from "@/components/ui/button"
import { Shield, ArrowRight, Star, MapPin, Zap, CheckCircle } from "lucide-react"
import Link from "next/link"
import { motion, useScroll, useTransform, useInView } from "framer-motion"
import { useRef, useEffect, useState } from "react"

/* ─── Animated Counter ─────────────────────────────── */
function useCounter(target: number, duration = 1800) {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  useEffect(() => {
    if (!started) return
    let start = 0
    const inc = target / (duration / 16)
    const t = setInterval(() => {
      start += inc
      if (start >= target) { setCount(target); clearInterval(t) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(t)
  }, [started, target, duration])
  return { count, start: () => setStarted(true) }
}

/* ─── Animated Background ──────────────────────────── */
function AnimatedBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: "linear-gradient(rgba(59,130,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,1) 1px, transparent 1px)", backgroundSize: "72px 72px" }}
      />
      {/* Gradient blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      <div className="absolute top-1/3 -right-20 w-80 h-80 bg-indigo-600/8 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-blue-400/6 rounded-full blur-3xl" />
      {/* Scan line very subtle */}
      <div className="absolute inset-0 opacity-[0.018]"
        style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(59,130,246,1) 3px, rgba(59,130,246,1) 4px)" }}
      />
    </div>
  )
}

/* ─── Trust badge row ───────────────────────────────── */
const trustItems = ["✅ Técnicos certificados SENA", "📍 Servicio a domicilio", "⚡ Mismo día disponible", "⭐ Garantía de servicio"]

/* ─── Stats ────────────────────────────────────────── */
const stats = [
  { value: 500, suffix: "+", label: "Servicios" },
  { value: 200, suffix: "+", label: "Técnicos" },
  { value: 98, suffix: "%", label: "Satisfacción" },
  { value: 12, suffix: "", label: "Ciudades" },
]

function StatCard({ stat, index }: { stat: typeof stats[0]; index: number }) {
  const counter = useCounter(stat.value)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) counter.start() }, { threshold: 0.5 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
      className="flex flex-col items-center"
    >
      <p className="text-2xl md:text-3xl font-extrabold gradient-text font-mono tabular-nums">
        {counter.count}{stat.suffix}
      </p>
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">{stat.label}</p>
    </motion.div>
  )
}

/* ─── App Mockup ────────────────────────────────────── */
function AppMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-xs mx-auto"
    >
      {/* Phone glow */}
      <div className="absolute inset-0 -m-4 bg-blue-500/10 rounded-3xl blur-2xl" />

      {/* Phone frame */}
      <div className="relative bg-white/[0.04] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
        {/* Status bar */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
          <span className="text-[10px] text-muted-foreground font-mono">9:41</span>
          <div className="flex gap-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`w-1 rounded-full bg-foreground/80`} style={{ height: `${6 + i * 2}px` }} />
            ))}
            <div className="w-4 h-3 border border-foreground/60 rounded-sm ml-1 relative">
              <div className="absolute inset-0.5 right-1 bg-foreground/70 rounded-sm" />
            </div>
          </div>
        </div>

        {/* App header */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold">Tec360</p>
              <p className="text-[9px] text-muted-foreground">Seguridad Técnica</p>
            </div>
          </div>
        </div>

        {/* Map area */}
        <div className="mx-3 rounded-2xl bg-blue-950/40 border border-blue-500/15 h-36 relative overflow-hidden">
          {/* Fake map grid */}
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)", backgroundSize: "28px 28px" }}
          />
          {/* Fake map roads */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-400/20" />
          <div className="absolute top-0 bottom-0 left-1/3 w-px bg-blue-400/15" />
          <div className="absolute top-0 bottom-0 left-2/3 w-px bg-blue-400/15" />
          {/* Technician marker */}
          <motion.div
            className="absolute top-1/4 left-1/4"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="w-8 h-8 rounded-full gradient-brand shadow-lg shadow-blue-500/40 flex items-center justify-center border-2 border-white/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-500/60" />
          </motion.div>
          {/* Client marker */}
          <div className="absolute bottom-4 right-6 flex flex-col items-center gap-0.5">
            <MapPin className="w-5 h-5 text-red-400" />
          </div>
          {/* Route line */}
          <svg className="absolute inset-0 w-full h-full">
            <motion.line
              x1="36%" y1="33%" x2="78%" y2="80%"
              stroke="rgba(59,130,246,0.5)" strokeWidth="1.5" strokeDasharray="5 3"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </svg>
        </div>

        {/* Technician card */}
        <div className="mx-3 mt-3 p-3 rounded-2xl bg-white/[0.04] border border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center text-sm font-bold text-white">JR</div>
            <div className="flex-1">
              <p className="text-xs font-semibold">Juan Rodriguez</p>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />)}
                <span className="text-[9px] text-muted-foreground ml-1">4.9 · 342 servicios</span>
              </div>
            </div>
            <div className="text-right">
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-[9px] font-mono text-amber-400 font-bold"
              >
                ⚡ EN CAMINO
              </motion.div>
              <p className="text-[9px] text-muted-foreground">≈ 8 min</p>
            </div>
          </div>
        </div>

        {/* Bottom action */}
        <div className="mx-3 mt-3 mb-4">
          <div className="w-full py-2.5 gradient-brand rounded-xl text-center text-xs font-bold text-white shadow-lg shadow-blue-500/30">
            Seguir en tiempo real →
          </div>
        </div>
      </div>

      {/* Floating notification */}
      <motion.div
        initial={{ opacity: 0, x: 30, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute -right-4 top-16 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-3 py-2 shadow-xl"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold">Técnico asignado</p>
            <p className="text-[9px] text-muted-foreground">Llega en 8 min</p>
          </div>
        </div>
      </motion.div>

      {/* Floating price badge */}
      <motion.div
        initial={{ opacity: 0, x: -30, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        className="absolute -left-6 bottom-20 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-3 py-2 shadow-xl"
      >
        <p className="text-[9px] text-muted-foreground">Servicio Express</p>
        <p className="text-sm font-bold gradient-text">⚡ Hoy mismo</p>
      </motion.div>
    </motion.div>
  )
}

/* ─── Fade-up variants ──────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
}

/* ─── Main Export ──────────────────────────────────── */
export function Hero() {
  const sectionRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], [0, 120])
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  return (
    <section ref={sectionRef} className="relative min-h-[100vh] flex items-center justify-center overflow-hidden pt-16">
      <AnimatedBg />

      <motion.div style={{ y, opacity }} className="container relative z-10 mx-auto px-4 py-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* ── Left ── */}
            <div className="text-center lg:text-left order-2 lg:order-1">

              {/* Badge */}
              <motion.div
                initial="hidden" animate="visible" custom={0} variants={fadeUp}
                className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400"
              >
                <Zap className="h-3 w-3" />
                Servicio Express — mismo día
                <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              </motion.div>

              {/* H1 — cleaner and more focused */}
              <motion.h1
                initial="hidden" animate="visible" custom={1} variants={fadeUp}
                className="mb-5 text-4xl font-extrabold leading-[1.1] tracking-tight md:text-5xl lg:text-6xl"
              >
                Tu seguridad vehicular,{" "}
                <span className="gradient-text">a un toque</span>
              </motion.h1>

              {/* Subheadline — clear value prop */}
              <motion.p
                initial="hidden" animate="visible" custom={2} variants={fadeUp}
                className="mb-8 text-base md:text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0 leading-relaxed"
              >
                Conecta con técnicos certificados para instalar cámaras, GPS, alarmas y más.
                Llegan hasta tu puerta — hoy mismo si lo necesitas.
              </motion.p>

              {/* Trust pills */}
              <motion.div
                initial="hidden" animate="visible" custom={3} variants={fadeUp}
                className="flex flex-wrap gap-2 justify-center lg:justify-start mb-8"
              >
                {trustItems.map((item) => (
                  <span key={item} className="text-xs text-muted-foreground bg-white/[0.04] border border-border/40 rounded-full px-3 py-1">
                    {item}
                  </span>
                ))}
              </motion.div>

              {/* CTAs */}
              <motion.div
                initial="hidden" animate="visible" custom={4} variants={fadeUp}
                className="flex flex-col sm:flex-row items-center lg:items-start gap-3"
              >
                <Link href="/login">
                  <Button size="lg" className="w-full sm:w-auto gradient-brand text-white hover:opacity-90 font-semibold px-8 h-12 text-base shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all">
                    Pedir servicio ahora <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/servicios">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base bg-transparent border-border/40 hover:border-blue-500/40 hover:bg-blue-500/5">
                    Ver servicios
                  </Button>
                </Link>
              </motion.div>

              {/* Social proof micro-bar */}
              <motion.div
                initial="hidden" animate="visible" custom={5} variants={fadeUp}
                className="mt-8 flex items-center gap-3 justify-center lg:justify-start"
              >
                <div className="flex -space-x-2">
                  {["JR", "MP", "CA", "LG"].map((initials) => (
                    <div key={initials} className="w-7 h-7 rounded-full gradient-brand border-2 border-background flex items-center justify-center text-[9px] font-bold text-white">
                      {initials}
                    </div>
                  ))}
                </div>
                <div className="text-sm">
                  <span className="font-semibold">+200 técnicos</span>
                  <span className="text-muted-foreground"> verificados listos</span>
                </div>
              </motion.div>
            </div>

            {/* ── Right — App Mockup ── */}
            <div className="flex justify-center lg:justify-end order-1 lg:order-2">
              <AppMockup />
            </div>
          </div>

          {/* ── Stats row ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="mt-20 md:mt-24 border-t border-border/20 pt-10 grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-2xl mx-auto"
          >
            {stats.map((stat, i) => (
              <StatCard key={i} stat={stat} index={i} />
            ))}
          </motion.div>
        </div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  )
}
