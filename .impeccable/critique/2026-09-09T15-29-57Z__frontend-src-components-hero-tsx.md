---
target: frontend/src/components/hero.tsx
total_score: 18
max_score: 32
na_heuristics: 7,10
p0_count: 1
p1_count: 1
target_identity: "file:C:\\Users\\DAVID\\Documents\\tec360-seguridad\\frontend\\src\\components\\hero.tsx"
target_fingerprint: "sha256:20d52bfa36b4c360f0127d69177a9861084f67e5d18d5849b577a37e8708071f"
target_path: "C:\\Users\\DAVID\\Documents\\tec360-seguridad\\frontend\\src\\components\\hero.tsx"
timestamp: 2026-09-09T15-29-57Z
slug: frontend-src-components-hero-tsx
---
Method: dual-agent (A: 26165a51-03cd-4201-af6d-2d90cad26a9d · B: CLI detector)

### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|:-----:|-----------|
| 1 | Visibility of System Status | 2 | Indicadores estáticos simulados ("Estado: Seguro"), contadores con timers no calibrados y ausencia de métricas reales de telemetría/latencia |
| 2 | Match System / Real World | 2 | Desconexión procedural: equipara instalación técnica a "pedir un taxi" y burocratiza la recuperación de robo exigiendo denuncia previa antes de actuar |
| 3 | User Control and Freedom | 2 | Embudo roto: CTA principal envía a `/login` a usuarios nuevos; CTAs de pilares no transfieren parámetros del servicio seleccionado |
| 4 | Consistency and Standards | 2 | Fragmentación de materiales: mezcla de glassmorphism de alta gama con emojis del sistema operativo; iconos duplicados (`Car`) en contextos distintos |
| 5 | Error Prevention | 3 | Sin canal de triaje o línea de emergencia para robo activo; riesgo de que usuarios en pánico naveguen marketing sin atención inmediata |
| 6 | Recognition Rather Than Recall | 3 | Pastillas abstractas ("Bloqueo Remoto", "Corte de Motor") sin diagramas de arquitectura, capturas de pantalla ni preview del hardware |
| 7 | Flexibility and Efficiency of Use | n/a | Mode-inapplicable: superficie de marketing y conversión (Persuade mode) |
| 8 | Aesthetic and Minimalist Design | 2 | Saturación decorativa: rombo giratorio abstracto, rayos SVG diagonales, múltiples halos de neón ("todo brilla") y gradientes genéricos de IA |
| 9 | Help Users Recognize, Diagnose, and Recover | 2 | Rutas de conversión ciegas para usuarios no autenticados y soporte oculto tras un correo personal `@gmail.com` |
| 10 | Help and Documentation | n/a | Mode-inapplicable: página de aterrizaje publicitaria (Persuade mode) |
| **Total** | | **18 / 32** | **Aceptable (56.3%)** |

### Design Specificity Verdict

**Evaluación del Director de Diseño (Assessment A)**:
Existe una disonancia crítica entre la visión del producto (*"ecosistema telemático aeroespacial/militar con telemetría satelital 24/7 y corte de motor remoto"*) y la implementación actual:
1. **El Arquetipo del Escudo Holográfico**: El rombo giratorio en 45° con anillos infinitos y líneas punteadas es un cliché visual genérico de IA/Web3 que no comunica nada sobre ingeniería automotriz, satélites o telemetría vehicular.
2. **Degradación por Emojis**: El uso de emojis del sistema (`📍`, `🤝`, `🛡️`, `🚨`) en las tarjetas rompe la seriedad técnica y luce infantil en entornos desktop.
3. **Identidad Confusa**: No queda claro si Tec360 es una empresa de alta tecnología telemática o un directorio de técnicos del SENA en incubación.

**Escaneo Determinista (Assessment B)**:
El detector de Impeccable identificó 4 advertencias deterministas en `hero.tsx` y 5 en `features.tsx`:
- `gradient-text` en línea 227 (`bg-clip-text + bg-gradient`): Antipadrón de texto degradado decorativo típico de plantillas de IA.
- `ai-color-palette`: Uso repetitivo de degradados púrpura/violeta y acentos cian/azul (`from-violet-100`, `from-violet-500`, `text-violet-600`) que delatan una estética genérica sin paleta propietaria intencional.

### Overall Impression
La base de motion y maquetación (Framer Motion y Tailwind) es técnicamente sólida, pero visualmente adolece del "síndrome de plantilla SaaS genérica". La mayor oportunidad radica en reemplazar el escudo decorativo por una **Consola HUD de Telemetría Táctica Real** que demuestre la potencia tecnológica de la plataforma.

### What's Working
1. **Bifurcación Estratégica en Dos Pilares**: La clara separación entre Instalación Proactiva y Recuperación Reactiva en `PillarsSection` estructura muy bien los dos intereses de compra.
2. **Base de Animaciones y Parallax**: `useScroll`, `useTransform` y `fadeUp` proporcionan transiciones suaves y fluidas sin jank.
3. **Fundación CSS de Glassmorphism**: `.landing-glass-premium` tiene una buena base de bordes con gradiente de 1px y desenfoques de fondo.

### Priority Issues

- **[P0] Embudo de Conversión Roto (CTA Principal a `/login`)**:
  - *Problema*: "Comenzar Ahora" apunta a `/login` en lugar de guiar a una cotización o registro (`/register`).
  - *Impacto*: Rebote inmediato de visitantes nuevos interesados.
  - *Solución*: Redirigir el CTA principal al flujo de cotización/registro y parametrizar los pilares (`?tipo=instalacion`).
  - *Comando sugerido*: `$impeccable clarify`

- **[P1] Brechas Críticas de Confianza en el Footer y Soporte**:
  - *Problema*: Correo personal `@gmail.com` y sellos prominentes de incubadora en el canal de contacto oficial.
  - *Impacto*: Destruye la autoridad institucional para clientes de flotas y vehículos de alta gama.
  - *Solución*: Canal corporativo (`contacto@tec360seguridad.com`), línea de emergencias 24/7 y reubicación de sellos de respaldo.
  - *Comando sugerido*: `$impeccable harden`

- **[P2] Pieza Central Genérica de IA ("Escudo Holográfico")**:
  - *Problema*: El componente `HolographicShield` no transmite hardware, satélites ni telemetría.
  - *Impacto*: Cero prueba tangible de valor y apariencia de plantilla genérica.
  - *Solución*: Sustituir por una **Consola HUD Telemática Táctica** con radar satelital interactivo, telemetría de vehículo en vivo (coordenadas, batería, ignición) y simulador de corte de motor.
  - *Comando sugerido*: `$impeccable bolder`

- **[P2] Emojis Infantiles y Micro-Copy Poco Riguroso**:
  - *Problema*: Emojis nativos en los pasos operativos y frases como *"Tan fácil como pedir un taxi"*.
  - *Impacto*: Desvaloriza la precisión técnica requerida para la instalación automotriz.
  - *Solución*: Sustituir emojis por iconos Lucide en micro-chips tácticos y redactar micro-copy con rigor técnico.
  - *Comando sugerido*: `$impeccable typeset`

- **[P3] Parálisis Procedural en el Protocolo de Recuperación**:
  - *Problema*: Exigir la denuncia policial como Paso 01 antes de cualquier acción.
  - *Impacto*: En casos de hurto vehicular, esperar la denuncia garantiza la pérdida del vehículo ante jammers.
  - *Solución*: Invertir el orden: Paso 01 "Bloqueo Digital Inmediato y Cerco Satelital 24/7"; Paso 02 "Coordinación y Radicación Táctica".
  - *Comando sugerido*: `$impeccable clarify`

### Persona Red Flags

- **Alex (Power User / Administrador de Flotas)**: No encuentra ninguna métrica para flotas empresariales ni API telemática. Los contadores muestran solo 500 servicios entre 200 técnicos, señalando poca madurez. Abandona en 12 segundos hacia proveedores consolidados.
- **Jordan (Dueño de Vehículo / Crisis de Hurto Activo)**: Con el carro recién robado, no encuentra un botón de llamada de emergencia SOS 24/7, el CTA lo manda a iniciar sesión y lee que debe ir primero a la Fiscalía. Abandona en pánico.
- **Sam (Accesibilidad)**: Los SVGs decorativos carecen de `aria-hidden="true"`, los emojis no tienen `aria-label` y algunos contrastes de texto sobre vidrio translúcido caen por debajo del umbral WCAG AA (4.5:1).

### Minor Observations
- `useCounter` corre sobre `setInterval` a 16ms en lugar de `requestAnimationFrame` o hooks nativos de Framer Motion.
- Falta de tags `og:image` en los metadatos de Next.js.
- Repetición del icono `Car` para conceptos diferentes (Instalación vs Recuperación).

### Questions to Consider
- ¿Cómo luciría una consola telemática interactiva en el Hero donde el usuario pueda alternar entre Auto, Moto y Carga Pesada viendo el corte de motor en acción?
- ¿Deberíamos añadir un botón flotante de emergencia/SOS 24/7 para atención inmediata ante siniestros?
