import * as k from "../../../.agents/skills/anatomy/kit/iso-kit.mjs";
import * as G from "../../../.agents/skills/anatomy/kit/lathe.mjs";
import { tubePieces, tubeSvg } from "../../../.agents/skills/anatomy/kit/tube.mjs";
import * as A from "../../../.agents/skills/anatomy/kit/audit.mjs";

export { k, G, A, tubePieces, tubeSvg };

/**
 * Tec360 Seguridad v3.2 — Anatomy Dark Obsidian & Pillar Token Layer
 * Follows DESIGN.md (#050810 canvas, #0B0F19 card/paper, 4-step ~3% shade ramp,
 * single restrained pillar lit accent per instrument) + full light-theme support
 * for anatomy verification tools.
 */
export const TEC360_ANATOMY_CSS = `
.iso {
  --anatomy-page: #050810;
  --anatomy-card: #0B0F19;
  --anatomy-paper: #0B0F19;
  --anatomy-face: #141D30;
  --anatomy-top: #1B263E;
  --anatomy-shade-0: #080C15;
  --anatomy-shade-1: #0D1322;
  --anatomy-shade-2: #11192C;
  --anatomy-shade-3: #162036;
  --anatomy-hi: #E2E8F0;
  --anatomy-mid: #7A8AA8;
  --anatomy-lo: #3E4C66;
  --anatomy-faint: #232E44;
  --anatomy-dot: #E2E8F0;
  --anatomy-halo: #020409;
  --anatomy-halo-opacity: 0.92;
  --anatomy-text: #B4B0C8;
  --anatomy-strong: #F8FAFC;
  --anatomy-muted: #7A8AA8;
  --anatomy-lit: #00F0FF;
  --anatomy-lit-top: #123B4D;
  --anatomy-lit-shade: #0C2836;
  --anatomy-red: #FF2A55;
  --anatomy-green: #10B981;
  --anatomy-blue: #8B5CF6;
  --anatomy-weight: 0.65px;
}

.iso[data-accent="violet"] {
  --anatomy-lit: #A78BFA;
  --anatomy-lit-top: #261B4A;
  --anatomy-lit-shade: #1A1235;
}

.iso[data-accent="cyan"] {
  --anatomy-lit: #00F0FF;
  --anatomy-lit-top: #103A4C;
  --anatomy-lit-shade: #0B2736;
}

.iso[data-accent="amber"] {
  --anatomy-lit: #FBBF24;
  --anatomy-lit-top: #3B2B10;
  --anatomy-lit-shade: #291E0B;
}

.iso[data-theme="light"] {
  --anatomy-page: #F2F3F7;
  --anatomy-card: #FAFBFD;
  --anatomy-paper: #FAFBFD;
  --anatomy-face: #FFFFFF;
  --anatomy-top: #FFFFFF;
  --anatomy-shade-0: #D8DCE6;
  --anatomy-shade-1: #E2E6EF;
  --anatomy-shade-2: #ECEFF6;
  --anatomy-shade-3: #F4F6FA;
  --anatomy-lit-top: #E6FAFF;
  --anatomy-lit-shade: #CCF3FC;
  --anatomy-hi: #1E293B;
  --anatomy-mid: #64748B;
  --anatomy-lo: #94A3B8;
  --anatomy-faint: #CBD5E1;
  --anatomy-lit: #0284C7;
  --anatomy-halo: #64748B;
  --anatomy-halo-opacity: 0.28;
  --anatomy-dot: #334155;
  --anatomy-text: #475569;
  --anatomy-strong: #0F172A;
  --anatomy-muted: #64748B;
  --anatomy-red: #E11D48;
  --anatomy-green: #059669;
  --anatomy-blue: #7C3AED;
}

.iso[data-theme="light"][data-accent="violet"] {
  --anatomy-lit: #7C3AED;
  --anatomy-lit-top: #F3E8FF;
  --anatomy-lit-shade: #E9D5FF;
}

.iso[data-theme="light"][data-accent="amber"] {
  --anatomy-lit: #D97706;
  --anatomy-lit-top: #FEF3C7;
  --anatomy-lit-shade: #FDE68A;
}

.iso-plate {
  border-radius: 16px;
  border: 1px solid rgba(139, 92, 246, 0.24);
  box-shadow: 0 24px 60px rgba(2, 4, 10, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
`;

export function makeBench({
  width = 620,
  height = 390,
  plate,
  tallest = [[0, 0, 56]],
  azimuth = 46,
  elevation = 31,
  pad = 26,
}) {
  const zPlate = -10;
  const hFoot = 5;
  const P = k.fitProjection(
    [...k.boxCorners(plate, zPlate - hFoot, 0), ...tallest],
    width,
    height,
    { pad, azimuth, elevation }
  );
  const R = A.recorder(P);
  const halos = [];
  const overlays = [];

  const at = (pt) => k.iso(pt, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (pts, style) => k.dotsSvg(pts, style);

  function addHalo(plan, z, h) {
    halos.push(`<path class="iso-halo" d="${k.haloOf(plan, z, h, P)}"/>`);
  }

  function addSlab(
    baseName,
    plan,
    z,
    h,
    {
      tone = "mid",
      steps = 5,
      bevel = 0.6,
      crease = "faint",
      lit = false,
      flat = false,
      inner = "",
      extra = "",
      ground = false,
      className,
      attr = "",
    } = {}
  ) {
    const name = R.nameFor(baseName);
    const paths = k.slabOf(plan, z, h, P, steps, bevel);
    const core = S(paths, { tone, crease, lit, flat, inner, className }) + extra;
    const svg = attr ? `<g ${attr}>${core}</g>` : core;
    const shape = R.solid(A.slab(plan, z, h, { name, ground }, steps));
    const cx = plan.x + plan.w / 2;
    const cy = plan.y + plan.d / 2;
    R.put({ name, at: [cx, cy, z + h / 2], svg, shapes: [shape] });
    return shape;
  }

  function addCyl(
    baseName,
    cx,
    cy,
    r,
    z,
    h,
    {
      tone = "mid",
      steps = 36,
      bevel = 0.5,
      crease = "faint",
      lit = false,
      inner = "",
      extra = "",
      ground = false,
      className,
      attr = "",
    } = {}
  ) {
    const name = R.nameFor(baseName);
    const paths = k.cylinder(cx, cy, r, z, h, P, steps, bevel);
    const core = S(paths, { tone, crease, lit, inner, className }) + extra;
    const svg = attr ? `<g ${attr}>${core}</g>` : core;
    const shape = R.solid(A.cylinder(cx, cy, r, z, h, { name, ground }));
    R.put({ name, at: [cx, cy, z + h / 2], svg, shapes: [shape] });
    return shape;
  }

  function addDisc(
    baseName,
    F,
    s0,
    s1,
    r,
    {
      tone = "mid",
      bevel = 0.4,
      lit = false,
      inner = "",
      extra = "",
      steps,
      attr = "",
    } = {}
  ) {
    const name = R.nameFor(baseName);
    const paths = G.disc(s0, s1, r, F, P, { bevel, steps });
    const core = S(paths, { tone, lit, inner }) + extra;
    const svg = attr ? `<g ${attr}>${core}</g>` : core;
    const shape = R.solid(A.disc(F, s0, s1, r, { name }));
    const mid = G.pointOf(F, (s0 + s1) / 2, 0, 0);
    R.put({ name, at: mid, svg, shapes: [shape] });
    return shape;
  }

  function addTurned(
    baseName,
    F,
    profile,
    {
      tone = "hi",
      lit = false,
      inner = "",
      extra = "",
      bevel = 0.4,
      smooth = "auto",
      radius = null,
      slope = null,
      attr = "",
    } = {}
  ) {
    const name = R.nameFor(baseName);
    const smoothOpt = slope ? { slope, ...(radius ? { radius } : {}) } : smooth;
    const paths = G.solidOf(profile, F, P, { bevel, smooth: smoothOpt });
    const core = S(paths, { tone, lit, inner }) + extra;
    const svg = attr ? `<g ${attr}>${core}</g>` : core;
    const shape = R.solid(A.solid(F, profile, { name, radius }));
    const sMid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
    const mid = G.pointOf(F, sMid, 0, 0);
    R.put({ name, at: mid, svg, shapes: [shape] });
    return shape;
  }

  function addBall(baseName, centre, r, { tone = "mid", lit = false, extra = "" } = {}) {
    const name = R.nameFor(baseName);
    const paths = G.sphereOf(centre, r, P);
    const svg = S(paths, { tone, lit }) + extra;
    const shape = R.solid(A.ball(centre, r, { name }));
    R.put({ name, at: centre, svg, shapes: [shape] });
    return shape;
  }

  function addHarness(
    baseName,
    controlPts,
    r,
    {
      bend = Math.max(3.6, r * 3),
      tone = "mid",
      maxLength = 14,
      gaps = [],
      rings = null,
      limp = true,
      attr = "",
    } = {}
  ) {
    const name = R.nameFor(baseName);
    const route = G.fillet(controlPts, bend, 7, { P, tube: r });
    R.route(name, route, r, { gaps, limp });
    const pieces = tubePieces(route, r, P, { maxLength, gaps, ...(rings ? { rings } : {}) });
    pieces.forEach((piece, index) => {
      const pieceSvg = tubeSvg(piece, { tone });
      const svg = attr ? `<g ${attr}>${pieceSvg}</g>` : pieceSvg;
      R.put({
        name: `${name}:${index}`,
        route: name,
        chunk: index,
        at: piece.mid,
        svg,
        shapes: [A.tube(piece.points, piece.radii, { name: `${name}:${index}` })],
      });
    });
    return route;
  }

  function addBenchBase({
    ruler = null,
    labelPlate = null,
    footInset = 22,
    screwInset = 10,
  } = {}) {
    addHalo(plate, zPlate - hFoot, -zPlate);

    const footPts = [...k.corners(plate, footInset)].sort(
      (a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P)
    );
    for (const [fx, fy] of footPts) {
      addCyl("stand.flange", fx, fy, 7.2, zPlate - hFoot, 1.8, {
        tone: "lo",
        steps: 28,
        bevel: 0.3,
        ground: true,
      });
      addCyl("stand.foot", fx, fy, 5.4, zPlate - hFoot + 1.8, hFoot - 1.8, {
        tone: "mid",
        steps: 28,
        bevel: 0.3,
      });
    }

    const groove = L(k.planOutline(k.insetPlan(plate, 5), 0, P, 8), { tone: "lo" });
    const seam = L(k.sideSeam(plate, -4.5, P, 8), { tone: "faint" });
    const screws = k.corners(plate, screwInset);
    const screwRings = L(
      screws.map(([sx, sy]) => k.ring(sx, sy, 2.3, 0, P, 16)).join(""),
      { tone: "lo" }
    );
    const screwDots = D(
      screws.map(([sx, sy]) => at([sx, sy, 0])),
      { size: 0.55, tone: "mid" }
    );

    addSlab("stand.plate", plate, zPlate, -zPlate, {
      tone: "mid",
      steps: 8,
      bevel: 1.5,
      inner: seam,
      extra: groove + screwRings + screwDots,
    });

    if (ruler) {
      const strip = ruler;
      const t = k.topTicks(
        strip.x + 5,
        strip.x + strip.w - 5,
        strip.step ?? 4,
        strip.every ?? 5,
        strip.y + 0.1,
        0.7,
        [1.9, 3.6],
        P
      );
      addSlab("stand.ruler", strip, 0, 0.7, {
        tone: "lo",
        steps: 3,
        bevel: 0,
        crease: "none",
        extra: L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" }),
      });
    }

    if (labelPlate) {
      const lp = labelPlate;
      const border = L(k.planOutline(k.insetPlan(lp, 1.5), 0.8, P, 3), { tone: "faint" });
      const rules = (lp.rules ?? [lp.w - 14, lp.w - 22])
        .map((rw, idx) =>
          k.lineOnTop([lp.x + 5, lp.y + 3.2 + idx * 2.8], [lp.x + 5 + rw, lp.y + 3.2 + idx * 2.8], 0.8, P)
        )
        .join("");
      const rivets = D(
        [at([lp.x + 2.5, lp.y + lp.d / 2, 0.8]), at([lp.x + lp.w - 2.5, lp.y + lp.d / 2, 0.8])],
        { size: 0.45, tone: "mid" }
      );
      const textMarkup = lp.text
        ? k.faceTextSvg(k.topMatrix([lp.x + 5, lp.y + lp.d - 2.4], 0.8, P, "x"), lp.text, {
            size: 3.1,
            tone: "mid",
          })
        : L(rules, { tone: "lo", free: true });

      addSlab("stand.label", lp, 0, 0.8, {
        tone: "lo",
        steps: 3,
        bevel: 0,
        crease: "none",
        extra: border + textMarkup + rivets,
      });
    }
  }

  function addDialGauge(
    prefix,
    cx,
    cy,
    z0,
    R_dial,
    h_dial,
    {
      needleAngle = -0.8,
      ticksCount = 40,
      every = 5,
      fromAngle = -Math.PI * 0.78,
      spanAngle = Math.PI * 1.56,
      needleAttr = "",
      litNeedle = true,
      crown = true,
      engraved = "",
    } = {}
  ) {
    const top = z0 + h_dial;
    const knurlD = k.knurl(cx, cy, R_dial, top - 3.2, top, 64, P, 0.05);
    const bandSeam = k.sideArc(cx, cy, R_dial, top - 3.2, P, 48);
    const bezel = k.ring(cx, cy, R_dial - 2.1, top, P, 56);
    const ticks = k.radialTicks(
      cx,
      cy,
      R_dial - 2.15,
      ticksCount,
      every,
      top,
      [1.3, 2.8],
      P,
      fromAngle,
      spanAngle
    );
    const hubRing = k.ring(cx, cy, 1.8, top, P, 20);
    const tail = [
      cx - Math.sin(needleAngle) * 2.4,
      cy + Math.cos(needleAngle) * 2.4,
    ];
    const tip = [
      cx + Math.sin(needleAngle) * (R_dial - 4.4),
      cy - Math.cos(needleAngle) * (R_dial - 4.4),
    ];
    const needlePath = k.lineOnTop(tail, tip, top + 0.15, P);
    const needleSvg = `<g ${needleAttr}>${L(needlePath, {
      tone: litNeedle ? "lit" : "hi",
      free: true,
    })}</g>`;
    const faceLabel = engraved
      ? k.faceTextSvg(k.topMatrix([cx, cy + R_dial * 0.42], top, P, "x"), engraved, {
          size: 2.7,
          tone: "lo",
          anchor: "middle",
        })
      : "";

    addCyl(`${prefix}.puck`, cx, cy, R_dial, z0, h_dial, {
      tone: "hi",
      steps: 60,
      bevel: 0.7,
      crease: "lo",
      inner: L(bandSeam, { tone: "faint" }) + L(knurlD, { tone: "lo" }),
      extra:
        L(bezel, { tone: "lo" }) +
        L(ticks.minor, { tone: "lo" }) +
        L(ticks.major, { tone: "mid" }) +
        L(hubRing, { tone: "mid" }) +
        faceLabel +
        needleSvg,
    });

    addCyl(`${prefix}.cap`, cx, cy, 1.3, top, 1.1, {
      tone: "mid",
      steps: 20,
      bevel: 0.2,
    });

    if (crown) {
      const cf = G.frameOf([cx + R_dial, cy, z0 + h_dial * 0.52], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
      addDisc(`${prefix}.crownNeck`, cf, 0, 1.8, 1.4, { tone: "mid", bevel: 0.2 });
      addDisc(`${prefix}.crownCap`, cf, 1.8, 4.0, 2.5, {
        tone: "hi",
        bevel: 0.3,
        inner: k.fadedSvg(G.ribsOf(cf, 2.0, 3.8, 2.5, 14, P, { fade: [0.08, 0.45], seams: true }), {
          tone: "lo",
        }),
      });
    }
  }

  function finish({ label, auditOptions = {}, standalone = false, className = "" } = {}) {
    A.settle(R, P);
    const sorted = [...R.items].sort((a, b) => a.key - b.key);
    A.auditOrExit(R, P, auditOptions);
    const svg = k.figureSvg({
      width,
      height,
      label,
      standalone,
      className,
      body: [...halos, ...sorted.map((item) => item.svg), ...overlays],
    });
    return { svg, P, R };
  }

  return {
    P,
    R,
    at,
    S,
    L,
    D,
    halos,
    overlays,
    addHalo,
    addSlab,
    addCyl,
    addDisc,
    addTurned,
    addBall,
    addHarness,
    addBenchBase,
    addDialGauge,
    finish,
  };
}
