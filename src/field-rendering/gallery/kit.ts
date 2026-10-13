/**
 * The pieces every physics preset writes its formulas and its Desmos scene
 * with: Desmos LaTeX built in its canonical form (`\left(…\right)`, `x^{2}`),
 * so Desmos reads it as written; sliders and switches; and scene objects.
 *
 * Gallery code only. Each preset file used to carry its own copy of these,
 * four copies drifting apart in small ways (a variadic point here, an array
 * there); one copy is one place to get them right.
 */
import type {
  GalleryLook,
  GalleryVariable,
  SceneItem,
  SpaceLook,
} from "./types";

export { num } from "./latex";

const { raw } = String;

/** `(x)`, with Desmos's own brackets. */
export const par = (x: string) => raw`\left(${x}\right)`;
/** `(x)²`. */
export const sq = (x: string) => `${par(x)}^{2}`;
export const root = (x: string) => raw`\sqrt{${x}}`;
export const abs = (x: string) => raw`\left|${x}\right|`;
export const frac = (x: string, y: string) => raw`\frac{${x}}{${y}}`;
/** Each factor bracketed, joined by ·: safe whatever the factors are. */
export const mul = (...x: string[]) => x.map(par).join(raw`\cdot`);
export const sin = (x: string) => raw`\sin${par(x)}`;
export const cos = (x: string) => raw`\cos${par(x)}`;
export const ln = (x: string) => raw`\ln${par(x)}`;
export const atan = (x: string) => raw`\arctan${par(x)}`;
export const mod = (a: string, b: string) =>
  raw`\operatorname{mod}${par(`${a},${b}`)}`;
/** A point or vector, `(x, y)` or `(x, y, z)`. */
export const point = (...x: readonly string[]) => par(x.join(","));
/** The sum of the squares: a squared length. */
export const norm2 = (x: readonly string[]) => x.map(sq).join("+");
/** A restriction, appended to an expression: `{test}`. */
export const only = (test: string) => raw`\left\{${test}\right\}`;
/** `x` where `test` holds, 0 elsewhere: a field cut to where it is drawn. */
export const guard = (test: string, x: string) =>
  raw`\left\{${test}:${x},0\right\}`;

/** A slider. */
export const variable = (
  name: string,
  value: number,
  min: number,
  max: number,
  step = 0.1
): GalleryVariable => ({ name, value, min, max, step });

/** A switch: a 0-or-1 slider the presets window shows as a checkbox. */
export const toggle = (
  name: string,
  value: 0 | 1,
  label: string
): GalleryVariable => ({ ...variable(name, value, 0, 1, 1), toggle: label });

/**
 * Scene objects drawn in one ink, the colour a preset's paper picture is
 * inked in unless an object says otherwise.
 */
export function inked(ink: string) {
  const obj = (
    key: string,
    latex: string,
    extra: Partial<SceneItem> = {}
  ): SceneItem => ({ key, latex, color: ink, ...extra });
  /** A curve in t over `domain`, from its LaTeX. */
  const curve = (
    key: string,
    latex: string,
    domain: readonly [string, string],
    extra: Partial<SceneItem> = {}
  ) => obj(key, latex, { domain, lineWidth: 2, ...extra });
  /** The same, through coordinates in t: `path("orbit", [x, y], …)`. */
  const path = (
    key: string,
    xyz: readonly string[],
    domain: readonly [string, string],
    extra: Partial<SceneItem> = {}
  ) => curve(key, point(...xyz), domain, extra);
  /** A solid surface in u and v, opaque unless it says otherwise. */
  const surface = (
    key: string,
    xyz: readonly string[],
    u: readonly [string, string],
    v: readonly [string, string],
    extra: Partial<SceneItem> = {}
  ) =>
    obj(key, point(...xyz), {
      domainU: u,
      domainV: v,
      fill: true,
      fillOpacity: 1,
      ...extra,
    });
  /**
   * A body: a point in 2D, a small sphere in 3D. A Desmos 3D point is
   * covered by Majestic's dark, which is cut away only where a surface is,
   * so there a point would vanish; a sphere also reads as a solid, and one
   * moving with the scene's clock is painted by the overlay at its instant.
   * Its centre is written out in each coordinate, as the depth pass compiles
   * the surface's own LaTeX and cannot follow a named point.
   */
  const ball = (
    key: string,
    at: readonly string[],
    dim: 2 | 3,
    options: {
      radius?: string;
      pointSize?: number;
      extra?: Partial<SceneItem>;
    } = {}
  ): SceneItem => {
    const { radius = "0.3", pointSize = 16, extra = {} } = options;
    return dim === 2
      ? obj(key, point(at[0], at[1]), { points: true, pointSize, ...extra })
      : surface(
          key,
          [
            `${par(at[0])}+${mul(radius, cos("u"), sin("v"))}`,
            `${par(at[1])}+${mul(radius, sin("u"), sin("v"))}`,
            `${par(at[2])}+${mul(radius, cos("v"))}`,
          ],
          ["0", raw`2\pi`],
          ["0", raw`\pi`],
          extra
        );
  };
  return { obj, curve, path, surface, ball };
}

/**
 * A physics preset's 2D flow: the charges' density, 24,000 particles (at
 * 6,000 a flow was too sparse to read as a field on paper, and barely there
 * on the dark), thinned by `density` where it is confined. `normalize`
 * draws direction only, for a field whose strength spans orders of
 * magnitude, which otherwise stood still as dots away from its sources.
 */
export const flow2D = ({
  speed,
  density = 1,
  normalize = false,
  opacity = 0.45,
}: {
  speed: number;
  density?: number;
  normalize?: boolean;
  opacity?: number;
}): Partial<GalleryLook> => ({
  particleCount: Math.round(24_000 * density),
  speed,
  trailPersistence: 0.84,
  dropRate: 0.03,
  opacity,
  pointSize: 1.5,
  glow: 0,
  normalizeSpeed: normalize,
});

/** The same in 3D: 30,000 particles, on the charge palette. */
export const flow3D = ({
  speed,
  density = 1,
  normalize = false,
}: {
  speed: number;
  density?: number;
  normalize?: boolean;
}): Partial<SpaceLook> => ({
  particles: Math.round(30_000 * density),
  speed,
  trail: 16,
  lifetime: 1.2,
  opacity: 0.55,
  glow: 0,
  normalizeSpeed: normalize,
  absorb: false,
  palette: "charge",
});
