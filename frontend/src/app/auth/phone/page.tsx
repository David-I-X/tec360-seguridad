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
import { Loader2, ArrowLeft, Radio, KeyRound, Check } from "lucide-react"
import Link from "next/link"
import { Tec360Logo } from "@/components/brand/tec360-logo"

type CountryKey = "CO" | "MX"

interface CountryConfig {
  key: CountryKey
  name: string
  dialCode: string
  placeholder: string
  sample: string
  helperText: string
}

const COUNTRIES: Record<CountryKey, CountryConfig> = {
  CO: {
    key: "CO",
    name: "Colombia",
    dialCode: "+57",
    placeholder: "300 123 4567",
    sample: "+57 300 123 4567",
    helperText: "Formato: 10 dígitos (ej. 300 123 4567)",
  },
  MX: {
    key: "MX",
    name: "México",
    dialCode: "+52",
    placeholder: "55 1234 5678",
    sample: "+52 55 1234 5678",
    helperText: "Formato: 10 dígitos (CDMX, Guadalajara, Monterrey y nacional)",
  },
}

function ColombiaFlag() {
  return (
    <span className="flex flex-col w-4 h-3 rounded-[2px] overflow-hidden border border-white/20 shrink-0 shadow-xs" title="Colombia">
      <span className="h-1.5 bg-[#FCD116]" />
      <span className="h-[3px] bg-[#003893]" />
      <span className="h-[3px] bg-[#CE1126]" />
    </span>
  )
}

function MexicoFlag() {
  return (
    <span className="flex flex-row w-4 h-3 rounded-[2px] overflow-hidden border border-white/20 shrink-0 shadow-xs relative" title="México">
      <span className="w-1/3 h-full bg-[#006847]" />
      <span className="w-1/3 h-full bg-[#FFFFFF] flex items-center justify-center">
        <span className="w-1 h-1 rounded-full bg-[#8B5A2B] opacity-90" />
      </span>
      <span className="w-1/3 h-full bg-[#CE1126]" />
    </span>
  )
}

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
  const [selectedCountry, setSelectedCountry] = useState<CountryKey>("CO")
  const [phoneDigits, setPhoneDigits] = useState("")
  const [recaptchaSize, setRecaptchaSize] = useState<"invisible" | "normal">("invisible")

  const {
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
  })

  const currentCountry = COUNTRIES[selectedCountry]

  // Cambiar país manualmente
  const handleSelectCountry = (country: CountryKey) => {
    setSelectedCountry(country)
    setError("")
    // Reconstruir valor con nuevo dial code
    const fullPhone = `${COUNTRIES[country].dialCode}${phoneDigits}`
    setValue("phone", fullPhone, { shouldValidate: phoneDigits.length >= 10 })
  }

  // Manejar cambio en el input de teléfono con detección inteligente
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim()
    let digits = raw.replace(/\D/g, "")

    // Detección si pegan número con código internacional
    if (raw.startsWith("+52") || (digits.startsWith("52") && digits.length > 10)) {
      setSelectedCountry("MX")
      digits = digits.startsWith("52") ? digits.slice(2) : digits
      // Tolerar prefijo móvil '1' histórico (+52 1...)
      if (digits.length === 11 && digits.startsWith("1")) {
        digits = digits.slice(1)
      }
    } else if (raw.startsWith("+57") || (digits.startsWith("57") && digits.length > 10)) {
      setSelectedCountry("CO")
      digits = digits.startsWith("57") ? digits.slice(2) : digits
    }

    // Limitar a máximo 10 dígitos nacionales
    digits = digits.slice(0, 10)
    setPhoneDigits(digits)

    const fullPhone = `${currentCountry.dialCode}${digits}`
    setValue("phone", fullPhone, { shouldValidate: digits.length === 10 })
  }

  const onSubmit = async () => {
    try {
      setIsLoading(true)
      setError("")

      const formattedPhone = formatPhoneNumber(
        `${currentCountry.dialCode}${phoneDigits}`,
        selectedCountry
      )

      // Validación previa de longitud
      if (phoneDigits.length !== 10) {
        setError(`El número debe tener exactamente 10 dígitos para ${currentCountry.name}.`)
        setIsLoading(false)
        return
      }

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
        errorMessage = "La verificación automática reCAPTCHA fue bloqueada por el navegador. Hemos activado el captcha visible: marca la casilla 'No soy un robot' y presiona de nuevo en 'Enviar código'."
      } else if (err.code === "auth/operation-not-allowed" || err.message?.includes("SMS unable to be sent until this region enabled")) {
        errorMessage = `La región (${currentCountry.dialCode} ${currentCountry.name}) o el proveedor de Teléfono no está habilitado en Firebase. Actívalo en Firebase Console o registra el número de pruebas.`
      } else if (err.code === "auth/billing-not-enabled") {
        errorMessage = "Para SMS reales en Firebase se requiere el Plan Blaze gratuito. Para probar sin tarjeta, usa números de prueba en Firebase Console."
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Demasiados intentos en poco tiempo. Por favor espera unos minutos."
      } else if (err.code === "auth/invalid-phone-number") {
        errorMessage = "El número telefónico no tiene un formato válido para SMS."
      } else if (err.code === "auth/quota-exceeded") {
        errorMessage = "Se ha superado la cuota de SMS para este periodo."
      } else if (err.message) {
        errorMessage = err.message
      }
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050810] text-slate-100 flex items-center justify-center relative overflow-hidden px-4 pt-24 pb-12">
      {/* Silk Auroras */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-violet-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/12 rounded-full blur-[140px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Botón volver */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-xs font-mono font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-violet-400" />
          <span>TERMINAL // VOLVER AL INICIO</span>
        </Link>

        {/* Card principal */}
        <div className="p-6 sm:p-8 rounded-2xl border border-white/[0.08] bg-[#0B0F19]/90 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
          {/* Top hairline */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

          {/* Header */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center mb-5">
              <Tec360Logo size="md" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white font-display tracking-tight">
              Ingresa tu línea. <span className="text-[#a39eb8] font-normal">Acceso </span>
              <span className="text-[#00f0ff] whitespace-nowrap">[SMS]</span>
            </h1>
            <p className="mt-1.5 text-xs text-slate-400">
              Despacho de código de seguridad de 6 dígitos vía SMS cifrado
            </p>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium leading-relaxed">
              {error}
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Selector Táctico de País (Colombia / México) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
                  Región Operativa
                </Label>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded px-1.5 py-0.5">
                  {currentCountry.dialCode} {currentCountry.name.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 p-1 bg-[#111827]/90 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => handleSelectCountry("CO")}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    selectedCountry === "CO"
                      ? "bg-violet-600/30 text-white border border-violet-500/50 shadow-sm shadow-violet-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <ColombiaFlag />
                  <span>COLOMBIA (+57)</span>
                  {selectedCountry === "CO" && <Check className="w-3 h-3 text-cyan-400 ml-auto" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectCountry("MX")}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    selectedCountry === "MX"
                      ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/50 shadow-sm shadow-cyan-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <MexicoFlag />
                  <span>MÉXICO (+52)</span>
                  {selectedCountry === "MX" && <Check className="w-3 h-3 text-cyan-400 ml-auto" />}
                </button>
              </div>
            </div>

            {/* Input de Línea Telefónica */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
                Número Celular
              </Label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2 select-none border-r border-white/10 pr-2.5">
                  {selectedCountry === "CO" ? <ColombiaFlag /> : <MexicoFlag />}
                  <span className="text-xs font-mono font-bold text-slate-200">
                    {currentCountry.dialCode}
                  </span>
                </div>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={currentCountry.placeholder}
                  value={phoneDigits}
                  onChange={handlePhoneChange}
                  className="pl-24 bg-[#111827]/80 border-white/[0.12] text-white font-mono tracking-wider text-sm focus-visible:border-cyan-400 focus-visible:ring-cyan-400/20 rounded-xl py-5"
                  disabled={isLoading}
                  maxLength={10}
                  autoFocus
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-rose-400 mt-1">{errors.phone.message}</p>
              )}
              <p className="text-[11px] font-mono text-slate-500">
                {currentCountry.helperText}
              </p>
            </div>

            {/* Botón enviar */}
            <Button
              type="submit"
              className="w-full py-5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
              disabled={isLoading || phoneDigits.length < 10}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-cyan-300" />
                  Transmitiendo código...
                </>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <KeyRound className="h-4 w-4 text-violet-200" />
                  Enviar Código de Verificación
                </span>
              )}
            </Button>

            {/* Contenedor para reCAPTCHA de Firebase Phone Auth */}
            <div
              id="recaptcha-container"
              className={recaptchaSize === "normal" ? "my-3 flex justify-center min-h-[78px]" : ""}
            />
            {recaptchaSize === "normal" && (
              <p className="text-xs text-center text-amber-400 font-medium">
                Por favor marca la casilla &quot;No soy un robot&quot; arriba y haz clic de nuevo en enviar.
              </p>
            )}
          </form>

          {/* Info adicional */}
          <div className="mt-6 space-y-3.5">
            <div className="p-3.5 rounded-xl bg-violet-950/20 border border-violet-500/20 flex items-start gap-2.5">
              <Radio className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5 animate-pulse" />
              <p className="text-xs text-slate-400 leading-relaxed">
                Recibirás un SMS con una clave de un solo uso de 6 dígitos con vigencia de 5 minutos en tu operador móvil de {currentCountry.name}.
              </p>
            </div>

            <div className="text-center text-[11px] text-slate-500">
              Al continuar, confirmas la aceptación de nuestros{" "}
              <Link href="/terminos" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                términos de servicio
              </Link>{" "}
              y{" "}
              <Link href="/privacidad" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
                política de privacidad
              </Link>.
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-5 text-center">
          <p className="text-xs text-slate-400">
            ¿Ya recibiste un código activo?{" "}
            <Link href="/auth/verify" className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2">
              Ingresar código ahora
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
