"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Play, Square } from "lucide-react"
import { supabase_client as supabase } from "@/lib/auth-context"

interface SimulatorProps {
    technicianId: string
    start: { lat: number; lng: number }
    end: { lat: number; lng: number }
}

export function TechnicianLocationSimulator({ technicianId, start, end }: SimulatorProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        let interval: NodeJS.Timeout

        if (isPlaying) {
            interval = setInterval(async () => {
                setProgress(prev => {
                    const next = prev + 0.01 // 1% movement per tick
                    if (next >= 1) {
                        setIsPlaying(false)
                        return 1
                    }

                    // Linear interpolation
                    const currentLat = start.lat + (end.lat - start.lat) * next
                    const currentLng = start.lng + (end.lng - start.lng) * next

                    // Update Supabase (Fire and forget)
                    // supabase
                    //     .from("technicians")
                    //     .update({
                    //         current_lat: currentLat,
                    //         current_lon: currentLng
                    //     })
                    //     .eq("user_id", technicianId)
                    //     .then()

                    return next
                })
            }, 1000) // Update every second
        }

        return () => clearInterval(interval)
    }, [isPlaying, start, end, technicianId])

    if (process.env.NODE_ENV === 'production') return null

    return (
        <div className="fixed bottom-4 left-4 z-50 bg-black/80 text-white p-4 rounded-lg backdrop-blur text-xs">
            <h4 className="font-bold mb-2">Simulador GPS</h4>
            <div className="flex gap-2 items-center">
                <Button
                    size="sm"
                    variant={isPlaying ? "destructive" : "default"}
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="h-8"
                >
                    {isPlaying ? <Square className="h-3 w-3 mr-1" /> : <Play className="h-3 w-3 mr-1" />}
                    {isPlaying ? "Detener" : "Simular Ruta"}
                </Button>
                <span>{Math.round(progress * 100)}%</span>
            </div>
        </div>
    )
}
