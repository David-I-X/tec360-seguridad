"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2, MapPin, Calendar, CheckCircle, Briefcase } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { getAvailableServices, getUserServices, acceptService } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

export function TechnicianDashboard() {
    const { user } = useAuth()
    const { toast } = useToast()

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

            setAvailableServices(available.services || [])
            setMyServices(mine.services || [])
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

            // Actualizar listas
            await fetchData()

            toast({
                title: "¡Servicio Aceptado!",
                description: "El servicio ha sido asignado a tu lista de trabajos.",
                variant: "default",
            })

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

    if (isLoading && availableServices.length === 0 && myServices.length === 0) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Panel de Técnico</h2>
                <Button onClick={fetchData} variant="outline" size="sm">
                    Actualizar
                </Button>
            </div>

            <Tabs defaultValue="available" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="available">Disponibles ({availableServices.length})</TabsTrigger>
                    <TabsTrigger value="mine">Mis Trabajos ({myServices.length})</TabsTrigger>
                </TabsList>

                {/* Pestaña: DISPONIBLES */}
                <TabsContent value="available" className="space-y-4">
                    {availableServices.length === 0 ? (
                        <Card>
                            <CardContent className="pt-6 text-center text-muted-foreground">
                                No hay servicios disponibles en este momento.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {availableServices.map((service) => (
                                <ServiceCard
                                    key={service.id}
                                    service={service}
                                    actionLabel="Aceptar Trabajo"
                                    onAction={() => handleAccept(service.id)}
                                    isProcessing={processingId === service.id}
                                    variant="available"
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Pestaña: MIS TRABAJOS */}
                <TabsContent value="mine" className="space-y-4">
                    {myServices.length === 0 ? (
                        <Card>
                            <CardContent className="pt-6 text-center text-muted-foreground">
                                Aún no tienes trabajos asignados. Ve a la pestaña "Disponibles" para tomar uno.
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {myServices.map((service) => (
                                <ServiceCard
                                    key={service.id}
                                    service={service}
                                    actionLabel="Ver Detalles"
                                    onAction={() => { }} // TODO: Ir a detalle
                                    variant="mine"
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}

function ServiceCard({ service, actionLabel, onAction, isProcessing, variant }: any) {
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <Badge variant={variant === "available" ? "secondary" : "default"}>
                        {variant === "available" ? "Disponible" : service.status}
                    </Badge>
                    {service.estimated_price && (
                        <span className="font-semibold text-green-600">
                            ${service.estimated_price.toLocaleString()}
                        </span>
                    )}
                </div>
                <CardTitle className="text-lg mt-2">{service.title}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {service.service_city}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {service.scheduled_date ? (
                        format(new Date(service.scheduled_date), "PPP", { locale: es })
                    ) : "Fecha por definir"}
                </div>
                <p className="line-clamp-2">{service.description || "Sin descripción"}</p>
                <div className="text-xs text-muted-foreground mt-2">
                    Cliente: {service.client_name || "Usuario"}
                </div>
            </CardContent>
            <CardFooter>
                <Button
                    className="w-full"
                    onClick={onAction}
                    disabled={isProcessing}
                    variant={variant === "available" ? "default" : "outline"}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Procesando...
                        </>
                    ) : (
                        actionLabel
                    )}
                </Button>
            </CardFooter>
        </Card>
    )
}
