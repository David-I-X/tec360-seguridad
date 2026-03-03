"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format, addDays, startOfDay, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, ArrowRight, ArrowLeft, MapPin, Check, Car, Clock, DollarSign } from "lucide-react"
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

type ServiceValues = z.infer<typeof serviceSchema>

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

    const form = useForm<ServiceValues>({
        resolver: zodResolver(serviceSchema),
        defaultValues: {
            address: "",
            lat: 6.2442,
            lng: -75.5636,
            description: "",
            scheduled_time: "",
            vehicle_type: "",
            vehicle_model: "",
            vehicle_plate: "",
            estimated_price: undefined
        }
    })

    const handleVehiclePhoto = (file: File) => {
        setVehiclePhotoFile(file)
        setVehiclePhotoPreview(URL.createObjectURL(file))
    }

    // Validación por paso
    const nextStep = async () => {
        let isValid = false
        if (step === 0) {
            isValid = await form.trigger("service_type")
        } else if (step === 1) {
            isValid = await form.trigger(["vehicle_type", "vehicle_model", "vehicle_plate"])
        } else if (step === 2) {
            isValid = true
        } else {
            isValid = await form.trigger()
        }

        if (isValid) setStep(s => s + 1)
    }

    const prevStep = () => setStep(s => s - 1)

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

            setCreatedServiceId(result.id)
            setSuccess(true)
        } catch (err: any) {
            setError(err.message || "Error al crear solicitud")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (success) {
        return (
            <GlassCard className="max-w-md mx-auto p-12 text-center">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6"
                >
                    <Check className="h-12 w-12 text-green-600" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">¡Solicitud Enviada!</h2>
                <p className="text-muted-foreground mb-8">
                    Un técnico revisará tu solicitud y la aceptará pronto.
                </p>
                <div className="space-y-3">
                    {createdServiceId && (
                        <Button onClick={() => window.location.href = `/servicios/${createdServiceId}`} className="w-full">
                            Ver mi Solicitud
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
                        Solicitar otro servicio
                    </Button>
                </div>
            </GlassCard>
        )
    }

    return (
        <div className="max-w-2xl mx-auto">
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

                        <div className="mt-8 flex justify-between gap-4">
                            {step > 0 && (
                                <Button type="button" variant="outline" onClick={prevStep} disabled={isSubmitting}>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Atrás
                                </Button>
                            )}

                            {step < steps.length - 1 ? (
                                <Button type="button" onClick={nextStep} className="ml-auto w-full md:w-auto">
                                    Siguiente
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <Button type="submit" className="ml-auto w-full md:w-auto" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        "Confirmar Solicitud"
                                    )}
                                </Button>
                            )}
                        </div>
                    </form>
                </Form>
            </GlassCard>
        </div>
    )
}
