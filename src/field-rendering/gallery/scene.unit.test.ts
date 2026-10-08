import { FIELD_GALLERY } from "./index";
import type { GalleryPreset, GalleryVariable, SceneItem } from "./types";

type Row = [string, readonly SceneItem[], readonly GalleryVariable[]];

/** Every preset's objects, with the variables they are loaded beside. */
const scenes: Row[] = FIELD_GALLERY.flatMap((p: GalleryPreset): Row[] => [
  [`${p.id} 2D`, p.scene ?? [], p.variables ?? []],
  [`${p.id} 3D`, p.space.scene ?? [], p.space.variables ?? p.variables ?? []],
]).filter(([, scene]) => scene.length > 0);

describe("a preset's Desmos objects", () => {
  test("some preset has them", () => {
    expect(scenes.length).toBeGreaterThan(0);
  });

  test.each(scenes)("%s: keys are unique and fit in an id", (_, scene) => {
    const keys = scene.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key).toMatch(/^[A-Za-z0-9]+$/);
  });

  // Each of these is a mistake Desmos refused live (2026-10-07), which no
  // unit test can parse for: so the patterns themselves are kept out.
  test.each(scenes)("%s: none of the forms Desmos refuses", (_, scene) => {
    for (const { latex } of scene) {
      // 0.55 next to 0.4 reads as "0.550.4", two adjacent numbers.
      expect(latex).not.toMatch(/\d\.\d+0\.\d/);
      // A number before a list reads as indexing it: 0.25[…].
      expect(latex).not.toMatch(/\d\\left\[/);
      // A bare trig argument followed by another factor: \cos u\sin v.
      expect(latex).not.toMatch(/\\(sin|cos|tan) [a-z]\\/);
      // Desmos has no ≠ in a condition.
      expect(latex).not.toMatch(/\\ne\b|\\neq\b/);
      // |y| must be \left|y\right|.
      expect(latex.replace(/\\left\||\\right\|/g, "")).not.toContain("|");
    }
  });

  test.each(scenes)(
    "%s: every switch it reads is one of its variables",
    (_, scene, variables) => {
      const names = new Set(variables.map((v) => v.name));
      const switches = new Set(
        scene.flatMap((item) => item.latex.match(/s_\{[a-z]+\}/g) ?? [])
      );
      for (const s of switches) expect(names).toContain(s);
    }
  );
});
