"use client"

import { useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  QrCode,
  ShieldAlert,
  Upload,
  Wallet,
  X,
} from "lucide-react"
import {
  getApiBaseUrl,
  getTopUpConfig,
  submitTopUpRequest,
  type TopUpConfig,
  type TopUpRequestItem,
} from "@/lib/api"

function resolveTopUpQrUrl(rawUrl?: string | null): string {
  const trimmed = (rawUrl || "").trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith("/images/")) return trimmed
  const base = getApiBaseUrl().replace(/\/api\/?$/, "")
  return `${base}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`
}

interface BreBTopUpModalProps {
  open: boolean
  onClose: () => void
  onSubmitted: () => void
  title?: string
  subtitle?: string
  presetAmounts?: number[]
}

const DEFAULT_PRESETS = [20000, 50000, 100000, 200000]
const MAX_DIMENSION = 1280

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

/**
 * Comprime la captura en el navegador vía Canvas para ahorrar ancho de banda y CPU en backend.
 */
async function compressReceiptOnClient(file: File): Promise<File> {
  if (typeof window === "undefined" || file.size <= 350_000) {
    return file
  }
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        const maxSide = Math.max(img.width, img.height)
        const scale = maxSide > MAX_DIMENSION ? MAX_DIMENSION / maxSide : 1
        const canvas = document.createElement("canvas")
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          URL.revokeObjectURL(objectUrl)
          resolve(file)
          return
        }
        ctx.fillStyle = "#FFFFFF"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl)
            if (blob && blob.size < file.size) {
              const baseName = file.name.replace(/\.[^.]+$/, "") || "comprobante"
              resolve(new File([blob], `${baseName}.jpg`, { type: "image/jpeg" }))
            } else {
              resolve(file)
            }
          },
          "image/jpeg",
          0.72
        )
      } catch {
        URL.revokeObjectURL(objectUrl)
        resolve(file)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }
    img.src = objectUrl
  })
}

export function BreBTopUpModal({
  open,
  onClose,
  onSubmitted,
  title = "Recargar Créditos por Bre-B",
  subtitle = "Transfiere a nuestra llave oficial y adjunta tu comprobante",
  presetAmounts = DEFAULT_PRESETS,
}: BreBTopUpModalProps) {
  const [config, setConfig] = useState<TopUpConfig | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(false)
  const [amountInput, setAmountInput] = useState(String(presetAmounts[1] || 50000))
  const [referenceHint, setReferenceHint] = useState("")
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [compressing, setCompressing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedReq, setSubmittedReq] = useState<TopUpRequestItem | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return
    let active = true
    setError(null)
    setLoadingConfig(true)
    getTopUpConfig()
      .then((cfg) => {
        if (active) setConfig(cfg)
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "No se pudo obtener la configuración Bre-B.")
        }
      })
      .finally(() => {
        if (active) setLoadingConfig(false)
      })
    return () => {
      active = false
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  if (!open && !submittedReq) return null

  const handleClose = () => {
    if (submitting) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setReceiptFile(null)
    setReferenceHint("")
    setError(null)
    setSubmittedReq(null)
    onClose()
  }

  const handleCopyKey = async () => {
    if (!config?.payee_key) return
    try {
      await navigator.clipboard.writeText(config.payee_key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: usuario puede seleccionar el texto directamente
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    e.target.value = ""
    if (!picked) return
    setError(null)
    setCompressing(true)
    try {
      const processed = await compressReceiptOnClient(picked)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setReceiptFile(processed)
      setPreviewUrl(URL.createObjectURL(processed))
    } finally {
      setCompressing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(amountInput)
    const minAmount = config?.min_amount ?? 10000
    const maxAmount = config?.max_amount ?? 2000000

    if (!Number.isFinite(amount) || amount < minAmount || amount > maxAmount) {
      setError(`El monto debe estar entre ${formatCOP(minAmount)} y ${formatCOP(maxAmount)} COP.`)
      return
    }
    if (!receiptFile) {
      setError("Adjunta la captura del comprobante de pago.")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const created = await submitTopUpRequest({
        amount,
        referenceHint: referenceHint.trim() || undefined,
        receiptFile,
      })
      setSubmittedReq(created)
      onSubmitted()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el comprobante.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 overflow-y-auto py-8 font-mono">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />
      <div className="bg-[#080F24] border border-slate-800 rounded-3xl p-6 w-full max-w-lg relative z-10 space-y-5 my-auto shadow-2xl">
        {submittedReq ? (
          <div className="py-5 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Clock className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-100">Comprobante en revisión</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Recibimos tu solicitud por{" "}
                <span className="font-bold text-emerald-400">
                  {formatCOP(submittedReq.amount)} COP
                </span>
                . Apenas validemos la transferencia verás el saldo acreditado automáticamente.
              </p>
            </div>
            <div className="bg-[#0B132B] border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 space-y-1">
              <p>
                ID solicitud:{" "}
                <span className="text-slate-200 font-bold">{submittedReq.id.slice(0, 12)}</span>
              </p>
              {submittedReq.reference_hint && (
                <p>
                  Ref. indicada:{" "}
                  <span className="text-slate-200 font-bold">{submittedReq.reference_hint}</span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white text-xs transition-all"
            >
              Entendido
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between pb-3 border-b border-slate-800 gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-blue-400" />
                  <span>{title}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingConfig ? (
              <div className="py-10 text-center text-xs text-slate-400">
                Cargando datos Bre-B...
              </div>
            ) : config && !config.can_request ? (
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-center space-y-2">
                <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-xs font-bold text-amber-200">Recarga gestionada por tu Taller</p>
                <p className="text-[11px] text-slate-300">
                  {config.blocked_reason ||
                    "Solo el dueño o gerente del taller puede solicitar recargas."}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Datos Bre-B */}
                <div className="rounded-2xl bg-[#0B132B] border border-slate-800 p-4 flex items-center gap-4">
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                      Llave Bre-B / Nequi / Bancolombia
                    </span>
                    <p className="text-xs text-slate-300">
                      {config?.payee_name || "Tec360 Seguridad"}
                    </p>
                    <p className="text-base font-black text-white select-all truncate">
                      {config?.payee_key || "Llave por configurar"}
                    </p>
                    {config?.payee_key && (
                      <button
                        type="button"
                        onClick={handleCopyKey}
                        className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 transition-colors"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? "Llave copiada" : "Copiar llave"}</span>
                      </button>
                    )}
                  </div>

                  {config?.qr_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={resolveTopUpQrUrl(config.qr_url)}
                      alt="QR Bre-B Tec360"
                      className="w-24 h-24 rounded-xl bg-white p-1 object-contain shrink-0"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-[#080F24] border border-slate-800 flex items-center justify-center shrink-0 text-slate-500">
                      <QrCode className="w-9 h-9" />
                    </div>
                  )}
                </div>

                {/* Montos */}
                <div className="space-y-2">
                  <label className="text-[11px] text-slate-400 font-semibold block">
                    2. Monto transferido (COP)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {presetAmounts.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAmountInput(String(preset))}
                        className={`py-2 rounded-xl font-bold text-xs transition-all ${
                          Number(amountInput) === preset
                            ? "bg-[#0B1736] text-[#93C5FD] border border-[#1E3A8A]"
                            : "bg-[#0B132B] border border-slate-800 text-slate-300 hover:text-white"
                        }`}
                      >
                        {formatCOP(preset)}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                      $
                    </span>
                    <input
                      type="number"
                      min={config?.min_amount ?? 10000}
                      max={config?.max_amount ?? 2000000}
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      placeholder="50000"
                      className="w-full bg-[#0B132B] border border-slate-800 rounded-xl py-2.5 pl-7 pr-4 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400 font-semibold block">
                    Referencia o últimos 4 dígitos (opcional)
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    value={referenceHint}
                    onChange={(e) => setReferenceHint(e.target.value)}
                    placeholder="Ej: M1234 o 4821"
                    className="w-full bg-[#0B132B] border border-slate-800 rounded-xl py-2 px-3 text-xs text-white outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Comprobante */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400 font-semibold block">
                    3. Captura del comprobante
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={compressing || submitting}
                    className="w-full rounded-2xl border border-dashed border-slate-700 hover:border-blue-500/60 bg-[#0B132B] p-3.5 transition-colors text-left"
                  >
                    {compressing ? (
                      <p className="text-xs text-blue-300 text-center">Optimizando imagen...</p>
                    ) : receiptFile && previewUrl ? (
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt="Vista previa comprobante"
                          className="w-12 h-12 rounded-lg object-cover border border-slate-700"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-100 truncate">
                            {receiptFile.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {(receiptFile.size / 1024).toFixed(0)} KB · clic para cambiar
                          </p>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 py-2 text-center">
                        <Upload className="w-5 h-5 text-blue-400" />
                        <span className="text-xs font-bold text-slate-200">
                          Subir captura del comprobante
                        </span>
                        <span className="text-[10px] text-slate-400">
                          JPG, PNG o WEBP · compresión automática
                        </span>
                      </div>
                    )}
                  </button>
                </div>

                {config && !config.enabled && (
                  <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Recargas Bre-B en configuración por el administrador.</span>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || compressing || config?.enabled === false}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white text-xs shadow-lg transition-all disabled:opacity-50"
                >
                  {submitting
                    ? "Enviando comprobante..."
                    : `Enviar comprobante (${formatCOP(Number(amountInput) || 0)})`}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
