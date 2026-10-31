---
name: Tec360 Seguridad
version: 3.0.0
description: Sistema oficial de identidad corporativa y diseño multicanal — Blindaje electrónico, equipo de reacción 24/7 y mecánica básica express a domicilio con técnicos certificados en Colombia
colors:
  void-bg: "#050810"
  obsidian-surface: "#0b0f19"
  slate-elevated: "#111827"
  violet-core: "#7c3aed"
  electric-violet: "#8b5cf6"
  violet-deep: "#5b21b6"
  quantum-blue: "#3b82f6"
  telemetry-cyan: "#00f0ff"
  tactical-amber: "#f59e0b"
  armed-emerald: "#10b981"
  crimson-alert: "#ff2a55"
  text-primary: "#f8fafc"
  text-body-tinted: "#b4b0c8"
  text-display-dual: "#a39eb8"
  text-muted: "#7c7894"
  light-bg: "#f8fafc"
  light-surface: "#ffffff"
  light-text: "#0f172a"
  light-cyan-accessible: "#0284c7"
  border-glass: "rgba(139, 92, 246, 0.24)"
  border-hairline: "rgba(255, 255, 255, 0.08)"
typography:
  display:
    fontFamily: "Archivo, Geist, Inter, system-ui, sans-serif"
    fontSize: "clamp(2.45rem, 4.4vw, 3.815rem)"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.034em"
  h1:
    fontFamily: "Archivo, Geist, Inter, system-ui, sans-serif"
    fontSize: "2.85rem"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.032em"
  h2:
    fontFamily: "Archivo, Geist, Inter, system-ui, sans-serif"
    fontSize: "1.953rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  h3:
    fontFamily: "Geist, Inter, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Geist, Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.62
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
  button-primary-instalacion:
    backgroundColor: "{colors.violet-core}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "16px 28px"
  button-primary-reaccion:
    backgroundColor: "{colors.telemetry-cyan}"
    textColor: "{colors.void-bg}"
    rounded: "{rounded.md}"
    padding: "14px 24px"
  button-primary-mecanica:
    backgroundColor: "{colors.tactical-amber}"
    textColor: "{colors.void-bg}"
    rounded: "{rounded.md}"
    padding: "14px 24px"
  button-danger-engine-cut:
    backgroundColor: "{colors.crimson-alert}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
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

**Tec360 Seguridad** es la plataforma integral de seguridad electrónica vehicular, reacción táctica 24/7 y asistencia de mecánica básica a domicilio en Colombia. Su identidad visual unificada (**Dark Tactical Glass & Silk Telemetry 360°**, versión 3.0) nace directamente de la convergencia entre el símbolo maestro **Orbital Radar 360° V2** y la arquitectura inmersiva de la landing principal.

Toda pieza de comunicación, pantalla web, vista móvil, video corto, credencial o documento corporativo obedece cuatro principios innegociables:
1. **Instrumento vivo antes que plantilla:** El vehículo y la telemetría real lideran la composición; nunca se emplean grillas genéricas de SaaS ni ilustraciones decorativas vacías.
2. **Tres líneas de servicio con codificación cromática propia:**
   - **Instalaciones Vehiculares a Domicilio (`#8b5cf6` / `#7c3aed`):** GPS 4G L1/L5 anti-jammer, dashcams HD en nube, alarmas inteligentes y bloqueo CAN-Bus con conectores originales OEM.
   - **Equipo de Reacción & Recuperación 24/7 (`#00f0ff` + `#ff2a55`):** Posicionamiento satelital cada 10 s, corte de motor remoto seguro a `[0 KM/H]` en 1.1 s y despliegue táctico en campo con enlace policial.
   - **Mecánica Básica Express a Domicilio (`#f59e0b` + `#10b981`):** Batería y corriente, cambio de llantas, aceite y filtros, pastillas de freno, kit de arrastre y luces en casa, oficina o vía.
3. **Estándar humano exclusivo:** Todos los especialistas se denominan únicamente **técnicos certificados** (con validación de identidad, antecedentes e idoneidad técnica; nunca se mencionan instituciones terceras).
4. **Precisión tipográfica de tres voces:** Titulares editoriales en `Archivo` de doble luminancia con énfasis `[ENTRE CORCHETES]`, lectura limpia en `Geist` y datos vivos en `Geist Mono` (`tabular-nums`).

## Brand Mark — Lockup Oficial Tec360 Seguridad (v3.1)

- **Activo Oficial Único:** `brand-workspace/assets-in/logo/tec360-logo-oficial.png` (servido en web como `/brand/tec360-logo.png` y sincronizado en `brand-workspace/deliverables/logo/tec360-logo-oficial.png`). Contiene el radar orbital 360° dentro de su contenedor *squircle* oscuro original.
- **Regla Estricta de Integridad:** Usar siempre el archivo PNG oficial tal cual. **Prohibido** redibujarlo en SVG suelto en cabeceras/tarjetas, aislar el isotipo sin su contenedor *squircle*, o añadir el antiguo subtítulo `TELEMETRÍA & SEGURIDAD` encima o debajo de las letras.
- **Lockup Horizontal Oficial:** Imagen oficial del logo + texto **"Tec360 Seguridad"** alineado horizontalmente a su derecha en `Archivo` (`--font-display`, `tracking: -0.025em`): **`Tec360`** en peso `700` (`#f8fafc` en modo oscuro / `#0f172a` en modo claro) + **`Seguridad`** en peso `500` de segunda luminancia (`#b4b0c8` en modo oscuro / `#475569` en modo claro).
- **Definición sobre Lienzos Oscuros:** Dado que el contenedor *squircle* del logo es obsidiana profunda, en superficies `#050810` / `#0b0f19` se enmarca con un borde capilar `1px` (`rgba(139, 92, 246, 0.22)` / `rgba(255, 255, 255, 0.10)`) con radio proporcional `22%` para preservar su silueta exacta.
- **Escalas Normalizadas UI:** `sm` (`32px` icono + `17px` texto en Navbar), `md` (`40px` icono + `20px` texto en tarjetas Auth/Onboarding), `lg` (`48px` icono + `24px` texto en cabeceras destacadas y cierres).
- **Zona de Exclusión:** Mínimo `0.25W` del *squircle* libre de bordes o elementos ajenos al lockup.

## Colors

La paleta parte del lienzo aeroespacial `#050810` bañado por auroras sedosas de baja opacidad y textos secundarios teñidos desde la gama lavanda-violeta (jamás grises neutros apagados):

- **Superficies Oscuras (Experiencia Principal):**
  - `void-bg` (`#050810`, `19.3:1` AAA con `#f8fafc`): Lienzo global e inmersivo.
  - `obsidian-surface` (`#0b0f19`, `17.8:1` AAA): Tarjetas operativas, marcos de video y consolas.
  - `slate-elevated` (`#111827`, `15.6:1` AAA): Controles internos, píldoras numéricas y selectores.
- **Acentos de Marca y Líneas de Servicio:**
  - `violet-core` (`#7c3aed`, `5.7:1` AA con texto `#f8fafc`) y `electric-violet` (`#8b5cf6`): Acción principal corporativa y línea de **Instalaciones Vehiculares**.
  - `telemetry-cyan` (`#00f0ff`, `14.2:1` AAA sobre `#050810` y con texto `#050810`): Señal satelital 4G, énfasis `[ENTRE CORCHETES]` y línea de **Equipo de Reacción 24/7**.
  - `tactical-amber` (`#f59e0b`, `8.9:1` AAA sobre `#050810` y `10.1:1` con texto `#050810`): Línea de **Mecánica Básica Express a Domicilio** y calificación verificada.
  - `armed-emerald` (`#10b981`, `8.4:1` AAA sobre `#050810`): Red 4G activa, ignición nominal y técnico certificado auditado.
  - `crimson-alert` (`#ff2a55`, `5.9:1` AA sobre `#050810`): Corte de motor remoto activo (`LOCKED`) y emergencia.
- **Jerarquía de Texto Teñido (Dark World):**
  - `text-primary` (`#f8fafc`, `19.3:1` AAA): Titulares primarios y métricas clave.
  - `text-body-tinted` (`#b4b0c8`, `9.4:1` AAA): Cuerpo de lectura y subtítulos operativos.
  - `text-display-dual` (`#a39eb8`, `7.8:1` AAA): Segunda voz de contraste suave dentro de titulares `Archivo`.
- **Soporte Modo Claro (Impresos, Documentos Legales y Papelería):**
  - Lienzo `#f8fafc` / `#ffffff`, tinta `#0f172a` (`17.4:1`), violeta `#7c3aed` y cian adaptado `#0284c7` / `#0369a1` (`>= 4.6:1` AA).

## Typography

Escala modular **1.250 (Major Third)** sobre tres familias con funciones estrictamente separadas:

1. **Archivo (`--font-display`, `wdth 106–122`, `wght 400 / 600 / 800`):**
   - Reservada para titulares de impacto (`h1`, `h2` de sección y cierre monumental).
   - **Regla de Doble Luminancia + Corchetes:** La afirmación principal va en `#f8fafc` (`font-semibold`), la frase complementaria en `#a39eb8` (`font-normal`) y el concepto clave entre corchetes indivisibles (`whitespace-nowrap`) en `#00f0ff` (`[0 KM/H]`, `[MECÁNICA EXPRESS]`, `[PROTECCIÓN]`, `[SERVICIO]`, `[24/7]`).
   - **Cero eyebrows:** Prohibido colocar etiquetas pequeñas (kickers) encima de un titular; el titular lidera por sí mismo.
2. **Geist / Inter (`--font-sans`, `wght 400–600`):**
   - Cuerpo de texto (`1rem`, `line-height: 1.62`, medida `54–65ch`), botones, navegación con subrayado deslizante de `1px` y etiquetas descriptivas.
3. **Geist Mono / JetBrains Mono (`--font-mono`, `tabular-nums`, `wght 600–700`):**
   - Exclusivamente para datos numéricos, coordenadas (`6.2088° N, 75.5659° W`), velocidades (`0 KM/H`), voltajes (`13.8V`), duraciones de video (`00:18`), tiempos (`< 30 MIN`) y líneas de contacto (`+57 305 215 6601`). Nunca usar monoespaciada como disfraz estético sobre oraciones comunes.

## Layout & Signature Motifs

- **Cuadrícula Espacial de 8pt:** Separaciones y rellenos en múltiplos de `8px` (`8, 16, 24, 32, 48, 64, 96px`).
- **Offset de Navegación Web (`pt-24`):** En Next.js App Router, todo contenedor raíz de página respeta `96px` superiores para despejar la barra fija de `64px`.
- **Auroras de Seda y Luz Reactiva (`Silk Stage`):** Fondos hero y de cierre con brumas lentas violeta/azul/cian (`mix-blend-mode: screen`) y halo sutil que acompaña al cursor.
- **Muescas Esculpidas (`Interlocking Notches`):** En reproductores de video `16:10` / `16:9` y marcos destacados, la esquina superior derecha aloja una muesca invertida en `#050810` (`rounded-bl-2xl border-l border-b`) con el formato y duración (`REEL 16:9 · 00:18`).
- **Circuito Radial de `1px`:** Nodos del ecosistema conectados al isotipo central mediante trazos ortogonales SVG con pulso luminoso cian.

## Elevation, Shapes & Imagery

- **Elevación Declarada una Sola Vez:** En web oscura, separación por luminancia (`#050810` -> `#0b0f19` -> `#111827`) y borde de `1px` (`rgba(139,92,246,0.20)` o `rgba(255,255,255,0.08)`), sin sombras difusas redundantes bajo tarjetas con borde.
- **Radios:** Contenedores y videos `16px` (`rounded-2xl`), botones y sub-tarjetas `12px` (`rounded-xl`), píldoras de estado `9999px` (`rounded-full`).
- **Dirección Fotográfica y de Video Corto:** Estudio automotriz oscuro obsidiana, iluminación de recorte (*rim light*) violeta, cian o ámbar según la línea de servicio, guantes técnicos negros sobre conectores reales OEM o herramientas digitales de precisión, y cero fotografía corporativa genérica de oficina.

## Do's and Don'ts

- **DO:** Mantener coherencia absoluta entre Web (`Next.js`), App Móvil (`Expo`), videos cortos (`.mp4` `16:9` / `9:16`), tarjetas OpenGraph y documentos PDF usando siempre el isotipo **Orbital Radar 360° V2** y la paleta oficial.
- **DO:** Verificar contraste mínimo WCAG 2.2 AA (`>= 4.5:1` en texto, `>= 3.0:1` en controles gráficos) mediante auditoría visual multimodal antes de publicar cualquier pieza.
- **DON'T:** Mencionar instituciones educativas ni entidades terceras externas; el respaldo humano oficial de marca es siempre **técnicos certificados**.
- **DON'T:** Colocar kickers/eyebrows encima de titulares, usar texto con gradiente, ni emplear `Geist Mono` fuera de métricas, códigos o mediciones reales.
