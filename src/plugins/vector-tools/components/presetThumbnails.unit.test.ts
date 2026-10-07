import { FIELD_GALLERY } from "../gallery";
import { PRESET_THUMBNAILS } from "./presetThumbnails";

test("every preset has a thumbnail for both products, and they stay small", () => {
  for (const preset of FIELD_GALLERY) {
    const thumb = PRESET_THUMBNAILS[preset.id];
    // A new preset without one still gets its colour swatch, but the window
    // reads as pictures, so a missing one means preset-thumbnails.cjs was
    // not run.
    expect([preset.id, thumb?.plane.startsWith("data:image/webp")]).toEqual([
      preset.id,
      true,
    ]);
    expect(thumb.space.startsWith("data:image/webp")).toBe(true);
    // Twenty-eight of them ship in the extension.
    expect(thumb.plane.length + thumb.space.length).toBeLessThan(12_000);
  }
});
