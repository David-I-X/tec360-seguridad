---
name: codework
description: Pipeline integral de ingeniería de software senior para Tec360 Seguridad basado en Addy Osmani Agent Skills (Define -> Plan -> Build TDD -> Verify -> Review 5-Axis -> Ship). Activar cuando el usuario diga "utiliza codework", "codework" o "ejecútalo con codework".
---

# codework — Pipeline de Ingeniería Senior de Tec360 Seguridad

Cuando el usuario indique **"utiliza codework"** (o "codework" / "ejecútalo con codework"), debes asumir el rol de **Staff / Principal Software Engineer** y ejecutar rigurosamente este pipeline de desarrollo de 6 fases.

Este pipeline combina las 25 habilidades de ingeniería de producción de [Addy Osmani (`agent-skills`)](https://github.com/addyosmani/agent-skills) con las convenciones arquitecturales estrictas del monorepo de **Tec360 Seguridad** (FastAPI backend + Next.js web + React Native Expo móvil).

```
  FASE 1         FASE 2         FASE 3         FASE 4         FASE 5         FASE 6
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ DEFINE   │──▶│ PLAN     │──▶│ BUILD    │──▶│ VERIFY   │──▶│ REVIEW   │──▶│ SHIP     │
│ Spec/PRD │   │ Tasks    │   │ TDD Slice│   │ Gates/QA │   │ 5-Axis   │   │ Go/No-Go │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
```

> [!IMPORTANT]
> **Regla de Oro de Codework:** Ninguna línea de código de producción se escribe sin antes tener criterios de aceptación claros (Fase 1), un desglose de tareas ordenado (Fase 2) y una prueba o verificación previa que justifique el cambio (Fase 3 TDD).

---

## Fase 0 — Epistémica y Análisis de Terreno

Antes de proponer o tocar cualquier archivo:
1. **Inspección de Estado Base:**
   - Ejecutar `git status` para verificar si hay cambios pendientes o ramas sucias.
   - Consultar la arquitectura del monorepo en `AGENTS.md` y `.agents/skills/project-architecture/SKILL.md`.
2. **Exploración con Grafo de Conocimiento (`graphify`):**
   - Si `graphify-out/graph.json` existe, consultar `query_graph` o `graphify query "<componente/flujo>"` para entender cómo se relacionan los modelos, routers y páginas involucradas.
3. **Aplicar Epistémicas Senior (`doubt-driven-development` y `source-driven-development`):**
   - Leer código fuente real, no inventar APIs ni asumir firmas.
   - Identificar operaciones de alto riesgo o irreversibles (modificaciones de esquemas de BD, manejo de pagos, autenticación/tokens JWT, eliminación física de datos). En caso de existir, detenerse y requerir confirmación explícita.

---

## Fase 1 — Define & Clarify (Especificación de Requerimientos)

**Habilidades de soporte:**
- `.agents/skills/spec-driven-development/SKILL.md`
- `.agents/skills/interview-me/SKILL.md`
- `.agents/skills/idea-refine/SKILL.md`

### Protocolo:
1. **Entrevista / Aclaración Activa (`interview-me`):**
   - Si la petición del usuario tiene ambigüedades técnicas, hacer preguntas directas (preferentemente usando `ask_question`), una temática a la vez.
   - Identificar el usuario objetivo: ¿Cliente (`client`), Técnico (`technician`), o Administrador (`admin`)?
2. **Documentar el Criterio de Aceptación:**
   - Formular los criterios en formato verificable (Given-When-Then o Checklist de Aceptación).
3. **Fijar Límites (*Boundaries*):**
   - **Qué SÍ se hará:** Alcance concreto y delimitado.
   - **Qué NO se hará:** Dejar explícitos los no-goals para evitar scope-creep.
   - **Qué requiere consulta previa:** Decisiones de diseño, dependencias nuevas o cambios de modelo.

---

## Fase 2 — Plan & Constraints (Arquitectura y Tareas Atómicas)

**Habilidades de soporte:**
- `.agents/skills/planning-and-task-breakdown/SKILL.md`
- `.agents/skills/constraint-driven-development/SKILL.md`
- `.agents/skills/api-and-interface-design/SKILL.md`

### Protocolo:
1. **Desglose en Tareas Atómicas (`planning-and-task-breakdown`):**
   - Dividir la solución en rebanadas verticales pequeñas e independientes (*vertical slices*).
   - Cada tarea debe poder compilarse, probarse y confirmarse por separado.
2. **Imposición de Restricciones del Stack (`constraint-driven-development`):**
   - **Backend (`backend/`):**
     - Framework: FastAPI + SQLModel + Pydantic v2.
     - Pydantic: Usar siempre `model_config = ConfigDict(...)` (nunca clase `Config`).
     - Base de datos: PostgreSQL 15 + PostGIS. Si se alteran modelos o enums, generar migración Alembic en `backend/migrations/versions/`.
     - Endpoints protegidos con `get_current_user` y validación de roles (`require_role`).
   - **Frontend Web (`frontend/`):**
     - Next.js 15 App Router + Tailwind CSS.
     - Offset de Navbar global: El contenedor principal de cualquier vista pública/cliente debe llevar `pt-24`.
     - Peticiones autenticadas: Usar obligatoriamente `fetchWithAuth` de `@/lib/api.ts`.
     - Branding: Utilizar componentes oficiales de marca y tokens de `DESIGN.md`.
   - **Mobile (`mobile/`):**
     - React Native Expo con `expo-router`.
     - Estilos: Exclusivamente `StyleSheet.create` estándar (no Nativewind).
     - Componentes nativos: `react-native-maps`, `expo-secure-store`, `<Image>`.
3. **Presentar el Plan:**
   - Exponer el plan de implementación detallando archivos a crear/modificar y orden de ejecución.

---

## Fase 3 — Build Incremental & TDD (Construcción Vertical)

**Habilidades de soporte:**
- `.agents/skills/incremental-implementation/SKILL.md`
- `.agents/skills/test-driven-development/SKILL.md`

### Protocolo Ciclo RED-GREEN-REFACTOR:
Por cada tarea atómica:
1. **RED (Escribir o identificar la prueba/verificación que falla):**
   - Backend: Crear o adaptar prueba unitaria en `backend/tests/` o script de verificación enfocado.
   - Frontend/Mobile: Definir la aserción de renderizado/tipado o prueba de contrato.
2. **GREEN (Implementación Mínima):**
   - Escribir únicamente el código necesario para cumplir la prueba o interfaz requerida.
   - Preservar comentarios existentes, docstrings y formato de saltos de línea (cuidado con CRLF en Windows; usar targets limpios de una sola línea al editar).
3. **REFACTOR (Limpieza Inmediata):**
   - Eliminar duplicación, aplicar nombres semánticos en español para UI y en inglés coherente para código backend/frontend.
4. **Pruebas de Regresión Rápidas:**
   - Asegurarse de que el cambio no haya roto pruebas preexistentes.

---

## Fase 4 — Verify & Quality Gates (Puertas de Calidad)

**Habilidades de soporte:**
- `.agents/skills/debugging-and-error-recovery/SKILL.md`
- `.agents/skills/code-simplification/SKILL.md`
- `.agents/skills/security-and-hardening/SKILL.md`
- `.agents/skills/performance-optimization/SKILL.md`

### Protocolo de Validación Técnica:
Ejecutar sin excepciones los comandos de validación según el área tocada:

1. **Backend:**
   ```powershell
   # 1. Compilación de sintaxis Python
   python -m py_compile backend/app/...
   # 2. Linter (si ruff está disponible en el entorno)
   cd backend; ruff check app/
   # 3. Pruebas unitarias
   cd backend; pytest tests/ -v --tb=short
   ```
2. **Frontend Web:**
   ```powershell
   # Verificación estricta de TypeScript
   cd frontend; npx tsc --noEmit
   # Linter de Next.js
   cd frontend; npx next lint
   ```
3. **Mobile App:**
   ```powershell
   # Verificación estricta de TypeScript
   cd mobile; npx tsc --noEmit
   ```
4. **Depuración y Causa Raíz (`debugging-and-error-recovery`):**
   - Si un paso falla, aislar el error sistemáticamente (inspeccionar traza, reproducir en comando aislado, corregir la causa raíz sin aplicar "parches ciegos").
5. **Simplificación y Seguridad (`code-simplification` & `security-and-hardening`):**
   - Verificar que no queden console.logs de depuración, claves o tokens hardcodeados.
   - Validar que los endpoints expongan solo los campos necesarios (esquemas de lectura `*Response` independientes de modelos de BD).

---

## Fase 5 — Review in 5 Axes (Revisión de Código Senior)

**Habilidades de soporte:**
- `.agents/skills/code-review-and-quality/SKILL.md`
- `.agents/agents/code-reviewer.md`
- `.agents/agents/security-auditor.md`
- `.agents/agents/test-engineer.md`

Auditar los cambios bajo los **5 ejes de calidad**:
1. **Correctitud (Correctness):** ¿Cumple al 100% los criterios de aceptación y la especificación de la Fase 1? ¿Están cubiertos los casos límite (valores nulos, listas vacías, desconexión)?
2. **Legibilidad (Readability):** ¿El código se explica por sí mismo? ¿Se siguen las convenciones del repositorio?
3. **Arquitectura (Architecture):** ¿Respeta la separación de capas (Model -> Schema -> Service/CRUD -> API Router -> Frontend API client -> UI Component)?
4. **Seguridad (Security):** ¿Se validan todas las entradas del usuario? ¿Hay riesgo de inyección SQL, XSS o escalamiento de privilegios? ¿Están protegidos los endpoints con JWT y verificación de rol?
5. **Rendimiento (Performance):** ¿Hay consultas N+1 en la base de datos? ¿Existen re-renders innecesarios en React o fugas de memoria en suscripciones WebSocket?

*Clasificación de hallazgos:*
- **[CRÍTICO]** (Bloquea el paso a producción).
- **[REQUERIDO]** (Debe resolverse antes de considerar la tarea terminada).
- **[OPCIONAL]** (Mejora técnica no bloqueante).
- **[NIT]** (Detalle menor de estilo o convención).

---

## Fase 6 — Ship & Rollback Plan (Cierre y Despliegue Seguro)

**Habilidades de soporte:**
- `.agents/skills/shipping-and-launch/SKILL.md`
- `.agents/skills/git-workflow-and-versioning/SKILL.md`
- `.agents/skills/deploy/SKILL.md`

### Protocolo:
1. **Dictamen Formal:** Emitir decisión explícita: **GO** o **NO-GO**.
   - Si hay hallazgos Críticos o Requeridos no resueltos, el veredicto es estrictamente **NO-GO**.
2. **Plan de Reversión (Rollback Plan):**
   - Definir qué señales indicarían un fallo en producción.
   - Describir los pasos exactos de rollback (e.g. `git revert <commit>`, migración de reversión de Alembic o downgrade de contenedor).
3. **Actualización del Grafo de Conocimiento:**
   - Ejecutar `graphify update .` para mantener el grafo sincronizado con los nuevos ASTs y relaciones.
4. **Commits y Entrega:**
   - Realizar commits atómicos y claros siguiendo Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`).
   - Si el usuario solicita deploy, seguir el procedimiento de `.agents/skills/deploy/SKILL.md` (push a `master`, tags de versión para web y `v*-mobile` para EAS).
5. **Informe de Cierre:**
   - Presentar al usuario un resumen ejecutivo con:
     - Componentes y archivos modificados.
     - Resultados de las pruebas y verificaciones ejecutadas.
     - Estado del entorno y pasos para probar la funcionalidad implementada.
