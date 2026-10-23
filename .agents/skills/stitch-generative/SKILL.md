---
name: stitch-generative
description: Integracion y flujo de trabajo con Google Stitch (https://stitch.withgoogle.com/) a traves del servidor StitchMCP. Reemplaza cualquier IA generativa externa (como ArtCraft Studio AI o Recraft) para ideacion de interfaces, variantes esteticas (REFINE, EXPLORE, REIMAGINE), sincronizacion de DESIGN.md y generacion de pantallas desktop/mobile para Tec360 Seguridad.
---

# Stitch Generative — Ideación Generativa de UI y Dirección Visual con Google Stitch MCP

En la arquitectura creativa de **Tec360 Seguridad**, **Google Stitch (`https://stitch.withgoogle.com/`)** es el **único motor generativo en la nube** autorizado para explorar conceptos visuales, diseñar pantallas y generar variantes estéticas antes de pasar al refinamiento determinista en la suite ArtCraft o a la implementación en Next.js / Expo.

## Servidor y Herramientas Disponibles (`StitchMCP`)

El servidor `StitchMCP` está configurado tanto globalmente (`~/.gemini/config/mcp_config.json`) como a nivel de proyecto (`.agents/mcp_config.json`) utilizando `@_davideast/stitch-mcp proxy`.

### 1. Gestión de Proyectos y Sistemas de Diseño
- `list_projects` / `create_project` / `get_project`: Crea o inspecciona el contenedor de diseño en Stitch.
- `upload_design_md`: Sube el contenido de [`/DESIGN.md`](../../../DESIGN.md) codificado en Base64 UTF-8 al proyecto de Stitch.
- `create_design_system_from_design_md`: Crea el sistema de diseño en Stitch directamente desde el `DESIGN.md` subido.
- `create_design_system` / `update_design_system` / `list_design_systems` / `apply_design_system`: Configura y aplica tokens fundacionales (fuentes `GEIST`, `INTER`, `JETBRAINS_MONO`, paleta oscura `#050810`, `#8B5CF6`, `#00F0FF`) a las pantallas del proyecto.

### 2. Generación y Evolución Continua de Pantallas
- `generate_screen_from_text`: Genera una pantalla completa (`DESKTOP` o `MOBILE`) a partir de un prompt estructurado y el `designSystem` activo.
- `generate_variants`: Genera de 1 a 5 alternativas visuales de una pantalla existente controlando:
  - `creativeRange`:
    - `"REFINE"` — Pulido sutil manteniendo la estructura actual.
    - `"EXPLORE"` — Exploración balanceada de nuevas composiciones.
    - `"REIMAGINE"` — Propuestas radicales que desafían el diseño original.
  - `aspects`: `["LAYOUT", "COLOR_SCHEME", "IMAGES", "TEXT_FONT", "TEXT_CONTENT"]`.
- `edit_screens`: Aplica iteraciones dirigidas en lenguaje natural sobre pantallas seleccionadas (`selectedScreenIds`).
- `get_screen` / `list_screens`: Recupera el árbol, código y capturas de las pantallas generadas.

## Flujo Híbrido: De Google Stitch a ArtCraft y Next.js

```
[1. /DESIGN.md] ──(upload_design_md)──► [2. Google Stitch MCP]
                                               │
                         (generate_screen_from_text / generate_variants)
                                               │
                                               ▼
                        [3. Opciones Visuales A / B / C para el CEO]
                                               │
                 ┌─────────────────────────────┴─────────────────────────────┐
                 ▼                                                           ▼
  [4a. ArtCraft MCP (FigCraft / PhotoCraft)]                  [4b. Frontend Next.js + Impeccable]
  • Pulido determinista de activos y mockups                  • Implementación en src/components/
  • Exportación .figcraft, .psd, .svg, .pdf                   • Auditoría con Playwright / browser
```

## Diagnóstico y Renovación de Credenciales de Stitch
Si `StitchMCP` devuelve un error de autenticación OAuth / API Key expirada:
1. Ejecuta `npx @_davideast/stitch-mcp doctor` para verificar el estado de salud.
2. Si requiere reautenticación OAuth en Google Cloud o una nueva API Key desde [stitch.withgoogle.com](https://stitch.withgoogle.com/) (*Stitch Settings -> API Keys*), ejecuta `npx @_davideast/stitch-mcp init` o actualiza `STITCH_API_KEY` en `~/.gemini/config/mcp_config.json` y vuelve a correr `brand-workspace/tools/sync-mcp-config.ps1`.
