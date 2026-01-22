"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { phoneSchema, formatPhoneNumber } from "@/lib/validations"
import type { PhoneFormData } from "@/lib/validations"
import { useAuth, PublicOnlyRoute } from "@/lib/auth-context"
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

      // Solicitar OTP
      await requestOTP(formattedPhone)

      // Guardar teléfono en sessionStorage para la página de verificación
      sessionStorage.setItem("pending_phone", formattedPhone)

      // Redirigir a página de verificación
      router.push("/auth/verify")
    } catch (err: any) {
      setError(err.message || "Error al enviar código. Intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600/5 via-background to-background p-4">
      <div className="w-full max-w-md">
        {/* Botón volver */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        {/* Card principal */}
        <Card className="p-8 border-border bg-card/50 backdrop-blur-sm">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Ingresa tu número</h1>
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
              className="w-full bg-blue-600 hover:bg-blue-700"
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
              <button
                type="button"
                onClick={() => setError("Términos y condiciones próximamente disponibles")}
                className="text-blue-600 hover:text-blue-700"
              >
                términos y condiciones
              </button>
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