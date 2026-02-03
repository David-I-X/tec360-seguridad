"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { GoogleMap, useLoadScript, Marker, DirectionsRenderer } from "@react-google-maps/api"
import { Loader2, Car, MapPin, Navigation } from "lucide-react"
// import { supabase_client as supabase } from "@/lib/auth-context" // Ajusta según tu export de supabase
import { cn } from "@/lib/utils"

interface LiveTrackingMapProps {
    technicianId: string
    destination: { lat: number; lng: number } // Ubicación del servicio
    containerClassName?: string
}

const libraries: ("places")[] = ["places"]

export function LiveTrackingMap({ technicianId, destination, containerClassName }: LiveTrackingMapProps) {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
        libraries: libraries,
    })

    const [technicianPos, setTechnicianPos] = useState<{ lat: number; lng: number } | null>(null)
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
    const [stats, setStats] = useState<{ distance: string; duration: string } | null>(null)

    // Supabase Realtime Subscription
    // useEffect(() => {
    //     if (!technicianId) return

    //     // 1. Initial fetch
    //     const fetchInitialPos = async () => {
    //         const { data } = await supabase
    //             .from("technicians")
    //             .select("current_lat, current_lon")
    //             .eq("user_id", technicianId)
    //             .single()

    //         if (data && data.current_lat) {
    //             setTechnicianPos({ lat: data.current_lat, lng: data.current_lon })
    //         }
    //     }
    //     fetchInitialPos()

    //     // 2. Subscribe to changes
    //     const channel = supabase
    //         .channel(`tracking_${technicianId}`)
    //         .on(
    //             'postgres_changes',
    //             {
    //                 event: 'UPDATE',
    //                 schema: 'public',
    //                 table: 'technicians',
    //                 filter: `user_id=eq.${technicianId}`
    //             },
    //             (payload) => {
    //                 const newLat = payload.new.current_lat
    //                 const newLon = payload.new.current_lon
    //                 if (newLat && newLon) {
    //                     setTechnicianPos({ lat: newLat, lng: newLon })
    //                 }
    //             }
    //         )
    //         .subscribe()

    //     return () => {
    //         supabase.removeChannel(channel)
    //     }
    // }, [technicianId])

    // Directions Service
    useEffect(() => {
        if (!isLoaded || !technicianPos || !destination) return

        const service = new google.maps.DirectionsService()

        service.route(
            {
                origin: technicianPos,
                destination: destination,
                travelMode: google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status === "OK" && result) {
                    setDirections(result)
                    // Extract duration/distance
                    const leg = result.routes[0].legs[0]
                    setStats({
                        distance: leg.distance?.text || "",
                        duration: leg.duration?.text || ""
                    })
                } else {
                    console.error("Directions request failed due to " + status)
                }
            }
        )
    }, [isLoaded, technicianPos, destination])

    if (loadError) return <div className="text-red-500">Error cargando mapa</div>
    if (!isLoaded) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>

    return (
        <div className={cn("relative w-full h-[400px] rounded-xl overflow-hidden border", containerClassName)}>
            <GoogleMap
                mapContainerClassName="w-full h-full"
                center={technicianPos || destination}
                zoom={14}
                options={{ disableDefaultUI: true }}
            >
                {/* Ruta */}
                {directions && (
                    <DirectionsRenderer
                        directions={directions}
                        options={{
                            suppressMarkers: true, // Custom markers
                            polylineOptions: {
                                strokeColor: "#2563eb",
                                strokeWeight: 5,
                                strokeOpacity: 0.7
                            }
                        }}
                    />
                )}

                {/* Técnico Marker */}
                {technicianPos && (
                    <Marker
                        position={technicianPos}
                        icon={{
                            url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png", // Replace with custom Car icon
                            scaledSize: new google.maps.Size(40, 40)
                        }}
                        zIndex={2}
                    />
                )}

                {/* Destino Marker */}
                <Marker
                    position={destination}
                    icon={{
                        url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                        scaledSize: new google.maps.Size(40, 40)
                    }}
                    zIndex={1}
                />
            </GoogleMap>

            {/* Info Overlay (Uber Style) */}
            {stats && (
                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-4 rounded-lg shadow-lg flex items-center justify-between border">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-full">
                            <Car className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="font-bold text-lg">{stats.duration}</p>
                            <p className="text-xs text-muted-foreground">{stats.distance} de distancia</p>
                        </div>
                    </div>
                    <div className="bg-green-100 px-3 py-1 rounded-full text-green-700 text-xs font-bold">
                        En camino
                    </div>
                </div>
            )}
        </div>
    )
}
