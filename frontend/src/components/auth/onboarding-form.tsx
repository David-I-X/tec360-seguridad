"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { GlassCard } from "@/components/ui/glass-card"
import { useAuth } from "@/lib/auth-context"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

// Schema de validación
const onboardingSchema = z.object({
    full_name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
    user_type: z.enum(["client", "technician"], {
        required_error: "Selecciona un tipo de usuario",
    }),
})

type OnboardingValues = z.infer<typeof onboardingSchema>

export function OnboardingForm() {
    const router = useRouter()
    const { completeOnboarding } = useAuth()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    const form = useForm<OnboardingValues>({
        resolver: zodResolver(onboardingSchema),
        defaultValues: {
            full_name: "",
            user_type: "client",
        },
    })

    // ... (rest of code)

    // ... (rest of code)

    async function onSubmit(data: OnboardingValues) {
        setIsLoading(true)
        setError("")

        try {
            await completeOnboarding(data)

            // Redirigir según el tipo de usuario seleccionado
            if (data.user_type === "technician") {
                router.push("/tecnicos/dashboard")
            } else {
                router.push("/servicios")
            }
        } catch (err: any) {
            console.error(err)
            setError(err.message || "Error al guardar perfil")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <GlassCard className="max-w-md mx-auto p-6 md:p-8" gradient>
            <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold tracking-tight">Bienvenido a Tec360</h2>
                <p className="text-muted-foreground mt-2">
                    Completa tu perfil para continuar
                </p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="full_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre Completo</FormLabel>
                                <FormControl>
                                    <Input placeholder="Juan Pérez" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="user_type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Quiero usar la plataforma como:</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex flex-col space-y-1"
                                    >
                                        <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-4 hover:bg-muted/50 transition-colors">
                                            <FormControl>
                                                <RadioGroupItem value="client" />
                                            </FormControl>
                                            <div className="space-y-1">
                                                <FormLabel className="font-normal">
                                                    Cliente
                                                </FormLabel>
                                                <FormMessage className="text-xs text-muted-foreground">
                                                    Quiero solicitar servicios de seguridad
                                                </FormMessage>
                                            </div>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0 rounded-md border p-4 hover:bg-muted/50 transition-colors">
                                            <FormControl>
                                                <RadioGroupItem value="technician" />
                                            </FormControl>
                                            <div className="space-y-1">
                                                <FormLabel className="font-normal">
                                                    Técnico
                                                </FormLabel>
                                                <FormMessage className="text-xs text-muted-foreground">
                                                    Quiero ofrecer mis servicios y ganar dinero
                                                </FormMessage>
                                            </div>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {error && (
                        <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            "Continuar"
                        )}
                    </Button>
                </form>
            </Form>
        </GlassCard>
    )
}
