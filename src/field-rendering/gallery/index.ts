/**
 * Fields chosen because they are worth looking at.
 *
 * These live here, in the package neither plugin owns, because more than one
 * thing now wants them: Vector Tools offers them as saved fields, and Audio Lab
 * offers them as starting points for a field the music moves. What they are —
 * a name, a blurb, two components and the look that makes the picture — is not
 * specific to either, and a copy in each would be two lists to keep in step.
 *
 * What is *not* here is how a preset becomes a configuration. Each plugin's
 * configuration format is its own, so each does that mapping itself.
 *
 * ## A preset is a whole look, not two formulas
 *
 * Setting only P and Q and leaving everything else where it was produces a
 * black hole drawn as a grid of short blue arrows, which is nobody's idea of a
 * black hole. Each entry therefore carries its palette, its flow settings, the
 * domain it is framed in and whether arrows are drawn at all — because the
 * thing being chosen is the picture, and the formula is only how it is made.
 *
 * ## The maths is real
 *
 * None of these is a shape drawn to look like something. The galaxy's arms come
 * out of differential rotation — inner orbits going round faster than outer
 * ones, which is what winds a spiral out of a disc — and the black hole's
 * particles accelerate inward because the field really does go as a power of
 * 1/r. That matters here more than it would elsewhere: these plugins' whole
 * claim is that what you see is the field, so a preset that cheated would be
 * the one thing in them that lies.
 *
 * ## The LaTeX is Desmos's own
 *
 * Every component is written the way Desmos writes it: `\left(` and
 * `\right)` around a group, `\frac{a}{b}`, `x^{2}`, `\cdot` for an explicit
 * product. The compiler accepts the shorter spellings too, but these strings
 * are put in front of people and pasted into graphs, and one that came back
 * from Desmos looking different from the one that went in is a small lie about
 * where it came from.
 */
import { CHAOS } from "./chaos";
import { COLOR_MEANINGS } from "./meanings";
import { AP_TEACHING } from "./ap-teaching";
import { AP_NEXT } from "./ap-next";
import { FLUIDS } from "./fluids";
import { PHYSICS } from "./physics";
import { SPACE } from "./space";
import { TAKEAWAYS } from "./takeaways";
import { handlesFor } from "./handles";
import { tidy } from "./latex";
import { renameIdentifier } from "../identifiers";
import type { ClockParameters, GalleryPreset, GalleryVariable } from "./types";

export * from "./types";
export { sceneParts, type ScenePart } from "./parts";

/**
 * Every preset, shelf by shelf, in the order the presets window shows them,
 * each with what its colour means, what to take away from it, and handles
 * on the graph for what its sliders place.
 */
export const FIELD_GALLERY: readonly GalleryPreset[] = [
  ...SPACE,
  ...FLUIDS,
  ...CHAOS,
  ...PHYSICS,
  ...AP_TEACHING,
  ...AP_NEXT,
].map((preset) => {
  const handles = handlesFor(preset.id);
  return tidied({
    ...preset,
    meaning: preset.meaning ?? COLOR_MEANINGS[preset.id],
    takeaway: preset.takeaway ?? TAKEAWAYS[preset.id],
    ...(handles.length > 0
      ? { scene: [...(preset.scene ?? []), ...handles] }
      : {}),
  });
});

/** Where a preset keeps LaTeX: every one of these goes through `tidy`. */
function isLatexKey(key: string) {
  return [
    "xLatex",
    "yLatex",
    "zLatex",
    "seedLatex",
    "latex",
    "latex3d",
    "colorLatex",
    "lineOpacity",
    "domain",
    "domainU",
    "domainV",
  ].includes(key);
}

/** The preset with its LaTeX tidied (see `tidy`), and nothing else changed. */
function tidied<T>(value: T, key = ""): T {
  if (typeof value === "string")
    return (isLatexKey(key) ? tidy(value) : value) as T;
  if (Array.isArray(value))
    return value.map((v) => tidied(v, key)) as unknown as T;
  if (value === null || typeof value !== "object") return value;
  // Clock parameters' functions, and anything else not plain data, as is.
  if (Object.getPrototypeOf(value) !== Object.prototype) return value;
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [
      k,
      typeof v === "function" ? v : tidied(v, k),
    ])
  ) as T;
}

/**
 * The preset with its variables written in as their values, and its clock
 * parameters as their values at t = 0: for a place that has neither sliders
 * nor a clock to give them — Audio Lab, and the tests that compile every
 * preset with nothing else in the graph. A preset whose bodies move by
 * clock parameters is a still picture there.
 */
export function withVariablesInlined(preset: GalleryPreset): GalleryPreset {
  const values = (
    variables: readonly GalleryVariable[] | undefined,
    clock: ClockParameters | undefined
  ): [string, number][] => {
    const at = clock?.at(0) ?? [];
    return [
      ...(variables ?? []).map((v): [string, number] => [v.name, v.value]),
      ...(clock?.names ?? []).map((name, i): [string, number] => [name, at[i]]),
    ];
  };
  const inline = (latex: string | undefined, names: [string, number][]) =>
    latex === undefined
      ? undefined
      : names.reduce(
          (out, [name, value]) =>
            renameIdentifier(out, name, String.raw`\left(${value}\right)`),
          latex
        );
  const flat = values(preset.variables, preset.clockParameters);
  const space = values(
    preset.space.variables ?? preset.variables,
    preset.space.clockParameters
  );
  if (flat.length === 0 && space.length === 0) return preset;
  return {
    ...preset,
    xLatex: inline(preset.xLatex, flat)!,
    yLatex: inline(preset.yLatex, flat)!,
    seedLatex: inline(preset.seedLatex, flat),
    variables: undefined,
    clockParameters: undefined,
    space: {
      ...preset.space,
      xLatex: inline(preset.space.xLatex, space)!,
      yLatex: inline(preset.space.yLatex, space)!,
      zLatex: inline(preset.space.zLatex, space)!,
      seedLatex: inline(preset.space.seedLatex, space),
      variables: undefined,
      clockParameters: undefined,
    },
  };
}

/** Which version of a preset with `variants` is shown, by preset id. */
const chosenVariant = new Map<string, number>();
/** Versions built so far, tidied, by `${id}:${index}`. */
const builtVariants = new Map<string, GalleryPreset>();

/**
 * The preset, as the version of it now chosen if it has several (see
 * `GalleryPreset.variants`).
 */
export function galleryPreset(id: string): GalleryPreset | undefined {
  const preset = FIELD_GALLERY.find((p) => p.id === id);
  const index = chosenVariant.get(id) ?? 0;
  if (preset?.variants === undefined || index === 0) return preset;
  const key = `${id}:${index}`;
  let built = builtVariants.get(key);
  if (built === undefined) {
    const version = preset.variants.build(index);
    built = tidied({
      ...preset,
      ...version,
      space: { ...preset.space, ...version.space },
    });
    builtVariants.set(key, built);
  }
  return built;
}

/**
 * Picks another version of a preset that has several, at random and never
 * the one just shown, so choosing it again shows something new. Returns
 * whether there was one to pick.
 */
export function choosePresetVariant(
  id: string,
  random: () => number = Math.random
) {
  const count = FIELD_GALLERY.find((p) => p.id === id)?.variants?.count ?? 0;
  if (count < 2) return false;
  const now = chosenVariant.get(id) ?? 0;
  const next = (now + 1 + Math.floor(random() * (count - 1))) % count;
  chosenVariant.set(id, next);
  return true;
}
