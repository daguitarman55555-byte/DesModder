import MazeDemoEngine from "./MazeDemoEngine";

describe("MazeDemoEngine", () => {
  it("round-trips its state exactly", async () => {
    const engine = new MazeDemoEngine();
    await engine.start();
    engine.step(0.05, { forward: 1, strafe: 0, turn: 0.5, action: false });
    const saved = engine.serialize();
    engine.step(0.05, { forward: -1, strafe: 1, turn: -1, action: true });
    engine.restore(saved);
    expect(engine.serialize()).toEqual(saved);
  });

  it("keeps its fixed framebuffer contract", () => {
    const engine = new MazeDemoEngine();
    expect(engine.width).toBe(320);
    expect(engine.height).toBe(200);
    expect(engine.serialize()).toHaveLength(24);
  });

  it("rejects malformed saves", () => {
    const engine = new MazeDemoEngine();
    expect(() => engine.restore(new Uint8Array(3))).toThrow("invalid");
  });
});
