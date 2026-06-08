"use client"

import { useState, useRef, useCallback } from "react"
import { GoogleMap, useLoadScript, StandaloneSearchBox } from "@react-google-maps/api"
import { Button } from "@/components/ui/button"
import { Locate, MapPin, Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"

interface LocationPickerProps {
    onLocationSelect: (lat: number, lng: number, address?: string) => void
    initialLat?: number
    initialLng?: number
}

const libraries: ("places")[] = ["places"]

// Clean, modern map styles
const mapStyleLight: google.maps.MapTypeStyle[] = [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "water", stylers: [{ color: "#c9e8fc" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#e8e8e8" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
    { featureType: "landscape", stylers: [{ color: "#f3f4f6" }] },
]

const mapStyleDark: google.maps.MapTypeStyle[] = [
    { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#8b92a5" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2a4a" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1e1e3a" }] },
    { featureType: "water", stylers: [{ color: "#0e1a2b" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
]

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

    const [mapCenter, setMapCenter] = useState({ lat: initialLat, lng: initialLng })
    const [isLocating, setIsLocating] = useState(false)

    const isDark = typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark")

    const onLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map
    }, [])

    const onUnmount = useCallback(() => {
        mapRef.current = null
    }, [])

    const reverseGeocode = (lat: number, lng: number) => {
        if (typeof google === "undefined") return
        const geocoder = new google.maps.Geocoder()
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === "OK" && results && results[0]) {
                onLocationSelect(lat, lng, results[0].formatted_address)
            } else {
                onLocationSelect(lat, lng)
            }
        })
    }

    const handleCenterChanged = () => {
        if (!mapRef.current) return
        const newCenter = mapRef.current.getCenter()
        if (newCenter) {
            const lat = newCenter.lat()
            const lng = newCenter.lng()
            centerRef.current = { lat, lng }
            onLocationSelect(lat, lng)
        }
    }

    const handleDragEnd = () => {
        if (!mapRef.current) return
        const newCenter = mapRef.current.getCenter()
        if (newCenter) {
            reverseGeocode(newCenter.lat(), newCenter.lng())
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
                onLocationSelect(lat, lng, place.formatted_address)
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
                    reverseGeocode(pos.lat, pos.lng)
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

    if (loadError) {
        return (
            <div className="h-[350px] w-full flex flex-col items-center justify-center bg-destructive/5 rounded-xl gap-2">
                <MapPin className="h-8 w-8 text-destructive" />
                <p className="text-destructive text-sm font-medium">Error cargando Google Maps</p>
            </div>
        )
    }

    if (!isLoaded) {
        return (
            <div className="h-[350px] w-full flex flex-col items-center justify-center bg-muted/10 rounded-xl gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
                <span className="text-sm text-muted-foreground font-medium">Cargando mapa...</span>
            </div>
        )
    }

    return (
        <div className="relative h-[350px] w-full overflow-hidden rounded-xl border border-border/50 shadow-sm">
            {/* Search Box Overlay */}
            <div className="absolute top-3 left-3 right-14 z-10">
                <StandaloneSearchBox onLoad={onSearchLoad} onPlacesChanged={onPlacesChanged}>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar dirección..."
                            className="bg-card/95 backdrop-blur-md pl-9 border-border/30 shadow-lg focus-visible:ring-1 focus-visible:ring-blue-500 rounded-lg"
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
                onDragEnd={handleDragEnd}
                options={{
                    disableDefaultUI: true,
                    zoomControl: true,
                    zoomControlOptions: {
                        position: typeof google !== "undefined" ? google.maps.ControlPosition.RIGHT_CENTER : undefined,
                    },
                    styles: isDark ? mapStyleDark : mapStyleLight,
                    gestureHandling: "greedy",
                }}
            >
                {/* No Marker here because we use the fixed center pin overlay */}
            </GoogleMap>

            {/* Fixed Center Pin — premium animated pin */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[1] pb-10">
                <div className="relative">
                    <MapPin className="h-10 w-10 text-red-500 drop-shadow-xl" style={{ fill: "#ef4444", stroke: "#ffffff", strokeWidth: 1 }} />
                    {/* Shadow dot beneath pin */}
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1.5 bg-black/30 rounded-full blur-[2px]" />
                </div>
            </div>

            {/* Instructions overlay */}
            <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur-md rounded-lg px-3 py-2 shadow-lg border border-border/50 text-xs text-muted-foreground">
                📍 Arrastra el mapa para seleccionar la ubicación
            </div>

            {/* Locate me button */}
            <Button
                variant="secondary"
                size="icon"
                className="absolute top-3 right-3 z-10 shadow-lg bg-card/95 backdrop-blur-md hover:bg-card border-border/30 rounded-lg"
                onClick={handleLocateMe}
            >
                {isLocating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Locate className="h-5 w-5 text-blue-500" />
                )}
            </Button>
        </div>
    )
}
