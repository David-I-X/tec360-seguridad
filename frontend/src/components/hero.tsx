"use client"

import { Button } from "@/components/ui/button"
import {
  Shield, ArrowRight, CheckCircle, Zap, Star,
  Car, Bike, Truck, Lock, Unlock, AlertTriangle, Crosshair,
  Activity, Signal
} from "lucide-react"
import Link from "next/link"
import { motion, useScroll, useTransform, useInView } from "framer-motion"
import { useRef, useEffect, useState, useCallback } from "react"

/* ─── High-Precision RAF Counter ──────────────────── */
function useCounter(target: number, duration = 1800) {
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (!started) return
    let startTimestamp: number | null = null
    let rafId: number

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      const current = progress * target
      setCount(target % 1 === 0 ? Math.floor(current) : Number(current.toFixed(1)))

      if (progress < 1) {
        rafId = requestAnimationFrame(step)
      } else {
        setCount(target)
      }
    }

    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [started, target, duration])

  return { count, start: () => setStarted(true) }
}

/* ─── Background Cyber/Glass Effects ───────────────── */
function HeroBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Precision Grid */}
      <div
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(139,92,246,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(139,92,246,0.3) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* Ambient glowing radial orbs */}
      <div className="absolute -top-32 right-[5%] w-[650px] h-[650px] bg-[radial-gradient(circle,rgba(139,92,246,0.12)_0%,rgba(59,130,246,0.06)_40%,transparent_70%)] blur-[90px]" />
      <div className="absolute top-[35%] -left-[10%] w-[550px] h-[550px] bg-[radial-gradient(circle,rgba(59,130,246,0.1)_0%,rgba(139,92,246,0.04)_40%,transparent_70%)] blur-[100px]" />
    </div>
  )
}

/* ─── Vehicle Profiles Data ────────────────────────── */
interface VehicleTelemetry {
  id: string
  name: string
  plate: string
  coords: string
  city: string
  battery: string
  speed: string
  icon: typeof Car
  category: string
  odometer: string
  signal: string
  sats: string
}

const VEHICLES: VehicleTelemetry[] = [
  {
    id: "suv",
    name: "Toyota Hilux 4x4",
    plate: "TX-360 · MED",
    coords: "6°14'41.2\"N 75°34'29.8\"W",
    city: "Medellín, Antioquia",
    battery: "13.8V",
    speed: "0 km/h",
    icon: Car,
    category: "SUV / Camioneta",
    odometer: "42,180 km",
    signal: "-64 dBm · 4G LTE",
    sats: "16 Satélites",
  },
  {
    id: "moto",
    name: "Yamaha MT-09 SP",
    plate: "KMT-89F · BOG",
    coords: "4°39'12.5\"N 74°05'33.1\"W",
    city: "Bogotá, D.C.",
    battery: "12.6V",
    speed: "0 km/h",
    icon: Bike,
    category: "Motocicleta",
    odometer: "14,350 km",
    signal: "-68 dBm · 4G LTE",
    sats: "14 Satélites",
  },
  {
    id: "cargo",
    name: "Kenworth T800",
    plate: "WPT-204 · CLO",
    coords: "3°26'14.0\"N 76°31'21.0\"W",
    city: "Cali, Valle del Cauca",
    battery: "24.4V",
    speed: "0 km/h",
    icon: Truck,
    category: "Carga Pesada",
    odometer: "189,420 km",
    signal: "-58 dBm · 4G LTE",
    sats: "18 Satélites",
  },
]

/* ─── Tactical Telemetry HUD Console ───────────────── */
function TacticalTelemetryHUD() {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [isEngineCut, setIsEngineCut] = useState(false)
  const [geofenceActive, setGeofenceActive] = useState(true)

  const v = VEHICLES[selectedIdx]

  const toggleEngine = useCallback(() => {
    setIsEngineCut((prev) => !prev)
  }, [])

  return (
    <div className="w-full lg:w-1/2 relative flex justify-center items-center py-4">
      {/* Outer Tactical Glass Console */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[540px] glass-hud glass-specular rounded-3xl p-5 md:p-6 text-slate-100 relative overflow-hidden"
      >
        {/* Top Console Header */}
        <div className="flex items-center justify-between pb-4 border-b border-violet-500/20 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isEngineCut ? "bg-red-400" : "bg-emerald-400"}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isEngineCut ? "bg-red-500" : "bg-emerald-500"}`} />
            </span>
            <span className="font-semibold text-slate-200 tracking-wider">
              {isEngineCut ? "ESTADO: BLOQUEO ACTIVO" : "SISTEMA ACTIVO // TELEMETRÍA 4G"}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="hidden sm:inline">SYS://TEC360-CMD</span>
            <span className="text-violet-400 bg-violet-950/60 px-2 py-0.5 rounded border border-violet-500/30">
              {v.sats}
            </span>
          </div>
        </div>

        {/* Vehicle Category Selector Tabs */}
        <div className="flex gap-2 my-4 p-1 bg-slate-900/60 rounded-xl border border-white/5">
          {VEHICLES.map((item, idx) => {
            const Icon = item.icon
            const isSelected = selectedIdx === idx
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedIdx(idx)
                  setIsEngineCut(false)
                }}
                className={`flex-1 py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "bg-violet-600 text-white shadow-md shadow-violet-600/30 font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="truncate">{item.category}</span>
              </button>
            )
          })}
        </div>

        {/* Central Display: Radar & Live Telemetry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center my-4">
          {/* Tactical Radar Display (5 cols) */}
          <div className="sm:col-span-5 flex justify-center">
            <div className="relative w-36 h-36 md:w-40 md:h-40 rounded-full border border-violet-500/30 bg-slate-950/80 flex items-center justify-center overflow-hidden shadow-inner">
              {/* Concentric rings */}
              <div className="absolute inset-3 rounded-full border border-violet-500/20" />
              <div className="absolute inset-8 rounded-full border border-violet-500/20" />
              <div className="absolute inset-14 rounded-full border border-violet-500/15" />

              {/* Crosshair lines */}
              <div className="absolute inset-x-0 top-1/2 h-px bg-violet-500/25" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-violet-500/25" />

              {/* Radar sweep beam */}
              <div
                className="absolute inset-0 animate-radar-sweep pointer-events-none"
                style={{
                  background: "conic-gradient(from 0deg, rgba(139,92,246,0.4) 0deg, rgba(139,92,246,0) 60deg, transparent 360deg)",
                }}
              />

              {/* Center Vehicle Target Node */}
              <motion.div
                animate={{ scale: isEngineCut ? [1, 1.15, 1] : [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center border shadow-lg ${
                  isEngineCut
                    ? "bg-red-950/80 border-red-500 text-red-400 shadow-red-500/40"
                    : "bg-violet-950/80 border-violet-400 text-violet-300 shadow-violet-500/30"
                }`}
              >
                <v.icon className="w-4 h-4" />
              </motion.div>

              {/* Simulated Sat blips */}
              <div className="absolute top-5 right-7 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <div className="absolute bottom-6 left-8 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />

              {/* Geofence Perimeter Indicator */}
              <div className="absolute bottom-1 right-2 text-[9px] font-mono text-violet-400/80 tracking-tighter">
                R: 500M
              </div>
            </div>
          </div>

          {/* Vehicle Telemetry Data Card (7 cols) */}
          <div className="sm:col-span-7 flex flex-col gap-2.5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-violet-400 font-mono font-semibold">{v.plate}</span>
                <span className="text-[10px] text-slate-400 font-mono">{v.city}</span>
              </div>
              <h4 className="text-base font-bold text-white tracking-tight">{v.name}</h4>
              <p className="text-[11px] font-mono text-slate-300 tracking-tight mt-0.5">{v.coords}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-2.5">
                <p className="text-[10px] text-slate-400 uppercase font-mono">Batería</p>
                <p className="text-xs font-bold text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  {v.battery}
                </p>
              </div>
              <div className="bg-slate-900/60 border border-white/5 rounded-xl p-2.5">
                <p className="text-[10px] text-slate-400 uppercase font-mono">Anti-Jammer</p>
                <p className="text-xs font-bold text-cyan-400 font-mono mt-0.5 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-cyan-400" />
                  Blindado
                </p>
              </div>
            </div>

            {/* Status Alert Banner */}
            <div
              className={`py-1.5 px-2.5 rounded-lg text-[11px] font-mono flex items-center gap-1.5 border transition-all ${
                isEngineCut
                  ? "bg-red-950/60 border-red-500/40 text-red-300"
                  : "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
              }`}
            >
              {isEngineCut ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 animate-pulse" />
                  <span className="truncate">CORTE MOTOR ENVIADO · INMOVILIZADO</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">IGNICIÓN AUTORIZADA · CERCO ACTIVO</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Interactive Tactical Controls Footer */}
        <div className="pt-3 border-t border-violet-500/20 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Simulated Engine Cut-off Button */}
          <button
            onClick={toggleEngine}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold font-mono flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isEngineCut
                ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10"
            }`}
          >
            {isEngineCut ? (
              <>
                <Unlock className="w-3.5 h-3.5" />
                Restaurar Encendido
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-violet-400" />
                Simular Corte de Motor
              </>
            )}
          </button>

          {/* Geofence quick badge */}
          <button
            onClick={() => setGeofenceActive((p) => !p)}
            className={`px-3 py-2 rounded-xl text-xs font-mono flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
              geofenceActive
                ? "bg-violet-950/50 border-violet-500/30 text-violet-300"
                : "bg-slate-900/40 border-white/5 text-slate-400"
            }`}
          >
            <Crosshair className="w-3 h-3" />
            <span>Geocerca {geofenceActive ? "Activa (500m)" : "Pausada"}</span>
          </button>
        </div>
      </motion.div>

      {/* Floating Micro-Badge: Central 24/7 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: [0, -5, 0] }}
        transition={{ opacity: { delay: 0.6, duration: 0.5 }, y: { delay: 1, duration: 4.5, repeat: Infinity, ease: "easeInOut" } }}
        className="hidden sm:flex absolute -top-2 right-2 md:right-4 landing-glass px-3 py-2 rounded-xl items-center gap-2.5 z-20 shadow-xl border border-violet-500/20"
      >
        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div>
          <p className="text-[9px] text-slate-400 uppercase font-mono tracking-wider">Central 24/7</p>
          <p className="text-xs font-bold text-slate-100 font-mono">Despacho &lt;12 min</p>
        </div>
      </motion.div>

      {/* Floating Micro-Badge: Protocolo Táctico */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: [0, 5, 0] }}
        transition={{ opacity: { delay: 0.8, duration: 0.5 }, y: { delay: 1.3, duration: 5, repeat: Infinity, ease: "easeInOut" } }}
        className="hidden sm:flex absolute -bottom-2 left-2 md:left-4 landing-glass px-3 py-2 rounded-xl items-center gap-2.5 z-20 shadow-xl border border-cyan-500/20"
      >
        <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
          <Signal className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div>
          <p className="text-[9px] text-slate-400 uppercase font-mono tracking-wider">Red Satelital</p>
          <p className="text-xs font-bold text-slate-100 font-mono">Cobertura 99.8%</p>
        </div>
      </motion.div>
    </div>
  )
}

/* ─── Stats Bar ────────────────────────────────────── */
const stats = [
  { value: 99.9, suffix: "%", label: "Precisión Rastreo Satelital", isStar: false },
  { value: 12, prefix: "<", suffix: " min", label: "Tiempo Respuesta Despacho", isStar: false },
  { value: 500, suffix: "+", label: "Vehículos Protegidos", isStar: false },
  { value: 4.9, suffix: "", label: "Calificación Promedio", isStar: true },
]

function StatCard({ stat, index }: { stat: (typeof stats)[0]; index: number }) {
  const counter = useCounter(stat.value, 2000)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })

  useEffect(() => {
    if (inView) counter.start()
  }, [inView, counter])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: index * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center text-center px-3"
    >
      <p className="text-3xl sm:text-4xl font-extrabold text-violet-600 dark:text-violet-400 font-mono tabular-nums leading-none mb-1.5 tracking-tight">
        {stat.prefix}
        {counter.count}
        {stat.suffix}
      </p>
      <div className="flex items-center gap-1 mt-0.5">
        {stat.isStar && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">{stat.label}</p>
      </div>
    </motion.div>
  )
}

/* ─── Animation Variants ───────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
}

/* ─── Main Hero Export ─────────────────────────────── */
export function Hero() {
  const sectionRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], [0, 80])
  const opacity = useTransform(scrollYProgress, [0.85, 1], [1, 0])

  return (
    <section ref={sectionRef} className="relative min-h-[92vh] flex flex-col items-center justify-center overflow-hidden pt-24 pb-12">
      <HeroBg />

      <motion.div style={{ y, opacity }} className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10 pt-4 md:pt-8">
          {/* Left: Value Proposition */}
          <div className="flex flex-col gap-5 w-full lg:w-1/2 z-10 text-center lg:text-left">
            {/* Status Badge: Tech-first, subtle certification */}
            <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 dark:bg-black/60 border border-violet-500/30 backdrop-blur-xl shadow-lg shadow-violet-500/10 w-fit mx-auto lg:mx-0">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs font-mono font-semibold tracking-wider text-violet-300 dark:text-violet-200 uppercase">
                  Telemetría Satelital 4G // V2.7
                </span>
                <span className="text-violet-500/40">|</span>
                <span className="text-xs text-slate-300 font-medium">
                  Técnicos Verificados
                </span>
              </div>
            </motion.div>

            {/* H1 Headline */}
            <motion.h1
              initial="hidden"
              animate="visible"
              custom={1}
              variants={fadeUp}
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.08] tracking-tight text-slate-900 dark:text-white"
            >
              Blindaje Tecnológico &amp; Telemetría{" "}
              <span className="text-violet-600 dark:text-violet-400">
                360°
              </span>{" "}
              en Tiempo Real
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial="hidden"
              animate="visible"
              custom={2}
              variants={fadeUp}
              className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl mx-auto lg:mx-0"
            >
              Protección vehicular avanzada en Colombia. Hardware telemático de alta precisión con GPS 4G anti-jammer, dashcams HD y corte de corriente remoto, respaldado por un centro de respuesta táctica 24/7 y técnicos certificados.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial="hidden"
              animate="visible"
              custom={3}
              variants={fadeUp}
              className="flex flex-col sm:flex-row gap-3.5 mt-2 items-center lg:items-start"
            >
              <Link href="/servicios/nuevo?tipo=instalacion" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white px-7 py-6 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-xl shadow-violet-600/30 hover:shadow-violet-600/50 cursor-pointer"
                >
                  Activar Protección 360°
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/servicios" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-slate-300 dark:border-white/15 bg-white/40 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-white px-7 py-6 rounded-xl font-bold text-base backdrop-blur-md cursor-pointer"
                >
                  Explorar Servicios &amp; Cobertura
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Right: Tactical Telemetry HUD Console */}
          <TacticalTelemetryHUD />
        </div>

        {/* Telemetry Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 md:mt-16"
        >
          <div className="landing-glass-premium rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <StatCard key={i} stat={stat} index={i} />
            ))}
          </div>
        </motion.div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  )
}
