---
name: brandingwork
description: Pipeline completo de branding de Tec360 Seguridad con enfoque FigCraft-first (diseñar y auditar en FigCraft ANTES de escribir código). Activar SIEMPRE que el usuario diga "ejecútalo con brandingwork", "ejecutalo con brandingwork", "brandingwork" o pida iterar el branding/UI con este pipeline.
---

# brandingwork — Pipeline de Branding FigCraft-First

Cuando el usuario diga **"ejecútalo con brandingwork"**, ejecuta TODAS las fases en este orden. No saltes fases; si una herramienta MCP no está disponible, documéntalo en el artefacto final y continúa con la siguiente.

## Fase 0 — Fuentes de verdad (obligatorio)
1. Leer `DESIGN.md` (raíz) y `brand-workspace/deliverables/brand-tokens.json`.
2. Logo oficial: **`brand-workspace/assets-in/logo/tec360-logo-oficial.png`** (radar orbital dentro de cuadro redondeado oscuro, subido por el usuario).
   - Usarlo **exactamente** como archivo (no redibujarlo en SVG ni aislar el isotipo).
   - Lockup: imagen + texto **"Tec360 Seguridad"** al lado. **Nunca** el subtítulo "TELEMETRÍA & SEGURIDAD" encima/debajo de las letras.
3. Tipografía: `Archivo` (display/títulos), `Geist` (cuerpo), `Geist Mono` (telemetría), cargadas con `next/font/google` (self-hosted). Prohibido `font-['Archivo']` sin fallback; usar utilidades `font-display`, `font-sans`, `font-mono`.
4. Restricciones de copy: cero menciones a SENA (solo "técnicos certificados"); 3 líneas de servicio: Instalaciones (violeta), Reacción 24/7 (cian/crimson), Mecánica Básica (ámbar).

## Fase 1 — Estrategia y tokens
- Aplicar `brand-style-agent` + `brand-guidelines`. Actualizar tokens si cambia algo (logo, fuentes, colores).

## Fase 2 — Ideación (Stitch, opcional)
- Si se requieren nuevas pantallas, sincronizar `DESIGN.md` con `StitchMCP` y generar variantes. Tolerar latencia, no reintentar.

## Fase 3 — Diseño FigCraft-first (OBLIGATORIO antes de código)
1. `figcraft` → `list_commands` para descubrir comandos.
2. Copiar activos necesarios a `brand-workspace/assets-in/` (confinamiento de lectura).
3. Construir en FigCraft un board por pantalla afectada (desktop 1440 y móvil 390) con el logo oficial, tokens y tipografías.
4. `screenshot`/`export` a `brand-workspace/deliverables/audit/` y revisar con `read_file` (contraste WCAG AA, alineación, sin colisiones, logo correcto).
5. Guardar `.figcraft` en `brand-workspace/deliverables/ui/` como fuente de verdad.

## Fase 4 — Implementación de código (solo tras aprobar el board)
- Trasladar el diseño FigCraft a Next.js (`frontend/`) y, si aplica, Expo (`mobile/`).
- Componente único de marca: `frontend/src/components/brand/tec360-logo.tsx`.
- `npx tsc --noEmit` y `npm run lint` dentro de `frontend/`.

## Fase 5 — Auditoría multimodal cerrada
- Capturas Playwright desktop + móvil de cada vista tocada; comparar contra el board FigCraft.
- Corregir discrepancias antes de entregar.

## Fase 6 — Cierre
- `graphify update .`
- Artefacto `brandingwork_iteracion_N.md` con: board FigCraft vs implementación, archivos tocados, verificaciones.
