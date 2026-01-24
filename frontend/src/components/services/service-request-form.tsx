"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, ArrowRight, ArrowLeft, Calendar as CalendarIcon, MapPin, Check } from "lucide-react"
import dynamic from "next/dynamic"

import { cn } from "@/lib/utils"
import { createServiceRequest } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
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

const serviceSchema = z.object({
    service_type: z.string().min(1, "Selecciona un tipo de servicio"),
    description: z.string().min(10, "Describe brevemente qué necesitas (mínimo 10 caracteres)"),
    address: z.string().min(5, "Ingresa una referencia de dirección"),
    scheduled_date: z.date({
        required_error: "Selecciona una fecha preferida",
    }),
    lat: z.number().optional(),
    lng: z.number().optional()
})

type ServiceValues = z.infer<typeof serviceSchema>

const steps = [
    { id: 0, title: "Elige tu Servicio" },
    { id: 1, title: "Ubicación" },
    { id: 2, title: "Detalles" }
]

export function ServiceRequestForm() {
    const [step, setStep] = useState(0)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState("")

    const form = useForm<ServiceValues>({
        resolver: zodResolver(serviceSchema),
        defaultValues: {
            address: "",
            lat: 6.2442,
            lng: -75.5636,
            description: ""
        }
    })

    // Validación por paso
    const nextStep = async () => {
        let isValid = false
        if (step === 0) {
            isValid = await form.trigger("service_type")
        } else if (step === 1) {
            // En paso 2 validamos que haya coords (opcional estricto si se desea)
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
                "installation_cctv": "Instalación de Cámaras",
                "installation_alarm": "Instalación de Alarma",
                "installation_gps": "Instalación de GPS",
                "maintenance_cctv": "Mantenimiento CCTV",
                "maintenance_alarm": "Mantenimiento Alarma",
                "maintenance_gps": "Mantenimiento GPS",
                "other": "Servicio Técnico"
            }[data.service_type] || "Servicio"

            const title = `${typeLabel} - ${format(data.scheduled_date, "dd/MM/yyyy")}`

            await createServiceRequest({
                service_type: data.service_type,
                title: title,
                description: data.description,
                service_address: data.address, // Referencia escrita
                service_city: "Medellín",
                service_lat: data.lat || 6.2442,
                service_lon: data.lng || -75.5636,
                scheduled_date: data.scheduled_date.toISOString(),
                client_notes: data.description
            })

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
                <Button onClick={() => window.location.reload()} className="w-full">
                    Solicitar otro servicio
                </Button>
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

                            {step === 1 && (
                                <motion.div
                                    key="step1"
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

                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="text-center mb-6">
                                        <h2 className="text-2xl font-bold">Últimos detalles</h2>
                                        <p className="text-muted-foreground">Cuéntanos un poco más</p>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <FormField
                                            control={form.control}
                                            name="scheduled_date"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <FormLabel>Fecha Preferida</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant={"outline"}
                                                                    className={cn(
                                                                        "w-full pl-3 text-left font-normal",
                                                                        !field.value && "text-muted-foreground"
                                                                    )}
                                                                >
                                                                    {field.value ? (
                                                                        format(field.value, "PPP", { locale: es })
                                                                    ) : (
                                                                        <span>Selecciona una fecha</span>
                                                                    )}
                                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar
                                                                mode="single"
                                                                selected={field.value}
                                                                onSelect={field.onChange}
                                                                disabled={(date) =>
                                                                    date < new Date()
                                                                }
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="space-y-2">
                                            <FormLabel>Tipo de Servicio</FormLabel>
                                            <div className="p-2 border rounded-md bg-muted/50 text-sm">
                                                {form.getValues("service_type") || "No seleccionado"}
                                            </div>
                                        </div>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Descripción del trabajo</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Detalla qué necesitas instalar o reparar..."
                                                        className="resize-none min-h-[100px]"
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
