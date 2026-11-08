"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter, usePathname } from "next/navigation"
import { Loader2, Building2, Wrench, User, Sparkles, CheckCircle2 } from "lucide-react"

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
import { GlassCard } from "@/components/ui/glass-card"
import { useAuth } from "@/lib/auth-context"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getPublicOrganizations, type PublicOrganizationItem } from "@/lib/api"

// Schema de validación completo (Cliente, Técnico u Organización / Taller)
const onboardingSchema = z
    .object({
        full_name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
        email: z
            .string()
            .optional()
            .refine(
                (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
                "Ingresa un correo electrónico válido"
            ),
        user_type: z.enum(["client", "technician", "company_admin"], {
            required_error: "Selecciona un tipo de cuenta",
        }),
        company_name: z.string().optional(),
        nit: z.string().optional(),
        city: z.string().optional(),
        dispatch_mode: z.enum(["manual", "direct"]).optional(),
        organization_id: z.string().optional(),
    })
    .superRefine((values, ctx) => {
        if (values.user_type === "company_admin") {
            if (!values.company_name || values.company_name.trim().length < 2) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["company_name"],
                    message: "Ingresa el nombre de tu Organización o Taller",
                })
            }
        }
    })

type OnboardingValues = z.infer<typeof onboardingSchema>

export function OnboardingForm() {
    const router = useRouter()
    const pathname = usePathname()
    const { completeOnboarding } = useAuth()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [organizations, setOrganizations] = useState<PublicOrganizationItem[]>([])

    const form = useForm<OnboardingValues>({
        resolver: zodResolver(onboardingSchema),
        defaultValues: {
            full_name: "",
            email: "",
            user_type: "client",
            company_name: "",
            nit: "",
            city: "Medellín",
            dispatch_mode: "manual",
            organization_id: "",
        },
    })

    const selectedUserType = form.watch("user_type")
    const selectedDispatchMode = form.watch("dispatch_mode")

    // Cargar rol preseleccionado desde /register y lista de organizaciones activas
    useEffect(() => {
        if (typeof window !== "undefined") {
            const preferredRole = sessionStorage.getItem("preferred_onboarding_role")
            if (
                preferredRole === "client" ||
                preferredRole === "technician" ||
                preferredRole === "company_admin"
            ) {
                form.setValue("user_type", preferredRole)
            }
        }

        getPublicOrganizations()
            .then((res) => {
                if (res?.organizations) {
                    setOrganizations(res.organizations)
                }
            })
            .catch(() => {})
    }, [form])

    async function onSubmit(data: OnboardingValues) {
        setIsLoading(true)
        setError("")

        try {
            await completeOnboarding({
                full_name: data.full_name.trim(),
                email: data.email?.trim() || undefined,
                user_type: data.user_type,
                company_name:
                    data.user_type === "company_admin"
                        ? data.company_name?.trim()
                        : undefined,
                nit:
                    data.user_type === "company_admin"
                        ? data.nit?.trim() || undefined
                        : undefined,
                city:
                    data.user_type === "company_admin"
                        ? data.city?.trim() || "Medellín"
                        : undefined,
                dispatch_mode:
                    data.user_type === "company_admin"
                        ? data.dispatch_mode || "manual"
                        : undefined,
                organization_id:
                    data.user_type === "technician" && data.organization_id
                        ? data.organization_id
                        : undefined,
            })

            if (typeof window !== "undefined") {
                sessionStorage.removeItem("preferred_onboarding_role")
            }

            // Redirigir según el tipo de usuario seleccionado
            if (data.user_type === "company_admin") {
                router.push("/taller/dashboard")
            } else if (data.user_type === "technician") {
                router.push("/tecnicos/dashboard?isNewTech=1")
            } else if (pathname !== "/servicios/nuevo") {
                router.push("/servicios/nuevo")
            }
        } catch (err: any) {
            console.error(err)
            setError(err.message || "Error al guardar perfil")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <GlassCard className="max-w-lg mx-auto p-6 md:p-8" gradient>
            <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold tracking-tight">Bienvenido a Tec360</h2>
                <p className="text-muted-foreground mt-2 text-sm">
                    Selecciona tu tipo de cuenta y completa tu perfil para continuar
                </p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Selección de Tipo de Cuenta */}
                    <FormField
                        control={form.control}
                        name="user_type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-sm font-semibold">
                                    Quiero usar la plataforma como:
                                </FormLabel>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        className="flex flex-col space-y-2.5"
                                    >
                                        {/* Opción 1: Cliente */}
                                        <label
                                            htmlFor="role-client"
                                            className={`flex items-start space-x-3 rounded-xl border p-4 cursor-pointer transition-all ${
                                                field.value === "client"
                                                    ? "border-violet-500/60 bg-violet-500/10 shadow-sm"
                                                    : "border-border hover:bg-muted/40"
                                            }`}
                                        >
                                            <FormControl>
                                                <RadioGroupItem value="client" id="role-client" className="mt-1" />
                                            </FormControl>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-violet-400" />
                                                    <span className="font-semibold text-sm">Cliente / Propietario</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Quiero solicitar servicios de seguridad, GPS, alarmas o mecánica
                                                </p>
                                            </div>
                                        </label>

                                        {/* Opción 2: Técnico */}
                                        <label
                                            htmlFor="role-technician"
                                            className={`flex items-start space-x-3 rounded-xl border p-4 cursor-pointer transition-all ${
                                                field.value === "technician"
                                                    ? "border-emerald-500/60 bg-emerald-500/10 shadow-sm"
                                                    : "border-border hover:bg-muted/40"
                                            }`}
                                        >
                                            <FormControl>
                                                <RadioGroupItem value="technician" id="role-technician" className="mt-1" />
                                            </FormControl>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Wrench className="h-4 w-4 text-emerald-400" />
                                                    <span className="font-semibold text-sm">Técnico Certificado</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Quiero ofrecer mis servicios técnicos (independiente o vinculado a una organización)
                                                </p>
                                            </div>
                                        </label>

                                        {/* Opción 3: Organización / Taller (Cuenta Empresa) */}
                                        <label
                                            htmlFor="role-company-admin"
                                            className={`flex items-start space-x-3 rounded-xl border p-4 cursor-pointer transition-all ${
                                                field.value === "company_admin"
                                                    ? "border-cyan-400/70 bg-cyan-500/10 shadow-sm"
                                                    : "border-border hover:bg-muted/40"
                                            }`}
                                        >
                                            <FormControl>
                                                <RadioGroupItem value="company_admin" id="role-company-admin" className="mt-1" />
                                            </FormControl>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Building2 className="h-4 w-4 text-cyan-400" />
                                                    <span className="font-semibold text-sm">
                                                        Organización / Taller (Cuenta Empresa)
                                                    </span>
                                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                                        BONO $200.000
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Administra tu equipo de técnicos con billetera única, cupos individuales, validación de cursos y despacho
                                                </p>
                                            </div>
                                        </label>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Nombre Completo */}
                    <FormField
                        control={form.control}
                        name="full_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    {selectedUserType === "company_admin"
                                        ? "Nombre del Administrador / Representante *"
                                        : "Nombre Completo *"}
                                </FormLabel>
                                <FormControl>
                                    <Input placeholder="Juan Pérez" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Correo Electrónico (Opcional) */}
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Correo Electrónico (Opcional)</FormLabel>
                                <FormControl>
                                    <Input
                                        type="email"
                                        placeholder="contacto@empresa.com"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Si es Técnico: Selector opcional de Organización / Taller existente */}
                    {selectedUserType === "technician" && (
                        <FormField
                            control={form.control}
                            name="organization_id"
                            render={({ field }) => (
                                <FormItem className="rounded-xl border border-emerald-500/25 bg-emerald-950/10 p-4 space-y-2">
                                    <FormLabel className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-300">
                                        <Building2 className="h-3.5 w-3.5" />
                                        Organización / Taller (Opcional)
                                    </FormLabel>
                                    <FormControl>
                                        <select
                                            value={field.value || ""}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            className="w-full rounded-lg border border-white/15 bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                                        >
                                            <option value="">
                                                Soy Técnico Independiente (Sin organización)
                                            </option>
                                            {organizations.map((org) => (
                                                <option key={org.id} value={org.id}>
                                                    {org.name} ({org.city})
                                                </option>
                                            ))}
                                        </select>
                                    </FormControl>
                                    <p className="text-[11px] text-muted-foreground">
                                        Si trabajas para un taller registrado, selecciónalo aquí para operar con su billetera corporativa. Si eres independiente, déjalo en &quot;Soy Técnico Independiente&quot;.
                                    </p>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    {/* Si es Organización / Taller (company_admin): Configuración de Cuenta Empresa */}
                    {selectedUserType === "company_admin" && (
                        <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/15 p-4 space-y-4">
                            <div className="flex items-start gap-2.5">
                                <Sparkles className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
                                        Configuración de Organización / Taller (+Bono $200.000 COP)
                                    </p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Tu organización recibe una billetera única con $200.000 COP de bienvenida para asignar cupos a tus técnicos. La cuenta administrativa gestiona el taller y no opera como técnico en campo.
                                    </p>
                                </div>
                            </div>

                            <FormField
                                control={form.control}
                                name="company_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre de la Organización / Taller *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Ej. Taller Central GPS & Seguridad Vial"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <FormField
                                    control={form.control}
                                    name="nit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>NIT / RFC (Opcional)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="900.123.456-7" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ciudad Principal</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Medellín" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="space-y-2">
                                <FormLabel className="text-xs font-semibold">
                                    Modo de Despacho Inicial (Alternable en cualquier momento)
                                </FormLabel>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => form.setValue("dispatch_mode", "manual")}
                                        className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                                            selectedDispatchMode === "manual"
                                                ? "border-cyan-400 bg-cyan-500/20 text-white"
                                                : "border-white/10 bg-background/40 text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold">El Taller Asigna</span>
                                            {selectedDispatchMode === "manual" && (
                                                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                                            )}
                                        </div>
                                        <p className="text-[11px] opacity-80">
                                            El admin recibe y asigna el técnico
                                        </p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => form.setValue("dispatch_mode", "direct")}
                                        className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                                            selectedDispatchMode === "direct"
                                                ? "border-cyan-400 bg-cyan-500/20 text-white"
                                                : "border-white/10 bg-background/40 text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold">Técnico Acepta</span>
                                            {selectedDispatchMode === "direct" && (
                                                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                                            )}
                                        </div>
                                        <p className="text-[11px] opacity-80">
                                            Tus técnicos aceptan directo con su cupo
                                        </p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 text-sm text-red-400 bg-red-950/40 border border-red-500/30 rounded-lg">
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Guardando...
                            </>
                        ) : selectedUserType === "company_admin" ? (
                            "Crear Organización / Taller"
                        ) : (
                            "Continuar"
                        )}
                    </Button>
                </form>
            </Form>
        </GlassCard>
    )
}
