"use client"

import { useEffect, useRef, useState, useCallback, useMemo } from "react"
import {
    GoogleMap,
    useLoadScript,
    Marker,
    Polyline,
} from "@react-google-maps/api"
import { Loader2, MapPin, Navigation2 } from "lucide-react"

interface ServiceMapProps {
    lat: number
    lng: number
    address?: string
    technicianLat?: number
    technicianLng?: number
}

// Clean map styles — light theme
const mapStyleLight: google.maps.MapTypeStyle[] = [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "water", stylers: [{ color: "#c9e8fc" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#e8e8e8" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
    { featureType: "landscape", stylers: [{ color: "#f3f4f6" }] },
]

// Dark map styles
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

// Custom SVG marker for the service destination
const SERVICE_MARKER_SVG = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
  <defs>
    <filter id="shadow" x="-20%" y="-10%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <path d="M20 0C8.95 0 0 8.95 0 20c0 15 20 32 20 32s20-17 20-32C40 8.95 31.05 0 20 0z" fill="#ef4444" filter="url(#shadow)"/>
  <circle cx="20" cy="18" r="9" fill="white"/>
  <circle cx="20" cy="18" r="5" fill="#ef4444"/>
</svg>
`)}`

// Custom SVG marker for the technician (blue dot with glow)
const TECHNICIAN_MARKER_SVG = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
  <defs>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#3b82f6" flood-opacity="0.5"/>
    </filter>
  </defs>
  <circle cx="22" cy="22" r="18" fill="#3b82f6" filter="url(#glow)" opacity="0.25"/>
  <circle cx="22" cy="22" r="12" fill="#3b82f6"/>
  <circle cx="22" cy="22" r="6" fill="white"/>
  <circle cx="22" cy="22" r="3" fill="#3b82f6"/>
</svg>
`)}`

// ============================================================
// Smooth marker animation helper
// Linearly interpolates between two positions using rAF
// ============================================================
function useSmoothMarkerPosition(
    targetLat: number | undefined,
    targetLng: number | undefined,
    durationMs: number = 1500
): { lat: number; lng: number } | null {
    const [displayPos, setDisplayPos] = useState<{ lat: number; lng: number } | null>(null)
    const animRef = useRef<number | null>(null)
    const prevPosRef = useRef<{ lat: number; lng: number } | null>(null)

    useEffect(() => {
        if (targetLat === undefined || targetLng === undefined) return

        const target = { lat: targetLat, lng: targetLng }

        // First position — snap instantly
        if (!prevPosRef.current) {
            prevPosRef.current = target
            setDisplayPos(target)
            return
        }

        const start = { ...prevPosRef.current }
        const startTime = performance.now()

        // Cancel any running animation
        if (animRef.current) cancelAnimationFrame(animRef.current)

        function animate(now: number) {
            const elapsed = now - startTime
            const progress = Math.min(elapsed / durationMs, 1)

            // Ease-out cubic for smooth deceleration
            const eased = 1 - Math.pow(1 - progress, 3)

            const currentLat = start.lat + (target.lat - start.lat) * eased
            const currentLng = start.lng + (target.lng - start.lng) * eased

            setDisplayPos({ lat: currentLat, lng: currentLng })

            if (progress < 1) {
                animRef.current = requestAnimationFrame(animate)
            } else {
                prevPosRef.current = target
            }
        }

        animRef.current = requestAnimationFrame(animate)

        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current)
        }
    }, [targetLat, targetLng, durationMs])

    return displayPos
}

// ============================================================
// Main ServiceMap component
// ============================================================
export default function ServiceMap({ lat, lng, address, technicianLat, technicianLng }: ServiceMapProps) {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
    })

    const mapRef = useRef<google.maps.Map | null>(null)
    const [osrmPath, setOsrmPath] = useState<{lat: number, lng: number}[]>([])
    const [eta, setEta] = useState<string | null>(null)
    const [distance, setDistance] = useState<string | null>(null)
    const routeRequested = useRef(false)
    const lastRoutePos = useRef<{ lat: number; lng: number } | null>(null)

    // Detect dark mode
    const isDark = typeof document !== "undefined" &&
        document.documentElement.classList.contains("dark")

    // Smooth marker animation
    const smoothTechPos = useSmoothMarkerPosition(technicianLat, technicianLng, 2000)

    // ============================================================
    // OSRM API — get real route along streets (Free fallback)
    // ============================================================
    useEffect(() => {
        if (!isLoaded || !technicianLat || !technicianLng || !lat || !lng) return

        // Only re-request directions if technician moved significantly (>200m)
        if (lastRoutePos.current) {
            const dlat = Math.abs(technicianLat - lastRoutePos.current.lat)
            const dlng = Math.abs(technicianLng - lastRoutePos.current.lng)
            // ~200m threshold
            if (dlat < 0.002 && dlng < 0.002 && routeRequested.current) return
        }

        async function fetchRoute() {
            try {
                const url = `https://router.project-osrm.org/route/v1/driving/${technicianLng},${technicianLat};${lng},${lat}?overview=full&geometries=geojson`
                const res = await fetch(url)
                const data = await res.json()
                
                if (data.routes && data.routes.length > 0) {
                    const route = data.routes[0]
                    const coords = route.geometry.coordinates
                    const path = coords.map((c: number[]) => ({ lat: c[1], lng: c[0] }))
                    
                    setOsrmPath(path)
                    routeRequested.current = true
                    lastRoutePos.current = { lat: technicianLat!, lng: technicianLng! }

                    if (route.duration) {
                        const mins = Math.round(route.duration / 60)
                        setEta(mins > 60 ? `${Math.floor(mins/60)} h ${mins%60} min` : `${mins} min`)
                    }
                    if (route.distance) {
                        setDistance((route.distance / 1000).toFixed(1) + " km")
                    }
                }
            } catch (err) {
                console.warn("[Map] OSRM route fetch failed:", err)
                // Fallback to straight line
                setOsrmPath([
                    { lat: technicianLat!, lng: technicianLng! },
                    { lat, lng }
                ])
            }
        }

        fetchRoute()
    }, [isLoaded, technicianLat, technicianLng, lat, lng])

    // Auto-follow: pan map to show technician when position updates
    useEffect(() => {
        if (!mapRef.current || !smoothTechPos) return

        // Fit bounds to include both markers
        const bounds = new google.maps.LatLngBounds()
        bounds.extend({ lat, lng })
        bounds.extend(smoothTechPos)
        mapRef.current.fitBounds(bounds, {
            top: 80,
            bottom: 80,
            left: 50,
            right: 50,
        })
    }, [smoothTechPos, lat, lng])

    // Map loaded callback
    const onMapLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map
    }, [])

    // Polyline options — blue route line
    const polylineOptions = useMemo(() => ({
        strokeColor: "#3b82f6",
        strokeOpacity: 0.8,
        strokeWeight: 5,
    }), [])

    // ============================================================
    // Render states
    // ============================================================
    if (loadError) {
        return (
            <div className="h-[350px] w-full flex flex-col items-center justify-center bg-destructive/5 rounded-xl gap-2">
                <MapPin className="h-8 w-8 text-destructive" />
                <p className="text-destructive text-sm font-medium">Error cargando Google Maps</p>
                <p className="text-xs text-muted-foreground">Verifica tu conexión a internet</p>
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

    if (lat === 0 && lng === 0) {
        return (
            <div className="h-[350px] w-full flex flex-col items-center justify-center bg-muted/10 rounded-xl gap-2">
                <MapPin className="h-8 w-8 text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground">Ubicación no disponible</span>
            </div>
        )
    }

    return (
        <div className="relative">
            <GoogleMap
                mapContainerClassName="w-full h-[350px] rounded-xl"
                center={!smoothTechPos ? { lat, lng } : undefined}
                zoom={15}
                onLoad={onMapLoad}
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
                {/* OSRM route (blue line along streets) */}
                {osrmPath.length > 0 && (
                    <Polyline
                        path={osrmPath}
                        options={polylineOptions}
                    />
                )}

                {/* Service destination marker (red pin) */}
                <Marker
                    position={{ lat, lng }}
                    title={address || "Ubicación del Servicio"}
                    icon={{
                        url: SERVICE_MARKER_SVG,
                        scaledSize: new google.maps.Size(36, 47),
                        anchor: new google.maps.Point(18, 47),
                    }}
                    zIndex={1}
                />

                {/* Technician marker (animated blue dot) */}
                {smoothTechPos && (
                    <Marker
                        position={smoothTechPos}
                        title="Técnico en camino"
                        icon={{
                            url: TECHNICIAN_MARKER_SVG,
                            scaledSize: new google.maps.Size(44, 44),
                            anchor: new google.maps.Point(22, 22),
                        }}
                        zIndex={2}
                    />
                )}
            </GoogleMap>

            {/* ETA + Distance overlay */}
            {(eta || distance) && (
                <div className="absolute top-3 left-3 bg-card/95 backdrop-blur-md rounded-lg px-3 py-2 shadow-lg border border-border/50">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Navigation2 className="h-4 w-4 text-blue-500" />
                        {eta && <span>{eta}</span>}
                        {eta && distance && <span className="text-muted-foreground">·</span>}
                        {distance && <span className="text-muted-foreground text-xs">{distance}</span>}
                    </div>
                </div>
            )}

            {/* Legend overlay */}
            {smoothTechPos && (
                <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur-md rounded-lg px-3 py-2 shadow-lg border border-border/50 text-xs flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                        Destino
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block animate-pulse" />
                        Técnico
                    </span>
                </div>
            )}
        </div>
    )
}
