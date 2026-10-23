# ArtCraft & Creative Studio MCP Tool Catalog (Auto-Generated)

Catálogo verificado empíricamente contra los servidores MCP reales instalados en Windows (`~/.artcraft/`).

## `soundcraft` (soundcraft 0.8.0 — 17 tools)

| Tool | Required Params | Description |
|---|---|---|
| `list_commands` | — | List SoundCraft commands (id, label, menu path, shortcut, params doc, enabled). |
| `execute` | `command` | Run one command by id with JSON params. Returns the command's result. |
| `batch` | `calls` | Run several commands in order; stops at the first error unless keep_going. |
| `inspect_session` | — | The whole session as JSON: tracks (clips, inserts, sends, automation), busses, markers, groups, selection, transport. |
| `new_session` | — | Start a new session (optionally the built-in demo). |
| `open_session` | `path` | Open a .scraft session file. |
| `save_session` | — | Save the session (path required the first time; replace: true to save over another existing file). |
| `import_audio` | `path` | Import an audio file (WAV, AIFF, FLAC, MP3, OGG, AAC/M4A, ALAC, CAF) onto a new or existing track. |
| `bounce_mix` | `path` | Render the mix to an audio file. Returns peak dBFS and integrated LUFS. |
| `parity` | — | Feature-parity report against the incumbent's menu catalog. |
| `screenshot` | — | APP_ONLY. Screenshot the app window (PNG). |
| `ui_inspect` | — | APP_ONLY. UI state: front window, panels, layout rectangles of tracks, dialogs. |
| `ui_set` | `state` | APP_ONLY. Set UI state fields, e.g. {"window": "Mix"}. |
| `menu_invoke` | `path` | APP_ONLY. Invoke a menu item like a click (may open its dialog), e.g. "Track > New...". |
| `click` | `x`, `y` | APP_ONLY. Click at window coordinates (points). |
| `drag` | `x`, `y`, `to_x`, `to_y` | APP_ONLY. Drag with the primary button. |
| `key` | `key` | APP_ONLY. Press a key with modifiers. |

## `figcraft` (figcraft 0.7.0 — 18 tools)

| Tool | Required Params | Description |
|---|---|---|
| `list_commands` | — | List FigCraft commands: id, label, menu path, shortcut, whether it is undoable, and a parameter description. Every menu item, panel action a |
| `run_command` | `command` | Execute one FigCraft command by id with JSON params (ids and params from list_commands). Mutating commands are one undo step each; a failing |
| `batch` | `commands` | Run several commands in order as ONE undo step (engine `command.batch`). If any command fails, everything is rolled back and the error names |
| `create_node` | `type` | Create a layer (engine `node.create`) and return its id and inspected properties. Coordinates are page units, y down; x/y are relative to th |
| `set_properties` | `props` | Set properties on one or more layers as one undo step (engine `node.set`). Keys: name, visible, locked, opacity (0-1), blend, x, y (relative |
| `inspect_document` | — | The active document as JSON: name, path, dirty flag, current page, selection, the current page's layer tree (id, name, type, x/y relative to |
| `get_node` | `id` | One layer as JSON (same fields as inspect_document) with its children to `depth`. |
| `select` | `ids` | Replace the selection with `ids` (switching to their page). An empty array deselects everything. Most commands act on the selection when no  |
| `export` | — | Export layers (default: the selection, else every top-level layer of the current page) as png, jpg, svg, webp or pdf at `scale`, or the whol |
| `screenshot` | — | Look at the design: renders the given layers (or the whole current page, with its background) to PNG and returns it as image content, plus i |
| `open_file` | `path` | Open a .figcraft or .json document (FigCraft or REST API file JSON), a .fig file (best effort, with `warnings` for what wasn't imported), an |
| `save_file` | — | Save the active document as a .figcraft file. `path` is required the first time (an untitled document has no path); later saves reuse it. A  |
| `undo` | — | Undo the last change (one command, batch or gesture). Returns {undone: bool}. |
| `redo` | — | Redo the last undone change. Returns {redone: bool}. |
| `pointer` | `x`, `y` | Drive the canvas with the mouse in page coordinates, exactly as a user would with the current tool: click to select, drag to move/resize/mar |
| `key` | `key` | Press a key or shortcut as if typed on the canvas: a menu shortcut (e.g. {"key":"G","cmd":true} groups, {"key":"A","alt":true,"shift":false} |
| `type_text` | `text` | Type into a text layer. With `id`, starts editing that layer with all of its text selected (so the typed text replaces it), types, then stop |
| `inspect_ui` | — | UI state: current tool, view (zoom, centre), status, panels, timings and the app's windows (`windows`: id, title, files) when attached to th |

## `filmcraft` (filmcraft 0.9.0 — 17 tools)

| Tool | Required Params | Description |
|---|---|---|
| `command_batch` | `steps` | Run several commands in order: {steps: [{id, params?}], stop_on_error?: true}. Returns {completed, failed, results: [{ok, result \| error}]}; |
| `command_list` | — | List every command (id, label, menu path, shortcut, parameter doc, enabled now). Menus, shortcuts, panels and timeline gestures all map to t |
| `command_run` | `id` | Run a command by id with JSON params, e.g. {"id":"timeline.razor","params":{"seconds":3.5}} or {"id":"effects.apply","params":{"effect":"Gau |
| `doc_inspect` | — | The project as JSON: the tree (as project_inspect) plus the active sequence (as sequence_inspect; null when there is none). |
| `media_import` | `paths` | Import media files by absolute path (MP4/MOV, WAV/MP3/FLAC/AIFF/Ogg, PNG/JPEG/…). |
| `project_inspect` | — | Project tree (bins and items with ids, types, durations), active sequence, source clip. |
| `render_frame` | — | Render the active sequence's frame (at `seconds` or the playhead) and return it as PNG. |
| `render_preview` | — | The active sequence's frame at `seconds` (default: the playhead) as PNG, same as render_frame (bridge mode: Program monitor screenshot). |
| `sequence_inspect` | — | The active sequence as JSON: settings, tracks, clips (ids, start/duration in ticks and frames, effects), transitions, markers, in/out, playh |
| `ui_click` | — | Live app: click an element by id or at x,y (points). Supports right/middle button, double-click (count=2) and modifiers. |
| `ui_control` | `method` | Live app: call any control-channel method directly (ui.set, ui.scroll, ui.timeline.hit, ui.timeline.locate, ui.playback, ui.panel.show, ui.m |
| `ui_drag` | `from`, `to` | Live app: press-drag-release from one point/element to another (move clips, trim edges, scrub, resize panels, drop project items onto tracks |
| `ui_elements` | — | Live app: every on-screen interactive element with id, label and rect (points). Use ids with ui_click/ui_drag. |
| `ui_inspect` | — | Live app: UI state (tool, workspace, panels, timeline zoom, playback, selection, fps). |
| `ui_key` | `key` | Live app: press a key or shortcut (e.g. `Space`, `L`, `Cmd+K`, `Shift+Delete`, `Cmd+Z`). |
| `ui_screenshot` | — | Live app: screenshot of the window or one panel (PNG). |
| `ui_type` | `text` | Live app: type text into the focused field. |

## `designcraft` (designcraft 0.9.0 — 26 tools)

| Tool | Required Params | Description |
|---|---|---|
| `list_commands` | — | List DesignCraft commands: id, label, menu path, shortcut, parameter description and whether it can run right now. Every user-visible action |
| `execute` | `command` | Run any DesignCraft command by id with JSON params (ids and params from list_commands). Examples: {"command":"frame.create","params":{"rect" |
| `batch` | — | Run several commands in order, stopping at the first error. Returns each result; on failure also the failing index and message (earlier comm |
| `inspect_document` | — | Summary of the active document: settings, pages (index, name, bounds, margins, columns), spreads with items (id, kind, bounds, fill, stroke, |
| `get_story` | — | Full text of a story plus its length, frames, paragraph count, line count and overset position (length and positions are UTF-8 byte offsets, |
| `set_story_text` | `text` | Replace the whole text of a story (keeps the first paragraph's and character's formatting). Use \n for paragraph breaks. Identify the story  |
| `new_document` | — | Create a new document and make it active. Sizes are in points (72 pt = 1 in). sample:true opens the multi-page magazine sample instead. |
| `open_document` | `path` | Open a .designcraft file as a new, active document. |
| `save_document` | — | Save the active document in the native .designcraft format. |
| `place_image` | — | Place an image (PNG, JPEG, WebP, GIF, TIFF) from a file `path` or `base64` data. It goes into `frame` (or the selected empty/graphic frame), |
| `render_page` | — | Render one page of the active document (printing items only, like Preview) and return it as a PNG image. Optionally also write it to `path`. |
| `export_png` | `path` | Export one page as a PNG (or JPEG if the path ends in .jpg) file. Returns the path and pixel size. |
| `screenshot` | — | Capture the whole app window (menus, panels, canvas) and return it as a PNG image. Optionally also keep it at `path`. Desktop app only (`des |
| `select_tool` | `tool` | Switch the active tool (as clicking it in the Tools panel). Ids: selection, directSelection, type, rectangleFrame, ellipseFrame, polygonFram |
| `pointer` | `events` | Drive the active tool with mouse events, exactly like the mouse would. Coordinates are spread points (space "doc", default) or, in the deskt |
| `key` | `key` | Press a key with modifiers, e.g. {key:"Z", cmd:true} (undo), {key:"Escape"}, {key:"Enter"}, {key:"Left", shift:true}. In the desktop app it  |
| `type_text` | `text` | Type text at the text insertion point, independently of the active tool, or into the focused dialog field in the desktop app. Put a caret fi |
| `ime` | — | Input method (IME) events at the Type tool's caret, as a system IME sends them: `preedit` is the marked text (shown in place, no undo step;  |
| `click` | `x`, `y` | Click at a screen point (egui points, top-left of the window = 0,0) through the real pointer path: reaches menus, panels, flyouts and dialog |
| `drag` | `x`, `y`, `toX`, `toY` | Press at (x, y), move to (toX, toY) in `steps` moves and release, in screen points through the real pointer path. Desktop app only (`designc |
| `menu_list` | — | The menu bar tree (menus, entries as cmd:/ui: command ids, separators, submenus). Desktop app only (`designcraft-cli mcp --connect PORT`). |
| `ui_inspect` | — | UI state: active tool, panels, view (zoom, origin), canvas rect in screen points, window size, documents, open dialog, perf. Desktop app onl |
| `ui_set` | — | Change UI state: panel to open or close, brightness, status text, rulers/guides/frameEdges/baselineGrid/documentGrid/textThreads, Control ba |
| `dialog_set` | `field`, `value` | Set a field of the open dialog (see ui_inspect → dialog for its fields). Desktop app only (`designcraft-cli mcp --connect PORT`). |
| `dialog_confirm` | — | Press OK in the open dialog. Desktop app only (`designcraft-cli mcp --connect PORT`). |
| `dialog_cancel` | — | Press Cancel in the open dialog. Desktop app only (`designcraft-cli mcp --connect PORT`). |

## `photocraft` (photocraft 0.10.0 — 25 tools)

| Tool | Required Params | Description |
|---|---|---|
| `command_batch` | `steps` | Run several engine commands in one call, in order (fewer round trips). Returns {completed, failed, results:[{ok, result\|error}]}; stops at t |
| `command_list` | — | List engine commands. Returns a JSON array (no wrapper object) of {id, label, menu: [path], shortcut: string\|null, params: doc string, enabl |
| `command_run` | `id` | Run an engine command by id with JSON params (see command_list). Returns the command's JSON result. Long commands (filters, Content-Aware Fi |
| `control_call` | `method` | Bridge mode: call any control-protocol method (docs/control-protocol.md) with raw params. |
| `doc_close` | — | Close a document (default: the active one) without saving. |
| `doc_export` | — | Export the document to another format (same as doc_save with an explicit path/format). |
| `doc_export_data_sets` | `dir` | Export every data set of the document as its own flattened file beneath the write root (the capability-scoped Export Data Sets). The batch i |
| `doc_export_layers` | `dir` | Export each exported layer of the document as its own file beneath the write root (the capability-scoped Layers to Files). A file that alrea |
| `doc_import_data_sets` | `path` | Import a data set CSV from the read root into the document (the capability-scoped Import Variable Data Sets). |
| `doc_inspect` | — | Document state as JSON: layer tree (top to bottom), history, selection, active layer. |
| `doc_new` | — | Create a new document (defaults: 1920x1080 RGB 8-bit white). |
| `doc_open` | `path` | Open an image or document file and make it active. Returns index, size and import warnings. |
| `doc_place` | `path` | Place a file into the document as a Smart Object layer (Place Embedded), reading `path` beneath the read root. `scale` (percent), `fit` and  |
| `doc_render_preview` | — | Render the flattened document and return it as a PNG image (bridge mode: window screenshot). |
| `doc_save` | — | Save the document. `.pcraft` is the lossless native format (incremental); other extensions (psd, png, jpg, tif, webp, exr, …) export. Withou |
| `doc_select` | `index` | Make the document at `index` active. |
| `jobs_cancel` | — | Cancel a background job by id (or every running job when `job` is omitted). The document is left unchanged. |
| `jobs_list` | — | List background jobs: running ones with progress (0-1), message and elapsed time, then the last few that ended (state done\|failed\|cancelled  |
| `render_preview` | — | Render a bounded flattened PNG preview (bridge mode: app window screenshot). |
| `session_list` | — | List open documents (index, name, size, dirty) and the active index. |
| `ui_inspect` | — | Bridge mode: full UI state of the live app (tool, panels, views, dialogs, windows). For the menu tree, call `control_call` with method `ui.m |
| `ui_menu_invoke` | `id` | Bridge mode: activate a menu item by id. |
| `ui_pointer` | `events` | Bridge mode: send pointer events (document coordinates) to the active tool; with a Color Picker open they sample the image into it instead. |
| `ui_screenshot` | — | Bridge mode: screenshot of the live app window as PNG. |
| `ui_set` | `fields` | Bridge mode: change UI state (tool, panels, dock, zoom, center, fit, theme, brush settings; see `fields`). Unknown fields are an error. |

## `effectcraft` (effectcraft 0.11.1 — 27 tools)

| Tool | Required Params | Description |
|---|---|---|
| `list_commands` | — | List engine commands: id, label, menu path, shortcut, `params` doc (e.g. `{name?, width?, height?, frameRate?, duration? (s)}`) and whether  |
| `describe_command` | — | One command in full: id, label, menu path, shortcut, the `params` doc, a JSON Schema of its parameters (`schema`: properties, required, addi |
| `execute_command` | — | Run any engine command by id with JSON params; edits are undoable. Examples: comp.new {"name":"Main","width":1920,"height":1080,"frameRate": |
| `run_script` | `code` | Run JavaScript with an After Effects-style scripting object model (app, app.project, items.addComp, comp.layers.addSolid/addText/addShape/ad |
| `get_project` | — | Project overview: file path, dirty flag, bit depth, every item (id, name, type Composition/Footage/Solid/Folder, size, duration, layer count |
| `get_comp` | — | A composition: id, name, size, frame rate, duration, work area, background and its layers top to bottom (id, index, name, type, in/out/start |
| `get_layer` | `layer` | A layer's property tree (transform, masks, effects, text, shape contents, ...): leaf properties have a `path` usable with get_property/set_p |
| `get_property` | `layer`, `path` | Read one property: type, value at `time` (comp seconds; default the current time), whether it is animated, its keyframes (time, value, in/ou |
| `set_property` | `layer`, `path` | Set a property. Without `time`: sets the static value (or a key at the current time if already animated). With `time`: adds/replaces a keyfr |
| `add_keyframe` | `layer`, `path` | Add keyframes to a property (turns the stopwatch on): one with `time` (+ optional `value`, default the current value) or many with `keys: [{ |
| `add_effect` | `layer`, `effect` | Apply an effect to a layer and optionally set its parameters in one undoable call. `effect` is an id (`ec.blur.gaussian`) or After Effects n |
| `list_effects` | — | The effect registry: id, After Effects name, category, GPU and 32-bpc support. Narrow with `filter` (id, name or category text). Apply with  |
| `list_fonts` | — | The font families text layers can use, bundled and installed on this machine: family, styles, origin (bundled / system / user), whether it i |
| `get_state` | — | Where things stand: the editor state (active comp, current time, selected layers/keys/items, open comps, tool, work area) plus what this bui |
| `render_frame` | — | Render a composition frame (default: the active comp at the current time) and return it as a PNG image, longest side `max_side` (default 960 |
| `open_project` | — | Open a project: `path` to an .ecproj file, `demo: true` for the built-in demo project, or `new: true` for an empty project. Returns the proj |
| `save_project` | — | Save the project to its current file, or to `path` (Save As, .ecproj). |
| `undo` | — | Undo the last `steps` edits (default 1). Returns the remaining undo stack. |
| `redo` | — | Redo `steps` undone edits (default 1). |
| `history` | — | The branching undo history (History panel): without arguments lists every state {index, id, label, parent, depth (0 = working line, >0 = bra |
| `script_ui` | — | Drive ScriptUI windows that scripts opened (dialogs, palettes, dockable panels). action `list` (default): open windows; `get`: a window's co |
| `batch` | `steps` | Run several engine commands in one call as ONE undo step (engine.batch). Later steps can use earlier results: a string param "$N" or "$N.key |
| `command_list` | — | List engine commands: id, label, menu path, shortcut, `params` doc (e.g. `{name?, width?, height?, frameRate?, duration? (s)}`) and whether  |
| `command_run` | `id` | Run any engine command by id with JSON params; edits are undoable. Examples: comp.new {"name":"Main","width":1920,"height":1080,"frameRate": |
| `render_preview` | — | Render a composition frame (default: the active comp at the current time) and return it as a PNG image, longest side `max_side` (default 960 |
| `command_batch` | `steps` | Run commands in order, returning each result or error. Stop at the first error by default; stop_on_error: false continues. Each edit has its |
| `doc_inspect` | — | Inspect the project overview and active composition (null when no composition is active). |

## `pdfcraft` (pdfcraft 0.9.0 — 17 tools)

| Tool | Required Params | Description |
|---|---|---|
| `doc_open` | `path` | Open a PDF file and return its document id, page count and whether it can be edited. |
| `doc_info` | `doc` | Metadata, page sizes and labels, bookmarks, annotations, form fields, links, layers, page transitions and display times, attachments, fonts, |
| `doc_save` | `doc` | Save to its own file (an incremental update, which keeps signatures valid) or to a new path (a full rewrite). The write is atomic. flatten_f |
| `doc_close` | `doc` | Close a document. Fails if it has unsaved changes unless discard_changes is true. |
| `page_render` | `doc`, `page` | Render one page to a PNG image (default 96 dpi, at most 600). |
| `text_extract` | `doc` | Extract the text of some or all pages, in reading order. With rect, only the text inside that rectangle on each page, as Column select takes |
| `text_find` | `doc`, `query` | Find a phrase (case-insensitive, whitespace-normalised) and return matches in page order with page and line rectangles in points (origin top |
| `doc_combine` | `paths` | Combine files, in order, into one PDF (bookmarks are kept under one entry per file). Images (PNG, JPEG, TIFF, GIF, BMP, JPEG 2000) and .txt  |
| `doc_split` | `doc`, `out_dir` | Split into several files written to out_dir: every N pages, before given pages, at top-level bookmarks (bookmarks: true; files named after t |
| `edit_undo` | `doc` | Undo the last edit of a document. |
| `command_list` | — | Every registered PdfCraft command with its menu, shortcut, whether it is enabled now, and the tool that automates it. |
| `command_run` | `id` | Run a registry command through its headless tool. Pass that tool's arguments in params (see command_list). Unknown params are ignored with w |
| `command_batch` | `steps` | Run steps in order (at most 1000). Returns completed/failed counts and per-step ok/result/error; stop_on_error defaults to true. |
| `doc_inspect` | — | With doc, return doc_info; otherwise return information for every open document (empty documents array when none are open). |
| `render_preview` | — | Render a PNG bounded by max_side (default 1024), without changing or saving the document. Page defaults to 1; doc may be omitted when exactl |
| `tool_search` | — | Search and list all PdfCraft automation tools, including the core tools, with a one-sentence description each. Filter by query (words matche |
| `tool_call` | `name` | Run any PdfCraft tool by name with its arguments, exactly as if it were called directly. Find names and argument schemas with tool_search. T |

## `lightcraft` (lightcraft 0.9.1 — 17 tools)

| Tool | Required Params | Description |
|---|---|---|
| `command_list` | — | Every command (engine + UI when connected) with id, label, menu, shortcut, parameter doc and whether it is enabled now. Each id is also call |
| `command_run` | `id` | Run any LightCraft command by id with JSON params (see command_list for ids and parameter docs), e.g. {id: "photo.rate", params: {rating: 4} |
| `command_batch` | `steps` | Run several commands in order: {steps: [{id, params?}], stop_on_error?: true}. Returns {completed, failed, results: [{ok, result \| error}]}. |
| `doc_inspect` | — | The library as JSON: current source, filter, sort, selection, active photo and undo/redo labels (library.state) plus counts (catalog.stats). |
| `render_preview` | — | Render a photo with its current develop settings (cropped) and return it as an image (`max_side` is the long edge; does not change selection |
| `list_commands` | — | Every command (engine + UI when connected) with id, label, menu, shortcut, parameter doc and whether it is enabled now. Each id is also call |
| `run_command` | `command` | Run any LightCraft command by id with JSON params (see list_commands for ids and parameter docs), e.g. {command: "photo.rate", params: {rati |
| `import` | `paths` | Add image/raw files to the library. Folders are scanned recursively for photos; relative paths resolve against the server's working director |
| `query_photos` | — | List photos (id, file name, size, rating, flag, edited…). Without filter/sort: the current library view. |
| `select_photos` | `ids` | Set the selection; the active photo (the one develop tools edit) is `active` or the first id. |
| `list_controls` | — | Every develop slider (id like `light.exposure`, label, section, min, max, default, current value) for the active photo. |
| `get_develop` | — | The full develop settings JSON of a photo (white balance, light, color, curves, mixer, grading, effects, crop, masks, spots…). |
| `set_develop` | — | Edit a photo (one undo step each for values and settings). `values` sets sliders by control id (see list_controls), e.g. {"light.exposure":  |
| `apply_preset` | `preset` | Apply a develop preset (ids from cmd_presets_list) to the selection or `ids`, at `amount` percent (0..200, default 100). |
| `crop` | — | Set the crop of the active photo: `rect` [x0,y0,x1,y1] in normalized coordinates (0..1, origin top-left) of the straightened frame, `angle`  |
| `render_photo` | — | Render a photo with its current develop settings (cropped) and return it as an image so you can look at the result. |
| `export` | — | Render and write photos. Give `path` (one photo; format from the extension unless `format` is set) or `dir` (batch, file names from `naming` |

## `deckcraft` (deckcraft 0.8.0 — 25 tools)

| Tool | Required Params | Description |
|---|---|---|
| `list_commands` | — | Every command (id, label, ribbon/menu place, shortcut, parameter summary, whether it is enabled now). Filter by a substring of id or label. |
| `run_command` | `command` | Run any command by id with JSON parameters. This is how everything is done: slide.new, shape.insert, text.set, format.bold, shape.fill, desi |
| `batch` | `commands` | Run commands in order; stops at the first error unless keepGoing. Returns each result. |
| `new_presentation` | — | Start a new presentation (one title slide). Optional theme: DeckCraft, Harbor, Ember, Meadow, Nocturne, Paper, Coral Reef, Slate. |
| `open_presentation` | `path` | Open a .deckcraft or .pptx file by path. |
| `save_presentation` | — | Save the active presentation (.deckcraft or .pptx by extension). |
| `export` | `path` | Export slides: png/jpeg (one slide, or all with all:true), pptx, deckcraft, outline text, pdf (slides, notes pages or handouts), or an anima |
| `inspect_document` | — | Slides (index, id, title, layout, shape count, transition, animations, notes), sections, theme, layouts, media and the selection. |
| `inspect_slide` | — | One slide's shapes with ids, kinds, boxes [x,y,w,h], placeholder types, text, fills, tables, charts; plus background, transition, animations |
| `render_slide` | — | Render a slide to a PNG image and return it, to check your work visually. |
| `add_slide` | — | Insert a slide after the current one with a layout (title, titleAndContent, sectionHeader, twoContent, comparison, titleOnly, blank, content |
| `go_to_slide` | `index` | Make a slide current (shape commands act on the current slide). |
| `add_shape` | `preset`, `x`, `y`, `w`, `h` | Insert a preset shape (rect, roundRect, ellipse, triangle, diamond, rightArrow, chevron, star5, heart, cloud, wedgeRectCallout, line, straig |
| `add_text_box` | `x`, `y`, `w`, `text` | Insert a text box. Height grows to fit the text. |
| `set_text` | `id`, `text` | Replace a shape's text (keeps its first run's formatting). Leading tabs set bullet levels. |
| `insert_picture` | — | Insert a picture from a file path or base64 data, optionally at a box. |
| `insert_table` | `rows`, `cols` | Insert a table with rows×cols and optional cell text (data: rows of strings). |
| `insert_chart` | — | Insert a chart (column, bar, line, pie, doughnut, area, scatter, stackedColumn…) with categories and series. |
| `select` | `ids` | Select shapes by id (formatting commands then act on them). |
| `pointer` | `events` | Drive the active tool with pointer events in slide points: down/drag/up/move/doubleclick/contextclick, exactly like the mouse (draws, moves, |
| `select_tool` | `tool` | Pick the pointer tool: select, textBox, shape (with preset), pen, highlighter, eraser — or a preset name. |
| `key` | `key` | Press a key as on the keyboard: text editing keys (arrows, Backspace, Enter, Tab), nudges, and shortcuts (cmd+B…). |
| `type_text` | `text` | Type text into the text being edited (or into the selected shape). |
| `screenshot` | — | Screenshot of the whole DeckCraft window (UI included). Desktop app only (`deckcraft-cli mcp --connect PORT`). |
| `call_app` | `method` | Call any control-channel method (ui.click, ui.set, ui.dialog.*, ui.inspect…). Desktop app only (`deckcraft-cli mcp --connect PORT`). |

## `wordcraft` (wordcraft 0.8.0 — 16 tools)

| Tool | Required Params | Description |
|---|---|---|
| `list_commands` | — | Every WordCraft command: id, label, ribbon location, shortcut and params. Filter with `query`. |
| `execute` | `command` | Run one command by id with params, e.g. {command:"format.bold"} or {command:"insert.table", params:{rows:3, cols:4}}. |
| `batch` | `commands` | Run commands in order; stops at the first error unless keepGoing. |
| `new_document` | — | Start a document: blank, sample, letter, resume or report. |
| `open_document` | `path` | Open a .docx, .doc, .odt, .rtf, .md, .tex, .html, .txt or .json file, or any other text file (.m3u, .log, .ini…) as plain text. |
| `save_document` | — | Save (format from the extension: docx, pdf, odt, rtf, html, md, tex, txt, png). |
| `type_text` | `text` | Type at the caret (replacing the selection). Use \n... for line breaks inside text; use execute text.newParagraph for new paragraphs, or `pa |
| `select_text` | `text` | Select the n-th occurrence of some text. |
| `get_text` | — | Body text with tracked deletions omitted. |
| `inspect_document` | — | Structure: blocks with text, styles, formatting runs, lists, tables, sections, parts, selection, pages. |
| `render_page` | — | Render a page to PNG to look at the result. |
| `parity` | — | WordCraft's command coverage of the word-processor feature catalog. |
| `screenshot` | — | Screenshot of the whole WordCraft window (desktop app only). |
| `click` | `x`, `y` | Click at window coordinates (desktop app only). |
| `key` | `key` | Press a key with modifiers (desktop app only), e.g. {key:"B", cmd:true}. |
| `ui_inspect` | — | UI state: tab, panes, dialog, page rectangles on screen, caret (desktop app only). |

## `vectorcraft` (vectorcraft 0.13.1 — 32 tools)

| Tool | Required Params | Description |
|---|---|---|
| `command_list` | — | Discover command ids, labels, parameter descriptions and enabled state. Returns an array. The whole catalogue is large: narrow it with filte |
| `command_run` | `id` | Run an engine command by id with its JSON params. Command parameters follow the registry's descriptions. |
| `command_batch` | `steps` | Run steps in order; each edit is its own undo step, or with atomic:true the whole batch is one (named `label`, else after its first edit). A |
| `doc_inspect` | — | Summary of the active document, including artboards, layer tree, selection and history. On a large document scope it: depth 0 for the layer  |
| `render_preview` | — | Render an artboard (default the first) as inline PNG without changing the document. max_side defaults to 1024, limited to 1..4096. |
| `ui_inspect` | — | Inspect the connected desktop interface; returns a tool error in headless mode. |
| `ui_screenshot` | — | Capture the connected desktop window as inline PNG; requires a running desktop app. |
| `list_commands` | — | List VectorCraft commands (id, label, menu path, shortcut, parameter description, enabled state). Every editing action is a command; run any |
| `run_command` | `command` | Execute any VectorCraft command by id with JSON params (see list_commands for ids and params). Examples: {"command":"object.group"}, {"comma |
| `inspect_document` | — | Summary of the active document: artboards, layer tree (ids, names, kinds, bounds, fill/stroke), selection, undo history, current tool and de |
| `inspect_ui` | — | UI state of the running desktop app: tool and options, panels, dialogs, view (zoom/center), window, documents, perf. Desktop app only. |
| `select_tool` | `tool` | Switch the active tool (as clicking it in the Tools panel). Ids: selection, directSelection, groupSelection, pen, rectangle, roundedRectangl |
| `pointer_gesture` | `events` | Drive the active tool with mouse events in document coordinates, exactly like the mouse would (e.g. a rectangle drag: down at (100,100), dra |
| `draw_path` | — | Create a path from points ([[x,y],…] or [{x,y,in?:[x,y],out?:[x,y]},…] with Bézier handles) or SVG path data `d`, then apply optional paint, |
| `draw_shape` | `shape` | Create a live shape and apply optional paint. rectangle/ellipse: x, y, width, height (rectangle: radius = corner radius). polygon: cx, cy, r |
| `set_paint` | — | Set fill, stroke and/or stroke weight on the selection (or `ids`) and as the default for new art. |
| `press_key` | `key` | Send a key press with modifiers, e.g. {key:"Z", mods:{cmd:true}} (undo), {key:"Escape"}, {key:"Enter"}. In the desktop app it goes through t |
| `type_text` | `text` | Type text into the focused widget (text tool, dialog field). Desktop app only. |
| `invoke_menu` | `command` | Invoke a menu item by its command id (same ids as list_commands, including UI-only commands like view.zoomIn or window.* in the desktop app) |
| `open_panel` | `panel` | Open a panel in the desktop app's dock by id (layers, swatches, stroke, align, pathfinder, transform, …; case-insensitive, display labels li |
| `screenshot` | — | Render the active artboard to PNG and return it as an image (optionally also saving it to `path`). With window:true (desktop app only) captu |
| `open_file` | `path` | Open a file as a new, active document: .vectorcraft, .drawcraft, .svg, .svgz, .pdf, .ai, .ait, .png, .jpg, .jpeg, .gif, .webp, .tif, .tiff,  |
| `save_file` | — | Save the active document with the engine's document.save: by default to its own file in its own format (native .vectorcraft unless it was op |
| `export` | — | Export the active document with the engine's document.export (the same bytes in the app and headless), in any format of the `format` enum: v |
| `add_text` | `text` | Create point type at (x, y) (the first baseline), area type when width/height are given (`fit` autoHeight grows the frame to the text, shrin |
| `apply_effect` | — | Append a live effect (Effect menu) to the selection or `ids`. Omit `effect` to get the catalogue (ids, parameters, defaults). Examples: styl |
| `pathfinder` | `operation` | Combine the selected (or `ids`) objects destructively, back to front: unite, minusFront, intersect, exclude, divide, trim, merge, crop, outl |
| `transform` | — | Move, rotate, scale, reflect or shear the selection (or `ids`); several may be combined and run in that order. Angles in degrees (counter-cl |
| `create_graph` | `x`, `y`, `width`, `height` | Create a graph (graph tools) in the plot rectangle. Data as `csv` (first row: empty cell then series names; then one row per category: label |
| `text_wrap` | — | Make the selected (or `ids`) objects wrap objects: area type below them in the same layer flows around them (offset in pt, invert = flow ins |
| `undo` | — | Undo the last change (Edit → Undo). |
| `redo` | — | Redo the last undone change (Edit → Redo). |
