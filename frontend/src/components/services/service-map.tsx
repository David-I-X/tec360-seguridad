"use client"

import { GoogleMap, useLoadScript, Marker } from "@react-google-maps/api"
import { Loader2 } from "lucide-react"

interface ServiceMapProps {
    lat: number
    lng: number
    address?: string
    technicianLat?: number
    technicianLng?: number
}

export default function ServiceMap({ lat, lng, address, technicianLat, technicianLng }: ServiceMapProps) {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
    })

    if (loadError) {
        return (
            <div className="h-[300px] w-full flex items-center justify-center bg-red-50 text-red-500">
                Error cargando Google Maps
            </div>
        )
    }

    if (!isLoaded) {
        return (
            <div className="h-[300px] w-full flex items-center justify-center bg-muted/20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Cargando Mapa...</span>
            </div>
        )
    }

    // If coordinates are 0,0 (not set), show placeholder
    if (lat === 0 && lng === 0) {
        return (
            <div className="h-[300px] w-full flex items-center justify-center bg-muted/20 text-muted-foreground">
                Ubicación no disponible
            </div>
        )
    }

    return (
        <GoogleMap
            mapContainerClassName="w-full h-[300px]"
            center={{ lat, lng }}
            zoom={15}
            options={{
                disableDefaultUI: true,
                zoomControl: true,
            }}
        >
            {/* Service Location Marker */}
            <Marker
                position={{ lat, lng }}
                title={address || "Ubicación del Servicio"}
            />

            {/* Technician Location Marker (if tracking) */}
            {technicianLat && technicianLng && (
                <Marker
                    position={{ lat: technicianLat, lng: technicianLng }}
                    title="Técnico en camino"
                    icon={{
                        url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                    }}
                />
            )}
        </GoogleMap>
    )
}
