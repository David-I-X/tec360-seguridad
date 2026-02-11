"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Star, Send, Loader2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/ui/glass-card"
import { useToast } from "@/components/ui/use-toast"

interface RatingModalProps {
    serviceId: string
    technicianName?: string
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export function RatingModal({
    serviceId,
    technicianName = "el técnico",
    isOpen,
    onClose,
    onSuccess
}: RatingModalProps) {
    const [rating, setRating] = useState(0)
    const [hoveredRating, setHoveredRating] = useState(0)
    const [comment, setComment] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { toast } = useToast()

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

    const handleSubmit = async () => {
        if (rating === 0) {
            toast({
                title: "Selecciona una calificación",
                description: "Por favor da al menos una estrella",
                variant: "destructive",
            })
            return
        }

        const token = localStorage.getItem("access_token")
        if (!token) return

        setIsSubmitting(true)
        try {
            const response = await fetch(`${API_URL}/ratings/services/${serviceId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    rating,
                    comment: comment.trim() || null  // Send null for empty comments
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || "Error al enviar calificación")
            }

            toast({
                title: "¡Gracias por tu calificación!",
                description: "Tu opinión nos ayuda a mejorar",
            })

            onSuccess?.()
            onClose()
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const ratingLabels = [
        "",
        "Muy malo",
        "Malo",
        "Regular",
        "Bueno",
        "¡Excelente!",
    ]

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: "spring", duration: 0.3 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-md"
                >
                    <GlassCard className="p-6 relative">
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        {/* Header */}
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold mb-2">
                                ¿Cómo fue tu experiencia?
                            </h2>
                            <p className="text-muted-foreground">
                                Califica el servicio de {technicianName}
                            </p>
                        </div>

                        {/* Stars */}
                        <div className="flex justify-center gap-2 mb-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <motion.button
                                    key={star}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHoveredRating(star)}
                                    onMouseLeave={() => setHoveredRating(0)}
                                    className="p-1"
                                >
                                    <Star
                                        className={`h-10 w-10 transition-colors ${star <= (hoveredRating || rating)
                                            ? "fill-yellow-400 text-yellow-400"
                                            : "text-muted-foreground/30"
                                            }`}
                                    />
                                </motion.button>
                            ))}
                        </div>

                        {/* Rating label */}
                        <p className="text-center text-lg font-medium mb-6 h-7">
                            {ratingLabels[hoveredRating || rating]}
                        </p>

                        {/* Comment */}
                        <textarea
                            placeholder="Cuéntanos más sobre tu experiencia (opcional)"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full p-4 rounded-xl bg-background/50 border border-border/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                            rows={3}
                            maxLength={500}
                        />

                        {/* Submit button */}
                        <Button
                            onClick={handleSubmit}
                            disabled={rating === 0 || isSubmitting}
                            className="w-full mt-4 h-12 text-lg"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-5 w-5" />
                                    Enviar Calificación
                                </>
                            )}
                        </Button>

                        {/* Skip option */}
                        <button
                            onClick={onClose}
                            className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Calificar más tarde
                        </button>
                    </GlassCard>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
