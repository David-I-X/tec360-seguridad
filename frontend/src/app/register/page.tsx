"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Shield, ArrowRight, Phone, Users, Wrench, Camera, MapPin, Star, FileText, CheckCircle, Clock } from "lucide-react"
import { motion } from "framer-motion"
import { useAuth } from "@/lib/auth-context"

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Background */}
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute top-20 right-[10%] w-72 h-72 bg-emerald-500/8 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 left-[15%] w-80 h-80 bg-blue-500/6 rounded-full blur-3xl animate-float delay-500" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Back link */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Volver al inicio
        </Link>

        {/* Main Card */}
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-8 shadow-2xl">
          {/* Logo */}
          <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp} className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-brand shadow-lg shadow-blue-500/30">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold">
              Únete a <span className="gradient-text">Tec360</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Elige cómo quieres usar la plataforma
            </p>
          </motion.div>

          {/* Role Cards — visually distinct */}
          <motion.div initial="hidden" animate="visible" custom={1} variants={fadeUp} className="space-y-4 mb-6">
            {/* CLIENT Card */}
            <div className="group relative overflow-hidden rounded-2xl border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 p-5 hover:border-blue-500/40 transition-all duration-300">
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors" />
              <div className="relative flex items-start gap-4">
                <div className="flex-shrink-0 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
                  <Users className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold mb-1">Soy Cliente</h3>
                  <p className="text-xs text-muted-foreground mb-3">Necesito instalar o reparar equipos de seguridad</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-400 bg-blue-500/10 rounded-full px-2 py-0.5">
                      <Camera className="h-3 w-3" /> Cámaras
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-400 bg-blue-500/10 rounded-full px-2 py-0.5">
                      <MapPin className="h-3 w-3" /> GPS
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-400 bg-blue-500/10 rounded-full px-2 py-0.5">
                      <Shield className="h-3 w-3" /> Alarmas
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* DIVIDER */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-xs text-muted-foreground font-medium">ó</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            {/* TECHNICIAN Card */}
            <div className="group relative overflow-hidden rounded-2xl border-2 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 p-5 hover:border-emerald-500/40 transition-all duration-300">
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors" />
              <div className="relative flex items-start gap-4">
                <div className="flex-shrink-0 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
                  <Wrench className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold mb-1">Soy Técnico</h3>
                  <p className="text-xs text-muted-foreground mb-3">Quiero ofrecer mis servicios de seguridad electrónica</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">
                      <FileText className="h-3 w-3" /> Cotiza
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">
                      <Star className="h-3 w-3" /> Calificaciones
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">
                      <CheckCircle className="h-3 w-3" /> SENA
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* CTA — Single auth entry point */}
          <motion.div initial="hidden" animate="visible" custom={2} variants={fadeUp}>
            <Link href="/auth/phone" className="block">
              <button className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl gradient-brand text-white font-semibold text-base shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:opacity-95 transition-all">
                <Phone className="h-5 w-5" />
                Continuar con teléfono
                <ArrowRight className="h-4 w-4 ml-auto" />
              </button>
            </Link>

            <p className="text-[11px] text-muted-foreground text-center mt-3">
              Seleccionarás tu rol después de verificar tu número
            </p>
          </motion.div>
        </div>

        {/* Already have account */}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿Ya tienes una cuenta?{" "}
          <Link href="/login" className="text-blue-500 hover:text-blue-400 font-medium">
            Inicia sesión
          </Link>
        </p>
      </motion.div>
    </div>
  )
}