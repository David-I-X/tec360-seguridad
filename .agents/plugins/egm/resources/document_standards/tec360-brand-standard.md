# Tec360 Seguridad Brand & Accessibility Standard

This document standard defines the immutable quality bar for all Tec360 visual assets, UI screens, FigCraft boards, and frontend code.

## Core Principle

Any user interface, marketing material, or technical diagram must strictly conform to `DESIGN.md` (v3.0 Dark Tactical Glass & Silk Telemetry) and pass WCAG 2.2 AA accessibility requirements. Reviewers evaluate cold without conversational concessions.

---

## Rule 1: Logo Integrity (R1 — Blocker if violated)

* **Mandatory File:** Must use the official squircle asset `brand-workspace/assets-in/logo/tec360-logo-oficial.png` (or `/brand/tec360-logo.png`).
* **Forbidden Patterns:**
  * Re-drawing the orbital radar in free-floating SVG.
  * Isolating the radar mark without its dark rounded container.
  * Adding the legacy subtitle "TELEMETRÍA & SEGURIDAD" over/under the letters.
* **Official Lockup:** Official squircle icon + text "Tec360 Seguridad" side-by-side.

---

## Rule 2: WCAG 2.2 AA Contrast (R2 — Blocker if violated)

* **Contrast Minimums:**
  * Normal text (`< 18pt` or `< 14pt bold`): `>= 4.5:1`.
  * Large text (`>= 18pt` or `>= 14pt bold`) and UI components/borders: `>= 3.0:1`.
* **Standard Backgrounds:**
  * `void-bg` (`#050810`, 19.3:1 AAA with text `#f8fafc`).
  * `obsidian-surface` (`#0b0f19`, 17.8:1 AAA).
  * `slate-elevated` (`#111827`, 15.6:1 AAA).
  * Light mode surface (`#f8fafc` / `#ffffff` with text `#0f172a`).

---

## Rule 3: Three-Voice Typography & Copy Discipline (R3 — Major/Blocker if violated)

* **Headlines (`Archivo` / `--font-display`):**
  * Dual luminance: primary assertion in `#f8fafc` (600), secondary in `#a39eb8` (400), key metric/term bracketed `[ENTRE CORCHETES]` in `#00f0ff`.
  * Zero eyebrows or kickers stacked above headlines.
* **Body (`Geist` / `--font-sans`):**
  * Clean reading voice in `#b4b0c8` or `#f8fafc`.
* **Telemetry (`Geist Mono` / `--font-mono`, `tabular-nums`):**
  * Strictly for live metrics, coordinates, vehicle plates, battery voltages, and speeds. Never use monospace as decorative styling on regular prose.
* **Copy Integrity:**
  * Technicians are exclusively "técnicos certificados". Zero mentions of external educational institutions.

---

## Rule 4: Spatial Grid & Three Service Lines (R4 — Major/Blocker if violated)

* **Service Line Palette:**
  * Installations: `#7c3aed` (violet core) / `#8b5cf6` (electric violet).
  * 24/7 Reaction & Recovery: `#00f0ff` (telemetry cyan) + `#ff2a55` (crimson alert).
  * Quick Mechanics Express: `#f59e0b` (tactical amber) + `#10b981` (armed emerald).
* **Navigation Offset:**
  * Every web page container must include `pt-24` (`96px`) to account for the fixed 64px navbar.
* **Spatial Alignment:**
  * 8pt grid (`8, 16, 24, 32, 48, 64, 96px`).
  * Zero element collisions, unhandled text overflow, or unaligned edges relative to the approved FigCraft board.
