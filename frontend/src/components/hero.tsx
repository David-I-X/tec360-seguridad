"use client"

import { Button } from "@/components/ui/button"
import { Shield, ArrowRight, Award } from "lucide-react"
import Link from "next/link"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef, useEffect, useState } from "react"

/* ─── Animated Counter ─────────────────────────────── */
function useCounter(target: number, duration = 2000) {
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

/* ─── Particle Grid ────────────────────────────────── */
function ParticleGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {Array.from({ length: 15 }).map((_, row) =>
          Array.from({ length: 15 }).map((_, col) => (
            <motion.circle
              key={`${row}-${col}`}
              cx={`${(col + 0.5) * 6.67}%`}
              cy={`${(row + 0.5) * 6.67}%`}
              r="1.2"
              fill="rgba(59,130,246,0.5)"
              initial={{ opacity: 0.15 }}
              animate={{ opacity: [0.15, 0.5, 0.15] }}
              transition={{ duration: 3 + Math.random() * 2, delay: Math.random() * 3, repeat: Infinity, ease: "easeInOut" }}
            />
          ))
        )}
      </svg>
    </div>
  )
}

/* ─── Animated Shield ──────────────────────────────── */
function AnimatedShield() {
  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96">
      {/* Outer rotating ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: "conic-gradient(from 0deg, rgba(59,130,246,0.4), rgba(139,92,246,0.3), rgba(59,130,246,0.08), rgba(59,130,246,0.4))" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />

      {/* Middle ring with orbiting dots */}
      <motion.div
        className="absolute inset-5 rounded-full border border-blue-500/20"
        animate={{ rotate: -360 }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      >
        {[0, 72, 144, 216, 288].map((deg) => (
          <div key={deg}
            className="absolute w-2.5 h-2.5 rounded-full bg-blue-400 shadow-lg shadow-blue-400/60"
            style={{ top: "50%", left: "50%", transform: `rotate(${deg}deg) translateX(calc(50% + 50px)) translateY(-50%)` }}
          />
        ))}
      </motion.div>

      {/* Inner glow */}
      <motion.div
        className="absolute inset-10 rounded-full border border-indigo-500/30"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)" }}
        animate={{
          boxShadow: [
            "0 0 30px rgba(59,130,246,0.15), inset 0 0 30px rgba(59,130,246,0.08)",
            "0 0 60px rgba(59,130,246,0.3), inset 0 0 60px rgba(59,130,246,0.15)",
            "0 0 30px rgba(59,130,246,0.15), inset 0 0 30px rgba(59,130,246,0.08)",
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Scanner sweep */}
      <motion.div
        className="absolute inset-12 rounded-full overflow-hidden"
        style={{ clipPath: "polygon(50% 50%, 50% 0%, 100% 0%)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      >
        <div className="w-full h-full" style={{ background: "conic-gradient(from 0deg, transparent 0%, rgba(59,130,246,0.25) 30%, transparent 40%)" }} />
      </motion.div>

      {/* Center icon */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="relative">
          <Shield className="w-20 h-20 md:w-28 md:h-28 text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]" strokeWidth={1.2} />
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-3 h-3 rounded-full bg-green-400 shadow-lg shadow-green-400/60" />
          </motion.div>
        </div>
      </motion.div>

      {/* Status labels */}
      {[
        { label: "Estado del Sistema", value: "Seguro", y: 15, side: "left" },
        { label: "Escaneo", value: "Activo", y: 45, side: "right" },
        { label: "Red Neuronal", value: "Online", y: 75, side: "left" },
      ].map((item, i) => (
        <motion.div
          key={item.label}
          className="absolute hidden md:flex flex-col gap-0.5 text-right"
          style={{
            top: `${item.y}%`,
            ...(item.side === "left" ? { left: "-60%" } : { right: "-60%" }),
          }}
          initial={{ opacity: 0, x: item.side === "left" ? -20 : 20 }}
          animate={{ opacity: [0.5, 0.9, 0.5], x: 0 }}
          transition={{ duration: 3, delay: i * 0.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{item.label}</span>
          <span className="text-xs font-mono text-green-400 font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {item.value}
          </span>
        </motion.div>
      ))}
    </div>
  )
}

/* ─── Variants ─────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
}

/* ─── Stats ────────────────────────────────────────── */
const stats = [
  { value: 500, suffix: "+", label: "Servicios Completados" },
  { value: 200, suffix: "+", label: "Técnicos Verificados" },
  { value: 48, suffix: "", label: "Calificación Promedio", display: "4.8" },
  { value: 32, suffix: "", label: "Ciudades Cubiertas" },
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
      initial="hidden" animate="visible" custom={index + 5} variants={fadeUp}
      className="group relative flex flex-col items-center gap-1.5 p-5 rounded-2xl border border-blue-500/10 bg-white/[0.03] backdrop-blur-md hover:border-blue-500/30 hover:bg-white/[0.06] transition-all duration-300"
    >
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: "radial-gradient(circle at center, rgba(59,130,246,0.08) 0%, transparent 70%)" }}
      />
      <p className="text-3xl md:text-4xl font-bold gradient-text font-mono tabular-nums">
        {stat.display || counter.count}{stat.suffix}
      </p>
      <p className="text-[11px] text-muted-foreground font-medium tracking-wide uppercase">{stat.label}</p>
    </motion.div>
  )
}

/* ─── Main Export ──────────────────────────────────── */
export function Hero() {
  const sectionRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], [0, 150])
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  return (
    <section ref={sectionRef} className="relative min-h-[100vh] flex items-center justify-center overflow-hidden pt-16">
      <ParticleGrid />
      <div className="absolute inset-0 mesh-gradient" />

      {/* Scan lines overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(59,130,246,1) 2px, rgba(59,130,246,1) 4px)" }}
      />

      {/* Floating blurs */}
      <div className="absolute top-20 left-[5%] w-80 h-80 bg-blue-500/8 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-10 right-[5%] w-96 h-96 bg-purple-500/6 rounded-full blur-3xl animate-float delay-700" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/[0.03] rounded-full blur-3xl animate-spin-slow" />

      <motion.div style={{ y, opacity }} className="container relative z-10 mx-auto px-4 py-12 md:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left */}
            <div className="text-center lg:text-left order-2 lg:order-1">
              <motion.div
                initial="hidden" animate="visible" custom={0} variants={fadeUp}
                className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-400"
              >
                <Award className="h-4 w-4" />
                Certificados SENA
                <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              </motion.div>

              <motion.h1
                initial="hidden" animate="visible" custom={1} variants={fadeUp}
                className="mb-4 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-6xl xl:text-7xl"
              >
                Protección{" "}
                <span className="gradient-text">360°</span>
                <br />
                <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-muted-foreground">
                  en Tiempo Real
                </span>
              </motion.h1>

              <motion.p
                initial="hidden" animate="visible" custom={2} variants={fadeUp}
                className="mb-8 text-base text-muted-foreground max-w-md mx-auto lg:mx-0 leading-relaxed"
              >
                Plataforma premium de seguridad técnica certificada. Monitoreo 24/7 para hogares y empresas.
              </motion.p>

              <motion.div
                initial="hidden" animate="visible" custom={3} variants={fadeUp}
                className="flex flex-col sm:flex-row items-center lg:items-start gap-3"
              >
                <Link href="/login">
                  <Button size="lg" className="w-full sm:w-auto gradient-brand text-white hover:opacity-90 font-semibold px-8 h-12 text-base shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all">
                    Comenzar Ahora <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/servicios">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base bg-transparent border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/5">
                    Ver Servicios
                  </Button>
                </Link>
              </motion.div>
            </div>

            {/* Right — Shield */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
              className="flex justify-center lg:justify-end order-1 lg:order-2"
            >
              <AnimatedShield />
            </motion.div>
          </div>

          {/* Stats */}
          <div className="mt-16 md:mt-20 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 max-w-3xl mx-auto">
            {stats.map((stat, i) => (
              <StatCard key={i} stat={stat} index={i} />
            ))}
          </div>
        </div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  )
}
