---
name: craft
description: Orquestacion creativa multi-aplicacion sobre las 11 herramientas locales y headless de la suite ArtCraft en Rust (VectorCraft, PhotoCraft, FigCraft, DesignCraft, PdfCraft, DeckCraft, WordCraft, EffectCraft, FilmCraft, SoundCraft, LightCraft). Activar cuando se requiera crear, transformar o exportar activos vectoriales, fotograficos, UI, editoriales, PDF o audiovisuales.
---

# Craft — Orquestación Creativa Unificada sobre la Suite ArtCraft (Rust MCP & CLI)

Esta Skill coordina de forma determinista las 11 aplicaciones nativas de la suite **ArtCraft Crafting Apps** instaladas localmente en `~/.artcraft/` y expuestas como servidores MCP en [`.agents/plugins/tec360-creative-studio/mcp_config.json`](../../plugins/tec360-creative-studio/mcp_config.json).

> **Catálogo de Herramientas MCP Verificado:** Antes de invocar cualquier herramienta MCP de ArtCraft, consulta [references/artcraft-mcp-catalog.md](references/artcraft-mcp-catalog.md) para ver la firma exacta de cada servidor instalado.

## Matriz de Enrutamiento por Tipo de Entregable

| Dominio Creativo | Servidor MCP / Binario CLI | Herramientas MCP Principales | Formatos de Salida en `./brand-workspace/deliverables/` |
| :--- | :--- | :--- | :--- |
| **Vectores, Logos e Iconos** | `vectorcraft` (`vectorcraft-cli`) | `list_commands`, `command_run`, `command_batch`, `doc_inspect`, `render_preview` | `.vectorcraft`, `.svg`, `.pdf`, `.png`, `.webp` |
| **Edición Fotográfica y Mockups** | `photocraft` (`photocraft-cli`) | `doc_open`, `doc_new`, `doc_inspect`, `command_run`, `command_batch`, `render_preview`, `doc_save`, `doc_export`, `batch` | `.psd`, `.png`, `.jpg`, `.webp` |
| **Revelado y Colorimetría** | `lightcraft` (`lightcraft-cli`) | `import`, `command_run`, `command_batch`, `render_preview`, `export` | `.png`, `.jpg`, `.webp`, `.dng` |
| **Sistemas UI/UX y Componentes** | `figcraft` (`figcraft-cli`) | `create_node`, `set_properties`, `batch`, `run_command`, `inspect_document`, `get_node`, `screenshot`, `save_file`, `export` | `.figcraft`, `.svg`, `.png`, `.pdf`, código React/CSS |
| **Maquetación Editorial** | `designcraft` (`designcraft-cli`) | `new_document`, `open_document`, `execute`, `batch`, `inspect_document`, `set_story_text`, `export_pdf`, `render_page` | `.designcraft`, `.idml`, `.pdf`, `.png` |
| **Ensamblaje y Auditoría PDF** | `pdfcraft` (`pdfcraft-cli`) | `doc_open`, `doc_info`, `doc_combine`, `page_render`, `text_extract`, `doc_save`, `tool_search`, `tool_call` | `.pdf`, `.png` (vistas previas de página) |
| **Presentaciones Comerciales** | `deckcraft` (`deckcraft-cli`) | `new_presentation`, `open_presentation`, `run_command`, `batch`, `inspect_document`, `save_presentation`, `export` | `.pptx`, `.pdf`, `.png` |
| **Papelería y Propuestas** | `wordcraft` (`wordcraft-cli`) | `new_document`, `open_document`, `type_text`, `execute`, `batch`, `save_document`, `export_pdf`, `render_page` | `.docx`, `.pdf`, `.png`, `.md` |
| **Motion Graphics y Bumpers** | `effectcraft` (`effectcraft-cli`) | `execute_command`, `run_script`, `get_project`, `get_comp`, `set_property`, `add_keyframe`, `render_frame`, `render` | `.ecproj`, `.mp4`, `.webm`, `.png` |
| **Montaje de Video Multipista** | `filmcraft` (`filmcraft-cli`) | `media_import`, `command_run`, `command_batch`, `project_inspect`, `render_frame`, `render_preview`, `export` | `.fcproj`, `.mp4`, `.mov` |
| **Identidad Sonora y Audio** | `soundcraft` (`soundcraft-cli`) | `new_session`, `import_audio`, `execute`, `batch`, `inspect_session`, `bounce_session`, `save_session` | `.scraft`, `.wav`, `.flac` |

## Reglas de Oro de Ejecución (Cross-Plugin)
1. **Confinamiento:** Todos los servidores leen de `./brand-workspace/` y escriben en `./brand-workspace/deliverables/`.
2. **Orden Síncrono en PhotoCraft:** Espera siempre a que `doc_open` o `doc_new` retorne antes de llamar a `command_run` / `command_batch`.
3. **Filtros antes de Capas de Ajuste en PhotoCraft:** Ejecuta `filter.sharpen.smartSharpen` sobre la capa de píxeles base antes de crear `layer.newAdjustmentLayer.curves`.
4. **Verificación Visual Obligatoria:** Genera siempre un PNG en `./brand-workspace/deliverables/audit/` usando `render_preview`, `page_render` o `screenshot` y revísalo con `read_file`.
