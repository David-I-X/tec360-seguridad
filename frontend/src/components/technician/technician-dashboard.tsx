"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2, MapPin, Calendar, CheckCircle, Briefcase, FileText, Star, DollarSign, Wrench, RefreshCw, ArrowLeft } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GlassCard } from "@/components/ui/glass-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import { getAvailableServices, getUserServices, acceptService } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: "Pendiente", color: "bg-yellow-500" },
    quoted: { label: "Cotizado", color: "bg-indigo-500" },
    assigned: { label: "Asignado", color: "bg-blue-500" },
    en_route: { label: "En Camino", color: "bg-blue-600" },
    arrived: { label: "Llegó", color: "bg-orange-500" },
    in_progress: { label: "En Progreso", color: "bg-purple-500" },
    completed: { label: "Completado", color: "bg-green-500" },
    cancelled: { label: "Cancelado", color: "bg-red-500" },
}

export function TechnicianDashboard() {
    const { user } = useAuth()
    const { toast } = useToast()
    const router = useRouter()

    const [availableServices, setAvailableServices] = useState<any[]>([])
    const [myServices, setMyServices] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)

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
    }, [])

    const handleAccept = async (serviceId: string) => {
        try {
            setProcessingId(serviceId)
            await acceptService(serviceId)
            await fetchData()

            toast({
                title: "¡Servicio Aceptado!",
                description: "Redirigiendo al servicio para iniciar tracking...",
                variant: "default",
            })

            setTimeout(() => {
                window.location.href = `/tecnicos/servicio/${serviceId}`
            }, 1000)

        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "No se pudo aceptar el servicio",
                variant: "destructive",
            })
        } finally {
            setProcessingId(null)
        }
    }

    // Gamification: Profile Progress
    const calculateProfileProgress = () => {
        if (!user) return 0;
        let score = 0;
        if (user.full_name) score += 20;
        if (user.email) score += 20;
        if (user.phone) score += 20;
        if (user.avatar_url) score += 40; // High weight for avatar
        return score;
    }

    const profileProgress = calculateProfileProgress();

    // Stats
    const activeCount = myServices.filter(s => ["assigned", "en_route", "arrived", "in_progress"].includes(s.status)).length
    const completedCount = myServices.filter(s => s.status === "completed").length

    if (isLoading && availableServices.length === 0 && myServices.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64 rounded-md" />
                        <Skeleton className="h-4 w-40 rounded-md" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-32 rounded-md" />
                        <Skeleton className="h-9 w-24 rounded-md" />
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
                </div>

                <div className="mt-8 space-y-4">
                    <Skeleton className="h-10 w-full max-w-sm rounded-md" />
                    <div className="grid md:grid-cols-2 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <GlassCard key={i} className="p-5 space-y-4">
                                <div className="flex justify-between">
                                    <Skeleton className="h-6 w-1/3" />
                                    <Skeleton className="h-5 w-20 rounded-full" />
                                </div>
                                <Skeleton className="h-4 w-1/2" />
                                <div className="flex justify-between items-center pt-2">
                                    <Skeleton className="h-8 w-24 rounded-md" />
                                    <Skeleton className="h-5 w-16" />
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
                <div>
                    <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver al Inicio
                    </Link>
                    <h2 className="text-3xl font-extrabold tracking-tight">
                        Panel de <span className="gradient-text">Técnico</span>
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        {user?.full_name ? `Hola, ${user.full_name.split(" ")[0]}` : "Bienvenido"}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => router.push("/tecnicos/mis-cotizaciones")}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                    >
                        <FileText className="h-4 w-4" />
                        Mis Cotizaciones
                    </Button>
                    <Button onClick={fetchData} variant="outline" size="sm" className="gap-2">
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        Actualizar
                    </Button>
                </div>
            </motion.div>

            {/* Gamification: Profile Completeness Banner */}
            {profileProgress < 100 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Link href="/perfil">
                        <GlassCard className="p-4 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 cursor-pointer transition-colors group">
                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                <div className="space-y-1 flex-1">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        Completa tu perfil de técnico <span className="text-emerald-500">+{100 - profileProgress} pts</span>
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Los clientes confían más en técnicos con perfiles completos y fotos reales.
                                    </p>
                                </div>
                                <div className="w-full sm:w-48 flex items-center gap-3">
                                    <Progress value={profileProgress} className="h-2 flex-1" />
                                    <span className="text-xs font-bold text-emerald-500">{profileProgress}%</span>
                                </div>
                            </div>
                        </GlassCard>
                    </Link>
                </motion.div>
            )}

            {/* Quick Stats */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
                <GlassCard className="p-4 text-center hover-lift">
                    <Briefcase className="h-5 w-5 text-blue-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-500">{availableServices.length}</p>
                    <p className="text-xs text-muted-foreground">Disponibles</p>
                </GlassCard>
                <GlassCard className="p-4 text-center hover-lift">
                    <Wrench className="h-5 w-5 text-purple-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-purple-500">{activeCount}</p>
                    <p className="text-xs text-muted-foreground">Activos</p>
                </GlassCard>
                <GlassCard className="p-4 text-center hover-lift">
                    <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-500">{completedCount}</p>
                    <p className="text-xs text-muted-foreground">Completados</p>
                </GlassCard>
                <GlassCard className="p-4 text-center hover-lift">
                    <Star className="h-5 w-5 text-yellow-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-yellow-500">{myServices.length}</p>
                    <p className="text-xs text-muted-foreground">Total Trabajos</p>
                </GlassCard>
            </motion.div>

            {/* Tabs */}
            <Tabs defaultValue="available" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="available">
                        Disponibles ({availableServices.length})
                    </TabsTrigger>
                    <TabsTrigger value="mine">
                        Mis Trabajos ({myServices.length})
                    </TabsTrigger>
                </TabsList>

                {/* Available services */}
                <TabsContent value="available" className="space-y-4">
                    {availableServices.length === 0 ? (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                            <GlassCard className="p-12 text-center border-dashed border-2 bg-gradient-to-b from-white/[0.01] to-transparent">
                                <div className="flex flex-col items-center gap-5 max-w-sm mx-auto">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                                        <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10 flex items-center justify-center relative shadow-xl">
                                            <Briefcase className="h-8 w-8 text-blue-400 drop-shadow-lg" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold mb-1">Sin servicios disponibles</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            No hay nuevos servicios en tu área en este momento. Mantén la página abierta para recibir alertas en vivo.
                                        </p>
                                    </div>
                                    <Button onClick={fetchData} variant="outline" size="sm" className="mt-2">
                                        <RefreshCw className="mr-2 h-4 w-4" /> Buscar de nuevo
                                    </Button>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <AnimatePresence>
                                {availableServices.map((service, i) => (
                                    <motion.div
                                        key={service.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                    >
                                        <ServiceCard
                                            service={service}
                                            onAction={() => handleAccept(service.id)}
                                            onQuote={() => router.push(`/tecnicos/cotizar/${service.id}`)}
                                            isProcessing={processingId === service.id}
                                            variant="available"
                                        />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </TabsContent>

                {/* My services */}
                <TabsContent value="mine" className="space-y-4">
                    {myServices.length === 0 ? (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                            <GlassCard className="p-12 text-center border-dashed border-2 bg-gradient-to-b from-white/[0.01] to-transparent">
                                <div className="flex flex-col items-center gap-5 max-w-sm mx-auto">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full" />
                                        <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10 flex items-center justify-center relative shadow-xl">
                                            <Wrench className="h-8 w-8 text-purple-400 drop-shadow-lg" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold mb-1">Tu agenda está vacía</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            Actualmente no tienes ningún trabajo asignado. Revisa la pestaña de "Disponibles" para aceptar nuevos retos.
                                        </p>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <AnimatePresence>
                                {myServices.map((service, i) => (
                                    <motion.div
                                        key={service.id}
                                        initial={{ opacity: 0, y: 20 }}
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
        </div>
    )
}

function ServiceCard({ service, onAction, onQuote, isProcessing, variant }: any) {
    const status = statusMap[service.status] || { label: service.status, color: "bg-gray-500" }

    return (
        <Card className="overflow-hidden hover-lift transition-all group">
            {/* Status bar at top */}
            <div className={`h-1 ${status.color}`} />
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <Badge className={`${status.color} text-white text-xs`}>
                        {variant === "available" ? "Disponible" : status.label}
                    </Badge>
                    {service.estimated_price && (
                        <span className="flex items-center gap-1 font-bold text-green-500">
                            <DollarSign className="h-4 w-4" />
                            {service.estimated_price.toLocaleString()}
                        </span>
                    )}
                </div>
                <CardTitle className="text-lg mt-2 group-hover:text-blue-500 transition-colors">
                    {service.title}
                </CardTitle>
                <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {service.service_city || "Sin ubicación"}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm pb-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {service.scheduled_date ? (
                        format(new Date(service.scheduled_date), "PPP", { locale: es })
                    ) : "Fecha por definir"}
                </div>
                <p className="line-clamp-2 text-muted-foreground">{service.description || "Sin descripción"}</p>
                <div className="text-xs text-muted-foreground mt-2">
                    Cliente: {service.client_name || "Usuario"}
                </div>
            </CardContent>
            <CardFooter className="flex gap-2 pt-0">
                {variant === "available" ? (
                    <>
                        <Button
                            className="flex-1 gradient-brand text-white hover:opacity-90"
                            onClick={onAction}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Aceptar
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={onQuote}
                            disabled={isProcessing}
                        >
                            <DollarSign className="mr-1 h-4 w-4" />
                            Cotizar
                        </Button>
                    </>
                ) : (
                    <Button
                        className="w-full"
                        onClick={onAction}
                        variant="outline"
                    >
                        Ver Detalles
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}
