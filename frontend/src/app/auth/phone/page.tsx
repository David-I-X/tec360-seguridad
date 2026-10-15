"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { phoneSchema, formatPhoneNumber } from "@/lib/validations"
import type { PhoneFormData } from "@/lib/validations"
import { useAuth, PublicOnlyRoute } from "@/lib/auth-context"
import { setupRecaptcha, sendFirebaseOTP } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Loader2, Smartphone, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function PhoneAuthPage() {
  return (
    <PublicOnlyRoute>
      <PhoneAuthContent />
    </PublicOnlyRoute>
  )
}

function PhoneAuthContent() {
  const router = useRouter()
  const { requestOTP } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [phoneInput, setPhoneInput] = useState("")

  const [recaptchaSize, setRecaptchaSize] = useState<"invisible" | "normal">("invisible")

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
  })

  // Formatear teléfono mientras escribe
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value

    // Remover todo excepto números y +
    value = value.replace(/[^\d+]/g, "")

    // Si empieza con 57, agregar +
    if (value.startsWith("57") && !value.startsWith("+")) {
      value = `+${value}`
    }

    // Si empieza con 3 (número colombiano sin código), agregar +57
    if (value.match(/^3\d*$/)) {
      value = `+57${value}`
    }

    // Limitar a 13 caracteres (+57 + 10 dígitos)
    if (value.startsWith("+57")) {
      value = value.slice(0, 13)
    }

    setPhoneInput(value)
    setValue("phone", value, { shouldValidate: true })
  }

  const onSubmit = async (data: PhoneFormData) => {
    try {
      setIsLoading(true)
      setError("")

      // Formatear teléfono
      const formattedPhone = formatPhoneNumber(data.phone)

      if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        // Enviar OTP vía Google Firebase Phone Auth (10.000 SMS gratis)
        const verifier = await setupRecaptcha("recaptcha-container", recaptchaSize)
        const confirmation = await sendFirebaseOTP(formattedPhone, verifier)
        ;(window as any).confirmationResult = confirmation
        sessionStorage.setItem("auth_provider", "firebase")
      } else {
        // Fallback a OTP local/dev
        await requestOTP(formattedPhone)
        sessionStorage.setItem("auth_provider", "local")
      }

      // Guardar teléfono en sessionStorage para la página de verificación
      sessionStorage.setItem("pending_phone", formattedPhone)

      // Redirigir a página de verificación
      router.push("/auth/verify")
    } catch (err: any) {
      console.error("Error al enviar OTP:", err)
      let errorMessage = "Error al enviar código. Intenta de nuevo."
      if (err.code === "auth/invalid-app-credential") {
        setRecaptchaSize("normal")
        errorMessage = "La verificación automática reCAPTCHA fue bloqueada por el navegador (cookies de terceros o localhost). Hemos activado el captcha visible: marca la casilla 'No soy un robot' que aparece abajo y haz clic de nuevo en 'Enviar código'."
      } else if (err.code === "auth/operation-not-allowed" || err.message?.includes("SMS unable to be sent until this region enabled")) {
        errorMessage = "La región (+57 Colombia) o el proveedor de Teléfono no está habilitado en Firebase. Activa Colombia en Firebase Console (Authentication > Sign-in method > Teléfono > SMS Region Policy) o registra el número en 'Números para pruebas'."
      } else if (err.code === "auth/billing-not-enabled") {
        errorMessage = "Para enviar SMS reales, Firebase exige activar el Plan Blaze (gratuito hasta 10.000 SMS/mes sin costo inicial). Para probar sin tarjeta, agrega tu número en 'Números de teléfono para pruebas' en Firebase Console."
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Demasiados intentos en poco tiempo. Por favor espera unos minutos."
      } else if (err.code === "auth/invalid-phone-number") {
        errorMessage = "El número telefónico no tiene un formato válido para SMS."
      } else if (err.code === "auth/quota-exceeded") {
        errorMessage = "Se ha superado la cuota de SMS de Firebase para este periodo."
      } else if (err.message) {
        errorMessage = err.message
      }
      setError(errorMessage)
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
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        {/* Card principal */}
        <Card className="p-8 border-border bg-card/80 backdrop-blur-xl shadow-2xl rounded-2xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-brand shadow-lg shadow-blue-500/30">
              <Smartphone className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold">Ingresa tu <span className="gradient-text">número</span></h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Te enviaremos un código de verificación por SMS
            </p>
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
              <Label htmlFor="phone">Número de teléfono</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-muted-foreground">
                  <span className="text-sm font-medium">🇨🇴</span>
                  <span className="text-sm">+57</span>
                </div>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="300 123 4567"
                  value={phoneInput}
                  onChange={handlePhoneChange}
                  className="pl-20"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Formato: +57 seguido de 10 dígitos
              </p>
            </div>

            {/* Botón enviar */}
            <Button
              type="submit"
              className="w-full gradient-brand text-white hover:opacity-90 shadow-lg shadow-blue-500/25"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando código...
                </>
              ) : (
                "Enviar código de verificación"
              )}
            </Button>

            {/* Contenedor para reCAPTCHA de Firebase Phone Auth */}
            <div
              id="recaptcha-container"
              className={recaptchaSize === "normal" ? "my-3 flex justify-center min-h-[78px]" : ""}
            />
            {recaptchaSize === "normal" && (
              <p className="text-xs text-center text-amber-500 font-medium">
                Por favor marca la casilla &quot;No soy un robot&quot; arriba y haz clic de nuevo en enviar.
              </p>
            )}
          </form>

          {/* Info adicional */}
          <div className="mt-6 space-y-4">
            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Tip:</strong> Recibirás un SMS con un código de 6 dígitos.
                El código expira en 5 minutos.
              </p>
            </div>

            <div className="text-center text-xs text-muted-foreground">
              Al continuar, aceptas nuestros{" "}
              <Link href="/terminos" className="text-blue-600 hover:text-blue-700 underline">
                términos y condiciones
              </Link>
            </div>
          </div>
        </Card>

        {/* Footer info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            ¿Ya tienes un código?{" "}
            <Link href="/auth/verify" className="text-blue-600 hover:text-blue-700 font-medium">
              Verificar ahora
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}