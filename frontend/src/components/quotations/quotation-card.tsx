"use client"

import { motion } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Clock, Check, X, MessageSquare, DollarSign, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/ui/glass-card"
import { Badge } from "@/components/ui/badge"
import { TechLevel, getRankGlowClass } from "@/components/ui/tech-level"
import { Quotation } from "@/lib/quotations"

interface QuotationCardProps {
    quotation: Quotation
    variant: "client" | "technician"
    onApprove?: () => void
    onReject?: () => void
    onCounterOffer?: () => void
    isProcessing?: boolean
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: "Pendiente", color: "bg-yellow-500", icon: <Clock className="h-3 w-3" /> },
    approved: { label: "Aprobada", color: "bg-green-500", icon: <Check className="h-3 w-3" /> },
    rejected: { label: "Rechazada", color: "bg-red-500", icon: <X className="h-3 w-3" /> },
    counter_offered: { label: "Contraoferta", color: "bg-blue-500", icon: <MessageSquare className="h-3 w-3" /> },
    expired: { label: "Expirada", color: "bg-gray-500", icon: <Clock className="h-3 w-3" /> },
    cancelled: { label: "Cancelada", color: "bg-gray-500", icon: <X className="h-3 w-3" /> },
}

export function QuotationCard({
    quotation,
    variant,
    onApprove,
    onReject,
    onCounterOffer,
    isProcessing = false,
}: QuotationCardProps) {
    const status = statusConfig[quotation.status] || statusConfig.pending
    const techRank = (quotation as any).technician_rank || "bronze"
    const techRankPoints = (quotation as any).technician_rank_points || 0
    const glowClass = getRankGlowClass(techRank)

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <GlassCard className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center ring-2 ${glowClass}`}>
                            <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-semibold leading-none">
                                {quotation.technician_name || "Técnico"}
                            </p>
                            <TechLevel
                                rank={techRank}
                                points={techRankPoints}
                                rating={quotation.technician_rating || 0}
                                totalServices={quotation.technician_total_services || 0}
                                size="sm"
                                showPoints={true}
                            />
                        </div>
                    </div>
                    <Badge className={`${status.color} text-white flex items-center gap-1`}>
                        {status.icon}
                        {status.label}
                    </Badge>
                </div>

                {/* Amount */}
                <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold text-green-600">
                        ${quotation.amount.toLocaleString()}
                    </span>
                    {quotation.counter_amount && (
                        <span className="text-sm text-muted-foreground line-through">
                            → ${quotation.counter_amount.toLocaleString()} (contraoferta)
                        </span>
                    )}
                </div>

                {/* Description */}
                <div className="text-sm text-muted-foreground whitespace-pre-line">
                    {quotation.description}
                </div>

                {/* Client Response */}
                {quotation.client_response && (
                    <div className="p-3 rounded-lg bg-muted/50 text-sm">
                        <span className="font-medium">Respuesta del cliente: </span>
                        {quotation.client_response}
                    </div>
                )}

                {/* Dates */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                        Enviada: {format(new Date(quotation.created_at), "d MMM yyyy HH:mm", { locale: es })}
                    </span>
                    {quotation.expires_at && (
                        <span className="text-orange-500">
                            Expira: {format(new Date(quotation.expires_at), "d MMM HH:mm", { locale: es })}
                        </span>
                    )}
                </div>

                {/* Actions for Client */}
                {variant === "client" && quotation.status === "pending" && (
                    <div className="flex gap-2 pt-2">
                        <Button
                            onClick={onApprove}
                            disabled={isProcessing}
                            className="flex-1"
                        >
                            <Check className="mr-2 h-4 w-4" />
                            Aprobar
                        </Button>
                        <Button
                            onClick={onCounterOffer}
                            disabled={isProcessing}
                            variant="outline"
                            className="flex-1"
                        >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Contraoferta
                        </Button>
                        <Button
                            onClick={onReject}
                            disabled={isProcessing}
                            variant="destructive"
                            size="icon"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </GlassCard>
        </motion.div>
    )
}
