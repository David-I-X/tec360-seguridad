import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, makeBench, TEC360_ANATOMY_CSS } from "./tec360-bench.mjs";
import { kitScript } from "../../../.agents/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

export function buildFig02Instalaciones({ standalone = false } = {}) {
  const WIDTH = 620;
  const HEIGHT = 390;
  const PLATE = { x: -136, y: -70, w: 272, d: 140, r: 9 };

  const B = makeBench({
    width: WIDTH,
    height: HEIGHT,
    plate: PLATE,
    tallest: [
      [-20, 3, 44],
      [96, -35, 42],
      [-95, 3, 32],
      [82, 22, 24],
    ],
    azimuth: 48,
    elevation: 30,
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
      text: "OEM PLUG · 0 CUT",
    },
  });

  // 2. Left Assembly — Factory Vehicle ECU Receptacle (x: -122..-68, y: -22..28)
  const ecuPed = { x: -122, y: -22, w: 54, d: 50, r: 4 };
  B.addSlab("ecu.pedestal", ecuPed, 0, 7.5, {
    tone: "lo",
    steps: 4,
    bevel: 0.6,
    extra: D(
      k.corners(ecuPed, 5).map(([x, y]) => at([x, y, 7.5])),
      { size: 0.45, tone: "mid" }
    ),
  });

  const ecuBody = { x: -114, y: -15, w: 40, d: 36, r: 3 };
  const ecuPins = D(
    [
      [-104, -7],
      [-94, -7],
      [-84, -7],
      [-104, 3],
      [-94, 3],
      [-84, 3],
      [-104, 13],
      [-94, 13],
      [-84, 13],
    ].map(([x, y]) => at([x, y, 27.5])),
    { size: 0.52, tone: "hi" }
  );
  B.addSlab("ecu.block", ecuBody, 7.5, 20, {
    tone: "mid",
    steps: 4,
    bevel: 0.7,
    inner: L(k.sideSeam(ecuBody, 17.5, P, 4), { tone: "faint" }),
    extra:
      L(k.planOutline(k.insetPlan(ecuBody, 3), 27.5, P, 3), { tone: "lo" }) + ecuPins,
  });

  // Turned Factory Strain-Relief Boot flush on left wall x = -114
  const bootF = G.frameOf([-114, 3, 17.5], [-1, 0, 0], [0, 1, 0], [0, 0, 1]);
  B.addTurned(
    "ecu.boot",
    bootF,
    [
      [0, 6.8],
      [3.0, 6.8],
      [3.02, 5.4],
      [6.2, 5.4],
      [6.22, 4.1],
      [9.5, 4.1],
    ],
    { tone: "mid", bevel: 0.3, smooth: false }
  );

  // 3. Center Assembly — Sliding OEM T-Harness Coupler on Twin Guide Rails (lit!)
  const railBed = { x: -68, y: -22, w: 96, d: 50, r: 3 };
  B.addSlab("rail.bed", railBed, 0, 5.5, {
    tone: "lo",
    steps: 4,
    bevel: 0.5,
    extra: L(k.planOutline(k.insetPlan(railBed, 2.5), 5.5, P, 3), { tone: "faint" }),
  });

  for (const ry of [-16, 17.5]) {
    B.addSlab("rail.bar", { x: -66, y: ry, w: 92, d: 4.5, r: 0.8 }, 5.5, 3.2, {
      tone: "mid",
      steps: 2,
      bevel: 0.3,
    });
  }

  // Right Carriage End-Stop
  B.addSlab("rail.stop", { x: 18, y: -18, w: 8, d: 42, r: 1.4 }, 8.7, 8.5, {
    tone: "mid",
    steps: 3,
    bevel: 0.4,
    extra: D([at([22, -10, 17.2]), at([22, 16, 17.2])], { size: 0.5, tone: "mid" }),
  });

  // Sliding Carriage Plate + 4 Corner Bushings
  const carPlate = { x: -48, y: -19, w: 54, d: 44, r: 3 };
  B.addSlab("coupler.saddle", carPlate, 8.7, 6.3, {
    tone: "mid",
    steps: 4,
    bevel: 0.5,
    attr: "data-oem-slide",
  });
  for (const [bx, by] of [
    [-45, -17],
    [-4, -17],
    [-45, 15],
    [-4, 15],
  ]) {
    B.addSlab("coupler.bushing", { x: bx, y: by, w: 7, d: 7, r: 1.2 }, 15, 2.8, {
      tone: "mid",
      steps: 2,
      bevel: 0.25,
      extra: D([at([bx + 3.5, by + 3.5, 17.8])], { size: 0.45, tone: "mid" }),
      attr: "data-oem-slide",
    });
  }

  // Lit OEM T-Coupler Core + Cam-Lock Knob
  const corePlan = { x: -39, y: -11, w: 36, d: 28, r: 2.6 };
  B.addSlab("coupler.core", corePlan, 15, 15, {
    tone: "hi",
    lit: true,
    steps: 4,
    bevel: 0.7,
    inner: L(k.sideSeam(corePlan, 22.5, P, 4), { tone: "faint" }),
    extra: L(k.planOutline(k.insetPlan(corePlan, 2.5), 30, P, 3), { tone: "lo" }),
    attr: "data-oem-slide",
  });
  B.addSlab("coupler.camBase", { x: -29, y: -5, w: 16, d: 16, r: 2 }, 30, 4.2, {
    tone: "hi",
    lit: true,
    steps: 3,
    bevel: 0.4,
    attr: "data-oem-slide",
  });
  B.addCyl("coupler.knob", -21, 3, 6.2, 34.2, 5.4, {
    tone: "hi",
    lit: true,
    steps: 36,
    bevel: 0.6,
    inner: L(k.knurl(-21, 3, 6.2, 34.2, 39.6, 32, P, 0.05), { tone: "lo" }),
    extra: L(k.lineOnTop([-24, 3], [-16.2, 3], 39.6, P), { tone: "hi", free: true }),
    attr: "data-oem-slide",
  });

  // 4. Back-Right — Sealed 4G L1/L5 + CAN Transceiver Rack (x: 44..120, y: -58..-12)
  const rackBase = { x: 44, y: -58, w: 74, d: 46, r: 4 };
  B.addSlab("rack.base", rackBase, 0, 6, {
    tone: "lo",
    steps: 4,
    bevel: 0.6,
  });
  const tray1 = { x: 52, y: -52, w: 58, d: 34, r: 2.5 };
  B.addSlab("rack.canTray", tray1, 6, 7, {
    tone: "mid",
    steps: 4,
    bevel: 0.5,
    inner: L(k.sideSeam(tray1, 9.5, P, 4), { tone: "faint" }),
  });
  for (const [px, py] of k.corners(tray1, 4.5)) {
    B.addCyl("rack.spacer", px, py, 2.2, 13, 3.5, {
      tone: "lo",
      steps: 18,
      bevel: 0,
      crease: "none",
    });
  }
  B.addSlab("rack.gpsTray", tray1, 16.5, 7, {
    tone: "hi",
    steps: 4,
    bevel: 0.6,
    extra:
      D(k.dotGrid(58, -46, 5, 3, 3.4, 23.5, P), { size: 0.42, tone: "lo" }) +
      L(k.planOutline(k.insetPlan(tray1, 2.4), 23.5, P, 3), { tone: "lo" }),
  });
  B.addCyl("rack.smaCollar", 96, -35, 4.4, 23.5, 3.2, {
    tone: "mid",
    steps: 24,
    bevel: 0.3,
  });
  B.addCyl("rack.smaMast", 96, -35, 2.8, 26.7, 11.5, {
    tone: "hi",
    steps: 24,
    bevel: 0.4,
    inner: L(k.sideArc(96, -35, 2.8, 32, P, 18), { tone: "faint" }),
  });

  // 5. Front-Right — Factory Bus Continuity & Integrity Gauge (x: 50..118, y: 0..44)
  const contPed = { x: 50, y: 0, w: 66, d: 44, r: 4 };
  B.addSlab("cont.pedestal", contPed, 0, 7, {
    tone: "lo",
    steps: 4,
    bevel: 0.6,
    extra: D(
      k.corners(contPed, 5).map(([x, y]) => at([x, y, 7])),
      { size: 0.45, tone: "mid" }
    ),
  });
  B.addDialGauge("cont", 83, 22, 7, 18.2, 9, {
    needleAngle: 0.66,
    ticksCount: 36,
    every: 6,
    litNeedle: true,
  });

  // 6. Shielded T-Harness Conduits (Flush normal ends, braided OEM wrap)
  B.addHarness(
    "harness.main",
    [
      [28, 16, 2.8],
      [50, 16, 2.8],
    ],
    1.55,
    {
      tone: "hi",
      rings: { pitch: 2.2, twist: 1.1, cross: true, fade: [0.1, 0.55], tone: "lo" },
    }
  );
  B.addHarness(
    "harness.tap",
    [
      [-8, -22, 2.8],
      [-8, -36, 2.8],
      [44, -36, 2.8],
    ],
    1.3,
    {
      bend: 7.5,
      tone: "mid",
      rings: { pitch: 2.5, twist: 1.0, cross: true, fade: [0.1, 0.55], tone: "lo" },
    }
  );
  B.addHarness(
    "harness.sense",
    [
      [83, -12, 3.0],
      [83, 0, 3.0],
    ],
    1.15,
    { tone: "mid" }
  );

  const label =
    "Banco isométrico de acoplamiento OEM Plug and Play sin cortes de cable original: conector maestro de ECU a la izquierda, carro acoplador en T deslizante con seguro rotativo en el centro, rack sellado 4G L1/L5 atrás a la derecha y medidor de integridad eléctrica al frente.";

  return B.finish({ label, standalone });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { svg, P } = buildFig02Instalaciones({ standalone: false });
  const live = `
  const P = ${JSON.stringify(P)};
  const stage = document.querySelector(".iso-stage");
  const slides = [...stage.querySelectorAll("[data-oem-slide]")];
  const readout = document.querySelector("[data-readout]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let target = 1, pos = 1, clock = 0, last = 0, touring = !still.matches;
  function render() {
    const dx = -18 * pos;
    const tr = translateAlong(P, [dx, 0, 0]);
    for (const el of slides) el.setAttribute("transform", tr);
    if (readout) readout.textContent = pos > 0.88 ? "ACOPLADO OEM · 0 CORTES · 100% GARANTÍA" : "ALINEANDO ARNES EN T · " + Math.round((1 - pos) * 18) + " MM";
  }
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    if (touring && !still.matches) {
      clock += dt;
      const c = clock % 5.4;
      target = c > 1.2 && c < 4.2 ? 1 : 0;
    }
    pos += (target - pos) * (still.matches ? 1 : 1 - Math.exp(-dt / 0.3));
    render();
    requestAnimationFrame(tick);
  }
  stage.addEventListener("click", () => { touring = false; target = target > 0.5 ? 0 : 1; });
  render();
  if (!still.matches) requestAnimationFrame(tick);
  `;

  const plate = k.plateHtml({
    fig: "Fig. 02",
    title: "Acoplamiento OEM Sin Empalmes",
    hint: "Clic para desacoplar / acoplar arnés",
    readout: "ACOPLADO OEM · 0 CORTES · 100% GARANTÍA",
    keys: [
      { mark: "lit", label: "Acoplador en T Plug & Play sobre rieles guía (cero empalmes)" },
      { mark: "raised", label: "Receptáculo original ECU, rack 4G L1/L5 y dial de continuidad" },
    ],
    caption:
      "Línea 01 · Instalaciones Vehiculares: cada módulo GPS 4G, Dashcam y bloqueo CAN-Bus se integra mediante conectores compatibles en línea para preservar intacta la garantía eléctrica.",
    body: `<div class="iso-stage" tabindex="0" role="button" aria-label="Banco OEM: clic para acoplar">${svg}</div>`,
  });

  const outName = theme === "light" ? "fig02-instalaciones-light.html" : "fig02-instalaciones.html";
  const page = k
    .pageHtml({
      title: "Fig 02 — Acoplamiento OEM Tec360",
      theme,
      width: 700,
      body: `<style>${TEC360_ANATOMY_CSS}</style>${plate}`,
      script: kitScript() + live,
    })
    .replace('class="iso"', 'class="iso" data-accent="violet"');
  writeFileSync(join(HERE, outName), page);
  console.log("wrote", outName);
}
