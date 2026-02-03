"use client"

import { useState, useMemo, useRef, useCallback } from "react"
import { GoogleMap, useLoadScript, Marker, StandaloneSearchBox } from "@react-google-maps/api"
import { Button } from "@/components/ui/button"
import { Locate, MapPin, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

interface LocationPickerProps {
    onLocationSelect: (lat: number, lng: number) => void
    initialLat?: number
    initialLng?: number
}

const libraries: ("places")[] = ["places"]

export default function LocationPicker({
    onLocationSelect,
    initialLat = 6.2442, // Medellín default
    initialLng = -75.5636
}: LocationPickerProps) {

    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
        libraries: libraries,
    })

    const mapRef = useRef<google.maps.Map | null>(null)
    const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null)

    // We keep track of the center manually to report it on drag end
    const centerRef = useRef({ lat: initialLat, lng: initialLng })

    // UI state should only effect the "Locate Me" or initial load
    // We don't want to re-render map on every drag
    const [mapCenter, setMapCenter] = useState({ lat: initialLat, lng: initialLng })
    const [isLocating, setIsLocating] = useState(false)

    const onLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map
    }, [])

    const onUnmount = useCallback(() => {
        mapRef.current = null
    }, [])

    const handleCenterChanged = () => {
        if (!mapRef.current) return
        const newCenter = mapRef.current.getCenter()
        if (newCenter) {
            const lat = newCenter.lat()
            const lng = newCenter.lng()
            centerRef.current = { lat, lng }
            // Desacoplamos la actualización del padre para performance
            // Solo actualizamos al terminar arrastre (onDragEnd) o usamos debounce 
            // pero para UX instantánea, actualizamos aquí si no es costoso
            onLocationSelect(lat, lng)
        }
    }

    const onPlacesChanged = () => {
        const places = searchBoxRef.current?.getPlaces()
        if (places && places.length > 0) {
            const place = places[0]
            if (place.geometry && place.geometry.location) {
                const lat = place.geometry.location.lat()
                const lng = place.geometry.location.lng()
                setMapCenter({ lat, lng })
                onLocationSelect(lat, lng)
            }
        }
    }

    const onSearchLoad = (ref: google.maps.places.SearchBox) => {
        searchBoxRef.current = ref
    }

    const handleLocateMe = () => {
        setIsLocating(true)
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    }
                    setMapCenter(pos)
                    onLocationSelect(pos.lat, pos.lng)
                    setIsLocating(false)
                },
                (e) => {
                    console.error("Error: The Geolocation service failed.", e)
                    setIsLocating(false)
                }
            )
        } else {
            console.error("Error: Your browser doesn't support geolocation.")
            setIsLocating(false)
        }
    }

    if (loadError) return <div className="p-4 text-red-500 bg-red-50 rounded-lg">Error cargando Google Maps</div>
    if (!isLoaded) {
        return (
            <div className="h-[300px] w-full flex items-center justify-center bg-muted/20 rounded-xl animate-pulse">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Cargando Mapa...</span>
            </div>
        )
    }

    return (
        <div className="relative h-[350px] w-full overflow-hidden rounded-xl border">
            {/* Search Box Overlay */}
            <div className="absolute top-4 left-4 right-16 z-10">
                <StandaloneSearchBox onLoad={onSearchLoad} onPlacesChanged={onPlacesChanged}>
                    <div className="relative shadow-md">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar dirección..."
                            className="bg-white pl-9 border-0 focus-visible:ring-1"
                        />
                    </div>
                </StandaloneSearchBox>
            </div>

            <GoogleMap
                mapContainerClassName="w-full h-full"
                center={mapCenter}
                zoom={15}
                onLoad={onLoad}
                onUnmount={onUnmount}
                onCenterChanged={handleCenterChanged}
                options={{
                    disableDefaultUI: true,
                    zoomControl: true,
                    // styles: silverMapStyle // Optional: Custom style
                }}
            >
                {/* No Marker here because we use the fixed center pin overlay */}
            </GoogleMap>

            {/* Fixed Center Pin */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[0] text-primary pb-8">
                <MapPin className="h-10 w-10 fill-red-500 text-red-600 drop-shadow-xl animate-bounce" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-1 bg-black/50 rounded-full blur-[2px]"></div>
            </div>

            <Button
                variant="secondary"
                size="icon"
                className="absolute bottom-4 right-4 z-10 shadow-md bg-white hover:bg-gray-100"
                onClick={handleLocateMe}
            >
                {isLocating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Locate className="h-5 w-5" />
                )}
            </Button>
        </div>
    )
}
