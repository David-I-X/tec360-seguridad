#!/usr/bin/env node
/**
 * Tec360 Seguridad — End-to-End Automated Brand & Creative Pipeline (v3.0 Oficial)
 * Unifica el logotipo maestro Orbital Radar 360° V2 y la arquitectura Dark Immersive
 * de la landing principal en todos los canales (Web Next.js, Mobile Expo, Videos Cortos,
 * Redes Sociales, OpenGraph, Fotografía de Estudio y Brand Book Corporativo de 8 páginas).
 *
 * Uso:
 *   node brand-workspace/tools/run-brand-pipeline.mjs
 */
import { execFileSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { buildMasterLogoPackage } from "./build-master-logo.mjs";
import {
  buildOfficialIcons24,
  buildMobileExpoSvgs,
  buildOgBannerSvg,
  buildReelCoverSvg,
  buildTechnicianCredentialSvg,
  buildBrandBook8Pages,
} from "./build-brand-plates.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const ws = path.join(repo, "brand-workspace");
const out = path.join(ws, "deliverables");
const manifestPath = path.join(os.homedir(), ".artcraft", "artcraft-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8").replace(/^\uFEFF/, ""));

const run = (bin, args, label) => {
  const res = execFileSync(bin, args, {
    cwd: repo,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (label) console.log(`   ✔ ${label}`);
  return res;
};

console.log("═══════════════════════════════════════════════════════════════════");
console.log("  TEC360 CREATIVE ENGINE v3.0 — BRANDING INTEGRAL MULTICANAL");
console.log("═══════════════════════════════════════════════════════════════════\n");

// ─────────────────────────────────────────────────────────────────────────────
// FASE 1: Tokens CSS, Tokens Mobile Expo (TS) y Payload Google Stitch MCP
// ─────────────────────────────────────────────────────────────────────────────
console.log("▶ [Fase 1/5] Tokens Fundacionales (W3C / CSS / React Native / Stitch)...");
const tokens = JSON.parse(readFileSync(path.join(out, "brand-tokens.json"), "utf8"));
const designMd = readFileSync(path.join(repo, "DESIGN.md"), "utf8");

const cssVars = `/* Auto-generado por run-brand-pipeline.mjs v3.0 desde brand-tokens.json */
:root {
  /* Superficies Dark Immersive */
  --brand-void: ${tokens.color.background.void.$value};
  --brand-obsidian: ${tokens.color.background.obsidian.$value};
  --brand-elevated: ${tokens.color.background.elevated.$value};
  --brand-alert-surface: ${tokens.color.background.alertSurface.$value};

  /* Identidad Primaria & 3 Líneas de Servicio */
  --brand-primary: ${tokens.color.brand.primary.$value};
  --brand-primary-vivid: ${tokens.color.brand.primaryVivid.$value};
  --brand-primary-deep: ${tokens.color.brand.primaryDeep.$value};
  --brand-secondary-blue: ${tokens.color.brand.secondaryBlue.$value};
  --brand-telemetry-cyan: ${tokens.color.brand.telemetryCyan.$value};
  --brand-warning-amber: ${tokens.color.semantic.warningAmber.$value};
  --brand-armed-emerald: ${tokens.color.semantic.armedEmerald.$value};
  --brand-alert-crimson: ${tokens.color.semantic.alertCrimson.$value};

  /* Jerarquía de Texto Teñido (WCAG AAA) */
  --brand-text-primary: ${tokens.color.text.primaryDark.$value};
  --brand-text-body: ${tokens.color.text.bodyTintedDark.$value};
  --brand-text-dual: ${tokens.color.text.displayDualDark.$value};
  --brand-text-secondary: ${tokens.color.text.secondaryDark.$value};

  /* Bordes y Vidrio Táctico */
  --brand-border-glass: ${tokens.color.border.violetGlass.$value};
  --brand-border-hairline: ${tokens.color.border.subtleHairline.$value};

  /* Soporte Modo Claro */
  --brand-light-bg: ${tokens.color.background.light.$value};
  --brand-light-surface: ${tokens.color.background.lightSurface.$value};
  --brand-light-text: ${tokens.color.text.primaryLight.$value};
  --brand-cyan-light: ${tokens.color.brand.cyanLightMode.$value};

  /* Voces Tipográficas */
  --font-display: "Archivo", "Geist", "Inter", system-ui, sans-serif;
  --font-sans: "Geist", "Inter", system-ui, sans-serif;
  --font-mono: "Geist Mono", "JetBrains Mono", monospace;
}
`;
writeFileSync(path.join(out, "tec360-tokens.css"), cssVars, "utf8");

const mobileTokensTs = `/**
 * Tec360 Seguridad — Tokens Oficiales de Marca v3.0 (Compartidos Web + Mobile Expo)
 * Auto-generado desde brand-workspace/deliverables/brand-tokens.json.
 * Estándar humano exclusivo: técnicos certificados (cero alusiones a entidades terceras).
 */

export const BRAND_COLORS = {
  void: "${tokens.color.background.void.$value}",
  obsidian: "${tokens.color.background.obsidian.$value}",
  elevated: "${tokens.color.background.elevated.$value}",
  alertSurface: "${tokens.color.background.alertSurface.$value}",
  violetCore: "${tokens.color.brand.primary.$value}",
  electricViolet: "${tokens.color.brand.primaryVivid.$value}",
  violetDeep: "${tokens.color.brand.primaryDeep.$value}",
  quantumBlue: "${tokens.color.brand.secondaryBlue.$value}",
  telemetryCyan: "${tokens.color.brand.telemetryCyan.$value}",
  tacticalAmber: "${tokens.color.semantic.warningAmber.$value}",
  armedEmerald: "${tokens.color.semantic.armedEmerald.$value}",
  alertCrimson: "${tokens.color.semantic.alertCrimson.$value}",
  textPrimary: "${tokens.color.text.primaryDark.$value}",
  textBodyTinted: "${tokens.color.text.bodyTintedDark.$value}",
  textDisplayDual: "${tokens.color.text.displayDualDark.$value}",
  borderVioletGlass: "${tokens.color.border.violetGlass.$value}",
  borderHairline: "${tokens.color.border.subtleHairline.$value}",
} as const;

export const SERVICE_PILLARS = {
  instalacion: {
    id: "instalacion",
    title: "Instalaciones Vehiculares",
    scope: "Motos · Automóviles · Carga Pesada",
    accent: BRAND_COLORS.electricViolet,
    ctaBg: BRAND_COLORS.violetCore,
    ctaText: BRAND_COLORS.textPrimary,
  },
  recuperacion: {
    id: "recuperacion",
    title: "Equipo de Reacción & Recuperación 24/7",
    scope: "Respuesta Inmediata 24/7 · Cobertura Nacional",
    accent: BRAND_COLORS.telemetryCyan,
    ctaBg: BRAND_COLORS.telemetryCyan,
    ctaText: BRAND_COLORS.void,
  },
  mecanica: {
    id: "mecanica",
    title: "Mecánica Básica a Domicilio",
    scope: "Asistencia Express · En Casa, Oficina o Vía",
    accent: BRAND_COLORS.tacticalAmber,
    ctaBg: BRAND_COLORS.tacticalAmber,
    ctaText: BRAND_COLORS.void,
  },
} as const;
`;
writeFileSync(path.join(out, "tec360-mobile-tokens.ts"), mobileTokensTs, "utf8");
writeFileSync(
  path.join(repo, "mobile", "constants", "brand-tokens.ts"),
  mobileTokensTs,
  "utf8"
);

writeFileSync(
  path.join(out, "stitch-design-md-payload.json"),
  JSON.stringify(
    {
      description: "Payload v3.0 listo para StitchMCP -> upload_design_md",
      version: "3.0.0",
      designMdBase64: Buffer.from(designMd, "utf8").toString("base64"),
      recommendedFonts: {
        display: "ARCHIVO",
        headline: "GEIST",
        body: "GEIST",
        monospace: "GEIST_MONO",
      },
    },
    null,
    2
  ),
  "utf8"
);
console.log("   ✔ tec360-tokens.css, mobile/constants/brand-tokens.ts y payload Stitch v3.0 generados.\n");

// ─────────────────────────────────────────────────────────────────────────────
// FASE 2: Logotipo Maestro, 6 Iconos Tácticos & Sincronización App Móvil Expo
// ─────────────────────────────────────────────────────────────────────────────
console.log("▶ [Fase 2/5] Identidad Vectorial, Iconografía 24pt & Kit Móvil Expo (VectorCraft)...");
const logoDir = path.join(out, "logo");
const iconsDir = path.join(out, "icons");
const mobileImgDir = path.join(repo, "mobile", "assets", "images");
mkdirSync(logoDir, { recursive: true });
mkdirSync(iconsDir, { recursive: true });

const vcCli = manifest.vectorcraft.cli;
buildMasterLogoPackage({ vcCliPath: vcCli });

// Limpiar icono obsoleto con referencia descartada
for (const ext of ["svg", "png", "vectorcraft", "webp"]) {
  const stale = path.join(iconsDir, `icon-sena-shield.${ext}`);
  if (existsSync(stale)) rmSync(stale, { force: true });
}

// Compilar los 6 iconos tácticos oficiales 24pt
const icons24 = buildOfficialIcons24();
for (const [iname, isvg] of Object.entries(icons24)) {
  const s = path.join(iconsDir, `${iname}.svg`);
  writeFileSync(s, isvg, "utf8");
  run(vcCli, ["convert", s, path.join(iconsDir, `${iname}.vectorcraft`), "--replace-lossy"]);
  run(vcCli, ["convert", s, path.join(iconsDir, `${iname}.png`), "--scale", "4", "--replace-lossy"]);
}
console.log("   ✔ Set de 6 iconos tácticos 24pt exportado (.svg + .vectorcraft + .png@4x).");

// Compilar y sincronizar iconos nativos de la App Móvil Expo (1024x1024 + Safe Zone 66%)
const mobExpoDir = path.join(logoDir, "mobile-expo");
mkdirSync(mobExpoDir, { recursive: true });
const { fullBleedIconSvg, adaptiveFgSvg, adaptiveMonoSvg, adaptiveBgSvg, splashSvg } = buildMobileExpoSvgs();

const mobSpecs = [
  { name: "icon", svg: fullBleedIconSvg },
  { name: "android-icon-foreground", svg: adaptiveFgSvg },
  { name: "android-icon-monochrome", svg: adaptiveMonoSvg },
  { name: "android-icon-background", svg: adaptiveBgSvg },
  { name: "splash-icon", svg: splashSvg },
];
for (const ms of mobSpecs) {
  const svgP = path.join(mobExpoDir, `${ms.name}.svg`);
  const pngP = path.join(mobExpoDir, `${ms.name}.png`);
  writeFileSync(svgP, ms.svg, "utf8");
  run(vcCli, ["convert", svgP, pngP, "--replace-lossy"]);
  copyFileSync(pngP, path.join(mobileImgDir, `${ms.name}.png`));
}
copyFileSync(
  path.join(logoDir, "app-icons", "favicon-32x32.png"),
  path.join(mobileImgDir, "favicon.png")
);
console.log("   ✔ Iconos nativos de App Móvil Expo sincronizados en mobile/assets/images/.\n");

// ─────────────────────────────────────────────────────────────────────────────
// FASE 3: Kit Digital Social, OpenGraph 1200x630, Portadas de Video & Credencial
// ─────────────────────────────────────────────────────────────────────────────
console.log("▶ [Fase 3/5] Kit Social, OpenGraph, Portadas 16:9 de Video & Credencial...");
const socialDir = path.join(out, "social");
mkdirSync(socialDir, { recursive: true });

// 3.1 OpenGraph Banner (1200x630) + sincronización con Next.js public/
const ogBase = path.join(socialDir, "tec360-og-banner-1200x630");
writeFileSync(`${ogBase}.svg`, buildOgBannerSvg(), "utf8");
run(vcCli, ["convert", `${ogBase}.svg`, `${ogBase}.vectorcraft`, "--replace-lossy"]);
run(vcCli, ["convert", `${ogBase}.svg`, `${ogBase}.png`, "--replace-lossy"]);
run(vcCli, ["convert", `${ogBase}.svg`, `${ogBase}.webp`, "--replace-lossy"]);
copyFileSync(`${ogBase}.png`, path.join(repo, "frontend", "public", "og-image.png"));
copyFileSync(`${ogBase}.png`, path.join(repo, "frontend", "public", "icons", "og-image.png"));
console.log("   ✔ OpenGraph oficial 1200×630 compilado y activo en frontend/public/og-image.png");

// 3.2 Tres Portadas 1920x1080 para los Videos Cortos de Servicio
const reelSpecs = [
  {
    id: "instalaciones",
    titleLine1: "Instalaciones Vehiculares",
    titleLine2: "Conectores limpios",
    bracket: "[ARNÉS OEM]",
    scope: "Motos · Automóviles · Carga Pesada",
    duration: "00:18",
    accent: "#8B5CF6",
    secondAccent: "#3B82F6",
    bullets: [
      { label: "GPS 4G L1/L5", meta: "ANTI-JAMMER ACTIVO" },
      { label: "Dashcam HD", meta: "GRABACIÓN EN NUBE" },
      { label: "Corte CAN-Bus", meta: "GARANTÍA INTACTA" },
    ],
  },
  {
    id: "reaccion",
    titleLine1: "Equipo de Reacción 24/7",
    titleLine2: "Motor detenido a",
    bracket: "[0 KM/H]",
    scope: "Respuesta Inmediata 24/7 · Cobertura Nacional",
    duration: "00:22",
    accent: "#00F0FF",
    secondAccent: "#FF2A55",
    bullets: [
      { label: "Corte Remoto", meta: "INMOVILIZACIÓN 1.1S" },
      { label: "Cerco Satelital", meta: "PULSO CADA 10 SEG" },
      { label: "Enlace Oficial", meta: "POLICÍA NACIONAL" },
    ],
  },
  {
    id: "mecanica",
    titleLine1: "Mecánica Básica Express",
    titleLine2: "Asistencia en sitio",
    bracket: "[< 30 MIN]",
    scope: "En Casa, Oficina o Vía · Sin Talleres",
    duration: "00:16",
    accent: "#F59E0B",
    secondAccent: "#10B981",
    bullets: [
      { label: "Batería y Corriente", meta: "DESVARE INMEDIATO" },
      { label: "Llantas y Aceite", meta: "SERVICIO EN PUERTA" },
      { label: "Frenos, Kit y Luces", meta: "AJUSTE CERTIFICADO" },
    ],
  },
];

for (const rs of reelSpecs) {
  const rBase = path.join(socialDir, `tec360-reel-cover-${rs.id}`);
  writeFileSync(`${rBase}.svg`, buildReelCoverSvg(rs), "utf8");
  run(vcCli, ["convert", `${rBase}.svg`, `${rBase}.png`, "--replace-lossy"]);
  run(vcCli, ["convert", `${rBase}.svg`, `${rBase}.webp`, "--replace-lossy"]);
  console.log(`   ✔ Portada HD 1920×1080 para video corto: tec360-reel-cover-${rs.id}.(svg | png | webp)`);
}

// 3.3 Credencial Oficial de Técnico Certificado (1080x1350)
const credBase = path.join(socialDir, "tec360-credencial-tecnico-certificado");
writeFileSync(`${credBase}.svg`, buildTechnicianCredentialSvg(), "utf8");
run(vcCli, ["convert", `${credBase}.svg`, `${credBase}.png`, "--replace-lossy"]);
run(vcCli, ["convert", `${credBase}.svg`, `${credBase}.pdf`, "--replace-lossy"]);
console.log("   ✔ Credencial de Técnico Certificado compilada (.svg | .png | .pdf).\n");

// ─────────────────────────────────────────────────────────────────────────────
// FASE 4: Colorimetría Fotográfica Multicapa de los Pósters Oscuros (PhotoCraft)
// ─────────────────────────────────────────────────────────────────────────────
console.log("▶ [Fase 4/5] Revelado Multicapa de Estudio Oscuro en PhotoCraft (v0.10.0)...");
const pcCli = manifest.photocraft.cli;
const imgDir = path.join(out, "imagery");
const landingInDir = path.join(ws, "assets-in", "landing");
mkdirSync(imgDir, { recursive: true });
mkdirSync(landingInDir, { recursive: true });

const landingPlates = [
  "hero-suv-studio.jpg",
  "tactical-installation-bay.jpg",
  "reaction-team-poster.jpg",
  "basic-mechanics-poster.jpg",
];
for (const plate of landingPlates) {
  const pubSrc = path.join(repo, "frontend", "public", "images", "landing", plate);
  const inDest = path.join(landingInDir, plate);
  if (existsSync(pubSrc)) {
    copyFileSync(pubSrc, inDest);
    const stem = path.parse(plate).name;
    const psdOut = path.join(imgDir, `${stem}-graded.psd`);
    const webpOut = path.join(imgDir, `${stem}-graded.webp`);
    // Regla crítica ArtCraft: filtro de píxeles primero, capas de ajuste después
    run(pcCli, [
      "run",
      inDest,
      "--cmd",
      "filter.sharpen.smartSharpen",
      "--params",
      '{"amount":65,"radius":1.2}',
      "--cmd",
      "layer.newAdjustmentLayer.curves",
      "--params",
      "{}",
      "--cmd",
      "layer.newAdjustmentLayer.hueSaturation",
      "--params",
      '{"saturation":8}',
      "--out",
      psdOut,
    ]);
    run(pcCli, ["convert", psdOut, webpOut, "--quality", "92"]);
    console.log(`   ✔ Master fotográfico PhotoCraft: ${stem}-graded (.psd multicapa + .webp)`);
  }
}
console.log("");

// ─────────────────────────────────────────────────────────────────────────────
// FASE 5: Tablero UI en FigCraft v3.0 + Brand Book Corporativo de 8 Páginas (PdfCraft)
// ─────────────────────────────────────────────────────────────────────────────
console.log("▶ [Fase 5/5] Tablero UI FigCraft v3.0 & Brand Book de 8 Páginas en PdfCraft...");
const fcCli = manifest.figcraft.cli;
const pdfCli = manifest.pdfcraft.cli;
const uiDir = path.join(out, "ui");
const edDir = path.join(out, "editorial");
const pagesDir = path.join(edDir, "pages");
const auditDir = path.join(out, "audit");
mkdirSync(uiDir, { recursive: true });
mkdirSync(pagesDir, { recursive: true });
mkdirSync(auditDir, { recursive: true });

// 5.1 Tablero Editable FigCraft v3.0 (3 Líneas de Servicio + Cero SENA)
const figScriptPath = path.join(uiDir, "build-design-system.json");
const figSteps = [
  {
    command: "frame.create",
    params: {
      name: "Tec360-Design-System-v3",
      x: 0,
      y: 0,
      width: 1600,
      height: 1000,
      props: { fill: "#050810", cornerRadius: 24 },
    },
  },
  {
    command: "shape.rectangle",
    params: {
      x: 48,
      y: 44,
      width: 1504,
      height: 132,
      props: { name: "Header-Card", fill: "#0B0F19", stroke: "#8B5CF6", strokeWeight: 2, cornerRadius: 18 },
    },
  },
  {
    command: "text.create",
    params: {
      text: "TEC360 SEGURIDAD — DESIGN SYSTEM & UI TOKENS v3.0",
      x: 84,
      y: 76,
      props: { fontSize: 32, fill: "#F8FAFC" },
    },
  },
  {
    command: "text.create",
    params: {
      text: "ORBITAL RADAR 360° V2  •  ARCHIVO + GEIST + GEIST MONO  •  3 LÍNEAS DE SERVICIO CON TÉCNICOS CERTIFICADOS",
      x: 84,
      y: 126,
      props: { fontSize: 15, fill: "#00F0FF" },
    },
  },
  ...[
    { name: "Void #050810", hex: "#050810", stroke: "#334155", x: 48 },
    { name: "Obsidian #0B0F19", hex: "#0B0F19", stroke: "#334155", x: 266 },
    { name: "Violet #7C3AED", hex: "#7C3AED", stroke: "#F8FAFC", x: 484 },
    { name: "Cyan #00F0FF", hex: "#00F0FF", stroke: "#050810", x: 702 },
    { name: "Amber #F59E0B", hex: "#F59E0B", stroke: "#050810", x: 920 },
    { name: "Emerald #10B981", hex: "#10B981", stroke: "#050810", x: 1138 },
    { name: "Crimson #FF2A55", hex: "#FF2A55", stroke: "#F8FAFC", x: 1356 },
  ].flatMap((sw) => [
    {
      command: "shape.rectangle",
      params: {
        x: sw.x,
        y: 212,
        width: 196,
        height: 132,
        props: { name: sw.name, fill: sw.hex, stroke: sw.stroke, strokeWeight: 2, cornerRadius: 14 },
      },
    },
    {
      command: "text.create",
      params: { text: sw.name, x: sw.x + 8, y: 360, props: { fontSize: 14, fill: "#F8FAFC" } },
    },
  ]),
  // 3 Columnas de Líneas de Servicio
  ...[
    {
      x: 48,
      title: "01 · INSTALACIONES VEHICULARES",
      stroke: "#8B5CF6",
      desc: "GPS 4G L1/L5 anti-jammer, Dashcam HD y alarmas con arnés OEM original a domicilio.",
      row1: "Técnicos certificados y auditados",
      row2: "Motos · Automóviles · Carga Pesada",
      cta: "SOLICITAR INSTALACIÓN →",
      ctaBg: "#7C3AED",
      ctaText: "#F8FAFC",
    },
    {
      x: 562,
      title: "02 · EQUIPO DE REACCIÓN 24/7",
      stroke: "#00F0FF",
      desc: "Corte de motor remoto seguro a [0 KM/H] en 1.1s y cerco satelital cada 10 segundos.",
      row1: "Despliegue táctico en campo 24/7",
      row2: "Enlace directo con Policía Nacional",
      cta: "ACTIVAR REACCIÓN 24/7 →",
      ctaBg: "#00F0FF",
      ctaText: "#050810",
    },
    {
      x: 1076,
      title: "03 · MECÁNICA BÁSICA EXPRESS",
      stroke: "#F59E0B",
      desc: "Desvares y mantenimiento preventivo en casa, oficina o vía en menos de 30 minutos.",
      row1: "Batería, llantas, aceite y filtros",
      row2: "Frenos, kit de arrastre y luces",
      cta: "PEDIR MECÁNICA BÁSICA →",
      ctaBg: "#F59E0B",
      ctaText: "#050810",
    },
  ].flatMap((col) => [
    {
      command: "shape.rectangle",
      params: {
        x: col.x,
        y: 424,
        width: 476,
        height: 520,
        props: { fill: "#0B0F19", stroke: col.stroke, strokeWeight: 2, cornerRadius: 20 },
      },
    },
    {
      command: "text.create",
      params: { text: col.title, x: col.x + 32, y: 468, props: { fontSize: 20, fill: col.stroke } },
    },
    {
      command: "text.create",
      params: { text: col.desc, x: col.x + 32, y: 520, width: 412, props: { fontSize: 16, fill: "#B4B0C8" } },
    },
    {
      command: "shape.rectangle",
      params: {
        x: col.x + 32,
        y: 632,
        width: 412,
        height: 52,
        props: { fill: "#111827", stroke: "#334155", strokeWeight: 1, cornerRadius: 12 },
      },
    },
    {
      command: "text.create",
      params: { text: col.row1, x: col.x + 52, y: 649, props: { fontSize: 15, fill: "#F8FAFC" } },
    },
    {
      command: "shape.rectangle",
      params: {
        x: col.x + 32,
        y: 700,
        width: 412,
        height: 52,
        props: { fill: "#111827", stroke: "#334155", strokeWeight: 1, cornerRadius: 12 },
      },
    },
    {
      command: "text.create",
      params: { text: col.row2, x: col.x + 52, y: 717, props: { fontSize: 15, fill: "#B4B0C8" } },
    },
    {
      command: "shape.rectangle",
      params: {
        x: col.x + 32,
        y: 840,
        width: 316,
        height: 56,
        props: { fill: col.ctaBg, cornerRadius: 12 },
      },
    },
    {
      command: "text.create",
      params: { text: col.cta, x: col.x + 56, y: 858, props: { fontSize: 16, fill: col.ctaText } },
    },
  ]),
];

writeFileSync(figScriptPath, JSON.stringify(figSteps, null, 2), "utf8");
const figFile = path.join(uiDir, "tec360-design-system.figcraft");
const figPng = path.join(auditDir, "tec360-design-system-preview.png");
const figPdf = path.join(uiDir, "tec360-design-system.pdf");

run(fcCli, ["--no-system-fonts", "run", figScriptPath, "--out", figFile], "Tablero editable FigCraft v3.0 compilado");
run(fcCli, ["--no-system-fonts", "render", figFile, "-o", figPng, "--scale", "1"], "Vista previa FigCraft v3.0 renderizada");
run(fcCli, ["--no-system-fonts", "export", figFile, "-o", figPdf, "--format", "pdf"], "Lámina UI FigCraft exportada a PDF");

// 5.2 Compilación de las 8 Láminas del Brand Book v3.0 -> PDF Maestro en PdfCraft
const brandBookPages = buildBrandBook8Pages();
const pagePdfPaths = [];
brandBookPages.forEach((svgContent, idx) => {
  const pNum = String(idx + 1).padStart(2, "0");
  const svgP = path.join(pagesDir, `brand-book-p${pNum}.svg`);
  const pdfP = path.join(pagesDir, `brand-book-p${pNum}.pdf`);
  const pngAuditP = path.join(auditDir, `brand-book-p${pNum}-audit.png`);
  writeFileSync(svgP, svgContent, "utf8");
  run(vcCli, ["convert", svgP, pdfP, "--replace-lossy"]);
  run(vcCli, ["convert", svgP, pngAuditP, "--replace-lossy"]);
  pagePdfPaths.push(pdfP);
});
console.log("   ✔ 8 láminas HD del Brand Book v3.0 compiladas en VectorCraft (.svg + .pdf + .png de auditoría)");

const rawBookPdf = path.join(edDir, "tec360-brand-book-raw.pdf");
const finalBookPdf = path.join(edDir, "tec360-brand-book.pdf");
run(pdfCli, ["combine", ...pagePdfPaths, "--out", rawBookPdf], "8 páginas fusionadas con pdfcraft-cli combine");
run(
  pdfCli,
  [
    "edit",
    rawBookPdf,
    "--out",
    finalBookPdf,
    "--title",
    "Tec360 Seguridad — Manual de Identidad Corporativa y Sistema de Diseño v3.0",
    "--author",
    "Tec360 Creative Studio (Orbital Radar V2 & Dark Immersive System)",
    "--full",
  ],
  "Metadatos oficiales v3.0 grabados en tec360-brand-book.pdf"
);
if (existsSync(rawBookPdf)) rmSync(rawBookPdf, { force: true });

// Mantener alias brand-book-page1-audit.png actualizado
copyFileSync(
  path.join(auditDir, "brand-book-p01-audit.png"),
  path.join(auditDir, "brand-book-page1-audit.png")
);

const pdfInfo = JSON.parse(run(pdfCli, ["info", finalBookPdf]));
console.log(`   ✔ Brand Book Corporativo v3.0 verificado: ${pdfInfo.pages ?? pdfInfo.page_count ?? "8"} páginas en ${finalBookPdf}\n`);

console.log("═══════════════════════════════════════════════════════════════════");
console.log("  BRANDING INTEGRAL v3.0 COMPLETADO — ENTREGABLES ACTIVOS EN:");
console.log(`  • ${out}`);
console.log(`  • ${path.join(repo, "frontend", "public", "og-image.png")}`);
console.log(`  • ${path.join(repo, "mobile", "assets", "images")}`);
console.log("═══════════════════════════════════════════════════════════════════");
