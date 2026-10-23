# Tec360 Creative Studio Plugin Rules

1. **Design Tokens First:** Antes de invocar cualquier herramienta de `StitchMCP` o de la suite `ArtCraft` (`vectorcraft`, `photocraft`, `figcraft`, `designcraft`, `pdfcraft`, `deckcraft`, `wordcraft`, `effectcraft`, `filmcraft`, `soundcraft`, `lightcraft`), lee `DESIGN.md` en la raíz del proyecto y `./brand-workspace/deliverables/brand-tokens.json`.
2. **Generative vs Deterministic Split:**
   - **Ideación Generativa de UI y Variantes:** Usa `StitchMCP` (`https://stitch.withgoogle.com/`).
   - **Ejecución Determinista de Activos:** Usa los servidores MCP locales en Rust de la suite ArtCraft (`vectorcraft`, `photocraft`, `figcraft`, `designcraft`, `pdfcraft`, `deckcraft`, `wordcraft`, `effectcraft`, `filmcraft`, `soundcraft`, `lightcraft`), además de `anatomy` para figuras técnicas isométricas y `HyperFrames` para video programático HTML/GSAP.
3. **Closed-Loop Multimodal Audit:** Ningún entregable se da por terminado sin generar e inspeccionar su vista previa (`render_preview`, `page_render`, `screenshot` o captura de navegador) verificando contraste WCAG AA, ausencia de colisiones y fidelidad a los tokens de marca.
