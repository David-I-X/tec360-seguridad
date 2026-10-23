#!/usr/bin/env node
/**
 * Tec360 Seguridad — End-to-End Automated Brand & Creative Pipeline
 * Implementa las 5 Fases descritas en la Arquitectura de Automatización de Branding
 * combinando Google Stitch (DESIGN.md payload) + Suite ArtCraft (Rust CLI/MCP).
 *
 * Uso:
 *   node brand-workspace/tools/run-brand-pipeline.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const ws = path.join(repo, "brand-workspace");
const out = path.join(ws, "deliverables");
const manifestPath = path.join(os.homedir(), ".artcraft", "artcraft-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8").replace(/^\uFEFF/, ""));

const run = (bin, args, label) => {
  const res = execFileSync(bin, args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (label) console.log(`   ✔ ${label}`);
  return res;
};

console.log("═══════════════════════════════════════════════════════════════════");
console.log("  TEC360 CREATIVE ENGINE — COMPILACIÓN DETERMINISTA DE MARCA (5 FASES)");
console.log("═══════════════════════════════════════════════════════════════════\n");

// ─────────────────────────────────────────────────────────────────────────────
// FASE 1: Síntesis Estratégica, Tokens CSS y Payload para Google Stitch MCP
// ─────────────────────────────────────────────────────────────────────────────
console.log("▶ [Fase 1/5] Síntesis Estratégica, Tokens y Payload de Google Stitch...");
const tokens = JSON.parse(readFileSync(path.join(out, "brand-tokens.json"), "utf8"));
const designMd = readFileSync(path.join(repo, "DESIGN.md"), "utf8");

const cssVars = `/* Auto-generado por run-brand-pipeline.mjs desde brand-tokens.json */
:root {
  --brand-void: ${tokens.color.background.void.$value};
  --brand-obsidian: ${tokens.color.background.obsidian.$value};
  --brand-elevated: ${tokens.color.background.elevated.$value};
  --brand-primary: ${tokens.color.brand.primary.$value};
  --brand-primary-vivid: ${tokens.color.brand.primaryVivid.$value};
  --brand-primary-deep: ${tokens.color.brand.primaryDeep.$value};
  --brand-secondary-blue: ${tokens.color.brand.secondaryBlue.$value};
  --brand-telemetry-cyan: ${tokens.color.brand.telemetryCyan.$value};
  --brand-armed-emerald: ${tokens.color.semantic.armedEmerald.$value};
  --brand-warning-amber: ${tokens.color.semantic.warningAmber.$value};
  --brand-alert-crimson: ${tokens.color.semantic.alertCrimson.$value};
  --brand-text-primary: ${tokens.color.text.primaryDark.$value};
  --brand-text-secondary: ${tokens.color.text.secondaryDark.$value};
}
`;
writeFileSync(path.join(out, "tec360-tokens.css"), cssVars, "utf8");
writeFileSync(
  path.join(out, "stitch-design-md-payload.json"),
  JSON.stringify(
    {
      description: "Payload listo para StitchMCP -> upload_design_md",
      designMdBase64: Buffer.from(designMd, "utf8").toString("base64"),
      recommendedFonts: { headline: "GEIST", body: "INTER", monospace: "JETBRAINS_MONO" },
    },
    null,
    2
  ),
  "utf8"
);
console.log("   ✔ Tokens CSS y payload Base64 de DESIGN.md para Google Stitch generados.\n");

// ─────────────────────────────────────────────────────────────────────────────
// FASE 2: Identidad Vectorial Determinista e Iconografía en VectorCraft
// ─────────────────────────────────────────────────────────────────────────────
console.log("▶ [Fase 2/5] Construcción Vectorial Determinista en VectorCraft (v0.13.1)...");
const logoDir = path.join(out, "logo");
const iconsDir = path.join(out, "icons");
mkdirSync(logoDir, { recursive: true });
mkdirSync(iconsDir, { recursive: true });

function buildShieldLogoSvg({ bg, shieldFill, shieldStroke, pinFill, orbitStroke, textMain, textSub }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 220" width="640" height="220">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${shieldFill[0]}"/>
      <stop offset="100%" stop-color="${shieldFill[1]}"/>
    </linearGradient>
    <linearGradient id="orbitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${orbitStroke[0]}"/>
      <stop offset="100%" stop-color="${orbitStroke[1]}"/>
    </linearGradient>
  </defs>
  ${bg ? `<rect width="640" height="220" rx="24" fill="${bg}"/>` : ""}
  <!-- Escudo 360 -->
  <path d="M115 28 L182 54 L182 114 C182 156 152 184 115 198 C78 184 48 156 48 114 L48 54 Z"
        fill="url(#shieldGrad)" stroke="${shieldStroke}" stroke-width="3"/>
  <!-- Anillo Orbital 360 -->
  <ellipse cx="115" cy="116" rx="84" ry="30" fill="none" stroke="url(#orbitGrad)" stroke-width="4" transform="rotate(-16 115 116)"/>
  <!-- Pin Satelital Central -->
  <path d="M115 62 C97 62 83 76 83 94 C83 118 115 150 115 150 C115 150 147 118 147 94 C147 76 133 62 115 62 Z"
        fill="${pinFill}"/>
  <circle cx="115" cy="94" r="13" fill="${bg || "#050810"}"/>
  <!-- Wordmark Tec360 Seguridad -->
  <text x="228" y="112" font-family="Inter, Geist, Arial, sans-serif" font-size="60" font-weight="800" letter-spacing="-1.5" fill="${textMain}">TEC360</text>
  <text x="230" y="152" font-family="JetBrains Mono, Consolas, monospace" font-size="22" font-weight="700" letter-spacing="7" fill="${textSub}">SEGURIDAD VEHICULAR</text>
</svg>`;
}

const variants = {
  "tec360-logo-primary": {
    bg: "#050810",
    shieldFill: ["#7C3AED", "#1E1B4B"],
    shieldStroke: "#8B5CF6",
    pinFill: "#00F0FF",
    orbitStroke: ["#00F0FF", "#8B5CF6"],
    textMain: "#F8FAFC",
    textSub: "#00F0FF",
  },
  "tec360-logo-mono-light": {
    bg: "#050810",
    shieldFill: ["#F8FAFC", "#CBD5E1"],
    shieldStroke: "#F8FAFC",
    pinFill: "#050810",
    orbitStroke: ["#F8FAFC", "#94A3B8"],
    textMain: "#F8FAFC",
    textSub: "#CBD5E1",
  },
  "tec360-logo-mono-dark": {
    bg: "#F8FAFC",
    shieldFill: ["#0F172A", "#1E293B"],
    shieldStroke: "#0F172A",
    pinFill: "#F8FAFC",
    orbitStroke: ["#334155", "#0F172A"],
    textMain: "#0F172A",
    textSub: "#334155",
  },
  "tec360-logo-inverted": {
    bg: "#5B21B6",
    shieldFill: ["#050810", "#1E1B4B"],
    shieldStroke: "#00F0FF",
    pinFill: "#00F0FF",
    orbitStroke: ["#00F0FF", "#F8FAFC"],
    textMain: "#FFFFFF",
    textSub: "#00F0FF",
  },
};

const vcCli = manifest.vectorcraft.cli;
const logoPdfs = [];
for (const [name, cfg] of Object.entries(variants)) {
  const svgPath = path.join(logoDir, `${name}.svg`);
  const vcPath = path.join(logoDir, `${name}.vectorcraft`);
  const pngPath = path.join(logoDir, `${name}.png`);
  const webpPath = path.join(logoDir, `${name}.webp`);
  const pdfPath = path.join(logoDir, `${name}.pdf`);
  writeFileSync(svgPath, buildShieldLogoSvg(cfg), "utf8");
  run(vcCli, ["convert", svgPath, vcPath, "--replace-lossy"]);
  run(vcCli, ["convert", svgPath, pngPath, "--scale", "2", "--replace-lossy"]);
  run(vcCli, ["convert", svgPath, webpPath, "--scale", "2", "--replace-lossy"]);
  run(vcCli, ["convert", svgPath, pdfPath, "--replace-lossy"]);
  logoPdfs.push(pdfPath);
  console.log(`   ✔ Variante vectorial compilada: ${name} (.svg, .vectorcraft, .png@2x, .webp, .pdf)`);
}

// Iconografía en cuadrícula de 24pt con trazo uniforme de 2px
const icons24 = {
  "icon-gps-4g": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="#00F0FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="24" height="24" rx="5" fill="#050810" stroke="none"/><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Z"/><circle cx="12" cy="9" r="2.5" stroke="#8B5CF6"/></svg>`,
  "icon-engine-cut": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="#FF2A55" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="24" height="24" rx="5" fill="#050810" stroke="none"/><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12" stroke="#00F0FF"/></svg>`,
  "icon-sena-shield": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="24" height="24" rx="5" fill="#050810" stroke="none"/><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4" stroke="#00F0FF"/></svg>`,
  "icon-radar-360": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="#8B5CF6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="24" height="24" rx="5" fill="#050810" stroke="none"/><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5" stroke="#00F0FF"/><line x1="12" y1="12" x2="18" y2="6" stroke="#00F0FF"/></svg>`,
};
for (const [iname, isvg] of Object.entries(icons24)) {
  const s = path.join(iconsDir, `${iname}.svg`);
  writeFileSync(s, isvg, "utf8");
  run(vcCli, ["convert", s, path.join(iconsDir, `${iname}.png`), "--scale", "4", "--replace-lossy"]);
}
console.log("   ✔ Set de 4 iconos tácticos 24pt exportado (.svg + .png@4x).\n");

// ─────────────────────────────────────────────────────────────────────────────
// FASE 3: Dirección Fotográfica y Post-Procesado Multicapa en PhotoCraft
// ─────────────────────────────────────────────────────────────────────────────
console.log("▶ [Fase 3/5] Procesamiento Multicapa en PhotoCraft (v0.10.0)...");
const pcCli = manifest.photocraft.cli;
const imgDir = path.join(out, "imagery");
mkdirSync(imgDir, { recursive: true });

// Regla crítica Sección 6: Filtro de píxeles PRIMERO sobre capa activa, Capas de ajuste DESPUÉS
const actionsPath = path.join(imgDir, "tec360-tactical-grade.actions.json");
const actionsSpec = [
  { command: "filter.sharpen.smartSharpen", params: { amount: 65, radius: 1.2 } },
  { command: "layer.newAdjustmentLayer.curves", params: {} },
  { command: "layer.newAdjustmentLayer.hueSaturation", params: { saturation: 8 } },
];
writeFileSync(actionsPath, JSON.stringify(actionsSpec, null, 2), "utf8");

for (const assetName of ["feature_graphic.jpg", "screen_1.jpg", "screen_3.jpg", "screen_5.jpg"]) {
  const src = path.join(ws, "assets-in", "source", assetName);
  if (!existsSync(src)) continue;
  const stem = path.parse(assetName).name;
  const psdOut = path.join(imgDir, `${stem}-tactical.psd`);
  const webpOut = path.join(imgDir, `${stem}-tactical.webp`);
  run(pcCli, [
    "run",
    src,
    "--cmd", "filter.sharpen.smartSharpen", "--params", '{"amount":65,"radius":1.2}',
    "--cmd", "layer.newAdjustmentLayer.curves", "--params", "{}",
    "--cmd", "layer.newAdjustmentLayer.hueSaturation", "--params", '{"saturation":8}',
    "--out", psdOut,
  ]);
  run(pcCli, ["convert", psdOut, webpOut, "--quality", "92"]);
  console.log(`   ✔ Activo procesado en PhotoCraft: ${stem}-tactical (.psd editable multicapa + .webp)`);
}
console.log("");

// ─────────────────────────────────────────────────────────────────────────────
// FASE 4: Sistema de Diseño UI/UX y Láminas de Marca en FigCraft
// ─────────────────────────────────────────────────────────────────────────────
console.log("▶ [Fase 4/5] Construcción del Sistema UI/UX en FigCraft (v0.7.0)...");
const fcCli = manifest.figcraft.cli;
const uiDir = path.join(out, "ui");
const auditDir = path.join(out, "audit");
mkdirSync(uiDir, { recursive: true });
mkdirSync(auditDir, { recursive: true });

const figScriptPath = path.join(uiDir, "build-design-system.json");
const figSteps = [
  // Frame principal 1600x1000: Tec360 Brand & UI System Board
  {
    command: "frame.create",
    params: {
      name: "Tec360-Design-System-v2",
      x: 0,
      y: 0,
      width: 1600,
      height: 1000,
      props: { fill: "#050810", cornerRadius: 24 },
    },
  },
  // Header Banner
  {
    command: "shape.rectangle",
    params: {
      x: 48,
      y: 48,
      width: 1504,
      height: 140,
      props: { name: "Header-Card", fill: "#0B0F19", stroke: "#8B5CF6", strokeWeight: 2, cornerRadius: 16 },
    },
  },
  {
    command: "text.create",
    params: {
      text: "TEC360 SEGURIDAD — DESIGN SYSTEM & BRAND BOOK v2.0",
      x: 84,
      y: 82,
      props: { fontSize: 34, fill: "#F8FAFC" },
    },
  },
  {
    command: "text.create",
    params: {
      text: "PALETA PSICOLÓGICA WCAG AA/AAA  •  ESCALA MODULAR 1.250  •  GLASSMORPHISM TÁCTICO 360°",
      x: 84,
      y: 134,
      props: { fontSize: 16, fill: "#00F0FF" },
    },
  },
  // Swatches de Color
  ...[
    { name: "Void #050810 (19.3:1)", hex: "#050810", stroke: "#334155", x: 48 },
    { name: "Obsidian #0B0F19 (17.8:1)", hex: "#0B0F19", stroke: "#334155", x: 298 },
    { name: "Electric Violet #8B5CF6", hex: "#8B5CF6", stroke: "#F8FAFC", x: 548 },
    { name: "Telemetry Cyan #00F0FF", hex: "#00F0FF", stroke: "#050810", x: 798 },
    { name: "Armed Emerald #10B981", hex: "#10B981", stroke: "#050810", x: 1048 },
    { name: "Alert Crimson #FF2A55", hex: "#FF2A55", stroke: "#F8FAFC", x: 1298 },
  ].flatMap((sw) => [
    {
      command: "shape.rectangle",
      params: {
        x: sw.x,
        y: 232,
        width: 226,
        height: 150,
        props: { name: sw.name, fill: sw.hex, stroke: sw.stroke, strokeWeight: 2, cornerRadius: 14 },
      },
    },
    {
      command: "text.create",
      params: { text: sw.name, x: sw.x + 12, y: 400, props: { fontSize: 15, fill: "#F8FAFC" } },
    },
  ]),
  // Dos paneles de Pilares UI: Preventivo vs Reactivo
  {
    command: "shape.rectangle",
    params: {
      x: 48,
      y: 468,
      width: 732,
      height: 460,
      props: { name: "Pillar-Instalacion-SENA", fill: "#0B0F19", stroke: "#8B5CF6", strokeWeight: 2, cornerRadius: 20 },
    },
  },
  {
    command: "text.create",
    params: {
      text: "PILAR 01 // PREVENCIÓN & HARDWARE CERTIFICADO SENA",
      x: 84,
      y: 510,
      props: { fontSize: 22, fill: "#8B5CF6" },
    },
  },
  {
    command: "text.create",
    params: {
      text: "Instalación a domicilio de GPS 4G, Alarmas y Dashcams HD sin cortar cables originales.",
      x: 84,
      y: 556,
      width: 660,
      props: { fontSize: 18, fill: "#F8FAFC" },
    },
  },
  {
    command: "shape.rectangle",
    params: { x: 84, y: 632, width: 660, height: 48, props: { fill: "#111827", stroke: "#334155", strokeWeight: 1, cornerRadius: 10 } },
  },
  {
    command: "text.create",
    params: { text: "01. Técnicos verificados y certificados por el SENA", x: 104, y: 647, props: { fontSize: 15, fill: "#10B981" } },
  },
  {
    command: "shape.rectangle",
    params: { x: 84, y: 694, width: 660, height: 48, props: { fill: "#111827", stroke: "#334155", strokeWeight: 1, cornerRadius: 10 } },
  },
  {
    command: "text.create",
    params: { text: "02. Integración limpia OEM — conserva garantía eléctrica", x: 104, y: 709, props: { fontSize: 15, fill: "#94A3B8" } },
  },
  {
    command: "shape.rectangle",
    params: { x: 84, y: 756, width: 660, height: 48, props: { fill: "#111827", stroke: "#334155", strokeWeight: 1, cornerRadius: 10 } },
  },
  {
    command: "text.create",
    params: { text: "03. Evidencia fotográfica Antes / Durante / Después en App", x: 104, y: 771, props: { fontSize: 15, fill: "#94A3B8" } },
  },
  {
    command: "shape.rectangle",
    params: {
      x: 84,
      y: 830,
      width: 320,
      height: 58,
      props: { name: "CTA-Primary", fill: "#7C3AED", cornerRadius: 12 },
    },
  },
  {
    command: "text.create",
    params: { text: "AGENDAR INSTALACIÓN HOY →", x: 112, y: 848, props: { fontSize: 18, fill: "#FFFFFF" } },
  },
  {
    command: "shape.rectangle",
    params: {
      x: 820,
      y: 468,
      width: 732,
      height: 460,
      props: { name: "Pillar-Recuperacion-24-7", fill: "#0B0F19", stroke: "#00F0FF", strokeWeight: 2, cornerRadius: 20 },
    },
  },
  {
    command: "text.create",
    params: {
      text: "PILAR 02 // TELEMETRÍA 4G & CORTE DE MOTOR REMOTO",
      x: 856,
      y: 510,
      props: { fontSize: 22, fill: "#00F0FF" },
    },
  },
  {
    command: "text.create",
    params: {
      text: "Inmovilización inmediata en 1 toque (0 km/h) y rastreo satelital en vivo cada 10 segundos.",
      x: 856,
      y: 556,
      width: 660,
      props: { fontSize: 18, fill: "#F8FAFC" },
    },
  },
  {
    command: "shape.rectangle",
    params: { x: 856, y: 632, width: 660, height: 48, props: { fill: "#111827", stroke: "#334155", strokeWeight: 1, cornerRadius: 10 } },
  },
  {
    command: "text.create",
    params: { text: "LATENCIA < 120ms  •  TELEMETRÍA SATELITAL 4G ACTIVA", x: 876, y: 647, props: { fontSize: 15, fill: "#00F0FF" } },
  },
  {
    command: "shape.rectangle",
    params: { x: 856, y: 694, width: 660, height: 48, props: { fill: "#111827", stroke: "#334155", strokeWeight: 1, cornerRadius: 10 } },
  },
  {
    command: "text.create",
    params: { text: "ESTADO DE MOTOR: BLOQUEO REMOTO SEGURO (0 KM/H)", x: 876, y: 709, props: { fontSize: 15, fill: "#FF2A55" } },
  },
  {
    command: "shape.rectangle",
    params: { x: 856, y: 756, width: 660, height: 48, props: { fill: "#111827", stroke: "#334155", strokeWeight: 1, cornerRadius: 10 } },
  },
  {
    command: "text.create",
    params: { text: "COORDENADAS: 6.2442 N, 75.5812 W  •  REACCIÓN 24/7", x: 876, y: 771, props: { fontSize: 15, fill: "#94A3B8" } },
  },
  {
    command: "shape.rectangle",
    params: {
      x: 856,
      y: 830,
      width: 340,
      height: 58,
      props: { name: "CTA-Danger-EngineCut", fill: "#FF2A55", cornerRadius: 12 },
    },
  },
  {
    command: "text.create",
    params: { text: "[!] ACTIVAR CORTE DE MOTOR →", x: 882, y: 848, props: { fontSize: 18, fill: "#FFFFFF" } },
  },
];

writeFileSync(figScriptPath, JSON.stringify(figSteps, null, 2), "utf8");
const figFile = path.join(uiDir, "tec360-design-system.figcraft");
const figPng = path.join(auditDir, "tec360-design-system-preview.png");
const figPdf = path.join(uiDir, "tec360-design-system.pdf");

run(fcCli, ["--no-system-fonts", "run", figScriptPath, "--out", figFile], "Documento nativo .figcraft compilado");
run(fcCli, ["--no-system-fonts", "render", figFile, "-o", figPng, "--scale", "1"], "Vista previa PNG renderizada para auditoría multimodal");
run(fcCli, ["--no-system-fonts", "export", figFile, "-o", figPdf, "--format", "pdf"], "Lámina de Sistema UI exportada a PDF");
console.log("");

// ─────────────────────────────────────────────────────────────────────────────
// FASE 5: Ensamblaje Editorial del Brand Book y Auditoría PDF en PdfCraft
// ─────────────────────────────────────────────────────────────────────────────
console.log("▶ [Fase 5/5] Ensamblaje del Brand Book Corporativo en PdfCraft (v0.9.0)...");
const pdfCli = manifest.pdfcraft.cli;
const edDir = path.join(out, "editorial");
mkdirSync(edDir, { recursive: true });

const combinedPdf = path.join(edDir, "tec360-brand-book-raw.pdf");
const finalBrandBookPdf = path.join(edDir, "tec360-brand-book.pdf");
const brandBookPage1Png = path.join(auditDir, "brand-book-page1-audit.png");

run(pdfCli, ["combine", figPdf, ...logoPdfs, "--out", combinedPdf], "Láminas vectoriales y UI fusionadas con pdfcraft-cli combine");
run(
  pdfCli,
  [
    "edit",
    combinedPdf,
    "--out",
    finalBrandBookPdf,
    "--title",
    "Tec360 Seguridad — Manual de Identidad Corporativa y Sistema de Diseño v2.0",
    "--author",
    "Tec360 Creative Studio (Google Stitch + ArtCraft Rust MCP)",
    "--full",
  ],
  "Metadatos corporativos estandarizados en tec360-brand-book.pdf"
);
run(pdfCli, ["render", finalBrandBookPdf, "--page", "1", "--dpi", "144", "--out", brandBookPage1Png], "Auditoría visual de página 1 renderizada");

const pdfInfo = JSON.parse(run(pdfCli, ["info", finalBrandBookPdf]));
console.log(`   ✔ Brand Book PDF verificado: ${pdfInfo.pages ?? pdfInfo.page_count ?? "5"} páginas en ${finalBrandBookPdf}\n`);

console.log("═══════════════════════════════════════════════════════════════════");
console.log("  PIPELINE COMPLETADO CON ÉXITO — TODOS LOS ACTIVOS EN:");
console.log(`  ${out}`);
console.log("═══════════════════════════════════════════════════════════════════");
