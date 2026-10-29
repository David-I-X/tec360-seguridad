---
trigger: always_on
---

# Trigger "codework"

- Cuando el usuario diga **"utiliza codework"** (o "codework", "ejecútalo con codework", "ejecutalo con codework"), lee y ejecuta completa la skill `.agents/skills/codework/SKILL.md`.
- En este pipeline, **sigue estrictamente el flujo de 6 fases de ingeniería senior de Addy Osmani adaptado a Tec360 Seguridad**:
  1. **Define & Clarify:** Especificación y criterios de aceptación antes de código (`spec-driven-development` / `interview-me`).
  2. **Plan & Constraints:** Descomposición en tareas atómicas (`planning-and-task-breakdown`) y aplicación de restricciones del stack (`constraint-driven-development`).
  3. **Build Incremental & TDD:** Desarrollo rebanada por rebanada RED-GREEN-REFACTOR (`incremental-implementation` y `test-driven-development`).
  4. **Verify & Quality Gates:** Ejecución de pruebas (`pytest`), linting (`ruff`), verificación de tipado estricto (`tsc`) y endurecimiento (`security-and-hardening`, `code-simplification`).
  5. **Review:** Revisión profunda en 5 ejes: Correctitud, Legibilidad, Arquitectura, Seguridad y Rendimiento (`code-review-and-quality`).
  6. **Ship & Rollback:** Dictamen formal GO / NO-GO, plan de reversión claro y entrega trazable (`shipping-and-launch`, `deploy`).
