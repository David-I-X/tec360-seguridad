"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Shield, ArrowRight, Phone, Users, Wrench } from "lucide-react"
import { motion } from "framer-motion"
import { useAuth } from "@/lib/auth-context"

export default function RegisterPage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "technician") {
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
        className="w-full max-w-md relative z-10"
      >
        {/* Back link */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Volver al inicio
        </Link>

        {/* Main Card */}
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="mb-8 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-brand shadow-lg shadow-blue-500/30"
            >
              <Shield className="h-8 w-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-extrabold">
              Únete a <span className="gradient-text">Tec360</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Crea tu cuenta gratis en segundos
            </p>
          </div>

          {/* Roles preview */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-center">
              <Users className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <p className="text-sm font-semibold">Cliente</p>
              <p className="text-xs text-muted-foreground">Solicita servicios</p>
            </div>
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center">
              <Wrench className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold">Técnico</p>
              <p className="text-xs text-muted-foreground">Ofrece servicios</p>
            </div>
          </div>

          {/* Primary: Phone auth */}
          <Link href="/auth/phone" className="block">
            <button className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl gradient-brand text-white font-semibold text-base shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:opacity-95 transition-all">
              <Phone className="h-5 w-5" />
              Registrarse con teléfono
              <ArrowRight className="h-4 w-4 ml-auto" />
            </button>
          </Link>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Seleccionarás tu rol después de verificar tu número
          </p>
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