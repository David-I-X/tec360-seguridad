---
name: brand-guidelines
description: Aplicacion consistente de los estandares visuales corporativos de Tec360 Seguridad v3.0 a cualquier artefacto (web Next.js, app movil Expo, videos cortos 16:9 / 9:16, presentaciones DeckCraft, documentos WordCraft/PdfCraft y piezas sociales). Define variables CSS, las 3 lineas de servicio, jerarquia tipografica de 3 voces, ratios WCAG y margenes del logotipo Orbital Radar 360 V2.
---

# Brand Guidelines — Estándares Visuales Normativos de Tec360 Seguridad (v3.0 Oficial)

Activa esta Skill siempre que generes o modifiques componentes de interfaz, páginas de aterrizaje, pantallas móviles Expo, portadas de video corto, documentos corporativos o presentaciones de **Tec360 Seguridad**.

## 1. Variables CSS y Tokens Normativos (`tec360-tokens.css`)

```css
:root {
  /* Superficies Modo Oscuro Inmersivo (Experiencia Principal) */
  --brand-void: #050810;
  --brand-obsidian: #0b0f19;
  --brand-elevated: #111827;
  --brand-border-glass: rgba(139, 92, 246, 0.24);
  --brand-border-hairline: rgba(255, 255, 255, 0.08);

  /* Identidad Primaria & 3 Líneas de Servicio */
  --brand-primary: #7c3aed;          /* CTA Principal & Instalaciones */
  --brand-primary-vivid: #8b5cf6;    /* Pilar 01: Instalaciones Vehiculares */
  --brand-primary-deep: #5b21b6;     /* Fondos institucionales invertidos */
  --brand-secondary-blue: #3b82f6;   /* Enlace satelital / Gradiente orbital */
  --brand-telemetry-cyan: #00f0ff;   /* Pilar 02: Equipo de Reacción 24/7 & [CORCHETES] */
  --brand-warning-amber: #f59e0b;    /* Pilar 03: Mecánica Básica a Domicilio */

  /* Estados Semánticos Tácticos */
  --brand-armed-emerald: #10b981;    /* Red 4G activa / Técnico certificado verificado */
  --brand-alert-crimson: #ff2a55;    /* Corte de motor remoto activo (0 KM/H LOCKED) */

  /* Jerarquía de Texto Teñido (Nunca grises muertos sobre fondo oscuro) */
  --brand-text-primary: #f8fafc;     /* 19.3:1 AAA */
  --brand-text-body: #b4b0c8;        /* 9.4:1 AAA — Lavanda de lectura */
  --brand-text-dual: #a39eb8;        /* 7.8:1 AAA — Segunda voz en titulares Archivo */

  /* Soporte Modo Claro (Papelería, PDF legal, facturas) */
  --brand-bg-light: #f8fafc;
  --brand-surface-light: #ffffff;
  --brand-text-light: #0f172a;
  --brand-cyan-light: #0284c7;

  /* Sistema Tipográfico de 3 Voces */
  --font-display: 'Archivo', 'Geist', 'Inter', system-ui, sans-serif;
  --font-sans: 'Geist', 'Inter', system-ui, sans-serif;
  --font-mono: 'Geist Mono', 'JetBrains Mono', monospace;
}
```

## 2. Reglas de Comunicación y Líneas de Servicio
- **Cero menciones a entidades externas (SENA, etc.):** Todo respaldo técnico se expresa única y exclusivamente como **técnicos certificados** (con validación de identidad, antecedentes e idoneidad técnica).
- **Coherencia de las 3 Líneas de Servicio:**
  1. **Instalaciones Vehiculares (`#8B5CF6` / `#7C3AED`):** GPS 4G L1/L5 anti-jammer, Dashcam HD, alarmas inteligentes y bloqueo CAN-Bus OEM.
  2. **Equipo de Reacción & Recuperación 24/7 (`#00F0FF` / `#FF2A55`):** Rastreo cada 10 s, corte de motor a `[0 KM/H]` y reacción en campo con enlace policial.
  3. **Mecánica Básica a Domicilio (`#F59E0B` / `#10B981`):** Batería y corriente (`< 30m`), llantas (`< 30m`), aceite (`< 45m`), frenos, kit de arrastre y luces.

## 3. Reglas del Logotipo Maestro — Orbital Radar 360° V2
- **Zona de Exclusión (Safe Margin):** Mínimo `0.5R` (medio radio del isotipo) libre alrededor del símbolo en cualquier cabecera, botón, credencial o lámina.
- **Tamaño Mínimo:** `28px` de alto en cabeceras digitales (`16px` / `32px` usando `logo/app-icons/favicon.svg` óptico); `12mm` en PDF/impresión.
- **Activos Oficiales en `./brand-workspace/deliverables/`:**
  - `logo/`: 6 firmas horizontales en curvas (`primary`, `transparent-dark`, `transparent-light`, `mono-light`, `mono-dark`, `inverted`), 6 isotipos (`logo/isotipo/`), `logo/app-icons/` y `tec360-master-sheet`.
  - `icons/`: 6 iconos tácticos `24pt` (`icon-gps-4g`, `icon-engine-cut`, `icon-dashcam-hd`, `icon-reaction-24-7`, `icon-mechanics-express`, `icon-certified-tech`).
  - `social/`: Tarjeta OpenGraph `1200×630` (`tec360-og-banner-1200x630`), 3 portadas HD `16:9` de videos cortos de servicio y credencial oficial de técnico certificado.
  - `editorial/tec360-brand-book.pdf`: Manual Corporativo completo de 8 páginas HD.

## 4. Tipografía, Accesibilidad (WCAG 2.2 AA) y Convenciones
- **Titulares `Archivo` de Doble Luminancia:** Combinan `#F8FAFC` (`600`) + `#A39EB8` (`400`) + énfasis indivisible (`whitespace-nowrap`) `[ENTRE CORCHETES]` en `#00F0FF`. **Prohibido** usar kickers/eyebrows encima de titulares.
- **Contraste en Botones de Servicio:** Sobre `#7C3AED` usar texto `#F8FAFC` (`5.7:1`); sobre `#00F0FF` (Reacción) y `#F59E0B` (Mecánica) usar texto oscuro `#050810` (`> 10:1` AAA).
- **Números Tabulares:** Reservar `Geist Mono` (`tabular-nums`) estrictamente para velocidades, coordenadas, voltajes, duraciones (`00:18`), tiempos (`< 30 MIN`) y teléfonos.
- **Offset de Navbar Fija en Next.js:** Todo contenedor raíz de página en `frontend/src/app/` debe incluir `pt-24` (`96px`).
