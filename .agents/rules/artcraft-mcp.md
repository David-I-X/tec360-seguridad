# Reglas Operativas de Automatización Creativa: ArtCraft MCP + Google Stitch MCP

Estas reglas de comportamiento previenen los cuellos de botella de tiempo de ejecución documentados en la suite **ArtCraft Crafting Apps** (motores nativos en Rust sobre `wgpu`/`rmcp`) y en el motor generativo **Google Stitch MCP** (`https://stitch.withgoogle.com/`). Deben cumplirse estrictamente en toda sesión creativa.

## 1. Confinamiento de Sistema de Archivos (`--automation-read-root` / `--automation-write-root`)
- Todos los servidores MCP de ArtCraft operan con lectura confinada a `./brand-workspace` y escritura confinada a `./brand-workspace/deliverables`.
- **Nunca** intentes abrir ni guardar archivos fuera de `./brand-workspace/` a través de herramientas MCP de ArtCraft; si necesitas un activo externo (por ejemplo de `frontend/public/` o `promo-video/`), cópialo primero a `./brand-workspace/assets-in/` antes de invocar `doc_open` o `open_file`.

## 2. Orden Estricto en Peticiones MCP (Mitigación de *Order over MCP*)
- **Problema:** Si se envían múltiples peticiones MCP en paralelo (piped) a `photocraft-cli mcp` o servidores stdio, el motor puede ejecutar `command_run` antes de que `doc_open` o `doc_new` termine de cargar el documento en memoria, devolviendo `no document open`.
- **Regla obligatoria:**
  1. Espera de forma **síncrona** la respuesta de `doc_open`, `doc_new`, `open_file` o `new_document` antes de emitir cualquier comando de edición o transformación.
  2. Cuando ejecutes secuencias de edición sobre un mismo documento ya abierto, encapsúlalas dentro de una única llamada a `command_batch` (o `batch`) en lugar de disparar múltiples llamadas concurrentes a `command_run`.

## 3. Jerarquía de Capas y Filtros en PhotoCraft (Mitigación de *Adjustment Layer Filter Lock*)
- **Problema:** En PhotoCraft, al crear una capa de ajuste (`layer.newAdjustmentLayer.curves`, `layer.newAdjustmentLayer.hueSaturation`, etc.), esta se convierte automáticamente en la capa activa. Si el comando siguiente es un filtro de píxeles (`filter.sharpen.smartSharpen`, desenfoques, ruido), falla con `filters need a pixel layer (active layer is an Adjustment layer)`.
- **Regla obligatoria:**
  1. Aplica **todos los filtros de píxeles** (`filter.sharpen.smartSharpen`, etc.) sobre la capa rasterizada base **antes** de añadir capas de ajuste no destructivas al final del flujo.
  2. Si necesitas aplicar un filtro después de haber creado capas de ajuste, inspecciona primero el árbol con `doc_inspect` y re-selecciona explícitamente la capa de píxeles antes de invocar el filtro.

## 4. Ausencia de Atomicidad en Lotes (`command_batch`) y Estrategia de Rollback
- **Problema:** Aunque `command_batch` detiene la ejecución ante un fallo (`stop_on_error: true` por defecto), no es una transacción atómica: los pasos previos exitosos quedan aplicados sin revertirse automáticamente.
- **Regla obligatoria:**
  1. Antes de ejecutar un lote complejo sobre un documento valioso, invoca `image.duplicate` / `history.newDocument` o guarda un checkpoint intermedio en `./brand-workspace/runs/`.
  2. Si un lote falla a mitad de camino, usa `edit.undo` paso a paso o recarga el checkpoint.
  3. Cuando delegues experimentos agresivos de identidad visual a subagentes (`invoke_subagent`), utiliza el modo de espacio de trabajo `branch` para aislar cambios en un árbol Git descartable.

## 5. Maquetación Multipágina Editorial (Mitigación de *DesignCraft Long-Text Reflow*)
- **Problema:** En DesignCraft, al colocar un `.docx` extenso, el texto permanece anclado en la página 1 sin generar páginas nuevas automáticamente.
- **Regla obligatoria:**
  - Para manuales de identidad corporativa (*Brand Books*) o dossieres multipágina, maqueta las láminas o secciones en `DeckCraft`, `VectorCraft`, `FigCraft` o páginas explícitas de `DesignCraft`, expórtalas a PDF y únelas programáticamente mediante la herramienta `doc_combine` de `pdfcraft-cli mcp`.

## 6. Fuente de Verdad en FigCraft (Mitigación de *Experimental `.fig` Variable Loss*)
- **Problema:** Al exportar como `.fig` experimental y reabrirlo, se conservan las capas pero se pierden las variables de diseño tipadas y las anotaciones de Dev Mode.
- **Regla obligatoria:**
  - Mantén siempre el archivo nativo `.figcraft` en `./brand-workspace/deliverables/ui/` como única fuente de verdad y extrae el código React/CSS y activos SVG/PNG directamente desde `.figcraft`.

## 7. Llamadas Discretas en VectorCraft y Exclusión de WebAssembly para MCP
- **Problema:** El servidor MCP de VectorCraft no implementa notificaciones de progreso en vuelo (`progress notifications`), cancelación asíncrona ni suscripciones a recursos. Además, las compilaciones WebAssembly de navegador no pueden abrir puertos de control MCP.
- **Regla obligatoria:**
  - Ejecuta todo el flujo agéntico exclusivamente contra los binarios nativos CLI/escritorio en Rust (`~/.artcraft/`).
  - Estructura en VectorCraft llamadas discretas de corta duración aprovechando su renderizado SIMD de ~27 ms, verificando cada etapa con `render_preview`.

## 8. Reglas de Operación con Google Stitch MCP (`StitchMCP`)
- **Motor Generativo Oficial:** Toda ideación generativa de pantallas, variantes visuales y sistemas de diseño UI se realiza con **Google Stitch** (`https://stitch.withgoogle.com/`) a través del servidor `StitchMCP`, **nunca** con ArtCraft Studio AI ni Recraft.
- **Sincronización con `DESIGN.md`:** Antes de generar pantallas o variantes en un proyecto de Stitch, sube el `DESIGN.md` normativo de la raíz del repositorio usando `upload_design_md` y `create_design_system_from_design_md` (o `create_design_system` + `update_design_system`).
- **Tolerancia a Latencia:** `generate_screen_from_text`, `generate_variants` y `edit_screens` pueden tardar varios minutos. **No reintentes (`DO NOT RETRY`)** inmediatamente si hay timeout; consulta el resultado con `get_screen` o `get_project`.
