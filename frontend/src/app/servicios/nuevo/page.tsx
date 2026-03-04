"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ProtectedRoute } from "@/lib/auth-context"
import { useAuth } from "@/lib/auth-context"
import { OnboardingForm } from "@/components/auth/onboarding-form"
import { ServiceRequestForm } from "@/components/services/service-request-form"

function ServiceRequestContent() {
  const { hasCompletedOnboarding, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

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

  return <ServiceRequestForm />
}

export default function NewServicePage() {
  return (
    <ProtectedRoute>
      <div className="container pt-24 pb-10 px-4 md:px-6">
        {/* Back button */}
        <Link
          href="/servicios"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Mis Servicios
        </Link>
        <ServiceRequestContent />
      </div>
    </ProtectedRoute>
  )
}