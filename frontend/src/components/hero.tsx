"use client"

import { Button } from "@/components/ui/button"
import {
  ArrowRight, CheckCircle, Zap,
  Car, Bike, Truck, Lock, Unlock, AlertTriangle,
  Radio, ShieldCheck
} from "lucide-react"
import Link from "next/link"
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion"
import { useRef, useEffect, useState, useMemo } from "react"

/* ─── Background Cyber/Glass Effects with Subtle Grid & Light Glints ─ */
function HeroBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Precision Blueprint Grid (Delicate and crisp in both Light & Dark mode) */}
      <div
        className="absolute inset-0 opacity-100"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(99, 102, 241, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(99, 102, 241, 0.08) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      {/* Subtle Dot Matrix Accent at Intersections */}
      <div
        className="absolute inset-0 opacity-45 dark:opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(139, 92, 246, 0.3) 1px, transparent 1px)",
          backgroundSize: "88px 88px",
        }}
      />

      {/* Ambient Glowing Flares (Ethereal light washes) */}
      <div className="absolute -top-32 right-[5%] w-[680px] h-[680px] bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.14)_0%,rgba(59,130,246,0.06)_40%,transparent_70%)] blur-[95px]" />
      <div className="absolute top-[28%] -left-[10%] w-[580px] h-[580px] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12)_0%,rgba(139,92,246,0.05)_40%,transparent_70%)] blur-[100px]" />
      <div className="absolute bottom-6 right-[25%] w-[480px] h-[480px] bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.08)_0%,transparent_60%)] blur-[80px]" />

      {/* Subtle Breathing Light Glints (Destellos de luz sutiles en el fondo) */}
      <div className="absolute top-[16%] left-[22%] w-3 h-3">
        <span className="absolute inset-0 rounded-full bg-violet-400/50 blur-[1px] animate-ping opacity-60" />
        <span className="absolute top-1/2 left-0 right-0 h-px bg-violet-500/70 -translate-y-1/2" />
        <span className="absolute left-1/2 top-0 bottom-0 w-px bg-violet-500/70 -translate-x-1/2" />
      </div>

      <div className="absolute top-[32%] right-[16%] w-3 h-3">
        <span className="absolute inset-0 rounded-full bg-blue-400/50 blur-[1px] animate-ping opacity-50" style={{ animationDelay: "1.2s" }} />
        <span className="absolute top-1/2 left-0 right-0 h-px bg-blue-500/70 -translate-y-1/2" />
        <span className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-500/70 -translate-x-1/2" />
      </div>

      <div className="absolute top-[62%] left-[10%] w-2.5 h-2.5">
        <span className="absolute inset-0 rounded-full bg-violet-400/40 blur-[1px] animate-ping opacity-50" style={{ animationDelay: "0.6s" }} />
        <span className="absolute top-1/2 left-0 right-0 h-px bg-violet-500/60 -translate-y-1/2" />
        <span className="absolute left-1/2 top-0 bottom-0 w-px bg-violet-500/60 -translate-x-1/2" />
      </div>

      <div className="absolute top-[78%] right-[32%] w-2.5 h-2.5">
        <span className="absolute inset-0 rounded-full bg-cyan-400/50 blur-[1px] animate-ping opacity-60" style={{ animationDelay: "1.8s" }} />
        <span className="absolute top-1/2 left-0 right-0 h-px bg-cyan-500/70 -translate-y-1/2" />
        <span className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-500/70 -translate-x-1/2" />
      </div>
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

  useEffect(() => {
    isEngineCutRef.current = isEngineCut
  }, [isEngineCut])

  const v = VEHICLES[selectedIdx]

  // Direct 60fps DOM animation loop - ZERO React re-renders for marker movement
  useEffect(() => {
    let rafId: number
    let lastTime = performance.now()

    const animate = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1)
      lastTime = currentTime

      if (!isEngineCutRef.current && !isSwitchingCity) {
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

  // Realistic speed readout updater (every 700ms)
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

          <rect width="600" height="500" fill="url(#street-grid)" />

          {/* City Building Blocks */}
          <g className="fill-slate-200/50 dark:fill-slate-900/50 stroke-slate-300/40 dark:stroke-slate-800/30">
            <rect x="340" y="30" width="130" height="60" rx="6" />
            <rect x="490" y="30" width="90" height="50" rx="6" />
            <rect x="460" y="240" width="120" height="80" rx="6" />
            <rect x="330" y="160" width="100" height="60" rx="6" />
            <rect x="40" y="460" width="160" height="30" rx="4" />
            <rect x="240" y="460" width="120" height="30" rx="4" />
            <rect x="380" y="460" width="180" height="30" rx="4" />
            <rect x="180" y="370" width="100" height="50" rx="6" />
            <rect x="360" y="370" width="120" height="70" rx="6" />
          </g>

          {/* Main Avenue Lines */}
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

          {/* Street Name Labels */}
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

          {/* Active Route Dashed Line */}
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

          {/* Moving Vehicle Node */}
          <g ref={markerRef} transform={`translate(${originPoint.x}, ${originPoint.y})`}>
            <circle
              r={isEngineCut ? "18" : "15"}
              className={`opacity-75 ${
                isEngineCut ? "fill-red-500 animate-ping" : "fill-orange-500 animate-pulse"
              }`}
            />
            <circle
              r="11"
              className={`shadow-lg ${
                isEngineCut
                  ? "fill-red-600 stroke-2 stroke-white"
                  : "fill-orange-500 stroke-2 stroke-white dark:stroke-slate-950"
              }`}
            />
            <circle r="4" fill="white" />
          </g>
        </svg>

        {/* Satellite Sync Scanline Overlay */}
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

        {/* Compact Floating Telemetry Glass Card */}
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

            {/* Vehicle Category Tabs */}
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

            {/* Vehicle Details */}
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

            {/* Status Badges Row */}
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

            {/* Toggles Row */}
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

        {/* Bottom Interactive Command Bar */}
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

/* ─── NEW: Tactical Capabilities Grid (Replaces generic 4-number stats card) ─── */
const capabilities = [
  {
    icon: Radio,
    metric: "99.9% UPTIME",
    title: "Rastreo Satelital L1/L5",
    description: "Telemetría de ultra-alta frecuencia con algoritmo anti-jammer contra inhibidores de señal.",
    statusBadge: "SEÑAL CONTINUA 4G",
    color: "from-violet-500/10 to-blue-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-100 dark:bg-violet-950/60 border-violet-200 dark:border-violet-500/30",
  },
  {
    icon: Zap,
    metric: "< 12 MINUTOS",
    title: "Despacho Inmediato",
    description: "Red de técnicos certificados y verificados geolocalizada en Medellín, Bogotá, Cali y red nacional.",
    statusBadge: "CUADRANTE ACTIVO",
    color: "from-amber-500/10 to-orange-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-950/60 border-amber-200 dark:border-amber-500/30",
  },
  {
    icon: Lock,
    metric: "CORTE 100% SEGURO",
    title: "Inmovilización Digital",
    description: "Corte de corriente remoto preventivo homologado para autos, motos y transporte pesado.",
    statusBadge: "HOMOLOGACIÓN CAN-BUS",
    color: "from-rose-500/10 to-red-500/10",
    iconColor: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-100 dark:bg-rose-950/60 border-rose-200 dark:border-rose-500/30",
  },
  {
    icon: ShieldCheck,
    metric: "4.9 ★ RATING",
    title: "Garantía & Respaldo 360°",
    description: "Instalación pericial con arnés automotriz de fábrica, auditoría de antecedentes y soporte 24/7.",
    statusBadge: "RESPALDO INTEGRAL",
    color: "from-emerald-500/10 to-teal-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-500/30",
  },
]

function TacticalCapabilitiesGrid() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="mt-14 md:mt-20 w-full"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {capabilities.map((cap, i) => {
          const Icon = cap.icon
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              whileHover={{ y: -3 }}
              className="group relative rounded-2xl p-5 bg-white/85 dark:bg-slate-950/80 hover:bg-white dark:hover:bg-slate-900 border border-slate-200/90 dark:border-white/10 hover:border-violet-400/40 dark:hover:border-violet-500/40 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/50 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${cap.iconBg}`}>
                    <Icon className={`w-4 h-4 ${cap.iconColor}`} />
                  </div>
                  <span className="text-[11px] font-mono font-extrabold text-slate-800 dark:text-slate-200 tracking-tight px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-white/5">
                    {cap.metric}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight mb-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  {cap.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {cap.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {cap.statusBadge}
                </span>
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-violet-600 dark:text-violet-400" />
              </div>
            </motion.div>
          )
        })}
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
    <section ref={sectionRef} className="relative min-h-[92vh] flex flex-col items-center justify-center overflow-hidden pt-24 pb-14">
      <HeroBg />

      <motion.div style={{ y, opacity }} className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10 pt-4 md:pt-8">
          {/* Left: Value Proposition */}
          <div className="flex flex-col gap-5 w-full lg:w-1/2 z-10 text-center lg:text-left">
            
            {/* NEW: Status Streamer Bar (Replaces generic pill) */}
            <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp}>
              <div className="inline-flex items-center gap-2.5 p-1 pr-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-violet-500/30 backdrop-blur-xl shadow-sm w-fit mx-auto lg:mx-0">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-violet-600 text-white font-mono font-bold text-[10px] tracking-wider uppercase shadow-sm">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>RED 4G ACTIVA</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="font-mono text-[11px] font-bold text-slate-900 dark:text-white">
                    CENTRAL 24/7 ENLACE SATELITAL
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Técnicos Verificados
                  </span>
                </div>
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

        {/* NEW: Tactical Capabilities Bento Grid (Replaces generic 4-number stats bar) */}
        <TacticalCapabilitiesGrid />
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  )
}
