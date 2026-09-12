"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  ShieldCheck,
  Search,
  Award,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  Download,
  Copy,
  Check,
  ExternalLink,
  GraduationCap,
  Sparkles,
  ArrowLeft,
  AlertTriangle
} from "lucide-react"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface CertificateData {
  certificate_code: string
  student_name: string
  course_title: string
  category: string
  completion_date: string
  score: number
  instructor_name: string
  is_valid: boolean
}

function CertificateVerifierInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialCode = searchParams?.get("code") || ""

  const [code, setCode] = useState(initialCode)
  const [isSearching, setIsSearching] = useState(false)
  const [certData, setCertData] = useState<CertificateData | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)

  const verifyCode = async (codeToVerify: string) => {
    const clean = codeToVerify.trim()
    if (!clean) return

    try {
      setIsSearching(true)
      setErrorMsg(null)
      setCertData(null)

      const res = await api.courses.verifyCertificate(clean)
      if (res && res.data) {
        setCertData(res.data)
      } else {
        setErrorMsg("Certificado no encontrado en el sistema de Tec360.")
      }
    } catch (err: any) {
      console.error("Error verificando certificado:", err)
      setErrorMsg("El código ingresado no corresponde a ningún certificado válido emitido por Tec360.")
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode)
      verifyCode(initialCode)
    }
  }, [initialCode])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim()) {
      router.push(`/escuela/verificar?code=${encodeURIComponent(code.trim())}`)
      verifyCode(code.trim())
    }
  }

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pt-24 pb-24 px-4 md:px-8 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-10 left-1/3 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto space-y-8 relative z-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link
            href="/escuela"
            className="hover:text-purple-400 transition-colors flex items-center gap-1 font-semibold text-slate-300"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a Escuela Tec
          </Link>
          <span>/</span>
          <span className="text-slate-200">Verificación Oficial de Diplomas</span>
        </div>

        {/* Verification Hero Search Box */}
        <div className="rounded-3xl p-8 md:p-10 border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-purple-950/30 backdrop-blur-2xl shadow-2xl text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-400 mx-auto shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
              Verificador de Certificados
            </h1>
            <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
              Consulta pública y validación de autenticidad para clientes, flotas y aseguradoras.
              Ingresa el código único alfanumérico impreso en el diploma.
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="max-w-md mx-auto flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Ej: TEC-GPS-A1B2-C3D4"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="pl-10 font-mono text-sm uppercase bg-slate-900/80 border-slate-800 focus:border-purple-500 text-white placeholder:text-slate-600 rounded-xl"
              />
            </div>
            <Button
              type="submit"
              disabled={isSearching || !code.trim()}
              className="rounded-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-600/20 px-5"
            >
              {isSearching ? "Consultando..." : "Verificar"}
            </Button>
          </form>
        </div>

        {/* ============================================================ */}
        {/* CERTIFICATE RESULT CARD */}
        {/* ============================================================ */}
        <AnimatePresence mode="wait">
          {certData && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 via-slate-900 to-purple-950/20 backdrop-blur-2xl shadow-2xl p-8 md:p-12 relative overflow-hidden space-y-8"
            >
              {/* Subtle Guilloche Watermark Icon in background */}
              <div className="absolute top-1/2 right-6 -translate-y-1/2 w-64 h-64 text-emerald-500/5 pointer-events-none">
                <Award className="w-full h-full" />
              </div>

              {/* Status Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      <Sparkles className="w-3 h-3" /> Certificado Oficial Válido
                    </span>
                    <h2 className="text-xl font-bold text-white">
                      Acreditación Tec360 Seguridad
                    </h2>
                  </div>
                </div>

                {/* Score Pill */}
                <div className="px-4 py-2 rounded-2xl bg-slate-900/90 border border-emerald-500/40 text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                    Calificación Obtenida
                  </span>
                  <span className="text-lg font-black text-emerald-400">
                    {certData.score}% (Aprobación Estricta)
                  </span>
                </div>
              </div>

              {/* Certificate Details Body */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" /> Técnico Titular
                  </span>
                  <p className="text-lg font-extrabold text-white">
                    {certData.student_name}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-500" /> Programa Técnico
                  </span>
                  <p className="text-lg font-extrabold text-white">
                    {certData.course_title}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" /> Fecha de Certificación
                  </span>
                  <p className="text-sm font-semibold text-slate-200">
                    {new Date(certData.completion_date).toLocaleDateString("es-CO", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-slate-500" /> Emisor & Instructor
                  </span>
                  <p className="text-sm font-semibold text-slate-200">
                    {certData.instructor_name}
                  </p>
                </div>
              </div>

              {/* Code Verification Box */}
              <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-semibold">
                    Hash / Código de Registro
                  </span>
                  <code className="text-base md:text-lg font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-300">
                    {certData.certificate_code}
                  </code>
                </div>

                <button
                  onClick={() => handleCopyCode(certData.certificate_code)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors w-fit"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copiar Código
                    </>
                  )}
                </button>
              </div>

              {/* Download PDF Action */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80">
                <p className="text-xs text-slate-400">
                  Documento protegido con firma criptográfica Tec360.
                </p>

                <a
                  href={`${apiBase}/api/courses/certificates/${certData.certificate_code}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto"
                >
                  <Button className="w-full rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-xl shadow-emerald-600/30 gap-2">
                    <Download className="w-4 h-4" /> Descargar Certificado Oficial en PDF
                  </Button>
                </a>
              </div>
            </motion.div>
          )}

          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-3xl border border-rose-500/40 bg-gradient-to-br from-rose-950/30 via-slate-900 to-slate-950 backdrop-blur-2xl shadow-2xl p-8 text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
                <XCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Certificado no encontrado</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                {errorMsg}
              </p>
              <p className="text-xs text-slate-500">
                Verifica que no haya espacios extra o errores tipográficos en el código.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function CertificateVerifierPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 pt-24 pb-20 px-4 text-center">
          <div className="max-w-md mx-auto py-20 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 mx-auto animate-pulse" />
            <p className="text-slate-400 text-sm">Cargando verificador oficial...</p>
          </div>
        </div>
      }
    >
      <CertificateVerifierInner />
    </Suspense>
  )
}