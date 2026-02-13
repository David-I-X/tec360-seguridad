/**
 * Hook for technician location tracking
 * Sends GPS location to backend periodically while service is active
 */
import { useEffect, useRef, useCallback, useState } from "react"
import { serviceWebSocket } from "@/lib/websocket"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface UseLocationTrackingOptions {
    serviceId: string
    enabled: boolean
    intervalMs?: number
}

interface LocationTrackingState {
    lastPosition: { lat: number; lng: number } | null
    error: string | null
    isSending: boolean
}

export function useLocationTracking({ serviceId, enabled, intervalMs = 5000 }: UseLocationTrackingOptions): LocationTrackingState {
    const watchIdRef = useRef<number | null>(null)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isSending, setIsSending] = useState(false)
    const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)

    const sendLocation = useCallback(async (lat: number, lng: number) => {
        const token = localStorage.getItem("access_token")
        if (!token) return

        try {
            setIsSending(true)
            // Via REST API
            const response = await fetch(`${API_URL}/location/update`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    lat,
                    lng,
                    service_id: serviceId,
                }),
            })

            if (response.ok) {
                console.log("[Location] Sent successfully:", { lat, lng })
                setError(null) // Clear error on success
            } else {
                console.warn("[Location] Send failed:", response.status)
            }

            // Also via WebSocket for redundancy
            serviceWebSocket.sendLocationUpdate(lat, lng)
        } catch (error) {
            console.error("[Location] Failed to send location:", error)
        } finally {
            setIsSending(false)
        }
    }, [serviceId])

    useEffect(() => {
        if (!enabled || !serviceId) {
            console.log("[Location] Tracking disabled. enabled:", enabled, "serviceId:", serviceId)
            return
        }

        if (!navigator.geolocation) {
            setError("Tu navegador no soporta geolocalización. Usa un navegador moderno.")
            console.error("[Location] Geolocation API not supported")
            return
        }

        console.log("[Location] Starting location tracking for service:", serviceId)
        setError(null)

        // Watch position changes
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const newPos = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                }
                lastPositionRef.current = newPos
                setPosition(newPos)
                setError(null) // Clear any previous error
            },
            (geoError) => {
                // Provide specific error messages based on error code
                const errorMessages: Record<number, string> = {
                    1: "Permiso de ubicación denegado. Habilita el acceso a ubicación en tu navegador.",
                    2: "No se pudo obtener la ubicación. Verifica que el GPS esté activo.",
                    3: "Tiempo de espera agotado al obtener ubicación.",
                }
                const message = errorMessages[geoError.code] || `Error de geolocalización: ${geoError.message}`
                setError(message)
                console.warn("[Location]", message)
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 10000,
            }
        )

        // Send location at interval
        intervalRef.current = setInterval(() => {
            if (lastPositionRef.current) {
                sendLocation(lastPositionRef.current.lat, lastPositionRef.current.lng)
            }
        }, intervalMs)

        // Send initial location
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                sendLocation(pos.coords.latitude, pos.coords.longitude)
            },
            () => { },
            { enableHighAccuracy: true }
        )

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current)
                watchIdRef.current = null
            }
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [enabled, serviceId, intervalMs, sendLocation])

    return {
        lastPosition: position,
        error,
        isSending,
    }
}
