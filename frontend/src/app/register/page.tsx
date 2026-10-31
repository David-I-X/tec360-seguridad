"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowRight,
  Phone,
  Users,
  Wrench,
  Camera,
  ShieldAlert,
  Star,
  CheckCircle2,
  FileCheck,
  ArrowLeft,
  Radio,
} from "lucide-react"
import { motion } from "framer-motion"
import { useAuth } from "@/lib/auth-context"
import { Tec360Logo } from "@/components/brand/tec360-logo"

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
}

export default function RegisterPage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "technician" || user.role === "reaction_team") {
        router.push("/tecnicos/dashboard")
      } else {
        router.push("/servicios")
      }
    }
  }, [isAuthenticated, user, router])

  return (
    <div className="min-h-screen bg-[#050810] text-slate-100 flex items-center justify-center relative overflow-hidden px-4 pt-24 pb-12">
      {/* Silk Auroras & Tactical Radar Glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 right-1/4 w-[480px] h-[480px] bg-violet-600/12 rounded-full blur-[140px]" />
        <div className="absolute -bottom-32 left-1/4 w-[480px] h-[480px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-b from-transparent via-violet-950/15 to-transparent rounded-full blur-[160px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-violet-400" />
            <span>TERMINAL // VOLVER AL INICIO</span>
          </Link>
        </div>

        {/* Tactical Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F19]/90 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Top hairline indicator */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

          {/* Logo & Headline */}
          <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp} className="mb-8 text-center">
            <div className="flex justify-center mb-5">
              <Tec360Logo size="md" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
              Únete a la Red. <span className="text-[#a39eb8] font-normal">Cobertura </span>
              <span className="text-[#00f0ff] whitespace-nowrap">[360°]</span>
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
              Plataforma de seguridad vehicular, telemetría satelital y asistencia express bajo demanda.
            </p>
          </motion.div>

          {/* Role Cards */}
          <motion.div initial="hidden" animate="visible" custom={1} variants={fadeUp} className="space-y-3.5 mb-7">
            {/* CLIENT Card */}
            <div className="group relative overflow-hidden rounded-xl border border-violet-500/20 bg-violet-950/15 p-4 sm:p-5 hover:border-violet-500/40 transition-all duration-300">
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-violet-600/10 rounded-full blur-xl group-hover:bg-violet-600/20 transition-colors" />
              <div className="relative flex items-start gap-4">
                <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300">
                  <Users className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-white font-display">Soy Cliente / Propietario</h3>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/25">
                      USUARIO
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Instalación de dispositivos, monitoreo y auxilio mecánico para vehículos o flotas.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-violet-300 bg-violet-500/15 border border-violet-500/20 rounded-md px-2 py-0.5">
                      <Camera className="h-3 w-3" /> Instalaciones
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-cyan-300 bg-cyan-500/15 border border-cyan-500/20 rounded-md px-2 py-0.5">
                      <ShieldAlert className="h-3 w-3" /> Reacción 24/7
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-amber-300 bg-amber-500/15 border border-amber-500/20 rounded-md px-2 py-0.5">
                      <Wrench className="h-3 w-3" /> Mecánica Básica
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* DIVIDER */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-white/[0.08]" />
              <span className="text-[11px] text-slate-500 font-mono uppercase tracking-widest">o bien</span>
              <div className="flex-1 h-px bg-white/[0.08]" />
            </div>

            {/* TECHNICIAN Card */}
            <div className="group relative overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-950/15 p-4 sm:p-5 hover:border-emerald-500/40 transition-all duration-300">
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-emerald-600/10 rounded-full blur-xl group-hover:bg-emerald-600/20 transition-colors" />
              <div className="relative flex items-start gap-4">
                <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-300">
                  <Wrench className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-white font-display">Soy Técnico Certificado</h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      CERTIFICADO
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Acepta órdenes de instalación, auxilio mecánico y despliegues con telemetría en tiempo real.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-emerald-300 bg-emerald-500/15 border border-emerald-500/20 rounded-md px-2 py-0.5">
                      <CheckCircle2 className="h-3 w-3" /> Idoneidad Validada
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-amber-300 bg-amber-500/15 border border-amber-500/20 rounded-md px-2 py-0.5">
                      <Star className="h-3 w-3" /> Calificación 360°
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-cyan-300 bg-cyan-500/15 border border-cyan-500/20 rounded-md px-2 py-0.5">
                      <FileCheck className="h-3 w-3" /> Despacho en Ruta
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* CTA — Single auth entry point */}
          <motion.div initial="hidden" animate="visible" custom={2} variants={fadeUp} className="space-y-3">
            <Link href="/auth/phone" className="block">
              <button className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-bold text-sm shadow-lg shadow-violet-600/30 transition-all cursor-pointer">
                <Phone className="h-4 w-4" />
                <span>Continuar con Teléfono Móvil</span>
                <ArrowRight className="h-4 w-4 ml-auto text-violet-200" />
              </button>
            </Link>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-mono">
              <Radio className="h-3 w-3 text-cyan-400 animate-pulse" />
              <span>Autenticación cifrada SMS OTP · Selección de rol en onboarding</span>
            </div>
          </motion.div>
        </div>

        {/* Already have account */}
        <p className="mt-5 text-center text-xs text-slate-400">
          ¿Ya tienes una cuenta activa?{" "}
          <Link href="/login" className="text-violet-400 hover:text-violet-300 font-semibold underline underline-offset-4">
            Ingresa a la consola
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
