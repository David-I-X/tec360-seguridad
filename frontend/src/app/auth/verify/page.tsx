"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { otpSchema } from "@/lib/validations"
import type { OTPFormData } from "@/lib/validations"
import { useAuth, PublicOnlyRoute } from "@/lib/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { isFirebaseConfigured } from "@/lib/firebase"
import { maskPhoneNumber } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft, Clock, ShieldCheck, RefreshCw, Zap } from "lucide-react"
import Link from "next/link"
import { Tec360Logo } from "@/components/brand/tec360-logo"

export default function VerifyOTPPage() {
  return (
    <PublicOnlyRoute>
      <VerifyOTPContent />
    </PublicOnlyRoute>
  )
}

function ColombiaFlag() {
  return (
    <span className="flex flex-col w-3.5 h-2.5 rounded-[2px] overflow-hidden border border-white/20 shrink-0" title="Colombia">
      <span className="h-[50%] bg-[#FCD116]" />
      <span className="h-[25%] bg-[#003893]" />
      <span className="h-[25%] bg-[#CE1126]" />
    </span>
  )
}

function MexicoFlag() {
  return (
    <span className="flex flex-row w-3.5 h-2.5 rounded-[2px] overflow-hidden border border-white/20 shrink-0 relative" title="México">
      <span className="w-1/3 h-full bg-[#006847]" />
      <span className="w-1/3 h-full bg-[#FFFFFF] flex items-center justify-center">
        <span className="w-0.5 h-0.5 rounded-full bg-[#8B5A2B]" />
      </span>
      <span className="w-1/3 h-full bg-[#CE1126]" />
    </span>
  )
}

function VerifyOTPContent() {
  const router = useRouter()
  const { verifyOTP, requestOTP, loginWithFirebaseToken } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [phone, setPhone] = useState("")
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutos en segundos
  const [canResend, setCanResend] = useState(false)
  const [isLocalHost, setIsLocalHost] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname
      const isLocal =
        host === "localhost" ||
        host === "127.0.0.1" ||
        host.startsWith("192.168.") ||
        host.startsWith("10.") ||
        process.env.NEXT_PUBLIC_USE_LOCAL_OTP === "true"
      setIsLocalHost(isLocal)
    }
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
  })

  // Cargar número de teléfono desde sessionStorage
  useEffect(() => {
    const pendingPhone = sessionStorage.getItem("pending_phone")
    if (pendingPhone) {
      setPhone(pendingPhone)
    } else {
      router.push("/auth/phone")
    }
  }, [router])

  // Timer de expiración
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true)
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  // Formatear tiempo restante
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Auto-submit cuando se completan 6 dígitos
  const codeValue = watch("code")
  useEffect(() => {
    if (codeValue?.length === 6) {
      handleSubmit(onSubmit)()
    }
  }, [codeValue])

  const onSubmit = async (data: OTPFormData) => {
    if (!phone) {
      setError("No se encontró el número de teléfono")
      return
    }

    try {
      setIsLoading(true)
      setError("")

      let response
      const confirmationResult = typeof window !== "undefined" ? (window as any).confirmationResult : null
      const authProvider = typeof window !== "undefined" ? sessionStorage.getItem("auth_provider") : null

      if (authProvider === "firebase" && confirmationResult && data.code !== "123456") {
        try {
          // Validación con Google Firebase Phone Auth
          const { confirmFirebaseOTP } = await import("@/lib/firebase")
          const idToken = await confirmFirebaseOTP(confirmationResult, data.code)
          response = await loginWithFirebaseToken(idToken)
          delete (window as any).confirmationResult
        } catch (firebaseErr: any) {
          if (isLocalHost || data.code === "123456") {
            console.warn("Fallback suave a verifyOTP local tras error de Firebase:", firebaseErr)
            response = await verifyOTP(phone, data.code)
          } else {
            throw firebaseErr
          }
        }
      } else {
        // Fallback a verificación local/dev backend (/auth/verify-otp)
        response = await verifyOTP(phone, data.code)
      }

      sessionStorage.removeItem("pending_phone")

      toast({
        title: "✅ Verificación exitosa",
        description: response?.isNewUser ? "¡Bienvenido a Tec360! Completa tu perfil para continuar." : "¡Bienvenido de vuelta!",
      })
    } catch (err: any) {
      console.error("Error al verificar código:", err)
      let errorMessage = "Código incorrecto. Intenta de nuevo."
      if (err.code === "auth/invalid-verification-code") {
        errorMessage = "El código ingresado es incorrecto. Verifica los 6 dígitos."
      } else if (err.code === "auth/code-expired") {
        errorMessage = "El código de verificación ha expirado. Solicita un nuevo código."
      } else if (err.message) {
        errorMessage = err.message
      }
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!canResend || !phone) return

    try {
      setIsLoading(true)
      setError("")

      const authProvider = typeof window !== "undefined" ? sessionStorage.getItem("auth_provider") : null

      if (!isLocalHost && authProvider === "firebase" && isFirebaseConfigured && (window as any).recaptchaVerifier) {
        const { sendFirebaseOTP } = await import("@/lib/firebase")
        const confirmation = await sendFirebaseOTP(phone, (window as any).recaptchaVerifier)
        ;(window as any).confirmationResult = confirmation
      } else {
        await requestOTP(phone)
      }

      setTimeLeft(300)
      setCanResend(false)

      toast({
        title: "Código reenviado",
        description: isLocalHost ? "Código activo en local: 123456" : "Hemos emitido un nuevo código SMS a tu línea.",
      })
    } catch (err: any) {
      setError(err.message || "Error al reenviar código")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050810] text-slate-100 flex items-center justify-center relative overflow-hidden px-4 pt-24 pb-12">
      {/* Silk Auroras */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-violet-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-cyan-500/12 rounded-full blur-[140px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Botón volver */}
        <Link
          href="/auth/phone"
          className="mb-6 inline-flex items-center gap-2 text-xs font-mono font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-violet-400" />
          <span>CAMBIAR LÍNEA MÓVIL</span>
        </Link>

        {/* Card principal */}
        <div className="p-6 sm:p-8 rounded-2xl border border-white/[0.08] bg-[#0B0F19]/90 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
          {/* Top hairline */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

          {/* Header */}
          <div className="mb-7 text-center">
            <div className="flex items-center justify-center mb-5">
              <Tec360Logo size="md" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white font-display tracking-tight">
              Verifica tu código. <span className="text-[#a39eb8] font-normal">Clave </span>
              <span className="text-[#00f0ff] whitespace-nowrap">[OTP]</span>
            </h1>
            <p className="mt-1.5 text-xs text-slate-400">
              Transmitido a la línea celular registrada
            </p>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08]">
              {phone.startsWith("+52") ? <MexicoFlag /> : <ColombiaFlag />}
              <span className="text-xs font-mono font-bold text-cyan-300">
                {phone ? maskPhoneNumber(phone) : "..."}
              </span>
            </div>
          </div>

          {/* Timer */}
          <div className="mb-6 flex items-center justify-center gap-2 text-xs font-mono">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span className={timeLeft <= 60 ? "text-rose-400 font-bold" : "text-slate-400"}>
              {canResend ? "CÓDIGO EXPIRADO" : `Válido durante: ${formatTime(timeLeft)}`}
            </span>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium leading-relaxed">
              {error}
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="code" className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
                  Clave de Seguridad (6 Dígitos)
                </Label>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded px-1.5 py-0.5">
                  SMS TOKEN
                </span>
              </div>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="••••••"
                maxLength={6}
                {...register("code")}
                className="text-center text-3xl font-mono tracking-[0.5em] py-6 bg-[#111827]/80 border-white/[0.12] text-white focus-visible:border-cyan-400 focus-visible:ring-cyan-400/20 rounded-xl"
                disabled={isLoading}
                autoFocus
                autoComplete="one-time-code"
              />
              {errors.code && (
                <p className="text-xs text-rose-400 mt-1">{errors.code.message}</p>
              )}
              <p className="text-[11px] font-mono text-slate-500 text-center">
                Validación automática al completar el sexto dígito
              </p>

              {/* Ayudante en Entorno Local (Solo visible en dev/localhost) */}
              {isLocalHost && (
                <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-cyan-300">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    <span>Código Local: <strong className="text-amber-400 font-bold">123456</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setValue("code", "123456", { shouldValidate: true })}
                    className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-[11px] font-bold transition-all cursor-pointer"
                  >
                    Autocompletar
                  </button>
                </div>
              )}
            </div>

            {/* Botón verificar */}
            <Button
              type="submit"
              className="w-full py-5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
              disabled={isLoading || !codeValue || codeValue.length < 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-cyan-300" />
                  Verificando credencial...
                </>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  Verificar código
                </span>
              )}
            </Button>
          </form>

          {/* Reenviar código */}
          <div className="mt-6 text-center">
            {canResend ? (
              <Button
                variant="ghost"
                onClick={handleResendCode}
                disabled={isLoading}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reenviar nuevo código SMS
              </Button>
            ) : (
              <p className="text-xs font-mono text-slate-500">
                ¿No recibiste el SMS? Espera {formatTime(timeLeft)} para reintentar.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
