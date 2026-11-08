import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, TEC360_ANATOMY_CSS } from "./tec360-bench.mjs";
import { buildFig01Hero } from "./build-fig01-hero.mjs";
import { buildFig02Instalaciones } from "./build-fig02-instalaciones.mjs";
import { buildFig03Reaccion } from "./build-fig03-reaccion.mjs";
import { buildFig04Mecanica } from "./build-fig04-mecanica.mjs";
import { buildFig05Ecosistema } from "./build-fig05-ecosistema.mjs";
import { kitScript } from "../../../.agents/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const LOGO_PATH = join(ROOT, "brand-workspace", "assets-in", "logo", "tec360-logo-oficial.png");
const logoB64 = `data:image/png;base64,${readFileSync(LOGO_PATH).toString("base64")}`;

const fig01 = buildFig01Hero({ standalone: false });
const fig02 = buildFig02Instalaciones({ standalone: false });
const fig03 = buildFig03Reaccion({ standalone: false });
const fig04 = buildFig04Mecanica({ standalone: false });
const fig05 = buildFig05Ecosistema({ standalone: false });

function logoLockup({ size = "sm", badge = "" } = {}) {
  const boxMap = {
    sm: { px: 32, radius: "7px", font: "17px", gap: "10px" },
    md: { px: 40, radius: "9px", font: "20px", gap: "12px" },
    xl: { px: 64, radius: "15px", font: "34px", gap: "18px" },
  };
  const s = boxMap[size] || boxMap.sm;
  return `
  <div class="t360-lockup" style="display:inline-flex;align-items:center;gap:${s.gap};user-select:none">
    <div style="width:${s.px}px;height:${s.px}px;border-radius:${s.radius};overflow:hidden;border:1px solid rgba(167,139,250,0.28);background:#070A12;flex-shrink:0">
      <img src="${logoB64}" alt="Tec360 Seguridad" width="${s.px}" height="${s.px}" style="width:100%;height:100%;object-fit:contain;display:block" />
    </div>
    <div style="display:flex;flex-direction:column;justify-content:center">
      <div class="font-display" style="display:inline-flex;align-items:baseline;gap:6px;font-size:${s.font};line-height:1;white-space:nowrap">
        <span style="font-weight:700;letter-spacing:-0.025em;color:#F8FAFC">Tec360</span>
        <span style="font-weight:500;letter-spacing:-0.02em;color:#B4B0C8">Seguridad</span>
      </div>
      ${
        badge
          ? `<span class="font-mono" style="margin-top:3px;font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#00F0FF;line-height:1">${badge}</span>`
          : ""
      }
    </div>
  </div>`;
}

function isoStageCard({ figCode, title, hint, readout, accent = "cyan", stageId, svg, footerExtra = "" }) {
  return `
  <div class="iso t360-iso-card" data-accent="${accent}" id="${stageId}">
    <div class="t360-iso-topbar">
      <span class="font-mono t360-iso-fig">${figCode}</span>
      <span class="font-mono t360-iso-title">${title}</span>
    </div>
    <div class="t360-iso-canvas">
      ${svg}
    </div>
    <div class="t360-iso-bottombar">
      <span class="font-mono t360-iso-hint">${hint}</span>
      <span class="font-mono t360-iso-readout" data-readout>${readout}</span>
    </div>
    ${footerExtra}
  </div>`;
}

const html = `<!doctype html>
<html lang="es" class="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Preview Landing v3.2 · Tec360 Seguridad + Figuras Isométricas Anatomy</title>
  <style>
    ${k.ISO_CSS}
    ${TEC360_ANATOMY_CSS}

    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #050810;
      color: #F8FAFC;
      font-family: "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }
    a { color: inherit; text-decoration: none; }
    button { font-family: inherit; }

    .font-display {
      font-family: "Archivo", "Segoe UI", system-ui, sans-serif;
      letter-spacing: -0.032em;
    }
    .font-mono {
      font-family: "Geist Mono", "JetBrains Mono", ui-monospace, SFMono-Regular, Consolas, monospace;
      font-variant-numeric: tabular-nums;
    }

    /* Ambient Silk Aurora */
    .aurora-wrap {
      position: relative;
      isolation: isolate;
      overflow: hidden;
    }
    .aurora-glow {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: -1;
      background:
        radial-gradient(46% 42% at 68% 28%, rgba(124, 58, 237, 0.20) 0%, transparent 72%),
        radial-gradient(36% 36% at 78% 68%, rgba(0, 240, 255, 0.12) 0%, transparent 72%),
        radial-gradient(34% 38% at 18% 78%, rgba(91, 33, 182, 0.16) 0%, transparent 72%);
    }

    .container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 32px;
    }
    @media (max-width: 640px) {
      .container { padding: 0 16px; }
    }

    /* Fixed Global Navbar (64px) */
    .navbar {
      position: sticky;
      top: 0;
      z-index: 50;
      height: 64px;
      background: rgba(5, 8, 16, 0.86);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(139, 92, 246, 0.18);
    }
    .navbar-inner {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 24px;
      font-size: 14px;
      font-weight: 500;
      color: #B4B0C8;
    }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-ghost {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 12px;
      font-size: 13.5px;
      font-weight: 500;
      color: #B4B0C8;
      border: 1px solid transparent;
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 13px 22px;
      border-radius: 12px;
      font-size: 14.5px;
      font-weight: 600;
      background: #7C3AED;
      color: #F8FAFC;
      border: 1px solid rgba(167, 139, 250, 0.36);
      cursor: pointer;
    }
    .btn-primary-sm {
      padding: 8px 15px;
      font-size: 13.5px;
    }
    .btn-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 13px 20px;
      border-radius: 12px;
      font-size: 14.5px;
      font-weight: 500;
      background: rgba(11, 15, 25, 0.9);
      color: #F8FAFC;
      border: 1px solid rgba(255, 255, 255, 0.12);
      cursor: pointer;
    }
    @media (max-width: 960px) {
      .nav-links, .hide-mobile { display: none !important; }
    }

    /* 12-Col Responsive Grid */
    .grid-12 {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: 32px;
      align-items: center;
    }
    .col-5 { grid-column: span 5 / span 5; }
    .col-7 { grid-column: span 7 / span 7; }
    .col-4 { grid-column: span 4 / span 4; }
    @media (max-width: 1024px) {
      .grid-12 {
        grid-template-columns: minmax(0, 1fr);
        gap: 24px;
      }
      .col-5, .col-7, .col-4 {
        grid-column: span 1 / span 1;
      }
      .mobile-order-1 { order: 1; }
      .mobile-order-2 { order: 2; }
    }

    /* Typography Hierarchy (Zero Eyebrows above H1/H2!) */
    .h1-hero {
      margin: 0;
      font-size: clamp(2.05rem, 3.35vw, 3.2rem);
      font-weight: 600;
      line-height: 1.06;
      color: #F8FAFC;
    }
    .h2-section {
      margin: 0;
      font-size: clamp(1.75rem, 2.7vw, 2.75rem);
      font-weight: 600;
      line-height: 1.08;
      color: #F8FAFC;
    }
    .h3-band {
      margin: 0;
      font-size: clamp(1.45rem, 2.1vw, 2.05rem);
      font-weight: 600;
      line-height: 1.12;
      color: #F8FAFC;
    }
    .dim-voice {
      color: #A39EB8;
      font-weight: 400;
    }
    .bracket-voice {
      color: #00F0FF;
      font-weight: 600;
      white-space: nowrap;
    }
    .lead-copy {
      margin: 0;
      font-size: 16px;
      line-height: 1.62;
      color: #B4B0C8;
    }

    /* Vehicle Selector Pills */
    .veh-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .veh-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 13px;
      border-radius: 11px;
      font-size: 12.5px;
      font-weight: 500;
      background: rgba(11, 15, 25, 0.72);
      border: 1px solid rgba(255, 255, 255, 0.09);
      color: #B4B0C8;
      cursor: pointer;
    }
    .veh-pill.active {
      background: rgba(124, 58, 237, 0.16);
      border-color: rgba(0, 240, 255, 0.48);
      color: #F8FAFC;
    }

    /* Isometric Anatomy Stage Card */
    .t360-iso-card {
      position: relative;
      border-radius: 22px;
      background: #0B0F19;
      border: 1px solid rgba(139, 92, 246, 0.26);
      box-shadow: 0 26px 64px rgba(2, 4, 10, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.06);
      overflow: hidden;
      padding: 18px 20px 16px;
    }
    .t360-iso-card[data-accent="cyan"] {
      border-color: rgba(0, 240, 255, 0.25);
    }
    .t360-iso-card[data-accent="amber"] {
      border-color: rgba(245, 158, 11, 0.26);
    }
    .t360-iso-topbar, .t360-iso-bottombar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }
    .t360-iso-fig {
      font-size: 11px;
      font-weight: 700;
      color: #00F0FF;
      letter-spacing: 0.06em;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(17, 24, 39, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .t360-iso-card[data-accent="violet"] .t360-iso-fig { color: #A78BFA; }
    .t360-iso-card[data-accent="amber"] .t360-iso-fig { color: #FBBF24; }
    .t360-iso-title {
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      color: #B4B0C8;
    }
    .t360-iso-canvas {
      margin: 4px auto;
      cursor: pointer;
    }
    .t360-iso-hint {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #7A8AA8;
    }
    .t360-iso-readout {
      font-size: 11px;
      font-weight: 600;
      color: #F8FAFC;
      letter-spacing: 0.04em;
    }

    /* Hero Module Selector Dock + Cut Trigger */
    .hero-dock {
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .mod-pills {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }
    @media (max-width: 640px) {
      .mod-pills { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    .mod-pill {
      text-align: left;
      padding: 8px 10px;
      border-radius: 10px;
      background: #111827;
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #B4B0C8;
      cursor: pointer;
    }
    .mod-pill.active {
      border-color: rgba(0, 240, 255, 0.55);
      background: rgba(0, 240, 255, 0.08);
      color: #F8FAFC;
    }
    .mod-pill-code {
      display: block;
      font-size: 9.5px;
      font-weight: 700;
      color: #00F0FF;
      margin-bottom: 2px;
    }
    .mod-pill-name {
      display: block;
      font-size: 11.5px;
      font-weight: 600;
      color: #F8FAFC;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .hero-cut-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding: 11px 14px;
      border-radius: 12px;
      background: rgba(5, 8, 16, 0.78);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .cut-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 15px;
      border-radius: 10px;
      font-size: 12.5px;
      font-weight: 600;
      background: rgba(0, 240, 255, 0.12);
      border: 1px solid rgba(0, 240, 255, 0.42);
      color: #00F0FF;
      cursor: pointer;
    }
    .cut-btn.engaged {
      background: rgba(255, 42, 85, 0.14);
      border-color: rgba(255, 42, 85, 0.52);
      color: #FF2A55;
    }

    /* Section Spacing */
    .sec-hero { padding: 44px 0 72px; }
    .sec-band {
      padding: 84px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    /* Service Highlights 2x2 */
    .highlights-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    @media (max-width: 560px) {
      .highlights-grid { grid-template-columns: minmax(0, 1fr); }
    }
    .hl-card {
      padding: 13px 14px;
      border-radius: 14px;
      background: rgba(11, 15, 25, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .hl-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .hl-title {
      font-size: 13.5px;
      font-weight: 600;
      color: #F8FAFC;
    }
    .hl-metric {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 999px;
      background: #111827;
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #00F0FF;
      white-space: nowrap;
    }
    .hl-detail {
      font-size: 12px;
      color: #B4B0C8;
      line-height: 1.45;
    }

    /* Ecosystem Nodes */
    .eco-node {
      padding: 16px 18px;
      border-radius: 16px;
      background: rgba(11, 15, 25, 0.92);
      border: 1px solid rgba(139, 92, 246, 0.22);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .eco-node.active {
      border-color: rgba(0, 240, 255, 0.58);
      box-shadow: 0 0 24px rgba(0, 240, 255, 0.08);
    }

    /* Trust Metrics & Voices */
    .metrics-4 {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
    }
    .voices-3 {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 20px;
      margin-top: 28px;
    }
    @media (max-width: 960px) {
      .metrics-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .voices-3 { grid-template-columns: minmax(0, 1fr); }
    }
    .stat-card, .voice-card {
      padding: 22px;
      border-radius: 18px;
      background: #0B0F19;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .stat-val {
      font-size: 30px;
      font-weight: 700;
      color: #F8FAFC;
      line-height: 1.05;
    }
    .stat-lbl {
      margin-top: 6px;
      font-size: 13px;
      color: #B4B0C8;
    }

    /* Footer */
    .footer-nav {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.10);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      font-size: 13.5px;
      color: #B4B0C8;
    }
  </style>
</head>
<body>
  <!-- Fixed Global Navbar (Preserved 1:1) -->
  <header class="navbar">
    <div class="container navbar-inner">
      ${logoLockup({ size: "sm" })}
      <nav class="nav-links" aria-label="Secciones de la landing">
        <a href="#anatomia">Anatomía 360°</a>
        <a href="#servicios">Servicios</a>
        <a href="#ecosistema">Ecosistema</a>
        <a href="#respaldo">Respaldo</a>
        <a href="#contacto">Central 24/7</a>
        <a href="#app" style="color:#00F0FF">App Móvil ↗</a>
      </nav>
      <div class="nav-actions">
        <a href="#login" class="btn-ghost hide-mobile">Ingresar</a>
        <a href="#agendar" class="btn-primary btn-primary-sm">
          <span>Agendar</span>
          <span style="color:#00F0FF">↗</span>
        </a>
      </div>
    </div>
  </header>

  <main>
    <!-- SECTION 1: HERO (#anatomia) — Exact 5 / 7 Distribution -->
    <section id="anatomia" class="sec-hero aurora-wrap">
      <div class="aurora-glow" aria-hidden="true"></div>
      <div class="container">
        <div class="grid-12">
          <!-- Left 5 Columns: Copy + CTAs + Vehicle Selector -->
          <div class="col-5" style="display:flex;flex-direction:column;gap:22px">
            <h1 class="font-display h1-hero">
              Seguridad vehicular integral: detén tu motor a
              <span class="font-mono bracket-voice">[0 KM/H]</span>,
              <span class="dim-voice">rastrea en tiempo real y recibe mecánica donde estés.</span>
            </h1>

            <p class="lead-copy">
              Integramos bloqueo digital CAN-Bus sobre arnés OEM sin cortar cables, monitoreo con equipo de reacción 24/7 y asistencia mecánica express a domicilio con técnicos certificados.
            </p>

            <div style="display:flex;flex-wrap:wrap;gap:12px">
              <a href="#agendar" class="btn-primary">
                <span>Agendar Instalación</span>
                <span style="color:#00F0FF">→</span>
              </a>
              <a href="#servicios" class="btn-secondary">
                <span>Mecánica Express</span>
                <span style="color:#F59E0B">⚡</span>
              </a>
            </div>

            <div class="veh-bar" role="tablist" aria-label="Tipo de vehículo">
              <button type="button" class="veh-pill active" data-veh="suv">SUV / Sedán · <span class="font-mono" style="color:#00F0FF">OBD-CAN</span></button>
              <button type="button" class="veh-pill" data-veh="moto">Motocicleta · <span class="font-mono">IP67</span></button>
              <button type="button" class="veh-pill" data-veh="carga">Carga / Flota · <span class="font-mono">24V</span></button>
            </div>
          </div>

          <!-- Right 7 Columns: Fig. 01 Isometric Anatomy Bench + 4 Module Pins + Speed-Cut Trigger -->
          <div class="col-7">
            ${isoStageCard({
              figCode: "FIG. 01 · ANATOMÍA 360°",
              title: "Banco CAN-Bus, Óptica HD & Antena L1/L5",
              hint: "Clic en módulos o prueba corte de motor",
              readout: "TELEMETRÍA ACTIVA · 54 KM/H",
              accent: "cyan",
              stageId: "stage-fig01",
              svg: fig01.svg,
              footerExtra: `
              <div class="hero-dock">
                <div class="mod-pills">
                  <button type="button" class="mod-pill active" data-mod-btn="MOD-01">
                    <span class="font-mono mod-pill-code">MOD-01 · 1.1s</span>
                    <span class="mod-pill-name">Corte CAN-Bus</span>
                  </button>
                  <button type="button" class="mod-pill" data-mod-btn="MOD-02">
                    <span class="font-mono mod-pill-code">MOD-02 · 1080p</span>
                    <span class="mod-pill-name">Dashcam Cloud</span>
                  </button>
                  <button type="button" class="mod-pill" data-mod-btn="MOD-03">
                    <span class="font-mono mod-pill-code">MOD-03 · 0 Cortes</span>
                    <span class="mod-pill-name">Arnés OEM</span>
                  </button>
                  <button type="button" class="mod-pill" data-mod-btn="MOD-04">
                    <span class="font-mono mod-pill-code">MOD-04 · 10s</span>
                    <span class="mod-pill-name">GPS 4G L1/L5</span>
                  </button>
                </div>
                <div class="hero-cut-bar">
                  <div>
                    <div style="font-size:12.5px;font-weight:600;color:#F8FAFC" id="mod-detail-title">MOD-01 · Puente Solenoide Progresivo CAN-Bus</div>
                    <div style="font-size:11.5px;color:#B4B0C8" id="mod-detail-desc">Desacelera e inmoviliza el riel de ignición cuando el velocímetro llega a 0 km/h seguros.</div>
                  </div>
                  <button type="button" class="cut-btn font-mono" id="btn-test-cut">
                    <span>Probar Corte de Motor</span>
                    <span id="hero-speed-chip">[54 KM/H]</span>
                  </button>
                </div>
              </div>`,
            })}
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 2: THREE SERVICE LINES (#servicios) — Exact Alternating 7/5 Distribution -->
    <section id="servicios" class="sec-band">
      <div class="container" style="display:flex;flex-direction:column;gap:68px">
        <div style="max-width:820px;display:flex;flex-direction:column;gap:14px">
          <h2 class="font-display h2-section">
            Tres líneas de servicio diseñadas para blindar, recuperar
            <span class="dim-voice">y mantener tu vehículo operativo con</span>
            <span class="font-mono bracket-voice">[MECÁNICA EXPRESS]</span><span class="dim-voice">.</span>
          </h2>
          <p class="lead-copy">
            Cada instrumento isométrico muestra el mecanismo físico real detrás de tu servicio: acoplamiento limpio sin empalmes, cerco satelital anti-jammer y diagnóstico calibrado en ruta.
          </p>
        </div>

        <!-- BAND 01: Instalaciones Vehiculares (Left 7 Stage / Right 5 Specs) -->
        <div class="grid-12">
          <div class="col-7">
            ${isoStageCard({
              figCode: "FIG. 02 · LÍNEA 01 · INSTALACIONES",
              title: "Banco de Acoplamiento OEM Plug & Play",
              hint: "Cero cortes de cable original · Garantía intacta",
              readout: "ACOPLADO OEM · 0 CORTES · 100% GARANTÍA",
              accent: "violet",
              stageId: "stage-fig02",
              svg: fig02.svg,
            })}
          </div>
          <div class="col-5" style="display:flex;flex-direction:column;gap:20px">
            <h3 class="font-display h3-band">
              Instalaciones Vehiculares
              <span class="dim-voice">con acople en T sobre arnés original</span>
              <span class="font-mono" style="color:#A78BFA">[0 CORTES]</span>
            </h3>
            <p class="lead-copy" style="font-size:15px">
              Integramos dispositivos de rastreo 4G, cámaras duales y bloqueo electrónico sobre conectores compatibles para conservar la integridad eléctrica de fábrica.
            </p>
            <div class="highlights-grid">
              <div class="hl-card">
                <div class="hl-top"><span class="hl-title">GPS 4G L1/L5</span><span class="font-mono hl-metric" style="color:#A78BFA">±1.5 m</span></div>
                <span class="hl-detail">Rastreo doble banda con batería de respaldo oculta.</span>
              </div>
              <div class="hl-card">
                <div class="hl-top"><span class="hl-title">Dashcam Cloud HD</span><span class="font-mono hl-metric" style="color:#A78BFA">1080p</span></div>
                <span class="hl-detail">Doble lente cabina + vía con respaldo automático 4G.</span>
              </div>
              <div class="hl-card">
                <div class="hl-top"><span class="hl-title">Alarmas Inteligentes</span><span class="font-mono hl-metric" style="color:#A78BFA">CAN-OEM</span></div>
                <span class="hl-detail">Sensores de impacto, inclinación y apertura sin falsas alertas.</span>
              </div>
              <div class="hl-card">
                <div class="hl-top"><span class="hl-title">Garantía Eléctrica</span><span class="font-mono hl-metric" style="color:#10B981">100%</span></div>
                <span class="hl-detail">Acoplamiento limpio por técnicos certificados a domicilio.</span>
              </div>
            </div>
            <div>
              <a href="#agendar-instalacion" class="btn-primary">
                <span>Cotizar Instalación</span>
                <span style="color:#00F0FF">→</span>
              </a>
            </div>
          </div>
        </div>

        <!-- BAND 02: Equipo de Reacción 24/7 (Left 5 Specs / Right 7 Stage) -->
        <div class="grid-12">
          <div class="col-5 mobile-order-2" style="display:flex;flex-direction:column;gap:20px">
            <h3 class="font-display h3-band">
              Equipo de Reacción &amp; Recuperación
              <span class="dim-voice">con cerco satelital cada</span>
              <span class="font-mono bracket-voice">[10 SEGUNDOS]</span>
            </h3>
            <p class="lead-copy" style="font-size:15px">
              Ante intento de hurto o inhibición RF, nuestro filtro de cavidad detecta anomalías, ejecuta bloqueo remoto en 1.1s y despliega patrulla en tierra junto a la Policía Nacional.
            </p>
            <div class="highlights-grid">
              <div class="hl-card">
                <div class="hl-top"><span class="hl-title">Corte Remoto</span><span class="font-mono hl-metric">1.1 s</span></div>
                <span class="hl-detail">Inmovilización progresiva autorizada desde central 24/7.</span>
              </div>
              <div class="hl-card">
                <div class="hl-top"><span class="hl-title">Filtro Anti-Jammer</span><span class="font-mono hl-metric" style="color:#FF2A55">ALERTA RF</span></div>
                <span class="hl-detail">Detección inmediata de inhibidores de señal celular/GPS.</span>
              </div>
              <div class="hl-card">
                <div class="hl-top"><span class="hl-title">Cerco Satelital</span><span class="font-mono hl-metric">10 s</span></div>
                <span class="hl-detail">Triangulación continua de rumbo, velocidad y geocerca.</span>
              </div>
              <div class="hl-card">
                <div class="hl-top"><span class="hl-title">Enlace Policial</span><span class="font-mono hl-metric">24/7</span></div>
                <span class="hl-detail">Coordinación táctica en campo y entrega verificada.</span>
              </div>
            </div>
            <div>
              <a href="#activar-reaccion" class="btn-secondary" style="border-color:rgba(0,240,255,0.38)">
                <span>Activar Cobertura 24/7</span>
                <span style="color:#00F0FF">→</span>
              </a>
            </div>
          </div>
          <div class="col-7 mobile-order-1">
            ${isoStageCard({
              figCode: "FIG. 03 · LÍNEA 02 · REACCIÓN 24/7",
              title: "Consola de Cerco Orbital & Bloqueo 1.1s",
              hint: "Barrido azimutal 360° · Triple cavidad anti-jammer",
              readout: "CERCO 10S · AZIMUT 042° · CORTE 1.1S",
              accent: "cyan",
              stageId: "stage-fig03",
              svg: fig03.svg,
            })}
          </div>
        </div>

        <!-- BAND 03: Mecánica Básica a Domicilio (Left 7 Stage / Right 5 Specs) -->
        <div class="grid-12">
          <div class="col-7">
            ${isoStageCard({
              figCode: "FIG. 04 · LÍNEA 03 · MECÁNICA EXPRESS",
              title: "Estación Móvil 13.8V, Frenos & Torque Digital",
              hint: "Diagnóstico de carga, espesor de pastillas y par",
              readout: "CARGA ÓPTIMA · 13.8 V · TORQUE 108 N·M",
              accent: "amber",
              stageId: "stage-fig04",
              svg: fig04.svg,
            })}
          </div>
          <div class="col-5" style="display:flex;flex-direction:column;gap:20px">
            <h3 class="font-display h3-band">
              Mecánica Básica a Domicilio
              <span class="dim-voice">con llegada express en</span>
              <span class="font-mono" style="color:#FBBF24">[&lt; 30 MIN]</span>
            </h3>
            <p class="lead-copy" style="font-size:15px">
              Enviamos una unidad móvil equipada con analizador de carga CCA, cabezal dinamométrico calibrado y repuestos verificados directamente a tu casa, oficina o vía.
            </p>
            <div class="highlights-grid">
              <div class="hl-card">
                <div class="hl-top"><span class="hl-title">Batería y Carga</span><span class="font-mono hl-metric" style="color:#FBBF24">13.8 V</span></div>
                <span class="hl-detail">Inicio de corriente seguro, prueba de alternador y reemplazo.</span>
              </div>
              <div class="hl-card">
                <div class="hl-top"><span class="hl-title">Llantas y Torque</span><span class="font-mono hl-metric" style="color:#FBBF24">108 N·m</span></div>
                <span class="hl-detail">Despinche, montaje de repuesto y apriete calibrado.</span>
              </div>
              <div class="hl-card">
                <div class="hl-top"><span class="hl-title">Aceite y Filtros</span><span class="font-mono hl-metric" style="color:#10B981">OEM</span></div>
                <span class="hl-detail">Mantenimiento limpio sin filas en taller ni traslados.</span>
              </div>
              <div class="hl-card">
                <div class="hl-top"><span class="hl-title">Frenos, Kit y Luces</span><span class="font-mono hl-metric" style="color:#FBBF24">10/6/3 mm</span></div>
                <span class="hl-detail">Inspección por galga escalonada de pastillas y bombillería.</span>
              </div>
            </div>
            <div>
              <a href="#pedir-mecanica" class="btn-primary" style="background:#D97706;border-color:rgba(251,191,36,0.4)">
                <span>Solicitar Mecánica Express</span>
                <span style="color:#FDE68A">→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 3: ECOSYSTEM CIRCUIT (#ecosistema) — Exact 4 / 4 / 4 Distribution -->
    <section id="ecosistema" class="sec-band aurora-wrap">
      <div class="aurora-glow" aria-hidden="true"></div>
      <div class="container" style="display:flex;flex-direction:column;gap:48px">
        <div style="max-width:780px;display:flex;flex-direction:column;gap:12px">
          <h2 class="font-display h2-section">
            Un solo ecosistema conectado desde el sensor en tu vehículo
            <span class="dim-voice">hasta la patrulla o el mecánico en</span>
            <span class="font-mono bracket-voice">[TIEMPO REAL]</span><span class="dim-voice">.</span>
          </h2>
          <p class="lead-copy">
            Tres canales de entrada alimentan el conmutador central Tec360 para accionar respuesta automática o despacho certificado en segundos.
          </p>
        </div>

        <div class="grid-12">
          <!-- Left 4 Cols: 3 Telemetry Inputs -->
          <div class="col-4" style="display:flex;flex-direction:column;gap:14px">
            <div class="eco-node active">
              <div class="hl-top">
                <span class="hl-title">01 · Telemetría GPS 4G L1/L5</span>
                <span class="font-mono hl-metric">10s</span>
              </div>
              <span class="hl-detail">Posición exacta, ignición, voltaje de batería y geocercas activas.</span>
            </div>
            <div class="eco-node">
              <div class="hl-top">
                <span class="hl-title">02 · Evidencia Cloud HD</span>
                <span class="font-mono hl-metric">1080p</span>
              </div>
              <span class="hl-detail">Clips encriptados ante eventos de G-sensor, botón SOS o desvío.</span>
            </div>
            <div class="eco-node">
              <div class="hl-top">
                <span class="hl-title">03 · Diagnóstico Preventivo</span>
                <span class="font-mono hl-metric">13.8V</span>
              </div>
              <span class="hl-detail">Lectura temprana de caída de voltaje y recordatorios de mantenimiento.</span>
            </div>
          </div>

          <!-- Center 4 Cols: Fig. 05 Crossbar Commutator + Official Horizontal Brand Lockup -->
          <div class="col-4" style="display:flex;flex-direction:column;align-items:center;gap:14px">
            ${isoStageCard({
              figCode: "FIG. 05 · NÚCLEO 3×3",
              title: "Conmutador Orbital",
              hint: "3 Entradas → 3 Salidas",
              readout: "BUS 4G L1/L5",
              accent: "cyan",
              stageId: "stage-fig05",
              svg: fig05.svg,
            })}
            ${logoLockup({ size: "sm", badge: "CONMUTACIÓN ORBITAL 24/7" })}
          </div>

          <!-- Right 4 Cols: 3 Field Outputs -->
          <div class="col-4" style="display:flex;flex-direction:column;gap:14px">
            <div class="eco-node active">
              <div class="hl-top">
                <span class="hl-title">Inmovilización Progresiva</span>
                <span class="font-mono hl-metric">0 KM/H</span>
              </div>
              <span class="hl-detail">Corte electrónico CAN-Bus sin riesgo mecánico ni pérdida de dirección.</span>
            </div>
            <div class="eco-node">
              <div class="hl-top">
                <span class="hl-title">Despacho Equipo de Reacción</span>
                <span class="font-mono hl-metric">24/7</span>
              </div>
              <span class="hl-detail">Coordinación inmediata en terreno con enlace a Policía Nacional.</span>
            </div>
            <div class="eco-node">
              <div class="hl-top">
                <span class="hl-title">Unidad Móvil de Mecánica</span>
                <span class="font-mono hl-metric">&lt; 30m</span>
              </div>
              <span class="hl-detail">Asignación por cercanía GPS de técnicos certificados con cotización clara.</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 4: CERTIFIED TRUST & VOICES (#respaldo) — Exact Preserved Distribution -->
    <section id="respaldo" class="sec-band">
      <div class="container" style="display:flex;flex-direction:column;gap:36px">
        <div style="max-width:760px;display:flex;flex-direction:column;gap:12px">
          <h2 class="font-display h2-section">
            Respaldo comprobado en carretera y ciudad
            <span class="dim-voice">con cobertura nacional y</span>
            <span class="font-mono bracket-voice">[98.7% EFECTIVIDAD]</span><span class="dim-voice">.</span>
          </h2>
        </div>

        <div class="metrics-4">
          <div class="stat-card">
            <div class="font-mono stat-val" style="color:#00F0FF">1.1 s</div>
            <div class="stat-lbl">Latencia media de pulso de corte CAN-Bus</div>
          </div>
          <div class="stat-card">
            <div class="font-mono stat-val" style="color:#A78BFA">0 Cortes</div>
            <div class="stat-lbl">Instalación limpia sobre conectores OEM</div>
          </div>
          <div class="stat-card">
            <div class="font-mono stat-val" style="color:#10B981">98.7%</div>
            <div class="stat-lbl">Tasa de recuperación con cerco satelital</div>
          </div>
          <div class="stat-card">
            <div class="font-mono stat-val" style="color:#FBBF24">&lt; 30 min</div>
            <div class="stat-lbl">Tiempo medio en asistencia mecánica urbana</div>
          </div>
        </div>

        <div class="voices-3">
          <div class="voice-card">
            <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#E2E8F0">
              “Instalaron el GPS 4G y el corte CAN-Bus en mi camioneta sin pelar un solo cable. Ver el diagrama exacto del acople OEM da total tranquilidad con la garantía.”
            </p>
            <div style="font-size:13px;font-weight:600;color:#F8FAFC">Andrés Mejía · Medellín</div>
            <div class="font-mono" style="font-size:11px;color:#A78BFA;margin-top:2px">Toyota Fortuner · Línea Instalaciones</div>
          </div>
          <div class="voice-card">
            <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#E2E8F0">
              “La alerta anti-jammer saltó al instante en ruta nocturna. La central bloqueó el vehículo en parada segura y el equipo de reacción llegó con patrulla.”
            </p>
            <div style="font-size:13px;font-weight:600;color:#F8FAFC">Logística Andina S.A.S. · Bogotá</div>
            <div class="font-mono" style="font-size:11px;color:#00F0FF;margin-top:2px">Flota NPR · Reacción 24/7</div>
          </div>
          <div class="voice-card">
            <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#E2E8F0">
              “Me quedé sin batería en el parqueadero de la oficina. En 24 minutos llegó el técnico certificado, midió el alternador a 13.8V y dejé todo resuelto.”
            </p>
            <div style="font-size:13px;font-weight:600;color:#F8FAFC">Camila Restrepo · Cali</div>
            <div class="font-mono" style="font-size:11px;color:#FBBF24;margin-top:2px">Mazda CX-30 · Mecánica Express</div>
          </div>
        </div>
      </div>
    </section>
  </main>

  <!-- SECTION 5: MONUMENTAL CLOSING FOOTER (#contacto) — Exact Preserved Distribution -->
  <footer id="contacto" class="sec-band aurora-wrap" style="padding-bottom:44px">
    <div class="aurora-glow" aria-hidden="true"></div>
    <div class="container" style="display:flex;flex-direction:column;gap:40px">
      <div class="grid-12" style="align-items:end">
        <div class="col-7" style="display:flex;flex-direction:column;gap:20px">
          <h2 class="font-display h2-section">
            ¿Listo para blindar tu vehículo,
            <span class="dim-voice">pedir mecánica a domicilio o activar nuestra central</span>
            <span class="font-mono bracket-voice">[24/7]</span><span class="dim-voice">?</span>
          </h2>
          <div style="display:flex;flex-wrap:wrap;gap:12px">
            <a href="#agendar" class="btn-primary">
              <span>Agendar Servicio</span>
              <span style="color:#00F0FF">→</span>
            </a>
            <a href="#app" class="btn-secondary">
              <span>Descargar App Android</span>
              <span style="color:#00F0FF">↗</span>
            </a>
          </div>
        </div>

        <div class="col-5" style="display:flex;flex-direction:column;gap:14px;align-items:flex-end;text-align:right">
          <div>
            <div style="font-size:12px;color:#B4B0C8;margin-bottom:4px">Central Operativa &amp; WhatsApp 24/7:</div>
            <div class="font-mono" style="font-size:22px;font-weight:600;color:#F8FAFC">+57 305 215 6601 <span style="color:#00F0FF">↗</span></div>
          </div>
          <div>
            <div style="font-size:12px;color:#B4B0C8;margin-bottom:4px">Soporte técnico y corporativo:</div>
            <div style="font-size:16px;font-weight:500;color:#F8FAFC">tracktec.soporte@gmail.com <span style="color:#00F0FF">↗</span></div>
          </div>
        </div>
      </div>

      <div class="footer-nav">
        <div style="display:flex;flex-wrap:wrap;gap:22px">
          <span>Instalaciones</span>
          <span>Equipo de Reacción 24/7</span>
          <span>Mecánica Básica</span>
          <span>Mis Servicios</span>
          <span>Descargar App</span>
          <span>Iniciar Sesión</span>
        </div>
        <span style="font-size:12px">Medellín · Bogotá · Cali · Cobertura Nacional</span>
      </div>

      <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:20px">
        ${logoLockup({ size: "xl" })}
        <div style="text-align:right">
          <div class="font-mono" style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#00F0FF">Seguridad Vehicular Integral 360°</div>
          <div style="font-size:12.5px;color:#B4B0C8;margin-top:4px">Blindaje electrónico · Reacción 24/7 · Mecánica express en Colombia</div>
        </div>
      </div>

      <div style="padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;font-size:12px;color:#B4B0C8">
        <span>© 2026 Tec360 Seguridad. Instalaciones, Reacción 24/7 &amp; Mecánica Básica.</span>
        <div style="display:flex;gap:20px">
          <span>Términos y Condiciones</span>
          <span>Política de Privacidad</span>
        </div>
      </div>
    </div>
  </footer>

  <script type="module">
    ${kitScript().replace(/<\/script/gi, "<\\/script")}
    const P1 = ${JSON.stringify(fig01.P)};
    const P2 = ${JSON.stringify(fig02.P)};
    const P3 = ${JSON.stringify(fig03.P)};
    const P4 = ${JSON.stringify(fig04.P)};

    // Interactive Hero Cut Test & Module Selector
    const stage1 = document.getElementById("stage-fig01");
    const movers1 = [...stage1.querySelectorAll("[data-cut-mover]")];
    const needle1 = stage1.querySelector("[data-speed-needle] path");
    const readout1 = stage1.querySelector("[data-readout]");
    const cutBtn = document.getElementById("btn-test-cut");
    const speedChip = document.getElementById("hero-speed-chip");
    const modTitle = document.getElementById("mod-detail-title");
    const modDesc = document.getElementById("mod-detail-desc");

    const MOD_COPY = {
      "MOD-01": [
        "MOD-01 · Puente Solenoide Progresivo CAN-Bus",
        "Desacelera e inmoviliza el riel de ignición cuando el velocímetro llega a 0 km/h seguros."
      ],
      "MOD-02": [
        "MOD-02 · Torreta Óptica Dual Cloud HD (1080p)",
        "Cámara frontal y de cabina con transmisión 4G automática ante evento G-sensor o SOS."
      ],
      "MOD-03": [
        "MOD-03 · Acoplador en T sobre Arnés OEM",
        "Conexión en línea Plug & Play sin cortar cables originales para conservar la garantía."
      ],
      "MOD-04": [
        "MOD-04 · Antena Cerámica Doble Banda L1/L5",
        "Posicionamiento submétrico cada 10s con radomo blindado y detección de inhibidores RF."
      ]
    };

    document.querySelectorAll("[data-mod-btn]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-mod-btn]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const code = btn.getAttribute("data-mod-btn");
        if (MOD_COPY[code]) {
          modTitle.textContent = MOD_COPY[code][0];
          modDesc.textContent = MOD_COPY[code][1];
        }
      });
    });

    let cutTarget = 0, cutPos = 0;
    function toggleCut() {
      cutTarget = cutTarget > 0.5 ? 0 : 1;
      cutBtn.classList.toggle("engaged", cutTarget > 0.5);
    }
    cutBtn.addEventListener("click", toggleCut);
    stage1.querySelector(".t360-iso-canvas").addEventListener("click", toggleCut);

    const still = matchMedia("(prefers-reduced-motion: reduce)");
    let last = 0, clock = 0;
    function frame(now) {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      clock += dt;

      // Fig 01 easing
      cutPos += (cutTarget - cutPos) * (still.matches ? 1 : 1 - Math.exp(-dt / 0.28));
      const tr1 = translateAlong(P1, [0, 0, -4.2 * cutPos]);
      for (const m of movers1) m.setAttribute("transform", tr1);
      if (needle1) {
        const ang = 0.74 * (1 - cutPos) + (-0.78) * cutPos;
        const tail = [86 - Math.sin(ang) * 2.4, 18 + Math.cos(ang) * 2.4];
        const tip = [86 + Math.sin(ang) * 15.4, 18 - Math.cos(ang) * 15.4];
        needle1.setAttribute("d", lineOnTop(tail, tip, 19.95, P1));
      }
      const kmh = String(Math.round(54 * (1 - cutPos))).padStart(2, "0");
      speedChip.textContent = "[" + kmh + " KM/H]";
      readout1.textContent = cutPos > 0.9 ? "BLOQUEO SEGURO · 00 KM/H" : "TELEMETRÍA ACTIVA · " + kmh + " KM/H";

      // Fig 03 orbital pointer
      if (!still.matches) {
        const ptr3 = document.querySelector("#stage-fig03 [data-orb-pointer] path");
        if (ptr3) {
          const a3 = (clock * 0.9) % (Math.PI * 2);
          ptr3.setAttribute("d", lineOnTop([-Math.cos(a3) * 3, -4 - Math.sin(a3) * 3], [Math.cos(a3) * 7.2, -4 + Math.sin(a3) * 7.2], 34.15, P3));
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  </script>
</body>
</html>`;

const outPath = join(HERE, "landing-anatomy-preview.html");
writeFileSync(outPath, html);
console.log("wrote", outPath);
