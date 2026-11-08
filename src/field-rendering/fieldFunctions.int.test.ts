import { testWithPageAndOpts, type Driver } from "#tests";
import type { Calc as CalcType } from "#globals";
import {
  compileFieldComponentToGLSL,
  GLSL_PRELUDE,
  type FieldEnvironment,
} from "./latexToGLSL";
import { compileExpression } from "./sim/strictEvaluate";
import { emitExpressionGLSL, STRICT_GLSL_PRELUDE } from "./sim/strictGLSL";
import { parseStrictExpression } from "./sim/strictParse";

declare let Calc: CalcType;

/**
 * Every Desmos function the field compiler learned on 2026-11-07, held to
 * live Desmos: Desmos evaluates `F(x, y) = …` at a few points, and the
 * compiled GLSL runs on the GPU at the same points. A string comparison of
 * the GLSL would prove nothing about precedence, list handling or the
 * numerical derivatives; the GPU's own numbers do.
 */

const R = String.raw;
/** A definition the graph provides, for `g'` and `g''`. */
const DEFINITIONS: [string, string[], string][] = [
  ["g", ["a"], R`a^{3}+\sin\left(a\right)`],
];
const env: FieldEnvironment = {
  functions: new Map(
    DEFINITIONS.map(([name, params, latex]) => [name, { params, latex }])
  ),
  scalars: new Set(),
};

const POINTS: [number, number][] = [
  [0.7, 1.3],
  [-1.2, 0.4],
  [2.1, -0.6],
];

/** [LaTeX, relative tolerance]: derivatives and integrals are approximate. */
const CASES: [string, number][] = [
  [R`\left(x+1\right)!`, 1e-4],
  [R`\operatorname{median}\left(x,y,2\right)`, 1e-6],
  [R`\operatorname{sgn}\left(x\right)`, 1e-6],
  [R`\operatorname{erf}\left(x\right)`, 1e-5],
  [
    R`\operatorname{gcd}\left(12,18\right)+\operatorname{lcm}\left(4,6\right)+x`,
    1e-6,
  ],
  [
    R`\operatorname{nCr}\left(7,3\right)+\operatorname{nPr}\left(5,2\right)x`,
    1e-6,
  ],
  [R`\operatorname{nCr}\left(x+3,2\right)`, 1e-4],
  [R`\operatorname{round}\left(3x,1\right)`, 1e-5],
  [R`\min\left(x,y,1,2,3,-4\right)+\max\left(x,y,0.5,0.1,0.2\right)`, 1e-6],
  [
    R`\operatorname{total}\left(\left[x,y,1\right]\right)+\operatorname{mean}\left(\left[x,y\right]\right)`,
    1e-6,
  ],
  [R`\operatorname{median}\left(\left[x,y,0.3,2\right]\right)`, 1e-6],
  [R`\operatorname{median}\left(\left[x,y,0.3\right]\right)`, 1e-6],
  [R`\operatorname{stdev}\left(\left[x,y,1\right]\right)`, 1e-5],
  [R`\operatorname{length}\left(\left[x,y,1\right]\right)x`, 1e-6],
  [R`\left[x,y,3\right]\left[2\right]`, 1e-6],
  [R`\log_{2}\left(x^{2}+1\right)`, 1e-5],
  [R`\sin^{2}\left(x\right)+\cos^{2}\left(y\right)`, 1e-5],
  // 10⁻⁴: GLSL leaves asin's accuracy to the driver (see strictSemantics).
  [R`\sin^{-1}\left(\frac{x}{3}\right)`, 1e-4],
  [R`\operatorname{arsinh}\left(y\right)`, 1e-5],
  [R`50\%\operatorname{of}x`, 1e-6],
  [R`\frac{d}{dx}\left(x^{3}y\right)`, 1e-3],
  [R`\frac{d}{dy}\sin\left(xy\right)`, 1e-3],
  [R`\int_{0}^{x}t^{2}\ dt`, 1e-4],
  [R`g'\left(x\right)`, 1e-3],
  [R`g''\left(y\right)`, 1e-2],
];

async function desmosValues(driver: Driver): Promise<number[][]> {
  return await driver.page.evaluate(
    async (
      cases: string[],
      points: [number, number][],
      definitions: [string, string[], string][]
    ) => {
      Calc.setBlank();
      Calc.setExpressions(
        definitions.map(([name, params, latex], i) => ({
          id: `def${i}`,
          latex: `${name}\\left(${params.join(",")}\\right)=${latex}`,
        }))
      );
      const read = async (latex: string) =>
        await new Promise<number>((resolve) => {
          const helper = Calc.HelperExpression({ latex }) as unknown as {
            numericValue: number;
            observe: (e: string, f: () => void) => void;
            unobserve: (e: string) => void;
          };
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            helper.unobserve("numericValue");
            resolve(helper.numericValue);
          };
          helper.observe("numericValue", () => setTimeout(finish, 20));
          setTimeout(finish, 4000);
        });
      const out: number[][] = [];
      for (const [i, latex] of cases.entries()) {
        Calc.setExpression({
          id: `F${i}`,
          latex: `F_{${i}}\\left(x,y\\right)=${latex}`,
        });
        const row: number[] = [];
        for (const [x, y] of points)
          row.push(await read(`F_{${i}}\\left(${x},${y}\\right)`));
        out.push(row);
      }
      return out;
    },
    CASES.map(([latex]) => latex),
    POINTS,
    DEFINITIONS
  );
}

/**
 * Runs one compiled component at every point, one pixel each. `value` is
 * the GLSL for the value at `p`; a strict one sets `ok`, and an undefined
 * value reads back as NaN.
 */
async function gpuValues(
  driver: Driver,
  glsl: string,
  helpers: string,
  prelude = GLSL_PRELUDE
): Promise<number[] | { error: string }> {
  const source = `#version 300 es
precision highp float;
precision highp int;
uniform float u_time;
out vec4 outColor;
${prelude}
${helpers}
void main() {
  vec2 points[${POINTS.length}] = vec2[](${POINTS.map(([x, y]) => `vec2(${x.toFixed(6)}, ${y.toFixed(6)})`).join(", ")});
  vec2 p = points[int(gl_FragCoord.x)];
  bool ok = true;
  float v = ${glsl};
  outColor = vec4(ok ? v : uintBitsToFloat(0x7fc00000u), 0.0, 0.0, 1.0);
}`;
  return await driver.page.evaluate(
    (source: string, width: number) => {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2");
      if (!gl) return { error: "no WebGL2" };
      if (!gl.getExtension("EXT_color_buffer_float"))
        return { error: "no EXT_color_buffer_float" };
      const compile = (type: number, text: string) => {
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, text);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
          throw new Error(gl.getShaderInfoLog(shader) ?? "compile failed");
        return shader;
      };
      try {
        const program = gl.createProgram();
        gl.attachShader(
          program,
          compile(
            gl.VERTEX_SHADER,
            `#version 300 es
void main() {
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}`
          )
        );
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, source));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
          return { error: gl.getProgramInfoLog(program) ?? "link failed" };
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, width, 1);
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          gl.TEXTURE_2D,
          texture,
          0
        );
        gl.viewport(0, 0, width, 1);
        gl.useProgram(program);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        const pixels = new Float32Array(width * 4);
        gl.readPixels(0, 0, width, 1, gl.RGBA, gl.FLOAT, pixels);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        return Array.from({ length: width }, (_, i) => pixels[i * 4]);
      } catch (error) {
        return { error: String(error) };
      }
    },
    source,
    POINTS.length
  );
}

testWithPageAndOpts(
  "the field compiler draws every Desmos function it accepts as Desmos computes it",
  { timeout: 240000 },
  async (driver) => {
    const desmos = await desmosValues(driver);
    const mismatches: string[] = [];
    for (const [i, [latex, tolerance]] of CASES.entries()) {
      const compiled = compileFieldComponentToGLSL(latex, env);
      if (!compiled.ok) {
        mismatches.push(`${latex}: refused, ${compiled.error}`);
        continue;
      }
      const gpu = await gpuValues(
        driver,
        compiled.glsl,
        compiled.helpers.map((h) => h.glsl).join("\n")
      );
      if (!Array.isArray(gpu)) {
        mismatches.push(`${latex}: GPU ${gpu.error}`);
        continue;
      }
      gpu.forEach((value, k) => {
        const expected = desmos[i][k];
        if (
          !(
            Math.abs(value - expected) <=
            tolerance * Math.max(1, Math.abs(expected))
          )
        )
          mismatches.push(
            `${latex} at (${POINTS[k].join(", ")}): Desmos ${expected}, GPU ${value}`
          );
      });
    }
    expect(mismatches).toEqual([]);
  }
);

/** The cases a fluid's solid can use: everything but calculus. */
const STRICT_CASES = CASES.map(([latex], i) => [latex, i] as const).filter(
  ([latex]) => !/\\frac\{d\}|\\int|'|!/.test(latex)
);

testWithPageAndOpts(
  "a fluid's solids read the same Desmos functions, on the CPU and the GPU",
  { timeout: 240000 },
  async (driver) => {
    const desmos = await desmosValues(driver);
    const mismatches: string[] = [];
    for (const [latex, i] of STRICT_CASES) {
      const parsed = parseStrictExpression(latex, env);
      if (!parsed.ok) {
        mismatches.push(`${latex}: refused, ${parsed.error}`);
        continue;
      }
      const cpu = compileExpression(parsed.expr, parsed.program, {
        degreeMode: false,
      });
      const fn = emitExpressionGLSL(
        parsed.expr,
        parsed.program,
        { degreeMode: false },
        "solid"
      );
      const gpu = await gpuValues(
        driver,
        "solid(p, ok)",
        fn,
        STRICT_GLSL_PRELUDE
      );
      if (!Array.isArray(gpu)) {
        mismatches.push(`${latex}: GPU ${gpu.error}`);
        continue;
      }
      POINTS.forEach(([x, y], k) => {
        const expected = desmos[i][k];
        const onCpu = cpu({ x, y, time: 0, params: new Map() }, []);
        if (
          !(
            Math.abs(onCpu - expected) <=
            1e-9 * Math.max(1, Math.abs(expected))
          )
        )
          mismatches.push(
            `${latex} at (${x}, ${y}): Desmos ${expected}, CPU ${onCpu}`
          );
        if (
          !(
            Math.abs(gpu[k] - expected) <=
            1e-4 * Math.max(1, Math.abs(expected))
          )
        )
          mismatches.push(
            `${latex} at (${x}, ${y}): Desmos ${expected}, GPU ${gpu[k]}`
          );
      });
    }
    expect(mismatches).toEqual([]);
  }
);
