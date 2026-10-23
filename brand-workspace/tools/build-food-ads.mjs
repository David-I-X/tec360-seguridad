#!/usr/bin/env node
/**
 * Pipeline de Prueba Publicitaria Gastronómica (Instagram & WhatsApp)
 * 1. Procesa las fotografías base en PhotoCraft (smartSharpen + capas de ajuste no destructivas -> .psd + .png)
 * 2. Compone las piezas publicitarias en SVG/PNG vía VectorCraft donde la comida tiene 85%+ del protagonismo visual
 *    y la tipografía editorial se ubica únicamente en los márgenes superior e inferior sin tapar el producto.
 *
 * Uso:
 *   node brand-workspace/tools/build-food-ads.mjs <ruta_burger_img> <ruta_sandwich_img>
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const [burgerSrc, sandwichSrc] = process.argv.slice(2);
if (!burgerSrc || !sandwichSrc) {
  console.error("Uso: node build-food-ads.mjs <burger_img> <sandwich_img>");
  process.exit(1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const inDir = path.join(repo, "brand-workspace", "assets-in", "food-test");
const outDir = path.join(repo, "brand-workspace", "deliverables", "imagery", "food-test");
mkdirSync(inDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

const manifest = JSON.parse(
  readFileSync(path.join(os.homedir(), ".artcraft", "artcraft-manifest.json"), "utf8").replace(/^\uFEFF/, "")
);
const pcCli = manifest.photocraft.cli;
const vcCli = manifest.vectorcraft.cli;

const run = (bin, args) => execFileSync(bin, args, { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

/**
 * Paleta Psicológica Gastronómica ("Brasa & Oro Fundido"):
 * - Espresso Charcoal (#120905): Fondo oscuro cálido que maximiza el contraste de dorados y quesos.
 * - Cheddar Gold (#FFB800): Despierta el apetito y destaca el gratinado/fundido.
 * - Ember Flame (#EA580C): Acento cálido de brasa/ahumado.
 * - Warm Cream (#FFFDF9): Tipografía limpia (contraste 18.4:1 WCAG AAA).
 */
const items = [
  {
    id: "ad-hamburguesa-artesanal",
    src: burgerSrc,
    tag: "CARNE ARTESANAL  •  RIPIO DE PAPA  •  LECHUGA FRESCA",
    title: "PURO SABOR A LA BRASA",
    subtitle: "Carne jugosa al punto con ripio de papa crocante, lechuga fresca, tocineta y queso fundido.",
    badge: "RECIÉN HECHA",
    cta: "PÍDELO POR WAPP",
    ctaWidth: 320,
    accent: "#FFB800",
    pillBg: "#EA580C",
    imgBox: { x: 0, y: -48, width: 1080, height: 1446 },
  },
  {
    id: "ad-sandwich-gratinado",
    src: sandwichSrc,
    tag: "PAN ARTESANAL  •  COSTRA DORADA  •  DOBLE QUESO",
    title: "GRATINADO AL EXTREMO",
    subtitle: "Costra crujiente de mozzarella y parmesano fundido al horno con relleno jugoso.",
    badge: "SALIDO DEL HORNO",
    cta: "PÍDELO POR WAPP",
    ctaWidth: 320,
    accent: "#FFB800",
    pillBg: "#D97706",
    imgBox: { x: -240, y: -210, width: 1560, height: 1560 },
  },
];

for (const item of items) {
  const ext = path.extname(item.src) || ".png";
  const localIn = path.join(inDir, `${item.id}-raw${ext}`);
  copyFileSync(item.src, localIn);

  const psdOut = path.join(outDir, `${item.id}-master.psd`);
  const gradedPng = path.join(outDir, `${item.id}-graded.png`);

  // Paso 1: PhotoCraft — Smart Sharpen en capa de píxeles + Capas de ajuste no destructivas
  run(pcCli, [
    "run",
    localIn,
    "--cmd", "filter.sharpen.smartSharpen", "--params", '{"amount":72,"radius":1.3}',
    "--cmd", "layer.newAdjustmentLayer.curves", "--params", "{}",
    "--cmd", "layer.newAdjustmentLayer.hueSaturation", "--params", '{"saturation":10}',
    "--out", psdOut,
  ]);
  run(pcCli, ["convert", psdOut, gradedPng]);

  const b64 = readFileSync(gradedPng).toString("base64");

  const imgW = item.imgBox.width || item.imgBox.size;
  const imgH = item.imgBox.height || item.imgBox.size;
  const ctaW = item.ctaWidth || 320;
  const ctaTextX = 56 + (ctaW / 2);

  // Paso 2: Composición Publicitaria 1080x1350 (Formato vertical 4:5 óptimo para Instagram & WhatsApp)
  // La fotografía ocupa TODO el lienzo (1080x1350) sin recortes intrusivos; solo lleva degradados sutiles
  // en el 12% superior y 14% inferior para que la comida sea el centro absoluto (85%+ del protagonismo).
  const svg1080x1350 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" width="1080" height="1350">
  <defs>
    <linearGradient id="topVignette" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#120905" stop-opacity="0.88"/>
      <stop offset="65%" stop-color="#120905" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#120905" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="bottomVignette" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#120905" stop-opacity="0"/>
      <stop offset="32%" stop-color="#120905" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#120905" stop-opacity="0.94"/>
    </linearGradient>
  </defs>

  <!-- Fondo base cálido -->
  <rect width="1080" height="1350" fill="#120905"/>

  <!-- Fotografía Héroe (Escalado full-bleed centrado en lienzo 1080x1350 para cubrir 100% sin bordes) -->
  <image href="data:image/png;base64,${b64}" x="${item.imgBox.x}" y="${item.imgBox.y}" width="${imgW}" height="${imgH}"/>

  <!-- Viñetas suaves solo en los bordes extremos superior e inferior -->
  <rect x="0" y="0" width="1080" height="210" fill="url(#topVignette)"/>
  <rect x="0" y="1060" width="1080" height="290" fill="url(#bottomVignette)"/>

  <!-- Cabecera minimalista (Top 8%) -->
  <rect x="56" y="44" width="210" height="38" rx="19" fill="${item.pillBg}"/>
  <text x="161" y="69" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="800" letter-spacing="2" fill="#FFFDF9">${item.badge}</text>
  <text x="288" y="69" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700" letter-spacing="2.5" fill="${item.accent}">${item.tag}</text>

  <!-- Pie publicitario limpio (Bottom 12% — no tapa el corazón de la comida) -->
  <text x="56" y="1178" font-family="Inter, Arial, sans-serif" font-size="54" font-weight="900" letter-spacing="-1" fill="#FFFDF9">${item.title}</text>
  <text x="56" y="1222" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="500" fill="#FDE68A">${item.subtitle}</text>

  <!-- Barra CTA de WhatsApp / Instagram -->
  <rect x="56" y="1252" width="${ctaW}" height="58" rx="29" fill="${item.accent}"/>
  <text x="${ctaTextX}" y="1288" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="900" letter-spacing="1.5" fill="#120905">${item.cta}</text>
</svg>`;

  const svgPath = path.join(outDir, `${item.id}.svg`);
  const finalPng = path.join(outDir, `${item.id}.png`);
  const finalWebp = path.join(outDir, `${item.id}.webp`);
  writeFileSync(svgPath, svg1080x1350, "utf8");
  run(vcCli, ["convert", svgPath, finalPng, "--replace-lossy"]);
  run(vcCli, ["convert", svgPath, finalWebp, "--replace-lossy"]);
  console.log(`✔ Creatividad lista: ${finalPng}`);
}
