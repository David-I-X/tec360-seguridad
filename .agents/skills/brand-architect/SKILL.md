---
name: brand-architect
description: Orquesta la creacion integral de identidad de marca, logotipos vectoriales, sistemas de diseno UI y material corporativo utilizando Google Stitch MCP (https://stitch.withgoogle.com/) como motor generativo y la suite ArtCraft MCP (Rust local) como motor determinista. Activar con /brand-architect o cuando se solicite crear o iterar el branding, diseno visual, landing page o activos creativos de Tec360 Seguridad sin requerir direccion estetica manual.
---

# Brand Architect — Protocolo de Arquitectura de Marca y Producción Creativa Autónoma

Esta Skill maestra transforma especificaciones funcionales de negocio en un sistema de identidad visual completo, interfaces de producción y archivos fuente editables (`.vectorcraft`, `.svg`, `.psd`, `.figcraft`, `.designcraft`, `.pdf`, `.mp4`), operando un flujo **Design-as-Code** donde:
- **Google Stitch MCP (`StitchMCP` / `https://stitch.withgoogle.com/`)** actúa como motor de ideación generativa de pantallas, variantes visuales y sistemas de diseño UI.
- **ArtCraft Crafting Apps MCP (Rust local)** actúa como motor determinista de vectores, edición fotográfica multicapa, sistemas de componentes UI, maquetación editorial y empaquetado audiovisual.
- **Impeccable + Anatomy + HyperFrames** completan la dirección de arte heurística, la ilustración técnica isométrica interactiva y la síntesis de video corto determinista.

---

## Protocolo de Cuatro Etapas (Ejecución Autónoma)

### Etapa 1: Síntesis Estratégica y Tokens Fundacionales
Antes de invocar cualquier herramienta gráfica o generativa, genera o actualiza:
1. `./brand-workspace/deliverables/brand-tokens.json` (compatible con W3C DTCG y `dembrandt`).
2. `./DESIGN.md` en la raíz del proyecto (siguiendo la especificación oficial de Google Stitch / Impeccable con frontmatter YAML y las 8 secciones canónicas).

Aplica obligatoriamente los 5 marcos de [`.agents/skills/brand-style-agent/SKILL.md`](../brand-style-agent/SKILL.md):
- **Brand Identity Prism:** Arquetipo corporativo (Guardián Tecnológico / Comando Aeroespacial), personalidad técnica y tono de comunicación.
- **Color Psychology Framework:** Selección matemática de colores primarios, secundarios, acentos y superficies (modos oscuro y claro) verificando contraste mínimo **WCAG AA** (`>= 4.5:1` para texto normal, `>= 3.0:1` para texto grande y componentes gráficos).
- **Typography Hierarchy:** Familias para encabezados (`Geist` / `Inter`), cuerpo de lectura y telemetría monoespaciada (`Geist Mono` / `JetBrains Mono`) bajo escala modular estricta **1.250 Major Third**.
- **Imagery Direction Framework:** Reglas de iluminación, tratamiento cromático (LUTs tácticos púrpura/cian/void), nitidez y composición de hardware/UI.
- **Design System Principles:** Espaciado base 8px, elevación glassmorphism funcional y radios geométricos consistentes.

### Etapa 2: Ideación Generativa en Google Stitch MCP (`StitchMCP`)
En lugar de usar cajas negras de imagen que deforman textos, utiliza **Google Stitch MCP** (`https://stitch.withgoogle.com/`):
1. **Sincronización del Sistema de Diseño:**
   - Crea o selecciona el proyecto en Stitch (`list_projects` / `create_project`).
   - Codifica `./DESIGN.md` en Base64 UTF-8 y súbelo con `upload_design_md`, seguido de `create_design_system_from_design_md` (o `create_design_system` + `update_design_system`).
2. **Generación de Pantallas y Variantes Visuales:**
   - Invoca `generate_screen_from_text` pasando el `projectId`, `designSystem` y el prompt estructurado desde los tokens de marca.
   - Para explorar rumbos estéticos sin pedir órdenes técnicas al usuario, ejecuta `generate_variants` con `creativeRange: "REFINE" | "EXPLORE" | "REIMAGINE"` y `aspects: ["LAYOUT", "COLOR_SCHEME", "TEXT_FONT"]`.
   - Descarga o captura las vistas generadas en `./brand-workspace/assets-in/stitch/` como insumo para los motores deterministas de ArtCraft.

### Etapa 3: Reglas de Orquestación Determinista sobre ArtCraft MCP
Cumple estrictamente las reglas de [`.agents/rules/artcraft-mcp.md`](../../rules/artcraft-mcp.md):
- **Descubrimiento Dinámico:** Consulta siempre `command_list` / `list_commands` antes de construir cargas útiles para `command_run` o `execute`.
- **Ejecución Secuencial Síncrona:** Espera la confirmación de apertura o creación de documento (`doc_open`, `doc_new`, `new_document`, `new_presentation`) antes de enviar comandos de edición, o agrupa pasos secuenciales en `command_batch` / `batch`.
- **Jerarquía de Capas en PhotoCraft:** Aplica todos los filtros de píxeles (`filter.sharpen.smartSharpen`, desenfoques) sobre la capa rasterizada base **antes** de añadir capas de ajuste no destructivas (`layer.newAdjustmentLayer.curves`, `layer.newAdjustmentLayer.hueSaturation`).
- **Confinamiento de Rutas:** Lee únicamente desde `./brand-workspace/` y escribe únicamente en `./brand-workspace/deliverables/`.

### Etapa 4: Bucle Cerrado de Auditoría Multimodal
Ningún activo se exporta ni se presenta al usuario sin verificación visual empírica:
1. Tras modificar un documento en `VectorCraft`, `PhotoCraft`, `FigCraft`, `DeckCraft` o `PdfCraft`, invoca `render_preview`, `page_render` o `screenshot` hacia `./brand-workspace/deliverables/audit/`.
2. Inspecciona la imagen devuelta (`read_file`) comprobando ausencia de solapamientos, texto truncado, desalineaciones o bajo contraste.
3. Si se detecta un defecto, corrige mediante `edit.undo`, `set_properties` o re-ejecución del lote antes de entregar.

---

## Pipeline End-to-End en Cinco Fases

| Fase | Subagente / Modo | Motores MCP / Skills | Entregables en `./brand-workspace/deliverables/` |
| :--- | :--- | :--- | :--- |
| **Fase 1: Estrategia y Tokens** | Principal (`inherit`) | `brand-style-agent`, `brand-guidelines`, `dembrandt` | `brand-tokens.json`, `/DESIGN.md`, variables CSS |
| **Fase 2: Identidad Vectorial** | Subagente (`inherit`/`branch`) | `StitchMCP` + `vectorcraft` + `logo-design` | `logo/*.vectorcraft`, `logo/*.svg`, `logo/*.png`, `icons/*.svg` (color, mono-light, mono-dark, inverted) |
| **Fase 3: Fotografía y Mockups** | Subagente (`inherit`) | `StitchMCP` + `photocraft` + `lightcraft` | `imagery/*.psd`, `imagery/*-graded.png`, contact sheets |
| **Fase 4: UI/UX, Hero & Código** | Subagente (`inherit`/`branch`) | `StitchMCP` + `figcraft` + `anatomy` + `impeccable` | `ui/tec360-design-system.figcraft`, figura isométrica Hero en React/SVG, componentes Next.js auditados |
| **Fase 5: Editorial y Video** | Subagente (`inherit`) | `deckcraft` + `wordcraft` + `designcraft` + `pdfcraft` + `effectcraft` + `filmcraft` + `HyperFrames` | `editorial/tec360-brand-book.pdf`, `editorial/tec360-pitch-deck.pdf`, `motion/*.mp4` (15s Reels / 45s Promo) |

## Ejecución Rápida del Pipeline Automatizado
Para compilar o regenerar de extremo a extremo todos los entregables base en modo desatendido:
```powershell
node brand-workspace/tools/run-brand-pipeline.mjs
```
