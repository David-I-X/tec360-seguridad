---
name: logo-design
description: Generacion estructurada, parametrizada y determinista de logotipos, isotipos y sets de iconos corporativos combinando Google Stitch MCP y VectorCraft MCP (vectorcraft-cli mcp). Impone parametros formales (--brief, --brand, --style, --palette, --variations) y exporta paquetes multiescala (.vectorcraft, .svg, .pdf, .png, .webp).
---

# Logo Design — Síntesis y Construcción Vectorial Determinista

Esta Skill guía al agente en la producción y evolución sistemática del logotipo, isotipo y sistema de iconografía de **Tec360 Seguridad** sin intervención manual de diseño.

## Parámetros Formales de Entrada

Cada ejecución de diseño o refinamiento vectorial se parametriza con:
- `--brief`: Misión funcional del símbolo (ej. *"Escudo de blindaje 360° fusionado con pin de geolocalización satelital y órbita telemática"*).
- `--brand`: Nombre y texto tipográfico (`Tec360 Seguridad`).
- `--style`: `tactical-geometric | flat-vector | minimal-monoline | emblem-3d`.
- `--palette`: Tokens hexadecimales extraídos de `./brand-workspace/deliverables/brand-tokens.json` (`#050810`, `#8B5CF6`, `#3B82F6`, `#00F0FF`, `#F8FAFC`).
- `--variations`: `primary`, `mono-light`, `mono-dark`, `inverted`, `icon-grid-24`.

## Flujo de Ejecución en VectorCraft MCP (`vectorcraft-cli mcp`)

1. **Trazado de Activo Base o Construcción Geométrica Pura:**
   - Si se parte del isotipo rasterizado aprobado (`./brand-workspace/assets-in/source/logo.jpg`), abrir o trazar en VectorCraft aplicando el preset `Flat Logo` o construir la geometría limpia mediante primitivas vectoriales y booleanas exactas (`path.boolean.*`).
2. **Construcción de Iconografía en Cuadrícula de 24pt:**
   - Todos los iconos del sistema (GPS, Corte de Motor, Alarma, Dashcam, Técnico SENA, Escudo 360) se dibujan sobre un artboard de `24x24` o `48x48` con grosor de trazo uniforme (`2px`), esquinas redondeadas coherentes y alineación a píxel.
3. **Generación Automática de las 4 Variantes Cromáticas:**
   - Ejecutar secuencias deterministas (`select.all` + `paint.setFill` / `paint.setStroke` o scripts SVG/VectorCraft) para producir:
     - `tec360-logo-primary` (Color principal sobre fondo oscuro)
     - `tec360-logo-mono-light` (Blanco `#F8FAFC` sobre fondo transparente/oscuro)
     - `tec360-logo-mono-dark` (Grafito `#0F172A` sobre fondo claro)
     - `tec360-logo-inverted` (Escudo claro sobre pastilla `#7C3AED`)
4. **Verificación Multimodal y Exportación Multiescala:**
   - Invocar `render_preview` en VectorCraft MCP o `vectorcraft-cli convert` para auditar visualmente el resultado antes de exportar a `.vectorcraft`, `.svg`, `.pdf`, `.png` y `.webp` en `./brand-workspace/deliverables/logo/` y `./brand-workspace/deliverables/icons/`.
