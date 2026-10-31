"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowRight,
  ArrowUpRight,
  Lock,
  Unlock,
  Radio,
  Camera,
  ShieldCheck,
  Cpu,
  Car,
  Bike,
  Truck,
} from "lucide-react"
import { Tec360Isotipo } from "@/components/brand/tec360-mark"

interface AnatomyHotspot {
  id: string
  code: string
  shortLabel: string
  title: string
  spec: string
  detail: string
  x: number
  y: number
  icon: typeof Radio
}

const HOTSPOTS: AnatomyHotspot[] = [
  {
    id: "ecu",
    code: "MOD-01",
    shortLabel: "Corte Motor",
    title: "Bloqueo Digital CAN-Bus",
    spec: "0 KM/H · 1.1S",
    detail:
      "Inmovilización remota progresiva y segura desde tu celular o nuestra central 24/7 sin intervenir ni pelar el cableado original.",
    x: 29.5,
    y: 48.5,
    icon: Cpu,
  },
  {
    id: "dashcam",
    code: "MOD-02",
    shortLabel: "Dashcam HD",
    title: "Cámara Dual 1080p en Nube",
    spec: "1080P DUAL · 4G",
    detail:
      "Transmisión en tiempo real de cabina y ruta con respaldo automático ante frenado brusco, desvío de geocerca o intento de sabotaje.",
    x: 46.5,
    y: 30.5,
    icon: Camera,
  },
  {
    id: "oem",
    code: "MOD-03",
    shortLabel: "Arnés OEM",
    title: "Instalación Oculta Certificada",
    spec: "OEM · 100% OCULTO",
    detail:
      "Montaje encubierto con conectores automotrices OEM a domicilio por técnicos certificados con validación de antecedentes e idoneidad.",
    x: 54.5,
    y: 47.5,
    icon: ShieldCheck,
  },
  {
    id: "gps",
    code: "MOD-04",
    shortLabel: "GPS L1/L5",
    title: "Telemetría 4G Anti-Jammer",
    spec: "18 SAT · L1/L5",
    detail:
      "Posicionamiento satelital de doble frecuencia cada 10 segundos con algoritmo detector de inhibidores de señal y alerta autónoma.",
    x: 69.0,
    y: 25.5,
    icon: Radio,
  },
]

interface VehiclePreset {
  id: string
  label: string
  city: string
  coords: string
  voltage: string
  baseSpeed: number
  icon: typeof Car
}

const VEHICLE_PRESETS: VehiclePreset[] = [
  {
    id: "suv",
    label: "Automóvil / SUV",
    city: "Medellín · El Poblado",
    coords: "6.2088° N, 75.5659° W",
    voltage: "13.8V",
    baseSpeed: 54,
    icon: Car,
  },
  {
    id: "moto",
    label: "Motocicleta",
    city: "Bogotá · Chapinero",
    coords: "4.6533° N, 74.0548° W",
    voltage: "12.6V",
    baseSpeed: 62,
    icon: Bike,
  },
  {
    id: "carga",
    label: "Carga Pesada",
    city: "Cali · Corredor Yumbo",
    coords: "3.5831° N, 76.4952° W",
    voltage: "24.4V",
    baseSpeed: 46,
    icon: Truck,
  },
]

export function Hero() {
  const stageRef = useRef<HTMLElement | null>(null)
  const [activePinId, setActivePinId] = useState<string>("ecu")
  const [presetIdx, setPresetIdx] = useState<number>(0)
  const [isEngineCut, setIsEngineCut] = useState<boolean>(false)
  const [speed, setSpeed] = useState<number>(54)

  const activePin = HOTSPOTS.find((h) => h.id === activePinId) ?? HOTSPOTS[0]
  const activePreset = VEHICLE_PRESETS[presetIdx]

  // Cursor-reactive silk spotlight (Nexaflow interaction signature)
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    let frame = 0
    const handlePointerMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = stage.getBoundingClientRect()
        const rawX = ((event.clientX - rect.left) / rect.width) * 100
        const rawY = ((event.clientY - rect.top) / rect.height) * 100
        const x = Math.max(0, Math.min(100, rawX))
        const y = Math.max(0, Math.min(100, rawY))
        stage.style.setProperty("--mouse-x", `${x.toFixed(1)}%`)
        stage.style.setProperty("--mouse-y", `${y.toFixed(1)}%`)
      })
    }

    const resetPointer = () => {
      stage.style.setProperty("--mouse-x", "62%")
      stage.style.setProperty("--mouse-y", "46%")
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    window.addEventListener("blur", resetPointer)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("blur", resetPointer)
    }
  }, [])

  // Live speed telemetry & progressive deceleration on remote engine shutoff
  useEffect(() => {
    if (isEngineCut) {
      const decel = setInterval(() => {
        setSpeed((prev) => {
          if (prev <= 0) {
            clearInterval(decel)
            return 0
          }
          return Math.max(0, Math.floor(prev * 0.48) - 3)
        })
      }, 130)
      return () => clearInterval(decel)
    }

    setSpeed(activePreset.baseSpeed)
    const cruise = setInterval(() => {
      const delta = Math.floor((Math.random() - 0.5) * 4)
      setSpeed(activePreset.baseSpeed + delta)
    }, 950)

    return () => clearInterval(cruise)
  }, [isEngineCut, activePreset.baseSpeed])

  const handleToggleEngineCut = () => {
    setIsEngineCut((prev) => {
      const next = !prev
      if (next) setActivePinId("ecu")
      return next
    })
  }

  return (
    <section
      id="anatomia"
      ref={stageRef}
      className="t360-silk-stage relative min-h-[100svh] flex flex-col justify-center overflow-hidden pt-24 pb-16 md:pb-24 border-b border-white/[0.06]"
    >
      {/* Silk Auroras & Cursor Spotlight */}
      <div className="t360-aurora-one" aria-hidden="true" />
      <div className="t360-aurora-two" aria-hidden="true" />
      <div className="t360-pointer-light" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Editorial Column (5 cols on desktop) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-[2.45rem] sm:text-5xl xl:text-[3.55rem] font-semibold leading-[1.04] tracking-[-0.034em] text-[#F8FAFC] text-balance"
            >
              Control total sobre tu vehículo.{" "}
              <span className="text-[#A39EB8] font-normal">
                Detén el motor a{" "}
              </span>
              <span className="tabular-telemetry font-semibold text-[#00F0FF] whitespace-nowrap">
                [0 KM/H]
              </span>{" "}
              <span className="text-[#A39EB8] font-normal">en un toque.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="text-base sm:text-[1.0625rem] text-[#B4B0C8] leading-[1.62] max-w-[54ch]"
            >
              Instalaciones de GPS 4G L1/L5 anti-jammer y dashcams HD, equipo de
              reacción 24/7 y mecánica básica a domicilio con técnicos
              certificados en toda Colombia.
            </motion.p>

            {/* Primary Conversion Actions */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1"
            >
              <Link
                href="/servicios/nuevo?tipo=instalacion"
                className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] text-[#F8FAFC] font-semibold text-[0.95rem] border border-violet-400/35 transition-colors"
              >
                <span>Agendar Instalación</span>
                <ArrowRight className="w-4 h-4 text-[#00F0FF]" />
              </Link>

              <a
                href="https://wa.me/573052156601?text=Hola%20Tec360%2C%20necesito%20informaci%C3%B3n%20sobre%20blindaje%20y%20telemetr%C3%ADa%20vehicular"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#0B0F19]/90 hover:bg-[#111827] text-[#F8FAFC] font-medium text-[0.95rem] border border-white/12 hover:border-[#00F0FF]/45 transition-colors"
              >
                <span>Central WhatsApp 24/7</span>
                <ArrowUpRight className="w-4 h-4 text-[#00F0FF]" />
              </a>
            </motion.div>

            {/* Vehicle Architecture Selector */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="pt-3 border-t border-white/[0.08] flex flex-col gap-2.5"
            >
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Perfil vehicular">
                {VEHICLE_PRESETS.map((preset, idx) => {
                  const Icon = preset.icon
                  const selected = idx === presetIdx
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setPresetIdx(idx)
                        setIsEngineCut(false)
                      }}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
                        selected
                          ? "bg-violet-500/20 border-violet-400/50 text-[#F8FAFC]"
                          : "bg-[#0B0F19]/70 border-white/[0.08] text-[#B4B0C8] hover:text-[#F8FAFC] hover:border-white/20"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${selected ? "text-[#00F0FF]" : "text-[#B4B0C8]"}`} />
                      <span>{preset.label}</span>
                    </button>
                  )
                })}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#B4B0C8]">
                <span>{activePreset.city}</span>
                <span className="text-white/20" aria-hidden="true">/</span>
                <span className="tabular-telemetry text-[#00F0FF]">{activePreset.coords}</span>
                <span className="text-white/20" aria-hidden="true">/</span>
                <span className="tabular-telemetry text-[#10B981]">{activePreset.voltage}</span>
              </div>
            </motion.div>
          </div>

          {/* Right 3D Immersive Vehicle Stage (7 cols on desktop) */}
          <div className="lg:col-span-7 relative flex flex-col">
            <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-[#050810] border border-violet-500/20 select-none">
              {/* Architectural Monumental Vector Typography Behind Studio SUV (Hyperice / Gocycle homage) */}
              <svg
                viewBox="0 0 900 320"
                className="absolute inset-x-0 top-1 w-full h-[54%] pointer-events-none z-0"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="t360-backdrop-word" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={isEngineCut ? "#FF2A55" : "#F8FAFC"}
                      stopOpacity={isEngineCut ? "0.24" : "0.14"}
                    />
                    <stop offset="85%" stopColor="#050810" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <text
                  x="450"
                  y="195"
                  textAnchor="middle"
                  fill="url(#t360-backdrop-word)"
                  style={{
                    fontFamily: "var(--font-display), sans-serif",
                    fontWeight: 800,
                    fontSize: "198px",
                    letterSpacing: "0.04em",
                  }}
                >
                  {isEngineCut ? "LOCKED" : "360°"}
                </text>
              </svg>

              {/* Chassis Ambient Glow (Shifts Violet/Cyan -> Crimson Alert when Engine Cut is active) */}
              <div
                className="absolute inset-x-[12%] bottom-[8%] h-[32%] rounded-full blur-3xl transition-colors duration-500 pointer-events-none z-0"
                style={{
                  background: isEngineCut
                    ? "radial-gradient(ellipse at center, rgba(255,42,85,0.34) 0%, transparent 72%)"
                    : "radial-gradient(ellipse at center, rgba(124,58,237,0.28) 0%, rgba(0,240,255,0.14) 48%, transparent 74%)",
                }}
                aria-hidden="true"
              />

              {/* Dark Studio Luxury SUV Plate */}
              <img
                src="/images/landing/hero-suv-studio.jpg"
                alt="Vehículo en estudio oscuro con puntos interactivos de blindaje satelital Tec360"
                width={1408}
                height={768}
                fetchPriority="high"
                className="relative z-10 w-full h-full object-cover object-center mix-blend-lighten opacity-95 transition-transform duration-700"
                style={{
                  maskImage:
                    "radial-gradient(ellipse 92% 88% at 52% 52%, #000 68%, transparent 100%)",
                  WebkitMaskImage:
                    "radial-gradient(ellipse 92% 88% at 52% 52%, #000 68%, transparent 100%)",
                }}
              />

              {/* Top Telemetry Status Strip Inside Stage */}
              <div className="absolute top-3 left-3 right-3 sm:top-3.5 sm:left-4 sm:right-4 z-20 flex items-center justify-between gap-2 pointer-events-none">
                <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#050810]/85 backdrop-blur-md border border-white/10 whitespace-nowrap">
                  <Tec360Isotipo className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" alertMode={isEngineCut} />
                  <span className="tabular-telemetry text-[10px] sm:text-[11px] font-semibold tracking-wider text-[#F8FAFC]">
                    SIMULACIÓN EN VIVO
                  </span>
                </div>

                <div
                  className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full backdrop-blur-md border tabular-telemetry text-[10px] sm:text-[11px] font-semibold whitespace-nowrap ${
                    isEngineCut
                      ? "bg-[#FF2A55]/18 border-[#FF2A55]/50 text-[#FF2A55]"
                      : "bg-[#10B981]/14 border-[#10B981]/40 text-[#10B981]"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${
                      isEngineCut ? "bg-[#FF2A55] animate-ping" : "bg-[#10B981]"
                    }`}
                  />
                  <span>
                    {isEngineCut ? "INMOVILIZADO" : "RED 4G ACTIVA"}
                  </span>
                </div>
              </div>

              {/* SVG Precision Callout Line from Selected Hotspot to Bottom Readout */}
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none z-20"
                aria-hidden="true"
              >
                <path
                  d={`M ${activePin.x} ${activePin.y} L ${activePin.x} 86 L 50 96`}
                  fill="none"
                  stroke={isEngineCut && activePin.id === "ecu" ? "#FF2A55" : "#00F0FF"}
                  strokeWidth="0.28"
                  strokeOpacity="0.65"
                />
              </svg>

              {/* 4 Interactive Anatomy Hotspot Pins (Gocycle / 3D Inmersivo Signature) */}
              {HOTSPOTS.map((pin) => {
                const isSelected = pin.id === activePin.id
                const isLockedEcu = isEngineCut && pin.id === "ecu"
                return (
                  <button
                    key={pin.id}
                    type="button"
                    onClick={() => setActivePinId(pin.id)}
                    style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                    aria-pressed={isSelected}
                    aria-label={`${pin.title}: ${pin.spec}`}
                    className="group absolute -translate-x-1/2 -translate-y-1/2 z-30 flex items-center gap-2 cursor-pointer focus:outline-none"
                  >
                    <span className="relative flex items-center justify-center w-8 h-8">
                      <span
                        className={`absolute inset-0 rounded-full transition-all duration-300 ${
                          isLockedEcu
                            ? "bg-[#FF2A55]/35 scale-125 animate-ping"
                            : isSelected
                              ? "bg-[#00F0FF]/30 scale-125"
                              : "bg-violet-500/20 group-hover:bg-[#00F0FF]/25 scale-100"
                        }`}
                      />
                      <span
                        className={`relative flex items-center justify-center w-6 h-6 rounded-full border transition-all ${
                          isLockedEcu
                            ? "bg-[#FF2A55] border-[#F8FAFC] text-[#F8FAFC]"
                            : isSelected
                              ? "bg-[#00F0FF] border-[#F8FAFC] text-[#050810]"
                              : "bg-[#0B0F19]/90 border-[#00F0FF]/65 text-[#00F0FF] group-hover:border-[#F8FAFC]"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-current" />
                      </span>
                    </span>

                    <span
                      className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium backdrop-blur-md border transition-all ${
                        isLockedEcu
                          ? "bg-[#FF2A55]/25 border-[#FF2A55]/60 text-[#F8FAFC]"
                          : isSelected
                            ? "bg-[#0B0F19]/92 border-[#00F0FF]/60 text-[#F8FAFC]"
                            : "bg-[#050810]/75 border-white/12 text-[#B4B0C8] group-hover:text-[#F8FAFC]"
                      }`}
                    >
                      {pin.shortLabel}
                    </span>
                  </button>
                )
              })}

              {/* Hint at bottom-left of vehicle frame */}
              <p className="hidden sm:block absolute bottom-3 left-4 z-20 text-[11px] text-[#B4B0C8]/85 pointer-events-none">
                Toca cada nodo del vehículo para inspeccionar su blindaje
              </p>
            </div>

            {/* Docked Interactive Readout + 1-Click Remote Engine Shutoff Console */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Active Hotspot Detail Readout */}
              <div className="md:col-span-7 rounded-2xl bg-[#0B0F19] border border-violet-500/20 p-4 sm:p-5 flex flex-col justify-between gap-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activePin.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22 }}
                    className="flex flex-col gap-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <activePin.icon
                          className={`w-4 h-4 shrink-0 ${
                            isEngineCut && activePin.id === "ecu"
                              ? "text-[#FF2A55]"
                              : "text-[#00F0FF]"
                          }`}
                        />
                        <h2 className="text-base font-semibold text-[#F8FAFC] tracking-[-0.015em] whitespace-nowrap">
                          {activePin.title}
                        </h2>
                      </div>
                      <span className="tabular-telemetry text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#111827] text-[#00F0FF] border border-white/[0.08] whitespace-nowrap shrink-0">
                        {activePin.spec}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-[#B4B0C8] leading-relaxed">
                      {activePin.detail}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* 1-Click Remote Engine Shutoff Test Module */}
              <div
                className={`md:col-span-5 rounded-2xl p-4 sm:p-5 border transition-colors flex flex-col justify-between gap-3 ${
                  isEngineCut
                    ? "bg-[#190812] border-[#FF2A55]/50"
                    : "bg-[#0B0F19] border-violet-500/20"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <span className="block text-xs text-[#B4B0C8]">
                      Velocidad en tiempo real
                    </span>
                    <span
                      className={`tabular-telemetry text-2xl sm:text-3xl font-bold tracking-tight ${
                        isEngineCut ? "text-[#FF2A55]" : "text-[#F8FAFC]"
                      }`}
                    >
                      {speed} <span className="text-sm font-semibold">KM/H</span>
                    </span>
                  </div>

                  <span
                    className={`tabular-telemetry text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                      isEngineCut
                        ? "bg-[#FF2A55]/15 border-[#FF2A55]/40 text-[#FF2A55]"
                        : "bg-[#10B981]/15 border-[#10B981]/35 text-[#10B981]"
                    }`}
                  >
                    {isEngineCut ? "CORTE ACTIVO" : "IGNICIÓN OK"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleToggleEngineCut}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer border ${
                    isEngineCut
                      ? "bg-[#10B981] hover:bg-[#059669] text-[#050810] border-[#10B981]"
                      : "bg-[#FF2A55] hover:bg-[#e11d48] text-[#F8FAFC] border-[#FF2A55]/60"
                  }`}
                >
                  {isEngineCut ? (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Restablecer Ignición</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Probar Corte de Motor</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
