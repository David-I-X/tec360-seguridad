/**
 * Tec360 Seguridad — Generador Determinista de Láminas Corporativas, Kit Digital & Brand Book v3.0
 * Construye geometría SVG pura lista para compilar con VectorCraft y ensamblar con PdfCraft:
 *   1. Iconografía Táctica Oficial 24pt (6 módulos, 0 menciones a entidades externas)
 *   2. Kit Nativo Expo / Android Adaptive Icons & Splash (1024x1024)
 *   3. Kit Digital Social & Video: OpenGraph (1200x630), 3 Portadas 16:9 de Video Corto (1920x1080)
 *      y Credencial Oficial de Técnico Certificado (1080x1350)
 *   4. Manual de Identidad Corporativa & Sistema de Diseño v3.0 (8 Láminas 1600x1000 HD)
 */
import { writeFileSync, mkdirSync, rmSync, existsSync, copyFileSync } from "node:fs";
import path from "node:path";
import {
  T,
  PATH_TEC,
  PATH_360,
  PATH_SUB,
  buildMasterIsotipoGroup,
} from "./build-master-logo.mjs";

const F_DISP = "Bahnschrift";
const F_BODY = "Segoe UI";
const F_MONO = "Consolas";

function xmlEsc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInlineLockup(g, x, y, scale = 1, includeSub = true) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <g transform="translate(50.5 20) scale(0.429688)">${g.body}</g>
    <g transform="translate(2.5 -6)">
      <path d="${PATH_TEC}" fill="${g.palette.wordMain}"/>
      <path d="${PATH_360}" fill="${g.palette.word360}"/>
    </g>
    ${
      includeSub
        ? `<g transform="translate(7.2 -13.7) scale(0.960538)"><path d="${PATH_SUB}" fill="${g.palette.wordSub}"/></g>`
        : ""
    }
  </g>`;
}

function silkAuroraDefs(prefix) {
  return `
    <radialGradient id="${prefix}-aur-violet" cx="24%" cy="88%" r="58%">
      <stop offset="0%" stop-color="#7C3AED" stop-opacity="0.34"/>
      <stop offset="55%" stop-color="#3B82F6" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#050810" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${prefix}-aur-cyan" cx="82%" cy="18%" r="48%">
      <stop offset="0%" stop-color="#00F0FF" stop-opacity="0.20"/>
      <stop offset="55%" stop-color="#7C3AED" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#050810" stop-opacity="0"/>
    </radialGradient>
    <pattern id="${prefix}-grid" width="44" height="44" patternUnits="userSpaceOnUse">
      <path d="M 44 0 L 0 0 0 44" fill="none" stroke="#6366F1" stroke-opacity="0.06" stroke-width="1"/>
    </pattern>`;
}

function pageFrame({ pageNum, totalPages = 8, titleWhite, titleDual, bracketTag, defsExtra = "", children }) {
  const W = 1600;
  const H = 1000;
  const pfx = `bb-p${pageNum}`;
  const hdrLogo = buildMasterIsotipoGroup("dark-color", `${pfx}-hdr`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    ${silkAuroraDefs(pfx)}
    ${hdrLogo.defs}
    ${defsExtra}
  </defs>
  <rect width="${W}" height="${H}" fill="#050810"/>
  <rect width="${W}" height="${H}" fill="url(#${pfx}-aur-violet)"/>
  <rect width="${W}" height="${H}" fill="url(#${pfx}-aur-cyan)"/>
  <rect width="${W}" height="${H}" fill="url(#${pfx}-grid)"/>

  <!-- Barra Superior Editorial -->
  <g transform="translate(56 26) scale(0.058594)">${hdrLogo.body}</g>
  <text x="98" y="47" font-family="${F_MONO}" font-size="12" font-weight="700" letter-spacing="2" fill="#B4B0C8">TEC360 SEGURIDAD · MANUAL DE IDENTIDAD &amp; SISTEMA DE DISEÑO v3.0</text>
  <text x="1544" y="47" text-anchor="end" font-family="${F_MONO}" font-size="12" font-weight="700" letter-spacing="1.8" fill="#00F0FF">[PÁGINA 0${pageNum} / 0${totalPages}]</text>
  <line x1="56" y1="66" x2="1544" y2="66" stroke="#FFFFFF" stroke-opacity="0.09" stroke-width="1"/>

  <!-- Titular de Doble Luminancia + Énfasis entre Corchetes (Cero Kickers) -->
  <text x="56" y="124" font-family="${F_DISP}" font-size="38" font-weight="700" fill="#F8FAFC">
    ${xmlEsc(titleWhite)} <tspan font-weight="400" fill="#A39EB8">${xmlEsc(titleDual)} </tspan><tspan font-family="${F_DISP}" font-weight="700" fill="#00F0FF">${xmlEsc(bracketTag)}</tspan>
  </text>

  ${children}

  <!-- Pie Editorial -->
  <line x1="56" y1="946" x2="1544" y2="946" stroke="#FFFFFF" stroke-opacity="0.08" stroke-width="1"/>
  <text x="56" y="972" font-family="${F_MONO}" font-size="11" fill="#94A3B8">ORBITAL RADAR 360° V2 · INSTALACIONES · EQUIPO DE REACCIÓN 24/7 · MECÁNICA BÁSICA · TÉCNICOS CERTIFICADOS</text>
  <text x="1544" y="972" text-anchor="end" font-family="${F_MONO}" font-size="11" fill="#00F0FF">tec360seguridad.com · +57 305 215 6601</text>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SET DE 6 ICONOS TÁCTICOS OFICIALES (24x24, TRAZO 2PX, CERO SENA)
// ─────────────────────────────────────────────────────────────────────────────
export function buildOfficialIcons24() {
  return {
    "icon-gps-4g": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="#00F0FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="24" height="24" rx="5" fill="#050810" stroke="none"/><path d="M12 2.5a6.5 6.5 0 0 0-6.5 6.5c0 4.9 6.5 12.5 6.5 12.5s6.5-7.6 6.5-12.5A6.5 6.5 0 0 0 12 2.5Z"/><circle cx="12" cy="9" r="2.3" stroke="#8B5CF6"/></svg>`,
    "icon-engine-cut": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="#FF2A55" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="24" height="24" rx="5" fill="#050810" stroke="none"/><path d="M17.8 6.8a8 8 0 1 1-11.6 0"/><line x1="12" y1="3" x2="12" y2="11.5" stroke="#00F0FF"/></svg>`,
    "icon-dashcam-hd": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="#8B5CF6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="24" height="24" rx="5" fill="#050810" stroke="none"/><rect x="3.5" y="6.5" width="17" height="12" rx="2.5"/><circle cx="12" cy="12.5" r="3.2" stroke="#00F0FF"/><circle cx="17.2" cy="9.2" r="0.8" fill="#FF2A55" stroke="none"/></svg>`,
    "icon-reaction-24-7": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="#00F0FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="24" height="24" rx="5" fill="#050810" stroke="none"/><circle cx="12" cy="12" r="8.2" stroke="#8B5CF6"/><circle cx="12" cy="12" r="3.8"/><line x1="12" y1="2.5" x2="12" y2="5.2"/><line x1="12" y1="18.8" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5.2" y2="12"/><line x1="18.8" y1="12" x2="21.5" y2="12"/></svg>`,
    "icon-mechanics-express": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="24" height="24" rx="5" fill="#050810" stroke="none"/><path d="M14.7 6.3a4.5 4.5 0 0 0-5.8 5.8L4.3 16.7a1.6 1.6 0 0 0 2.3 2.3l4.6-4.6a4.5 4.5 0 0 0 5.8-5.8l-2.6 2.6-2.1-2.1 2.4-2.8Z"/><circle cx="18" cy="18" r="2" stroke="#10B981"/></svg>`,
    "icon-certified-tech": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="24" height="24" rx="5" fill="#050810" stroke="none"/><path d="M12 3 5 6v5.5c0 4.8 3 8.8 7 10 4-1.2 7-5.2 7-10V6l-7-3Z"/><path d="m9.2 12.2 2 2 3.8-4" stroke="#00F0FF"/></svg>`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ICONOS MÓVILES EXPO & ANDROID ADAPTIVE SAFE ZONE (1024x1024)
// ─────────────────────────────────────────────────────────────────────────────
export function buildMobileExpoSvgs() {
  const full = buildMasterIsotipoGroup("dark-color", "mob-full");
  const fg = buildMasterIsotipoGroup("dark-color", "mob-fg");
  const mono = buildMasterIsotipoGroup("mono-light", "mob-mono");
  const splash = buildMasterIsotipoGroup("dark-color", "mob-splash");

  // iOS App Store / Expo Master Icon (1024x1024 full-bleed square rx=0 para máscara del sistema operativo)
  const fullBleedIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <radialGradient id="mob-full-glow" cx="50%" cy="50%" r="58%">
      <stop offset="0%" stop-color="#7C3AED" stop-opacity="0.26"/>
      <stop offset="55%" stop-color="#00F0FF" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#050810" stop-opacity="0"/>
    </radialGradient>
    ${full.defs}
  </defs>
  <rect width="1024" height="1024" fill="#050810"/>
  <rect width="1024" height="1024" fill="url(#mob-full-glow)"/>
  <g transform="translate(96 96) scale(1.625)">${full.body}</g>
</svg>`;

  // Android Adaptive Icon: safe zone central = 66% (676px dentro de 1024px -> margen 212px, escala 600/512 = 1.171875)
  const adaptiveFgSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>${fg.defs}</defs>
  <g transform="translate(212 212) scale(1.171875)">${fg.body}</g>
</svg>`;

  const adaptiveMonoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <g transform="translate(212 212) scale(1.171875)">${mono.body}</g>
</svg>`;

  const adaptiveBgSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <radialGradient id="mob-bg-glow" cx="50%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#7C3AED" stop-opacity="0.28"/>
      <stop offset="55%" stop-color="#00F0FF" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#050810" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="#050810"/>
  <rect width="1024" height="1024" fill="url(#mob-bg-glow)"/>
</svg>`;

  const splashSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>${splash.defs}</defs>
  <g transform="translate(128 128) scale(1.5)">${splash.body}</g>
</svg>`;

  return { fullBleedIconSvg, adaptiveFgSvg, adaptiveMonoSvg, adaptiveBgSvg, splashSvg };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. TARJETA OPENGRAPH OFICIAL (1200x630) + 3 PORTADAS VIDEO CORTO + CREDENCIAL
// ─────────────────────────────────────────────────────────────────────────────
export function buildOgBannerSvg() {
  const W = 1200;
  const H = 630;
  const lk = buildMasterIsotipoGroup("dark-color", "og-lk");
  const heroIso = buildMasterIsotipoGroup("dark-color", "og-iso");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    ${silkAuroraDefs("og")}
    ${lk.defs}
    ${heroIso.defs}
  </defs>
  <rect width="${W}" height="${H}" fill="#050810"/>
  <rect width="${W}" height="${H}" fill="url(#og-aur-violet)"/>
  <rect width="${W}" height="${H}" fill="url(#og-aur-cyan)"/>
  <rect width="${W}" height="${H}" fill="url(#og-grid)"/>

  <!-- Marco Interior Esculpido -->
  <rect x="36" y="36" width="1128" height="558" rx="24" fill="#0B0F19" fill-opacity="0.72" stroke="#8B5CF6" stroke-opacity="0.28"/>
  <!-- Muesca Superior Derecha -->
  <path d="M 930 36 H 1164 V 84 H 954 Q 930 84 930 60 Z" fill="#050810" stroke="#8B5CF6" stroke-opacity="0.28"/>
  <circle cx="956" cy="60" r="5" fill="#10B981"/>
  <text x="970" y="65" font-family="${F_MONO}" font-size="13" font-weight="700" fill="#F8FAFC">OPERACIÓN 24/7 · COLOMBIA</text>

  <!-- Firma Oficial -->
  ${renderInlineLockup(lk, 52, 60, 0.44)}

  <!-- Titular Principal -->
  <text x="74" y="252" font-family="${F_DISP}" font-size="52" font-weight="700" fill="#F8FAFC">Control total sobre</text>
  <text x="74" y="310" font-family="${F_DISP}" font-size="52" font-weight="700" fill="#F8FAFC">tu vehículo. <tspan font-weight="400" fill="#A39EB8">Motor a</tspan></text>
  <text x="74" y="370" font-family="${F_DISP}" font-size="52" font-weight="700" fill="#00F0FF">[0 KM/H] <tspan font-weight="400" fill="#A39EB8">en un toque.</tspan></text>

  <text x="74" y="422" font-family="${F_BODY}" font-size="20" fill="#B4B0C8">Seguridad electrónica, reacción inmediata y asistencia con técnicos certificados.</text>

  <!-- 3 Píldoras de Líneas de Servicio -->
  <rect x="74" y="468" width="236" height="44" rx="22" fill="#111827" stroke="#8B5CF6" stroke-opacity="0.55"/>
  <circle cx="96" cy="490" r="5" fill="#8B5CF6"/>
  <text x="110" y="495" font-family="${F_BODY}" font-size="15" font-weight="600" fill="#F8FAFC">Instalaciones OEM</text>

  <rect x="324" y="468" width="256" height="44" rx="22" fill="#111827" stroke="#00F0FF" stroke-opacity="0.55"/>
  <circle cx="346" cy="490" r="5" fill="#00F0FF"/>
  <text x="360" y="495" font-family="${F_BODY}" font-size="15" font-weight="600" fill="#F8FAFC">Equipo de Reacción 24/7</text>

  <rect x="594" y="468" width="236" height="44" rx="22" fill="#111827" stroke="#F59E0B" stroke-opacity="0.55"/>
  <circle cx="616" cy="490" r="5" fill="#F59E0B"/>
  <text x="630" y="495" font-family="${F_BODY}" font-size="15" font-weight="600" fill="#F8FAFC">Mecánica Básica</text>

  <!-- Isotipo Monumental Derecho -->
  <rect x="868" y="156" width="252" height="252" rx="48" fill="#050810" stroke="#8B5CF6" stroke-opacity="0.38"/>
  <rect x="884" y="172" width="220" height="220" rx="36" fill="none" stroke="#00F0FF" stroke-opacity="0.18"/>
  <g transform="translate(894 182) scale(0.390625)">${heroIso.body}</g>
  <text x="994" y="444" text-anchor="middle" font-family="${F_MONO}" font-size="13" font-weight="700" fill="#00F0FF">+57 305 215 6601</text>
  <text x="994" y="466" text-anchor="middle" font-family="${F_MONO}" font-size="12" fill="#94A3B8">tec360seguridad.com</text>
</svg>`;
}

export function buildReelCoverSvg({ id, titleLine1, titleLine2, bracket, scope, duration, accent, secondAccent, bullets }) {
  const W = 1920;
  const H = 1080;
  const lk = buildMasterIsotipoGroup("dark-color", `rc-${id}-lk`);
  const iso = buildMasterIsotipoGroup("dark-color", `rc-${id}-iso`);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <radialGradient id="rc-${id}-glow1" cx="25%" cy="80%" r="55%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#050810" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="rc-${id}-glow2" cx="82%" cy="25%" r="48%">
      <stop offset="0%" stop-color="${secondAccent}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#050810" stop-opacity="0"/>
    </radialGradient>
    <pattern id="rc-${id}-grid" width="56" height="56" patternUnits="userSpaceOnUse">
      <path d="M 56 0 L 0 0 0 56" fill="none" stroke="#FFFFFF" stroke-opacity="0.04" stroke-width="1"/>
    </pattern>
    ${lk.defs}
    ${iso.defs}
  </defs>
  <rect width="${W}" height="${H}" fill="#050810"/>
  <rect width="${W}" height="${H}" fill="url(#rc-${id}-glow1)"/>
  <rect width="${W}" height="${H}" fill="url(#rc-${id}-glow2)"/>
  <rect width="${W}" height="${H}" fill="url(#rc-${id}-grid)"/>

  <!-- Marco Esculpido 16:9 con Muesca Oficial -->
  <rect x="56" y="56" width="1808" height="968" rx="32" fill="#0B0F19" fill-opacity="0.68" stroke="${accent}" stroke-opacity="0.38" stroke-width="2"/>
  <path d="M 1510 56 H 1864 V 126 H 1546 Q 1510 126 1510 90 Z" fill="#050810" stroke="${accent}" stroke-opacity="0.38" stroke-width="2"/>
  <circle cx="1552" cy="92" r="7" fill="${accent}"/>
  <text x="1574" y="98" font-family="${F_MONO}" font-size="20" font-weight="700" fill="#F8FAFC">REEL 16:9 · ${xmlEsc(duration)}</text>

  <!-- Firma Oficial -->
  ${renderInlineLockup(lk, 92, 92, 0.58)}

  <!-- Titular Cinematográfico (calibrado para cero colisión con el símbolo orbital derecho) -->
  <text x="120" y="416" font-family="${F_DISP}" font-size="72" font-weight="700" fill="#F8FAFC">${xmlEsc(titleLine1)}</text>
  <text x="120" y="504" font-family="${F_DISP}" font-size="72" font-weight="400" fill="#A39EB8">${xmlEsc(titleLine2)} <tspan font-weight="700" fill="${accent}">${xmlEsc(bracket)}</tspan></text>

  <!-- Píldora de Alcance (Debajo del titular — cero kickers arriba) -->
  <rect x="120" y="558" width="620" height="54" rx="27" fill="#111827" stroke="#FFFFFF" stroke-opacity="0.12"/>
  <circle cx="152" cy="585" r="7" fill="${accent}"/>
  <text x="174" y="592" font-family="${F_BODY}" font-size="22" font-weight="600" fill="#B4B0C8">${xmlEsc(scope)}</text>

  <!-- 3 Capacidades Clave -->
  ${bullets
    .map(
      (b, idx) => `
    <rect x="${120 + idx * 380}" y="684" width="356" height="96" rx="18" fill="#050810" stroke="${accent}" stroke-opacity="0.28"/>
    <text x="${148 + idx * 380}" y="726" font-family="${F_BODY}" font-size="22" font-weight="700" fill="#F8FAFC">${xmlEsc(b.label)}</text>
    <text x="${148 + idx * 380}" y="758" font-family="${F_MONO}" font-size="16" fill="${accent}">${xmlEsc(b.meta)}</text>`
    )
    .join("")}

  <!-- Símbolo Orbital & Play Central Derecho -->
  <rect x="1396" y="264" width="388" height="388" rx="78" fill="#050810" stroke="${accent}" stroke-opacity="0.45" stroke-width="2"/>
  <g transform="translate(1436 304) scale(0.6015625)">${iso.body}</g>

  <!-- Barra de Tiempo Inferior -->
  <text x="120" y="924" font-family="${F_BODY}" font-size="22" fill="#B4B0C8">Ejecutado por <tspan font-weight="700" fill="#F8FAFC">técnicos certificados</tspan> · Cobertura Nacional</text>
  <text x="1796" y="924" text-anchor="end" font-family="${F_MONO}" font-size="20" font-weight="700" fill="#F8FAFC">00:00 / ${xmlEsc(duration)}</text>
  <rect x="120" y="950" width="1676" height="10" rx="5" fill="#FFFFFF" fill-opacity="0.14"/>
  <rect x="120" y="950" width="460" height="10" rx="5" fill="${accent}"/>
</svg>`;
}

export function buildTechnicianCredentialSvg() {
  const W = 1080;
  const H = 1350;
  const lk = buildMasterIsotipoGroup("dark-color", "cred-lk");
  const iso = buildMasterIsotipoGroup("dark-color", "cred-iso");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    ${silkAuroraDefs("cred")}
    ${lk.defs}
    ${iso.defs}
  </defs>
  <rect width="${W}" height="${H}" fill="#050810"/>
  <rect width="${W}" height="${H}" fill="url(#cred-aur-violet)"/>
  <rect width="${W}" height="${H}" fill="url(#cred-aur-cyan)"/>

  <!-- Tarjeta Principal -->
  <rect x="64" y="64" width="952" height="1222" rx="40" fill="#0B0F19" stroke="#8B5CF6" stroke-opacity="0.42" stroke-width="2"/>
  <!-- Ranura de Lanyard Superior -->
  <rect x="460" y="98" width="160" height="20" rx="10" fill="#050810" stroke="#FFFFFF" stroke-opacity="0.18"/>

  <!-- Cabecera con Logo Oficial -->
  ${renderInlineLockup(lk, 226, 148, 0.78)}

  <line x1="124" y1="376" x2="956" y2="376" stroke="#FFFFFF" stroke-opacity="0.10"/>

  <!-- Marco de Fotografía de Especialista -->
  <rect x="360" y="424" width="360" height="360" rx="48" fill="#050810" stroke="#00F0FF" stroke-opacity="0.55" stroke-width="2"/>
  <g transform="translate(412 476) scale(0.5)">${iso.body}</g>
  <rect x="394" y="754" width="292" height="46" rx="23" fill="#10B981"/>
  <text x="540" y="784" text-anchor="middle" font-family="${F_MONO}" font-size="17" font-weight="700" fill="#050810">TÉCNICO CERTIFICADO</text>

  <!-- Datos del Especialista (Plantilla Corporativa) -->
  <text x="540" y="876" text-anchor="middle" font-family="${F_DISP}" font-size="46" font-weight="700" fill="#F8FAFC">ESPECIALISTA VERIFICADO</text>
  <text x="540" y="920" text-anchor="middle" font-family="${F_BODY}" font-size="22" fill="#B4B0C8">Instalaciones OEM · Reacción 24/7 · Mecánica Básica</text>

  <!-- Cajas de Validación -->
  <rect x="124" y="968" width="260" height="110" rx="20" fill="#111827" stroke="#FFFFFF" stroke-opacity="0.08"/>
  <text x="254" y="1010" text-anchor="middle" font-family="${F_BODY}" font-size="16" fill="#B4B0C8">ID OPERATIVO</text>
  <text x="254" y="1050" text-anchor="middle" font-family="${F_MONO}" font-size="26" font-weight="700" fill="#00F0FF">T360-0482</text>

  <rect x="410" y="968" width="260" height="110" rx="20" fill="#111827" stroke="#FFFFFF" stroke-opacity="0.08"/>
  <text x="540" y="1010" text-anchor="middle" font-family="${F_BODY}" font-size="16" fill="#B4B0C8">ANTECEDENTES</text>
  <text x="540" y="1050" text-anchor="middle" font-family="${F_MONO}" font-size="24" font-weight="700" fill="#10B981">100% AUDITADO</text>

  <rect x="696" y="968" width="260" height="110" rx="20" fill="#111827" stroke="#FFFFFF" stroke-opacity="0.08"/>
  <text x="826" y="1010" text-anchor="middle" font-family="${F_BODY}" font-size="16" fill="#B4B0C8">CALIFICACIÓN</text>
  <text x="826" y="1050" text-anchor="middle" font-family="${F_MONO}" font-size="26" font-weight="700" fill="#F59E0B">4.9 ★</text>

  <!-- Pie de Verificación en App -->
  <rect x="124" y="1116" width="832" height="112" rx="22" fill="#050810" stroke="#8B5CF6" stroke-opacity="0.30"/>
  <text x="164" y="1164" font-family="${F_BODY}" font-size="20" font-weight="600" fill="#F8FAFC">Verifica la identidad en vivo desde tu solicitud en Tec360</text>
  <text x="164" y="1198" font-family="${F_MONO}" font-size="17" fill="#00F0FF">tec360seguridad.com · Central 24/7: +57 305 215 6601</text>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MANUAL DE IDENTIDAD CORPORATIVA & BRAND BOOK v3.0 (8 LÁMINAS 1600x1000)
// ─────────────────────────────────────────────────────────────────────────────
export function buildBrandBook8Pages() {
  // PÁGINA 01: PORTADA MONUMENTAL
  const p1Lk = buildMasterIsotipoGroup("dark-color", "p1-lk");
  const p1Iso = buildMasterIsotipoGroup("dark-color", "p1-iso");
  const page01 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">
  <defs>
    ${silkAuroraDefs("bb-p1")}
    ${p1Lk.defs}
    ${p1Iso.defs}
  </defs>
  <rect width="1600" height="1000" fill="#050810"/>
  <rect width="1600" height="1000" fill="url(#bb-p1-aur-violet)"/>
  <rect width="1600" height="1000" fill="url(#bb-p1-aur-cyan)"/>
  <rect width="1600" height="1000" fill="url(#bb-p1-grid)"/>

  <!-- Marco Exterior con Muesca Superior Derecha -->
  <rect x="44" y="44" width="1512" height="912" rx="32" fill="#0B0F19" fill-opacity="0.62" stroke="#8B5CF6" stroke-opacity="0.32" stroke-width="1.5"/>
  <path d="M 1190 44 H 1556 V 104 H 1222 Q 1190 104 1190 72 Z" fill="#050810" stroke="#8B5CF6" stroke-opacity="0.32" stroke-width="1.5"/>
  <circle cx="1224" cy="74" r="5.5" fill="#00F0FF"/>
  <text x="1242" y="79" font-family="${F_MONO}" font-size="14" font-weight="700" fill="#F8FAFC">EDICIÓN OFICIAL v3.0 · [PÁG 01 / 08]</text>

  <!-- Firma Oficial Superior -->
  ${renderInlineLockup(p1Lk, 72, 82, 0.56)}

  <!-- Titular Monumental Estilo Landing -->
  <text x="96" y="410" font-family="${F_DISP}" font-size="68" font-weight="700" fill="#F8FAFC">Manual de Identidad</text>
  <text x="96" y="488" font-family="${F_DISP}" font-size="68" font-weight="700" fill="#F8FAFC">Corporativa. <tspan font-weight="400" fill="#A39EB8">Coherencia</tspan></text>
  <text x="96" y="566" font-family="${F_DISP}" font-size="68" font-weight="400" fill="#A39EB8">total en cada <tspan font-weight="700" fill="#00F0FF">[CANAL 360°]</tspan>.</text>

  <text x="96" y="636" font-family="${F_BODY}" font-size="22" fill="#B4B0C8">Sistema normativo unificado a partir del logotipo Orbital Radar 360° V2 y la landing</text>
  <text x="96" y="668" font-family="${F_BODY}" font-size="22" fill="#B4B0C8">Dark Immersive para Web, App Móvil, Videos Cortos, Redes y Material Operativo.</text>

  <!-- Tres Etiquetas de Líneas deNegocio -->
  <rect x="96" y="728" width="280" height="52" rx="14" fill="#111827" stroke="#8B5CF6" stroke-opacity="0.55"/>
  <circle cx="122" cy="754" r="6" fill="#8B5CF6"/>
  <text x="140" y="760" font-family="${F_BODY}" font-size="17" font-weight="600" fill="#F8FAFC">Instalaciones Vehiculares</text>

  <rect x="392" y="728" width="290" height="52" rx="14" fill="#111827" stroke="#00F0FF" stroke-opacity="0.55"/>
  <circle cx="418" cy="754" r="6" fill="#00F0FF"/>
  <text x="436" y="760" font-family="${F_BODY}" font-size="17" font-weight="600" fill="#F8FAFC">Equipo de Reacción 24/7</text>

  <rect x="698" y="728" width="276" height="52" rx="14" fill="#111827" stroke="#F59E0B" stroke-opacity="0.55"/>
  <circle cx="724" cy="754" r="6" fill="#F59E0B"/>
  <text x="742" y="760" font-family="${F_BODY}" font-size="17" font-weight="600" fill="#F8FAFC">Mecánica Básica Express</text>

  <!-- Símbolo Orbital Derecho con Anillos Técnicos -->
  <circle cx="1264" cy="496" r="244" fill="none" stroke="#8B5CF6" stroke-opacity="0.18" stroke-dasharray="6 8"/>
  <rect x="1074" y="306" width="380" height="380" rx="76" fill="#050810" stroke="#8B5CF6" stroke-opacity="0.42" stroke-width="2"/>
  <rect x="1096" y="328" width="336" height="336" rx="60" fill="none" stroke="#00F0FF" stroke-opacity="0.18"/>
  <g transform="translate(1110 342) scale(0.6015625)">${p1Iso.body}</g>

  <!-- Pie de Portada -->
  <line x1="96" y1="874" x2="1504" y2="874" stroke="#FFFFFF" stroke-opacity="0.09"/>
  <text x="96" y="912" font-family="${F_MONO}" font-size="13" fill="#B4B0C8">ESTÁNDAR HUMANO EXCLUSIVO: TÉCNICOS CERTIFICADOS AUDITADOS</text>
  <text x="1504" y="912" text-anchor="end" font-family="${F_MONO}" font-size="13" fill="#00F0FF">COLOMBIA · 2026 · TEC360 CREATIVE STUDIO</text>
</svg>`;

  // PÁGINA 02: ESENCIA, PRISMA DE MARCA & LAS 3 LÍNEAS DE SERVICIO
  const page02 = pageFrame({
    pageNum: 2,
    titleWhite: "Esencia corporativa.",
    titleDual: "Tres líneas de negocio y respaldo",
    bracketTag: "[CERTIFICADO]",
    children: `
    <!-- Fila Superior: Prisma de Identidad y Voz -->
    <rect x="56" y="162" width="728" height="252" rx="20" fill="#0B0F19" stroke="#8B5CF6" stroke-opacity="0.28"/>
    <text x="88" y="206" font-family="${F_DISP}" font-size="24" font-weight="700" fill="#F8FAFC">Arquetipo &amp; Propósito de Marca</text>
    <text x="88" y="242" font-family="${F_BODY}" font-size="16" fill="#B4B0C8">Tec360 Seguridad convierte el vehículo en un instrumento conectado en tiempo real</text>
    <text x="88" y="268" font-family="${F_BODY}" font-size="16" fill="#B4B0C8">y lleva asistencia experta hasta la puerta del cliente sin talleres ni esperas.</text>
    <rect x="88" y="294" width="204" height="38" rx="10" fill="#111827" stroke="#FFFFFF" stroke-opacity="0.08"/>
    <text x="190" y="318" text-anchor="middle" font-family="${F_BODY}" font-size="14" font-weight="600" fill="#00F0FF">Vanguardista &amp; Táctico</text>
    <rect x="306" y="294" width="204" height="38" rx="10" fill="#111827" stroke="#FFFFFF" stroke-opacity="0.08"/>
    <text x="408" y="318" text-anchor="middle" font-family="${F_BODY}" font-size="14" font-weight="600" fill="#8B5CF6">Precisión en 1 Toque</text>
    <rect x="524" y="294" width="228" height="38" rx="10" fill="#111827" stroke="#FFFFFF" stroke-opacity="0.08"/>
    <text x="638" y="318" text-anchor="middle" font-family="${F_BODY}" font-size="14" font-weight="600" fill="#10B981">100% Transparente</text>
    <text x="88" y="378" font-family="${F_MONO}" font-size="13" fill="#94A3B8">COBERTURA: MOTOCICLETAS · AUTOMÓVILES / SUV · TRANSPORTE DE CARGA</text>

    <rect x="816" y="162" width="728" height="252" rx="20" fill="#0B0F19" stroke="#10B981" stroke-opacity="0.32"/>
    <text x="848" y="206" font-family="${F_DISP}" font-size="24" font-weight="700" fill="#F8FAFC">Regla de Oro de Comunicación Humana</text>
    <text x="848" y="242" font-family="${F_BODY}" font-size="16" fill="#B4B0C8">Toda pieza web, móvil, comercial o audiovisual se refiere a nuestros especialistas</text>
    <text x="848" y="268" font-family="${F_BODY}" font-size="16" fill="#B4B0C8">única y exclusivamente como <tspan font-weight="700" fill="#F8FAFC">técnicos certificados</tspan>.</text>
    <rect x="848" y="294" width="664" height="44" rx="12" fill="#050810" stroke="#10B981" stroke-opacity="0.45"/>
    <text x="872" y="322" font-family="${F_MONO}" font-size="14" font-weight="700" fill="#10B981">✓ CORRECTO: "Instalación y asistencia con técnicos certificados y auditados"</text>
    <rect x="848" y="350" width="664" height="44" rx="12" fill="#190812" stroke="#FF2A55" stroke-opacity="0.45"/>
    <text x="872" y="378" font-family="${F_MONO}" font-size="14" font-weight="700" fill="#FF2A55">✕ PROHIBIDO: Aludir a entidades educativas o instituciones terceras externas</text>

    <!-- Fila Inferior: Las 3 Líneas Oficiales de Servicio -->
    <!-- Pilar 1 -->
    <rect x="56" y="446" width="476" height="466" rx="22" fill="#0B0F19" stroke="#8B5CF6" stroke-opacity="0.45" stroke-width="1.5"/>
    <circle cx="94" cy="492" r="8" fill="#8B5CF6"/>
    <text x="114" y="498" font-family="${F_MONO}" font-size="13" font-weight="700" fill="#8B5CF6">LÍNEA 01 · VIOLETA #8B5CF6</text>
    <text x="88" y="544" font-family="${F_DISP}" font-size="28" font-weight="700" fill="#F8FAFC">Instalaciones Vehiculares</text>
    <text x="88" y="578" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">Montaje limpio a domicilio con conectores OEM</text>
    <text x="88" y="602" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">originales, conservando la garantía eléctrica.</text>
    <rect x="88" y="630" width="412" height="44" rx="10" fill="#111827"/>
    <text x="108" y="657" font-family="${F_BODY}" font-size="15" font-weight="600" fill="#F8FAFC">• GPS 4G L1/L5 con detector anti-jammer</text>
    <rect x="88" y="684" width="412" height="44" rx="10" fill="#111827"/>
    <text x="108" y="711" font-family="${F_BODY}" font-size="15" font-weight="600" fill="#F8FAFC">• Dashcam HD con respaldo en nube 4G</text>
    <rect x="88" y="738" width="412" height="44" rx="10" fill="#111827"/>
    <text x="108" y="765" font-family="${F_BODY}" font-size="15" font-weight="600" fill="#F8FAFC">• Alarmas digitales y corte CAN-Bus</text>
    <rect x="88" y="818" width="260" height="52" rx="12" fill="#7C3AED"/>
    <text x="218" y="850" text-anchor="middle" font-family="${F_BODY}" font-size="15" font-weight="700" fill="#F8FAFC">Solicitar Instalación →</text>

    <!-- Pilar 2 -->
    <rect x="562" y="446" width="476" height="466" rx="22" fill="#0B0F19" stroke="#00F0FF" stroke-opacity="0.45" stroke-width="1.5"/>
    <circle cx="600" cy="492" r="8" fill="#00F0FF"/>
    <text x="620" y="498" font-family="${F_MONO}" font-size="13" font-weight="700" fill="#00F0FF">LÍNEA 02 · CIAN #00F0FF / #FF2A55</text>
    <text x="594" y="544" font-family="${F_DISP}" font-size="28" font-weight="700" fill="#F8FAFC">Equipo de Reacción 24/7</text>
    <text x="594" y="578" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">Inmovilización digital remota en segundos y</text>
    <text x="594" y="602" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">despliegue en campo con enlace policial.</text>
    <rect x="594" y="630" width="412" height="44" rx="10" fill="#111827"/>
    <text x="614" y="657" font-family="${F_BODY}" font-size="15" font-weight="600" fill="#F8FAFC">• Corte de motor seguro a [0 KM/H] (1.1 s)</text>
    <rect x="594" y="684" width="412" height="44" rx="10" fill="#111827"/>
    <text x="614" y="711" font-family="${F_BODY}" font-size="15" font-weight="600" fill="#F8FAFC">• Cerco satelital continuo cada 10 segundos</text>
    <rect x="594" y="738" width="412" height="44" rx="10" fill="#111827"/>
    <text x="614" y="765" font-family="${F_BODY}" font-size="15" font-weight="600" fill="#F8FAFC">• Coordinación directa con Policía Nacional</text>
    <rect x="594" y="818" width="280" height="52" rx="12" fill="#00F0FF"/>
    <text x="734" y="850" text-anchor="middle" font-family="${F_BODY}" font-size="15" font-weight="700" fill="#050810">Activar Equipo de Reacción →</text>

    <!-- Pilar 3 -->
    <rect x="1068" y="446" width="476" height="466" rx="22" fill="#0B0F19" stroke="#F59E0B" stroke-opacity="0.45" stroke-width="1.5"/>
    <circle cx="1106" cy="492" r="8" fill="#F59E0B"/>
    <text x="1126" y="498" font-family="${F_MONO}" font-size="13" font-weight="700" fill="#F59E0B">LÍNEA 03 · ÁMBAR #F59E0B</text>
    <text x="1100" y="544" font-family="${F_DISP}" font-size="28" font-weight="700" fill="#F8FAFC">Mecánica Básica Express</text>
    <text x="1100" y="578" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">Desvares y mantenimiento preventivo en casa,</text>
    <text x="1100" y="602" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">oficina o vía con seguimiento en el mapa.</text>
    <rect x="1100" y="630" width="412" height="44" rx="10" fill="#111827"/>
    <text x="1120" y="657" font-family="${F_BODY}" font-size="15" font-weight="600" fill="#F8FAFC">• Batería / inicio de corriente (&lt; 30 min)</text>
    <rect x="1100" y="684" width="412" height="44" rx="10" fill="#111827"/>
    <text x="1120" y="711" font-family="${F_BODY}" font-size="15" font-weight="600" fill="#F8FAFC">• Cambio de llantas y aceite + filtros</text>
    <rect x="1100" y="738" width="412" height="44" rx="10" fill="#111827"/>
    <text x="1120" y="765" font-family="${F_BODY}" font-size="15" font-weight="600" fill="#F8FAFC">• Pastillas de freno, kit de arrastre y luces</text>
    <rect x="1100" y="818" width="280" height="52" rx="12" fill="#F59E0B"/>
    <text x="1240" y="850" text-anchor="middle" font-family="${F_BODY}" font-size="15" font-weight="700" fill="#050810">Solicitar Mecánica Básica →</text>
    `,
  });

  // PÁGINA 03: CONSTRUCCIÓN GEOMÉTRICA DEL LOGOTIPO & ESCALA ÓPTICA
  const p3Iso = buildMasterIsotipoGroup("dark-color", "p3-iso");
  const p3Lk = buildMasterIsotipoGroup("dark-color", "p3-lk");
  const p3Fav = buildMasterIsotipoGroup("dark-color", "p3-fav", { faviconOptical: true });
  const page03 = pageFrame({
    pageNum: 3,
    titleWhite: "Símbolo Orbital Radar 360° V2.",
    titleDual: "Geometría en curvas y zona de",
    bracketTag: "[RESERVA 0.5R]",
    defsExtra: `${p3Iso.defs}${p3Lk.defs}${p3Fav.defs}`,
    children: `
    <!-- Panel Izquierdo: Plano Técnico del Isotipo -->
    <rect x="56" y="162" width="680" height="750" rx="22" fill="#0B0F19" stroke="#8B5CF6" stroke-opacity="0.32"/>
    <text x="88" y="206" font-family="${F_DISP}" font-size="24" font-weight="700" fill="#F8FAFC">Anatomía Vectorial Calibrada (V2 Definitiva)</text>

    <!-- Retícula de Construcción y Zona 0.5R -->
    <rect x="156" y="242" width="480" height="480" rx="24" fill="#050810" stroke="#00F0FF" stroke-opacity="0.28" stroke-dasharray="8 8"/>
    <text x="396" y="268" text-anchor="middle" font-family="${F_MONO}" font-size="12" fill="#00F0FF">MARGEN MÍNIMO DE EXCLUSIÓN LIBRE = 0.5R</text>
    <rect x="216" y="302" width="360" height="360" rx="72" fill="#0B0F19" stroke="#FFFFFF" stroke-opacity="0.12"/>
    <circle cx="396" cy="482" r="148" fill="none" stroke="#8B5CF6" stroke-opacity="0.22" stroke-dasharray="4 4"/>
    <line x1="216" y1="482" x2="576" y2="482" stroke="#FFFFFF" stroke-opacity="0.08"/>
    <line x1="396" y1="302" x2="396" y2="662" stroke="#FFFFFF" stroke-opacity="0.08"/>
    <g transform="translate(236 322) scale(0.625)">${p3Iso.body}</g>

    <text x="88" y="768" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">1. <tspan font-weight="700" fill="#F8FAFC">Anillo exterior biselado (45°):</tspan> Cobertura perimetral 360° en gradiente violeta-azul.</text>
    <text x="88" y="798" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">2. <tspan font-weight="700" fill="#F8FAFC">Contra-órbita y cono activo:</tspan> Pulso satelital L1/L5 con aire interno equilibrado.</text>
    <text x="88" y="828" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">3. <tspan font-weight="700" fill="#F8FAFC">Nodo cian (#00F0FF):</tspan> Vehículo localizado y protegido en tiempo real.</text>
    <text x="88" y="874" font-family="${F_MONO}" font-size="12" fill="#94A3B8">TRAZADO 100% EN CURVAS BÉZIER PURAS (CERO DEPENDENCIA DE FUENTES EXTERNAS)</text>

    <!-- Panel Derecho Superior: Proporción de Firma Horizontal -->
    <rect x="768" y="162" width="776" height="360" rx="22" fill="#0B0F19" stroke="#FFFFFF" stroke-opacity="0.10"/>
    <text x="800" y="206" font-family="${F_DISP}" font-size="24" font-weight="700" fill="#F8FAFC">Firma Horizontal Oficial (760 × 260 u)</text>
    <rect x="800" y="230" width="712" height="216" rx="18" fill="#050810" stroke="#8B5CF6" stroke-opacity="0.28"/>
    ${renderInlineLockup(p3Lk, 846, 232, 0.82)}
    <text x="800" y="486" font-family="${F_MONO}" font-size="13" fill="#00F0FF">ALTURA MÍNIMA DIGITAL: 28 PX   ·   IMPRESIÓN / BORDADO: 12 MM</text>

    <!-- Panel Derecho Inferior: Escala Multidispositivo (Web + Expo Mobile) -->
    <rect x="768" y="552" width="776" height="360" rx="22" fill="#0B0F19" stroke="#FFFFFF" stroke-opacity="0.10"/>
    <text x="800" y="596" font-family="${F_DISP}" font-size="24" font-weight="700" fill="#F8FAFC">Escala Óptica Web, PWA &amp; App Móvil Expo</text>

    <rect x="812" y="636" width="144" height="144" rx="32" fill="#050810" stroke="#8B5CF6" stroke-opacity="0.35"/>
    <g transform="translate(826 650) scale(0.2265625)">${p3Iso.body}</g>
    <text x="884" y="810" text-anchor="middle" font-family="${F_MONO}" font-size="13" font-weight="700" fill="#F8FAFC">1024 / 512 px</text>
    <text x="884" y="830" text-anchor="middle" font-family="${F_BODY}" font-size="13" fill="#B4B0C8">App Store / Play</text>

    <rect x="1014" y="660" width="96" height="96" rx="48" fill="#050810" stroke="#00F0FF" stroke-opacity="0.40"/>
    <g transform="translate(1030 676) scale(0.125)">${p3Iso.body}</g>
    <text x="1062" y="810" text-anchor="middle" font-family="${F_MONO}" font-size="13" font-weight="700" fill="#F8FAFC">Safe Zone 66%</text>
    <text x="1062" y="830" text-anchor="middle" font-family="${F_BODY}" font-size="13" fill="#B4B0C8">Android Adaptive</text>

    <rect x="1178" y="676" width="64" height="64" rx="14" fill="#050810" stroke="#FFFFFF" stroke-opacity="0.18"/>
    <g transform="translate(1184 682) scale(0.1015625)">${p3Iso.body}</g>
    <text x="1210" y="810" text-anchor="middle" font-family="${F_MONO}" font-size="13" font-weight="700" fill="#F8FAFC">192 / 180 px</text>
    <text x="1210" y="830" text-anchor="middle" font-family="${F_BODY}" font-size="13" fill="#B4B0C8">PWA / iOS Touch</text>

    <rect x="1332" y="692" width="32" height="32" rx="7" fill="#050810" stroke="#FFFFFF" stroke-opacity="0.22"/>
    <g transform="translate(1334 694) scale(0.054688)">${p3Fav.body}</g>
    <text x="1348" y="810" text-anchor="middle" font-family="${F_MONO}" font-size="13" font-weight="700" fill="#F8FAFC">32 px</text>
    <text x="1348" y="830" text-anchor="middle" font-family="${F_BODY}" font-size="13" fill="#B4B0C8">Favicon</text>

    <rect x="1454" y="700" width="16" height="16" rx="4" fill="#050810"/>
    <g transform="translate(1455 701) scale(0.027344)">${p3Fav.body}</g>
    <text x="1462" y="810" text-anchor="middle" font-family="${F_MONO}" font-size="13" font-weight="700" fill="#F8FAFC">16 px</text>
    <text x="1462" y="830" text-anchor="middle" font-family="${F_BODY}" font-size="13" fill="#B4B0C8">Óptico</text>

    <text x="800" y="880" font-family="${F_MONO}" font-size="12" fill="#94A3B8">SINCRONIZADO EN: frontend/public/icons/  &amp;  mobile/assets/images/</text>
    `,
  });

  // PÁGINA 04: VARIANTES CROMÁTICAS OFICIALES & USOS INCORRECTOS
  const p4Pri = buildMasterIsotipoGroup("dark-color", "p4-pri");
  const p4Lgt = buildMasterIsotipoGroup("light-color", "p4-lgt");
  const p4Inv = buildMasterIsotipoGroup("inverted", "p4-inv");
  const p4Ml = buildMasterIsotipoGroup("mono-light", "p4-ml");
  const p4Md = buildMasterIsotipoGroup("mono-dark", "p4-md");
  const page04 = pageFrame({
    pageNum: 4,
    titleWhite: "Versiones normativas.",
    titleDual: "Modos de fondo y usos",
    bracketTag: "[NO PERMITIDOS]",
    defsExtra: `${p4Pri.defs}${p4Lgt.defs}${p4Inv.defs}`,
    children: `
    <!-- 6 Tarjetas de Variantes Aprobadas -->
    <rect x="56" y="162" width="476" height="220" rx="20" fill="#050810" stroke="#8B5CF6" stroke-opacity="0.40"/>
    ${renderInlineLockup(p4Pri, 92, 184, 0.52)}
    <text x="84" y="356" font-family="${F_MONO}" font-size="12" font-weight="700" fill="#00F0FF">01 · PRIMARY DARK (USO PREFERENTE WEB / APP / VIDEO)</text>

    <rect x="562" y="162" width="476" height="220" rx="20" fill="#F8FAFC" stroke="#CBD5E1"/>
    ${renderInlineLockup(p4Lgt, 598, 184, 0.52)}
    <text x="590" y="356" font-family="${F_MONO}" font-size="12" font-weight="700" fill="#0F172A">02 · LIGHT COLOR (PAPELERÍA / FACTURAS / DOCUMENTOS)</text>

    <rect x="1068" y="162" width="476" height="220" rx="20" fill="#5B21B6"/>
    ${renderInlineLockup(p4Inv, 1104, 184, 0.52)}
    <text x="1096" y="356" font-family="${F_MONO}" font-size="12" font-weight="700" fill="#F8FAFC">03 · INVERTED VIOLET (FONDOS INSTITUCIONALES #5B21B6)</text>

    <rect x="56" y="406" width="476" height="220" rx="20" fill="#111827" stroke="#334155"/>
    ${renderInlineLockup(p4Ml, 92, 428, 0.52)}
    <text x="84" y="600" font-family="${F_MONO}" font-size="12" font-weight="700" fill="#F8FAFC">04 · MONO-LIGHT 1 TINTA (VINILO DE CORTE / BORDADO BLANCO)</text>

    <rect x="562" y="406" width="476" height="220" rx="20" fill="#E2E8F0"/>
    ${renderInlineLockup(p4Md, 598, 428, 0.52)}
    <text x="590" y="600" font-family="${F_MONO}" font-size="12" font-weight="700" fill="#0F172A">05 · MONO-DARK 1 TINTA (GRABADO LÁSER / SELLOS SECOS)</text>

    <rect x="1068" y="406" width="476" height="220" rx="20" fill="#0B0F19" stroke="#FFFFFF" stroke-opacity="0.12"/>
    <g transform="translate(1236 426) scale(0.2734375)">${p4Pri.body}</g>
    <text x="1096" y="600" font-family="${F_MONO}" font-size="12" font-weight="700" fill="#B4B0C8">06 · ISOTIPO AUTÓNOMO (AVATARES / NÚCLEO DE CIRCUITO)</text>

    <!-- Fila de Usos Incorrectos -->
    <rect x="56" y="658" width="1488" height="254" rx="22" fill="#0B0F19" stroke="#FF2A55" stroke-opacity="0.35"/>
    <text x="88" y="702" font-family="${F_DISP}" font-size="24" font-weight="700" fill="#F8FAFC">Usos Incorrectos Estrictamente Prohibidos</text>

    <!-- Regla 1 -->
    <rect x="88" y="726" width="336" height="154" rx="14" fill="#190812" stroke="#FF2A55" stroke-opacity="0.35"/>
    <g transform="translate(126 742) scale(0.36 0.22)">${renderInlineLockup(p4Pri, 0, 0, 1, false)}</g>
    <text x="108" y="858" font-family="${F_BODY}" font-size="14" font-weight="600" fill="#FF2A55">✕ No estirar ni deformar proporciones</text>

    <!-- Regla 2 -->
    <rect x="448" y="726" width="336" height="154" rx="14" fill="#00F0FF" fill-opacity="0.85"/>
    ${renderInlineLockup(p4Pri, 474, 742, 0.36, false)}
    <text x="468" y="858" font-family="${F_BODY}" font-size="14" font-weight="700" fill="#050810">✕ No aplicar versión oscura en fondos claros</text>

    <!-- Regla 3 -->
    <rect x="808" y="726" width="336" height="154" rx="14" fill="#190812" stroke="#FF2A55" stroke-opacity="0.35"/>
    <g transform="translate(976 786) rotate(-14) translate(-130 -40)">${renderInlineLockup(p4Ml, 0, 0, 0.34, false)}</g>
    <text x="828" y="858" font-family="${F_BODY}" font-size="14" font-weight="600" fill="#FF2A55">✕ No rotar ni alterar ángulo del radar</text>

    <!-- Regla 4 -->
    <rect x="1168" y="726" width="344" height="154" rx="14" fill="#190812" stroke="#FF2A55" stroke-opacity="0.35"/>
    <text x="1340" y="790" text-anchor="middle" font-family="Times New Roman" font-style="italic" font-size="32" font-weight="700" fill="#94A3B8">Tec-360 Seguridad</text>
    <text x="1188" y="858" font-family="${F_BODY}" font-size="14" font-weight="600" fill="#FF2A55">✕ No reescribir con otra fuente ni citar terceros</text>
    `,
  });

  // PÁGINA 05: ARQUITECTURA DEL COLOR & CONTRASTE MATEMÁTICO WCAG 2.2
  const swatchesTop = [
    { name: "Void Canvas", hex: "#050810", role: "Lienzo global inmersivo", ratio: "19.3:1 AAA", textFill: "#F8FAFC", stroke: "#334155" },
    { name: "Obsidian Panel", hex: "#0B0F19", role: "Tarjetas y reproductores", ratio: "17.8:1 AAA", textFill: "#F8FAFC", stroke: "#334155" },
    { name: "Slate Elevated", hex: "#111827", role: "Controles y badges", ratio: "15.6:1 AAA", textFill: "#F8FAFC", stroke: "#334155" },
    { name: "Violet Core", hex: "#7C3AED", role: "Botón primario & marca", ratio: "5.7:1 AA", textFill: "#F8FAFC", stroke: "#A78BFA" },
    { name: "Electric Violet", hex: "#8B5CF6", role: "Línea 01: Instalaciones", ratio: "5.4:1 AA", textFill: "#050810", stroke: "#C4B5FD" },
  ];
  const swatchesBottom = [
    { name: "Telemetry Cyan", hex: "#00F0FF", role: "Línea 02: Reacción & [TAGS]", ratio: "14.2:1 AAA", textFill: "#050810", stroke: "#67E8F9" },
    { name: "Tactical Amber", hex: "#F59E0B", role: "Línea 03: Mecánica Básica", ratio: "10.1:1 AAA", textFill: "#050810", stroke: "#FCD34D" },
    { name: "Armed Emerald", hex: "#10B981", role: "4G Activa / Certificados", ratio: "8.4:1 AAA", textFill: "#050810", stroke: "#6EE7B7" },
    { name: "Alert Crimson", hex: "#FF2A55", role: "Corte de Motor [0 KM/H]", ratio: "5.9:1 AA", textFill: "#F8FAFC", stroke: "#FDA4AF" },
    { name: "Light Support", hex: "#F8FAFC", role: "Modo impreso + #0F172A", ratio: "17.4:1 AAA", textFill: "#0F172A", stroke: "#CBD5E1" },
  ];

  const renderSwatchRow = (arr, y) =>
    arr
      .map((s, idx) => {
        const x = 56 + idx * 302;
        return `
      <rect x="${x}" y="${y}" width="280" height="236" rx="20" fill="#0B0F19" stroke="#FFFFFF" stroke-opacity="0.10"/>
      <rect x="${x + 14}" y="${y + 14}" width="252" height="122" rx="14" fill="${s.hex}" stroke="${s.stroke}" stroke-width="1.5"/>
      <text x="${x + 28}" y="${y + 52}" font-family="${F_MONO}" font-size="18" font-weight="700" fill="${s.textFill}">${s.hex}</text>
      <text x="${x + 28}" y="${y + 118}" font-family="${F_MONO}" font-size="12" font-weight="700" fill="${s.textFill}">${s.ratio}</text>
      <text x="${x + 20}" y="${y + 170}" font-family="${F_DISP}" font-size="20" font-weight="700" fill="#F8FAFC">${xmlEsc(s.name)}</text>
      <text x="${x + 20}" y="${y + 198}" font-family="${F_BODY}" font-size="14" fill="#B4B0C8">${xmlEsc(s.role)}</text>`;
      })
      .join("");

  const page05 = pageFrame({
    pageNum: 5,
    titleWhite: "Arquitectura cromática.",
    titleDual: "Contraste verificado WCAG 2.2",
    bracketTag: "[AA / AAA]",
    children: `
    ${renderSwatchRow(swatchesTop, 162)}
    ${renderSwatchRow(swatchesBottom, 420)}

    <!-- Barra Inferior: Textos Teñidos Lavanda & Auroras de Seda -->
    <rect x="56" y="682" width="1488" height="232" rx="22" fill="#0B0F19" stroke="#8B5CF6" stroke-opacity="0.30"/>
    <text x="88" y="726" font-family="${F_DISP}" font-size="24" font-weight="700" fill="#F8FAFC">Regla de Textos Secundarios Teñidos (Prohibido el Gris Neutro Apagado)</text>

    <rect x="88" y="750" width="446" height="132" rx="16" fill="#050810" stroke="#FFFFFF" stroke-opacity="0.10"/>
    <text x="114" y="790" font-family="${F_MONO}" font-size="16" font-weight="700" fill="#F8FAFC">#F8FAFC · PRIMARY LIGHT (19.3:1)</text>
    <text x="114" y="822" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">Afirmación principal en titulares, valores de</text>
    <text x="114" y="846" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">telemetría y etiquetas de controles activos.</text>

    <rect x="558" y="750" width="446" height="132" rx="16" fill="#050810" stroke="#FFFFFF" stroke-opacity="0.10"/>
    <text x="584" y="790" font-family="${F_MONO}" font-size="16" font-weight="700" fill="#B4B0C8">#B4B0C8 · LAVENDER BODY (9.4:1)</text>
    <text x="584" y="822" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">Párrafos descriptivos y subtítulos teñidos</text>
    <text x="584" y="846" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">sutilmente desde el violeta primario.</text>

    <rect x="1028" y="750" width="484" height="132" rx="16" fill="#050810" stroke="#FFFFFF" stroke-opacity="0.10"/>
    <text x="1054" y="790" font-family="${F_MONO}" font-size="16" font-weight="700" fill="#A39EB8">#A39EB8 · EDITORIAL DUAL-TONE (7.8:1)</text>
    <text x="1054" y="822" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">Segunda voz dentro de titulares Archivo para</text>
    <text x="1054" y="846" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">crear jerarquía sin cambiar de tamaño.</text>
    `,
  });

  // PÁGINA 06: SISTEMA TIPOGRÁFICO DE 3 VOCES (ARCHIVO + GEIST + GEIST MONO)
  const page06 = pageFrame({
    pageNum: 6,
    titleWhite: "Tres voces tipográficas.",
    titleDual: "Escala modular 1.250 y sintaxis",
    bracketTag: "[EN CORCHETES]",
    children: `
    <!-- Voz 1: Archivo Display -->
    <rect x="56" y="162" width="940" height="360" rx="22" fill="#0B0F19" stroke="#8B5CF6" stroke-opacity="0.35"/>
    <text x="88" y="204" font-family="${F_MONO}" font-size="13" font-weight="700" fill="#8B5CF6">VOZ 01 · DISPLAY EDITORIAL · ARCHIVO (WDTH 106–122 · PESOS 400 / 600 / 800)</text>
    <text x="88" y="274" font-family="${F_DISP}" font-size="48" font-weight="700" fill="#F8FAFC">Control total sobre tu vehículo.</text>
    <text x="88" y="332" font-family="${F_DISP}" font-size="48" font-weight="400" fill="#A39EB8">Detén el motor a <tspan font-weight="700" fill="#00F0FF">[0 KM/H]</tspan> hoy.</text>
    <line x1="88" y1="366" x2="964" y2="366" stroke="#FFFFFF" stroke-opacity="0.08"/>
    <text x="88" y="402" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">• <tspan font-weight="700" fill="#F8FAFC">Fórmula obligatoria:</tspan> Frase líder en #F8FAFC + continuación en #A39EB8 + foco en #00F0FF entre [CORCHETES].</text>
    <text x="88" y="432" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">• <tspan font-weight="700" fill="#F8FAFC">Cero kickers:</tspan> Nunca colocar etiquetas pequeñas ni numeraciones decorativas sobre un titular.</text>
    <text x="88" y="462" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">• <tspan font-weight="700" fill="#F8FAFC">No partir corchetes:</tspan> Aplicar siempre whitespace-nowrap al bloque [ENTRE CORCHETES].</text>
    <text x="88" y="494" font-family="${F_MONO}" font-size="13" fill="#00F0FF">TRACKING: -0.032em a -0.034em   ·   LINE-HEIGHT: 1.04 – 1.08</text>

    <!-- Escala Modular Derecha -->
    <rect x="1024" y="162" width="520" height="360" rx="22" fill="#0B0F19" stroke="#FFFFFF" stroke-opacity="0.10"/>
    <text x="1056" y="204" font-family="${F_MONO}" font-size="13" font-weight="700" fill="#00F0FF">ESCALA MODULAR 1.250 (MAJOR THIRD)</text>
    <text x="1056" y="256" font-family="${F_DISP}" font-size="38" font-weight="700" fill="#F8FAFC">Display · 61 px</text>
    <text x="1512" y="252" text-anchor="end" font-family="${F_MONO}" font-size="13" fill="#94A3B8">3.815 rem</text>
    <text x="1056" y="308" font-family="${F_DISP}" font-size="31" font-weight="700" fill="#F8FAFC">Heading 1 · 46 px</text>
    <text x="1512" y="304" text-anchor="end" font-family="${F_MONO}" font-size="13" fill="#94A3B8">2.850 rem</text>
    <text x="1056" y="354" font-family="${F_DISP}" font-size="25" font-weight="700" fill="#F8FAFC">Heading 2 · 31 px</text>
    <text x="1512" y="350" text-anchor="end" font-family="${F_MONO}" font-size="13" fill="#94A3B8">1.953 rem</text>
    <text x="1056" y="396" font-family="${F_BODY}" font-size="20" font-weight="600" fill="#F8FAFC">Heading 3 · 20 px</text>
    <text x="1512" y="394" text-anchor="end" font-family="${F_MONO}" font-size="13" fill="#94A3B8">1.250 rem</text>
    <text x="1056" y="436" font-family="${F_BODY}" font-size="16" fill="#B4B0C8">Body Copy · 16 px (line-height 1.62)</text>
    <text x="1512" y="434" text-anchor="end" font-family="${F_MONO}" font-size="13" fill="#94A3B8">1.000 rem</text>
    <text x="1056" y="476" font-family="${F_MONO}" font-size="14" font-weight="700" fill="#00F0FF">TELEMETRY · 14 PX TABULAR</text>
    <text x="1512" y="474" text-anchor="end" font-family="${F_MONO}" font-size="13" fill="#94A3B8">0.875 rem</text>

    <!-- Voz 2: Geist UI & Body -->
    <rect x="56" y="550" width="728" height="362" rx="22" fill="#0B0F19" stroke="#FFFFFF" stroke-opacity="0.10"/>
    <text x="88" y="594" font-family="${F_MONO}" font-size="13" font-weight="700" fill="#B4B0C8">VOZ 02 · INTERFAZ Y LECTURA · GEIST / INTER (PESOS 400 – 600)</text>
    <text x="88" y="642" font-family="${F_BODY}" font-size="20" font-weight="600" fill="#F8FAFC">Claridad inmediata en situaciones críticas</text>
    <text x="88" y="680" font-family="${F_BODY}" font-size="16" fill="#B4B0C8">Cuando un conductor necesita desvararse en vía o reportar una novedad de</text>
    <text x="88" y="706" font-family="${F_BODY}" font-size="16" fill="#B4B0C8">seguridad, la interfaz responde con calma, alto contraste y controles directos</text>
    <text x="88" y="732" font-family="${F_BODY}" font-size="16" fill="#B4B0C8">que nombran exactamente la acción que ejecutan.</text>
    <rect x="88" y="768" width="664" height="108" rx="14" fill="#050810" stroke="#FFFFFF" stroke-opacity="0.08"/>
    <text x="114" y="806" font-family="${F_BODY}" font-size="15" font-weight="600" fill="#F8FAFC">Medida óptima de párrafo: 54 a 65 caracteres por línea</text>
    <text x="114" y="838" font-family="${F_BODY}" font-size="14" fill="#B4B0C8">Evita renglones excesivamente anchos en escritorio y garantiza lectura veloz en móvil.</text>

    <!-- Voz 3: Geist Mono Tabular -->
    <rect x="816" y="550" width="728" height="362" rx="22" fill="#0B0F19" stroke="#00F0FF" stroke-opacity="0.32"/>
    <text x="848" y="594" font-family="${F_MONO}" font-size="13" font-weight="700" fill="#00F0FF">VOZ 03 · TELEMETRÍA VIVA · GEIST MONO (TABULAR-NUMS OBLIGATORIO)</text>
    <rect x="848" y="622" width="664" height="54" rx="12" fill="#050810" stroke="#FFFFFF" stroke-opacity="0.08"/>
    <text x="872" y="655" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">Coordenadas GPS</text>
    <text x="1488" y="655" text-anchor="end" font-family="${F_MONO}" font-size="16" font-weight="700" fill="#00F0FF">6.2088° N, 75.5659° W</text>

    <rect x="848" y="688" width="664" height="54" rx="12" fill="#050810" stroke="#FFFFFF" stroke-opacity="0.08"/>
    <text x="872" y="721" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">Estado Corte CAN-Bus</text>
    <text x="1488" y="721" text-anchor="end" font-family="${F_MONO}" font-size="16" font-weight="700" fill="#FF2A55">0 KM/H · CORTE 1.1S</text>

    <rect x="848" y="754" width="664" height="54" rx="12" fill="#050810" stroke="#FFFFFF" stroke-opacity="0.08"/>
    <text x="872" y="787" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">Tiempo Mecánica Express</text>
    <text x="1488" y="787" text-anchor="end" font-family="${F_MONO}" font-size="16" font-weight="700" fill="#F59E0B">&lt; 30 MIN EN SITIO</text>

    <rect x="848" y="820" width="664" height="54" rx="12" fill="#050810" stroke="#FFFFFF" stroke-opacity="0.08"/>
    <text x="872" y="853" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">Duración de Video Corto</text>
    <text x="1488" y="853" text-anchor="end" font-family="${F_MONO}" font-size="16" font-weight="700" fill="#10B981">REEL 16:9 · 00:18</text>
    `,
  });

  // PÁGINA 07: COMPONENTES FIRMA, VIDEO CORTO & DIRECCIÓN FOTOGRÁFICA
  const p7Iso = buildMasterIsotipoGroup("dark-color", "p7-iso");
  const page07 = pageFrame({
    pageNum: 7,
    titleWhite: "Lenguaje de interfaz y video.",
    titleDual: "Muescas esculpidas y estudio",
    bracketTag: "[OSCURO 16:9]",
    defsExtra: p7Iso.defs,
    children: `
    <!-- Izquierda: Anatomía del Reproductor de Video Corto de Servicio -->
    <rect x="56" y="162" width="840" height="460" rx="22" fill="#0B0F19" stroke="#8B5CF6" stroke-opacity="0.35"/>
    <text x="88" y="206" font-family="${F_DISP}" font-size="24" font-weight="700" fill="#F8FAFC">Estándar de Reproductor &amp; Portada de Video Corto (3 Servicios)</text>

    <!-- Mockup del Player -->
    <rect x="88" y="230" width="776" height="356" rx="20" fill="#050810" stroke="#00F0FF" stroke-opacity="0.38" stroke-width="1.5"/>
    <!-- Muesca Esculpida -->
    <path d="M 676 230 H 864 V 274 H 698 Q 676 274 676 252 Z" fill="#0B0F19" stroke="#00F0FF" stroke-opacity="0.38"/>
    <text x="702" y="257" font-family="${F_MONO}" font-size="13" font-weight="700" fill="#F8FAFC">REEL 16:9 · 00:22</text>

    <!-- Pill Estado -->
    <rect x="110" y="248" width="236" height="34" rx="17" fill="#0B0F19" stroke="#FFFFFF" stroke-opacity="0.14"/>
    <circle cx="128" cy="265" r="5" fill="#00F0FF"/>
    <text x="142" y="270" font-family="${F_BODY}" font-size="13" font-weight="600" fill="#F8FAFC">Vista previa / Video activo</text>

    <!-- Botón Play Central -->
    <circle cx="476" cy="396" r="44" fill="#0B0F19" stroke="#00F0FF" stroke-width="2"/>
    <polygon points="466,378 466,414 496,396" fill="#F8FAFC"/>

    <!-- Barra Scrubber Inferior -->
    <text x="112" y="544" font-family="${F_BODY}" font-size="14" font-weight="600" fill="#F8FAFC">02 · Fijación satelital L1/L5 y despliegue del equipo de reacción</text>
    <text x="840" y="544" text-anchor="end" font-family="${F_MONO}" font-size="13" fill="#B4B0C8">00:09 / 00:22</text>
    <rect x="112" y="558" width="728" height="6" rx="3" fill="#FFFFFF" fill-opacity="0.16"/>
    <rect x="112" y="558" width="310" height="6" rx="3" fill="#00F0FF"/>

    <!-- Derecha: Dirección Fotográfica y Colorimetría -->
    <rect x="928" y="162" width="616" height="460" rx="22" fill="#0B0F19" stroke="#FFFFFF" stroke-opacity="0.10"/>
    <text x="960" y="206" font-family="${F_DISP}" font-size="24" font-weight="700" fill="#F8FAFC">Dirección Fotográfica &amp; Video</text>
    <rect x="960" y="232" width="552" height="74" rx="14" fill="#050810" stroke="#8B5CF6" stroke-opacity="0.28"/>
    <text x="984" y="262" font-family="${F_BODY}" font-size="16" font-weight="700" fill="#F8FAFC">1. Estudio Automotriz Oscuro (#050810)</text>
    <text x="984" y="288" font-family="${F_BODY}" font-size="14" fill="#B4B0C8">Asfalto húmedo o bahía limpia sin fondos blancos de oficina.</text>

    <rect x="960" y="320" width="552" height="74" rx="14" fill="#050810" stroke="#00F0FF" stroke-opacity="0.28"/>
    <text x="984" y="350" font-family="${F_BODY}" font-size="16" font-weight="700" fill="#F8FAFC">2. Iluminación de Recorte por Servicio</text>
    <text x="984" y="376" font-family="${F_BODY}" font-size="14" fill="#B4B0C8">Rim-light violeta (instalación), cian (reacción) o ámbar (mecánica).</text>

    <rect x="960" y="408" width="552" height="74" rx="14" fill="#050810" stroke="#F59E0B" stroke-opacity="0.28"/>
    <text x="984" y="438" font-family="${F_BODY}" font-size="16" font-weight="700" fill="#F8FAFC">3. Autenticidad Técnica Real</text>
    <text x="984" y="464" font-family="${F_BODY}" font-size="14" fill="#B4B0C8">Guantes de nitrilo negros, arnés OEM y torquímetro digital.</text>

    <rect x="960" y="496" width="552" height="96" rx="14" fill="#111827"/>
    <text x="984" y="530" font-family="${F_MONO}" font-size="13" font-weight="700" fill="#10B981">PIPELINE PHOTOCRAFT (.PSD MULTICAPA):</text>
    <text x="984" y="556" font-family="${F_MONO}" font-size="12" fill="#B4B0C8">smartSharpen(65, 1.2) → curves() → hueSaturation(+8)</text>
    <text x="984" y="576" font-family="${F_MONO}" font-size="12" fill="#94A3B8">RUTA: brand-workspace/deliverables/imagery/</text>

    <!-- Fila Inferior: Set de 6 Iconos Tácticos + Circuito Radial -->
    <rect x="56" y="650" width="1488" height="262" rx="22" fill="#0B0F19" stroke="#FFFFFF" stroke-opacity="0.10"/>
    <text x="88" y="694" font-family="${F_DISP}" font-size="24" font-weight="700" fill="#F8FAFC">Iconografía Táctica Oficial (24 × 24 pt · Trazo Uniforme 2 px) &amp; Circuito de 1 px</text>

    ${[
      {
        label: "GPS 4G L1/L5",
        color: "#00F0FF",
        code: "icon-gps-4g",
        paths: `<path d="M12 2.5a6.5 6.5 0 0 0-6.5 6.5c0 4.9 6.5 12.5 6.5 12.5s6.5-7.6 6.5-12.5A6.5 6.5 0 0 0 12 2.5Z" stroke="#00F0FF"/><circle cx="12" cy="9" r="2.3" stroke="#8B5CF6"/>`,
      },
      {
        label: "Corte 0 km/h",
        color: "#FF2A55",
        code: "icon-engine-cut",
        paths: `<path d="M17.8 6.8a8 8 0 1 1-11.6 0" stroke="#FF2A55"/><line x1="12" y1="3" x2="12" y2="11.5" stroke="#00F0FF"/>`,
      },
      {
        label: "Dashcam HD",
        color: "#8B5CF6",
        code: "icon-dashcam-hd",
        paths: `<rect x="3.5" y="6.5" width="17" height="12" rx="2.5" stroke="#8B5CF6"/><circle cx="12" cy="12.5" r="3.2" stroke="#00F0FF"/><circle cx="17.2" cy="9.2" r="0.9" fill="#FF2A55" stroke="none"/>`,
      },
      {
        label: "Reacción 24/7",
        color: "#00F0FF",
        code: "icon-reaction-24-7",
        paths: `<circle cx="12" cy="12" r="8.2" stroke="#8B5CF6"/><circle cx="12" cy="12" r="3.8" stroke="#00F0FF"/><line x1="12" y1="2.5" x2="12" y2="5.2" stroke="#00F0FF"/><line x1="12" y1="18.8" x2="12" y2="21.5" stroke="#00F0FF"/><line x1="2.5" y1="12" x2="5.2" y2="12" stroke="#00F0FF"/><line x1="18.8" y1="12" x2="21.5" y2="12" stroke="#00F0FF"/>`,
      },
      {
        label: "Mecánica Básica",
        color: "#F59E0B",
        code: "icon-mechanics-express",
        paths: `<path d="M14.7 6.3a4.5 4.5 0 0 0-5.8 5.8L4.3 16.7a1.6 1.6 0 0 0 2.3 2.3l4.6-4.6a4.5 4.5 0 0 0 5.8-5.8l-2.6 2.6-2.1-2.1 2.4-2.8Z" stroke="#F59E0B"/><circle cx="18" cy="18" r="2" stroke="#10B981"/>`,
      },
      {
        label: "Certificados",
        color: "#10B981",
        code: "icon-certified-tech",
        paths: `<path d="M12 3 5 6v5.5c0 4.8 3 8.8 7 10 4-1.2 7-5.2 7-10V6l-7-3Z" stroke="#10B981"/><path d="m9.2 12.2 2 2 3.8-4" stroke="#00F0FF"/>`,
      },
    ]
      .map((ic, idx) => {
        const x = 88 + idx * 240;
        return `
      <rect x="${x}" y="722" width="216" height="156" rx="16" fill="#050810" stroke="${ic.color}" stroke-opacity="0.35"/>
      <rect x="${x + 80}" y="742" width="56" height="56" rx="14" fill="#0B0F19" stroke="${ic.color}" stroke-opacity="0.30"/>
      <g transform="translate(${x + 84} 746) scale(2)" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ic.paths}</g>
      <text x="${x + 108}" y="832" text-anchor="middle" font-family="${F_BODY}" font-size="15" font-weight="700" fill="#F8FAFC">${xmlEsc(ic.label)}</text>
      <text x="${x + 108}" y="856" text-anchor="middle" font-family="${F_MONO}" font-size="11" fill="#94A3B8">${ic.code}</text>`;
      })
      .join("")}
    `,
  });

  // PÁGINA 08: COHERENCIA MULTICANAL & MAPA MAESTRO DE ENTREGABLES
  const p8Lk = buildMasterIsotipoGroup("dark-color", "p8-lk");
  const page08 = pageFrame({
    pageNum: 8,
    titleWhite: "Ecosistema multicanal.",
    titleDual: "Un solo estándar de imagen en",
    bracketTag: "[PRODUCCIÓN]",
    defsExtra: p8Lk.defs,
    children: `
    <!-- 4 Tarjetas de Puntos de Contacto Sincronizados -->
    <rect x="56" y="162" width="728" height="240" rx="20" fill="#0B0F19" stroke="#8B5CF6" stroke-opacity="0.35"/>
    <text x="88" y="206" font-family="${F_MONO}" font-size="13" font-weight="700" fill="#8B5CF6">01 · WEB &amp; LANDING PRINCIPAL (NEXT.JS APP ROUTER)</text>
    <text x="88" y="244" font-family="${F_DISP}" font-size="26" font-weight="700" fill="#F8FAFC">Experiencia Dark Immersive + Simulador 360°</text>
    <text x="88" y="280" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">• Componente vectorial puro tec360-mark.tsx + offset global pt-24.</text>
    <text x="88" y="308" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">• Galería #servicios con 3 videos cortos 16:9 y rutas ?tipo=mecanica.</text>
    <text x="88" y="336" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">• Tarjeta OpenGraph 1200×630 activa en frontend/public/og-image.png.</text>
    <text x="88" y="374" font-family="${F_MONO}" font-size="12" fill="#00F0FF">ARCHIVOS: frontend/src/components/{hero,features,navbar,brand/tec360-mark}.tsx</text>

    <rect x="816" y="162" width="728" height="240" rx="20" fill="#0B0F19" stroke="#00F0FF" stroke-opacity="0.35"/>
    <text x="848" y="206" font-family="${F_MONO}" font-size="13" font-weight="700" fill="#00F0FF">02 · APLICACIÓN MÓVIL CLIENTES &amp; TÉCNICOS (EXPO / ANDROID &amp; IOS)</text>
    <text x="848" y="244" font-family="${F_DISP}" font-size="26" font-weight="700" fill="#F8FAFC">Iconos Adaptativos, Splash #050810 &amp; Tokens TS</text>
    <text x="848" y="280" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">• Adaptive Icon Android con zona segura del 66% + variante monocroma.</text>
    <text x="848" y="308" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">• Splash screen obsidiana (#050810) sincronizado en mobile/app.config.js.</text>
    <text x="848" y="336" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">• Módulo mobile/constants/brand-tokens.ts compartido con la web.</text>
    <text x="848" y="374" font-family="${F_MONO}" font-size="12" fill="#00F0FF">ARCHIVOS: mobile/assets/images/*  &amp;  mobile/constants/brand-tokens.ts</text>

    <rect x="56" y="428" width="728" height="240" rx="20" fill="#0B0F19" stroke="#F59E0B" stroke-opacity="0.35"/>
    <text x="88" y="472" font-family="${F_MONO}" font-size="13" font-weight="700" fill="#F59E0B">03 · REELS DE SERVICIO, REDES SOCIALES &amp; CAMPO</text>
    <text x="88" y="510" font-family="${F_DISP}" font-size="26" font-weight="700" fill="#F8FAFC">Portadas HD 1920×1080 &amp; Credencial Oficial</text>
    <text x="88" y="546" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">• 3 portadas maestras para los videos de Instalaciones, Reacción y Mecánica.</text>
    <text x="88" y="574" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">• Credencial verificable para técnicos certificados en visitas a domicilio.</text>
    <text x="88" y="602" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">• Pósters de estudio oscuro revelados en PhotoCraft (.psd multicapa).</text>
    <text x="88" y="640" font-family="${F_MONO}" font-size="12" fill="#F59E0B">ARCHIVOS: brand-workspace/deliverables/social/  &amp;  deliverables/imagery/</text>

    <rect x="816" y="428" width="728" height="240" rx="20" fill="#0B0F19" stroke="#10B981" stroke-opacity="0.35"/>
    <text x="848" y="472" font-family="${F_MONO}" font-size="13" font-weight="700" fill="#10B981">04 · GOBERNANZA DE DISEÑO &amp; CÓDIGO (SINGLE SOURCE OF TRUTH)</text>
    <text x="848" y="510" font-family="${F_DISP}" font-size="26" font-weight="700" fill="#F8FAFC">Tokens W3C, CSS, FigCraft &amp; PdfCraft</text>
    <text x="848" y="546" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">• /DESIGN.md v3.0 + brand-tokens.json + tec360-tokens.css sincronizados.</text>
    <text x="848" y="574" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">• Tablero editable tec360-design-system.figcraft y Brand Book PDF (8 págs).</text>
    <text x="848" y="602" font-family="${F_BODY}" font-size="15" fill="#B4B0C8">• Compilación determinista en 1 comando: run-brand-pipeline.mjs.</text>
    <text x="848" y="640" font-family="${F_MONO}" font-size="12" fill="#10B981">ARCHIVOS: DESIGN.md · brand-tokens.json · deliverables/editorial/</text>

    <!-- Cierre Institucional Inferior -->
    <rect x="56" y="696" width="1488" height="216" rx="24" fill="#050810" stroke="#8B5CF6" stroke-opacity="0.38"/>
    ${renderInlineLockup(p8Lk, 88, 720, 0.64)}
    <text x="1504" y="772" text-anchor="end" font-family="${F_DISP}" font-size="32" font-weight="700" fill="#F8FAFC">Control total en <tspan fill="#00F0FF">[UN TOQUE]</tspan>.</text>
    <text x="1504" y="814" text-anchor="end" font-family="${F_BODY}" font-size="17" fill="#B4B0C8">Central Operativa &amp; WhatsApp 24/7: +57 305 215 6601</text>
    <text x="1504" y="846" text-anchor="end" font-family="${F_MONO}" font-size="14" fill="#00F0FF">tracktec.soporte@gmail.com · tec360seguridad.com</text>
    `,
  });

  return [page01, page02, page03, page04, page05, page06, page07, page08];
}
