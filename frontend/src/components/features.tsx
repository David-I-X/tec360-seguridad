"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BatteryCharging,
  Camera,
  Clock,
  Crosshair,
  Disc,
  Droplets,
  Lock,
  MapPin,
  Pause,
  PhoneCall,
  Play,
  Radio,
  ShieldCheck,
  Siren,
  Star,
  Wrench,
} from "lucide-react"
import { Tec360Logo } from "@/components/brand/tec360-logo"

/* ════════════════════════════════════════════════════════════════════════
   CONFIGURACIÓN DE VIDEOS CORTOS DE SERVICIOS
   Cuando tengas los archivos definitivos en `frontend/public/videos/`,
   basta con asignar su ruta aquí (ej: "/videos/instalaciones.mp4").
   ════════════════════════════════════════════════════════════════════════ */
export const SERVICE_VIDEOS: Record<
  "instalacion" | "recuperacion" | "mecanica",
  string | null
> = {
  instalacion: null,
  recuperacion: null,
  mecanica: null,
}

/* ════════════════════════════════════════════════════════════════════════
   1. ESCENARIO DE LOS 3 SERVICIOS CON PLACEHOLDERS DE VIDEO CORTO
   ════════════════════════════════════════════════════════════════════════ */

interface ServiceReelSpec {
  id: "instalacion" | "recuperacion" | "mecanica"
  badge: string
  title: string
  summary: string
  posterSrc: string
  posterAlt: string
  durationLabel: string
  durationSec: number
  accentHex: string
  ctaLabel: string
  ctaHref: string
  videoSide: "left" | "right"
  previewCaptions: [string, string, string]
  highlights: {
    icon: typeof Radio
    label: string
    meta: string
  }[]
}

const SERVICE_REELS: ServiceReelSpec[] = [
  {
    id: "instalacion",
    badge: "Motos · Automóviles · Carga Pesada",
    title: "Instalaciones Vehiculares",
    summary:
      "Técnicos certificados llegan a tu domicilio o empresa para instalar equipos de seguridad electrónica con conectores originales OEM, sin filas ni talleres.",
    posterSrc: "/images/landing/tactical-installation-bay.jpg",
    posterAlt:
      "Técnico certificado conectando módulo telemático 4G en arnés automotriz original",
    durationLabel: "00:18",
    durationSec: 18,
    accentHex: "#8B5CF6",
    ctaLabel: "Solicitar Instalación",
    ctaHref: "/servicios/nuevo?tipo=instalacion",
    videoSide: "left",
    previewCaptions: [
      "01 · Diagnóstico del sistema eléctrico en tu domicilio",
      "02 · Conexión limpia con arnés OEM sin pelar cables",
      "03 · Calibración satelital 4G y entrega activa en tu app",
    ],
    highlights: [
      { icon: Radio, label: "GPS 4G L1/L5", meta: "Anti-jammer activo" },
      { icon: Camera, label: "Dashcam HD", meta: "Grabación en nube" },
      { icon: Siren, label: "Alarmas Inteligentes", meta: "Sensores digitales" },
      { icon: Lock, label: "Bloqueo CAN-Bus", meta: "Corte seguro 0 km/h" },
    ],
  },
  {
    id: "recuperacion",
    badge: "Respuesta Inmediata 24/7 · Cobertura Nacional",
    title: "Equipo de Reacción & Recuperación",
    summary:
      "Ante hurto o intento de sabotaje activamos corte de motor remoto en segundos, cerco satelital continuo y despliegue de nuestro equipo de reacción en coordinación con la Policía Nacional.",
    posterSrc: "/images/landing/reaction-team-poster.jpg",
    posterAlt:
      "Vehículo asegurado de noche bajo protocolo de equipo de reacción 24/7 y enlace policial",
    durationLabel: "00:22",
    durationSec: 22,
    accentHex: "#00F0FF",
    ctaLabel: "Activar Equipo de Reacción",
    ctaHref: "/servicios/nuevo?tipo=recuperacion",
    videoSide: "right",
    previewCaptions: [
      "01 · Alerta inmediata e inmovilización digital a 0 km/h",
      "02 · Fijación de coordenadas L1/L5 contra inhibidores",
      "03 · Despliegue del equipo de reacción y enlace policial",
    ],
    highlights: [
      { icon: Lock, label: "Corte Remoto", meta: "Inmovilización 1.1 s" },
      { icon: Siren, label: "Equipo de Reacción", meta: "Operación en campo" },
      { icon: Crosshair, label: "Cerco Satelital", meta: "Pulso cada 10 seg" },
      { icon: ShieldCheck, label: "Enlace Oficial", meta: "Policía Nacional" },
    ],
  },
  {
    id: "mecanica",
    badge: "Asistencia Express · En Casa, Oficina o Vía",
    title: "Mecánica Básica a Domicilio",
    summary:
      "Resuelve desvares y mantenimiento preventivo sin mover tu vehículo. Un técnico certificado acude en minutos con herramientas de precisión y seguimiento en el mapa.",
    posterSrc: "/images/landing/basic-mechanics-poster.jpg",
    posterAlt:
      "Técnico certificado realizando servicio de mecánica básica con herramienta digital de torque",
    durationLabel: "00:16",
    durationSec: 16,
    accentHex: "#F59E0B",
    ctaLabel: "Solicitar Mecánica Básica",
    ctaHref: "/servicios/nuevo?tipo=mecanica",
    videoSide: "left",
    previewCaptions: [
      "01 · Solicitud express con insumos tuyos o del técnico",
      "02 · Servicio limpio de batería, llantas, aceite o frenos",
      "03 · Verificación de torque, niveles y garantía en plataforma",
    ],
    highlights: [
      { icon: BatteryCharging, label: "Batería y Corriente", meta: "Inicio o cambio < 30m" },
      { icon: Disc, label: "Cambio de Llantas", meta: "Desvare en sitio < 30m" },
      { icon: Droplets, label: "Aceite y Filtros", meta: "Servicio limpio < 45m" },
      { icon: Wrench, label: "Frenos, Kit y Luces", meta: "Ajuste certificado" },
    ],
  },
]

function formatSeconds(sec: number) {
  const s = Math.max(0, Math.floor(sec))
  return `00:${s.toString().padStart(2, "0")}`
}

function ServiceVideoPlaceholderCard({ service }: { service: ServiceReelSpec }) {
  const videoSrc = SERVICE_VIDEOS[service.id]
  const [isPlayingPreview, setIsPlayingPreview] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!isPlayingPreview || videoSrc) return

    const tick = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 0.25 >= service.durationSec) {
          return 0
        }
        return prev + 0.25
      })
    }, 250)

    return () => clearInterval(tick)
  }, [isPlayingPreview, service.durationSec, videoSrc])

  const progressPct = Math.min(100, (elapsed / service.durationSec) * 100)
  const captionIdx =
    progressPct < 34 ? 0 : progressPct < 68 ? 1 : 2

  if (videoSrc) {
    return (
      <div className="relative rounded-2xl overflow-hidden bg-[#0B0F19] border border-violet-500/25 aspect-[16/10]">
        <video
          src={videoSrc}
          poster={service.posterSrc}
          controls
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  return (
    <div className="group relative rounded-2xl overflow-hidden bg-[#0B0F19] border border-violet-500/25 select-none">
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {/* Dark-Studio Poster Frame with Subtle Preview Motion */}
        <img
          src={service.posterSrc}
          alt={service.posterAlt}
          width={1408}
          height={768}
          loading="lazy"
          className={`w-full h-full object-cover object-center transition-transform duration-1000 ease-out ${
            isPlayingPreview ? "scale-105" : "group-hover:scale-[1.02]"
          }`}
        />

        {/* Cinema Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(5,8,16,0.45) 0%, rgba(5,8,16,0.12) 45%, rgba(5,8,16,0.88) 100%)",
          }}
          aria-hidden="true"
        />

        {/* Top-Left Placeholder Status Pill */}
        <div className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 z-20 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#050810]/85 backdrop-blur-md border border-white/12 whitespace-nowrap">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isPlayingPreview ? "animate-ping" : ""
            }`}
            style={{ backgroundColor: service.accentHex }}
          />
          <span className="text-[11px] font-semibold text-[#F8FAFC] tracking-wide">
            {isPlayingPreview ? "Vista previa activa" : "Video corto · Próximamente"}
          </span>
        </div>

        {/* Sculpted Top-Right Interlocking Duration Notch */}
        <div className="hidden sm:flex items-center gap-2 absolute top-0 right-0 z-20 bg-[#050810] pl-4 pr-3.5 py-2 rounded-bl-2xl border-l border-b border-violet-500/25">
          <span className="tabular-telemetry text-[11px] font-semibold text-[#B4B0C8]">
            REEL 16:9 ·{" "}
            <strong className="text-[#F8FAFC]">{service.durationLabel}</strong>
          </span>
        </div>

        {/* Center Tactile Play / Pause Control */}
        <button
          type="button"
          onClick={() => setIsPlayingPreview((p) => !p)}
          aria-label={
            isPlayingPreview
              ? `Pausar vista previa de ${service.title}`
              : `Reproducir vista previa de ${service.title}`
          }
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 cursor-pointer focus:outline-none"
        >
          <span
            className="flex h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] items-center justify-center rounded-full bg-[#050810]/82 backdrop-blur-md border transition-transform duration-300 group-hover:scale-105"
            style={{ borderColor: service.accentHex }}
          >
            {isPlayingPreview ? (
              <Pause className="w-6 h-6 text-[#F8FAFC]" />
            ) : (
              <Play className="w-6 h-6 text-[#F8FAFC] fill-[#F8FAFC] translate-x-0.5" />
            )}
          </span>
          {!isPlayingPreview && (
            <span className="px-3 py-1 rounded-full bg-[#050810]/80 backdrop-blur-md border border-white/10 text-[11px] font-medium text-[#F8FAFC]">
              Ver storyboard del video
            </span>
          )}
        </button>

        {/* Bottom Player HUD & Timeline Scrubber */}
        <div className="absolute inset-x-0 bottom-0 z-20 p-3.5 sm:p-4 flex flex-col gap-2.5 pointer-events-none">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs sm:text-sm font-medium text-[#F8FAFC] truncate">
              {isPlayingPreview
                ? service.previewCaptions[captionIdx]
                : `Espacio preparado para reel de ${service.title.toLowerCase()}`}
            </p>
            <span className="tabular-telemetry text-[11px] font-semibold text-[#B4B0C8] shrink-0">
              {formatSeconds(elapsed)} / {service.durationLabel}
            </span>
          </div>

          <div className="w-full h-1 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${isPlayingPreview ? Math.max(6, progressPct) : 22}%`,
                backgroundColor: service.accentHex,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function ServicesVideoShowcaseSection() {
  return (
    <section
      id="servicios"
      className="scroll-mt-16 relative py-24 md:py-32 bg-[#050810] border-b border-white/[0.06]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Heading — Zero kicker above heading */}
        <div className="max-w-3xl mb-16 md:mb-20">
          <h2 className="font-display text-3xl sm:text-4xl md:text-[2.85rem] font-semibold leading-[1.08] tracking-[-0.032em] text-[#F8FAFC] text-balance">
            Tres líneas de servicio.{" "}
            <span className="text-[#A39EB8] font-normal">
              Seguridad electrónica, reacción táctica y{" "}
            </span>
            <span className="font-semibold text-[#00F0FF] whitespace-nowrap">
              [MECÁNICA EXPRESS]
            </span>
            <span className="text-[#A39EB8] font-normal">.</span>
          </h2>
        </div>

        {/* 3 Alternating 12-Column Service Video Bands */}
        <div className="flex flex-col gap-20 md:gap-24">
          {SERVICE_REELS.map((service) => {
            const isVideoRight = service.videoSide === "right"
            return (
              <article
                key={service.id}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
              >
                {/* Video Column (7 cols) */}
                <div
                  className={`lg:col-span-7 ${
                    isVideoRight ? "lg:order-2" : "lg:order-1"
                  }`}
                >
                  <ServiceVideoPlaceholderCard service={service} />
                </div>

                {/* Spec & Conversion Column (5 cols) */}
                <div
                  className={`lg:col-span-5 flex flex-col gap-6 ${
                    isVideoRight ? "lg:order-1" : "lg:order-2"
                  }`}
                >
                  <div className="flex flex-col gap-3.5">
                    <h3 className="font-display text-2xl sm:text-3xl font-semibold text-[#F8FAFC] tracking-[-0.025em]">
                      {service.title}
                    </h3>

                    <div className="inline-flex w-fit items-center gap-2 px-3 py-1 rounded-full bg-[#0B0F19] border border-white/10 text-xs font-medium text-[#B4B0C8]">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: service.accentHex }}
                      />
                      <span>{service.badge}</span>
                    </div>

                    <p className="text-sm sm:text-base text-[#B4B0C8] leading-relaxed">
                      {service.summary}
                    </p>
                  </div>

                  {/* 2x2 Sub-service Capabilities */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {service.highlights.map((item) => {
                      const Icon = item.icon
                      return (
                        <div
                          key={item.label}
                          className="rounded-xl p-3.5 bg-[#0B0F19] border border-white/[0.08] flex items-start gap-3"
                        >
                          <div
                            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#111827] border border-white/[0.06]"
                            style={{ color: service.accentHex }}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#F8FAFC] leading-tight">
                              {item.label}
                            </p>
                            <p className="text-xs text-[#B4B0C8] mt-0.5">
                              {item.meta}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Service Actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                    <Link
                      href={service.ctaHref}
                      className={`inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-sm transition-colors border ${
                        service.id === "recuperacion"
                          ? "bg-[#00F0FF] hover:bg-[#67f6ff] text-[#050810] border-[#00F0FF]"
                          : service.id === "mecanica"
                            ? "bg-[#F59E0B] hover:bg-[#fbbf24] text-[#050810] border-[#F59E0B]"
                            : "bg-[#7C3AED] hover:bg-[#8B5CF6] text-[#F8FAFC] border-violet-400/35"
                      }`}
                    >
                      <span>{service.ctaLabel}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>

                    {service.id === "recuperacion" && (
                      <a
                        href="tel:+573052156601"
                        className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-[#0B0F19] hover:bg-[#111827] text-[#F8FAFC] text-xs sm:text-sm font-medium border border-white/10 transition-colors"
                      >
                        <PhoneCall className="w-4 h-4 text-[#00F0FF]" />
                        <span className="tabular-telemetry font-semibold text-[#00F0FF]">
                          +57 305 215 6601
                        </span>
                      </a>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════════════
   2. CIRCUITO RADIAL DE ECOSISTEMA — ORBITAL RADAR 360° V2
   ════════════════════════════════════════════════════════════════════════ */

interface CircuitNode {
  id: string
  side: "left" | "right"
  title: string
  metric: string
  desc: string
  pathD: string
  icon: typeof Radio
}

const CIRCUIT_NODES: CircuitNode[] = [
  {
    id: "gps-node",
    side: "left",
    title: "GPS 4G L1/L5 Anti-Jammer",
    metric: "CADA 10 SEG",
    desc: "Doble banda satelital con detección activa de inhibidores de frecuencia.",
    pathD: "M 310 95 H 410 L 455 185 H 520",
    icon: Radio,
  },
  {
    id: "dashcam-node",
    side: "left",
    title: "Dashcam HD en Nube",
    metric: "1080P LTE",
    desc: "Evidencia visual de vía y cabina transmitida sobre red celular 4G.",
    pathD: "M 310 240 H 520",
    icon: Camera,
  },
  {
    id: "canbus-node",
    side: "left",
    title: "Corte Remoto CAN-Bus",
    metric: "0 KM/H SEGURO",
    desc: "Bloqueo progresivo de ignición desde la app o central de monitoreo.",
    pathD: "M 310 385 H 410 L 455 295 H 520",
    icon: Lock,
  },
  {
    id: "reaction-node",
    side: "right",
    title: "Equipo de Reacción 24/7",
    metric: "24/7 EN CAMPO",
    desc: "Coordinación inmediata en campo y enlace en vivo con Policía Nacional.",
    pathD: "M 890 95 H 790 L 745 185 H 680",
    icon: Siren,
  },
  {
    id: "mechanics-node",
    side: "right",
    title: "Mecánica Básica Express",
    metric: "< 30 MIN EN SITIO",
    desc: "Batería, llantas, aceite, frenos y desvare rápido donde te encuentres.",
    pathD: "M 890 240 H 680",
    icon: Wrench,
  },
  {
    id: "certified-node",
    side: "right",
    title: "Técnicos Certificados",
    metric: "100% AUDITADOS",
    desc: "Especialistas verificados para motos, automóviles y transporte de carga.",
    pathD: "M 890 385 H 790 L 745 295 H 680",
    icon: BadgeCheck,
  },
]

function EcosystemCircuitSection() {
  const [activeNodeId, setActiveNodeId] = useState<string>("reaction-node")

  const leftNodes = CIRCUIT_NODES.filter((n) => n.side === "left")
  const rightNodes = CIRCUIT_NODES.filter((n) => n.side === "right")

  return (
    <section
      id="ecosistema"
      className="scroll-mt-16 relative py-24 md:py-32 bg-[#050810] border-b border-white/[0.06] overflow-hidden"
    >
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] h-[620px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(124,58,237,0.16) 0%, rgba(0,240,255,0.06) 38%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8">
        <div className="max-w-3xl mx-auto text-left md:text-center mb-14 md:mb-20">
          <h2 className="font-display text-3xl sm:text-4xl md:text-[2.85rem] font-semibold leading-[1.08] tracking-[-0.032em] text-[#F8FAFC] text-balance">
            Un solo núcleo operativo.{" "}
            <span className="text-[#A39EB8] font-normal">
              Conectado en tiempo real a cada capa de{" "}
            </span>
            <span className="font-semibold text-[#00F0FF] whitespace-nowrap">
              [PROTECCIÓN]
            </span>
            <span className="text-[#A39EB8] font-normal">.</span>
          </h2>
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-0 items-center">
          <svg
            viewBox="0 0 1200 480"
            className="hidden lg:block absolute inset-0 w-full h-full pointer-events-none z-0"
            aria-hidden="true"
          >
            {CIRCUIT_NODES.map((node) => {
              const highlighted = node.id === activeNodeId
              return (
                <g key={node.id}>
                  <path
                    d={node.pathD}
                    fill="none"
                    stroke={
                      highlighted
                        ? "rgba(0, 240, 255, 0.55)"
                        : "rgba(139, 92, 246, 0.24)"
                    }
                    strokeWidth={highlighted ? "1.6" : "1"}
                  />
                  <path
                    d={node.pathD}
                    fill="none"
                    stroke="#00F0FF"
                    strokeWidth={highlighted ? "2" : "1.2"}
                    strokeOpacity={highlighted ? "0.95" : "0.45"}
                    className="t360-circuit-signal"
                  />
                </g>
              )
            })}
          </svg>

          <div className="lg:col-span-4 flex flex-col gap-5 relative z-10">
            {leftNodes.map((node) => {
              const Icon = node.icon
              const active = node.id === activeNodeId
              return (
                <button
                  key={node.id}
                  type="button"
                  onMouseEnter={() => setActiveNodeId(node.id)}
                  onFocus={() => setActiveNodeId(node.id)}
                  onClick={() => setActiveNodeId(node.id)}
                  className={`text-left rounded-2xl p-5 bg-[#0B0F19]/92 border transition-colors cursor-pointer ${
                    active
                      ? "border-[#00F0FF]/60"
                      : "border-violet-500/18 hover:border-violet-400/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          active ? "text-[#00F0FF]" : "text-violet-400"
                        }`}
                      />
                      <h3 className="text-sm sm:text-base font-semibold text-[#F8FAFC]">
                        {node.title}
                      </h3>
                    </div>
                    <span className="tabular-telemetry text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#111827] text-[#00F0FF] border border-white/[0.08] whitespace-nowrap">
                      {node.metric}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#B4B0C8] leading-relaxed">
                    {node.desc}
                  </p>
                </button>
              )
            })}
          </div>

          <div className="lg:col-span-4 flex flex-col items-center justify-center py-6 lg:py-0 relative z-10">
            <div className="relative flex items-center justify-center w-44 h-44 sm:w-52 sm:h-52 rounded-3xl bg-[#0B0F19] border border-violet-500/35">
              <div
                className="absolute inset-3 rounded-2xl border border-[#00F0FF]/15 pointer-events-none"
                aria-hidden="true"
              />
              <Tec360Logo iconOnly size="xl" className="w-28 h-28 sm:w-32 sm:h-32" iconClassName="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl" />
            </div>
            <span className="mt-4 text-xs font-semibold text-[#B4B0C8] tracking-wider">
              NÚCLEO ORBITAL TEC360 · <span className="tabular-telemetry text-[#F8FAFC]">4G L1/L5</span>
            </span>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-5 relative z-10">
            {rightNodes.map((node) => {
              const Icon = node.icon
              const active = node.id === activeNodeId
              return (
                <button
                  key={node.id}
                  type="button"
                  onMouseEnter={() => setActiveNodeId(node.id)}
                  onFocus={() => setActiveNodeId(node.id)}
                  onClick={() => setActiveNodeId(node.id)}
                  className={`text-left rounded-2xl p-5 bg-[#0B0F19]/92 border transition-colors cursor-pointer ${
                    active
                      ? "border-[#00F0FF]/60"
                      : "border-violet-500/18 hover:border-violet-400/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          active ? "text-[#00F0FF]" : "text-violet-400"
                        }`}
                      />
                      <h3 className="text-sm sm:text-base font-semibold text-[#F8FAFC]">
                        {node.title}
                      </h3>
                    </div>
                    <span className="tabular-telemetry text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#111827] text-[#00F0FF] border border-white/[0.08] whitespace-nowrap">
                      {node.metric}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#B4B0C8] leading-relaxed">
                    {node.desc}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════════════
   3. RESPALDO DE TÉCNICOS CERTIFICADOS + RESEÑAS VERIFICADAS
   ════════════════════════════════════════════════════════════════════════ */

const TRUST_COMMITMENTS = [
  {
    icon: BadgeCheck,
    metric: "4.9 ★",
    title: "Técnicos certificados y auditados",
    desc: "Cada especialista supera validación de identidad, revisión de antecedentes y pruebas técnicas antes de operar en Tec360.",
  },
  {
    icon: Clock,
    metric: "< 30 MIN",
    title: "Atención express el mismo día",
    desc: "Desde un inicio de batería o cambio de llanta hasta una instalación completa de GPS 4G en tu propio parqueadero.",
  },
  {
    icon: MapPin,
    metric: "GPS 24/7",
    title: "Rastreo del especialista en camino",
    desc: "Conoce el nombre, foto, calificación y ubicación exacta en mapa del técnico asignado desde que acepta tu solicitud.",
  },
]

const VERIFIED_VOICES = [
  {
    quote:
      "Pedí la instalación de una dashcam y el técnico llegó en menos de 2 horas. Dejó el cableado oculto de fábrica y todo configurado en el celular.",
    author: "Luis M.",
    city: "Medellín",
    vehicle: "Instalación Dashcam HD",
  },
  {
    quote:
      "Me quedé sin batería en la oficina; solicité mecánica básica en la plataforma, vi la foto del técnico certificado y en 25 minutos ya tenía el carro encendido.",
    author: "Carolina V.",
    city: "Bogotá",
    vehicle: "Mecánica Básica Express",
  },
  {
    quote:
      "Instalaron el GPS 4G y bloqueo remoto de mi camión con garantía. Puntualidad absoluta y respaldo permanente del equipo de reacción.",
    author: "Andrés T.",
    city: "Cali",
    vehicle: "GPS 4G + Reacción 24/7",
  },
]

function CertifiedTrustAndVoicesSection() {
  return (
    <section
      id="respaldo"
      className="scroll-mt-16 relative py-24 md:py-32 bg-[#050810] border-b border-white/[0.06]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="max-w-3xl mb-14 md:mb-16">
          <h2 className="font-display text-3xl sm:text-4xl md:text-[2.85rem] font-semibold leading-[1.08] tracking-[-0.032em] text-[#F8FAFC] text-balance">
            Técnicos certificados en tu puerta.{" "}
            <span className="text-[#A39EB8] font-normal">
              Transparencia total en cada{" "}
            </span>
            <span className="font-semibold text-[#00F0FF] whitespace-nowrap">
              [SERVICIO]
            </span>
            <span className="text-[#A39EB8] font-normal">.</span>
          </h2>
        </div>

        {/* Architectural Horizontal Ledger */}
        <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {TRUST_COMMITMENTS.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="py-7 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-center"
              >
                <div className="md:col-span-3 flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0B0F19] border border-violet-500/25 text-[#00F0FF]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="tabular-telemetry text-xl sm:text-2xl font-bold text-[#F8FAFC]">
                    {item.metric}
                  </span>
                </div>
                <h3 className="md:col-span-4 text-lg font-semibold text-[#F8FAFC] tracking-[-0.015em]">
                  {item.title}
                </h3>
                <p className="md:col-span-5 text-sm text-[#B4B0C8] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            )
          })}
        </div>

        {/* Verified Voices Strip */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 md:divide-x md:divide-white/[0.08]">
          {VERIFIED_VOICES.map((v, idx) => (
            <blockquote
              key={v.author}
              className={`flex flex-col justify-between gap-5 ${
                idx === 0 ? "md:pr-8" : idx === 1 ? "md:px-8" : "md:pl-8"
              }`}
            >
              <div
                className="flex gap-1"
                aria-label="Calificación 5 de 5 estrellas"
              >
                {[0, 1, 2, 3, 4].map((star) => (
                  <Star
                    key={star}
                    className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B]"
                  />
                ))}
              </div>
              <p className="text-sm text-[#F8FAFC]/90 leading-relaxed">
                &ldquo;{v.quote}&rdquo;
              </p>
              <footer className="flex items-center justify-between text-xs text-[#B4B0C8]">
                <span className="font-semibold text-[#F8FAFC]">{v.author}</span>
                <span>
                  {v.city} · {v.vehicle}
                </span>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════════════
   4. CIERRE MONUMENTAL NEXAFLOW & HORIZONTE VECTORIAL TEC360
   ════════════════════════════════════════════════════════════════════════ */

const footerNav = [
  { label: "Instalaciones", href: "/servicios/nuevo?tipo=instalacion" },
  { label: "Equipo de Reacción 24/7", href: "/servicios/nuevo?tipo=recuperacion" },
  { label: "Mecánica Básica", href: "/servicios/nuevo?tipo=mecanica" },
  { label: "Mis Servicios", href: "/servicios" },
  { label: "Descargar App", href: "/descargar-app" },
  { label: "Iniciar Sesión", href: "/login" },
]

function NexaflowClosingFooter() {
  const closeRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = closeRef.current
    if (!el) return

    let frame = 0
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        if (event.clientY < rect.top - 200 || event.clientY > rect.bottom + 200) {
          return
        }
        const x = Math.max(
          0,
          Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)
        )
        const y = Math.max(
          0,
          Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)
        )
        el.style.setProperty("--mouse-x", `${x.toFixed(1)}%`)
        el.style.setProperty("--mouse-y", `${y.toFixed(1)}%`)
      })
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("pointermove", onMove)
    }
  }, [])

  return (
    <footer
      id="contacto"
      ref={closeRef}
      className="scroll-mt-16 t360-silk-stage relative overflow-hidden pt-24 md:pt-32 pb-10"
    >
      <div className="t360-aurora-one" aria-hidden="true" />
      <div className="t360-aurora-two" aria-hidden="true" />
      <div className="t360-pointer-light" aria-hidden="true" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 flex flex-col gap-16 md:gap-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <h2 className="font-display text-3xl sm:text-4xl md:text-[3.1rem] font-semibold leading-[1.06] tracking-[-0.034em] text-[#F8FAFC] text-balance">
              ¿Listo para blindar tu vehículo,{" "}
              <span className="text-[#A39EB8] font-normal">
                pedir mecánica a domicilio o activar nuestra central{" "}
              </span>
              <span className="tabular-telemetry font-semibold text-[#00F0FF] whitespace-nowrap">
                [24/7]
              </span>
              <span className="text-[#A39EB8] font-normal">?</span>
            </h2>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/servicios/nuevo?tipo=instalacion"
                className="inline-flex items-center gap-2.5 px-7 py-4 rounded-xl bg-[#7C3AED] hover:bg-[#8B5CF6] text-[#F8FAFC] font-semibold text-sm sm:text-base border border-violet-400/35 transition-colors"
              >
                <span>Agendar Servicio</span>
                <ArrowRight className="w-4 h-4 text-[#00F0FF]" />
              </Link>
              <Link
                href="/descargar-app"
                className="inline-flex items-center gap-2 px-6 py-4 rounded-xl bg-[#0B0F19]/90 hover:bg-[#111827] text-[#F8FAFC] font-medium text-sm sm:text-base border border-white/12 transition-colors"
              >
                <span>Descargar App Android</span>
                <ArrowUpRight className="w-4 h-4 text-[#00F0FF]" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-5 lg:items-end lg:text-right">
            <div>
              <span className="block text-xs text-[#B4B0C8] mb-1.5">
                Central Operativa &amp; WhatsApp 24/7:
              </span>
              <a
                href="https://wa.me/573052156601?text=Hola%20Tec360%2C%20quiero%20solicitar%20un%20servicio%20vehicular"
                target="_blank"
                rel="noopener noreferrer"
                className="t360-hairline-link tabular-telemetry text-xl sm:text-2xl font-semibold text-[#F8FAFC] hover:text-[#00F0FF] transition-colors"
              >
                <span>+57 305 215 6601</span>
                <ArrowUpRight className="w-5 h-5 text-[#00F0FF]" />
              </a>
            </div>

            <div>
              <span className="block text-xs text-[#B4B0C8] mb-1.5">
                Soporte técnico y corporativo:
              </span>
              <a
                href="mailto:tracktec.soporte@gmail.com"
                className="t360-hairline-link text-base sm:text-lg font-medium text-[#F8FAFC] hover:text-[#00F0FF] transition-colors"
              >
                <span>tracktec.soporte@gmail.com</span>
                <ArrowUpRight className="w-4 h-4 text-[#00F0FF]" />
              </a>
            </div>
          </div>
        </div>

        <nav
          aria-label="Navegación de pie de página"
          className="pt-8 border-t border-white/[0.10] flex flex-wrap items-center justify-between gap-x-6 gap-y-3"
        >
          <div className="flex flex-wrap items-center gap-x-7 gap-y-2.5">
            {footerNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="t360-hairline-link text-sm font-medium text-[#B4B0C8] hover:text-[#F8FAFC] transition-colors"
              >
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          <span className="text-xs text-[#B4B0C8]">
            Medellín · Bogotá · Cali · Cobertura Nacional
          </span>
        </nav>

        <div className="pt-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 select-none">
          <Tec360Logo size="xl" />
          <div className="flex flex-col md:items-end text-left md:text-right">
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.08em] text-[#00F0FF]">
              Seguridad Vehicular Integral 360°
            </span>
            <span className="text-xs text-[#B4B0C8] mt-1">
              Blindaje electrónico · Reacción 24/7 · Mecánica express en Colombia
            </span>
          </div>
        </div>

        <div className="pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#B4B0C8]">
          <p>
            © 2026 Tec360 Seguridad. Instalaciones, Reacción 24/7 &amp; Mecánica
            Básica.
          </p>
          <div className="flex items-center gap-5">
            <Link
              href="/terminos"
              className="hover:text-[#F8FAFC] transition-colors"
            >
              Términos y Condiciones
            </Link>
            <Link
              href="/privacidad"
              className="hover:text-[#F8FAFC] transition-colors"
            >
              Política de Privacidad
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export function Features() {
  return (
    <>
      <ServicesVideoShowcaseSection />
      <EcosystemCircuitSection />
      <CertifiedTrustAndVoicesSection />
      <NexaflowClosingFooter />
    </>
  )
}
