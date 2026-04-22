"use client"

import { Button } from "@/components/ui/button"
import { Shield, ArrowRight, CheckCircle, Zap, Star } from "lucide-react"
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
      else setCount(target % 1 === 0 ? Math.floor(start) : Number(start.toFixed(1)))
    }, 16)
    return () => clearInterval(t)
  }, [started, target, duration])
  return { count, start: () => setStarted(true) }
}

/* ─── Background Effects ───────────────────────────── */
function HeroBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.06] dark:opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(139,92,246,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(139,92,246,0.15) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Top-right glow */}
      <div className="absolute -top-24 -right-24 w-[600px] h-[600px] pointer-events-none bg-[radial-gradient(circle,rgba(139,92,246,0.08)_0%,rgba(59,130,246,0.03)_40%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(139,92,246,0.15)_0%,rgba(59,130,246,0.05)_40%,transparent_70%)]" />
      {/* Left glow */}
      <div className="absolute top-[20%] -left-[10%] w-[500px] h-[500px] bg-violet-500/5 dark:bg-violet-500/10 rounded-full blur-[120px]" />
    </div>
  )
}

/* ─── Stats ────────────────────────────────────────── */
const stats = [
  { value: 500, suffix: "+", label: "Servicios Completados", isStar: false },
  { value: 200, suffix: "+", label: "Técnicos Verificados", isStar: false },
  { value: 4.8, suffix: "", label: "Calificación Promedio", isStar: true },
  { value: 32, suffix: "", label: "Ciudades Cubiertas", isStar: false },
]

function StatCard({ stat, index }: { stat: (typeof stats)[0]; index: number }) {
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
      className="flex flex-col items-center justify-center text-center px-4"
    >
      <p className="text-3xl font-extrabold text-violet-600 dark:text-white font-mono tabular-nums leading-none mb-1 dark:drop-shadow-[0_0_10px_rgba(139,92,246,0.4)]">
        {counter.count}
        {stat.suffix}
      </p>
      <div className="flex items-center gap-1 mt-1">
        {stat.isStar && <Star className="w-3.5 h-3.5 text-yellow-500 dark:text-yellow-400 fill-yellow-500 dark:fill-yellow-400" />}
        <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
      </div>
    </motion.div>
  )
}

/* ─── Holographic Shield ───────────────────────────── */
function HolographicShield() {
  return (
    <div className="w-full lg:w-1/2 relative flex justify-center items-center h-[420px] md:h-[500px]">
      <div className="relative w-[320px] h-[320px] md:w-[400px] md:h-[400px] flex items-center justify-center">
        {/* Outer spinning ring */}
        <motion.div
          className="absolute inset-0 rounded-full border border-violet-300/30 dark:border-violet-500/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
        {/* Middle reverse ring */}
        <motion.div
          className="absolute inset-4 rounded-full border border-blue-300/30 dark:border-blue-500/20"
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
        {/* Inner glow ring */}
        <div className="absolute inset-8 rounded-full border border-slate-200 dark:border-white/5 bg-gradient-to-tr from-violet-100/50 to-blue-100/50 dark:from-violet-500/5 dark:to-blue-500/5 backdrop-blur-sm" />

        {/* Core Shield Icon — rotated diamond */}
        <motion.div
          animate={{ y: [-4, 4, -4] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 w-28 h-28 md:w-32 md:h-32 bg-violet-100 dark:bg-violet-500/10 rounded-2xl border border-violet-300 dark:border-violet-500/30 flex items-center justify-center rotate-45 backdrop-blur-md shadow-lg dark:shadow-[0_0_50px_rgba(139,92,246,0.5)]"
        >
          <Shield className="w-12 h-12 md:w-14 md:h-14 text-violet-600 dark:text-white -rotate-45 drop-shadow-md dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]" />
        </motion.div>

        {/* Connecting lines SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30 dark:opacity-50" viewBox="0 0 400 400">
          <defs>
            <linearGradient id="ng1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#f5f5f5" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="ng2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#f5f5f5" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M200 200 L100 100" stroke="url(#ng1)" strokeDasharray="4 4" strokeWidth="1.5" />
          <path d="M200 200 L300 80" stroke="url(#ng2)" strokeDasharray="4 4" strokeWidth="1.5" />
          <path d="M200 200 L320 280" stroke="url(#ng1)" strokeDasharray="4 4" strokeWidth="1.5" />
          <path d="M200 200 L80 280" stroke="url(#ng2)" strokeDasharray="4 4" strokeWidth="1.5" />
        </svg>

        {/* Pinging nodes */}
        <motion.div
          className="absolute w-3 h-3 bg-violet-500 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.6)] dark:shadow-[0_0_10px_rgba(139,92,246,1)]"
          style={{ top: "25%", left: "25%" }}
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)] dark:shadow-[0_0_10px_rgba(59,130,246,1)]"
          style={{ bottom: "30%", right: "20%" }}
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, delay: 1, repeat: Infinity }}
        />
      </div>

      {/* Floating Badge — Estado del Sistema */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: [0, -6, 0] }}
        transition={{ opacity: { delay: 0.8, duration: 0.6 }, y: { delay: 1.2, duration: 4, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute top-6 md:top-10 right-0 landing-glass px-4 py-3 rounded-xl flex items-center gap-3 z-20"
      >
        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center border border-emerald-300 dark:border-emerald-500/30">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Estado del Sistema</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">Seguro</p>
        </div>
      </motion.div>

      {/* Floating Badge — Escaneo Activo */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: [0, 6, 0] }}
        transition={{ opacity: { delay: 1, duration: 0.6 }, y: { delay: 1.5, duration: 5, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute bottom-6 md:bottom-10 left-0 landing-glass px-4 py-3 rounded-xl flex items-center gap-3 z-20"
      >
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center border border-blue-300 dark:border-blue-500/30">
          <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Monitoreo</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white">Escaneo Activo</p>
        </div>
      </motion.div>
    </div>
  )
}

/* ─── Fade-up animation variants ───────────────────── */
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
  const opacity = useTransform(scrollYProgress, [0.8, 1], [1, 0])

  return (
    <section ref={sectionRef} className="relative min-h-[100vh] flex flex-col items-center justify-center overflow-hidden pt-24">
      <HeroBg />

      <motion.div style={{ y, opacity }} className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 pb-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 pt-10">
          {/* Left: Content */}
          <div className="flex flex-col gap-6 w-full lg:w-1/2 z-10 text-center lg:text-left">
            {/* SENA Badge */}
            <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 w-fit mx-auto lg:mx-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">
                  Certificados SENA
                </span>
              </div>
            </motion.div>

            {/* H1 */}
            <motion.h1
              initial="hidden" animate="visible" custom={1} variants={fadeUp}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] text-slate-900 dark:text-white"
            >
              Protección{" "}
              <span className="text-violet-600 dark:text-violet-500 dark:drop-shadow-[0_0_15px_rgba(139,92,246,0.6)]">
                360°
              </span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-700 to-slate-400 dark:from-white dark:to-slate-400">
                en Tiempo Real
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial="hidden" animate="visible" custom={2} variants={fadeUp}
              className="text-base md:text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl mx-auto lg:mx-0"
            >
              Plataforma integral que conecta expertos en{" "}
              <strong className="text-slate-800 dark:text-slate-200 font-medium">instalación de dispositivos de seguridad</strong>{" "}
              vehicular, con servicios especializados de{" "}
              <strong className="text-slate-800 dark:text-slate-200 font-medium">recuperación de vehículos</strong> mediante monitoreo
              GPS 24/7.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial="hidden" animate="visible" custom={3} variants={fadeUp}
              className="flex flex-col sm:flex-row gap-4 mt-4 items-center lg:items-start"
            >
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 dark:hover:bg-violet-500 text-white px-8 py-6 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 dark:shadow-violet-500/40"
                >
                  Comenzar Ahora
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/servicios" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-slate-300 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-white px-8 py-6 rounded-xl font-bold text-lg"
                >
                  Ver Servicios
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Right: Holographic Shield */}
          <HolographicShield />
        </div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-16 md:mt-20"
        >
          <div className="landing-glass-premium rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <StatCard key={i} stat={stat} index={i} />
            ))}
          </div>
        </motion.div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  )
}
