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
  { id: "fields", label: "Fields" },
];

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
  /** The speed the 2D colour ramp spans, where Auto's would not suit. */
  colorScale?: number;
  /** One colour rather than a ramp, for the 2D flow. */
  fixedColor?: string;
  /**
   * The 2D flow coloured by which way the field points rather than how
   * strong it is: for a field whose strength falls so fast that colouring
   * by it leaves all but the centre dark.
   */
  colorByDirection?: boolean;
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
