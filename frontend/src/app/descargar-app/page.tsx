"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Download, AlertTriangle, ShieldCheck, Smartphone, Settings, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"

export default function DescargarAppPage() {
    const [isDownloading, setIsDownloading] = useState(false)

    const handleDownload = () => {
        setIsDownloading(true)
        // Set a timeout to revert button state
        setTimeout(() => setIsDownloading(false), 3000)
        // Here we link to the actual APK path in the public folder or wherever we host it later
        window.location.href = "/app/tec360-seguridad-latest.apk"
    }

    const steps = [
        {
            icon: <Download className="w-5 h-5 text-blue-400" />,
            title: "1. Descarga el archivo",
            desc: "Haz clic en el botón de abajo para bajar la aplicación oficial.",
            color: "border-blue-500/30 bg-blue-500/10 text-blue-400"
        },
        {
            icon: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
            title: "2. Ignora la advertencia visual",
            desc: "Tu teléfono podría decir 'El archivo puede dañar tu dispositivo'. Al ser una app privada, es normal. Pulsa 'Descargar de todos modos'.",
            color: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
        },
        {
            icon: <Settings className="w-5 h-5 text-orange-400" />,
            title: "3. Habilita Fuentes Desconocidas",
            desc: "Al abrir el instalador, tu teléfono te pedirá permiso para instalar apps fuera de Play Store. Toca 'Configuración' y permite esta fuente.",
            color: "border-orange-500/30 bg-orange-500/10 text-orange-400"
        },
        {
            icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
            title: "4. Instalar y Listo",
            desc: "Toca 'Instalar'. Una vez finalizado, abre la app e inicia sesión en tu cuenta Tec360.",
            color: "border-green-500/30 bg-green-500/10 text-green-400"
        }
    ]

    return (
        <div className="min-h-screen bg-background pt-24 pb-16 px-4">
            <div className="max-w-4xl mx-auto space-y-12">
                
                {/* Header Back Link */}
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                    <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver al inicio
                    </Link>
                </motion.div>

                {/* Hero Section */}
                <div className="text-center space-y-6">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }} 
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20 mb-4"
                    >
                        <Smartphone className="w-12 h-12 text-blue-400" />
                    </motion.div>
                    
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                            Instala la App Oficial de <span className="bg-gradient-to-r from-blue-400 to-[#00f2ff] bg-clip-text text-transparent">Tec360</span>
                        </h1>
                        <p className="mt-4 text-base md:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                            Diseñada de forma privada e independiente para máxima seguridad. Sigue estos rápidos pasos para instalarla en tu dispositivo Android.
                        </p>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: 0.2 }}
                        className="pt-6"
                    >
                        <Button 
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className={`h-14 px-8 text-base md:text-lg rounded-2xl font-bold shadow-xl transition-all duration-300 ${
                                isDownloading 
                                ? "bg-green-500 hover:bg-green-600 text-white" 
                                : "bg-gradient-to-r from-blue-500 to-[#00f2ff] hover:brightness-110 text-white"
                            }`}
                        >
                            {isDownloading ? (
                                <>
                                    <ShieldCheck className="mr-2 h-5 w-5 animate-pulse" />
                                    Iniciando Descarga Segura...
                                </>
                            ) : (
                                <>
                                    <Download className="mr-2 h-5 w-5" />
                                    Descargar Instalador APK
                                </>
                            )}
                        </Button>
                        <p className="mt-4 text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-green-500/70" /> 
                            Verificado libre de Malware
                        </p>
                    </motion.div>
                </div>

                {/* Guide Section */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="pt-8">
                    <h2 className="text-2xl font-bold text-center mb-8 flex items-center justify-center gap-2">
                        Guía rápida de Instalación
                    </h2>
                    
                    <div className="grid md:grid-cols-2 gap-6 relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-[60px] left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-transparent via-slate-700 to-transparent -z-10" />

                        {steps.map((step, idx) => (
                            <GlassCard key={idx} className="p-6 border-white/5 hover:border-white/10 transition-colors relative group">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 border ${step.color}`}>
                                    {step.icon}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{step.title}</h3>
                                <p className="text-sm text-slate-400 leading-relaxed border-l-2 border-slate-700 pl-3">
                                    {step.desc}
                                </p>
                            </GlassCard>
                        ))}
                    </div>
                </motion.div>

                {/* Footer Assurance */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="pt-12 text-center pb-8">
                    <div className="inline-flex items-center gap-3 bg-slate-800/50 px-6 py-4 rounded-2xl border border-slate-700/50 text-sm text-slate-300">
                        <AlertTriangle className="w-5 h-5 text-blue-400 shrink-0" />
                        <span className="text-left font-medium">¿Problemas instalando? Al ser una plataforma corporativa distribuida libremente, tu teléfono te pedirá desactivar "Bloquear Orígenes Desconocidos" por única vez. Es 100% normal.</span>
                    </div>
                </motion.div>

            </div>
        </div>
    )
}
