---
name: brand-style-agent
description: Definicion estrategica de identidad visual desde cero para perfiles tecnicos sin formacion estetica. Estructura 5 marcos obligatorios (Brand Identity Prism, Color Psychology Framework, Typography Hierarchy, Imagery Direction Framework, Design System Principles) y los compila en tokens matematicos verificables.
---

# Brand Style Agent — Dirección Estratégica de Identidad Visual

Esta Skill traduce atributos funcionales y técnicos de un producto en una especificación matemática de identidad visual, eliminando la necesidad de que el ingeniero tome decisiones subjetivas sobre colores, fuentes o proporciones.

## Los 5 Marcos Obligatorios

### 1. Brand Identity Prism (Prisma de Identidad de Marca)
Define las seis facetas de Kapferer aplicadas al producto tecnológico:
- **Físico (Physique):** Superficies de cristal oscuro blindado (*dark obsidian glass*), telemetría satelital en tiempo real, retículas de precisión aeroespacial, escudo 3D con loop 360°.
- **Personalidad (Personality):** Vanguardista, táctica, implacable ante el robo, serena bajo presión, técnicamente rigurosa.
- **Cultura (Culture):** Ingeniería de precisión en tiempo real, seguridad preventiva y reacción inmediata 24/7 respaldada por técnicos certificados por el SENA.
- **Relación (Relationship):** Centro de mando personal que otorga al propietario control absoluto sobre su vehículo desde el bolsillo.
- **Reflejo (Reflection):** Conductores y gerentes de flota previsores que exigen tecnología de nivel militar en lugar de alarmas genéricas.
- **Autoimagen (Self-Image):** *"Mi vehículo está protegido por telemetría activa; tengo el control en un toque."*

### 2. Color Psychology Framework (Marco de Psicología y Matemática del Color)
Todo color del sistema debe justificarse psicológicamente y superar validación algorítmica de contraste **WCAG 2.2 AA/AAA**:
- **Fondo Principal (`void-bg`: `#050810`):** Vacío profundo aeroespacial (`L = 0.004`). Maximiza el contraste de los indicadores luminosos en uso nocturno.
- **Superficie Elevada (`obsidian-surface`: `#0B0F19` / `#111827`):** Separa planos de información mediante luminancia progresiva sin recurrir a bordes pesados.
- **Primario de Marca (`electric-violet`: `#8B5CF6` / `#6836C6`):** Autoridad tecnológica, blindaje inteligente y vanguardia.
- **Acento Telemático (`quantum-cyan`: `#00F0FF` / `#38BDF8`):** Precisión satelital GPS 4G, señal en vivo y barrido de radar (contraste `14.2:1` sobre `#050810`, AAA).
- **Estado Seguro (`tactical-emerald`: `#10B981`):** Vehículo asegurado, telemetría nominal, técnico verificado SENA (contraste `8.4:1` sobre `#050810`, AAA).
- **Estado de Alerta / Corte de Motor (`crimson-alert`: `#FF2A55` / `#EF4444`):** Intrusión detectada, inmovilización remota activa (contraste `5.9:1` sobre `#050810`, AA).

### 3. Typography Hierarchy (Jerarquía Tipográfica Modular)
Escala modular estricta **1.250 (Major Third)** con base `16px (1rem)`:
- **Display / Títulos (`Geist` / `Inter`, pesos 700–800):** Tracking cerrado (`-0.03em`), altura de línea compacta (`1.08–1.15`) para autoridad visual.
  - `display-2xl`: `3.815rem (61px)`
  - `display-xl`: `3.052rem (48.8px)`
  - `h1`: `2.441rem (39px)`
  - `h2`: `1.953rem (31.25px)`
  - `h3`: `1.563rem (25px)`
  - `h4`: `1.25rem (20px)`
- **Body (`Geist` / `Inter`, pesos 400–500):** Medida óptima de lectura `60–70ch`, altura de línea `1.6`.
- **Telemetría y Datos (`Geist Mono` / `JetBrains Mono`, pesos 500–700):** `font-variant-numeric: tabular-nums` obligatorio para coordenadas GPS, velocidades, placas, conteos regresivos y métricas de latencia.

### 4. Imagery Direction Framework (Dirección Fotográfica y de Activos)
- **Prohibido el stock corporativo genérico:** Nunca usar fotos de archivo de personas sonriendo en oficinas blancas.
- **Tratamiento en PhotoCraft MCP:**
  1. Nitidez inteligente sobre detalles de interfaz y hardware (`filter.sharpen.smartSharpen`).
  2. Armonización cromática hacia sombras frío-violeta (`#050810`) y altas luces cian/púrpura mediante curvas no destructivas.
  3. Marcos de dispositivo con sombra de oclusión ambiental suave y borde especular de `1px` (`rgba(255,255,255,0.12)`).

### 5. Design System Principles (Principios del Sistema de Diseño)
1. **Unidad Espacial de 8pt:** Todos los paddings, gaps y márgenes son múltiplos de `4px` / `8px` (`4, 8, 12, 16, 24, 32, 48, 64, 96`).
2. **Glassmorphism Funcional:** Máximo 2 capas translúcidas superpuestas por vista (`backdrop-blur-xl`, fondo `rgba(11, 15, 25, 0.78)`), siempre con borde luminoso de `1px`.
3. **Densidad Táctica Controlada:** Máximo 4 puntos de datos por tarjeta y máximo 3 tarjetas por fila en desktop.
