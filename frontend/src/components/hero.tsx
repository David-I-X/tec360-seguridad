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
  const counter = useCounter(stat.value, 2200)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })

  useEffect(() => {
    if (inView) counter.start()
  }, [inView])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay: index * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-1"
    >
      <p className="text-3xl md:text-4xl font-extrabold gradient-text font-mono tabular-nums leading-none">
        {counter.count}{stat.suffix}
      </p>
      <p className="text-[11px] text-muted-foreground uppercase tracking-widest">{stat.label}</p>
    </motion.div>
  )
}

/* ─── App Mockup ────────────────────────────────────── */
function AppMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.4, duration: 1, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-xs mx-auto"
    >
      {/* Animated glow blob behind phone */}
      <motion.div
        className="absolute inset-0 -m-6 rounded-3xl blur-3xl"
        animate={{
          background: [
            "radial-gradient(ellipse at 40% 50%, rgba(99,102,241,0.18) 0%, transparent 70%)",
            "radial-gradient(ellipse at 60% 50%, rgba(59,130,246,0.22) 0%, transparent 70%)",
            "radial-gradient(ellipse at 40% 50%, rgba(99,102,241,0.18) 0%, transparent 70%)",
          ]
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Phone frame — very gentle float */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="relative bg-white/[0.04] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
      >
        {/* Status bar */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
          <span className="text-[10px] text-muted-foreground font-mono">9:41</span>
          <div className="flex gap-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-1 rounded-full bg-foreground/80" style={{ height: `${6 + i * 2}px` }} />
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
          {/* Grid */}
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)", backgroundSize: "28px 28px" }}
          />
          {/* Roads */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-400/20" />
          <div className="absolute top-0 bottom-0 left-1/3 w-px bg-blue-400/15" />
          <div className="absolute top-0 bottom-0 left-2/3 w-px bg-blue-400/15" />

          {/* Technician marker with pulse rings */}
          <motion.div
            className="absolute top-1/4 left-1/4"
            animate={{ x: [0, 8, 16, 8, 0], y: [0, -3, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Pulse ring 1 */}
            <motion.div className="absolute inset-0 -m-3 rounded-full border border-blue-400/40"
              animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            />
            {/* Pulse ring 2 */}
            <motion.div className="absolute inset-0 -m-3 rounded-full border border-blue-400/30"
              animate={{ scale: [1, 2.2], opacity: [0.4, 0] }}
              transition={{ duration: 1.8, delay: 0.4, repeat: Infinity, ease: "easeOut" }}
            />
            <div className="w-8 h-8 rounded-full gradient-brand shadow-lg shadow-blue-500/50 flex items-center justify-center border-2 border-white/30">
              <Shield className="w-4 h-4 text-white" />
            </div>
          </motion.div>

          {/* Client marker */}
          <div className="absolute bottom-4 right-6">
            <motion.div
              animate={{ scale: [1, 1.18, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <MapPin className="w-5 h-5 text-red-400" />
            </motion.div>
          </div>

          {/* Route — animated dash that travels */}
          <svg className="absolute inset-0 w-full h-full" overflow="visible">
            <motion.line
              x1="36%" y1="33%" x2="78%" y2="80%"
              stroke="rgba(99,102,241,0.6)" strokeWidth="1.5" strokeDasharray="5 4"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", times: [0, 0.6, 1] }}
            />
          </svg>
        </div>

        {/* Technician card */}
        <motion.div
          className="mx-3 mt-3 p-3 rounded-2xl bg-white/[0.04] border border-white/8"
          animate={{ borderColor: ["rgba(255,255,255,0.05)", "rgba(99,102,241,0.2)", "rgba(255,255,255,0.05)"] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
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
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="text-[9px] font-mono text-amber-400 font-bold"
              >
                ⚡ EN CAMINO
              </motion.div>
              <p className="text-[9px] text-muted-foreground">≈ 8 min</p>
            </div>
          </div>
        </motion.div>

        {/* Bottom action */}
        <div className="mx-3 mt-3 mb-4">
          <motion.div
            className="w-full py-2.5 gradient-brand rounded-xl text-center text-xs font-bold text-white shadow-lg shadow-blue-500/30"
            animate={{ boxShadow: ["0 10px 30px rgba(99,102,241,0.25)", "0 10px 40px rgba(99,102,241,0.45)", "0 10px 30px rgba(99,102,241,0.25)"] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            Seguir en tiempo real →
          </motion.div>
        </div>
      </motion.div>

      {/* Floating notification — persistent gentle float */}
      <motion.div
        initial={{ opacity: 0, x: 30, y: -10 }}
        animate={{ opacity: 1, x: 0, y: [0, -5, 0] }}
        transition={{
          opacity: { delay: 1.2, duration: 0.6 },
          x: { delay: 1.2, duration: 0.6 },
          y: { delay: 1.8, duration: 4, repeat: Infinity, ease: "easeInOut" }
        }}
        className="absolute -right-4 top-16 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-3 py-2 shadow-xl"
      >
        <div className="flex items-center gap-2">
          <motion.div
            className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center"
            animate={{ scale: [1, 1.15, 1], backgroundColor: ["rgba(34,197,94,0.15)", "rgba(34,197,94,0.3)", "rgba(34,197,94,0.15)"] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
          </motion.div>
          <div>
            <p className="text-[10px] font-bold">Técnico asignado</p>
            <p className="text-[9px] text-muted-foreground">Llega en 8 min</p>
          </div>
        </div>
      </motion.div>

      {/* Floating price badge — persistent float opposite phase */}
      <motion.div
        initial={{ opacity: 0, x: -30, y: 10 }}
        animate={{ opacity: 1, x: 0, y: [0, 5, 0] }}
        transition={{
          opacity: { delay: 1.5, duration: 0.6 },
          x: { delay: 1.5, duration: 0.6 },
          y: { delay: 2.1, duration: 4, repeat: Infinity, ease: "easeInOut" }
        }}
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
        </div>

      </motion.div>

      {/* ── Stats row — outside parallax so scroll-opacity doesn't kill it ── */}
      <div className="relative z-10 container mx-auto px-4 pb-14">
        <div className="border-t border-border/20 pt-10 grid grid-cols-2 sm:grid-cols-4 gap-10 max-w-2xl mx-auto">
          {stats.map((stat, i) => (
            <StatCard key={i} stat={stat} index={i} />
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  )
}
