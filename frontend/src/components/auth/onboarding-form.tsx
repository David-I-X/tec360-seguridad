"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { GlassCard } from "@/components/ui/glass-card"
import { useAuth } from "@/lib/auth-context"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"


// Schema de validación
const onboardingSchema = z.object({
    full_name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
    email: z.string().email("Ingresa un correo válido").optional().or(z.literal("")),
    user_type: z.enum(["client", "technician"], {
        required_error: "Selecciona un tipo de usuario",
    }),
})

type OnboardingValues = z.infer<typeof onboardingSchema>

export function OnboardingForm() {
    const { completeOnboarding, user } = useAuth()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    const form = useForm<OnboardingValues>({
        resolver: zodResolver(onboardingSchema),
        defaultValues: {
            full_name: "",
            user_type: "client",
        },
    })

    async function onSubmit(data: OnboardingValues) {
        setIsLoading(true)
        setError("")

        try {
            await completeOnboarding(data)
            // Recargar la página para que el AuthContext detecte el cambio de estado
            // y redirija o actualice la UI
            window.location.reload()
        } catch (err: any) {
            console.error(err)
            setError(err.message || "Error al guardar perfil")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        { error }
                            </div >
                        )
}

<Button type="submit" className="w-full" disabled={isSubmitting}>
    {isSubmitting ? (
        <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Guardando...
        </>
    ) : (
        "Continuar"
    )}
</Button>
                    </form >
                </Form >
            </CardContent >
        </Card >
    )
}
