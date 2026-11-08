import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, A, makeBench, TEC360_ANATOMY_CSS } from "./tec360-bench.mjs";
import { kitScript } from "../../../.agents/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

export function buildFig01Hero({ standalone = false } = {}) {
  const WIDTH = 640;
  const HEIGHT = 400;
  const PLATE = { x: -138, y: -74, w: 276, d: 148, r: 9 };

  const B = makeBench({
    width: WIDTH,
    height: HEIGHT,
    plate: PLATE,
    tallest: [
      [3, 8, 69],
      [82, -39, 44],
      [-87, -41, 36],
      [85, 21, 28],
    ],
    azimuth: 44,
    elevation: 31,
    pad: 24,
  });

  const { P, at, L, D } = B;

  // 1. Machined Bench Baseplate + Ruler + Spec Plate
  B.addBenchBase({
    ruler: { x: -124, y: 58, w: 168, d: 6.5, r: 1, step: 4, every: 5 },
    labelPlate: {
      x: 54,
      y: 56,
      w: 68,
      d: 9.5,
      r: 1.2,
      text: "CAN 500K · 12V",
    },
  });

  // 2. MOD-03 — OEM Inline Coupler Rig (Front-Left: x -122..-42, y -6..42)
  const oemPlinth = { x: -122, y: -6, w: 80, d: 48, r: 3.5 };
  B.addSlab("oem.plinth", oemPlinth, 0, 5.5, {
    tone: "lo",
    steps: 4,
    bevel: 0.6,
    extra:
      L(k.planOutline(k.insetPlan(oemPlinth, 2.5), 5.5, P, 4), { tone: "faint" }) +
      D(
        k.corners(oemPlinth, 5).map(([x, y]) => at([x, y, 5.5])),
        { size: 0.45, tone: "mid" }
      ),
  });

  // Fixed ECU Receptacle Header (left)
  const ecuBlock = { x: -118, y: 2, w: 20, d: 32, r: 2 };
  const ecuSeam = L(k.sideSeam(ecuBlock, 13, P, 3), { tone: "faint" });
  const ecuPins = D(
    [
      [-111, 9],
      [-105, 9],
      [-111, 18],
      [-105, 18],
      [-111, 27],
      [-105, 27],
    ].map(([x, y]) => at([x, y, 21.5])),
    { size: 0.55, tone: "hi" }
  );
  B.addSlab("oem.ecuHeader", ecuBlock, 5.5, 16, {
    tone: "mid",
    steps: 3,
    bevel: 0.6,
    inner: ecuSeam,
    extra:
      L(k.planOutline(k.insetPlan(ecuBlock, 2.2), 21.5, P, 3), { tone: "lo" }) + ecuPins,
  });

  // Right Bulkhead Stop
  const oemStop = { x: -56, y: 2, w: 11, d: 32, r: 1.8 };
  B.addSlab("oem.stop", oemStop, 5.5, 13, {
    tone: "mid",
    steps: 3,
    bevel: 0.5,
    extra: D([at([-50.5, 8, 18.5]), at([-50.5, 28, 18.5])], { size: 0.5, tone: "mid" }),
  });

  // Twin Guide Rails
  for (const ry of [6.5, 25.5]) {
    B.addSlab(`oem.rail`, { x: -98, y: ry, w: 42, d: 4, r: 0.8 }, 5.5, 3, {
      tone: "mid",
      steps: 2,
      bevel: 0.3,
    });
  }

  // Sliding OEM Plug-and-Play Carriage
  const oemCarriage = { x: -91, y: 3.5, w: 28, d: 29, r: 2.2 };
  B.addSlab("oem.carriage", oemCarriage, 8.5, 10.5, {
    tone: "hi",
    steps: 4,
    bevel: 0.6,
    inner: L(k.sideSeam(oemCarriage, 13.5, P, 4), { tone: "faint" }),
    extra: L(k.planOutline(k.insetPlan(oemCarriage, 2.4), 19, P, 3), { tone: "lo" }),
    attr: 'data-mod-part="MOD-03"',
  });
  B.addSlab("oem.latch", { x: -85, y: 11.5, w: 16, d: 13, r: 1.5 }, 19, 3.6, {
    tone: "mid",
    steps: 3,
    bevel: 0.4,
  });
  B.addCyl("oem.thumb", -77, 18, 4.4, 22.6, 4.4, {
    tone: "hi",
    steps: 28,
    bevel: 0.4,
    inner: L(k.knurl(-77, 18, 4.4, 22.6, 27.0, 24, P, 0.05), { tone: "lo" }),
  });

  // 3. MOD-01 — Progressive CAN-Bus Governor & Fuel-Cut Solenoid (Center: x -28..34, y -18..36)
  const govPlinth = { x: -28, y: -18, w: 62, d: 54, r: 4 };
  B.addSlab("gov.plinth", govPlinth, 0, 7, {
    tone: "mid",
    steps: 5,
    bevel: 0.8,
    inner: L(k.sideSeam(govPlinth, 3.5, P, 5), { tone: "faint" }),
    extra:
      L(k.planOutline(k.insetPlan(govPlinth, 3), 7, P, 4), { tone: "faint" }) +
      D(
        k.corners(govPlinth, 5.5).map(([x, y]) => at([x, y, 7])),
        { size: 0.5, tone: "mid" }
      ),
  });

  // Twin Fuel/Ignition Contact Posts
  for (const px of [-11, 17]) {
    B.addCyl("gov.post", px, 9, 4.8, 7, 15, {
      tone: "mid",
      steps: 28,
      bevel: 0.3,
      inner: L(k.sideArc(px, 9, 4.8, 14.5, P, 22), { tone: "faint" }),
    });
    B.addCyl("gov.contact", px, 9, 5.6, 22, 2.8, {
      tone: "hi",
      steps: 28,
      bevel: 0.4,
    });
  }

  // Open Bridge Frame Columns (left & right)
  for (const colX of [-24, 24]) {
    B.addSlab("gov.col", { x: colX, y: 2, w: 6, d: 14, r: 1.2 }, 7, 39, {
      tone: "mid",
      steps: 3,
      bevel: 0.4,
    });
  }

  // Moving CAN-Bus Interlock Bridge (lit primary mechanism!)
  const bridgePlan = { x: -16, y: 3, w: 38, d: 12, r: 1.6 };
  B.addSlab("gov.bridge", bridgePlan, 29, 3.6, {
    tone: "hi",
    lit: true,
    steps: 3,
    bevel: 0.5,
    extra: D([at([-11, 9, 32.6]), at([17, 9, 32.6])], { size: 0.55, tone: "hi" }),
    attr: 'data-cut-mover data-mod-part="MOD-01"',
  });

  // Lower Plunger Stem (from bridge to yoke bottom)
  B.addCyl("gov.stemLo", 3, 9, 2.4, 32.6, 13.4, {
    tone: "hi",
    steps: 20,
    bevel: 0,
    crease: "none",
    attr: "data-cut-mover",
  });

  // Top Yoke Beam
  const yokePlan = { x: -26, y: 1, w: 58, d: 16, r: 2.2 };
  B.addSlab("gov.yoke", yokePlan, 46, 4.5, {
    tone: "mid",
    steps: 4,
    bevel: 0.5,
    extra:
      L(k.ring(3, 9, 3.6, 50.5, P, 20), { tone: "lo" }) +
      D([at([-21, 9, 50.5]), at([27, 9, 50.5])], { size: 0.5, tone: "mid" }),
  });

  // Upper Machined Return Bellows + Knurled Solenoid Cap (lit!)
  const bellowsF = G.frameOf([3, 9, 50.5], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  B.addTurned(
    "gov.bellows",
    bellowsF,
    [
      [0, 2.5],
      [1.4, 2.5],
      [1.42, 4.4],
      [2.7, 4.4],
      [2.72, 2.5],
      [4.1, 2.5],
      [4.12, 4.4],
      [5.4, 4.4],
      [5.42, 2.5],
      [6.8, 2.5],
      [6.82, 4.4],
      [8.0, 4.4],
      [8.02, 2.5],
      [9.0, 2.5],
    ],
    {
      tone: "mid",
      bevel: 0.25,
      smooth: false,
      attr: "data-cut-bellows",
    }
  );

  B.addCyl("gov.cap", 3, 9, 9.6, 59.5, 6.5, {
    tone: "hi",
    lit: true,
    steps: 44,
    bevel: 0.9,
    inner:
      L(k.sideArc(3, 9, 9.6, 60.5, P, 44), { tone: "faint" }) +
      L(k.knurl(3, 9, 9.6, 60.5, 66.0, 48, P, 0.05), { tone: "lo" }),
    extra: L(k.ring(3, 9, 6.8, 66, P, 36), { tone: "lo" }),
    attr: "data-cut-mover",
  });

  // 4. Speedometer Telemetry Dial Gauge (Front-Right: x 54..118, y -6..42)
  const gaugePed = { x: 54, y: -6, w: 64, d: 48, r: 4 };
  B.addSlab("speed.pedestal", gaugePed, 0, 7.5, {
    tone: "lo",
    steps: 5,
    bevel: 0.7,
    extra: D(
      k.corners(gaugePed, 5).map(([x, y]) => at([x, y, 7.5])),
      { size: 0.45, tone: "mid" }
    ),
  });
  B.addCyl("speed.collar", 86, 18, 22, 7.5, 2.8, {
    tone: "mid",
    steps: 52,
    bevel: 0.4,
  });
  B.addDialGauge("speed", 86, 18, 10.3, 19.8, 9.5, {
    needleAngle: 0.74,
    ticksCount: 45,
    every: 5,
    needleAttr: "data-speed-needle",
    litNeedle: true,
  });

  // 5. MOD-02 — Dual Cloud HD Optical Turret (Back-Left: x -118..-58, y -62..-22)
  const camBase = { x: -118, y: -62, w: 60, d: 40, r: 3.5 };
  B.addSlab("cam.base", camBase, 0, 6, {
    tone: "lo",
    steps: 4,
    bevel: 0.6,
    extra: D(
      k.corners(camBase, 5).map(([x, y]) => at([x, y, 6])),
      { size: 0.45, tone: "mid" }
    ),
  });
  const camTicks = k.radialTicks(-88, -42, 11.5, 24, 6, 11, [1.0, 2.0], P);
  B.addCyl("cam.turret", -88, -42, 12.5, 6, 5, {
    tone: "mid",
    steps: 36,
    bevel: 0.4,
    extra:
      L(k.ring(-88, -42, 11.5, 11, P, 36), { tone: "faint" }) +
      L(camTicks.minor, { tone: "lo" }) +
      L(camTicks.major, { tone: "mid" }),
  });
  const camBody = { x: -99, y: -52, w: 22, d: 20, r: 2.8 };
  B.addSlab("cam.housing", camBody, 11, 18, {
    tone: "hi",
    steps: 4,
    bevel: 0.6,
    inner: L(k.sideSeam(camBody, 20, P, 4), { tone: "faint" }),
    extra: D([at([-94, -42, 29]), at([-82, -42, 29])], { size: 0.45, tone: "mid" }),
    attr: 'data-mod-part="MOD-02"',
  });
  // Turned Optical Lens Barrel flush on front face y = -32 of cam.housing!
  const camFrame = G.frameOf([-88, -32, 20], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const lensRings =
    L(G.circleOf(camFrame, 12.5, 4.6, P, 32), { tone: "mid" }) +
    L(G.circleOf(camFrame, 12.5, 2.6, P, 24), { tone: "hi" });
  const barrelRibs = k.fadedSvg(
    G.ribsOf(camFrame, 1.2, 6.2, 7.2, 20, P, { fade: [0.08, 0.48], seams: true }),
    { tone: "lo" }
  );
  B.addTurned(
    "cam.lens",
    camFrame,
    [
      [0, 7.2],
      [6.8, 7.2],
      [6.82, 6.0],
      [12.5, 6.0],
    ],
    {
      tone: "hi",
      bevel: 0.4,
      inner: barrelRibs,
      extra: lensRings,
    }
  );

  // 6. MOD-04 — Dual-Band L1/L5 Ceramic Antenna & Anti-Jammer Trap (Back-Right: x 48..118, y -62..-20)
  const rfBase = { x: 48, y: -62, w: 70, d: 42, r: 4 };
  B.addSlab("rf.base", rfBase, 0, 6, {
    tone: "lo",
    steps: 4,
    bevel: 0.6,
    extra:
      D(k.dotGrid(54, -56, 4, 3, 3.2, 6, P), { size: 0.42, tone: "lo" }) +
      D(
        k.corners(rfBase, 5).map(([x, y]) => at([x, y, 6])),
        { size: 0.45, tone: "mid" }
      ),
  });
  // L5 Lower Ceramic Patch
  const l5Plan = { x: 60, y: -55, w: 46, d: 28, r: 3 };
  B.addSlab("rf.l5Patch", l5Plan, 6, 5.5, {
    tone: "mid",
    steps: 4,
    bevel: 0.5,
    inner: L(k.sideSeam(l5Plan, 8.8, P, 4), { tone: "faint" }),
  });
  // Dielectric Isolator
  B.addSlab("rf.isolator", { x: 65, y: -51, w: 36, d: 20, r: 2.2 }, 11.5, 3, {
    tone: "lo",
    steps: 3,
    bevel: 0.2,
  });
  // L1 Upper Active Patch
  const l1Plan = { x: 67, y: -49, w: 32, d: 16, r: 2 };
  B.addSlab("rf.l1Patch", l1Plan, 14.5, 5, {
    tone: "hi",
    steps: 3,
    bevel: 0.5,
    extra:
      L(k.planOutline(k.insetPlan(l1Plan, 2), 19.5, P, 3), { tone: "lo" }) +
      D(
        k.corners(l1Plan, 3.5).map(([x, y]) => at([x, y, 19.5])),
        { size: 0.45, tone: "hi" }
      ),
    attr: 'data-mod-part="MOD-04"',
  });
  // Tuned Helix Mast + Analytic Radome Cap
  B.addCyl("rf.mastCollar", 83, -41, 5.2, 19.5, 3, {
    tone: "mid",
    steps: 28,
    bevel: 0.3,
  });
  const domeR = 3.8;
  const domeH = 14;
  const domeKnots = [[0, domeR], [10, domeR]];
  for (let i = 1; i <= 12; i++) {
    const t = i / 12;
    const s = 10 + t * domeH * 0.28;
    const r = domeR * Math.sqrt(Math.max(0, 1 - t * t));
    domeKnots.push([s, r, 1]);
  }
  const mastF = G.frameOf([83, -41, 22.5], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const domeTop = 10 + domeH * 0.28;
  const radiusFn = (s) => {
    if (s <= 10) return domeR;
    const u = Math.min(1, Math.max(0, (s - 10) / (domeTop - 10)));
    return domeR * Math.sqrt(Math.max(0, 1 - u * u));
  };
  const slopeFn = (s) => {
    if (s <= 10) return 0;
    const span = domeTop - 10;
    const u = Math.min(0.999, Math.max(0, (s - 10) / span));
    return (-domeR * u) / (span * Math.sqrt(Math.max(1e-5, 1 - u * u)));
  };
  B.addTurned("rf.radome", mastF, domeKnots, {
    tone: "hi",
    bevel: 0,
    radius: radiusFn,
    slope: slopeFn,
    inner: L(G.arcOf(mastF, 5, domeR, P) + G.arcOf(mastF, 10, domeR, P), { tone: "faint" }),
  });

  // 7. Precision Bench Harnesses (Flush on flat port walls, wide XY bends, braided OEM wrap)
  // Harness 1: OEM Plinth right wall (x = -42) -> Governor Plinth left wall (x = -28)
  B.addHarness(
    "bus.oem",
    [
      [-42, 22, 2.8],
      [-28, 22, 2.8],
    ],
    1.5,
    {
      tone: "hi",
      rings: { pitch: 2.2, twist: 1.1, cross: true, fade: [0.1, 0.55], tone: "lo" },
    }
  );

  // Harness 2: Governor Plinth right wall (x = 34) -> Speedometer Pedestal left wall (x = 54)
  B.addHarness(
    "bus.speed",
    [
      [34, 20, 3.2],
      [54, 20, 3.2],
    ],
    1.4,
    {
      tone: "mid",
      rings: { pitch: 2.6, twist: 0, cross: false, fade: [0.12, 0.55], tone: "lo" },
    }
  );

  // Harness 3: Governor back wall (y = -18, x = -12) -> Dashcam right wall (x = -58, y = -40)
  B.addHarness(
    "bus.cam",
    [
      [-12, -18, 2.6],
      [-12, -40, 2.6],
      [-58, -40, 2.6],
    ],
    1.15,
    { bend: 7.5, tone: "mid" }
  );

  // Harness 4: Governor back wall (y = -18, x = 14) -> RF Shield left wall (x = 48, y = -40)
  B.addHarness(
    "bus.rf",
    [
      [14, -18, 2.6],
      [14, -40, 2.6],
      [48, -40, 2.6],
    ],
    1.15,
    { bend: 7.5, tone: "mid" }
  );

  const label =
    "Banco isométrico de bloqueo digital CAN-Bus y telemetría vehicular 360 grados: acoplador OEM sin empalmes a la izquierda, puente solenoide progresivo de corte de motor en el centro, velocímetro analógico calibrado de 54 a 0 kilómetros por hora a la derecha, torreta óptica Cloud HD atrás a la izquierda y antena cerámica doble banda L1/L5 atrás a la derecha.";

  return B.finish({ label, standalone });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { svg, P } = buildFig01Hero({ standalone: false });
  const live = `
  const P = ${JSON.stringify(P)};
  const stage = document.querySelector(".iso-stage");
  const movers = [...stage.querySelectorAll("[data-cut-mover]")];
  const spring = stage.querySelector("[data-cut-spring]");
  const needle = stage.querySelector("[data-speed-needle] path");
  const readout = document.querySelector("[data-readout]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let target = 0, pos = 0, clock = 0, last = 0, touring = !still.matches;
  function render() {
    const dz = -4.2 * pos;
    const tr = translateAlong(P, [0, 0, dz]);
    for (const m of movers) m.setAttribute("transform", tr);
    if (spring) {
      let d = "";
      const top = 59.5 + dz - 0.8;
      for (let i = 0; i < 5; i++) d += ring(3, 9, 4.8, 51.4 + ((top - 51.4) * (i + 0.5)) / 5, P, 24);
      spring.setAttribute("d", d);
    }
    if (needle) {
      const ang = 0.74 * (1 - pos) + (-0.78) * pos;
      const tail = [86 - Math.sin(ang) * 2.4, 18 + Math.cos(ang) * 2.4];
      const tip = [86 + Math.sin(ang) * 15.4, 18 - Math.cos(ang) * 15.4];
      needle.setAttribute("d", lineOnTop(tail, tip, 19.95, P));
    }
    const kmh = Math.round(54 * (1 - pos));
    if (readout) readout.textContent = pos > 0.92 ? "BLOQUEO SEGURO · 00 KM/H" : "TELEMETRÍA ACTIVA · " + String(kmh).padStart(2, "0") + " KM/H";
  }
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    if (touring && !still.matches) {
      clock += dt;
      const c = clock % 5.6;
      target = c > 2.2 && c < 4.4 ? 1 : 0;
    }
    pos += (target - pos) * (still.matches ? 1 : 1 - Math.exp(-dt / 0.28));
    render();
    requestAnimationFrame(tick);
  }
  stage.addEventListener("click", () => { touring = false; target = target > 0.5 ? 0 : 1; });
  render();
  if (!still.matches) requestAnimationFrame(tick);
  `;

  const plate = k.plateHtml({
    fig: "Fig. 01",
    title: "Banco CAN-Bus & Telemetría 360°",
    hint: "Clic para simular corte progresivo",
    readout: "TELEMETRÍA ACTIVA · 54 KM/H",
    keys: [
      { mark: "lit", label: "Puente solenoide CAN-Bus & aguja de desaceleración segura (54 → 0 km/h)" },
      { mark: "raised", label: "Acoplador OEM Plug & Play, óptica Cloud HD y arreglo cerámico L1/L5" },
    ],
    caption:
      "Arquitectura física integrada de Tec360 Seguridad: el acoplador OEM se inserta en línea sin cortar cables de fábrica, mientras el gobernador CAN-Bus ejecuta desaceleración progresiva hasta 0 km/h.",
    body: `<div class="iso-stage" tabindex="0" role="button" aria-label="Banco CAN-Bus Tec360: clic para probar corte de motor">${svg}</div>`,
  });

  const outName = theme === "light" ? "fig01-hero-light.html" : "fig01-hero.html";
  const page = k
    .pageHtml({
      title: "Fig 01 — Banco CAN-Bus Tec360",
      theme,
      width: 720,
      body: `<style>${TEC360_ANATOMY_CSS}</style>${plate}`,
      script: kitScript() + live,
    })
    .replace('class="iso"', 'class="iso" data-accent="cyan"');
  writeFileSync(join(HERE, outName), page);
  console.log("wrote", outName);
}
