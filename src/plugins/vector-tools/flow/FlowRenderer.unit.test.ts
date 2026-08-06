import {
  DEFAULT_FLOW_OPTIONS,
  FlowRenderer,
  hexToUnitRGB,
  particleCapacityFor,
  particleResolutionFor,
  type FlowOptions,
} from "./FlowRenderer";

describe("Vector Tools flow particle capacity", () => {
  it("never allocates below the floor", () => {
    expect(particleCapacityFor(1)).toBe(512);
    expect(particleCapacityFor(0)).toBe(512);
    expect(particleCapacityFor(-5)).toBe(512);
    expect(particleCapacityFor(Number.NaN)).toBe(512);
  });

  it("rounds a count up to a power of two", () => {
    expect(particleCapacityFor(513)).toBe(1024);
    expect(particleCapacityFor(16_000)).toBe(16_384);
    expect(particleCapacityFor(400_000)).toBe(524_288);
  });

  it("leaves an exact power of two alone", () => {
    for (let capacity = 512; capacity <= 2 ** 20; capacity *= 2) {
      expect(particleCapacityFor(capacity)).toBe(capacity);
    }
  });

  it("gives a square that holds the whole capacity", () => {
    for (let capacity = 512; capacity <= 2 ** 20; capacity *= 2) {
      const resolution = particleResolutionFor(capacity);
      expect(resolution * resolution).toBeGreaterThanOrEqual(capacity);
      expect((resolution - 1) * (resolution - 1)).toBeLessThan(capacity);
    }
  });
});

describe("Vector Tools flow renderer allocation", () => {
  /**
   * Dragging the count slider fires one `setOptions` per pointermove. Before
   * capacity was split from count, each of those deleted and recreated both
   * float textures and the index buffer — a multi-megabyte reallocation per
   * frame at the top of the range.
   */
  it("does not reallocate while the count sweeps its whole range", () => {
    const gl = fakeGL();
    const renderer = new FlowRenderer(fakeCanvas(gl));
    renderer.setField({ kind: "components", p: "p.x", q: "p.y" });
    const allocationsAtStart = gl.counts.createTexture;

    for (let position = 0; position <= 1000; position++) {
      renderer.setOptions(optionsWithCount(sweptCount(position)));
    }

    // 500 to 400,000 crosses ten power-of-two boundaries, and each one
    // allocates a read and a write texture.
    const allocations = gl.counts.createTexture - allocationsAtStart;
    expect(allocations).toBeLessThanOrEqual(2 * 12);
    expect(gl.counts.deleteTexture).toBeLessThanOrEqual(allocations + 2);
  });

  it("reallocates nothing at all when the count shrinks within capacity", () => {
    const gl = fakeGL();
    const renderer = new FlowRenderer(fakeCanvas(gl));
    renderer.setField({ kind: "components", p: "p.x", q: "p.y" });
    renderer.setOptions(optionsWithCount(400_000));
    const allocationsAtStart = gl.counts.createTexture;

    // A quarter of the capacity is the shrink threshold, so everything above
    // it reuses the textures already on the GPU.
    for (let count = 400_000; count > 524_288 / 4; count -= 100) {
      renderer.setOptions(optionsWithCount(count));
    }

    expect(gl.counts.createTexture).toBe(allocationsAtStart);
  });

  it("hands memory back once the count falls well below capacity", () => {
    const gl = fakeGL();
    const renderer = new FlowRenderer(fakeCanvas(gl));
    renderer.setField({ kind: "components", p: "p.x", q: "p.y" });
    renderer.setOptions(optionsWithCount(400_000));
    const allocationsAtStart = gl.counts.createTexture;

    renderer.setOptions(optionsWithCount(1_000));

    expect(gl.counts.createTexture).toBe(allocationsAtStart + 2);
  });

  it("draws exactly the requested count", () => {
    const gl = fakeGL();
    const renderer = new FlowRenderer(fakeCanvas(gl));
    renderer.setField({ kind: "components", p: "p.x", q: "p.y" });
    renderer.resize(400, 300, 1);

    for (const count of [500, 1_000, 16_000, 120_000, 400_000, 2_000]) {
      renderer.setOptions(optionsWithCount(count));
      gl.counts.pointsDrawn = 0;
      renderer.frame();
      expect(gl.counts.pointsDrawn).toBe(count);
    }
  });

  it("steps only the texture rows that hold live particles", () => {
    const gl = fakeGL();
    const renderer = new FlowRenderer(fakeCanvas(gl));
    renderer.setField({ kind: "components", p: "p.x", q: "p.y" });
    renderer.resize(400, 300, 1);
    // 1,000 particles allocates a 1,024 capacity in a 32x32 texture; dropping
    // to 600 keeps that texture, so only the first 19 rows are still live.
    renderer.setOptions(optionsWithCount(1_000));
    renderer.setOptions(optionsWithCount(600));
    gl.counts.viewports = [];
    renderer.frame();

    const resolution = particleResolutionFor(particleCapacityFor(1_000));
    expect(resolution).toBe(32);
    // The step pass runs first, so its viewport is the first one of the frame.
    expect(gl.counts.viewports[0]).toEqual([
      0,
      0,
      resolution,
      Math.ceil(600 / resolution),
    ]);
  });
});

describe("Vector Tools flow fixed color", () => {
  it("reads both hex lengths and falls back on nonsense", () => {
    expect(hexToUnitRGB("#ffffff")).toEqual([1, 1, 1]);
    expect(hexToUnitRGB("#000")).toEqual([0, 0, 0]);
    expect(hexToUnitRGB("nope")).toEqual([0.4, 0.3, 0.7]);
  });
});

function optionsWithCount(particleCount: number): FlowOptions {
  return { ...DEFAULT_FLOW_OPTIONS, particleCount };
}

/** The panel's logarithmic slider, at 1,001 positions across its track. */
function sweptCount(position: number) {
  const t = position / 1000;
  return Math.round(
    Math.exp(Math.log(500) + t * (Math.log(400_000) - Math.log(500)))
  );
}

function fakeCanvas(gl: FakeGL) {
  return {
    width: 0,
    height: 0,
    clientWidth: 400,
    clientHeight: 300,
    getContext: () => gl,
  } as unknown as HTMLCanvasElement;
}

interface FakeGL {
  counts: {
    createTexture: number;
    deleteTexture: number;
    pointsDrawn: number;
    viewports: number[][];
  };
  [key: string]: any;
}

/**
 * Just enough of WebGL2 to run the renderer's allocation and frame paths
 * headlessly. Every GL name resolves to a distinct number so the renderer's
 * enum comparisons still mean something, and the handful of methods whose
 * return value the renderer actually inspects are answered explicitly.
 */
function fakeGL(): FakeGL {
  const counts = {
    createTexture: 0,
    deleteTexture: 0,
    pointsDrawn: 0,
    viewports: [] as number[][],
  };
  // Well clear of POINTS, so no generated constant can collide with it.
  let nextConstant = 1000;
  const constants = new Map<string, number>();
  const POINTS = 100;
  const noop = () => {};

  const methods: Record<string, (...args: any[]) => any> = {
    getExtension: (name: string) =>
      name === "WEBGL_lose_context" ? { loseContext: () => {} } : {},
    createBuffer: () => ({}),
    createFramebuffer: () => ({}),
    createShader: () => ({}),
    createProgram: () => ({}),
    createTexture: () => {
      counts.createTexture++;
      return {};
    },
    deleteTexture: () => counts.deleteTexture++,
    getShaderParameter: () => true,
    getProgramParameter: (_program: unknown, pname: number) =>
      pname === constants.get("ACTIVE_UNIFORMS") ? 0 : true,
    getAttribLocation: () => 0,
    getUniformLocation: () => ({}),
    getShaderInfoLog: () => "",
    getProgramInfoLog: () => "",
    viewport: (...box: number[]) => counts.viewports.push(box),
    drawArrays: (mode: number, _first: number, count: number) => {
      if (mode === POINTS) counts.pointsDrawn += count;
    },
  };

  const context: FakeGL = { counts };
  return new Proxy(context, {
    get(target, property) {
      if (typeof property !== "string") return undefined;
      if (property === "counts") return target.counts;
      if (property in methods) return methods[property];
      // GL constants are the SHOUTING names; anything else is a method whose
      // return value the renderer does not look at, so a no-op will do.
      if (!/^[A-Z0-9_]+$/.test(property)) return noop;
      // POINTS has to keep the value drawArrays is checked against; every other
      // name only needs to be distinct.
      if (property === "POINTS") return POINTS;
      if (!constants.has(property)) constants.set(property, ++nextConstant);
      return constants.get(property);
    },
  });
}
