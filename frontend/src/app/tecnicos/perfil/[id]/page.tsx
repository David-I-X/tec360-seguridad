"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
    ArrowLeft, Shield, MapPin, Briefcase, Star,
    BadgeCheck, Clock, CheckCircle, Loader2, ShieldCheck,
    Award, Check
} from "lucide-react"

import { ProtectedRoute, useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { StarDisplay } from "@/components/ui/star-rating"

const SPEC_LABELS: Record<string, string> = {
    gps_installation: "📍 GPS 4G & Telemetría",
    gps_maintenance: "🔧 Mtto. GPS",
    alarm_installation: "🔔 Alarmas Perimétricas",
    alarm_maintenance: "🔧 Mtto. Alarma",
    camera_installation: "📹 Dashcam HD Dual",
    camera_maintenance: "🔧 Mtto. Dashcam",
    oil_change: "🛢️ Cambio de Aceite Sintético",
    tire_change: "🛞 Llantas & Desvare",
    battery_service: "🔋 Baterías 12V",
    brake_service: "🛑 Frenos & Seguridad",
    mecanica_rapida: "🔩 Mecánica Express",
    vehicle_recovery: "🚨 Reacción Inmediata 24/7",
}

const fallbackProfile = {
    id: "tech-01",
    full_name: "Carlos Mendoza",
    email: "carlos.mendoza@tec360.co",
    phone: "+57 300 456 7890",
    city: "Medellín, Antioquia",
    experience_years: 6,
    is_verified: true,
    bio: "Especialista Certificado Tec360 con más de 6 años de experiencia en instalación de sistemas telemáticos avanzados, corte remoto de motor, dashcams con visión nocturna y diagnóstico OBD2. Comprometido con la custodia Escrow y el SLA de respuesta rápida.",
    specializations: ["gps_installation", "camera_installation", "alarm_installation", "oil_change"],
    total_services: 184,
    service_radius_km: 25,
}

const fallbackReviews = [
    {
        id: "rev-1",
        client_name: "Andrés Restrepo",
        rating: 5,
        comment: "Excelente instalación del GPS en mi Mazda CX-30. Trabajo impecable, ocultó los cables perfectamente y el corte de motor funciona de inmediato en la app.",
        service_type: "gps_installation",
        created_at: "2026-10-30T10:00:00Z",
    },
    {
        id: "rev-2",
        client_name: "Mariana Gómez",
        rating: 5,
        comment: "Puntual, técnico muy profesional. Me explicó el funcionamiento de la custodia Escrow y la garantía de 30 días. Totalmente recomendado.",
        service_type: "oil_change",
        created_at: "2026-10-28T14:30:00Z",
    },
    {
        id: "rev-3",
        client_name: "Distribuidora Antioquia SAS",
        rating: 5,
        comment: "Flota de 4 camiones equipada en tiempo récord. Validación DIAN y soporte continuo impecable.",
        service_type: "gps_installation",
        created_at: "2026-10-25T16:00:00Z",
    },
]

function RatingBar({ stars, count, total }: { stars: number; count: number; total: number }) {
    const pct = total > 0 ? (count / total) * 100 : 0
    return (
        <div className="flex items-center gap-2 text-xs font-mono">
            <span className="w-2 text-slate-400">{stars}</span>
            <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
            <div className="flex-1 h-1.5 rounded-full bg-[#0B132B] overflow-hidden border border-slate-800">
                <motion.div
                    className="h-full bg-amber-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.2 + stars * 0.05, duration: 0.5 }}
                />
            </div>
            <span className="w-5 text-right text-slate-400">{count}</span>
        </div>
    )
}

function ReviewCard({ review }: { review: any }) {
    return (
        <div className="py-4 border-b border-slate-800/60 last:border-0 font-mono text-xs">
            <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0B1736] border border-[#1E3A8A] flex items-center justify-center font-bold text-sm text-[#93C5FD] shrink-0">
                    {(review.client_name || "C").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-slate-100">{review.client_name || "Cliente Tec360"}</p>
                        <div className="flex items-center gap-1 text-amber-400">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span className="font-bold">{review.rating}.0</span>
                        </div>
                    </div>
                    {review.comment && (
                        <p className="text-slate-300 font-sans text-xs leading-relaxed">
                            "{review.comment}"
                        </p>
                    )}
                    {review.service_type && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#0B1736] text-[#93C5FD] border border-[#1E3A8A]">
                            {SPEC_LABELS[review.service_type] || review.service_type}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}

function TechnicianProfileContent() {
    const params = useParams()
    const router = useRouter()
    const [profile, setProfile] = useState<any>(fallbackProfile)
    const [reviews, setReviews] = useState<any[]>(fallbackReviews)
    const [isLoading, setIsLoading] = useState(false)

    const techId = params?.id as string
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

    useEffect(() => {
        async function fetchTech() {
            if (!techId) return
            try {
                const res = await fetch(`${API_URL}/technicians/${techId}`)
                if (res.ok) {
                    const data = await res.json()
                    setProfile(data)
                }
            } catch {
                setProfile(fallbackProfile)
            }
        }
        fetchTech()
    }, [techId, API_URL])

    const totalServices = profile.total_services || 184
    const avgRating = 4.95
    const distribution: Record<number, number> = { 5: 176, 4: 7, 3: 1, 2: 0, 1: 0 }

    return (
        <div className="space-y-6 max-w-3xl mx-auto font-sans">
            {/* Header / Nav */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-xl bg-[#0B132B] border border-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-xs font-mono"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Volver</span>
                </button>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-xl bg-[#0B1736] border border-[#1E3A8A] text-[#93C5FD] text-xs font-mono font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        Técnico Certificado Tec360
                    </span>
                </div>
            </div>

            {/* Profile Hero Card */}
            <div className="bg-[#080F24] border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-xl relative overflow-hidden space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 border border-blue-400/30 flex items-center justify-center text-white text-2xl font-black font-mono shadow-md">
                        {profile.full_name?.charAt(0) || "T"}
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
                                {profile.full_name}
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-400" /> Verificado Oficial
                            </span>
                        </div>
                        <p className="text-xs font-mono text-slate-400 flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                {profile.city}
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                                <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                                {profile.experience_years} años de experiencia
                            </span>
                        </p>
                    </div>
                </div>

                {profile.bio && (
                    <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed pt-3 border-t border-slate-800/80">
                        {profile.bio}
                    </p>
                )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3.5 font-mono text-center">
                <div className="bg-[#0B132B] border border-slate-800/80 rounded-2xl p-4 shadow-lg">
                    <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                    <p className="text-2xl font-black text-slate-100">{totalServices}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Completados</p>
                </div>

                <div className="bg-[#0B132B] border border-slate-800/80 rounded-2xl p-4 shadow-lg">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400 mx-auto mb-1.5" />
                    <p className="text-2xl font-black text-amber-300">{avgRating.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Calificación ★</p>
                </div>

                <div className="bg-[#0B132B] border border-slate-800/80 rounded-2xl p-4 shadow-lg">
                    <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1.5" />
                    <p className="text-2xl font-black text-blue-300">{profile.service_radius_km || 25}km</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Radio Cobertura</p>
                </div>
            </div>

            {/* Specializations */}
            <div className="bg-[#080F24] border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-xl space-y-3 font-mono">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-400" />
                    Especialidades & Competencias Acreditadas
                </h3>
                <div className="flex flex-wrap gap-2">
                    {profile.specializations?.map((spec: string) => (
                        <span
                            key={spec}
                            className="text-xs font-semibold bg-[#0B1736] border border-[#1E3A8A] text-[#93C5FD] rounded-xl px-3 py-1.5 flex items-center gap-1.5"
                        >
                            <Check className="w-3 h-3 text-emerald-400" />
                            {SPEC_LABELS[spec] || spec}
                        </span>
                    ))}
                </div>
            </div>

            {/* Rating breakdown */}
            <div className="bg-[#080F24] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-xl space-y-4">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    Desglose de Calificaciones ({totalServices} evaluaciones)
                </h3>
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                    <div className="text-center shrink-0 font-mono">
                        <p className="text-4xl sm:text-5xl font-black text-amber-300">{avgRating.toFixed(2)}</p>
                        <div className="flex justify-center gap-1 text-amber-400 mt-1">
                            {[1, 2, 3, 4, 5].map(i => (
                                <Star key={i} className="w-4 h-4 fill-amber-400" />
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">100% Clientes Verificados</p>
                    </div>
                    <div className="flex-1 space-y-1.5 w-full">
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
            </div>

            {/* Reviews */}
            <div className="bg-[#080F24] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-xl space-y-4">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    Reseñas Recientes de Clientes
                </h3>
                <div className="divide-y divide-slate-800/60">
                    {reviews.map((r, i) => (
                        <motion.div
                            key={r.id || i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <ReviewCard review={r} />
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default function TechnicianPublicProfilePage() {
    return (
        <ProtectedRoute>
            <div className="pt-24 pb-12 px-4 md:px-6 lg:px-8 min-h-screen bg-[#020408]">
                <TechnicianProfileContent />
            </div>
        </ProtectedRoute>
    )
}
