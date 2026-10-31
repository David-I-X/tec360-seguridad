"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Tec360Logo, type Tec360LogoSize } from "./tec360-logo"

export { Tec360Logo, type Tec360LogoProps, type Tec360LogoSize } from "./tec360-logo"

/**
 * Imagen oficial del logo squircle para nodos compactos de interfaz.
 * Reemplaza cualquier isotipo redibujado en SVG suelto.
 */
export function Tec360Isotipo({
  className = "w-9 h-9",
  alertMode = false,
  title = "Tec360 Seguridad",
}: {
  className?: string
  alertMode?: boolean
  title?: string
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-[22%] bg-[#070A12] border",
        alertMode ? "border-[#FF2A55]/45" : "border-violet-400/25",
        className
      )}
    >
      <img
        src="/brand/tec360-logo.png"
        alt={title}
        decoding="async"
        draggable={false}
        className="w-full h-full object-contain block"
      />
    </div>
  )
}

/**
 * Wrapper de compatibilidad que redirige siempre al Lockup Oficial `Tec360Logo`
 * (imagen squircle oficial + "Tec360 Seguridad", sin subtítulos pegados).
 */
export function Tec360Mark({
  size = "md",
  className = "",
  adaptive = false,
}: {
  size?: Tec360LogoSize
  className?: string
  showSubtitle?: boolean
  alertMode?: boolean
  showIsotipo?: boolean
  adaptive?: boolean
}) {
  return <Tec360Logo size={size} className={className} adaptive={adaptive} />
}
