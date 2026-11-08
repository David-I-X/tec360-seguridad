import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G, makeBench, TEC360_ANATOMY_CSS } from "./tec360-bench.mjs";
import { kitScript } from "../../../.agents/skills/anatomy/scripts/inline-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

export function buildFig05Ecosistema({ standalone = false } = {}) {
  const WIDTH = 460;
  const HEIGHT = 360;
  const PLATE = { x: -98, y: -76, w: 196, d: 152, r: 9 };

  const B = makeBench({
    width: WIDTH,
    height: HEIGHT,
    plate: PLATE,
    tallest: [[0, 0, 42]],
    azimuth: 45,
    elevation: 33,
    pad: 22,
  });

  const { P, at, L, D } = B;

  // 1. Compact Bench Baseplate
  B.addBenchBase({
    footInset: 20,
    screwInset: 9,
    ruler: { x: -86, y: 60, w: 112, d: 6, r: 1, step: 4, every: 5 },
    labelPlate: {
      x: 34,
      y: 58,
      w: 52,
      d: 9,
      r: 1.2,
      text: "BUS 3X3",
    },
  });

  // 2. Left 3-Channel Input Manifold (GPS 4G / Cloud HD / Diagnóstico)
  const inManifold = { x: -86, y: -50, w: 28, d: 96, r: 3.5 };
  B.addSlab("in.manifold", inManifold, 0, 8.5, {
    tone: "lo",
    steps: 4,
    bevel: 0.6,
    inner: L(k.sideSeam(inManifold, 4.2, P, 4), { tone: "faint" }),
  });
  for (const iy of [-32, -2, 28]) {
    B.addCyl("in.turret", -72, iy, 7.2, 8.5, 9.5, {
      tone: "mid",
      steps: 32,
      bevel: 0.4,
      inner:
        L(k.sideArc(-72, iy, 7.2, 13.5, P, 32), { tone: "faint" }) +
        L(k.knurl(-72, iy, 7.2, 13.5, 18.0, 24, P, 0.05), { tone: "lo" }),
    });
    B.addCyl("in.post", -72, iy, 3.2, 18, 4.2, {
      tone: "hi",
      steps: 20,
      bevel: 0.3,
    });
  }

  // 3. Center 3×3 Orbital Crossbar Commutator Drum (lit!)
  const corePlinth = { x: -36, y: -42, w: 72, d: 80, r: 5 };
  B.addSlab("core.plinth", corePlinth, 0, 7, {
    tone: "lo",
    steps: 5,
    bevel: 0.6,
    extra: D(
      k.corners(corePlinth, 5).map(([x, y]) => at([x, y, 7])),
      { size: 0.45, tone: "mid" }
    ),
  });

  const statorTicks = k.radialTicks(0, -2, 28.5, 48, 6, 13, [1.2, 2.5], P);
  B.addCyl("core.stator", 0, -2, 30, 7, 6, {
    tone: "mid",
    steps: 60,
    bevel: 0.5,
    extra:
      L(k.ring(0, -2, 28.5, 13, P, 60), { tone: "faint" }) +
      L(statorTicks.minor, { tone: "lo" }) +
      L(statorTicks.major, { tone: "mid" }),
  });

  B.addCyl("core.drum", 0, -2, 20.5, 13, 13.5, {
    tone: "hi",
    lit: true,
    steps: 52,
    bevel: 0.7,
    inner:
      L(k.sideArc(0, -2, 20.5, 19.0, P, 52), { tone: "faint" }) +
      L(k.knurl(0, -2, 20.5, 19.0, 26.5, 52, P, 0.05), { tone: "lo" }),
    extra: L(k.ring(0, -2, 14.5, 26.5, P, 40), { tone: "lo" }),
  });

  // Analytic Dome Cap on Top of Commutator Drum
  const domeR = 10.5;
  const domeH = 7.5;
  const domeKnots = [[0, domeR]];
  for (let i = 1; i <= 14; i++) {
    const u = i / 14;
    domeKnots.push([u * domeH, domeR * Math.sqrt(Math.max(0, 1 - u * u)), 1]);
  }
  const domeF = G.frameOf([0, -2, 26.5], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const rDome = (s) => {
    const u = Math.min(1, Math.max(0, s / domeH));
    return domeR * Math.sqrt(Math.max(0, 1 - u * u));
  };
  const sDome = (s) => {
    const u = Math.min(0.999, Math.max(0, s / domeH));
    return (-domeR * u) / (domeH * Math.sqrt(Math.max(1e-5, 1 - u * u)));
  };
  B.addTurned("core.dome", domeF, domeKnots, {
    tone: "hi",
    lit: true,
    bevel: 0,
    radius: rDome,
    slope: sDome,
  });

  // 4. Right 3-Channel Output Dispatch Relay Manifold (Corte / Reacción / Mecánica)
  const outManifold = { x: 58, y: -50, w: 28, d: 96, r: 3.5 };
  B.addSlab("out.manifold", outManifold, 0, 8.5, {
    tone: "lo",
    steps: 4,
    bevel: 0.6,
    inner: L(k.sideSeam(outManifold, 4.2, P, 4), { tone: "faint" }),
  });
  for (const oy of [-32, -2, 28]) {
    B.addSlab("out.relay", { x: 63, y: oy - 8, w: 18, d: 16, r: 2.2 }, 8.5, 11.5, {
      tone: "mid",
      steps: 3,
      bevel: 0.4,
    });
    B.addCyl("out.cap", 72, oy, 4.4, 20, 3.8, {
      tone: "hi",
      steps: 24,
      bevel: 0.3,
    });
  }

  // 5. 6 Symmetric Crossbar Bus Conduits (3 Inputs -> Core -> 3 Outputs)
  for (const by of [-28, -2, 24]) {
    B.addHarness(
      "bus.in",
      [
        [-58, by, 3.5],
        [-36, by, 3.5],
      ],
      1.35,
      {
        tone: "hi",
        rings: { pitch: 2.3, twist: 1.0, cross: true, fade: [0.1, 0.55], tone: "lo" },
      }
    );
    B.addHarness(
      "bus.out",
      [
        [36, by, 3.5],
        [58, by, 3.5],
      ],
      1.35,
      { tone: "mid" }
    );
  }

  const label =
    "Conmutador central isométrico 3 por 3 del ecosistema Tec360: tres torretas de entrada de telemetría a la izquierda conectadas a un tambor conmutador orbital iluminado en el centro que despacha hacia tres relés de acción en campo a la derecha.";

  return B.finish({ label, standalone });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { svg } = buildFig05Ecosistema({ standalone: false });
  const plate = k.plateHtml({
    fig: "Fig. 05",
    title: "Conmutador Orbital 3×3",
    hint: "Enrutamiento Telemetría → Campo",
    readout: "BUS ACTIVO · 4G L1/L5",
    keys: [
      { mark: "lit", label: "Tambor conmutador central Tec360 (enrutamiento en tiempo real)" },
      { mark: "raised", label: "3 entradas de telemetría (izq.) → 3 relés de despacho (der.)" },
    ],
    caption:
      "Núcleo físico del Ecosistema Unificado Tec360: enlaza telemetría GPS 4G, evidencia Cloud HD y diagnóstico preventivo con inmovilización remota, reacción 24/7 y mecánica en ruta.",
    body: `<div class="iso-stage" tabindex="0" aria-label="Conmutador Central 3x3 Tec360">${svg}</div>`,
  });

  const outName = theme === "light" ? "fig05-ecosistema-light.html" : "fig05-ecosistema.html";
  const page = k
    .pageHtml({
      title: "Fig 05 — Conmutador Ecosistema Tec360",
      theme,
      width: 560,
      body: `<style>${TEC360_ANATOMY_CSS}</style>${plate}`,
      script: kitScript(),
    })
    .replace('class="iso"', 'class="iso" data-accent="cyan"');
  writeFileSync(join(HERE, outName), page);
  console.log("wrote", outName);
}
