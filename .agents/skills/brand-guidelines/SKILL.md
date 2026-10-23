---
name: brand-guidelines
description: Aplicacion consistente de los estandares visuales corporativos de Tec360 Seguridad a cualquier artefacto (web Next.js, app movil Expo, presentaciones DeckCraft, documentos WordCraft/PdfCraft y videos HyperFrames/FilmCraft). Define variables CSS, temas claro/oscuro, jerarquia tipografica, ratios de contraste WCAG y margenes de seguridad del logotipo.
---

# Brand Guidelines — Estándares Visuales Normativos de Tec360 Seguridad

Activa esta Skill siempre que generes o modifiques componentes de interfaz, páginas de aterrizaje, documentos corporativos, presentaciones o piezas audiovisuales de **Tec360 Seguridad**.

## 1. Variables CSS y Tokens Normativos

```css
:root {
  /* Identidad Primaria */
  --brand-primary: #7c3aed;
  --brand-primary-vivid: #8b5cf6;
  --brand-primary-deep: #5b21b6;
  --brand-secondary: #2563eb;
  --brand-telemetry-cyan: #00f0ff;

  /* Estados Semánticos Tácticos */
  --brand-status-armed: #10b981;
  --brand-status-warning: #f59e0b;
  --brand-status-alert: #ff2a55;

  /* Superficies Modo Claro (Soporte diurno de alta legibilidad) */
  --brand-bg-light: #f8fafc;
  --brand-surface-light: #ffffff;
  --brand-text-light: #0f172a;
  --brand-muted-light: #475569;

  /* Superficies Modo Oscuro (Experiencia Principal Dark Tactical Glass) */
  --brand-bg-dark: #050810;
  --brand-surface-dark: #0b0f19;
  --brand-surface-elevated-dark: #111827;
  --brand-glass-dark: rgba(11, 15, 25, 0.78);
  --brand-border-glass: rgba(139, 92, 246, 0.24);
  --brand-text-dark: #f8fafc;
  --brand-muted-dark: #94a3b8;

  /* Tipografía */
  --font-sans: 'Geist', 'Inter', system-ui, sans-serif;
  --font-mono: 'Geist Mono', 'JetBrains Mono', monospace;
}
```

## 2. Reglas de Uso del Logotipo e Isotipo 360°
- **Zona de Exclusión (Safe Margin):** Mantén siempre un margen libre mínimo equivalente a `0.5x` la altura del escudo alrededor del isotipo en cualquier cabecera, botón o lámina.
- **Tamaño Mínimo:** `28px` de alto en pantallas digitales; `12mm` en documentos impresos o PDF.
- **Variantes Oficiales (generadas en `./brand-workspace/deliverables/logo/`):**
  1. `tec360-logo-primary.svg` — Escudo gradiente violeta/cian sobre fondo oscuro `#050810`.
  2. `tec360-logo-mono-light.svg` — Monocromo blanco (`#F8FAFC`) para fondos oscuros o fotografías.
  3. `tec360-logo-mono-dark.svg` — Monocromo grafito (`#0F172A`) para papelería clara e impresos.
  4. `tec360-logo-inverted.svg` — Variante de alto contraste sobre superficies violeta/azul.

## 3. Reglas de Contraste y Accesibilidad (WCAG 2.2 AA)
- **Texto de cuerpo sobre `--brand-bg-dark` (`#050810`):** Usar `#F8FAFC` (`19.3:1`, AAA) o `#94A3B8` (`7.2:1`, AAA). **Nunca** usar texto gris oscuro (`#64748B` o inferior) sobre fondo oscuro.
- **Indicadores de telemetría (`--brand-telemetry-cyan` `#00F0FF`):** Usar exclusivamente sobre fondos oscuros (`#050810` o `#0B0F19`, ratio `14.2:1`); en modo claro sustituir por `#0284C7` (`4.6:1` sobre blanco).
- **Botones Primarios:** Fondo `#7C3AED` con texto `#FFFFFF` (contraste `5.7:1`, AA cumplido).

## 4. Convenciones Específicas de Tec360
- **Offset de Navbar Fija en Next.js:** Todo contenedor principal de página en `frontend/src/app/` debe incluir `pt-24` (`96px`) para respetar la barra de navegación global fija.
- **Números Tabulares:** Todo dato de telemetría (coordenadas, velocidad `km/h`, voltaje, latencia `ms`, placas) debe usar `font-mono tabular-nums`.
