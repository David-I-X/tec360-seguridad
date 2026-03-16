"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2, MapPin, Calendar, CheckCircle, Briefcase, FileText, Star, DollarSign, Wrench, RefreshCw, ArrowLeft, User, Clock } from "lucide-react"
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

    // Formatting price
    const formattedPrice = service.estimated_price 
        ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(service.estimated_price)
        : null;

    // Formatting date and time
    const dateObj = service.scheduled_date ? new Date(service.scheduled_date) : null;
    const formattedDate = dateObj ? format(dateObj, "EEEE, d 'de' MMMM", { locale: es }) : "Fecha por definir";
    const formattedTime = service.scheduled_time || (dateObj ? format(dateObj, "h:mm a") : null);

    return (
        <Card className="overflow-hidden hover-lift transition-all group border-border/40 bg-card/50 backdrop-blur-sm relative">
            {/* Status Top Border */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${status.color} opacity-80`} />
            
            <CardHeader className="pb-2 pt-5">
                <div className="flex justify-between items-start mb-2">
                    <Badge className={`${variant === "available" ? "bg-amber-500 text-white border-0" : status.color} hover:opacity-90 transition-opacity`}>
                        {variant === "available" ? "Disponible" : status.label}
                    </Badge>
                    {formattedPrice && (
                        <span className="flex items-center gap-1 font-black text-green-500/90 dark:text-green-400 text-lg tracking-tight">
                            {formattedPrice}
                        </span>
                    )}
                </div>
                
                <CardTitle className="text-lg font-bold leading-tight group-hover:text-blue-500 transition-colors line-clamp-2">
                    {service.title}
                </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-3 text-sm pb-4">
                {/* Client & Location */}
                <div className="space-y-1.5 p-3 rounded-xl bg-muted/30 border border-muted/50">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                        <User className="h-4 w-4 text-blue-500" />
                        <span>{service.client?.full_name || service.client_name || "Cliente Confirmado"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground/80" />
                        <span className="truncate">{service.service_address}{service.service_city ? `, ${service.service_city}` : ""}</span>
                    </div>
                </div>

                {/* Date & Time */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-muted/50">
                    <div className="flex items-center gap-2 text-foreground font-medium capitalize text-xs">
                        <Calendar className="h-4 w-4 text-purple-500" />
                        <span>{formattedDate}</span>
                    </div>
                    {formattedTime && (
                        <div className="flex items-center gap-1.5 text-foreground font-bold text-xs bg-background/50 px-2 py-1 rounded-md shadow-sm border border-border/40">
                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                            <span>{formattedTime}</span>
                        </div>
                    )}
                </div>

                {/* Description */}
                {service.description && service.description.toLowerCase() !== "sin descripción" && (
                    <p className="line-clamp-2 text-xs text-muted-foreground italic border-l-2 border-muted-foreground/30 pl-2 ml-1">
                        "{service.description}"
                    </p>
                )}
            </CardContent>

            <CardFooter className="flex gap-2 pt-0 pb-4 px-4 bg-gradient-to-t from-background/50 to-transparent">
                {variant === "available" ? (
                    <>
                        <Button
                            className="flex-1 gradient-brand text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all font-bold"
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
                            className="flex-1 border-muted-foreground/30 hover:bg-muted/50 hover:text-foreground transition-all font-semibold"
                            onClick={onQuote}
                            disabled={isProcessing}
                        >
                            <DollarSign className="mr-1 h-4 w-4 text-green-500" />
                            Cotizar
                        </Button>
                    </>
                ) : (
                    <Button
                        className="w-full font-semibold border-muted-foreground/30 hover:bg-muted/50 transition-all"
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
