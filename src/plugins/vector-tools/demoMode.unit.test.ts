import { configFromGallery, FIELD_GALLERY, presetForMode } from "./gallery";

describe("demo mode", () => {
  test("every preset says what its colour means", () => {
    for (const preset of FIELD_GALLERY) {
      expect(preset.meaning).toBeDefined();
      expect(preset.meaning!.quantity.length).toBeGreaterThan(0);
    }
  });

  test("a coloured-by-a-formula preset names the quantity, not just speed", () => {
    for (const preset of FIELD_GALLERY.filter((p) => p.tint !== undefined))
      expect(preset.meaning!.quantity).not.toMatch(/^Speed/);
  });

  test("Explanatory is each preset as written", () => {
    for (const preset of FIELD_GALLERY)
      expect(presetForMode(preset, "explanatory")).toBe(preset);
  });

  test("Majestic puts a paper preset on the dark, its colour still meaning the same", () => {
    const charges = FIELD_GALLERY.find((p) => p.id === "charges")!;
    const majestic = presetForMode(charges, "majestic");
    expect(majestic.onPaper).toBe(false);
    expect(majestic.palette).toBe("charge-glow");
    expect(majestic.tint).toEqual(charges.tint);
    const config = configFromGallery(majestic, undefined, 2);
    expect(config.flow.backdropEnabled).toBe(true);
    expect(config.flow.colorMode).toBe("scalar");
    expect(config.color.inkAuto).toBe(false);
  });

  test("Majestic leaves a preset that was never on paper alone", () => {
    for (const preset of FIELD_GALLERY.filter((p) => p.onPaper !== true))
      expect(presetForMode(preset, "majestic")).toBe(preset);
  });

  test("Majestic keeps a physics preset's solids and hides its explanation", () => {
    const charges = FIELD_GALLERY.find((p) => p.id === "charges")!;
    const shown = (charges.scene ?? []).filter(
      (item) => item.hidden !== true && item.explains !== true
    );
    expect(shown.map((item) => item.key)).toEqual(
      expect.arrayContaining(["ball1", "ball2"])
    );
    // The dipole is a point: nothing solid to keep.
    const dipole = FIELD_GALLERY.find((p) => p.id === "dipole")!;
    expect(
      (dipole.scene ?? []).filter(
        (item) => item.hidden !== true && item.explains !== true
      )
    ).toEqual([]);
  });
});
