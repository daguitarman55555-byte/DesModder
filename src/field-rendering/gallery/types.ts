import type { PaletteID } from "../palettes";

/**
 * The drawing settings a gallery entry may carry.
 *
 * A subset, and deliberately a small one: every name here means the same thing
 * in both plugins' own settings, so each can spread it into its own without a
 * translation table. Anything that exists in only one of them is that plugin's
 * business and does not belong in a shared list of pictures.
 */
export interface GalleryLook {
  particleCount: number;
  speed: number;
  trailPersistence: number;
  dropRate: number;
  opacity: number;
  pointSize: number;
  glow: number;
  normalizeSpeed: boolean;
}

/**
 * The shelves the presets window groups them on: what kind of picture each
 * is, which is how someone browsing for one thinks of it.
 */
export type GalleryCategory = "space" | "fluids" | "chaos" | "fields";

export const GALLERY_CATEGORIES: readonly {
  id: GalleryCategory;
  label: string;
}[] = [
  { id: "space", label: "Space" },
  { id: "fluids", label: "Fluids" },
  { id: "chaos", label: "Chaos" },
  { id: "fields", label: "Physics" },
];

/**
 * A number a preset's field is written in terms of — a charge, a current, a
 * distance — loaded into the graph as a slider, so the field can be set to a
 * problem's numbers and redrawn as they change. A name the graph already
 * defines is left as the graph has it.
 */
export interface GalleryVariable {
  /** Desmos LaTeX: a letter, optionally subscripted, e.g. `q_{1}`. */
  name: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /**
   * A switch rather than a quantity: 0 or 1, shown as a checkbox with this
   * label, for what the preset's objects show — an arrow, the names.
   */
  toggle?: string;
}

/**
 * One of the Desmos objects a preset draws with its field: a charge, a probe
 * and its arrows, exact field lines. Desmos draws these, so they are crisp,
 * shaded, editable and shareable; the field's particles flow round them.
 * Written in the preset's variables, and hidden helpers alongside.
 */
export interface SceneItem {
  /** Unique in the preset; the end of the item's id in the graph. */
  key: string;
  latex: string;
  color?: string;
  /** A named colour the graph defines, e.g. one that follows a sign. */
  colorLatex?: string;
  hidden?: boolean;
  lines?: boolean;
  points?: boolean;
  lineWidth?: number;
  lineOpacity?: number;
  lineStyle?: "SOLID" | "DASHED" | "DOTTED";
  pointSize?: number;
  pointOpacity?: number;
  fill?: boolean;
  fillOpacity?: number;
  /** A label at the point, Desmos LaTeX between backticks for maths. */
  label?: string;
  labelSize?: number;
  /** The range of t, for a curve in t. */
  domain?: readonly [string, string];
  /** The ranges of u and v, for a surface in u and v on Desmos 3D. */
  domainU?: readonly [string, string];
  domainV?: readonly [string, string];
  /**
   * On Desmos 3D, which draws no labels: a name the plugin draws itself at
   * this item's point, a definition `N=(…)`, undefined while hidden.
   */
  name3d?: { label: string; color: string };
  /**
   * On Desmos 3D, where points cannot be dragged: the three sliders this
   * point is made of, which dragging it moves.
   */
  drag3d?: readonly [string, string, string];
}

/**
 * Numbers a preset's field reads that move with the clock — where its
 * bodies are, how fast they go — worked out on the CPU once a frame and
 * handed to the shader as uniforms, like a slider's value.
 *
 * For anything whose motion is a function of t alone: written into the
 * field as a formula in t instead, every particle would work it out again
 * in every term (see gallery/orbits.ts for what that cost).
 */
export interface ClockParameters {
  /** Desmos names: a letter with a subscript, e.g. `S_{x1}`. */
  names: readonly string[];
  /** Their values at time t, in the order of `names`. */
  at: (t: number) => readonly number[];
}

export interface GalleryPreset {
  id: string;
  name: string;
  category: GalleryCategory;
  /** What it is, in one line, under the name. */
  blurb: string;
  xLatex: string;
  yLatex: string;
  palette: PaletteID;
  /** Applied over whatever the caller's defaults are. */
  flow?: Partial<GalleryLook>;
  /** Half-width of the square the field is framed in. */
  extent?: number;
  /** How fast the clock runs, for the ones that move. */
  timeSpeed?: number;
  /** The dark it is drawn on. Defaults to a near-black blue. */
  backdrop?: string;
  /**
   * Where the 2D flow's particles are born, a chance from 0 to 1 over x and
   * y: the matter the field carries. Designed for Desmos's default view,
   * about ±10. Absent, they are born everywhere.
   */
  seedLatex?: string;
  /** A black hole at the origin, with this horizon radius. */
  lensHorizon?: number;
  /** The numbers the field is written in, loaded as sliders. */
  variables?: readonly GalleryVariable[];
  /** The Desmos objects drawn with the field, loaded beside its variables. */
  scene?: readonly SceneItem[];
  /**
   * Drawn on the graph paper, as a textbook figure is: no dark backdrop, and
   * the flow faint and under Desmos's objects, which carry the picture.
   */
  onPaper?: boolean;
  /** Numbers that move with the clock, worked out each frame. */
  clockParameters?: ClockParameters;
  /** The speed the 2D colour ramp spans, where Auto's would not suit. */
  colorScale?: number;
  /** One colour rather than a ramp, for the 2D flow. */
  fixedColor?: string;
  /**
   * The same picture on Desmos 3D: the field with a third component, and
   * what is different about it in a box. Every preset has one, so loading a
   * preset on /3d never gives a field that lies flat by accident.
   */
  space: {
    blurb: string;
    xLatex: string;
    yLatex: string;
    zLatex: string;
    /**
     * Where the flow's particles are born, a chance from 0 to 1: the matter
     * the field carries. A disk is a thin seed in a rotating field, not a
     * field that happens to look thin; absent, they are born everywhere.
     */
    seedLatex?: string;
    /** A black hole at the origin bending light, with this horizon radius. */
    lensHorizon?: number;
    /** The numbers the 3D field is written in, where they differ. */
    variables?: readonly GalleryVariable[];
    /** The Desmos 3D objects drawn with the field. */
    scene?: readonly SceneItem[];
    /** Numbers that move with the clock, for the 3D field. */
    clockParameters?: ClockParameters;
    /** How the 3D flow is drawn, over the caller's defaults. */
    look?: Partial<SpaceLook>;
  };
}

/**
 * The 3D flow's drawing settings a gallery entry may carry. Designed for
 * Desmos 3D's default box, ±5 on each axis, which is where a preset is
 * loaded unless the user has moved it.
 */
export interface SpaceLook {
  /** The 3D picture's own palette, where it differs from the 2D one. */
  palette: PaletteID;
  particles: number;
  /** Box half-widths per second. */
  speed: number;
  trail: number;
  lifetime: number;
  opacity: number;
  glow: number;
  normalizeSpeed: boolean;
  absorb: boolean;
  colorMode: "speed" | "fixed";
  fixedColor: string;
  backdrop: string;
  backdropOpacity: number;
  /**
   * The field strength the flow's speed and colours are measured against,
   * where Auto's would not suit. A particle moves at speed × |F| / scale
   * box half-widths a second, so a scale of (the box's half-width × speed)
   * runs the particles on the same clock as `t`: what a picture needs whose
   * matter rides along with something the clock moves.
   */
  scale: number;
}

/** The dark these are drawn on where a preset does not name its own. */
export const GALLERY_DEFAULT_BACKDROP = "#0d1020";
