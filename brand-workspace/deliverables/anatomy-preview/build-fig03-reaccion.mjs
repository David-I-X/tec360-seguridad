import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, makeBench, TEC360_ANATOMY_CSS } from "./tec360-bench.mjs";
import { kitScript } from "../../../.agents/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

export function buildFig03Reaccion({ standalone = false } = {}) {
  const WIDTH = 620;
  const HEIGHT = 390;
  const PLATE = { x: -136, y: -72, w: 272, d: 144, r: 9 };

  const B = makeBench({
    width: WIDTH,
    height: HEIGHT,
    plate: PLATE,
    tallest: [
      [-92, -34, 48],
      [0, -4, 42],
      [86, -30, 40],
      [86, 23, 24],
    ],
    azimuth: 42,
    elevation: 32,
    pad: 24,
  });

  const { P, at, L, D } = B;

  // 1. Machined Bench Baseplate
  B.addBenchBase({
    ruler: { x: -122, y: 56, w: 164, d: 6.5, r: 1, step: 4, every: 5 },
    labelPlate: {
      x: 52,
      y: 54,
      w: 68,
      d: 9.5,
      r: 1.2,
      text: "LOCK 1.1S · 24/7",
    },
  });

  // 2. Left Quadrant — 3-Stage Coaxial Anti-Jammer Cavity Filter (x: -120..-64, y: -52..38)
  const rfManifold = { x: -120, y: -52, w: 56, d: 88, r: 4 };
  B.addSlab("jammer.manifold", rfManifold, 0, 7, {
    tone: "lo",
    steps: 4,
    bevel: 0.6,
    inner: L(k.sideSeam(rfManifold, 3.5, P, 4), { tone: "faint" }),
    extra: D(
      k.corners(rfManifold, 5).map(([x, y]) => at([x, y, 7])),
      { size: 0.45, tone: "mid" }
    ),
  });

  // 3 Tuned Cavity Resonators ordered taller-in-back -> lower-in-front
  const cavities = [
    { cy: -33, h: 30 },
    { cy: -7, h: 24 },
    { cy: 19, h: 18 },
  ];
  for (const { cy, h } of cavities) {
    B.addCyl("jammer.col", -92, cy, 10.2, 7, h, {
      tone: "mid",
      steps: 40,
      bevel: 0.5,
      inner:
        L(k.sideArc(-92, cy, 10.2, 7 + h * 0.5, P, 28), { tone: "faint" }) +
        L(k.sideArc(-92, cy, 10.2, 7 + h - 3.4, P, 40), { tone: "faint" }) +
        L(k.knurl(-92, cy, 10.2, 7 + h - 3.4, 7 + h, 36, P, 0.05), { tone: "lo" }),
      extra: L(k.ring(-92, cy, 7.2, 7 + h, P, 28), { tone: "lo" }),
    });
    B.addCyl("jammer.tuner", -92, cy, 3.4, 7 + h, 5, {
      tone: "hi",
      steps: 24,
      bevel: 0.3,
    });
  }

  // 3. Center Stage — 360° Orbital Geofence Turntable & Directional Telemetry Horn (lit!)
  const orbPlinth = { x: -36, y: -40, w: 72, d: 72, r: 5 };
  B.addSlab("orb.plinth", orbPlinth, 0, 5.5, {
    tone: "lo",
    steps: 5,
    bevel: 0.6,
    extra: D(
      k.corners(orbPlinth, 5.5).map(([x, y]) => at([x, y, 5.5])),
      { size: 0.45, tone: "mid" }
    ),
  });

  // 72-Degree Azimuth Turntable
  const degTicks = k.radialTicks(0, -4, 27.6, 72, 6, 10.5, [1.2, 2.7], P);
  B.addCyl("orb.turntable", 0, -4, 29, 5.5, 5, {
    tone: "mid",
    steps: 64,
    bevel: 0.6,
    inner: L(k.knurl(0, -4, 29, 5.5, 10.5, 72, P, 0.05), { tone: "lo" }),
    extra:
      L(k.ring(0, -4, 27.6, 10.5, P, 64), { tone: "faint" }) +
      L(degTicks.minor, { tone: "lo" }) +
      L(degTicks.major, { tone: "mid" }) +
      L(k.ring(0, -4, 22, 10.5, P, 48), { tone: "faint" }),
  });

  // Lit Orbital Transceiver Housing
  const orbHead = { x: -14, y: -18, w: 28, d: 28, r: 3.5 };
  B.addSlab("orb.head", orbHead, 10.5, 18.5, {
    tone: "hi",
    lit: true,
    steps: 4,
    bevel: 0.7,
    inner: L(k.sideSeam(orbHead, 19.5, P, 4), { tone: "faint" }),
    extra: L(k.planOutline(k.insetPlan(orbHead, 2.8), 29, P, 3), { tone: "lo" }),
  });

  // Top Beacon Cap + Sweep Index Pointer
  B.addCyl("orb.beacon", 0, -4, 8.5, 29, 5, {
    tone: "hi",
    lit: true,
    steps: 36,
    bevel: 0.6,
    extra:
      L(k.ring(0, -4, 5.2, 34, P, 24), { tone: "lo" }) +
      `<g data-orb-pointer>${L(k.lineOnTop([-3, -4], [7.2, -4], 34.15, P), {
        tone: "hi",
        free: true,
      })}</g>`,
  });

  // Turned Directional Waveguide Horn flush on front face y = 10 of orb.head!
  const hornF = G.frameOf([0, 10, 19.8], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  B.addTurned(
    "orb.horn",
    hornF,
    [
      [0, 5.8],
      [4.5, 5.8],
      [4.52, 8.4],
      [9.8, 8.4],
    ],
    {
      tone: "hi",
      lit: true,
      bevel: 0.4,
      smooth: false,
      extra:
        L(G.circleOf(hornF, 9.8, 6.2, P, 32), { tone: "lo" }) +
        L(G.circleOf(hornF, 9.8, 3.4, P, 24), { tone: "hi" }),
    }
  );

  // 4. Back-Right — High-Speed 1.1s Remote Solenoid Immobilizer Latch (x: 54..120, y: -52..-10)
  const lockBase = { x: 54, y: -52, w: 66, d: 42, r: 4 };
  B.addSlab("lock.base", lockBase, 0, 7.5, {
    tone: "lo",
    steps: 4,
    bevel: 0.6,
    extra: D(
      k.corners(lockBase, 5).map(([x, y]) => at([x, y, 7.5])),
      { size: 0.45, tone: "mid" }
    ),
  });
  const solF = G.frameOf([87, -31, 7.5], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const solRibs = k.fadedSvg(
    G.ribsOf(solF, 2.5, 16.5, 13.5, 28, P, { fade: [0.08, 0.48], seams: true }),
    { tone: "lo" }
  );
  B.addCyl("lock.coil", 87, -31, 13.5, 7.5, 19, {
    tone: "mid",
    steps: 44,
    bevel: 0.6,
    inner: solRibs,
  });
  B.addCyl("lock.plunger", 87, -31, 7.2, 26.5, 6.5, {
    tone: "hi",
    steps: 32,
    bevel: 0.5,
    extra: L(k.ring(87, -31, 4.4, 33, P, 24), { tone: "red" }),
  });

  // 5. Front-Right — 1.1s Response Latency Dial Gauge (x: 54..120, y: 2..44)
  const latPed = { x: 54, y: 2, w: 66, d: 42, r: 4 };
  B.addSlab("lat.pedestal", latPed, 0, 7, {
    tone: "lo",
    steps: 4,
    bevel: 0.6,
    extra: D(
      k.corners(latPed, 5).map(([x, y]) => at([x, y, 7])),
      { size: 0.45, tone: "mid" }
    ),
  });
  B.addDialGauge("lat", 87, 23, 7, 17.8, 9, {
    needleAngle: -0.45,
    ticksCount: 36,
    every: 6,
    litNeedle: true,
  });

  // 6. Coaxial Waveguides (Flush on flat port walls)
  B.addHarness(
    "wg.jammer",
    [
      [-64, -7, 2.8],
      [-36, -7, 2.8],
    ],
    1.5,
    {
      tone: "hi",
      rings: { pitch: 2.4, twist: 0, cross: false, fade: [0.12, 0.55], tone: "lo" },
    }
  );
  B.addHarness(
    "wg.lock",
    [
      [36, -26, 2.8],
      [54, -26, 2.8],
    ],
    1.5,
    {
      tone: "hi",
      rings: { pitch: 2.4, twist: 0, cross: false, fade: [0.12, 0.55], tone: "lo" },
    }
  );
  B.addHarness(
    "wg.pulse",
    [
      [87, -10, 3.0],
      [87, 2, 3.0],
    ],
    1.2,
    { tone: "mid" }
  );

  const label =
    "Consola isométrica de reacción 24/7 y cerco satelital: banco de tres resonadores anti-jammer a la izquierda, torreta orbital graduada a 360 grados con corneta direccional en el centro, solenoide remoto de bloqueo de 1.1 segundos atrás a la derecha y cronómetro de pulso al frente.";

  return B.finish({ label, standalone });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { svg, P } = buildFig03Reaccion({ standalone: false });
  const live = `
  const P = ${JSON.stringify(P)};
  const ptr = document.querySelector("[data-orb-pointer] path");
  const readout = document.querySelector("[data-readout]");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let ang = 0, last = 0;
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    ang = (ang + dt * 1.1) % (Math.PI * 2);
    if (ptr) {
      const tail = [-Math.cos(ang) * 3, -4 - Math.sin(ang) * 3];
      const tip = [Math.cos(ang) * 7.2, -4 + Math.sin(ang) * 7.2];
      ptr.setAttribute("d", lineOnTop(tail, tip, 34.15, P));
    }
    const deg = String(Math.round((ang * 180) / Math.PI) % 360).padStart(3, "0");
    if (readout) readout.textContent = "CERCO 10S · AZIMUT " + deg + "° · CORTE 1.1S";
    requestAnimationFrame(tick);
  }
  if (!still.matches) requestAnimationFrame(tick);
  `;

  const plate = k.plateHtml({
    fig: "Fig. 03",
    title: "Cerco Satelital & Reacción 1.1s",
    hint: "Barrido orbital continuo 360°",
    readout: "CERCO 10S · AZIMUT 042° · CORTE 1.1S",
    keys: [
      { mark: "lit", label: "Torreta de triangulación orbital 360° y corneta de telemetría 10s" },
      { mark: "red", label: "Solenoide de inmovilización remota (1.1s) y triple filtro anti-jammer" },
    ],
    caption:
      "Línea 02 · Equipo de Reacción & Recuperación: filtrado de inhibidores de señal, cerco satelital cada 10 segundos e inmovilización remota coordinada con patrulla en tierra y Policía Nacional.",
    body: `<div class="iso-stage" tabindex="0" aria-label="Consola de Reacción 24/7">${svg}</div>`,
  });

  const outName = theme === "light" ? "fig03-reaccion-light.html" : "fig03-reaccion.html";
  const page = k
    .pageHtml({
      title: "Fig 03 — Consola de Reacción 24/7 Tec360",
      theme,
      width: 700,
      body: `<style>${TEC360_ANATOMY_CSS}</style>${plate}`,
      script: kitScript() + live,
    })
    .replace('class="iso"', 'class="iso" data-accent="cyan"');
  writeFileSync(join(HERE, outName), page);
  console.log("wrote", outName);
}
