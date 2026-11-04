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
  Lock,
} from "lucide-react"

interface BasicCoursesModalProps {
  isOpen: boolean
  onClose: () => void
  onDismissForever: () => void
  mode?: "intro" | "gate"
  pendingCourseSlug?: string
  pendingCourseTitle?: string
}

export function BasicCoursesModal({
  isOpen,
  onClose,
  onDismissForever,
  mode = "intro",
  pendingCourseSlug = "fundamentos-instalacion-seguridad",
  pendingCourseTitle = "Fundamentos de Instalación y Seguridad Tec360",
}: BasicCoursesModalProps) {
  const router = useRouter()
  const isGate = mode === "gate"

  const handleStartBasicCourse = () => {
    onDismissForever()
    router.push(`/escuela/${pendingCourseSlug || "fundamentos-instalacion-seguridad"}`)
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
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3 ${
              isGate
                ? "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                : "bg-violet-500/10 border border-violet-500/20 text-violet-400"
            }`}
          >
            {isGate ? (
              <>
                <Lock className="h-3.5 w-3.5" />
                <span>CURSO REQUERIDO PARA ACEPTAR O COTIZAR</span>
              </>
            ) : (
              <>
                <GraduationCap className="h-3.5 w-3.5" />
                <span>ESCUELA TEC360 · INDUCCIÓN OFICIAL</span>
              </>
            )}
          </div>

          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg mb-3 text-white ${
              isGate
                ? "bg-gradient-to-tr from-amber-500 to-orange-600 shadow-amber-500/25"
                : "bg-gradient-to-tr from-violet-600 to-cyan-500 shadow-violet-600/25"
            }`}
          >
            {isGate ? <GraduationCap className="h-7 w-7" /> : <Sparkles className="h-7 w-7" />}
          </div>

          <DialogTitle className="text-xl md:text-2xl font-black text-foreground">
            {isGate
              ? "¡Debes realizar el curso primero!"
              : "¡Bienvenido al Equipo Técnico!"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
            {isGate
              ? "Para poder aceptar o cotizar un trabajo disponible, primero debes completar el curso obligatorio de certificación en Escuela Tec360."
              : "Para iniciar con pie derecho, realiza el curso oficial de inducción. Puedes omitirlo por ahora para explorar los trabajos disponibles."}
          </DialogDescription>
        </DialogHeader>

        {/* Featured Course Card */}
        <div className="my-2 rounded-xl border border-border/60 bg-muted/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Badge
              variant="outline"
              className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] font-bold"
            >
              CURSO OBLIGATORIO PARA OPERAR
            </Badge>
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
              <Award className="h-3.5 w-3.5" /> +25 pts rango
            </span>
          </div>

          <div>
            <h4 className="text-sm md:text-base font-bold text-foreground">
              {pendingCourseTitle}
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
              <span>Certificado Técnico Tec360</span>
            </div>
          </div>
        </div>

        {/* Info note */}
        <div
          className={`flex items-start gap-2.5 rounded-lg p-3 text-xs text-muted-foreground ${
            isGate
              ? "bg-amber-500/10 border border-amber-500/25"
              : "bg-blue-500/5 border border-blue-500/15"
          }`}
        >
          <Info
            className={`h-4 w-4 shrink-0 mt-0.5 ${
              isGate ? "text-amber-400" : "text-blue-400"
            }`}
          />
          <p>
            {isGate ? (
              <>
                <strong className="text-foreground">¿Por qué aparece este aviso?</strong> Puedes ver todos los trabajos disponibles en tu radar, pero por seguridad de los clientes debes completar el curso antes de tomar o cotizar un servicio.
              </>
            ) : (
              <>
                <strong className="text-foreground">Explora libremente el radar:</strong> Puedes pulsar en <strong className="text-foreground">«Omitir por ahora»</strong> para ver los trabajos disponibles; cuando quieras aceptar o cotizar uno, te recordaremos completar el curso.
              </>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-col gap-2.5">
          <Button
            onClick={handleStartBasicCourse}
            className="w-full gradient-brand text-white font-bold h-11 shadow-lg shadow-blue-500/25 hover:opacity-95"
          >
            {isGate ? "Ir a Realizar el Curso Ahora" : "Comenzar Curso de Inducción"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>

          <Button
            variant="outline"
            onClick={handleDismiss}
            className="w-full h-11 font-bold text-sm border-border/80 bg-muted/30 hover:bg-muted/60 text-foreground"
          >
            Omitir por ahora
          </Button>

          <Button
            variant="ghost"
            onClick={handleBrowseCatalog}
            className="w-full text-xs text-blue-400 hover:text-blue-300"
          >
            Ver catálogo completo de Escuela Tec360
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
