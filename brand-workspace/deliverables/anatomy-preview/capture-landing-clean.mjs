import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const AUDIT_DIR = join(ROOT, "brand-workspace", "deliverables", "audit");
const ARTIFACT_DIR = "C:/Users/DAVID/.gemini/antigravity/brain/dd1070e8-c00f-4cf9-828a-4495ecbed418";
const DRIVE = join(ROOT, ".agents", "skills", "anatomy", "scripts", "drive.mjs");
const PREVIEW = join(HERE, "landing-anatomy-preview.html");

function runDrive(width, height, actions, name) {
  const actFile = join(HERE, `actions-${name}.json`);
  writeFileSync(actFile, JSON.stringify(actions));
  console.log(`\n> Capturing ${name} (${width}x${height})...`);
  const res = spawnSync(
    process.execPath,
    [DRIVE, PREVIEW, "--width", String(width), "--height", String(height), "--scale", "1", "--actions", actFile],
    { cwd: ROOT, encoding: "utf8", stdio: "inherit" }
  );
  if ((res.status ?? 1) !== 0) throw new Error(`drive failed on ${name}`);
}

const out = (n) => join(AUDIT_DIR, n);

// 1. Desktop 1440px: Hero (with Navbar + #anatomia), Cut 00 KM/H, Servicios, Ecosistema+Respaldo, Footer
runDrive(
  1440,
  920,
  [
    ["wait", 800],
    ["shot", out("preview-landing-desktop-hero.png"), "body", 2, [0, 0, 1440, 860]],
    ["click", "#btn-test-cut"],
    ["wait", 1600],
    ["shot", out("preview-landing-desktop-hero-cut0kmh.png"), "body", 2, [0, 0, 1440, 860]],
    ["shot", out("preview-landing-desktop-servicios.png"), "#servicios", 1.5, [0, 0, 1440, 2036]],
    ["shot", out("preview-landing-desktop-ecosistema.png"), "#ecosistema", 2, [0, 0, 1440, 1465]],
    ["shot", out("preview-landing-desktop-footer.png"), "#contacto", 2, [0, 0, 1440, 630]],
  ],
  "desktop"
);

// 2. Mobile 390px: Hero (with Navbar) + Servicios
runDrive(
  390,
  1340,
  [
    ["wait", 800],
    ["shot", out("preview-landing-mobile-hero.png"), "body", 2, [0, 0, 390, 1320]],
    ["shot", out("preview-landing-mobile-servicios.png"), "#servicios", 1.5, [0, 0, 390, 3410]],
  ],
  "mobile"
);

// 3. Copy all clean PNGs + FigCraft Board 21 into artifact directory
const files = [
  "figcraft-v3-board21-landing-anatomy.png",
  "preview-landing-desktop-hero.png",
  "preview-landing-desktop-hero-cut0kmh.png",
  "preview-landing-desktop-servicios.png",
  "preview-landing-desktop-ecosistema.png",
  "preview-landing-desktop-footer.png",
  "preview-landing-mobile-hero.png",
  "preview-landing-mobile-servicios.png",
];
for (const f of files) {
  const src = out(f);
  if (existsSync(src)) {
    copyFileSync(src, join(ARTIFACT_DIR, f));
    console.log("Copied:", f);
  }
}
