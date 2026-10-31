"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Phone, ShieldCheck, Radio, ArrowLeft } from "lucide-react"
import { motion } from "framer-motion"
import { useAuth } from "@/lib/auth-context"
import { Tec360Logo } from "@/components/brand/tec360-logo"

export default function LoginPage() {
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 pt-24 pb-12 bg-[#050810] text-[#f8fafc]">
      {/* Silk Auroras & Tactical Lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] left-[10%] w-[520px] h-[520px] rounded-full bg-violet-600/15 blur-[120px] mix-blend-screen" />
        <div className="absolute -bottom-[10%] right-[10%] w-[580px] h-[580px] rounded-full bg-cyan-500/10 blur-[130px] mix-blend-screen" />
        <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.04]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Back Link */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-xs font-mono tracking-wider text-[#b4b0c8] hover:text-[#00f0ff] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          VOLVER AL PORTAL
        </Link>

        {/* Main Card with Sculpted Interlocking Header */}
        <div className="relative rounded-2xl border border-violet-500/25 bg-[#0b0f19]/90 backdrop-blur-2xl p-7 shadow-2xl shadow-black/80">
          {/* Top Notch Badge */}
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/[0.08]">
            <Tec360Logo size="sm" />
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#111827] border border-emerald-500/30 text-[10px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              CANAL 24/7
            </div>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold tracking-tight text-[#f8fafc]">
              Consola de Seguridad.{" "}
              <span className="text-[#a39eb8] font-normal">Acceso </span>
              <span className="text-[#00f0ff] whitespace-nowrap">[360°]</span>
            </h1>
            <p className="mt-2 text-xs text-[#b4b0c8] leading-relaxed">
              Inicia sesión o regístrate en segundos vía código SMS sin contraseñas.
            </p>
          </div>

          {/* Auth Action */}
          <div className="space-y-4">
            <Link href="/auth/phone" className="block">
              <button
                type="button"
                className="w-full group flex items-center justify-between px-5 py-3.5 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-[#f8fafc] font-semibold text-sm shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40 hover:from-[#8b5cf6] hover:to-[#7c3aed] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                    <Phone className="h-4 w-4 text-white" />
                  </div>
                  <span>Continuar con Teléfono</span>
                </div>
                <ArrowRight className="h-4 w-4 text-[#00f0ff] group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-white/[0.08]" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#7c7894]">
                Respaldo Oficial
              </span>
              <div className="flex-1 h-px bg-white/[0.08]" />
            </div>

            {/* Tactical Info Box */}
            <div className="p-3.5 rounded-xl bg-[#111827]/70 border border-white/[0.08] space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Radio className="w-4 h-4 text-[#00f0ff] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-[#f8fafc]">Validación Celular Inmediata</p>
                  <p className="text-[11px] text-[#b4b0c8]">
                    Código de 6 dígitos enviado por SMS a tu línea móvil en Colombia.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-[#f8fafc]">Red con Técnicos Certificados</p>
                  <p className="text-[11px] text-[#b4b0c8]">
                    Especialistas auditados para instalaciones, reacción 24/7 y mecánica express.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Legal */}
          <p className="text-center text-[11px] text-[#7c7894] mt-6">
            Al continuar aceptas los{" "}
            <Link href="/terminos" className="text-[#00f0ff] hover:underline">
              Términos de Servicio
            </Link>{" "}
            y{" "}
            <Link href="/privacidad" className="text-[#00f0ff] hover:underline">
              Privacidad
            </Link>
            .
          </p>
        </div>

        {/* Existing Code Link */}
        <div className="mt-5 text-center">
          <span className="text-xs text-[#b4b0c8]">¿Ya recibiste un código OTP? </span>
          <Link
            href="/auth/verify"
            className="text-xs font-mono text-[#00f0ff] hover:underline font-semibold"
          >
            [VERIFICAR AQUÍ]
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
