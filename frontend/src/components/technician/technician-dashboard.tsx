"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { 
    Loader2, 
    MapPin, 
    Calendar, 
    CheckCircle, 
    Briefcase, 
    FileText, 
    Star, 
    Wrench, 
    ArrowLeft, 
    User, 
    Clock, 
    Car, 
    Filter,
    Shield,
    Radio,
    ChevronRight,
    Navigation,
    Lock,
    Camera,
    Eye,
    MessageSquare,
    X
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GlassCard } from "@/components/ui/glass-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import { getImageUrl } from "@/lib/utils"
import { getClientObservations } from "@/lib/service-utils"
import { 
    getAvailableServices, 
    getUserServices, 
    acceptService,
    getMyDispatchOffers,
    acceptDispatchOffer,
    rejectDispatchOffer,
    getDemandHotspots,
    getCourseOnboardingStatus,
    CourseOnboardingStatus,
    DispatchOffer,
    DemandHotspot
} from "@/lib/api"
import { DispatchOffersBanner } from "@/components/technician/dispatch-offers-banner"
import { DemandHotspotsWidget } from "@/components/technician/demand-hotspots-widget"
import { useAuth } from "@/lib/auth-context"
import { BasicCoursesModal } from "@/components/technician/BasicCoursesModal"

// Helper: Status colors for corner badge (the ONLY dynamic status indicator)
const statusBadgeMap: Record<string, { label: string; badgeClass: string }> = {
    pending: { label: "PENDIENTE", badgeClass: "bg-amber-950/80 text-amber-300 border-amber-500/40" },
    available: { label: "DISPONIBLE", badgeClass: "bg-amber-950/80 text-amber-300 border-amber-500/40" },
    quoted: { label: "COTIZADO", badgeClass: "bg-indigo-950/80 text-indigo-300 border-indigo-500/40" },
    assigned: { label: "ASIGNADO", badgeClass: "bg-blue-950/80 text-blue-300 border-blue-500/40" },
    en_route: { label: "EN CAMINO", badgeClass: "bg-sky-950/80 text-sky-300 border-sky-500/40" },
    arrived: { label: "EN SITIO", badgeClass: "bg-amber-950/80 text-amber-300 border-amber-500/40" },
    in_progress: { label: "EN CURSO", badgeClass: "bg-purple-950/80 text-purple-300 border-purple-500/40" },
    completed: { label: "COMPLETADO", badgeClass: "bg-emerald-950/80 text-emerald-300 border-emerald-500/40" },
    confirmed: { label: "COMPLETADO", badgeClass: "bg-emerald-950/80 text-emerald-300 border-emerald-500/40" },
    cancelled: { label: "CANCELADO", badgeClass: "bg-rose-950/80 text-rose-300 border-rose-500/40" },
}

// Pillar Theme Configuration
// Instalaciones = Azul (#2563EB)
// Reacción 24/7 = Rojo (#E11D48)
// Mecánica Express = Amarillo (#F59E0B)
function getPillarTheme(service: any) {
    const type = (service.service_type || "").toLowerCase()
    const category = (service.service_metadata?.service_category || "").toLowerCase()
    const title = (service.title || "").toLowerCase()

    const isReaction = 
        type.includes("reaction") || 
        type.includes("reaccion") || 
        category.includes("reaction") || 
        title.includes("reacción") || 
        title.includes("reaccion") || 
        title.includes("escolta")

    const isMechanics = 
        ["oil_change", "tire_change", "battery_service", "brake_service", "chain_kit_service", "spark_bulbs_wipers"].includes(type) || 
        category.includes("mechanic") || 
        category === "quick_mechanics" || 
        title.includes("mecánica") || 
        title.includes("mecanica") || 
        title.includes("batería") || 
        title.includes("bateria") || 
        title.includes("obd2")

    if (isReaction) {
        return {
            pillar: "reaction",
            label: "REACCIÓN 24/7",
            cardBorder: "border-rose-600/40 hover:border-rose-500",
            topAccent: "bg-rose-600",
            categoryBadge: "bg-rose-950/70 text-rose-300 border-rose-500/50",
            plateBadge: "bg-rose-950/50 text-rose-300 border-rose-500/40",
            primaryBtn: "bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-rose-950/50",
            suppliesBadge: "bg-rose-950/40 text-rose-300 border-rose-500/30",
            acceptLabel: "Despachar Reacción",
        }
    }

    if (isMechanics) {
        return {
            pillar: "mechanics",
            label: "MECÁNICA EXP.",
            cardBorder: "border-amber-500/40 hover:border-amber-400",
            topAccent: "bg-amber-500",
            categoryBadge: "bg-amber-950/70 text-amber-300 border-amber-500/50",
            plateBadge: "bg-amber-950/50 text-amber-300 border-amber-500/40",
            primaryBtn: "bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-amber-950/50",
            suppliesBadge: "bg-amber-950/40 text-amber-300 border-amber-500/30",
            acceptLabel: "Tomar Servicio",
        }
    }

    // Default: Instalaciones Vehiculares (Blue)
    return {
        pillar: "installations",
        label: "INSTALACIONES",
        cardBorder: "border-blue-600/40 hover:border-blue-500",
        topAccent: "bg-blue-600",
        categoryBadge: "bg-blue-950/70 text-blue-300 border-blue-500/50",
        plateBadge: "bg-blue-950/50 text-blue-300 border-blue-500/40",
        primaryBtn: "bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-blue-950/50",
        suppliesBadge: "bg-blue-950/40 text-blue-300 border-blue-500/30",
        acceptLabel: "Aceptar Servicio",
    }
}

type MyServicesFilter = "all" | "active" | "completed" | "warranty_active" | "warranty_expired"
type CategoryFilter = "all" | "installations" | "reaction" | "mechanics"

export function TechnicianDashboard() {
    const { user } = useAuth()
    const { toast } = useToast()
    const router = useRouter()
    const searchParams = useSearchParams()

    const [availableServices, setAvailableServices] = useState<any[]>([])
    const [myServices, setMyServices] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [myServicesFilter, setMyServicesFilter] = useState<MyServicesFilter>("all")
    const [availableCategory, setAvailableCategory] = useState<CategoryFilter>("all")
    const [showBasicCoursesModal, setShowBasicCoursesModal] = useState(false)
    const [coursesModalMode, setCoursesModalMode] = useState<"intro" | "gate">("intro")
    const [courseStatus, setCourseStatus] = useState<CourseOnboardingStatus | null>(null)

    // Estados de despacho inteligente
    const [dispatchOffers, setDispatchOffers] = useState<DispatchOffer[]>([])
    const [demandHotspots, setDemandHotspots] = useState<DemandHotspot[]>([])
    const [isDispatchProcessing, setIsDispatchProcessing] = useState(false)
    const [detailService, setDetailService] = useState<any | null>(null)
    const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null)

    const fetchCourseOnboarding = async () => {
        try {
            const status = await getCourseOnboardingStatus()
            setCourseStatus(status)
        } catch {
            // Si falla la consulta, no bloquear la carga de consola
        }
    }

    const fetchDispatchData = async () => {
        try {
            const [offersRes, hotspotsRes] = await Promise.all([
                getMyDispatchOffers().catch(() => ({ offers: [], total: 0 })),
                getDemandHotspots().catch(() => ({ hotspots: [], total: 0 }))
            ])
            setDispatchOffers(offersRes.offers || [])
            setDemandHotspots(hotspotsRes.hotspots || [])
        } catch (err) {
            console.error("Error fetching dispatch data:", err)
        }
    }

    const requireCourseCompleted = (): boolean => {
        if (user?.role === "reaction_team") return true
        if (courseStatus && !courseStatus.can_operate) {
            setCoursesModalMode("gate")
            setShowBasicCoursesModal(true)
            return false
        }
        return true
    }

    const handleAcceptOffer = async (offerId: string) => {
        if (!requireCourseCompleted()) return
        try {
            setIsDispatchProcessing(true)
            const res = await acceptDispatchOffer(offerId)
            toast({
                title: "¡Misión Táctica Aceptada!",
                description: "Despacho confirmado. Redirigiendo a consola de misión...",
            })
            await fetchData()
            await fetchDispatchData()
            setTimeout(() => {
                window.location.href = `/tecnicos/servicio/${res.service_id}`
            }, 800)
        } catch (err: any) {
            if (err?.message?.includes("COURSE_REQUIRED")) {
                setCoursesModalMode("gate")
                setShowBasicCoursesModal(true)
                return
            }
            toast({
                title: "Error al aceptar oferta",
                description: err.message || "La oferta pudo haber expirado o fue asignada a otro especialista.",
                variant: "destructive"
            })
            await fetchDispatchData()
        } finally {
            setIsDispatchProcessing(false)
        }
    }

    const handleRejectOffer = async (offerId: string) => {
        try {
            setIsDispatchProcessing(true)
            await rejectDispatchOffer(offerId)
            setDispatchOffers(prev => prev.filter(o => o.id !== offerId))
            toast({
                title: "Oferta declinada",
                description: "El sistema reasignará la misión al siguiente especialista.",
            })
        } catch (err: any) {
            console.error("Error rejecting offer:", err)
        } finally {
            setIsDispatchProcessing(false)
        }
    }

    // Check if new technician should see the basic courses modal
    useEffect(() => {
        if (!user?.id) return
        const isNewParam = searchParams.get("isNewTech") === "1"
        const seenStorage = localStorage.getItem(`tec360_basic_courses_seen_${user.id}`)
        if (isNewParam || !seenStorage) {
            setShowBasicCoursesModal(true)
        }
    }, [user?.id, searchParams])

    const handleDismissIntroModal = () => {
        setShowBasicCoursesModal(false)
        if (user?.id) {
            localStorage.setItem(`tec360_basic_courses_seen_${user.id}`, "true")
        }
    }

    const fetchData = async () => {
        try {
            setIsLoading(true)
            const [available, mine] = await Promise.all([
                getAvailableServices(),
                getUserServices()
            ])
            const availableData = available.items || available.services || available || []
            const myData = mine.items || mine.services || mine || []

            setAvailableServices(Array.isArray(availableData) ? availableData : [])
            setMyServices(Array.isArray(myData) ? myData : [])
        } catch (error) {
            console.error("Error fetching services:", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
        fetchDispatchData()
        fetchCourseOnboarding()

        // Polling táctico cada 7 segundos para ofertas prioritarias en vivo
        const dispatchInterval = setInterval(() => {
            fetchDispatchData()
        }, 7000)

        return () => clearInterval(dispatchInterval)
    }, [])

    const handleQuote = (serviceId: string) => {
        if (!requireCourseCompleted()) return
        router.push(`/tecnicos/cotizar/${serviceId}`)
    }

    const handleAccept = async (serviceId: string) => {
        if (!requireCourseCompleted()) return
        try {
            setProcessingId(serviceId)
            await acceptService(serviceId)
            await fetchData()

            toast({
                title: "¡Servicio Aceptado!",
                description: "Redirigiendo a la consola de misión en tiempo real...",
                variant: "default",
            })

            setTimeout(() => {
                window.location.href = `/tecnicos/servicio/${serviceId}`
            }, 1000)

        } catch (error: any) {
            if (error?.message?.includes("COURSE_REQUIRED")) {
                setCoursesModalMode("gate")
                setShowBasicCoursesModal(true)
                return
            }
            toast({
                title: "Error",
                description: error.message || "No se pudo aceptar el servicio",
                variant: "destructive",
            })
        } finally {
            setProcessingId(null)
        }
    }

    // Profile Progress
    const calculateProfileProgress = () => {
        if (!user) return 0
        let score = 0
        if (user.full_name) score += 20
        if (user.email) score += 20
        if (user.phone) score += 20
        if (user.avatar_url) score += 40
        return score
    }

    const profileProgress = calculateProfileProgress()

    // Active Mission Detection
    const activeServices = myServices.filter(s => ["assigned", "en_route", "arrived", "in_progress"].includes(s.status))
    const activeMission = activeServices[0] || null
    const activeCount = activeServices.length
    const completedCount = myServices.filter(s => ["completed", "confirmed"].includes(s.status)).length

    // Category Filter for "Disponibles"
    const QUICK_MECHANICS_TYPES = ["oil_change", "tire_change", "battery_service", "brake_service", "chain_kit_service", "spark_bulbs_wipers"]
    const filteredAvailableServices = availableServices.filter((s) => {
        const type = (s.service_type || "").toLowerCase()
        const cat = (s.service_metadata?.service_category || "").toLowerCase()
        const title = (s.title || "").toLowerCase()

        const isReaction = type.includes("reaction") || type.includes("reaccion") || cat.includes("reaction") || title.includes("reacción") || title.includes("reaccion") || title.includes("escolta")
        const isMechanics = QUICK_MECHANICS_TYPES.includes(type) || cat.includes("mechanic") || cat === "quick_mechanics" || title.includes("mecánica") || title.includes("batería") || title.includes("obd2")

        if (availableCategory === "reaction") return isReaction
        if (availableCategory === "mechanics") return isMechanics
        if (availableCategory === "installations") return !isReaction && !isMechanics
        return true
    })

    // Filter "Mis Trabajos"
    const filteredMyServices = myServices.filter((service) => {
        if (myServicesFilter === "active") {
            return ["assigned", "en_route", "arrived", "in_progress"].includes(service.status)
        } else if (myServicesFilter === "completed") {
            return ["completed", "confirmed"].includes(service.status)
        } else if (myServicesFilter === "warranty_active") {
            return service.warranty_status === "active"
        } else if (myServicesFilter === "warranty_expired") {
            return service.warranty_status === "expired"
        }
        return true
    })

    const myFilterButtons: { key: MyServicesFilter; label: string }[] = [
        { key: "all", label: "Todos" },
        { key: "active", label: "Activos" },
        { key: "completed", label: "Completados" },
        { key: "warranty_active", label: "🛡️ Garantía (30d)" },
        { key: "warranty_expired", label: "Garantía Vencida" },
    ]

    if (isLoading && availableServices.length === 0 && myServices.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64 rounded-md" />
                        <Skeleton className="h-4 w-40 rounded-md" />
                    </div>
                    <Skeleton className="h-9 w-36 rounded-md" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
                </div>
                <div className="mt-8 space-y-4">
                    <Skeleton className="h-10 w-full max-w-sm rounded-md" />
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-80 w-full rounded-2xl" />)}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto w-full">
            {/* Header: Tactical Consola de Especialistas */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-white/5"
            >
                <div>
                    <Link 
                        href="/" 
                        className="inline-flex items-center text-xs font-mono text-slate-400 hover:text-white transition-colors mb-2 gap-1.5"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Volver al Inicio
                    </Link>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
                            Consola de Especialistas
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider bg-blue-950/80 text-blue-400 border border-blue-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                            [EN SERVICIO]
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">
                        Centro de asignación táctica y control de servicios en tiempo real
                    </p>
                </div>

                {/* Right Action: ONLY Mis Cotizaciones (Sincronizar Radar removed) */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button
                        onClick={() => router.push("/tecnicos/mis-cotizaciones")}
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-blue-500/30 bg-blue-950/30 hover:bg-blue-900/40 text-blue-300 hover:text-white font-mono text-xs gap-2 transition-all"
                    >
                        <FileText className="h-3.5 w-3.5 text-blue-400" />
                        Mis Cotizaciones
                    </Button>
                </div>
            </motion.div>

            {/* Alertas de Despacho Inteligente en Vivo */}
            <DispatchOffersBanner
                offers={dispatchOffers}
                onAccept={handleAcceptOffer}
                onReject={handleRejectOffer}
                isProcessing={isDispatchProcessing}
            />

            {/* Zonas Calientes de Demanda */}
            <DemandHotspotsWidget hotspots={demandHotspots} />

            {/* Verification / Certified Specialist Banner */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Link href="/configuracion">
                    <GlassCard className="p-4 border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-950/30 cursor-pointer transition-colors group rounded-xl">
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                            <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
                                    <h3 className="text-sm font-bold text-white">
                                        Perfil Técnico Certificado Verificado ({profileProgress || 100}%)
                                    </h3>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                                        CERTIFICACIÓN ACTIVA
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400">
                                    Documentación DIAN, antecedentes y matrícula técnica vigentes ante Tec360.
                                </p>
                            </div>
                            <div className="w-full sm:w-48 flex items-center gap-3">
                                <Progress value={profileProgress || 100} className="h-2 flex-1 bg-slate-800" />
                                <span className="text-xs font-mono font-bold text-emerald-400">{profileProgress || 100}%</span>
                            </div>
                        </div>
                    </GlassCard>
                </Link>
            </motion.div>

            {/* 4-Column Operational HUD */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
            >
                <div className="p-4 rounded-xl bg-slate-900/70 border border-blue-500/30 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Solicitudes en Radar</span>
                        <Radio className="h-4 w-4 text-blue-400 animate-pulse" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black font-mono text-blue-400">{availableServices.length}</p>
                    <p className="text-[11px] text-blue-300/80 font-medium mt-0.5">Disponibles para aceptar</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/70 border border-sky-500/30 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Misiones en Curso</span>
                        <Wrench className="h-4 w-4 text-sky-400" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black font-mono text-sky-400">{activeCount}</p>
                    <p className="text-[11px] text-sky-300/80 font-medium mt-0.5">Operaciones activas</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/70 border border-emerald-500/30 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Historial Cerrado</span>
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">{completedCount}</p>
                    <p className="text-[11px] text-emerald-300/80 font-medium mt-0.5">Servicios concluidos</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/70 border border-amber-500/30 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Calificación Clientes</span>
                        <Star className="h-4 w-4 text-amber-400 fill-amber-400/30" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black font-mono text-amber-400">★ 4.96</p>
                    <p className="text-[11px] text-amber-300/80 font-medium mt-0.5">Especialista Élite Tec360</p>
                </div>
            </motion.div>

            {/* Tabs: Radar vs Mis Trabajos */}
            <Tabs defaultValue="available" className="space-y-4 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                    <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:flex bg-slate-950/80 border border-white/10 p-1 rounded-xl">
                        <TabsTrigger 
                            value="available"
                            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white font-mono text-xs px-2 sm:px-4 py-2 rounded-lg gap-1.5 sm:gap-2 justify-center"
                        >
                            <Radio className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                                <span className="hidden sm:inline">Solicitudes en </span>Radar ({availableServices.length})
                            </span>
                        </TabsTrigger>
                        <TabsTrigger 
                            value="mine"
                            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white font-mono text-xs px-2 sm:px-4 py-2 rounded-lg gap-1.5 sm:gap-2 justify-center"
                        >
                            <Briefcase className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                                Mis Trabajos <span className="hidden sm:inline">Asignados </span>({myServices.length})
                            </span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Sub-filters for Available Services */}
                    <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                        <Button
                            variant={availableCategory === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setAvailableCategory("all")}
                            className={`h-8 text-xs font-mono rounded-lg transition-all ${
                                availableCategory === "all"
                                    ? "bg-blue-600 text-white border-blue-500"
                                    : "bg-slate-950/60 border-white/10 text-slate-400 hover:text-white"
                            }`}
                        >
                            Todos ({availableServices.length})
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAvailableCategory("installations")}
                            className={`h-8 text-xs font-mono rounded-lg transition-all ${
                                availableCategory === "installations"
                                    ? "bg-blue-950/90 text-blue-300 border-blue-500 font-bold"
                                    : "bg-slate-950/60 border-white/10 text-blue-400 hover:bg-blue-950/40"
                            }`}
                        >
                            Instalaciones
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAvailableCategory("reaction")}
                            className={`h-8 text-xs font-mono rounded-lg transition-all ${
                                availableCategory === "reaction"
                                    ? "bg-rose-950/90 text-rose-300 border-rose-500 font-bold"
                                    : "bg-slate-950/60 border-white/10 text-rose-400 hover:bg-rose-950/40"
                            }`}
                        >
                            Reacción 24/7
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAvailableCategory("mechanics")}
                            className={`h-8 text-xs font-mono rounded-lg transition-all ${
                                availableCategory === "mechanics"
                                    ? "bg-amber-950/90 text-amber-300 border-amber-500 font-bold"
                                    : "bg-slate-950/60 border-white/10 text-amber-400 hover:bg-amber-950/40"
                            }`}
                        >
                            Mecánica Express
                        </Button>
                    </div>
                </div>

                {/* Tab Content: Available Services */}
                <TabsContent value="available" className="space-y-4 pt-2">
                    {filteredAvailableServices.length === 0 ? (
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                            <div className="p-12 text-center rounded-2xl border border-white/10 bg-slate-900/30 backdrop-blur-md">
                                <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                    <Radio className="h-7 w-7 text-blue-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">Radar en Búsqueda Activa</h3>
                                <p className="text-xs text-slate-400 max-w-md mx-auto">
                                    No hay solicitudes pendientes en este pilar en tu zona. Mantén abierta la consola para recibir alertas de despacho táctico en vivo.
                                </p>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <AnimatePresence>
                                {filteredAvailableServices.map((service, i) => (
                                    <motion.div
                                        key={service.id}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <ServiceCard
                                            service={service}
                                            onAction={() => handleAccept(service.id)}
                                            onQuote={() => handleQuote(service.id)}
                                            onViewDetail={() => setDetailService(service)}
                                            onPreviewPhoto={(url: string) => setZoomPhotoUrl(url)}
                                            isProcessing={processingId === service.id}
                                            variant="available"
                                        />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </TabsContent>

                {/* Tab Content: My Services */}
                <TabsContent value="mine" className="space-y-4 pt-2">
                    {/* Sub-filter bar for assigned */}
                    <div className="flex flex-wrap items-center gap-1.5 pb-2">
                        <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0 mr-1" />
                        {myFilterButtons.map((btn) => (
                            <Button
                                key={btn.key}
                                variant={myServicesFilter === btn.key ? "default" : "outline"}
                                size="sm"
                                onClick={() => setMyServicesFilter(btn.key)}
                                className={`h-8 text-xs font-mono rounded-lg ${
                                    myServicesFilter === btn.key
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-950/60 border-white/10 text-slate-400 hover:text-white"
                                }`}
                            >
                                {btn.label}
                            </Button>
                        ))}
                    </div>

                    {filteredMyServices.length === 0 ? (
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                            <div className="p-12 text-center rounded-2xl border border-white/10 bg-slate-900/30 backdrop-blur-md">
                                <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-slate-800/50 border border-white/10 flex items-center justify-center">
                                    <Briefcase className="h-7 w-7 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">
                                    {myServicesFilter !== "all" ? "Sin resultados para este filtro" : "Agenda sin misiones asignadas"}
                                </h3>
                                <p className="text-xs text-slate-400 max-w-md mx-auto">
                                    {myServicesFilter !== "all"
                                        ? `No hay misiones registradas bajo el filtro seleccionado.`
                                        : 'Revisa la pestaña "Solicitudes en Radar" para tomar un nuevo servicio y comenzar a operar.'
                                    }
                                </p>
                            </div>
                        </motion.div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <AnimatePresence>
                                {filteredMyServices.map((service, i) => (
                                    <motion.div
                                        key={service.id}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <ServiceCard
                                            service={service}
                                            onAction={() => router.push(`/tecnicos/servicio/${service.id}`)}
                                            variant="mine"
                                        />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Active Mission Banner (Bottom Persistent Bar) */}
            {activeMission && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 sm:p-5 rounded-2xl bg-slate-950/95 border border-blue-500/50 backdrop-blur-xl shadow-2xl shadow-blue-950/40 relative overflow-hidden"
                >
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider text-blue-400">
                                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                                    MISIÓN ASIGNADA EN CURSO · {activeMission.title?.toUpperCase()}
                                </span>
                            </div>
                            <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                                <Car className="h-4 w-4 text-blue-400" />
                                {activeMission.vehicle_model || "Vehículo"} 
                                {activeMission.vehicle_plate && ` [${activeMission.vehicle_plate.toUpperCase()}]`}
                                <span className="text-xs text-slate-400 font-normal">
                                    · {activeMission.client?.full_name || activeMission.client_name || "Cliente Particular"}
                                </span>
                            </h4>
                            <p className="text-xs text-slate-400 flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                <span className="truncate">{activeMission.service_address || "Ubicación en radar"}</span>
                            </p>
                        </div>

                        <Button
                            onClick={() => router.push(`/tecnicos/servicio/${activeMission.id}`)}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold rounded-xl px-5 py-2.5 shadow-lg shadow-blue-600/30 gap-2 shrink-0"
                        >
                            <Navigation className="h-4 w-4" />
                            Abrir Consola de Misión en Vivo →
                        </Button>
                    </div>
                </motion.div>
            )}

            <BasicCoursesModal
                isOpen={showBasicCoursesModal}
                onClose={() => setShowBasicCoursesModal(false)}
                onDismissForever={handleDismissIntroModal}
                mode={coursesModalMode}
                pendingCourseSlug={courseStatus?.pending_courses?.[0]?.slug}
                pendingCourseTitle={courseStatus?.pending_courses?.[0]?.title}
            />

            {/* Modal Detalle Completo de Servicio antes de Aceptar / Cotizar */}
            {detailService && (() => {
                const detailTheme = getPillarTheme(detailService)
                const detailObs = getClientObservations(detailService)
                const detailPhoto = detailService.vehicle_photo_url ? getImageUrl(detailService.vehicle_photo_url) : ""
                const detailDate = detailService.scheduled_date ? new Date(detailService.scheduled_date) : null
                const detailPrice = detailService.estimated_price
                    ? new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(detailService.estimated_price)
                    : null

                return (
                    <div
                        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setDetailService(null)}
                    >
                        <div
                            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-950 border border-white/15 shadow-2xl p-5 sm:p-6 space-y-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1.5">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider border ${detailTheme.categoryBadge}`}>
                                        {detailTheme.label}
                                    </span>
                                    <h3 className="text-lg font-extrabold text-white leading-snug">
                                        {detailService.title}
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDetailService(null)}
                                    className="p-2 rounded-full bg-slate-900 text-slate-300 hover:text-white border border-white/10 cursor-pointer"
                                    aria-label="Cerrar detalle"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {(detailService.vehicle_model || detailService.vehicle_plate) && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold border ${detailTheme.plateBadge}`}>
                                        <Car className="h-3.5 w-3.5" />
                                        {detailService.vehicle_model ? `${detailService.vehicle_model.toUpperCase()} · ` : ""}
                                        {detailService.vehicle_plate ? detailService.vehicle_plate.toUpperCase() : "VEHÍCULO REGISTRADO"}
                                    </span>
                                    {detailPrice && (
                                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-lg">
                                            {detailPrice}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Ubicación + Fecha y Hora */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-1">
                                    <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-400">
                                        <MapPin className="h-3.5 w-3.5 text-blue-400" /> Lugar del servicio
                                    </span>
                                    <p className="text-slate-100 font-medium">
                                        {detailService.service_address}{detailService.service_city ? `, ${detailService.service_city}` : ""}
                                    </p>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-1">
                                    <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-400">
                                        <Calendar className="h-3.5 w-3.5 text-amber-400" /> Fecha y hora
                                    </span>
                                    <p className="text-slate-100 font-medium capitalize">
                                        {detailDate
                                            ? format(detailDate, "EEEE d 'de' MMMM · h:mm a", { locale: es })
                                            : (detailService.scheduled_time || "Coordinación inmediata")}
                                    </p>
                                </div>
                            </div>

                            {/* Observaciones Protagonistas */}
                            <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-400/50 space-y-1.5">
                                <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-amber-300">
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    Observaciones y falla reportada por el cliente
                                </span>
                                <p className="text-sm text-slate-100 leading-relaxed font-medium whitespace-pre-wrap">
                                    {detailObs.primary || "El cliente no registró observaciones adicionales."}
                                </p>
                                {detailObs.notes && (
                                    <p className="text-xs text-amber-200/90 pt-1 border-t border-amber-400/20">
                                        Nota adicional: {detailObs.notes}
                                    </p>
                                )}
                            </div>

                            {detailService.service_metadata?.supplies_provider && (
                                <div className={`p-3 rounded-xl border text-xs ${detailTheme.suppliesBadge}`}>
                                    <p className="font-semibold">
                                        {detailTheme.pillar === "mechanics"
                                            ? (detailService.service_metadata.supplies_provider === "client" ? "🧰 Cliente pone el repuesto" : "🚚 Técnico suministra repuesto")
                                            : (detailService.service_metadata.supplies_provider === "client" ? "🧰 Cliente tiene el dispositivo" : "📦 Técnico suministra dispositivo")
                                        }
                                    </p>
                                    {detailService.service_metadata.supplies_notes && (
                                        <p className="text-[11px] opacity-90 mt-0.5">Ref: {detailService.service_metadata.supplies_notes}</p>
                                    )}
                                </div>
                            )}

                            {/* Foto enviada por el cliente al crear el servicio */}
                            {detailPhoto && (
                                <div className="space-y-1.5">
                                    <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                                        <Camera className="h-3.5 w-3.5 text-blue-400" />
                                        Foto subida por el cliente (toca para ampliar)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setZoomPhotoUrl(detailPhoto)}
                                        className="w-full h-56 rounded-xl overflow-hidden border border-white/15 bg-black cursor-pointer"
                                    >
                                        <img src={detailPhoto} alt="Foto enviada por el cliente" className="w-full h-full object-cover hover:scale-[1.02] transition-transform" />
                                    </button>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-white/10">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        const sid = detailService.id
                                        setDetailService(null)
                                        handleQuote(sid)
                                    }}
                                    disabled={processingId === detailService.id}
                                    className="sm:w-36 rounded-xl border-white/15 bg-slate-900 hover:bg-slate-800 text-slate-200 font-mono text-xs cursor-pointer"
                                >
                                    Cotizar
                                </Button>
                                <Button
                                    onClick={() => {
                                        const sid = detailService.id
                                        setDetailService(null)
                                        handleAccept(sid)
                                    }}
                                    disabled={processingId === detailService.id}
                                    className={`flex-1 rounded-xl text-xs py-2.5 cursor-pointer ${detailTheme.primaryBtn}`}
                                >
                                    <CheckCircle className="mr-1.5 h-4 w-4" />
                                    {detailTheme.acceptLabel}
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* Lightbox de Foto Ampliada */}
            {zoomPhotoUrl && (
                <div
                    className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setZoomPhotoUrl(null)}
                >
                    <div className="relative max-w-2xl w-full rounded-2xl overflow-hidden bg-slate-950 border border-white/15 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => setZoomPhotoUrl(null)}
                            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-slate-900/90 text-white hover:bg-slate-800 border border-white/15 cursor-pointer"
                            aria-label="Cerrar foto"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        <img src={zoomPhotoUrl} alt="Foto del vehículo enviada por el cliente" className="w-full max-h-[80vh] object-contain bg-black" />
                    </div>
                </div>
            )}
        </div>
    )
}

function ServiceCard({ service, onAction, onQuote, onViewDetail, onPreviewPhoto, isProcessing, variant }: any) {
    const isCompleted = ["completed", "confirmed"].includes(service.status)
    const pillarTheme = getPillarTheme(service)
    const clientObservations = getClientObservations(service)
    const clientPhotoUrl = service.vehicle_photo_url ? getImageUrl(service.vehicle_photo_url) : ""

    // Corner status badge: the ONLY element that changes color dynamically based on status
    const currentStatus = variant === "available" ? "available" : service.status
    const statusConfig = statusBadgeMap[currentStatus] || { 
        label: (currentStatus || "EN PROCESO").toUpperCase(), 
        badgeClass: "bg-slate-800 text-slate-300 border-white/10" 
    }

    // Formatting price
    const formattedPrice = service.estimated_price 
        ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(service.estimated_price)
        : null

    // Formatting date and time
    const dateObj = service.scheduled_date ? new Date(service.scheduled_date) : null
    const formattedDate = dateObj ? format(dateObj, "EEEE, d 'de' MMMM", { locale: es }) : "Hoy coordinado"
    const formattedTime = service.scheduled_time || (dateObj ? format(dateObj, "h:mm a") : null)

    return (
        <Card className={`overflow-hidden transition-all duration-200 group bg-slate-950/70 backdrop-blur-md relative rounded-2xl border ${pillarTheme.cardBorder} hover:shadow-xl`}>
            {/* Top Pillar Accent Line */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${pillarTheme.topAccent}`} />
            
            <CardHeader className="pb-2 pt-5 px-5">
                <div className="flex justify-between items-start mb-2 gap-2">
                    {/* Category Pillar Badge */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider border ${pillarTheme.categoryBadge}`}>
                        {pillarTheme.label}
                    </span>

                    {/* Corner Status Badge (ONLY dynamic status color) */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider border ${statusConfig.badgeClass}`}>
                        {statusConfig.label}
                    </span>
                </div>
                
                <CardTitle className="text-base font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-2 leading-snug">
                    {service.title}
                </CardTitle>

                {/* Vehicle Plate Chip in Pillar Tone */}
                {(service.vehicle_plate || service.vehicle_model) && (
                    <div className="mt-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${pillarTheme.plateBadge}`}>
                            <Car className="h-3.5 w-3.5 shrink-0" />
                            {service.vehicle_model ? `${service.vehicle_model.toUpperCase()} · ` : ""}
                            {service.vehicle_plate ? service.vehicle_plate.toUpperCase() : "REGISTRADO"}
                        </span>
                    </div>
                )}
            </CardHeader>
            
            <CardContent className="space-y-2.5 text-xs pb-4 px-5">
                {/* Client & Address */}
                <div className="space-y-1 p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                    <div className="flex items-center gap-2 text-slate-200 font-medium">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">{service.client?.full_name || service.client_name || "Cliente Particular"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                        <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                        <span className="truncate">{service.service_address}{service.service_city ? `, ${service.service_city}` : ""}</span>
                    </div>
                </div>

                {/* Schedule & Timing */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40 border border-white/5">
                    <div className="flex items-center gap-1.5 text-slate-300 capitalize text-[11px]">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">{formattedDate}</span>
                    </div>
                    {formattedTime && (
                        <div className="flex items-center gap-1 text-slate-200 font-mono font-bold text-[11px] bg-slate-800/80 px-2 py-0.5 rounded border border-white/10">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>{formattedTime}</span>
                        </div>
                    )}
                </div>

                {/* Supplies info badge for mechanics */}
                {service.service_metadata?.supplies_provider && (
                    <div className={`p-2 rounded-lg border text-[11px] space-y-0.5 ${pillarTheme.suppliesBadge}`}>
                        <p className="font-semibold">
                            {pillarTheme.pillar === "mechanics"
                                ? (service.service_metadata.supplies_provider === "client" ? "🧰 Cliente pone el repuesto" : "🚚 Técnico suministra repuesto")
                                : (service.service_metadata.supplies_provider === "client" ? "🧰 Cliente tiene el dispositivo" : "📦 Técnico suministra dispositivo")
                            }
                        </p>
                        {service.service_metadata.supplies_notes && (
                            <p className="text-[10px] opacity-90 truncate">Ref: {service.service_metadata.supplies_notes}</p>
                        )}
                    </div>
                )}

                {/* Client Observations Callout */}
                {clientObservations.primary && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/40 space-y-1">
                        <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
                            <MessageSquare className="h-3 w-3 shrink-0" />
                            Observaciones del cliente
                        </span>
                        <p className="text-slate-100 text-xs leading-snug line-clamp-3 font-medium">
                            {clientObservations.primary}
                        </p>
                        {clientObservations.notes && (
                            <p className="text-amber-200/90 text-[11px] line-clamp-2">Nota: {clientObservations.notes}</p>
                        )}
                    </div>
                )}

                {/* Client Creation Photo */}
                {clientPhotoUrl && (
                    <button
                        type="button"
                        onClick={() => onPreviewPhoto ? onPreviewPhoto(clientPhotoUrl) : onViewDetail?.()}
                        className="group relative w-full h-28 rounded-xl overflow-hidden border border-white/10 hover:border-amber-400/50 transition-colors bg-slate-900 cursor-pointer block"
                        title="Ampliar foto enviada por el cliente"
                    >
                        <img
                            src={clientPhotoUrl}
                            alt="Foto enviada por el cliente"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950/85 border border-white/15 text-[10px] font-mono text-slate-200">
                            <Camera className="h-3 w-3 text-amber-400" /> Foto cliente
                        </span>
                    </button>
                )}

                {/* Price Display */}
                {formattedPrice && (
                    <div className="pt-1 flex items-baseline justify-between">
                        <div>
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Tarifa Acordada</span>
                            <span className="text-xl font-mono font-black text-white tracking-tight">
                                {formattedPrice}
                            </span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                            <Lock className="h-3 w-3 text-emerald-400" />
                            Tec360 Escrow
                        </span>
                    </div>
                )}

                {/* Guarantee info for mine variant */}
                {variant === "mine" && service.warranty_status === "active" && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-blue-950/40 border border-blue-500/30 text-[11px] text-blue-300 font-mono">
                        <span className="flex items-center gap-1">
                            <Shield className="h-3.5 w-3.5 text-blue-400" />
                            Garantía Tec360 Activa
                        </span>
                        <span className="font-bold">{service.warranty_days_left}d restantes</span>
                    </div>
                )}
            </CardContent>

            <CardFooter className="flex flex-col gap-2 pt-0 pb-4 px-5">
                {variant === "available" ? (
                    <>
                        <div className="flex gap-2 w-full">
                            <Button
                                className={`flex-1 rounded-xl text-xs py-2.5 transition-all cursor-pointer ${pillarTheme.primaryBtn}`}
                                onClick={onAction}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                                        {pillarTheme.acceptLabel}
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                className="w-24 rounded-xl border-white/10 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono transition-all cursor-pointer"
                                onClick={onQuote}
                                disabled={isProcessing}
                            >
                                Cotizar
                            </Button>
                        </div>
                        {onViewDetail && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full h-8 rounded-lg text-[11px] font-mono text-slate-300 hover:text-white hover:bg-slate-900/90 border border-white/5 cursor-pointer gap-1.5"
                                onClick={onViewDetail}
                            >
                                <Eye className="h-3.5 w-3.5 text-blue-400" />
                                Ver detalle completo y foto
                            </Button>
                        )}
                    </>
                ) : (
                    <Button
                        className="w-full rounded-xl font-mono text-xs border-white/10 bg-slate-900/60 hover:bg-slate-800 text-slate-200 hover:text-white transition-all gap-1.5 py-2.5"
                        onClick={onAction}
                        variant="outline"
                    >
                        Ver Detalles del Trabajo
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}
