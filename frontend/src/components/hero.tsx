"use client"

import { Button } from "@/components/ui/button"
import {
  Shield, ArrowRight, CheckCircle, Zap, Star,
  Car, Bike, Truck, Lock, Unlock, AlertTriangle,
  Radio, MapPin
} from "lucide-react"
import Link from "next/link"
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion"
import { useRef, useEffect, useState, useMemo } from "react"

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
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(139,92,246,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(139,92,246,0.3) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="absolute -top-32 right-[5%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(139,92,246,0.12)_0%,rgba(59,130,246,0.05)_40%,transparent_70%)] blur-[90px]" />
      <div className="absolute top-[35%] -left-[10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(59,130,246,0.08)_0%,rgba(139,92,246,0.03)_40%,transparent_70%)] blur-[100px]" />
    </div>
  )
}

/* ─── Vehicle Profiles & Route Waypoints (Unobstructed Routes) ──── */
interface VehicleProfile {
  id: string
  name: string
  plate: string
  coords: string
  city: string
  originName: string
  destinationName: string
  distanceKm: string
  baseSpeedKm: number
  battery: string
  icon: typeof Car
  category: string
  sats: string
  streetName: string
  waypoints: { x: number; y: number }[]
}

const VEHICLES: VehicleProfile[] = [
  {
    id: "suv",
    name: "TOYOTA HILUX 4X4",
    plate: "TX-360 · MED",
    coords: "6°14'41.2\"N, 75°34'29.8\"W",
    city: "Medellín (Antioquia)",
    originName: "San Diego",
    destinationName: "El Poblado · Milla de Oro",
    distanceKm: "3.2 KM",
    baseSpeedKm: 52,
    battery: "13.8V",
    icon: Car,
    category: "SUV",
    sats: "16 Satélites",
    streetName: "AV. EL POBLADO",
    // Waypoints navigate the open right/bottom area - 100% visible
    waypoints: [
      { x: 60, y: 440 },
      { x: 220, y: 440 },
      { x: 330, y: 350 },
      { x: 410, y: 260 },
      { x: 480, y: 200 },
      { x: 530, y: 110 },
    ],
  },
  {
    id: "moto",
    name: "YAMAHA MT-09 SP",
    plate: "KMT-89F · BOG",
    coords: "4°39'12.5\"N, 74°05'33.1\"W",
    city: "Bogotá (D.C.)",
    originName: "Chapinero",
    destinationName: "Parque 93 · Cra 15",
    distanceKm: "4.8 KM",
    baseSpeedKm: 65,
    battery: "12.6V",
    icon: Bike,
    category: "Moto",
    sats: "14 Satélites",
    streetName: "CLL 100 // CRA 7MA",
    waypoints: [
      { x: 80, y: 450 },
      { x: 180, y: 390 },
      { x: 310, y: 390 },
      { x: 390, y: 280 },
      { x: 450, y: 210 },
      { x: 520, y: 90 },
    ],
  },
  {
    id: "cargo",
    name: "KENWORTH T800",
    plate: "WPT-204 · CLO",
    coords: "3°26'14.0\"N, 76°31'21.0\"W",
    city: "Cali (Valle del Cauca)",
    originName: "Puerto Seco",
    destinationName: "Terminal Yumbo Carga",
    distanceKm: "18.5 KM",
    baseSpeedKm: 42,
    battery: "24.4V",
    icon: Truck,
    category: "Carga",
    sats: "18 Satélites",
    streetName: "CORREDOR INDUSTRIAL",
    waypoints: [
      { x: 70, y: 430 },
      { x: 240, y: 430 },
      { x: 360, y: 340 },
      { x: 430, y: 220 },
      { x: 530, y: 130 },
    ],
  },
]

/* ─── Waypoint Math ────────────────────────────────── */
function getPositionAlongWaypoints(waypoints: { x: number; y: number }[], progress: number) {
  const segments = []
  let totalLen = 0
  for (let i = 0; i < waypoints.length - 1; i++) {
    const dx = waypoints[i + 1].x - waypoints[i].x
    const dy = waypoints[i + 1].y - waypoints[i].y
    const len = Math.hypot(dx, dy)
    segments.push({ from: waypoints[i], to: waypoints[i + 1], len, dx, dy })
    totalLen += len
  }

  const targetDist = Math.max(0, Math.min(progress, 1)) * totalLen
  let currentDist = 0

  for (const seg of segments) {
    if (currentDist + seg.len >= targetDist) {
      const segProgress = (targetDist - currentDist) / seg.len
      const x = seg.from.x + seg.dx * segProgress
      const y = seg.from.y + seg.dy * segProgress
      return { x, y }
    }
    currentDist += seg.len
  }

  const last = waypoints[waypoints.length - 1]
  return { x: last.x, y: last.y }
}

function waypointsToSvgPath(waypoints: { x: number; y: number }[]) {
  return waypoints.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
}

/* ─── Interactive Tactical Map & Floating Card ─────── */
function InteractiveMapTelemetryHUD() {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [speed, setSpeed] = useState(52)
  const [isEngineCut, setIsEngineCut] = useState(false)
  const [isSwitchingCity, setIsSwitchingCity] = useState(false)
  const [geofenceActive, setGeofenceActive] = useState(true)
  const [antiJammerActive, setAntiJammerActive] = useState(true)

  const markerRef = useRef<SVGGElement>(null)
  const progressRef = useRef(0.15)
  const isEngineCutRef = useRef(false)
  isEngineCutRef.current = isEngineCut

  const v = VEHICLES[selectedIdx]

  // Direct 60fps DOM animation loop - ZERO React re-renders for marker movement
  useEffect(() => {
    let rafId: number
    let lastTime = performance.now()

    const animate = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1)
      lastTime = currentTime

      if (!isEngineCutRef.current && !isSwitchingCity) {
        // Continuous smooth movement: ~13s to traverse entire route
        progressRef.current += dt * 0.075
        if (progressRef.current >= 1) {
          progressRef.current = 0.01
        }
      }

      const pos = getPositionAlongWaypoints(v.waypoints, progressRef.current)
      if (markerRef.current) {
        markerRef.current.setAttribute("transform", `translate(${pos.x}, ${pos.y})`)
      }

      rafId = requestAnimationFrame(animate)
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [v.waypoints, isSwitchingCity])

  // Realistic speed readout updater (every 700ms, decoupled from 60fps movement)
  useEffect(() => {
    if (isEngineCut) {
      setSpeed(0)
      return
    }

    const interval = setInterval(() => {
      const base = VEHICLES[selectedIdx].baseSpeedKm
      const jitter = Math.floor((Math.random() - 0.5) * 6)
      setSpeed(base + jitter)
    }, 700)

    return () => clearInterval(interval)
  }, [isEngineCut, selectedIdx])

  // Vehicle change handler with transition
  const handleSelectVehicle = (idx: number) => {
    if (idx === selectedIdx) return
    setIsSwitchingCity(true)
    setSelectedIdx(idx)
    setIsEngineCut(false)
    progressRef.current = 0.05
    setTimeout(() => {
      setIsSwitchingCity(false)
    }, 400)
  }

  const routePathD = useMemo(() => {
    return waypointsToSvgPath(v.waypoints)
  }, [v.waypoints])

  const destinationPoint = v.waypoints[v.waypoints.length - 1]
  const originPoint = v.waypoints[0]

  return (
    <div className="w-full lg:w-1/2 relative flex justify-center items-center py-2">
      {/* Outer Map Canvas Container */}
      <div className="relative w-full max-w-[580px] h-[520px] rounded-3xl overflow-hidden border border-slate-200/90 dark:border-white/10 shadow-2xl bg-slate-100 dark:bg-[#070b14] select-none">
        
        {/* SVG Street Grid & Active Route Map */}
        <svg
          viewBox="0 0 600 500"
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <pattern id="street-grid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path
                d="M 80 0 L 0 0 0 80"
                fill="none"
                className="stroke-slate-200/60 dark:stroke-slate-800/40"
                strokeWidth="1.5"
              />
            </pattern>
          </defs>

          {/* Map Base Fill */}
          <rect width="600" height="500" fill="url(#street-grid)" />

          {/* City Building Blocks (Organized so open area is clean & visible) */}
          <g className="fill-slate-200/50 dark:fill-slate-900/50 stroke-slate-300/40 dark:stroke-slate-800/30">
            {/* Top right blocks */}
            <rect x="340" y="30" width="130" height="60" rx="6" />
            <rect x="490" y="30" width="90" height="50" rx="6" />

            {/* Middle right blocks */}
            <rect x="460" y="240" width="120" height="80" rx="6" />
            <rect x="330" y="160" width="100" height="60" rx="6" />

            {/* Bottom blocks */}
            <rect x="40" y="460" width="160" height="30" rx="4" />
            <rect x="240" y="460" width="120" height="30" rx="4" />
            <rect x="380" y="460" width="180" height="30" rx="4" />
            <rect x="180" y="370" width="100" height="50" rx="6" />
            <rect x="360" y="370" width="120" height="70" rx="6" />
          </g>

          {/* Main Avenue Lines (Grid Arteries) */}
          <g className="stroke-slate-300/80 dark:stroke-slate-700/60" strokeWidth="2.5" fill="none">
            <path d="M 0 110 L 600 110" />
            <path d="M 0 250 L 600 250" />
            <path d="M 0 360 L 600 360" />
            <path d="M 0 440 L 600 440" strokeWidth="4" className="stroke-slate-300 dark:stroke-slate-700" />
            <path d="M 220 0 L 220 500" />
            <path d="M 360 0 L 360 500" />
            <path d="M 500 0 L 500 500" strokeWidth="3" />
            <path d="M 20 460 L 560 60" strokeWidth="2" strokeDasharray="6 4" className="stroke-slate-300 dark:stroke-slate-700/80" />
          </g>

          {/* Street Name Text Labels in Map */}
          <g className="fill-slate-400/80 dark:fill-slate-500/70 font-mono text-[9px] tracking-wider uppercase font-semibold">
            <text x="370" y="345">CORREDOR VIAL</text>
            <text x="430" y="195">{v.streetName}</text>
            <text x="60" y="430">{v.originName}</text>
          </g>

          {/* Route Base Glow Line */}
          <path
            d={routePathD}
            fill="none"
            className={isEngineCut ? "stroke-red-400/40" : "stroke-orange-400/40 dark:stroke-orange-500/30"}
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active Route Dashed Line (matching reference orange route) */}
          <path
            d={routePathD}
            fill="none"
            className={isEngineCut ? "stroke-red-500" : "stroke-orange-500"}
            strokeWidth="3.5"
            strokeDasharray="6 6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Origin Marker */}
          <g transform={`translate(${originPoint.x}, ${originPoint.y})`}>
            <circle r="12" className="fill-orange-500/20" />
            <circle r="6" className="fill-orange-500" />
          </g>

          {/* Destination Pulsing Pin */}
          <g transform={`translate(${destinationPoint.x}, ${destinationPoint.y})`}>
            <circle r="22" className="fill-orange-500/15 animate-ping" />
            <circle r="14" className="fill-orange-500/25" />
            <circle r="7" className="fill-orange-500" />
            {/* Destination Badge */}
            <g transform="translate(18, -14)">
              <rect
                x="0"
                y="0"
                width="84"
                height="22"
                rx="6"
                className="fill-white/95 dark:fill-slate-900/95 stroke-slate-200 dark:stroke-white/10 shadow-md"
                strokeWidth="1"
              />
              <text
                x="42"
                y="14"
                textAnchor="middle"
                className="fill-slate-800 dark:fill-slate-200 font-mono text-[9px] font-bold tracking-wider"
              >
                DESTINATION
              </text>
            </g>
          </g>

          {/* Moving Vehicle Node - Animated directly via ref (Smooth 60fps, No Teleporting) */}
          <g ref={markerRef} transform={`translate(${originPoint.x}, ${originPoint.y})`}>
            {/* Outer Expanding Pulse Wave */}
            <circle
              r={isEngineCut ? "18" : "15"}
              className={`opacity-75 ${
                isEngineCut ? "fill-red-500 animate-ping" : "fill-orange-500 animate-pulse"
              }`}
            />
            {/* Main Vehicle Circle */}
            <circle
              r="11"
              className={`shadow-lg ${
                isEngineCut
                  ? "fill-red-600 stroke-2 stroke-white"
                  : "fill-orange-500 stroke-2 stroke-white dark:stroke-slate-950"
              }`}
            />
            {/* Inner Core Dot */}
            <circle r="4" fill="white" />
          </g>
        </svg>

        {/* Satellite Sync Scanline Overlay (when switching vehicle city) */}
        <AnimatePresence>
          {isSwitchingCity && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 z-30 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center text-white pointer-events-none"
            >
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-950/90 border border-violet-500/50 shadow-2xl">
                <Radio className="w-4 h-4 text-cyan-400 animate-spin" />
                <span className="text-xs font-mono font-bold tracking-wider text-cyan-300">
                  SINCRONIZANDO TELEMETRÍA // {v.city.toUpperCase()}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compact Floating Telemetry Glass Card (Streamlined so it NEVER covers the route) */}
        <div className="absolute top-4 left-4 z-20 pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-[280px] sm:w-[290px] bg-white/95 dark:bg-slate-950/92 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 rounded-2xl p-3.5 shadow-xl shadow-slate-900/10 dark:shadow-black/60 text-slate-900 dark:text-white transition-all"
          >
            {/* Top Status Header */}
            <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-slate-200/80 dark:border-white/10 text-[10px] font-mono">
              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-white/5 truncate">
                TELEMETRÍA 4G // V2.7
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border shrink-0 ${
                  isEngineCut
                    ? "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/40 animate-pulse"
                    : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/40"
                }`}
              >
                {isEngineCut ? "BLOQUEO ACTIVO" : "SISTEMA ACTIVO"}
              </span>
            </div>

            {/* Vehicle Category Tabs (Compact) */}
            <div className="flex gap-1 my-2 p-0.5 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-white/5">
              {VEHICLES.map((item, idx) => {
                const isSelected = selectedIdx === idx
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectVehicle(idx)}
                    className={`flex-1 py-1 px-1.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer truncate text-center ${
                      isSelected
                        ? "bg-violet-600 text-white shadow-sm font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {item.category}
                  </button>
                )
              })}
            </div>

            {/* Vehicle Details (Streamlined) */}
            <div className="mb-2">
              <div className="flex items-baseline justify-between">
                <h4 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
                  {v.name}
                </h4>
                <span className="text-[11px] font-mono font-bold text-violet-600 dark:text-violet-400 shrink-0 ml-1">
                  {v.plate}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate">
                {v.city}
              </p>
              <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {v.coords}
              </p>
            </div>

            {/* Status Badges Row (Battery & Ignition) */}
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-[10px] font-mono font-semibold text-slate-700 dark:text-slate-300">
                <Zap className="w-2.5 h-2.5 text-emerald-500" />
                <span>{v.battery}</span>
              </div>

              <div
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                  isEngineCut
                    ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30"
                    : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
                }`}
              >
                {isEngineCut ? (
                  <>
                    <AlertTriangle className="w-2.5 h-2.5 text-red-500" />
                    <span>CORTE ACTIVO</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-2.5 h-2.5 text-emerald-500" />
                    <span>IGNICIÓN OK</span>
                  </>
                )}
              </div>
            </div>

            {/* Toggles Row: Cerco Activo & Blindado */}
            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/80 dark:border-white/10 text-[11px]">
              <button
                onClick={() => setGeofenceActive((p) => !p)}
                className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
              >
                <CheckCircle
                  className={`w-3.5 h-3.5 ${geofenceActive ? "text-emerald-500" : "text-slate-400"}`}
                />
                <span>CERCO ON</span>
              </button>

              <button
                onClick={() => setAntiJammerActive((p) => !p)}
                className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
              >
                <span>Blindado</span>
                <span
                  className={`w-6 h-3.5 rounded-full flex items-center transition-colors p-0.5 ${
                    antiJammerActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${
                      antiJammerActive ? "translate-x-2.5" : "translate-x-0"
                    }`}
                  />
                </span>
              </button>
            </div>
          </motion.div>
        </div>

        {/* Bottom Interactive Command Bar (Matching Image 2 "DISTANCE / SPEED / APAGAR MOTOR") */}
        <div className="absolute bottom-3 left-4 right-4 z-20 pointer-events-auto">
          <div className="w-full bg-white/95 dark:bg-slate-950/92 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 rounded-2xl p-2.5 sm:p-3 shadow-2xl flex items-center justify-between gap-2 text-slate-900 dark:text-white">
            <div className="flex items-center gap-4 sm:gap-6 font-mono">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Distancia</p>
                <p className="text-xs sm:text-sm font-extrabold">{v.distanceKm}</p>
              </div>
              <div className="border-l border-slate-200 dark:border-white/10 pl-4 sm:pl-6">
                <p className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Velocidad</p>
                <p className={`text-xs sm:text-sm font-extrabold tabular-nums ${isEngineCut ? "text-red-500 animate-pulse" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {speed} KM/H
                </p>
              </div>
            </div>

            {/* Action Button: Apagar Motor / Reanudar */}
            <button
              onClick={() => setIsEngineCut((p) => !p)}
              className={`px-3.5 sm:px-4 py-2 rounded-xl font-mono text-[11px] sm:text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
                isEngineCut
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30"
                  : "bg-red-600 hover:bg-red-700 text-white shadow-red-600/30"
              }`}
            >
              {isEngineCut ? (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  REANUDAR MARCHA
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  APAGAR MOTOR
                </>
              )}
            </button>
          </div>
        </div>
      </div>
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
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-black/60 border border-slate-300 dark:border-violet-500/30 backdrop-blur-xl shadow-md w-fit mx-auto lg:mx-0">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-xs font-mono font-semibold tracking-wider text-slate-800 dark:text-violet-200 uppercase">
                  Telemetría Satelital 4G // V2.7
                </span>
                <span className="text-slate-400 dark:text-violet-500/40">|</span>
                <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
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
                  className="w-full sm:w-auto border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white px-7 py-6 rounded-xl font-bold text-base backdrop-blur-md cursor-pointer"
                >
                  Explorar Servicios &amp; Cobertura
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Right: Interactive Map Route & Telemetry HUD */}
          <InteractiveMapTelemetryHUD />
        </div>

        {/* Telemetry Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 md:mt-16"
        >
          <div className="landing-glass-premium rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6 bg-white/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/10 shadow-lg">
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
