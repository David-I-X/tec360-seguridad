"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Shield, ArrowRight, Phone, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "technician") {
        router.push("/tecnicos")
      } else {
        router.push("/servicios")
      }
    }
  }, [isAuthenticated, user, router])

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Background */}
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute top-20 left-[15%] w-72 h-72 bg-blue-500/8 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-purple-500/6 rounded-full blur-3xl animate-float delay-500" />

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
              Bienvenido a <span className="gradient-text">Tec360</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Inicia sesión o crea tu cuenta en segundos
            </p>
          </div>

          {/* Auth options */}
          <div className="space-y-4">
            {/* Primary: Phone OTP */}
            <Link href="/auth/phone" className="block">
              <button className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl gradient-brand text-white font-semibold text-base shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:opacity-95 transition-all">
                <Phone className="h-5 w-5" />
                Continuar con teléfono
                <ArrowRight className="h-4 w-4 ml-auto" />
              </button>
            </Link>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-medium">Rápido y seguro</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Info */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-2">
              <div className="flex items-start gap-3">
                <span className="text-lg">📱</span>
                <div>
                  <p className="text-sm font-medium">Verificación por SMS</p>
                  <p className="text-xs text-muted-foreground">
                    Recibirás un código de 6 dígitos en tu teléfono colombiano
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">⚡</span>
                <div>
                  <p className="text-sm font-medium">Sin contraseñas</p>
                  <p className="text-xs text-muted-foreground">
                    Acceso seguro sin necesidad de recordar contraseñas
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Terms */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Al continuar, aceptas nuestros términos y condiciones
          </p>
        </div>

        {/* Already have code */}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿Ya tienes un código?{" "}
          <Link href="/auth/verify" className="text-blue-500 hover:text-blue-400 font-medium">
            Verificar ahora
          </Link>
        </p>
      </motion.div>
    </div>
  )
}