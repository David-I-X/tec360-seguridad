import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, makeBench, TEC360_ANATOMY_CSS } from "./tec360-bench.mjs";
import { kitScript } from "../../../.agents/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

export function buildFig04Mecanica({ standalone = false } = {}) {
  const WIDTH = 620;
  const HEIGHT = 390;
  const PLATE = { x: -136, y: -70, w: 272, d: 140, r: 9 };

  const B = makeBench({
    width: WIDTH,
    height: HEIGHT,
    plate: PLATE,
    tallest: [
      [-86, -9, 44],
      [4, 12, 28],
      [104, -29, 34],
      [87, 23, 32],
    ],
    azimuth: 48,
    elevation: 31,
    pad: 24,
  });

  const { P, at, L, D } = B;

  // 1. Machined Bench Baseplate
  B.addBenchBase({
    ruler: { x: -122, y: 54, w: 164, d: 6.5, r: 1, step: 4, every: 5 },
    labelPlate: {
      x: 52,
      y: 52,
      w: 68,
      d: 9.5,
      r: 1.2,
      text: "13.8V · EXPRESS",
    },
  });

  // 2. Left Quadrant — Heavy-Duty 12V/13.8V Automotive Battery & Load Cradle (x: -122..-50, y: -48..32)
  const batTray = { x: -122, y: -48, w: 72, d: 80, r: 4 };
  B.addSlab("bat.tray", batTray, 0, 6, {
    tone: "lo",
    steps: 4,
    bevel: 0.6,
    extra: D(
      k.corners(batTray, 5).map(([x, y]) => at([x, y, 6])),
      { size: 0.45, tone: "mid" }
    ),
  });

  const batCase = { x: -114, y: -40, w: 56, d: 64, r: 3 };
  B.addSlab("bat.case", batCase, 6, 26, {
    tone: "mid",
    steps: 4,
    bevel: 0.8,
    inner:
      L(k.sideSeam(batCase, 25, P, 4), { tone: "lo" }) +
      L(k.sideSeam(batCase, 14, P, 4), { tone: "faint" }),
    extra: L(k.planOutline(k.insetPlan(batCase, 3), 32, P, 3), { tone: "lo" }),
  });

  // 6 Raised Cell Vent Caps (back 2 rows)
  for (const vx of [-102, -86, -70]) {
    for (const vy of [-30, -16]) {
      B.addCyl("bat.vent", vx, vy, 3.2, 32, 2.6, {
        tone: "lo",
        steps: 20,
        bevel: 0.25,
      });
    }
  }

  // Negative & Positive Lead Terminal Posts + Clamp Collars (front row)
  for (const [tx, isPos] of [
    [-100, false],
    [-72, true],
  ]) {
    B.addSlab("bat.clamp", { x: tx - 6, y: 4, w: 12, d: 12, r: 1.8 }, 32, 4.2, {
      tone: isPos ? "hi" : "mid",
      lit: isPos,
      steps: 3,
      bevel: 0.4,
    });
    B.addCyl("bat.post", tx, 10, 3.8, 36.2, 5.2, {
      tone: "hi",
      lit: isPos,
      steps: 24,
      bevel: 0.4,
    });
  }

  // 3. Center Stage — 13.8V / CCA Load Analyzer & Shunt Console (lit! x: -28..36, y: -44..40)
  const conPlinth = { x: -28, y: -44, w: 64, d: 84, r: 4 };
  B.addSlab("con.plinth", conPlinth, 0, 7, {
    tone: "mid",
    steps: 4,
    bevel: 0.7,
    inner: L(k.sideSeam(conPlinth, 3.5, P, 4), { tone: "faint" }),
    extra: D(
      k.corners(conPlinth, 5).map(([x, y]) => at([x, y, 7])),
      { size: 0.45, tone: "mid" }
    ),
  });

  // Rear Shunt Heatsink + 4 Machined Cooling Fin Slabs
  const shuntBlock = { x: -20, y: -38, w: 48, d: 26, r: 2.5 };
  B.addSlab("con.shunt", shuntBlock, 7, 13, {
    tone: "mid",
    steps: 3,
    bevel: 0.5,
  });
  for (let i = 0; i < 4; i++) {
    B.addSlab(
      "con.fin",
      { x: -17 + i * 11, y: -35, w: 5, d: 20, r: 0.8 },
      20,
      5.5,
      { tone: "hi", steps: 2, bevel: 0.25 }
    );
  }

  // Front Lit Volt / CCA Precision Dial Gauge (13.8V)
  B.addCyl("con.collar", 4, 14, 21, 7, 3.2, {
    tone: "hi",
    lit: true,
    steps: 52,
    bevel: 0.5,
  });
  B.addDialGauge("volt", 4, 14, 10.2, 18.8, 9.2, {
    needleAngle: 0.62,
    ticksCount: 40,
    every: 5,
    litNeedle: true,
    needleAttr: "data-volt-needle",
  });

  // 4. Back-Right — Stepped Brake-Pad Wear Gauge & Fluid Sight Cylinder (x: 56..120, y: -50..-6)
  const brakeBase = { x: 56, y: -50, w: 64, d: 44, r: 3.5 };
  B.addSlab("brake.base", brakeBase, 0, 6, {
    tone: "lo",
    steps: 4,
    bevel: 0.6,
  });
  // 3 Calibrated Wear Step Blocks (taller in back -> lower in front!)
  B.addSlab("brake.step10", { x: 61, y: -45, w: 28, d: 10, r: 1.4 }, 6, 18, {
    tone: "hi",
    steps: 3,
    bevel: 0.4,
  });
  B.addSlab("brake.step6", { x: 61, y: -33, w: 28, d: 10, r: 1.4 }, 6, 12.5, {
    tone: "mid",
    steps: 3,
    bevel: 0.4,
  });
  B.addSlab("brake.step3", { x: 61, y: -21, w: 28, d: 10, r: 1.4 }, 6, 7, {
    tone: "lo",
    steps: 3,
    bevel: 0.3,
  });
  // Fluid Level Sight Cylinder
  B.addCyl("brake.sight", 104, -28, 8.2, 6, 22, {
    tone: "hi",
    steps: 36,
    bevel: 0.5,
    inner: L(
      [12, 17, 22].map((z) => k.sideArc(104, -28, 8.2, z, P, 24)).join(""),
      { tone: "lo" }
    ),
    extra: L(k.ring(104, -28, 5.2, 28, P, 24), { tone: "lo" }),
  });

  // 5. Front-Right — Calibrated 1/2" Drive Torque Ratchet Head Fixture (x: 56..120, y: 2..42)
  const trqBase = { x: 56, y: 2, w: 64, d: 40, r: 3.5 };
  B.addSlab("trq.base", trqBase, 0, 7, {
    tone: "lo",
    steps: 4,
    bevel: 0.6,
    extra: D(
      k.corners(trqBase, 5).map(([x, y]) => at([x, y, 7])),
      { size: 0.45, tone: "mid" }
    ),
  });
  B.addCyl("trq.anvil", 88, 22, 13.5, 7, 5.5, {
    tone: "mid",
    steps: 40,
    bevel: 0.4,
  });
  B.addCyl("trq.ratchet", 88, 22, 10.6, 12.5, 7.5, {
    tone: "hi",
    steps: 40,
    bevel: 0.5,
    inner: L(k.knurl(88, 22, 10.6, 12.5, 20.0, 32, P, 0.05), { tone: "lo" }),
  });
  B.addCyl("trq.socket", 88, 22, 6.2, 20, 7.5, {
    tone: "hi",
    lit: true,
    steps: 28,
    bevel: 0.4,
    extra: L(k.ring(88, 22, 3.8, 27.5, P, 20), { tone: "lo" }),
  });

  // 6. Booster & Sensor Leads (Flush normal ends)
  B.addHarness(
    "lead.pos",
    [
      [-50, 14, 3.0],
      [-28, 14, 3.0],
    ],
    1.65,
    {
      tone: "hi",
      rings: { pitch: 2.2, twist: 1.0, cross: true, fade: [0.1, 0.55], tone: "lo" },
    }
  );
  B.addHarness(
    "lead.neg",
    [
      [-50, -22, 3.0],
      [-28, -22, 3.0],
    ],
    1.65,
    { tone: "mid" }
  );
  B.addHarness(
    "lead.brake",
    [
      [36, -26, 3.0],
      [56, -26, 3.0],
    ],
    1.2,
    { tone: "mid" }
  );
  B.addHarness(
    "lead.torque",
    [
      [36, 20, 3.0],
      [56, 20, 3.0],
    ],
    1.2,
    { tone: "mid" }
  );

  const label =
    "Estación móvil isométrica de diagnóstico 13.8 voltios y mecánica express: batería automotriz de doble borne sobre bandeja aislada a la izquierda, analizador de carga con disipador y voltímetro analógico en el centro, galgas escalonadas de pastillas de freno y nivel de fluido atrás a la derecha, y cabezal dinamométrico calibrado al frente.";

  return B.finish({ label, standalone });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { svg, P } = buildFig04Mecanica({ standalone: false });
  const live = `
  const P = ${JSON.stringify(P)};
  const needle = document.querySelector("[data-volt-needle] path");
  const readout = document.querySelector("[data-readout]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let clock = 0, last = 0;
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    clock += dt;
    const wave = Math.sin(clock * 1.4) * 0.14;
    const ang = 0.58 + wave;
    if (needle) {
      const tail = [4 - Math.sin(ang) * 2.4, 14 + Math.cos(ang) * 2.4];
      const tip = [4 + Math.sin(ang) * 14.4, 14 - Math.cos(ang) * 14.4];
      needle.setAttribute("d", lineOnTop(tail, tip, 19.55, P));
    }
    const v = (13.8 + wave * 2.4).toFixed(1);
    if (readout) readout.textContent = "CARGA ÓPTIMA · " + v + " V · TORQUE 108 N·M";
    requestAnimationFrame(tick);
  }
  if (!still.matches) requestAnimationFrame(tick);
  `;

  const plate = k.plateHtml({
    fig: "Fig. 04",
    title: "Diagnóstico 13.8V & Torque Express",
    hint: "Lectura de alternador, frenos y par",
    readout: "CARGA ÓPTIMA · 13.8 V · TORQUE 108 N·M",
    keys: [
      { mark: "lit", label: "Borne positivo, voltímetro de carga 13.8V y dado dinamométrico" },
      { mark: "raised", label: "Batería en cuna, disipador CCA, galgas de freno (10/6/3 mm) y mirilla" },
    ],
    caption:
      "Línea 03 · Mecánica Básica a Domicilio: asistencia express en menos de 30 minutos para batería, cambio de llanta con torque calibrado, aceite, filtros y pastillas de freno.",
    body: `<div class="iso-stage" tabindex="0" aria-label="Estación Móvil Mecánica Express">${svg}</div>`,
  });

  const outName = theme === "light" ? "fig04-mecanica-light.html" : "fig04-mecanica.html";
  const page = k
    .pageHtml({
      title: "Fig 04 — Estación Móvil Mecánica Tec360",
      theme,
      width: 700,
      body: `<style>${TEC360_ANATOMY_CSS}</style>${plate}`,
      script: kitScript() + live,
    })
    .replace('class="iso"', 'class="iso" data-accent="amber"');
  writeFileSync(join(HERE, outName), page);
  console.log("wrote", outName);
}
