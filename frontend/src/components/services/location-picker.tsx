"use client"

import { useEffect, useState, useRef } from "react"
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet"
import { Button } from "@/components/ui/button"
import { Locate, MapPin } from "lucide-react"

// Importar CSS de Leaflet (requerido)
import "leaflet/dist/leaflet.css"
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css"
import "leaflet-defaulticon-compatibility"

interface LocationPickerProps {
    onLocationSelect: (lat: number, lng: number) => void
    initialLat?: number
    initialLng?: number
}

// Componente auxiliar para detectar movimiento del mapa y actualizar centro
function MapController({ onCenterChange }: { onCenterChange: (lat: number, lng: number) => void }) {
    const map = useMap()

    // Evento al terminar de arrastrar el mapa
    useMapEvents({
        moveend: () => {
            const center = map.getCenter()
            onCenterChange(center.lat, center.lng)
        }
    })

    return null
}

export default function LocationPicker({
    onLocationSelect,
    initialLat = 6.2442, // Medellín default
    initialLng = -75.5636
}: LocationPickerProps) {

    const [position, setPosition] = useState({ lat: initialLat, lng: initialLng })
    const [isLocating, setIsLocating] = useState(false)

    // Función para obtener ubicación actual
    const handleLocateMe = () => {
        setIsLocating(true)
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords
                setPosition({ lat: latitude, lng: longitude })
                onLocationSelect(latitude, longitude)
                setIsLocating(false)
                // Nota: En una implementación real, necesitaríamos acceso a la instancia del mapa para hacer flyTo
                // o pasar la prop 'center' al MapContainer de forma reactiva (key change)
            },
            (err) => {
                console.error("Error obteniendo ubicación:", err)
                setIsLocating(false)
            }
        )
    }

    // Notificar al padre cuando cambia el centro (el usuario arrastró el mapa)
    const handleCenterChange = (lat: number, lng: number) => {
        // Solo actualizamos el padre, no el estado local 'position' visual 
        // porque el marcador central es fijo visualmente (falso pin)
        onLocationSelect(lat, lng)
    }

    return (
        <div className="relative h-[300px] w-full overflow-hidden rounded-xl border z-0">
            {/* Mapa */}
            {/* Usamos 'key' para forzar re-render si cambia position bruscamente (ej. Locate Me) */}
            <MapContainer
                key={`${position.lat}-${position.lng}`}
                center={[position.lat, position.lng]}
                zoom={15}
                scrollWheelZoom={true}
                className="h-full w-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapController onCenterChange={handleCenterChange} />
            </MapContainer>

            {/* Pin Central Fijo (UI Overlay) */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] text-primary pb-8">
                <MapPin className="h-10 w-10 fill-current drop-shadow-xl animate-bounce" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-1 bg-black/50 rounded-full blur-[2px]"></div>
            </div>

            {/* Botón Localizame */}
            <Button
                variant="secondary"
                size="icon"
                className="absolute bottom-4 right-4 z-[400] shadow-md"
                onClick={handleLocateMe}
            >
                {isLocating ? (
                    <span className="animate-spin">⌛</span>
                ) : (
                    <Locate className="h-5 w-5" />
                )}
            </Button>
        </div>
    )
}
