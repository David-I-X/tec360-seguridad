"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
    ArrowLeft, Shield, MapPin, Briefcase, Star,
    BadgeCheck, Clock, CheckCircle, Loader2
} from "lucide-react"

import { ProtectedRoute } from "@/lib/auth-context"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { StarDisplay } from "@/components/ui/star-rating"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

const SPEC_LABELS: Record<string, string> = {
    gps_installation: "📍 GPS",
    gps_maintenance: "🔧 Mtto. GPS",
    alarm_installation: "🔔 Alarmas",
    alarm_maintenance: "🔧 Mtto. Alarma",
    camera_installation: "📹 Dashcam",
    camera_maintenance: "🔧 Mtto. Dashcam",
    other: "🛠️ Otro",
}

/* ─── Star bar for rating breakdown ─────────────── */
function RatingBar({ stars, count, total }: { stars: number; count: number; total: number }) {
    const pct = total > 0 ? (count / total) * 100 : 0
    return (
        <div className="flex items-center gap-2 text-xs">
            <span className="w-2 text-muted-foreground">{stars}</span>
            <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
            <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                <motion.div
                    className="h-full bg-amber-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.3 + stars * 0.05, duration: 0.6 }}
                />
            </div>
            <span className="w-5 text-right text-muted-foreground">{count}</span>
        </div>
    )
}

/* ─── Review card ────────────────────────────────── */
function ReviewCard({ review }: { review: any }) {
    return (
        <div className="border-b border-border/20 py-4 last:border-0">
            <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-500/15 flex items-center justify-center text-sm font-bold text-blue-400 shrink-0">
                    {(review.client_name || "C").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-medium">{review.client_name || "Cliente"}</p>
                        <StarDisplay rating={review.rating} size="sm" />
                    </div>
                    {review.comment && (
                        <p className="text-xs text-muted-foreground leading-relaxed">"{review.comment}"</p>
                    )}
                    {review.service_type && (
                        <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                            {SPEC_LABELS[review.service_type] || review.service_type}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

/* ─── Main content ──────────────────────────────── */
function TechnicianProfileContent() {
    const params = useParams()
    const router = useRouter()
    const [profile, setProfile] = useState<any>(null)
    const [stats, setStats] = useState<any>(null)
    const [reviews, setReviews] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")

    const techId = params.id as string

    useEffect(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}

        async function load() {
            try {
                const [profileRes, statsRes, reviewsRes] = await Promise.all([
                    fetch(`${API_URL}/technicians/${techId}/public`),
                    fetch(`${API_URL}/ratings/technicians/${techId}/stats`),
                    fetch(`${API_URL}/ratings/technicians/${techId}?page_size=10`),
                ])

                if (!profileRes.ok) throw new Error("Técnico no encontrado")

                const [profileData, statsData, reviewsData] = await Promise.all([
                    profileRes.json(),
                    statsRes.ok ? statsRes.json() : null,
                    reviewsRes.ok ? reviewsRes.json() : null,
                ])

                setProfile(profileData)
                setStats(statsData)
                setReviews(reviewsData?.ratings || reviewsData?.items || [])
            } catch (err: any) {
                setError(err.message)
            } finally {
                setIsLoading(false)
            }
        }

        load()
    }, [techId])

    if (isLoading) {
        return (
            <div className="flex justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error || !profile) {
        return (
            <GlassCard className="p-10 text-center">
                <p className="text-red-400 mb-4">{error || "Técnico no encontrado"}</p>
                <Button variant="outline" onClick={() => router.back()}>Volver</Button>
            </GlassCard>
        )
    }

    const avgRating = stats?.average_rating ?? profile.average_rating ?? 0
    const totalServices = stats?.total_ratings ?? profile.total_services ?? 0
    const distribution = stats?.rating_distribution || {}

    return (
        <div className="max-w-2xl mx-auto space-y-5">
            {/* Back */}
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2">
                <ArrowLeft className="w-5 h-5" />
            </Button>

            {/* Hero card */}
            <GlassCard className="p-7">
                <div className="flex items-start gap-5">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt="" className="w-20 h-20 rounded-2xl object-cover" />
                        ) : (
                            <div className="w-20 h-20 rounded-2xl gradient-brand flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-blue-500/20">
                                {(profile.full_name || "T").charAt(0)}
                            </div>
                        )}
                        {profile.is_verified && (
                            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center border-2 border-background">
                                <BadgeCheck className="w-3.5 h-3.5 text-white" />
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-bold">{profile.full_name || "Técnico"}</h1>
                            {profile.is_verified && (
                                <span className="text-[10px] font-mono bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded-full px-2 py-0.5">
                                    SENA ✓
                                </span>
                            )}
                        </div>
                        {avgRating > 0 && (
                            <div className="mt-1.5">
                                <StarDisplay rating={avgRating} count={totalServices} size="md" />
                            </div>
                        )}
                        {profile.city && (
                            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                                <MapPin className="w-3 h-3" /> {profile.city}
                            </p>
                        )}
                        {profile.experience_years && (
                            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <Briefcase className="w-3 h-3" /> {profile.experience_years} año{profile.experience_years !== 1 ? "s" : ""} de experiencia
                            </p>
                        )}
                    </div>
                </div>

                {profile.bio && (
                    <p className="mt-4 text-sm text-muted-foreground leading-relaxed border-t border-border/20 pt-4">
                        {profile.bio}
                    </p>
                )}
            </GlassCard>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { icon: CheckCircle, label: "Completados", value: profile.total_services || 0, color: "text-green-400" },
                    { icon: Star, label: "Calificación", value: avgRating > 0 ? avgRating.toFixed(1) : "—", color: "text-amber-400" },
                    { icon: Clock, label: "Radio cobertura", value: profile.service_radius_km ? `${profile.service_radius_km}km` : "—", color: "text-blue-400" },
                ].map((item) => (
                    <GlassCard key={item.label} className="p-4 text-center">
                        <item.icon className={`w-5 h-5 ${item.color} mx-auto mb-1.5`} />
                        <p className="text-xl font-bold">{item.value}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{item.label}</p>
                    </GlassCard>
                ))}
            </div>

            {/* Specializations */}
            {profile.specializations?.length > 0 && (
                <GlassCard className="p-5">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-400" />
                        Especialidades
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {profile.specializations.map((spec: string) => (
                            <span key={spec} className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-full px-3 py-1">
                                {SPEC_LABELS[spec] || spec}
                            </span>
                        ))}
                    </div>
                </GlassCard>
            )}

            {/* Rating breakdown */}
            {stats && totalServices > 0 && (
                <GlassCard className="p-5">
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-400" />
                        Desglose de calificaciones
                    </h3>
                    <div className="flex gap-5 items-center">
                        {/* Big number */}
                        <div className="text-center shrink-0">
                            <p className="text-4xl font-extrabold gradient-text">{avgRating.toFixed(1)}</p>
                            <div className="mt-1">
                                <StarDisplay rating={avgRating} size="sm" />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">{totalServices} reseñas</p>
                        </div>
                        {/* Bars */}
                        <div className="flex-1 space-y-1.5">
                            {[5, 4, 3, 2, 1].map((star) => (
                                <RatingBar
                                    key={star}
                                    stars={star}
                                    count={distribution[star] || 0}
                                    total={totalServices}
                                />
                            ))}
                        </div>
                    </div>
                </GlassCard>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
                <GlassCard className="p-5">
                    <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        Reseñas recientes
                    </h3>
                    <div className="divide-y divide-border/20">
                        {reviews.map((r, i) => (
                            <motion.div
                                key={r.id || i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.07 }}
                            >
                                <ReviewCard review={r} />
                            </motion.div>
                        ))}
                    </div>
                </GlassCard>
            )}

            {/* No reviews */}
            {reviews.length === 0 && (
                <GlassCard className="p-8 text-center">
                    <p className="text-3xl mb-2">⭐</p>
                    <p className="text-muted-foreground text-sm">Aún sin reseñas</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Sé el primero en calificar este técnico</p>
                </GlassCard>
            )}
        </div>
    )
}

export default function TechnicianPublicProfilePage() {
    return (
        <ProtectedRoute>
            <div className="container pt-24 pb-12 px-4">
                <TechnicianProfileContent />
            </div>
        </ProtectedRoute>
    )
}
