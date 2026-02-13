"use client"

import { useState } from "react"
import { Play, Loader2, Bug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface TrackingSimulatorProps {
    serviceId: string
    /** Service destination coordinates — simulation will end here */
    destLat: number
    destLng: number
}

/**
 * Development-only component that triggers simulated technician movement
 * via the backend /simulate/movement endpoint.
 */
export function TrackingSimulator({ serviceId, destLat, destLng }: TrackingSimulatorProps) {
    const [isSimulating, setIsSimulating] = useState(false)
    const { toast } = useToast()

    // Only show in development
    if (process.env.NODE_ENV === "production") return null

    const startSimulation = async () => {
        const token = localStorage.getItem("access_token")
        if (!token) {
            toast({ title: "Error", description: "No autenticado", variant: "destructive" })
            return
        }

        setIsSimulating(true)

        try {
            const response = await fetch(`${API_URL}/simulate/movement`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    service_id: serviceId,
                    // Start ~2km away from destination
                    start_lat: destLat + 0.015,
                    start_lng: destLng - 0.012,
                    end_lat: destLat,
                    end_lng: destLng,
                    steps: 25,
                    interval_seconds: 2.0,
                }),
            })

            if (response.ok) {
                const data = await response.json()
                toast({
                    title: "🚗 Simulación iniciada",
                    description: `${data.route.steps} pasos en ${data.route.duration_seconds}s`,
                })

                // Auto-reset after simulation completes
                setTimeout(() => {
                    setIsSimulating(false)
                }, (data.route.duration_seconds + 2) * 1000)
            } else {
                const err = await response.json()
                toast({
                    title: "Error al simular",
                    description: err.detail || "Fallo en servidor",
                    variant: "destructive",
                })
                setIsSimulating(false)
            }
        } catch (error) {
            toast({
                title: "Error de conexión",
                description: "No se pudo conectar al backend",
                variant: "destructive",
            })
            setIsSimulating(false)
        }
    }

    return (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            <Bug className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-xs text-amber-600 flex-1">Dev: Simular movimiento</span>
            <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-amber-500/30 hover:bg-amber-500/10"
                onClick={startSimulation}
                disabled={isSimulating}
            >
                {isSimulating ? (
                    <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Simulando...
                    </>
                ) : (
                    <>
                        <Play className="h-3 w-3 mr-1" />
                        Iniciar
                    </>
                )}
            </Button>
        </div>
    )
}
