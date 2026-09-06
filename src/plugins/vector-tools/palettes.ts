/**
 * The color ramps, defined once and emitted for both places that draw a field.
 *
 * The generated arrows are colored by a Desmos expression and the flow
 * visualizer by a shader, so a ramp written twice is a ramp that drifts. Both
 * are built here from the same stops, by the same formula.
 *
 * ## Why stops rather than a formula per palette
 *
 * The ramps this replaces were straight lines in RGB — `sequential-a` ran
 * `rgb(35+210t, 75+130t, 155-95t)`, a single segment from dark blue to yellow.
 * A straight line between two hues in RGB passes through the desaturated middle
 * of the cube, so every one of those ramps went through mud at t=0.5 and the
 * arrows read as flat olive. Interpolating through chosen waypoints is what
 * keeps a ramp saturated the whole way along, and it is how the palettes people
 * actually use — viridis and its family — are defined.
 */

/** A color the ramp passes through, at a position along it. */
export interface PaletteStop {
  /** Position in 0..1. Stops are in ascending order and span the full range. */
  at: number;
  /** 0..255, the range both Desmos's `rgb` and a hex color are written in. */
  rgb: readonly [number, number, number];
}

export type PaletteID =
  | "spectral"
  | "sequential-a"
  | "sequential-b"
  | "blue-red"
  | "grayscale"
  | "direction-hue";

export interface Palette {
  name: string;
  /** Undefined for a palette that is not a ramp at all; see `direction-hue`. */
  stops?: readonly PaletteStop[];
}

export const PALETTES: Record<PaletteID, Palette> = {
  /**
   * Blue to teal to yellow to red, the ramp a vector field is usually drawn
   * with. Already what the flow visualizer used for speed, now shared.
   */
  spectral: {
    name: "Spectral",
    stops: [
      { at: 0, rgb: [38, 77, 173] },
      { at: 0.35, rgb: [41, 173, 158] },
      { at: 0.7, rgb: [242, 179, 51] },
      { at: 1, rgb: [217, 61, 56] },
    ],
  },
  /** Viridis, which is perceptually even and readable to color-blind eyes. */
  "sequential-a": {
    name: "Viridis",
    stops: [
      { at: 0, rgb: [68, 1, 84] },
      { at: 0.25, rgb: [59, 82, 139] },
      { at: 0.5, rgb: [33, 145, 140] },
      { at: 0.75, rgb: [94, 201, 98] },
      { at: 1, rgb: [253, 231, 37] },
    ],
  },
  /** A single-hue ramp, for a field that should not shout. */
  "sequential-b": {
    name: "Blue",
    stops: [
      { at: 0, rgb: [8, 29, 88] },
      { at: 0.5, rgb: [34, 94, 168] },
      { at: 1, rgb: [127, 205, 255] },
    ],
  },
  /**
   * Diverging, and therefore light in the middle rather than dark: the neutral
   * value is the one that should recede.
   */
  "blue-red": {
    name: "Blue to red",
    stops: [
      { at: 0, rgb: [33, 102, 172] },
      { at: 0.5, rgb: [247, 247, 247] },
      { at: 1, rgb: [178, 24, 43] },
    ],
  },
  grayscale: {
    name: "Grayscale",
    stops: [
      { at: 0, rgb: [30, 30, 30] },
      { at: 1, rgb: [240, 240, 240] },
    ],
  },
  /**
   * The hue wheel, which is a cycle rather than a ramp — it has no ends to
   * interpolate between, so it is emitted as `hsv` instead of from stops.
   */
  "direction-hue": { name: "Hue wheel" },
};

export const PALETTE_IDS = Object.keys(PALETTES) as PaletteID[];

/** The most stops any palette has, which is what the shader has room for. */
export const MAX_PALETTE_STOPS = 5;

export function paletteStops(id: PaletteID): readonly PaletteStop[] {
  return PALETTES[id].stops ?? PALETTES.spectral.stops!;
}

/**
 * One channel of a ramp, as a starting value plus one clamped segment per stop.
 *
 * Each segment contributes nothing before its stop and its full difference
 * after, so the sum is the piecewise-linear interpolation — written without a
 * conditional, which neither Desmos nor a shader wants inside a hot expression.
 */
function channelTerms(
  stops: readonly PaletteStop[],
  channel: 0 | 1 | 2,
  ramp: (from: number, to: number) => string
): { base: number; terms: { delta: number; ramp: string }[] } {
  const base = stops[0].rgb[channel];
  const terms = [];
  for (let i = 1; i < stops.length; i++) {
    const delta = stops[i].rgb[channel] - stops[i - 1].rgb[channel];
    if (delta === 0) continue;
    terms.push({ delta, ramp: ramp(stops[i - 1].at, stops[i].at) });
  }
  return { base, terms };
}

/**
 * The palette as a Desmos `rgb(...)` expression over `t`, which the caller has
 * already clamped to 0..1.
 *
 * `number` formats a value the way the rest of the generated folder does, so
 * the color list still reads like something a person wrote.
 */
export function paletteLatex(
  id: PaletteID,
  t: string,
  number: (value: number) => string
): string {
  if (id === "direction-hue") {
    return `\\operatorname{hsv}\\left(360\\left(${t}\\right),0.82,0.9\\right)`;
  }
  const stops = paletteStops(id);
  const ramp = (from: number, to: number) =>
    `\\min\\left(1,\\max\\left(0,\\left(${t}-${number(from)}\\right)/${number(
      to - from
    )}\\right)\\right)`;
  const channel = (index: 0 | 1 | 2) => {
    const { base, terms } = channelTerms(stops, index, ramp);
    return terms.reduce(
      (out, term) =>
        `${out}${term.delta < 0 ? "-" : "+"}${number(
          Math.abs(term.delta)
        )}\\left(${term.ramp}\\right)`,
      number(base)
    );
  };
  return `\\operatorname{rgb}\\left(${channel(0)},${channel(1)},${channel(
    2
  )}\\right)`;
}

/** The stops as shader uniforms, padded to the fixed array the shader declares. */
export function paletteUniforms(id: PaletteID) {
  const stops = paletteStops(id);
  const positions = new Float32Array(MAX_PALETTE_STOPS);
  const colors = new Float32Array(MAX_PALETTE_STOPS * 3);
  for (let i = 0; i < MAX_PALETTE_STOPS; i++) {
    const stop = stops[Math.min(i, stops.length - 1)];
    positions[i] = stop.at;
    colors[i * 3] = stop.rgb[0] / 255;
    colors[i * 3 + 1] = stop.rgb[1] / 255;
    colors[i * 3 + 2] = stop.rgb[2] / 255;
  }
  return { positions, colors, count: stops.length };
}

/**
 * The same interpolation as `paletteLatex`, in GLSL, reading the stops from
 * uniforms.
 *
 * Uniforms rather than baked-in constants so that changing the palette is a
 * uniform upload; compiling it into the shader would mean relinking two
 * programs on every click of a color chip.
 */
export const PALETTE_GLSL = `
uniform float u_paletteAt[${MAX_PALETTE_STOPS}];
uniform vec3 u_paletteRGB[${MAX_PALETTE_STOPS}];
uniform int u_paletteCount;
uniform int u_paletteIsHue;

vec3 vtHueRamp(float hue) {
  vec3 k = mod(hue * 6.0 + vec3(0.0, 4.0, 2.0), 6.0);
  return clamp(min(k, 4.0 - k), 0.0, 1.0);
}

vec3 vtPalette(float t) {
  if (u_paletteIsHue == 1) return vtHueRamp(fract(t));
  vec3 rgb = u_paletteRGB[0];
  for (int i = 1; i < ${MAX_PALETTE_STOPS}; i++) {
    if (i >= u_paletteCount) break;
    float from = u_paletteAt[i - 1];
    float to = u_paletteAt[i];
    rgb += (u_paletteRGB[i] - u_paletteRGB[i - 1]) *
           clamp((t - from) / max(to - from, 1e-6), 0.0, 1.0);
  }
  return rgb;
}
`;
