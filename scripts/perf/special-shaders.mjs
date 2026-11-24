// Times the special functions' GLSL (src/field-rendering/specialGLSL.ts) on
// the GPU, each drawn at every pixel of a 1024×1024 target, against the
// version at a given commit, so a change to one of them is measured rather
// than counted in loop steps.
//   node scripts/perf/special-shaders.mjs            # against 50322ea0
//   node scripts/perf/special-shaders.mjs <commit>
// Prints the median milliseconds per full-target draw for each function,
// before and after, with gl.finish() closing each draw.
import esbuild from "esbuild";
import puppeteer from "puppeteer";
import { execSync } from "child_process";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { createRequire } from "module";

const before = process.argv[2] ?? "50322ea0";
// Run from the repository root.
const root = process.cwd();
const dir = mkdtempSync(path.join(tmpdir(), "special-bench-"));
const require = createRequire(import.meta.url);

async function preludeOf(specialSource) {
  // The prelude as it was built with that version of specialGLSL.ts.
  const special = path.join(dir, `special-${Math.random()}.ts`);
  writeFileSync(special, specialSource);
  const out = path.join(dir, `prelude-${Math.random()}.cjs`);
  await esbuild.build({
    stdin: {
      contents: `export { GLSL_PRELUDE } from ${JSON.stringify(path.join(root, "src/field-rendering/latexToGLSL.ts"))};`,
      resolveDir: root,
      loader: "ts",
    },
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: out,
    logLevel: "error",
    plugins: [
      {
        name: "swap-special",
        setup(build) {
          build.onResolve({ filter: /specialGLSL$/ }, () => ({
            path: special,
          }));
        },
      },
    ],
  });
  return require(out).GLSL_PRELUDE;
}

const now = await preludeOf(
  execSync("git show HEAD:src/field-rendering/specialGLSL.ts", {
    cwd: root,
  }).toString()
);
const then = await preludeOf(
  execSync(`git show ${before}:src/field-rendering/specialGLSL.ts`, {
    cwd: root,
  }).toString()
);

// Each over a range that exercises its expensive branch.
const CASES = [
  ["Si", "vtSi(20.0 * p.x)"],
  ["Ci", "vtCi(0.1 + 20.0 * p.x)"],
  ["FresnelC", "vtFresnel(6.0 * p.x, false)"],
  ["BesselJ", "vtBesselJ(2.0, 30.0 * p.x)"],
  ["Ei", "vtEi(20.0 * p.x - 2.0)"],
  ["Gamma", "vtGamma(0.1 + 6.0 * p.x)"],
  ["E_ML", "vtMittagLeffler(0.5, 1.0, 4.0 * p.x - 2.0)"],
];

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--use-angle=default", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage();
const results = await page.evaluate(
  (cases, now, then) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1024;
    const gl = canvas.getContext("webgl2");
    const renderer = gl.getExtension("WEBGL_debug_renderer_info");
    const gpu = renderer
      ? gl.getParameter(renderer.UNMASKED_RENDERER_WEBGL)
      : "unknown";
    const vs = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;
    const program = (prelude, expr) => {
      const fs = `#version 300 es
precision highp float;
out vec4 color;
${prelude}
void main(){ vec2 p = gl_FragCoord.xy / 1024.0; float v = ${expr}; color = vec4(v, 0.0, 0.0, 1.0); }`;
      const make = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
          throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const p = gl.createProgram();
      gl.attachShader(p, make(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      return p;
    };
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const time = (p) => {
      gl.useProgram(p);
      const at = gl.getAttribLocation(p, "a");
      gl.enableVertexAttribArray(at);
      gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
      const pixel = new Uint8Array(4);
      const sample = () => {
        const t0 = performance.now();
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        return performance.now() - t0;
      };
      for (let i = 0; i < 3; i++) sample();
      const runs = Array.from({ length: 15 }, sample).sort((a, b) => a - b);
      return runs[7];
    };
    return {
      gpu,
      rows: cases.map(([name, expr]) => [
        name,
        time(program(then, expr)),
        time(program(now, expr)),
      ]),
    };
  },
  CASES,
  now,
  then
);
await browser.close();
console.log(`GPU: ${results.gpu}`);
console.log(`median ms per 1024x1024 draw, ${before} -> HEAD`);
for (const [name, a, b] of results.rows)
  console.log(
    `${name.padEnd(10)} ${a.toFixed(2).padStart(8)} ${b.toFixed(2).padStart(8)}   x${(a / b).toFixed(1)}`
  );
