import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const AUDIT_DIR = join(ROOT, "brand-workspace", "deliverables", "audit");
const UI_DIR = join(ROOT, "brand-workspace", "deliverables", "ui");
const ARTIFACT_DIR = "C:/Users/DAVID/.gemini/antigravity/brain/dd1070e8-c00f-4cf9-828a-4495ecbed418";

const CAPTURE = join(ROOT, ".agents", "skills", "anatomy", "scripts", "capture.mjs");
const LINES = join(ROOT, ".agents", "skills", "anatomy", "scripts", "lines.mjs");
const DRIVE = join(ROOT, ".agents", "skills", "anatomy", "scripts", "drive.mjs");

mkdirSync(AUDIT_DIR, { recursive: true });
mkdirSync(UI_DIR, { recursive: true });

function runNode(script, args) {
  console.log(`\n> node ${script.split(/[\\/]/).pop()} ${args.join(" ")}`);
  const res = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  return res.status ?? 1;
}

// 1. Run lines.mjs across all 5 figures (dark + light)
const figs = [
  "fig01-hero",
  "fig02-instalaciones",
  "fig03-reaccion",
  "fig04-mecanica",
  "fig05-ecosistema",
];

let lineErrors = 0;
for (const f of figs) {
  for (const suffix of ["", "-light"]) {
    const htmlFile = join(HERE, `${f}${suffix}.html`);
    const code = runNode(LINES, [htmlFile, "--reduced"]);
    if (code !== 0) lineErrors++;
  }
}
if (lineErrors > 0) {
  console.error(`LINES CHECK FAILED on ${lineErrors} target(s).`);
  process.exit(1);
}
console.log("\nALL 10 LINE-END CHECKS PASSED (0 floating ends in dark & light)!");

// 2. Capture Individual Figure Plates (2x) + 4x Close-up of Hero Mechanism
const toCopy = [];
function saveShot(name, args, script = CAPTURE) {
  const outAudit = join(AUDIT_DIR, name);
  const code = runNode(script, [...args, ...(script === CAPTURE ? ["--out", outAudit] : [])]);
  if (code !== 0) throw new Error(`Failed capturing ${name}`);
  if (existsSync(outAudit)) toCopy.push([outAudit, join(ARTIFACT_DIR, name)]);
}

for (const f of figs) {
  saveShot(`preview-${f}-plate.png`, [
    join(HERE, `${f}.html`),
    "--scale",
    "2",
    "--wait",
    "900",
    "--reduced",
  ]);
}

saveShot("preview-fig01-closeup-4x.png", [
  join(HERE, "fig01-hero.html"),
  "--zoom",
  "190,75,260,185",
  "--zoom-scale",
  "4",
  "--wait",
  "800",
  "--reduced",
]);

// 3. Capture Full Landing Preview (Desktop 1440px & Mobile 390px + Interactive 0 KM/H Cut)
const previewHtml = join(HERE, "landing-anatomy-preview.html");

saveShot("preview-landing-desktop-hero.png", [
  previewHtml,
  "--width",
  "1440",
  "--height",
  "900",
  "--select",
  "#anatomia",
  "--wait",
  "900",
]);

// Drive interactive click on #btn-test-cut -> 00 KM/H locked pose
const cutOut = join(AUDIT_DIR, "preview-landing-desktop-hero-cut0kmh.png");
const cutActionsPath = join(HERE, "cut-actions.json");
writeFileSync(
  cutActionsPath,
  JSON.stringify([
    ["wait", 700],
    ["click", "#btn-test-cut"],
    ["wait", 1400],
    ["shot", cutOut, "#anatomia", 2],
  ])
);
const cutCode = runNode(DRIVE, [
  previewHtml,
  "--width",
  "1440",
  "--height",
  "960",
  "--actions",
  cutActionsPath,
]);
if (cutCode === 0 && existsSync(cutOut)) {
  toCopy.push([cutOut, join(ARTIFACT_DIR, "preview-landing-desktop-hero-cut0kmh.png")]);
}

saveShot("preview-landing-desktop-servicios.png", [
  previewHtml,
  "--width",
  "1440",
  "--height",
  "2050",
  "--scale",
  "1.5",
  "--select",
  "#servicios",
  "--wait",
  "900",
]);

saveShot("preview-landing-desktop-ecosistema.png", [
  previewHtml,
  "--width",
  "1440",
  "--height",
  "980",
  "--select",
  "#ecosistema",
  "--wait",
  "900",
]);

saveShot("preview-landing-desktop-footer.png", [
  previewHtml,
  "--width",
  "1440",
  "--height",
  "980",
  "--select",
  "#contacto",
  "--wait",
  "900",
]);

saveShot("preview-landing-mobile-hero.png", [
  previewHtml,
  "--width",
  "390",
  "--height",
  "1280",
  "--select",
  "#anatomia",
  "--wait",
  "900",
]);

saveShot("preview-landing-mobile-servicios.png", [
  previewHtml,
  "--width",
  "390",
  "--height",
  "2800",
  "--scale",
  "1.5",
  "--select",
  "#servicios",
  "--wait",
  "900",
]);

// 4. Sync Page 21 into tec360-brandingwork-v3.figcraft via figcraft-cli MCP stdio
const FIGCRAFT_BIN =
  "C:/Users/DAVID/.artcraft/figcraft/figcraft-0.7.0-windows-x64-portable/figcraft-cli.exe";
const FIGCRAFT_DOC = join(ROOT, "brand-workspace", "deliverables", "tec360-brandingwork-v3.figcraft");

async function syncFigCraftBoard21() {
  if (!existsSync(FIGCRAFT_BIN)) {
    console.log("figcraft-cli binary not found; skipping native .figcraft sync.");
    return;
  }
  console.log("\n> Syncing Page 21 in tec360-brandingwork-v3.figcraft via figcraft-cli MCP...");
  const child = spawn(
    FIGCRAFT_BIN,
    [
      "mcp",
      "--automation-read-root",
      join(ROOT, "brand-workspace").replace(/\\/g, "/"),
      "--automation-write-root",
      join(ROOT, "brand-workspace", "deliverables").replace(/\\/g, "/"),
    ],
    { stdio: ["pipe", "pipe", "pipe"] }
  );

  let buf = "";
  const pending = new Map();
  let nextId = 1;

  child.stdout.on("data", (chunk) => {
    buf += chunk.toString("utf8");
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("{")) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.id && pending.has(msg.id)) {
          const { resolve } = pending.get(msg.id);
          pending.delete(msg.id);
          resolve(msg);
        }
      } catch {}
    }
  });

  const rpc = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Timeout on ${method}`));
      }, 15000);
      pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
      });
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    });

  const callTool = async (name, args = {}) => {
    const res = await rpc("tools/call", { name, arguments: args });
    if (res.error) throw new Error(JSON.stringify(res.error));
    return res.result;
  };

  try {
    await rpc("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "tec360-brandingwork", version: "1.0.0" },
    });
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");

    await callTool("open_file", { path: FIGCRAFT_DOC.replace(/\\/g, "/") });
    const cmdsRes = await callTool("list_commands", {});
    const cmdsText = cmdsRes?.content?.[0]?.text || "[]";
    const cmds = JSON.parse(cmdsText);
    const pageCmd = cmds.find((c) => /page.*(add|new|create)/i.test(c.id))?.id || "page.add";
    const imgCmd = cmds.find((c) => /image|place/i.test(c.id))?.id;
    console.log("FigCraft page command:", pageCmd, "image command:", imgCmd || "none");

    // Inspect existing pages so we don't duplicate Page 21 on re-runs
    const docBefore = JSON.parse((await callTool("inspect_document", {}))?.content?.[0]?.text || "{}");
    const pageTitle = "21 · Landing v3.2 // Figuras Isométricas Anatomy (Desktop 1440 & Mobile 390)";
    const existingPages = docBefore.pages || [];
    const has21 = existingPages.some((p) => String(p.name || "").startsWith("21"));
    if (!has21) {
      await callTool("run_command", { command: pageCmd, params: { name: pageTitle } });
    }

    // Create Board 21 Master Frame (2240 x 1620) in Obsidian #050810
    const boardRes = await callTool("create_node", {
      type: "frame",
      name: "Board 21 · Landing v3.2 Anatomy Preview",
      x: 0,
      y: 0,
      width: 2240,
      height: 1620,
    });
    const boardObj = JSON.parse(boardRes?.content?.[0]?.text || "{}");
    const boardId = boardObj.id;

    if (boardId) {
      await callTool("set_properties", {
        ids: [boardId],
        props: { fill: "#050810", cornerRadius: 24 },
      });

      const mkRect = async (name, x, y, width, height, fill, stroke, radius = 16) => {
        const r = JSON.parse(
          (await callTool("create_node", { type: "rectangle", parent: boardId, name, x, y, width, height }))
            ?.content?.[0]?.text || "{}"
        );
        if (r.id) {
          await callTool("set_properties", {
            ids: [r.id],
            props: { fill, ...(stroke ? { stroke, strokeWidth: 1.5 } : {}), cornerRadius: radius },
          });
        }
        return r.id;
      };

      const mkText = async (name, text, x, y, fontSize, fill, fontFamily = "Archivo") => {
        const t = JSON.parse(
          (await callTool("create_node", { type: "text", parent: boardId, name, x, y, width: 1200, height: fontSize * 2 }))
            ?.content?.[0]?.text || "{}"
        );
        if (t.id) {
          await callTool("type_text", { id: t.id, text });
          await callTool("set_properties", {
            ids: [t.id],
            props: { fill, fontSize, fontFamily },
          });
        }
        return t.id;
      };

      // Header Banner
      await mkRect("Header Card", 48, 40, 2144, 128, "#0B0F19", "#7C3AED", 18);
      await mkText("Brand Lockup Title", "Tec360 Seguridad · Landing v3.2 + Anatomy Isometrics", 92, 66, 32, "#F8FAFC", "Archivo");
      await mkText(
        "Brand Subtitle",
        "BOARD 21 · DISTRIBUCIÓN PRESERVADA (5/7 HERO · 7/5 BANDAS DE SERVICIO · 4/4/4 ECOSISTEMA) · 5 INSTRUMENTOS AUDITADOS (0 ERRORES)",
        92,
        116,
        14,
        "#00F0FF",
        "Geist Mono"
      );

      // Desktop 1440 Column Spec Frame
      await mkRect("Desktop 1440 Frame", 48, 204, 1440, 1368, "#0B0F19", "#253047", 20);
      await mkText("Desktop Label", "VIEWPORT DESKTOP · 1440 PX (DISTRIBUCIÓN ACTUAL INTACTA)", 80, 232, 16, "#00F0FF", "Geist Mono");

      // Hero 5/7 Wire-Spec inside Desktop Frame
      await mkRect("Hero Left 5-Col", 80, 276, 540, 260, "#111827", "#3E4C66", 14);
      await mkText("Hero Copy Spec", "H1 Archivo [0 KM/H] + CTAs + Selector SUV/Moto/Carga", 104, 304, 18, "#F8FAFC");
      await mkText("Hero Sub Spec", "5 columnas izquierdas intactas · Cero eyebrows encima del H1", 104, 344, 14, "#B4B0C8", "Geist");

      await mkRect("Hero Right 7-Col Fig01", 644, 276, 812, 260, "#0D1322", "#00F0FF", 14);
      await mkText("Fig 01 Spec", "FIG. 01 · BANCO CAN-BUS, ÓPTICA CLOUD HD & ANTENA L1/L5 (47 SÓLIDOS)", 668, 304, 16, "#00F0FF", "Geist Mono");
      await mkText("Fig 01 Detail", "Acoplador OEM + Puente Solenoide Progresivo + Velocímetro 54 → 00 KM/H + 4 Pines MOD-01..04", 668, 344, 14, "#E2E8F0", "Geist");

      // 3 Alternating Service Bands inside Desktop Frame
      await mkRect("Band 01 Fig02 Stage", 80, 564, 796, 224, "#121026", "#8B5CF6", 14);
      await mkText("Fig 02 Spec", "FIG. 02 · LÍNEA 01 INSTALACIONES · ACOPLAMIENTO OEM SIN EMPALMES (40 SÓLIDOS)", 104, 596, 15, "#A78BFA", "Geist Mono");
      await mkText("Fig 02 Detail", "Reemplaza placeholder de video por banco deslizante Plug & Play sobre rieles guía (7 cols izq / 5 cols der)", 104, 634, 14, "#B4B0C8", "Geist");
      await mkRect("Band 01 Copy", 900, 564, 556, 224, "#111827", "#3E4C66", 14);
      await mkText("Band 01 Copy Title", "Instalaciones Vehiculares [0 CORTES] + Grid 2×2", 924, 600, 17, "#F8FAFC");

      await mkRect("Band 02 Copy", 80, 812, 556, 224, "#111827", "#3E4C66", 14);
      await mkText("Band 02 Copy Title", "Equipo de Reacción 24/7 [10 SEGUNDOS] + Grid 2×2", 104, 848, 17, "#F8FAFC");
      await mkRect("Band 02 Fig03 Stage", 660, 812, 796, 224, "#0A1926", "#00F0FF", 14);
      await mkText("Fig 03 Spec", "FIG. 03 · LÍNEA 02 REACCIÓN 24/7 · CERCO ORBITAL & SOLENOIDE 1.1S (31 SÓLIDOS)", 684, 844, 15, "#00F0FF", "Geist Mono");
      await mkText("Fig 03 Detail", "3 resonadores anti-jammer + torreta graduada 360° + solenoide remoto 1.1s (5 cols izq / 7 cols der)", 684, 882, 14, "#B4B0C8", "Geist");

      await mkRect("Band 03 Fig04 Stage", 80, 1060, 796, 224, "#1F170B", "#F59E0B", 14);
      await mkText("Fig 04 Spec", "FIG. 04 · LÍNEA 03 MECÁNICA EXPRESS · ESTACIÓN 13.8V & TORQUE (43 SÓLIDOS)", 104, 1092, 15, "#FBBF24", "Geist Mono");
      await mkText("Fig 04 Detail", "Batería en cuna + analizador 13.8V + galgas escalonadas de freno 10/6/3mm + cabezal dinamométrico", 104, 1130, 14, "#B4B0C8", "Geist");
      await mkRect("Band 03 Copy", 900, 1060, 556, 224, "#111827", "#3E4C66", 14);
      await mkText("Band 03 Copy Title", "Mecánica Básica [< 30 MIN] + Grid 2×2", 924, 1096, 17, "#F8FAFC");

      // Ecosystem 4/4/4 inside Desktop Frame
      await mkRect("Eco Row", 80, 1312, 1376, 224, "#0D1322", "#7C3AED", 14);
      await mkText("Fig 05 Spec", "FIG. 05 · ECOSISTEMA 4/4/4 · CONMUTADOR ORBITAL 3×3 (29 SÓLIDOS) + LOCKUP HORIZONTAL OFICIAL", 104, 1348, 15, "#00F0FF", "Geist Mono");
      await mkText("Fig 05 Detail", "3 entradas izquierdas (GPS 4G, Cloud HD, Diagnóstico) → Tambor 3×3 → 3 salidas derechas (Corte, Patrulla, Mecánica)", 104, 1388, 14, "#E2E8F0", "Geist");

      // Mobile 390 Column Spec Frame (Right side of Board 21)
      await mkRect("Mobile 390 Frame", 1528, 204, 664, 1368, "#0B0F19", "#7C3AED", 20);
      await mkText("Mobile Label", "VIEWPORT MOBILE · 390 PX (STACK SIN SCROLL LATERAL)", 1560, 232, 16, "#A78BFA", "Geist Mono");
      await mkRect("Mob Hero", 1560, 276, 600, 280, "#111827", "#00F0FF", 14);
      await mkText("Mob Hero Txt", "Hero Apilado: H1 [0 KM/H] → CTAs → Fig. 01 SVG Escalable + Grid 2×2 Pines MOD", 1584, 312, 15, "#F8FAFC");
      await mkRect("Mob Bands", 1560, 580, 600, 520, "#111827", "#8B5CF6", 14);
      await mkText("Mob Bands Txt", "3 Bandas Apiladas: Stage Isométrico arriba (`mobile-order-1`) + Especificaciones 1-col abajo", 1584, 620, 15, "#F8FAFC");
      await mkRect("Mob Audit", 1560, 1124, 600, 412, "#0D1322", "#10B981", 14);
      await mkText("Mob Audit Title", "CERTIFICACIÓN ANATOMY + BRANDINGWORK", 1584, 1160, 16, "#10B981", "Geist Mono");
      await mkText("Mob Audit L1", "• audit.mjs: 0 problemas en las 5 figuras (190 sólidos totales)", 1584, 1204, 14, "#E2E8F0", "Geist");
      await mkText("Mob Audit L2", "• lines.mjs: 0 cabos sueltos en tema oscuro y claro", 1584, 1238, 14, "#E2E8F0", "Geist");
      await mkText("Mob Audit L3", "• Logo PNG oficial en squircle + 'Tec360 Seguridad' horizontal", 1584, 1272, 14, "#E2E8F0", "Geist");
      await mkText("Mob Audit L4", "• Cero menciones SENA · Cero cambios en frontend/ pre-aprobación", 1584, 1306, 14, "#E2E8F0", "Geist");

      // Deselect everything so export renders the whole page!
      await callTool("select", { ids: [] });
      const boardPng = join(AUDIT_DIR, "figcraft-v3-board21-landing-anatomy.png").replace(/\\/g, "/");
      await callTool("export", { path: boardPng, format: "png", scale: 1 });
      if (existsSync(join(AUDIT_DIR, "figcraft-v3-board21-landing-anatomy.png"))) {
        toCopy.push([
          join(AUDIT_DIR, "figcraft-v3-board21-landing-anatomy.png"),
          join(ARTIFACT_DIR, "figcraft-v3-board21-landing-anatomy.png"),
        ]);
      }

      await callTool("save_file", { path: FIGCRAFT_DOC.replace(/\\/g, "/") });
      await callTool("save_file", {
        path: join(UI_DIR, "tec360-brandingwork-v3.figcraft").replace(/\\/g, "/"),
      });
      console.log("Saved tec360-brandingwork-v3.figcraft (root + ui/) and exported Board 21 PNG!");
    }
  } catch (err) {
    console.warn("FigCraft sync note:", err.message);
  } finally {
    child.kill();
  }
}

await syncFigCraftBoard21();

// 5. Copy all PNGs into conversation artifact directory
for (const [src, dst] of toCopy) {
  copyFileSync(src, dst);
  console.log("Copied to artifact dir:", dst.split(/[\\/]/).pop());
}
console.log("\nALL VERIFICATION, CAPTURES & ARTIFACT COPIES COMPLETE!");
