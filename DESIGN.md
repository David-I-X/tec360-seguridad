---
name: Tec360 Seguridad
description: Plataforma telematica satelital 4G, blindaje vehicular 360 y centro de comando tactico 24/7 en Colombia
colors:
  void-bg: "#050810"
  obsidian-surface: "#0b0f19"
  slate-elevated: "#111827"
  electric-violet: "#8b5cf6"
  violet-core: "#7c3aed"
  violet-deep: "#5b21b6"
  quantum-blue: "#3b82f6"
  telemetry-cyan: "#00f0ff"
  tactical-emerald: "#10b981"
  amber-warning: "#f59e0b"
  crimson-alert: "#ff2a55"
  text-primary: "#f8fafc"
  text-secondary: "#94a3b8"
  text-muted: "#64748b"
  light-bg: "#f8fafc"
  light-surface: "#ffffff"
  light-text: "#0f172a"
  border-glass: "rgba(139, 92, 246, 0.24)"
typography:
  display:
    fontFamily: "Geist, Inter, system-ui, sans-serif"
    fontSize: "clamp(2.441rem, 5vw, 3.815rem)"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  h1:
    fontFamily: "Geist, Inter, system-ui, sans-serif"
    fontSize: "2.441rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  h2:
    fontFamily: "Geist, Inter, system-ui, sans-serif"
    fontSize: "1.953rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  h3:
    fontFamily: "Geist, Inter, system-ui, sans-serif"
    fontSize: "1.563rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Geist, Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  telemetry:
    fontFamily: "Geist Mono, JetBrains Mono, monospace"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.04em"
rounded:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "64px"
  4xl: "96px"
components:
  button-primary:
    backgroundColor: "{colors.violet-core}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "14px 28px"
  button-primary-hover:
    backgroundColor: "{colors.electric-violet}"
  button-danger:
    backgroundColor: "{colors.crimson-alert}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "14px 28px"
  card-tactical:
    backgroundColor: "{colors.obsidian-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "24px"
  badge-telemetry:
    backgroundColor: "{colors.slate-elevated}"
    textColor: "{colors.telemetry-cyan}"
    typography: "{typography.telemetry}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
---

## Overview

**Tec360 Seguridad** es un ecosistema de seguridad y telemática vehicular de siguiente generación en Colombia. Su estética visual responde al concepto de **Comando Táctico Aeroespacial y Cristal Blindado (*Dark Tactical Glassmorphism*)**: cada pantalla, componente e ilustración debe sentirse como un instrumento de telemetría satelital en tiempo real, combinando autoridad militar, precisión numérica y serenidad operativa bajo presión.

## Colors

La paleta se organiza sobre un lienzo oscuro profundo (`void-bg: #050810`) que maximiza la legibilidad nocturna y el contraste de las señales luminosas:

- **Identidad Primaria:** `violet-core` (`#7c3aed`) y `electric-violet` (`#8b5cf6`) representan el blindaje inteligente 360°.
- **Telemetría y Señal:** `telemetry-cyan` (`#00f0ff`, contraste `14.2:1` AAA sobre `#050810`) y `quantum-blue` (`#3b82f6`) codifican enlaces satelitales 4G, coordenadas GPS en vivo y radares de búsqueda.
- **Estados Semánticos:**
  - `tactical-emerald` (`#10b981`, `8.4:1` AAA): Vehículo asegurado, motor nominal, técnico certificado SENA verificado.
  - `amber-warning` (`#f59e0b`, `8.9:1` AAA): Geocerca en observación o mantenimiento preventivo.
  - `crimson-alert` (`#ff2a55`, `5.9:1` AA): Alerta de manipulación/robo e inmovilización por corte de motor remoto.

## Typography

El sistema utiliza una escala modular **1.250 (Major Third)** con dos familias complementarias:

- **Geist / Inter (`--font-sans`):** Titulares con tracking ajustado (`-0.03em`) que transmiten solidez arquitectónica, y cuerpo de lectura amplio (`line-height: 1.6`).
- **Geist Mono / JetBrains Mono (`--font-mono`):** Obligatoria con `tabular-nums` para coordenadas GPS (`6.2442° N, 75.5812° W`), velocidades (`0 km/h`), voltajes, placas vehiculares, tiempos de respuesta y estados de comando.

## Layout

- **Cuadrícula Espacial de 8pt:** Todos los márgenes, paddings y separaciones siguen múltiplos exactos de `8px` (`8, 16, 24, 32, 48, 64, 96px`).
- **Offset de Navegación Global:** En el frontend web (Next.js App Router), el contenedor principal de cada página incluye `pt-24` (`96px`) para despejar la barra de navegación fija.
- **Densidad Cognitiva:** Máximo 4 indicadores clave por tarjeta y máximo 3 columnas en vista de escritorio (`max-w-7xl`).

## Elevation & Depth

La jerarquía espacial se logra mediante **luminancia progresiva y vidrio táctico**:

1. **Nivel 0 (Lienzo):** `#050810` con retícula técnica sutil (`44px x 44px`, `rgba(99, 102, 241, 0.08)`).
2. **Nivel 1 (Panel Operativo):** `#0b0f19` con borde de `1px solid rgba(139, 92, 246, 0.18)`.
3. **Nivel 2 (Glassmorphism Flotante):** `background: rgba(11, 15, 25, 0.78)`, `backdrop-filter: blur(20px)` y borde especular superior `rgba(255, 255, 255, 0.12)`.

## Shapes

- Contenedores y tarjetas principales: `16px` (`rounded-2xl`).
- Botones y controles interactivos: `12px` (`rounded-xl`).
- Badges de estado y píldoras de telemetría: `9999px` (`rounded-full`).
- Iconografía vectorial: Cuadrícula de `24x24px` con trazo uniforme de `2px`.

## Components

- **Consola de Telemetría Hero:** Simulador interactivo con selector de vehículo (Carro, Moto, Camión), ruta GPS vectorial en vivo y comando táctico de **Corte de Motor Remoto**.
- **Tarjetas de Pilares Duales:**
  - *Pilar Preventivo (Violeta):* Instalación a domicilio de GPS 4G, alarmas y dashcams HD por técnicos certificados SENA.
  - *Pilar Reactivo (Cian / Carmesí):* Rastreo satelital cada 10 segundos, bloqueo de motor en 1 toque y reacción inmediata 24/7.

## Do's and Don'ts

- **DO:** Mostrar datos reales de telemetría (coordenadas, latencia, estado de ignición, insignia SENA) con tipografía monoespaciada tabular.
- **DO:** Mantener contraste mínimo WCAG AA (`4.5:1` en texto, `3:1` en controles gráficos) verificando cada entrega con vista previa multimodal.
- **DON'T:** Usar fotografía de stock corporativa genérica o recortes de personajes sobre fondos artificiales.
- **DON'T:** Apilar más de dos capas con `backdrop-filter: blur()` simultáneamente para proteger el rendimiento de GPU en web y en HyperFrames.
