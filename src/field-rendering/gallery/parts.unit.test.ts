import { FIELD_GALLERY, galleryPreset } from "./index";
import { sceneParts } from "./parts";

describe("a preset's parts, to show and hide", () => {
  test("an arrow is one part, named by its vector", () => {
    const parts = sceneParts(galleryPreset("ap-incline-forces")!.scene!);
    const net = parts.find((p) => p.name === "F_{net}")!;
    expect(net.label).toBe("Arrow");
    expect(net.keys).toEqual(
      expect.arrayContaining(["netForceshaft", "netForcehead", "netForcename"])
    );
  });

  test("a value the graph only computes is not a part", () => {
    const parts = sceneParts(galleryPreset("ap-incline-forces")!.scene!);
    const keys = parts.flatMap((p) => p.keys);
    expect(keys).not.toContain("fric");
    expect(keys).not.toContain("net");
  });

  test("on Desmos 3D, an arrow's name goes with its arrow", () => {
    const parts = sceneParts(galleryPreset("charges")!.space.scene!);
    const field = parts.find((p) => p.id === "arrow:E")!;
    expect(field.keys).toContain("Earrow");
    expect(field.names3d).toEqual(["Ename"]);
  });

  test.each(
    FIELD_GALLERY.filter((p) => p.scene !== undefined).map((p) => p.id)
  )("every object %s draws belongs to a named part", (id) => {
    const preset = galleryPreset(id)!;
    for (const scene of [preset.scene!, preset.space.scene ?? []]) {
      const parts = sceneParts(scene);
      for (const part of parts) expect(part.label).not.toBe("");
      const grouped = new Set(parts.flatMap((p) => [...p.keys, ...p.names3d]));
      // Anything drawn: a point, a curve, a surface or a label.
      const drawn = scene.filter(
        (item) =>
          item.hidden !== true &&
          (item.points === true ||
            item.domain !== undefined ||
            item.domainU !== undefined ||
            item.label !== undefined)
      );
      for (const item of drawn)
        expect([id, grouped.has(item.key)]).toEqual([id, true]);
    }
  });
});

describe("drag handles", () => {
  test.each(
    FIELD_GALLERY.filter((p) =>
      (p.scene ?? []).some((i) => i.key.startsWith("handle"))
    ).map((p) => p.id)
  )("%s's handles move its own sliders", (id) => {
    const preset = galleryPreset(id)!;
    const names = (preset.variables ?? []).map((v) => v.name);
    for (const handle of preset.scene!.filter((i) =>
      i.key.startsWith("handle")
    ))
      expect(names.some((name) => handle.latex.includes(name))).toBe(true);
  });
});
