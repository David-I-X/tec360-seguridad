"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format, addDays, startOfDay, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, ArrowRight, ArrowLeft, MapPin, Check, Car, Clock, DollarSign, ShieldAlert } from "lucide-react"
import dynamic from "next/dynamic"

import { cn } from "@/lib/utils"
import { createServiceRequest } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { GlassCard } from "@/components/ui/glass-card"
import { ServiceTypeSelector } from "@/components/services/service-type-selector"

// Importar LocationPicker dinámicamente (no SSR para Leaflet)
const LocationPicker = dynamic(
    () => import("@/components/services/location-picker"),
    {
        ssr: false,
        loading: () => <div className="h-[300px] w-full bg-muted/20 animate-pulse rounded-xl" />
    }
)

// Tipos de vehículo
const vehicleTypes = [
    { value: "car", label: "Carro", icon: "🚗" },
    { value: "motorcycle", label: "Moto", icon: "🏍️" },
    { value: "heavy_cargo", label: "Carga Pesada", icon: "🚛" },
]

const TODAY = startOfDay(new Date())
const MAX_DATE = addDays(TODAY, 5)

const serviceSchema = z.object({
    service_type: z.string().min(1, "Selecciona un tipo de servicio"),
    description: z.string().optional(),
    address: z.string().min(5, "Ingresa una referencia de dirección"),
    estimated_price: z.number({
        required_error: "Ingresa el precio ofrecido",
        invalid_type_error: "Ingresa un número válido",
    }).min(30, "El precio mínimo es $30.000 COP"),
    scheduled_date: z.date({
        required_error: "Selecciona una fecha preferida",
    }).refine(d => startOfDay(d) >= TODAY, "No puedes seleccionar fechas pasadas")
        .refine(d => startOfDay(d) <= MAX_DATE, "Máximo 5 días desde hoy"),
    scheduled_time: z.string().min(1, "Selecciona una hora"),
    vehicle_type: z.string().min(1, "Selecciona un tipo de vehículo"),
    vehicle_model: z.string().min(1, "Ingresa el modelo del vehículo"),
    vehicle_plate: z.string().min(1, "Ingresa la placa del vehículo"),
    lat: z.number().optional(),
    lng: z.number().optional()
})

export type ServiceValues = z.infer<typeof serviceSchema> & {
    vehiclePhotoFile?: File
}

const steps = [
    { id: 0, title: "Servicio" },
    { id: 1, title: "Vehículo" },
    { id: 2, title: "Ubicación" },
    { id: 3, title: "Detalles" }
]

export function ServiceRequestForm() {
    const [step, setStep] = useState(0)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState("")
    const [createdServiceId, setCreatedServiceId] = useState<string | null>(null)
    const [vehiclePhotoPreview, setVehiclePhotoPreview] = useState<string | null>(null)
    const [vehiclePhotoFile, setVehiclePhotoFile] = useState<File | null>(null)
    const [showDayPicker, setShowDayPicker] = useState(false)
    const [formMode, setFormMode] = useState<"normal" | "recovery">("normal")

    // Recovery-specific state
    const [recStolenDate, setRecStolenDate] = useState("")
    const [recStolenTime, setRecStolenTime] = useState("")
    const [recHasGps, setRecHasGps] = useState<"yes" | "no" | "unknown">("unknown")
    const [recGpsBrand, setRecGpsBrand] = useState("")
    const [recVehicleColor, setRecVehicleColor] = useState("")
    const [recDistinctiveMarks, setRecDistinctiveMarks] = useState("")
    const [recPoliceReport, setRecPoliceReport] = useState("")
    const [recDescription, setRecDescription] = useState("")
    const [recAdditionalPhone, setRecAdditionalPhone] = useState("")
    const [recVehicleType, setRecVehicleType] = useState("")
    const [recVehicleModel, setRecVehicleModel] = useState("")
    const [recVehiclePlate, setRecVehiclePlate] = useState("")
    const [recAddress, setRecAddress] = useState("")
    const [recLat, setRecLat] = useState<number | undefined>(undefined)
    const [recLng, setRecLng] = useState<number | undefined>(undefined)
    const [recSubmitting, setRecSubmitting] = useState(false)
    const [recError, setRecError] = useState("")

    const form = useForm<ServiceValues>({
        resolver: zodResolver(serviceSchema) as any,
        defaultValues: {
            service_type: "",
            description: "",
            address: "",
            estimated_price: 0,
            scheduled_date: new Date(),
            scheduled_time: "10:00",
            vehicle_type: "",
            vehicle_model: "",
            vehicle_plate: "",
            lat: undefined,
            lng: undefined,
            vehiclePhotoFile: undefined
        }
    })

    const handleVehiclePhoto = (file: File) => {
        setVehiclePhotoFile(file)
        form.setValue("vehiclePhotoFile", file)
        setVehiclePhotoPreview(URL.createObjectURL(file))
    }

    // Prevención de pérdida de datos
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (form.formState.isDirty && !isSubmitting && !success) {
                e.preventDefault()
                e.returnValue = "" // El navegador mostrará su mensaje estándar
            }
        }
        window.addEventListener("beforeunload", handleBeforeUnload)
        return () => window.removeEventListener("beforeunload", handleBeforeUnload)
    }, [form.formState.isDirty, isSubmitting, success])

    // Validación por paso
    const nextStep = async () => {
        let isValid = false
        if (step === 0) {
            isValid = await form.trigger("service_type")
        } else if (step === 1) {
            isValid = await form.trigger(["vehicle_type", "vehicle_model", "vehicle_plate"])
        } else if (step === 2) {
            isValid = await form.trigger("address")
        } else {
            isValid = await form.trigger()
        }

        if (isValid) setStep(s => s + 1)
    }

    const prevStep = () => setStep(s => s - 1)

    // ============================================
    // PHOTO COMPRESSION
    // ============================================
    const compressImage = (file: File, maxSizePx = 1200, quality = 0.82): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = (event) => {
                const img = new Image()
                img.src = event.target?.result as string
                img.onload = () => {
                    const canvas = document.createElement("canvas")
                    let { width, height } = img

                    if (width > height) {
                        if (width > maxSizePx) {
                            height = Math.round((height * maxSizePx) / width)
                            width = maxSizePx
                        }
                    } else {
                        if (height > maxSizePx) {
                            width = Math.round((width * maxSizePx) / height)
                            height = maxSizePx
                        }
                    }

                    canvas.width = width
                    canvas.height = height
                    const ctx = canvas.getContext("2d")
                    ctx?.drawImage(img, 0, 0, width, height)

                    canvas.toBlob(
                        (blob) => {
                            if (blob) resolve(blob)
                            else reject(new Error("Canvas toBlob failed"))
                        },
                        "image/jpeg",
                        quality
                    )
                }
                img.onerror = (err) => reject(err)
            }
            reader.onerror = (err) => reject(err)
        })
    }

    async function onSubmit(data: ServiceValues) {
        setIsSubmitting(true)
        setError("")

        try {
            const typeLabel = {
                "camera_installation": "Instalación Dashcam",
                "alarm_installation": "Instalación de Alarma",
                "gps_installation": "Instalación de GPS",
                "camera_maintenance": "Mantenimiento Dashcam",
                "alarm_maintenance": "Mantenimiento Alarma",
                "gps_maintenance": "Mantenimiento GPS",
                "other": "Servicio Técnico"
            }[data.service_type] || "Servicio"

            const vehicleLabel = vehicleTypes.find(v => v.value === data.vehicle_type)?.label || ""

            // Combine date + time — preserve local time (avoid UTC conversion from toISOString)
            const [hours, minutes] = data.scheduled_time.split(":").map(Number)
            const d = new Date(data.scheduled_date)
            d.setHours(hours, minutes, 0, 0)
            const pad = (n: number) => n.toString().padStart(2, "0")
            const localISO = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hours)}:${pad(minutes)}:00`

            const title = `${typeLabel} - ${vehicleLabel} ${data.vehicle_model} - ${format(data.scheduled_date, "dd/MM/yyyy")}`

            const result = await createServiceRequest({
                service_type: data.service_type,
                title: title,
                description: data.description ?? "",
                service_address: data.address,
                service_city: "Medellín",
                service_lat: data.lat || 6.2442,
                service_lon: data.lng || -75.5636,
                scheduled_date: localISO,
                client_notes: data.description ?? "",
                vehicle_type: data.vehicle_type,
                vehicle_model: data.vehicle_model,
                vehicle_plate: data.vehicle_plate,
                estimated_price: data.estimated_price
            })

            // If there's a vehicle photo, compress and upload it
            if (data.vehiclePhotoFile && result.id) {
                try {
                    const compressedBlob = await compressImage(data.vehiclePhotoFile)
                    const compressedFile = new File([compressedBlob], data.vehiclePhotoFile.name, {
                        type: "image/jpeg",
                        lastModified: Date.now(),
                    })

                    const formData = new FormData()
                    formData.append("file", compressedFile)
                    formData.append("service_id", result.id)

                    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
                    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

                    await fetch(`${API_URL}/uploads/vehicle-photo`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` },
                        body: formData,
                    })
                } catch (photoErr) {
                    console.error("Error al subir foto del vehículo:", photoErr)
                    // We don't block the flow if photo fails, just log it
                }
            }

            setCreatedServiceId(result.id)
            setSuccess(true)
        } catch (err: any) {
            setError(err.message || "Error al crear solicitud")
        } finally {
            setIsSubmitting(false)
        }
    }

    // ============================================
    // RECOVERY SUBMISSION
    // ============================================
    async function onRecoverySubmit() {
        setRecSubmitting(true)
        setRecError("")
        try {
            if (!recVehicleType || !recVehicleModel || !recVehiclePlate || !recAddress) {
                setRecError("Completa todos los campos obligatorios")
                setRecSubmitting(false)
                return
            }

            const title = `🚨 Recuperación - ${recVehicleType === "motorcycle" ? "Moto" : "Carro"} ${recVehicleModel} (${recVehiclePlate})`

            const result = await createServiceRequest({
                service_type: "vehicle_recovery",
                title,
                description: recDescription || "Solicitud de recuperación de vehículo robado",
                service_address: recAddress,
                service_city: "Medellín",
                service_lat: recLat || 6.2442,
                service_lon: recLng || -75.5636,
                vehicle_type: recVehicleType,
                vehicle_model: recVehicleModel,
                vehicle_plate: recVehiclePlate,
                service_metadata: {
                    stolen_datetime: recStolenDate && recStolenTime ? `${recStolenDate}T${recStolenTime}` : recStolenDate || null,
                    has_gps: recHasGps,
                    gps_brand: recHasGps === "yes" ? recGpsBrand : null,
                    vehicle_color: recVehicleColor || null,
                    distinctive_marks: recDistinctiveMarks || null,
                    police_report_number: recPoliceReport || null,
                    additional_phone: recAdditionalPhone || null,
                },
            })

            setCreatedServiceId(result.id)
            setSuccess(true)
        } catch (err: any) {
            setRecError(err.message || "Error al crear solicitud de recuperación")
        } finally {
            setRecSubmitting(false)
        }
    }

    if (success && createdServiceId) {
        window.location.href = `/servicios/${createdServiceId}/esperando`
        return null
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* ========== MODE SELECTOR ========== */}
            <div className="mb-8 grid grid-cols-2 gap-3">
                <button
                    type="button"
                    onClick={() => setFormMode("normal")}
                    className={cn(
                        "flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                        formMode === "normal"
                            ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/20"
                            : "border-muted hover:border-primary/50 bg-muted/20"
                    )}
                >
                    <span className="text-2xl">🔧</span>
                    <span className="font-semibold">Servicio Técnico</span>
                </button>
                <button
                    type="button"
                    onClick={() => setFormMode("recovery")}
                    className={cn(
                        "flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                        formMode === "recovery"
                            ? "border-red-500 bg-red-500/10 text-red-400 shadow-lg shadow-red-500/20"
                            : "border-muted hover:border-red-500/50 bg-muted/20 text-muted-foreground"
                    )}
                >
                    <ShieldAlert className="h-5 w-5" />
                    <span className="font-semibold">Equipo de Reacción</span>
                </button>
            </div>

            {/* ========== RECOVERY FORM ========== */}
            {formMode === "recovery" ? (
                <GlassCard className="p-6 md:p-8" gradient>
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
                            <ShieldAlert className="h-4 w-4" />
                            Recuperación de Vehículo Robado
                        </div>
                        <h2 className="text-2xl font-bold">Reportar Robo</h2>
                        <p className="text-muted-foreground text-sm mt-1">Completa la información para activar al equipo de reacción</p>
                    </div>

                    <div className="space-y-5">
                        {/* Vehicle type */}
                        <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Tipo de Vehículo *</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[{ value: "motorcycle", label: "Moto", icon: "🏍️" }, { value: "car", label: "Carro", icon: "🚗" }].map((vt) => (
                                    <button
                                        key={vt.value}
                                        type="button"
                                        onClick={() => setRecVehicleType(vt.value)}
                                        className={cn(
                                            "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                                            recVehicleType === vt.value ? "border-red-500 bg-red-500/10" : "border-muted hover:border-red-500/50 bg-muted/20"
                                        )}
                                    >
                                        <span className="text-3xl">{vt.icon}</span>
                                        <span className="text-sm font-semibold">{vt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Vehicle model + plate */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Modelo *</label>
                                <Input placeholder="Ej: Honda CB 190R" value={recVehicleModel} onChange={(e) => setRecVehicleModel(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Placa *</label>
                                <Input placeholder="ABC123" className="uppercase font-mono" maxLength={10} value={recVehiclePlate} onChange={(e) => setRecVehiclePlate(e.target.value.toUpperCase())} />
                            </div>
                        </div>

                        {/* Color + Distinctive marks */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Color del vehículo</label>
                                <Input placeholder="Ej: Rojo, Negro mate" value={recVehicleColor} onChange={(e) => setRecVehicleColor(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Marcas Distintivas</label>
                                <Input placeholder="Stickers, rayas, etc." value={recDistinctiveMarks} onChange={(e) => setRecDistinctiveMarks(e.target.value)} />
                            </div>
                        </div>

                        {/* Stolen date/time */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Fecha del robo (aprox.)</label>
                                <Input type="date" value={recStolenDate} onChange={(e) => setRecStolenDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Hora del robo (aprox.)</label>
                                <Input type="time" value={recStolenTime} onChange={(e) => setRecStolenTime(e.target.value)} />
                            </div>
                        </div>

                        {/* Has GPS? */}
                        <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">¿El vehículo tiene GPS activo?</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(["yes", "no", "unknown"] as const).map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setRecHasGps(opt)}
                                        className={cn(
                                            "py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all",
                                            recHasGps === opt ? "border-red-500 bg-red-500/10 text-red-400" : "border-muted hover:border-red-500/50"
                                        )}
                                    >
                                        {opt === "yes" ? "Sí" : opt === "no" ? "No" : "No sé"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {recHasGps === "yes" && (
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Marca del GPS</label>
                                <Input placeholder="Ej: Tec360, Tracker, etc." value={recGpsBrand} onChange={(e) => setRecGpsBrand(e.target.value)} />
                            </div>
                        )}

                        {/* Last seen location */}
                        <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Última ubicación vista *</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input className="pl-9" placeholder="Ej: Barrio Castilla, frente al centro comercial..." value={recAddress} onChange={(e) => setRecAddress(e.target.value)} />
                            </div>
                        </div>

                        {/* Map */}
                        <LocationPicker
                            initialLat={recLat}
                            initialLng={recLng}
                            onLocationSelect={(lat, lng) => { setRecLat(lat); setRecLng(lng); }}
                        />

                        {/* Police report */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">N° Denuncia Policial (opcional)</label>
                                <Input placeholder="Ej: 202500..." value={recPoliceReport} onChange={(e) => setRecPoliceReport(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">Teléfono Alterno (opcional)</label>
                                <Input type="tel" placeholder="Ej: 300 123 4567" value={recAdditionalPhone} onChange={(e) => setRecAdditionalPhone(e.target.value)} />
                            </div>
                        </div>

                        {/* Extra notes */}
                        <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                                Información adicional <span className="normal-case font-normal">(opcional)</span>
                            </label>
                            <Textarea
                                placeholder="Cualquier dato relevante que ayude a la recuperación..."
                                className="resize-none min-h-[80px] text-sm bg-muted/20"
                                value={recDescription}
                                onChange={(e) => setRecDescription(e.target.value)}
                            />
                        </div>

                        {recError && (
                            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-100">
                                {recError}
                            </div>
                        )}

                        <Button
                            type="button"
                            onClick={onRecoverySubmit}
                            disabled={recSubmitting}
                            className="w-full bg-red-600 hover:bg-red-700 text-white h-12 text-base"
                        >
                            {recSubmitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando Alerta...</>
                            ) : (
                                <>🚨 Activar Equipo de Reacción</>
                            )}
                        </Button>
                    </div>
                </GlassCard>
            ) : (
            /* ========== NORMAL FORM (original wizard) ========== */
            <>
            {/* Progress Bar */}
            <div className="mb-8 flex justify-between items-center relative">
                <div className="absolute left-0 top-1/2 w-full h-1 bg-muted -z-10 rounded-full" />
                <div
                    className="absolute left-0 top-1/2 h-1 bg-primary -z-10 rounded-full transition-all duration-300"
                    style={{ width: `${(step / (steps.length - 1)) * 100}%` }}
                />

                {steps.map((s, i) => (
                    <div key={s.id} className="flex flex-col items-center gap-2 bg-background p-2 rounded-full">
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors",
                            i <= step ? "border-primary bg-primary text-primary-foreground" : "border-muted text-muted-foreground"
                        )}>
                            {i + 1}
                        </div>
                        <span className={cn("text-xs font-medium absolute -bottom-6 w-20 text-center", i === step ? "text-primary" : "text-muted-foreground")}>
                            {s.title}
                        </span>
                    </div>
                ))}
            </div>

            <GlassCard className="p-6 md:p-8 mt-10" gradient>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <AnimatePresence mode="wait">
                            {/* Step 0: Service Type */}
                            {step === 0 && (
                                <motion.div
                                    key="step0"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="text-center mb-6">
                                        <h2 className="text-2xl font-bold">¿Qué necesitas hoy?</h2>
                                        <p className="text-muted-foreground">Selecciona el tipo de servicio</p>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="service_type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <ServiceTypeSelector
                                                        selected={field.value}
                                                        onChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </motion.div>
                            )}

                            {/* Step 1: Vehicle Type + Model */}
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="text-center mb-6">
                                        <h2 className="text-2xl font-bold">Tipo de Vehículo</h2>
                                        <p className="text-muted-foreground">¿En qué vehículo se realizará el trabajo?</p>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="vehicle_type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {vehicleTypes.map((vt) => (
                                                            <button
                                                                key={vt.value}
                                                                type="button"
                                                                onClick={() => field.onChange(vt.value)}
                                                                className={cn(
                                                                    "flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105",
                                                                    field.value === vt.value
                                                                        ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                                                                        : "border-muted hover:border-primary/50 bg-muted/20"
                                                                )}
                                                            >
                                                                <span className="text-4xl">{vt.icon}</span>
                                                                <span className={cn(
                                                                    "text-sm font-semibold",
                                                                    field.value === vt.value ? "text-primary" : "text-muted-foreground"
                                                                )}>
                                                                    {vt.label}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="vehicle_model"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Modelo del Vehículo</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Car className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                        <Input
                                                            className="pl-9"
                                                            placeholder="Ej: Mazda 3 2020, Honda CB190R, Kenworth T800..."
                                                            {...field}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="vehicle_plate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Placa del Vehículo</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-2.5 text-sm text-muted-foreground font-mono">🔢</span>
                                                        <Input
                                                            className="pl-9 uppercase font-mono tracking-wider"
                                                            placeholder="Ej: ABC123, XYZ 789..."
                                                            maxLength={10}
                                                            {...field}
                                                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </motion.div>
                            )}

                            {/* Step 2: Location */}
                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="text-center mb-4">
                                        <h2 className="text-2xl font-bold">Confirma la ubicación</h2>
                                        <p className="text-muted-foreground">Arrastra el mapa para fijar el punto exacto</p>
                                    </div>

                                    <LocationPicker
                                        initialLat={form.getValues("lat")}
                                        initialLng={form.getValues("lng")}
                                        onLocationSelect={(lat, lng) => {
                                            form.setValue("lat", lat)
                                            form.setValue("lng", lng)
                                        }}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="address"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Referencia / Dirección Exacta</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                        <Input className="pl-9" placeholder="Ej. Frente al parque, casa blanca..." {...field} />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </motion.div>
                            )}

                            {/* Step 3: Details — clean layout */}
                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-5"
                                >
                                    <div className="text-center mb-4">
                                        <h2 className="text-2xl font-bold">Últimos detalles</h2>
                                        <p className="text-sm text-muted-foreground mt-1">Fecha, precio y foto de tu vehículo</p>
                                    </div>

                                    {/* Date selector — 2 buttons + day pills */}
                                    <FormField
                                        control={form.control}
                                        name="scheduled_date"
                                        render={({ field }) => {
                                            const isToday = field.value && isSameDay(field.value, TODAY)
                                            const isScheduled = field.value && !isSameDay(field.value, TODAY)
                                            return (
                                                <FormItem className="space-y-3">
                                                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                        ¿Cuándo lo necesitas?
                                                    </FormLabel>

                                                    {/* Primary 2 choices */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                field.onChange(TODAY)
                                                                setShowDayPicker(false)
                                                            }}
                                                            className={cn(
                                                                "flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all duration-200",
                                                                isToday
                                                                    ? "border-amber-500 bg-amber-500/10 text-amber-400"
                                                                    : "border-border hover:border-amber-500/50 hover:bg-amber-500/5"
                                                            )}
                                                        >
                                                            <span className="text-2xl">⚡</span>
                                                            <span className="text-sm font-semibold">Hoy mismo</span>
                                                            <span className="text-xs text-muted-foreground">Servicio Express</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => setShowDayPicker(true)}
                                                            className={cn(
                                                                "flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all duration-200",
                                                                isScheduled || showDayPicker
                                                                    ? "border-primary bg-primary/10 text-primary"
                                                                    : "border-border hover:border-primary/50 hover:bg-primary/5"
                                                            )}
                                                        >
                                                            <span className="text-2xl">📅</span>
                                                            <span className="text-sm font-semibold">
                                                                {isScheduled
                                                                    ? format(field.value!, "dd MMM", { locale: es })
                                                                    : "Programar"}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">Hasta 5 días</span>
                                                        </button>
                                                    </div>

                                                    {/* Day pills — shown when Programar is selected */}
                                                    {showDayPicker && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -8 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="flex gap-2 flex-wrap"
                                                        >
                                                            {Array.from({ length: 5 }, (_, i) => {
                                                                const day = addDays(TODAY, i + 1)
                                                                const isSelected = field.value && isSameDay(field.value, day)
                                                                return (
                                                                    <button
                                                                        key={i}
                                                                        type="button"
                                                                        onClick={() => field.onChange(day)}
                                                                        className={cn(
                                                                            "flex-1 min-w-[72px] flex flex-col items-center py-2 px-1 rounded-lg border transition-all text-center",
                                                                            isSelected
                                                                                ? "border-primary bg-primary text-primary-foreground shadow-md"
                                                                                : "border-border hover:border-primary/50 hover:bg-primary/5"
                                                                        )}
                                                                    >
                                                                        <span className="text-xs font-medium uppercase opacity-60">
                                                                            {format(day, "EEE", { locale: es })}
                                                                        </span>
                                                                        <span className="text-lg font-bold leading-tight">
                                                                            {format(day, "d", { locale: es })}
                                                                        </span>
                                                                        <span className="text-xs opacity-60">
                                                                            {format(day, "MMM", { locale: es })}
                                                                        </span>
                                                                    </button>
                                                                )
                                                            })}
                                                        </motion.div>
                                                    )}

                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )
                                        }}
                                    />

                                    {/* Time */}
                                    <FormField
                                        control={form.control}
                                        name="scheduled_time"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                                    <Clock className="h-3 w-3" /> Hora preferida
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="time"
                                                        className="h-10 text-sm"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Price field — prominent */}
                                    <FormField
                                        control={form.control}
                                        name="estimated_price"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                    Precio ofrecido
                                                </FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">$</span>
                                                        <Input
                                                            type="number"
                                                            min={30}
                                                            step={10}
                                                            className="pl-8 h-12 text-xl font-bold tracking-tight"
                                                            placeholder="30.000"
                                                            {...field}
                                                            onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">COP</span>
                                                    </div>
                                                </FormControl>
                                                <p className="text-xs text-muted-foreground">Mín. $30.000 • El técnico verá esto antes de aceptar</p>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Vehicle photo */}
                                    <div className="space-y-2">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Foto del vehículo</p>
                                        <label
                                            htmlFor="vehicle-photo"
                                            className={cn(
                                                "flex items-center gap-4 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                                                vehiclePhotoPreview
                                                    ? "border-green-500/50 bg-green-500/5"
                                                    : "border-border hover:border-primary/50 hover:bg-primary/5 bg-muted/10"
                                            )}
                                        >
                                            {vehiclePhotoPreview ? (
                                                <>
                                                    <img
                                                        src={vehiclePhotoPreview}
                                                        alt="Foto del vehículo"
                                                        className="h-16 w-16 object-cover rounded-lg shrink-0"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-medium text-green-500">✓ Foto cargada</p>
                                                        <p className="text-xs text-muted-foreground">Toca para cambiarla</p>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="h-16 w-16 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                                                        <span className="text-3xl">🚗</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">Sube una foto de tu vehículo</p>
                                                        <p className="text-xs text-muted-foreground">Ayuda al técnico a identificarlo</p>
                                                    </div>
                                                </>
                                            )}
                                        </label>
                                        <input
                                            id="vehicle-photo"
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) handleVehiclePhoto(file)
                                            }}
                                        />
                                    </div>

                                    {/* Description — optional, collapsed feel */}
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                    Descripción <span className="normal-case font-normal">(opcional)</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Cuéntale algo más al técnico..."
                                                        className="resize-none min-h-[80px] text-sm bg-muted/20"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {error && (
                            <div className="mt-4 p-3 text-sm text-red-500 bg-red-50 rounded-md border border-red-100">
                                {error}
                            </div>
                        )}

                        <div className="mt-8 flex flex-col-reverse sm:flex-row justify-between gap-3">
                            {step > 0 && (
                                <Button type="button" variant="outline" onClick={prevStep} disabled={isSubmitting} className="w-full sm:w-auto">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Atrás
                                </Button>
                            )}

                            {step < steps.length - 1 ? (
                                <Button type="button" onClick={nextStep} className="w-full sm:w-auto sm:ml-auto">
                                    Siguiente
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <Button type="submit" className="w-full sm:w-auto sm:ml-auto" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="mr-2 h-4 w-4" />
                                            Confirmar Solicitud
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </form>
                </Form>
            </GlassCard>
            </>
            )}
        </div>
    )
}
