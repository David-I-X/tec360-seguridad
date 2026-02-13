"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { otpSchema } from "@/lib/validations"
import type { OTPFormData } from "@/lib/validations"
import { useAuth, PublicOnlyRoute } from "@/lib/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { maskPhoneNumber } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Loader2, ShieldCheck, ArrowLeft, Clock } from "lucide-react"
import Link from "next/link"

export default function VerifyOTPPage() {
  return (
    <PublicOnlyRoute>
      <VerifyOTPContent />
    </PublicOnlyRoute>
  )
}

function VerifyOTPContent() {
  const router = useRouter()
  const { verifyOTP, requestOTP, user } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [phone, setPhone] = useState("")
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutos en segundos
  const [canResend, setCanResend] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
  })

  // Cargar número de teléfono desde sessionStorage
  useEffect(() => {
    const pendingPhone = sessionStorage.getItem("pending_phone")
    if (pendingPhone) {
      setPhone(pendingPhone)
    } else {
      // Si no hay teléfono guardado, redirigir a /auth/phone
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

      // Verificar OTP
      const response = await verifyOTP(phone, data.code)

      // Limpiar sessionStorage
      sessionStorage.removeItem("pending_phone")

      toast({
        title: "✅ Verificación exitosa",
        description: response.isNewUser ? "¡Bienvenido! Completa tu perfil para continuar." : "¡Bienvenido de vuelta!",
      })
    } catch (err: any) {
      setError(err.message || "Código incorrecto. Intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!canResend || !phone) return

    try {
      setIsLoading(true)
      setError("")

      await requestOTP(phone)

      // Reiniciar timer
      setTimeLeft(300)
      setCanResend(false)

      // Mostrar mensaje de éxito
      setError("") // Limpiar errores previos
    } catch (err: any) {
      setError(err.message || "Error al reenviar código")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      <div className="absolute inset-0 mesh-gradient" />
      <div className="absolute top-20 left-[15%] w-72 h-72 bg-blue-500/8 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-[15%] w-80 h-80 bg-purple-500/6 rounded-full blur-3xl animate-float delay-500" />
      <div className="w-full max-w-md relative z-10">
        {/* Botón volver */}
        <Link
          href="/auth/phone"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Cambiar número
        </Link>

        {/* Card principal */}
        <Card className="p-8 border-border bg-card/80 backdrop-blur-xl shadow-2xl rounded-2xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-brand shadow-lg shadow-blue-500/30">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold">Verifica tu <span className="gradient-text">número</span></h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ingresa el código que enviamos a
            </p>
            <p className="mt-1 text-sm font-medium">
              {phone ? maskPhoneNumber(phone) : "..."}
            </p>
          </div>

          {/* Timer */}
          <div className="mb-6 flex items-center justify-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className={timeLeft <= 60 ? "text-destructive font-medium" : "text-muted-foreground"}>
              {canResend ? "Código expirado" : `Expira en ${formatTime(timeLeft)}`}
            </span>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="code">Código de verificación</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="000000"
                maxLength={6}
                {...register("code")}
                className="text-center text-2xl tracking-widest font-mono"
                disabled={isLoading}
                autoFocus
                autoComplete="one-time-code"
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              )}
              <p className="text-xs text-muted-foreground text-center">
                Ingresa los 6 dígitos del SMS
              </p>
            </div>

            {/* Botón verificar */}
            <Button
              type="submit"
              className="w-full gradient-brand text-white hover:opacity-90 shadow-lg shadow-blue-500/25"
              disabled={isLoading || !codeValue || codeValue.length < 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Verificar código"
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
                className="text-blue-600 hover:text-blue-700"
              >
                Reenviar código
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                ¿No recibiste el código?{" "}
                <span className="text-blue-600">
                  Espera {formatTime(timeLeft)}
                </span>
              </p>
            )}
          </div>

          {/* Info adicional */}
          <div className="mt-6">
            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Tip:</strong> El código se verifica automáticamente cuando ingresas los 6 dígitos.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}