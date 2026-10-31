"use client"

import React from "react"
import { cn } from "@/lib/utils"

export type Tec360LogoSize = "xs" | "sm" | "md" | "lg" | "xl"

export interface Tec360LogoProps {
  size?: Tec360LogoSize
  className?: string
  iconClassName?: string
  adaptive?: boolean
  iconOnly?: boolean
  badgeLabel?: string
}

const SCALE_MAP: Record<
  Tec360LogoSize,
  {
    box: string
    px: number
    gap: string
    wordGap: string
    text: string
  }
> = {
  xs: {
    box: "w-5 h-5 rounded-[5px]",
    px: 20,
    gap: "gap-2",
    wordGap: "gap-1",
    text: "text-sm",
  },
  sm: {
    box: "w-[30px] h-[30px] sm:w-8 sm:h-8 rounded-[7px]",
    px: 32,
    gap: "gap-2 sm:gap-2.5",
    wordGap: "gap-1 sm:gap-1.5",
    text: "text-[16px] sm:text-[17px]",
  },
  md: {
    box: "w-[38px] h-[38px] sm:w-10 sm:h-10 rounded-[9px]",
    px: 40,
    gap: "gap-2.5 sm:gap-3",
    wordGap: "gap-1.5",
    text: "text-[19px] sm:text-[20px]",
  },
  lg: {
    box: "w-12 h-12 rounded-[11px]",
    px: 48,
    gap: "gap-3.5",
    wordGap: "gap-2",
    text: "text-2xl",
  },
  xl: {
    box: "w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-2xl",
    px: 72,
    gap: "gap-3.5 sm:gap-5",
    wordGap: "gap-2 sm:gap-2.5",
    text: "text-2xl sm:text-[40px]",
  },
}

/**
 * Componente único oficial de marca Tec360 Seguridad (brandingwork v3).
 * Usa exclusivamente el archivo oficial `/brand/tec360-logo.png` en su squircle
 * acompañado del texto horizontal "Tec360 Seguridad" en voz display (Archivo).
 */
export function Tec360Logo({
  size = "md",
  className,
  iconClassName,
  adaptive = false,
  iconOnly = false,
  badgeLabel,
}: Tec360LogoProps) {
  const s = SCALE_MAP[size] || SCALE_MAP.md

  return (
    <div className={cn("inline-flex items-center select-none", s.gap, className)}>
      <div
        className={cn(
          "relative shrink-0 overflow-hidden border border-violet-400/25 bg-[#070A12]",
          s.box,
          iconClassName
        )}
      >
        <img
          src="/brand/tec360-logo.png"
          alt="Tec360 Seguridad"
          width={s.px}
          height={s.px}
          decoding="async"
          draggable={false}
          className="w-full h-full object-contain block"
        />
      </div>

      {!iconOnly && (
        <div className="flex flex-col justify-center min-w-0">
          <div
            className={cn(
              "inline-flex items-baseline whitespace-nowrap leading-none font-display",
              s.wordGap,
              s.text
            )}
          >
            <span
              className={cn(
                "font-bold tracking-[-0.025em]",
                adaptive ? "text-slate-900 dark:text-[#F8FAFC]" : "text-[#F8FAFC]"
              )}
            >
              Tec360
            </span>
            <span
              className={cn(
                "font-medium tracking-[-0.02em]",
                adaptive ? "text-slate-600 dark:text-[#B4B0C8]" : "text-[#B4B0C8]"
              )}
            >
              Seguridad
            </span>
          </div>

          {badgeLabel && (
            <span className="mt-0.5 text-[10px] font-mono font-bold uppercase tracking-[0.06em] text-[#00F0FF] leading-none">
              {badgeLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
