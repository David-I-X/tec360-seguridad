"use client"

import { Button } from "@/components/ui/button"
import { Shield, Clock, Award, ArrowRight, Users, Star, MapPin } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
}

const stats = [
  { value: "500+", label: "Servicios Realizados", icon: Shield },
  { value: "200+", label: "Técnicos Certificados", icon: Users },
  { value: "4.8", label: "Calificación Promedio", icon: Star },
  { value: "32", label: "Ciudades Cubiertas", icon: MapPin },
]

export function Hero() {
  return (
    <section className="relative min-h-[100vh] flex items-center justify-center overflow-hidden pt-16">
      {/* Animated background */}
      <div className="absolute inset-0 mesh-gradient" />

      {/* Floating orbs */}
      <div className="absolute top-20 left-[10%] w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-[10%] w-96 h-96 bg-purple-500/8 rounded-full blur-3xl animate-float delay-700" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl animate-spin-slow" />

      <div className="container relative z-10 mx-auto px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <motion.div
            initial="hidden"
            animate="visible"
            custom={0}
            variants={fadeUp}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-5 py-2.5 text-sm font-semibold text-blue-500"
          >
            <Award className="h-4 w-4" />
            Técnicos Certificados SENA
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial="hidden"
            animate="visible"
            custom={1}
            variants={fadeUp}
            className="mb-6 text-5xl font-extrabold leading-tight tracking-tight text-balance md:text-6xl lg:text-7xl"
          >
            Seguridad Electrónica{" "}
            <span className="gradient-text">Profesional</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial="hidden"
            animate="visible"
            custom={2}
            variants={fadeUp}
            className="mb-10 text-lg text-muted-foreground text-pretty md:text-xl max-w-2xl mx-auto leading-relaxed"
          >
            Conectamos clientes con técnicos certificados por el SENA para instalación y mantenimiento de sistemas de
            seguridad electrónica en toda Colombia
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial="hidden"
            animate="visible"
            custom={3}
            variants={fadeUp}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link href="/register">
              <Button
                size="lg"
                className="w-full sm:w-auto gradient-brand text-white hover:opacity-90 font-semibold px-8 h-12 text-base shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
              >
                Comenzar Ahora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/servicios">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base bg-transparent">
                Ver Servicios
              </Button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial="hidden"
            animate="visible"
            custom={4}
            variants={fadeUp}
            className="mt-20 grid grid-cols-2 gap-6 sm:grid-cols-4"
          >
            {stats.map((stat, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card/50 border border-border/50 hover-lift"
              >
                <stat.icon className="h-6 w-6 text-blue-500 mb-1" />
                <p className="text-2xl font-bold gradient-text md:text-3xl">{stat.value}</p>
                <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  )
}
