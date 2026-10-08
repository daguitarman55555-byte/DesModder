/**
 * Probe arrows: what a field is at one point, drawn by Desmos as a vector
 * from that point — the field there, each source's part of it, the force on
 * a test charge — for a teacher to drag round and show. The particles show
 * the field's direction everywhere; these show its size and its sum at one
 * place, which is the question a physics problem asks.
 *
 * Every arrow shares one gain, so lengths compare: twice as long is twice
 * the field. None is normalised or shortened to fit, which would break that.
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
  /** Desmos LaTeX true where the probe is somewhere the field is drawn. */
  valid: string;
  arrows: readonly ProbeArrow[];
}

/**
 * The arrows in the plane: a shaft that stops at the head's base, and a
 * filled triangular head, so the tip is exactly the probe plus the gained
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
      {
        // Undefined when the arrow is off or the probe is inside a source:
        // everything below is drawn from this, so nothing draws.
        key: `${a.key}D`,
        latex: String.raw`${D}=\left\{${a.toggle}=1:\left\{${p.valid}:${p.gain}${a.vector}\right\}\right\}`,
        hidden: true,
      },
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
      nameItem(a, `${Q}+0.5${U}`, p.names),
    ];
  });
}

/**
 * The arrows in space: Desmos 3D's own `vector`, shaded and lit like the
 * rest of the scene.
 */
export function probeArrows3D(p: ProbeSetup): SceneItem[] {
  return p.arrows.flatMap((a) => {
    const k = `${a.key}vt`;
    const D = `D_{${k}}`;
    const U = `U_{${k}}`;
    const colors = { color: a.color, colorLatex: a.colorLatex };
    return [
      {
        key: `${a.key}D`,
        latex: String.raw`${D}=\left\{${a.toggle}=1:\left\{${p.valid}:${p.gain}${a.vector}\right\}\right\}`,
        hidden: true,
      },
      {
        key: `${a.key}U`,
        latex: String.raw`${U}=\frac{${D}}{\max\left(\sqrt{${D}.x^{2}+${D}.y^{2}+${D}.z^{2}},10^{-9}\right)}`,
        hidden: true,
      },
      {
        key: `${a.key}arrow`,
        latex: String.raw`\operatorname{vector}\left(${p.at},${p.at}+${D}\right)`,
        lineWidth: 4,
        ...colors,
      },
      nameItem(a, `${p.at}+${D}+0.4${U}`, p.names),
    ];
  });
}

/**
 * An arrow's name: a point of size 0 past its tip, labelled. Size, not
 * opacity: Desmos hides the label of a point whose opacity is 0.
 */
function nameItem(a: ProbeArrow, at: string, names: string): SceneItem {
  return {
    key: `${a.key}name`,
    latex: String.raw`${at}\left\{${names}=1\right\}`,
    points: true,
    lines: false,
    pointSize: 0,
    label: `\`${a.name}\``,
    labelSize: 1.5,
    color: a.color,
    colorLatex: a.colorLatex,
  };
}
