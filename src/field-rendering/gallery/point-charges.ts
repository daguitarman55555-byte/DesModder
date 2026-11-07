/**
 * Up to ten point charges anywhere in the plane or the box, each one a
 * charge slider and two or three position sliders, with a count slider
 * N_{q} for how many of them are in the picture: what Electric charges and
 * Gauss's law share.
 *
 * Both used to be two charges at fixed places, the charges preset's on the
 * x-axis only. Rafael asked on 2026-11-07 for charges that move up and down
 * as well as sideways, and as many as ten.
 *
 * Two forms of the same sum, because two things read it:
 *
 * - The GPU field is written out term by term, all ten, each charge's
 *   strength gated by the count (`\left\{N_{q}<i:0,q_{i}\right\}`). The
 *   shader compiler reads scalars only, no lists, and ten Coulomb terms a
 *   particle is nothing to a GPU.
 * - Desmos's own objects that trace curves over the whole graph (field
 *   lines, equipotentials) sum lists instead, `\sum_{i=1}^{N_{q}}`, so the
 *   implicit plotter adds up only the charges in use: written out, it would
 *   evaluate all ten at every sample, eight of them zero.
 *
 * An unused charge keeps its sliders and its place, so turning the count up
 * brings it back where it was left.
 */
import type { GalleryVariable, SceneItem } from "./types";

const R = String.raw;

export const MAX_CHARGES = 10;
/** The count slider's name. */
export const COUNT = "N_{q}";

/** Charge i's sliders: its strength and its coordinates. */
export const chargeName = (i: number) => `q_{${i}}`;
export const chargeAt = (i: number): [string, string, string] => [
  `X_{q${i}}`,
  `Y_{q${i}}`,
  `Z_{q${i}}`,
];
/** Whether charge i is in the picture, as a Desmos condition. */
export const active = (i: number) => R`${COUNT}\ge${i}`;
/** Charge i's strength as the field sees it: zero while it is unused. */
export const strength = (i: number) =>
  R`\left\{${COUNT}<${i}:0,${chargeName(i)}\right\}`;

const INDICES = Array.from({ length: MAX_CHARGES }, (_, i) => i + 1);

export interface ChargeLayout {
  /** How many are in the picture when the preset loads. */
  count: number;
  /** All ten, in order: the first `count` are the preset's picture. */
  charges: readonly { q: number; at: readonly [number, number, number] }[];
  /** How far a charge's position slider reaches either way. */
  reach: number;
  /** Desmos LaTeX for the constant before q/r²: `1`, or `\frac{1}{4\pi}`. */
  k: string;
}

/**
 * Ten charges' default places: the preset's own first ones, then the rest
 * round a ring, alternating in sign, so turning the count up adds a charge
 * somewhere it can be seen and dragged from, not on top of another.
 */
export function ringLayout(
  first: readonly { q: number; at: readonly [number, number, number] }[],
  ring: number,
  k: string,
  reach: number
): ChargeLayout {
  const rest = INDICES.slice(first.length).map((i) => {
    const angle = (2 * Math.PI * (i - first.length - 1)) / 8 + Math.PI / 8;
    const round = (n: number) => Math.round(n * 10) / 10;
    return {
      q: i % 2 === 1 ? 1 : -1,
      at: [round(ring * Math.cos(angle)), round(ring * Math.sin(angle)), 0],
    } as const;
  });
  return { count: first.length, charges: [...first, ...rest], reach, k };
}

/**
 * The sliders, in the order the presets window lists them: the count, then
 * each charge's strength and place, shown only while that charge is in use.
 */
export function chargeVariables(
  layout: ChargeLayout,
  dim: 2 | 3,
  qRange: readonly [number, number, number]
): GalleryVariable[] {
  const [lo, hi, step] = qRange;
  return [
    {
      name: COUNT,
      value: layout.count,
      min: 1,
      max: MAX_CHARGES,
      step: 1,
    },
    ...INDICES.flatMap((i) => {
      const c = layout.charges[i - 1];
      const shownWhen = { name: COUNT, atLeast: i };
      const axes = chargeAt(i).slice(0, dim);
      return [
        { name: chargeName(i), value: c.q, min: lo, max: hi, step, shownWhen },
        ...axes.map((name, a) => ({
          name,
          value: c.at[a],
          min: -layout.reach,
          max: layout.reach,
          step: 0.05,
          shownWhen,
        })),
      ];
    }),
  ];
}

/** (c − charge i's coordinate), per axis, bracketed. */
const offsets = (i: number, coords: readonly string[]) =>
  coords.map((c, a) => R`\left(${c}-${chargeAt(i)[a]}\right)`);
const squared = (d: readonly string[]) => d.map((s) => `${s}^{2}`).join("+");

/** E along `axis` at `coords`, all ten terms: for the GPU. */
export function fieldComponent(
  layout: ChargeLayout,
  axis: number,
  coords: readonly string[]
) {
  return INDICES.map((i) => {
    const d = offsets(i, coords);
    return R`\frac{${layout.k}${strength(i)}${d[axis]}}{\left(${squared(d)}\right)^{1.5}}`;
  }).join("+");
}

/** V at `coords`, all ten terms: for the GPU's colour. */
export function potential(layout: ChargeLayout, coords: readonly string[]) {
  return INDICES.map((i) => {
    const d = offsets(i, coords);
    return R`\frac{${layout.k}${strength(i)}}{\sqrt{${squared(d)}}}`;
  }).join("+");
}

/**
 * True outside every charge in use, by `radius`: where the field is drawn.
 * An unused charge counts as far away. Nested `\min`s of four at most, the
 * most the shader compiler takes in one.
 */
export function outsideAll(coords: readonly string[], radius: string) {
  const far = INDICES.map(
    (i) => R`${squared(offsets(i, coords))}+\left\{${COUNT}<${i}:1000,0\right\}`
  );
  const min = (xs: string[]): string => {
    if (xs.length === 1) return xs[0];
    if (xs.length <= 4) return R`\min\left(${xs.join(",")}\right)`;
    const groups: string[] = [];
    for (let at = 0; at < xs.length; at += 4)
      groups.push(min(xs.slice(at, at + 4)));
    return min(groups);
  };
  return R`${min(far)}>${radius}^{2}`;
}

/**
 * Hidden lists of the charges in use, and only those (`[…][1...N_{q}]`),
 * for Desmos's own sums: `\operatorname{total}` and `\min` over them then
 * see exactly the charges in the picture. Named with the `vt` ending that
 * marks the plugin's helpers.
 */
export const LISTS = {
  q: "Q_{qvt}",
  x: "X_{qvt}",
  y: "Y_{qvt}",
  z: "Z_{qvt}",
} as const;

export function chargeLists(dim: 2 | 3): SceneItem[] {
  const list = (f: (i: number) => string) =>
    R`\left[${INDICES.map(f).join(",")}\right]\left[1...${COUNT}\right]`;
  return [
    { key: "qlist", latex: R`${LISTS.q}=${list(chargeName)}`, hidden: true },
    ...(["x", "y", "z"] as const).slice(0, dim).map((axis, a) => ({
      key: `${axis}list`,
      latex: R`${LISTS[axis]}=${list((i) => chargeAt(i)[a])}`,
      hidden: true,
    })),
  ];
}

/**
 * Over the lists: each charge's offset from `coords` along each axis, and
 * the squared distance, both lists Desmos broadcasts.
 */
export function listOffsets(coords: readonly string[]) {
  const axes = [LISTS.x, LISTS.y, LISTS.z];
  const d = coords.map((c, a) => R`\left(${c}-${axes[a]}\right)`);
  return { d, r2: squared(d) };
}

/** Coulomb's field at `coords`, Desmos-side: a point, k·Σ q·d/r³. */
export function listField(k: string, coords: readonly string[]) {
  const { d, r2 } = listOffsets(coords);
  return R`\left(${d
    .map(
      (s) =>
        R`${k}\operatorname{total}\left(\frac{${LISTS.q}${s}}{\left(${r2}\right)^{1.5}}\right)`
    )
    .join(",")}\right)`;
}

/** The potential at `coords`, Desmos-side: k·Σ q/r. */
export function listPotential(k: string, coords: readonly string[]) {
  const { r2 } = listOffsets(coords);
  return R`${k}\operatorname{total}\left(\frac{${LISTS.q}}{\sqrt{${r2}}}\right)`;
}

/** True outside every charge in use by `radius`, Desmos-side. */
export function listOutside(coords: readonly string[], radius: string) {
  return R`\min\left(${listOffsets(coords).r2}\right)>${radius}^{2}`;
}

/**
 * Red for positive, blue for negative, grey for none, as textbooks colour
 * them, following the slider as it crosses zero.
 */
export const signColor = (q: string) =>
  R`\left\{${q}>0:\operatorname{rgb}\left(189,75,50\right),${q}<0:\operatorname{rgb}\left(36,106,163\right),\operatorname{rgb}\left(119,119,119\right)\right\}`;
/** Charge i's colour, a hidden helper the ball and its arrows share. */
export const colorName = (i: number) => `C_{q${i}vt}`;

/**
 * The charges as Desmos draws them, with a handle on each to drag.
 *
 * In the plane, a disc of world radius `radius` with a white plus or minus,
 * and over it a handle point made of the charge's X and Y sliders, which
 * Desmos drags both ways. In the box, a shaded ball (a surface in u and v,
 * so the depth pass hides particles behind it) and the plugin's own 3D drag
 * handle, since Desmos 3D drags no points.
 */
export function chargeScene(
  dim: 2 | 3,
  radius: string,
  options: { handlesExplain?: boolean; listAxes?: 2 | 3 } = {}
): SceneItem[] {
  const items: SceneItem[] = [
    ...chargeLists(options.listAxes ?? dim),
    ...INDICES.map((i) => ({
      key: `color${i}`,
      latex: R`${colorName(i)}=${signColor(chargeName(i))}`,
      hidden: true,
    })),
  ];
  for (const i of INDICES) {
    const [X, Y, Z] = chargeAt(i);
    const on = R`\left\{${active(i)}\right\}`;
    if (dim === 2) {
      items.push(
        {
          key: `ball${i}`,
          latex: R`\left(x-${X}\right)^{2}+\left(y-${Y}\right)^{2}\le${radius}^{2}${on}`,
          colorLatex: colorName(i),
          fill: true,
          fillOpacity: 1,
          lineWidth: 1.5,
        },
        {
          // A plus or a minus on it, in white: the sign without a word.
          key: `minus${i}`,
          latex: R`\left(${X}+0.55\cdot${radius}t,${Y}\right)${on}\left\{\left|${chargeName(i)}\right|>0\right\}`,
          domain: ["-1", "1"],
          color: "#ffffff",
          lineWidth: 3,
        },
        {
          key: `plus${i}`,
          latex: R`\left(${X},${Y}+0.55\cdot${radius}t\right)${on}\left\{${chargeName(i)}>0\right\}`,
          domain: ["-1", "1"],
          color: "#ffffff",
          lineWidth: 3,
        },
        {
          // A plain point, unrestricted: Desmos gives a point with a
          // restriction no move strategy, and it cannot be dragged
          // (measured 2026-11-07). An unused charge's handle is hidden by
          // its opacity instead.
          key: `handle${i}`,
          latex: R`\left(${X},${Y}\right)`,
          points: true,
          pointSize: 11,
          pointOpacity: R`\left\{${active(i)}:0.35,0\right\}`,
          colorLatex: colorName(i),
          explains: options.handlesExplain ?? false,
        }
      );
    } else {
      items.push(
        {
          key: `ball${i}`,
          latex: R`\left(${X}+${radius}\cos\left(u\right)\sin\left(v\right),${Y}+${radius}\sin\left(u\right)\sin\left(v\right),${Z}+${radius}\cos\left(v\right)\right)${on}`,
          colorLatex: colorName(i),
          domainU: ["0", R`2\pi`],
          domainV: ["0", R`\pi`],
        },
        {
          key: `handle${i}`,
          latex: R`\left(${X},${Y},${Z}\right)${on}`,
          points: true,
          pointSize: 9,
          colorLatex: colorName(i),
          explains: options.handlesExplain ?? false,
          drag3d: [X, Y, Z],
          drag3dWhen: { name: COUNT, atLeast: i },
        }
      );
    }
  }
  return items;
}
