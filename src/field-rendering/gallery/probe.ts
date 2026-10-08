/**
 * Probe arrows: what a field is at one point, drawn by Desmos as a vector
 * from that point — the field there, each source's part of it, the force on
 * a test charge — for a teacher to drag round and show. The particles show
 * the field's direction everywhere; these show its size and its sum at one
 * place, which is the question a physics problem asks.
 *
 * Every arrow shares one gain, so lengths compare: twice as long is twice
 * the field. Near a source that runs off the screen, so by default lengths
 * are damped, ℓ = L·tanh(|gV|/L): nearly true while short, never longer than
 * L, and still in order, a longer arrow always the stronger field. A switch
 * turns damping off for exact proportion.
 *
 * The names are hidden helpers, each ending in `vt` plus the arrow's key, so
 * they cannot be mistaken for the teacher's quantities in the expression
 * list. Gallery code only: these are pictures, not a general tool.
 */
import type { SceneItem } from "./types";

/** Desmos LaTeX for an arrow, gated on: undefined, so drawn as nothing. */
export interface ProbeArrow {
  /** Short, letters and digits: names this arrow's helpers. */
  key: string;
  /** The vector at the probe, a Desmos point expression. */
  vector: string;
  /** The 0-or-1 variable that shows it. */
  toggle: string;
  color?: string;
  /** A named colour instead, e.g. one following a charge's sign. */
  colorLatex?: string;
  /** A plain colour for the 3D name, which can't read a named one. */
  nameColor: string;
  /** Its name as a math label, without the backticks: `\vec{E}_{1}`. */
  name: string;
}

export interface ProbeSetup {
  /** The probe point, e.g. `\left(p_{x},p_{y}\right)`. */
  at: string;
  /** The common gain, a variable's name. */
  gain: string;
  /** The 0-or-1 variable that shows the names. */
  names: string;
  /** The 0-or-1 variable that damps the lengths. */
  damp: string;
  /** The longest a damped arrow gets, in graph units. */
  reach: number;
  /** Desmos LaTeX true where the probe is somewhere the field is drawn. */
  valid: string;
  arrows: readonly ProbeArrow[];
  dimensions: 2 | 3;
}

/**
 * The arrow's vector as drawn: gated on (undefined when off, or when the
 * probe is inside a source, so everything drawn from it draws nothing),
 * gained, then damped if the switch is on.
 */
function displacement(p: ProbeSetup, a: ProbeArrow): SceneItem[] {
  const k = `${a.key}vt`;
  const R = `R_{${k}}`;
  const M = `M_{${k}}`;
  const z = p.dimensions === 3 ? `+${R}.z^{2}` : "";
  const L = p.reach;
  return [
    {
      key: `${a.key}R`,
      latex: String.raw`${R}=\left\{${a.toggle}=1:\left\{${p.valid}:${p.gain}${a.vector}\right\}\right\}`,
      hidden: true,
    },
    {
      key: `${a.key}M`,
      latex: String.raw`${M}=\sqrt{${R}.x^{2}+${R}.y^{2}${z}}`,
      hidden: true,
    },
    {
      key: `${a.key}D`,
      latex: String.raw`D_{${k}}=${R}\left\{${p.damp}=1:\frac{${L}\tanh\left(\frac{${M}}{${L}}\right)}{\max\left(${M},10^{-9}\right)},1\right\}`,
      hidden: true,
    },
  ];
}

/**
 * The arrows in the plane: a shaft that stops at the head's base, and a
 * filled triangular head, so the tip is exactly the probe plus the drawn
 * vector. The head is a world-sized triangle, so it scales with zoom like
 * the rest of the figure.
 */
export function probeArrows2D(p: ProbeSetup): SceneItem[] {
  return p.arrows.flatMap((a) => {
    const k = `${a.key}vt`;
    const D = `D_{${k}}`;
    const L = `l_{${k}}`;
    const U = `U_{${k}}`;
    const H = `H_{${k}}`;
    const Q = `Q_{${k}}`;
    const N = String.raw`\left(-${U}.y,${U}.x\right)`;
    const colors = { color: a.color, colorLatex: a.colorLatex };
    return [
      ...displacement(p, a),
      {
        key: `${a.key}L`,
        latex: String.raw`${L}=\sqrt{${D}.x^{2}+${D}.y^{2}}`,
        hidden: true,
      },
      {
        key: `${a.key}U`,
        latex: String.raw`${U}=\frac{${D}}{\max\left(${L},10^{-9}\right)}`,
        hidden: true,
      },
      {
        key: `${a.key}H`,
        latex: String.raw`${H}=\min\left(0.45,0.3${L}\right)`,
        hidden: true,
      },
      {
        key: `${a.key}Q`,
        latex: String.raw`${Q}=${p.at}+${D}`,
        hidden: true,
      },
      {
        key: `${a.key}shaft`,
        latex: String.raw`${p.at}+t\left(${D}-${H}${U}\right)`,
        domain: ["0", "1"],
        lineWidth: 4,
        ...colors,
      },
      {
        key: `${a.key}head`,
        latex: String.raw`\operatorname{polygon}\left(${Q},${Q}-${H}${U}+0.45${H}${N},${Q}-${H}${U}-0.45${H}${N}\right)`,
        fill: true,
        fillOpacity: 1,
        lineWidth: 1,
        ...colors,
      },
      {
        // A point of size 0 past the tip, labelled. Size, not opacity:
        // Desmos hides the label of a point whose opacity is 0.
        key: `${a.key}name`,
        latex: String.raw`${Q}+0.5${U}\left\{${p.names}=1\right\}`,
        points: true,
        lines: false,
        pointSize: 0,
        label: `\`${a.name}\``,
        labelSize: 1.5,
        ...colors,
      },
    ];
  });
}

/**
 * The arrows in space: Desmos 3D's own `vector`, shaded and lit like the
 * rest of the scene, thin enough that its cone reads as a head. Desmos 3D
 * draws no labels, so each name is a point the plugin labels itself.
 */
export function probeArrows3D(p: ProbeSetup): SceneItem[] {
  return p.arrows.flatMap((a) => {
    const k = `${a.key}vt`;
    const D = `D_{${k}}`;
    const colors = { color: a.color, colorLatex: a.colorLatex };
    return [
      ...displacement(p, a),
      {
        key: `${a.key}arrow`,
        latex: String.raw`\operatorname{vector}\left(${p.at},${p.at}+${D}\right)`,
        lineWidth: 1.5,
        ...colors,
      },
      {
        key: `${a.key}name`,
        latex: String.raw`N_{${k}}=\left(${p.at}+${D}\cdot\left(1+\frac{0.35}{\max\left(\sqrt{${D}.x^{2}+${D}.y^{2}+${D}.z^{2}},10^{-9}\right)}\right)\right)\left\{${p.names}=1\right\}`,
        hidden: true,
        name3d: { label: a.name, color: a.nameColor },
      },
    ];
  });
}
