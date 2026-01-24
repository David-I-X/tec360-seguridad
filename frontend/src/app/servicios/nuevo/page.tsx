"use client"

import { ProtectedRoute } from "@/lib/auth-context"
import { useAuth } from "@/lib/auth-context"
import { OnboardingForm } from "@/components/auth/onboarding-form"
import { ServiceRequestForm } from "@/components/services/service-request-form"

/**
 * Componente interno que decide qué formulario mostrar
 * basado en si el usuario ya completó el onboarding
 */
function ServiceRequestContent() {
  const { hasCompletedOnboarding, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Si no ha completado onboarding, mostramos ese formulario primero
  if (!hasCompletedOnboarding) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Casi listos...</h1>
          <p className="text-muted-foreground mt-2">
            Antes de solicitar tu primer servicio, necesitamos completar tu perfil.
          </p>
        </div>
        <OnboardingForm />
      </div>
    )
  }

  // Si ya está listo, mostramos el formulario de servicio
  return <ServiceRequestForm />
}

export default function NewServicePage() {
  return (
    <ProtectedRoute>
      <div className="container py-10 px-4 md:px-6">
        <ServiceRequestContent />
      </div>
    </ProtectedRoute>
  )
}