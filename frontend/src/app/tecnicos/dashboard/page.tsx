"use client"

import { ProtectedRoute, useAuth } from "@/lib/auth-context"
import { TechnicianDashboard } from "@/components/technician/technician-dashboard"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

function DashboardContent() {
    const { user, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && user?.role !== "technician") {
            // Si no es técnico, mandar al home o a servicios de cliente
            router.push("/servicios")
        }
    }, [user, isLoading, router])

    if (isLoading) return null

    if (user?.role !== "technician") {
        return (
            <div className="p-8 text-center">
                <p>Acceso restringido. Solo técnicos pueden ver esta página.</p>
            </div>
        )
    }

    return <TechnicianDashboard />
}

export default function TechDashboardPage() {
    return (
        <ProtectedRoute requireOnboarding={true}>
            <div className="container pt-24 pb-10 px-4">
                <DashboardContent />
            </div>
        </ProtectedRoute>
    )
}
