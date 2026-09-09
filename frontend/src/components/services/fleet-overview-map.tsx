"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { GoogleMap, useLoadScript, Marker, InfoWindow } from "@react-google-maps/api"
import { Loader2, MapPin, ExternalLink } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"

interface FleetOverviewMapProps {
    services: any[]
    className?: string
}

const libraries: ("places")[] = ["places"]

// Clean map styles — light theme
const mapStyleLight: google.maps.MapTypeStyle[] = [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "water", stylers: [{ color: "#dbeafe" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#fed7aa" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
    { featureType: "landscape", stylers: [{ color: "#f8fafc" }] },
]

// Dark map styles
const mapStyleDark: google.maps.MapTypeStyle[] = [
    { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#334155" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#312e81" }] },
    { featureType: "water", stylers: [{ color: "#020617" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "landscape", stylers: [{ color: "#0b1329" }] },
]

function getMarkerColor(status: string): string {
    if (["assigned", "en_route", "arrived", "in_progress"].includes(status)) return "#10b981" // Emerald / Live
    if (status === "quoted") return "#6366f1" // Indigo
    if (status === "pending") return "#f59e0b" // Amber
    if (status === "completed") return "#059669" // Green
    if (status === "cancelled") return "#ef4444" // Red
    return "#8b5cf6" // Violet default
}

function createMarkerSvg(color: string): string {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
  <defs>
    <filter id="shadow" x="-20%" y="-10%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 28 18 28s18-14.5 18-28C36 8.06 27.94 0 18 0z" fill="${color}" filter="url(#shadow)"/>
  <circle cx="18" cy="16" r="7.5" fill="white"/>
  <circle cx="18" cy="16" r="4.5" fill="${color}"/>
</svg>
`)}`
}

export function FleetOverviewMap({ services, className }: FleetOverviewMapProps) {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
        libraries,
    })

    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    const isDark = mounted ? resolvedTheme === "dark" : true
    const mapRef = useRef<google.maps.Map | null>(null)
    const [activeService, setActiveService] = useState<any | null>(null)

    // Valid coordinates filter
    const validServices = services.filter(
        (s) => s.service_lat && s.service_lon && (s.service_lat !== 0 || s.service_lon !== 0)
    )

    // Update map style when theme switches
    useEffect(() => {
        if (mapRef.current && isLoaded) {
            mapRef.current.setOptions({
                styles: isDark ? mapStyleDark : mapStyleLight,
            })
        }
    }, [isDark, isLoaded])

    // Fit bounds on load
    const onMapLoad = useCallback(
        (map: google.maps.Map) => {
            mapRef.current = map
            map.setOptions({
                styles: resolvedTheme === "dark" ? mapStyleDark : mapStyleLight,
            })

            if (validServices.length > 0) {
                const bounds = new google.maps.LatLngBounds()
                validServices.forEach((s) => {
                    bounds.extend({ lat: s.service_lat, lng: s.service_lon })
                })
                map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 })
                if (validServices.length === 1) {
                    map.setZoom(14)
                }
            }
        },
        [validServices, resolvedTheme]
    )

    if (loadError) {
        return (
            <div className="h-[450px] w-full rounded-2xl flex flex-col items-center justify-center bg-destructive/5 gap-2 border border-destructive/20">
                <MapPin className="h-8 w-8 text-destructive" />
                <p className="text-sm font-medium text-destructive">Error al cargar el mapa de cobertura</p>
            </div>
        )
    }

    if (!isLoaded) {
        return (
            <div className="h-[450px] w-full rounded-2xl flex flex-col items-center justify-center bg-slate-900/50 gap-3 border border-white/10">
                <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Cargando Mapa de Flota y Servicios...
                </span>
            </div>
        )
    }

    const defaultCenter = validServices.length > 0
        ? { lat: validServices[0].service_lat, lng: validServices[0].service_lon }
        : { lat: 6.2442, lng: -75.5636 }

    return (
        <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-200/90 dark:border-white/10 shadow-xl ${className || "h-[500px]"}`}>
            <GoogleMap
                mapContainerClassName="w-full h-full"
                center={defaultCenter}
                zoom={12}
                onLoad={onMapLoad}
                options={{
                    disableDefaultUI: true,
                    zoomControl: true,
                    styles: isDark ? mapStyleDark : mapStyleLight,
                    gestureHandling: "greedy",
                }}
            >
                {validServices.map((service) => {
                    const color = getMarkerColor(service.status)
                    return (
                        <Marker
                            key={service.id}
                            position={{ lat: service.service_lat, lng: service.service_lon }}
                            title={service.title}
                            icon={{
                                url: createMarkerSvg(color),
                                scaledSize: new google.maps.Size(32, 40),
                                anchor: new google.maps.Point(16, 40),
                            }}
                            onClick={() => setActiveService(service)}
                        />
                    )
                })}

                {activeService && (
                    <InfoWindow
                        position={{ lat: activeService.service_lat, lng: activeService.service_lon }}
                        onCloseClick={() => setActiveService(null)}
                    >
                        <div className="p-1.5 max-w-xs text-slate-900">
                            <h4 className="font-bold text-xs truncate mb-1">{activeService.title}</h4>
                            <p className="text-[11px] text-slate-600 mb-2 truncate">
                                {activeService.service_address || "Sin dirección"}
                            </p>
                            <Link href={`/servicios/${activeService.id}`}>
                                <button className="w-full text-xs font-semibold py-1 px-2.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors flex items-center justify-center gap-1 cursor-pointer">
                                    <span>Abrir Servicio</span>
                                    <ExternalLink className="w-3 h-3" />
                                </button>
                            </Link>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>

            {/* Map Legend Overlay */}
            <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg border border-slate-200/90 dark:border-white/10 text-[11px] flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    En Operación
                </span>
                <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                    Cotizaciones
                </span>
                <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    Pendiente
                </span>
                <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-green-600 inline-block" />
                    Completado
                </span>
            </div>
        </div>
    )
}
