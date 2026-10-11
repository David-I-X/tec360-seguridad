"use client"

import React from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  GraduationCap,
  Clock,
  ShieldCheck,
  Award,
  ArrowRight,
  Info,
  Sparkles,
} from "lucide-react"

interface BasicCoursesModalProps {
  isOpen: boolean
  onClose: () => void
  onDismissForever: () => void
}

export function BasicCoursesModal({
  isOpen,
  onClose,
  onDismissForever,
}: BasicCoursesModalProps) {
  const router = useRouter()

  const handleStartBasicCourse = () => {
    onDismissForever()
    router.push("/escuela/fundamentos-instalacion-seguridad")
  }

  const handleBrowseCatalog = () => {
    onDismissForever()
    router.push("/escuela")
  }

  const handleDismiss = () => {
    onDismissForever()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="max-w-lg bg-card/95 backdrop-blur-xl border-border/80 shadow-2xl p-6 md:p-8">
        <DialogHeader className="text-center sm:text-center items-center pb-2">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-3">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>ESCUELA TEC360 · INDUCCIÓN</span>
          </div>

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25 mb-3 text-white">
            <Sparkles className="h-7 w-7" />
          </div>

          <DialogTitle className="text-xl md:text-2xl font-black text-foreground">
            ¡Bienvenido al Equipo Técnico!
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
            Para iniciar con pie derecho, te recomendamos realizar el curso oficial de inducción y estándares de instalación.
          </DialogDescription>
        </DialogHeader>

        {/* Featured Course Card */}
        <div className="my-2 rounded-xl border border-border/60 bg-muted/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] font-bold">
              INDUCCIÓN OBLIGATORIA / RECOMENDADA
            </Badge>
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
              <Award className="h-3.5 w-3.5" /> +25 pts rango
            </span>
          </div>

          <div>
            <h4 className="text-sm md:text-base font-bold text-foreground">
              Fundamentos de Instalación y Seguridad Tec360
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Protocolos de oro, manipulación de ramales automotrices, herramientas clave y evidencias de garantía.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/40 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>~2 horas (a tu ritmo)</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-400 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Certificado digital verificado</span>
            </div>
          </div>
        </div>

        {/* Non-mandatory note */}
        <div className="flex items-start gap-2.5 rounded-lg bg-blue-500/5 border border-blue-500/15 p-3 text-xs text-muted-foreground">
          <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-foreground">Paso opcional por ahora:</strong> Puedes comenzar ahora o retomarlo cuando tengas tiempo desde tu perfil o el menú de Escuela Tec. No bloquea tu acceso al panel.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-col gap-2">
          <Button
            onClick={handleStartBasicCourse}
            className="w-full gradient-brand text-white font-bold h-11 shadow-lg shadow-blue-500/25 hover:opacity-95"
          >
            Comenzar Curso de Inducción
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>

          <Button
            variant="ghost"
            onClick={handleBrowseCatalog}
            className="w-full text-xs text-blue-400 hover:text-blue-300"
          >
            Ver todos los cursos disponibles
          </Button>

          <Button
            variant="ghost"
            onClick={handleDismiss}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            Hacerlo más tarde, ir al panel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
