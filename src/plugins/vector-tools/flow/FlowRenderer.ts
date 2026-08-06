/**
 * GPU particle advection for the Vector Tools flow visualizer.
 *
 * The technique — ping-ponged particle-state textures, an RK4 step in a
 * fragment shader, particles drawn into a trail texture that fades a little
 * every frame — is adapted from Andrei Kashcha's fieldplay
 * (https://github.com/anvaka/fieldplay, MIT licensed; see LICENSE-fieldplay.md
 * in this directory).
 *
 * The port differs from the original in three ways that matter here:
 *  - It targets WebGL2 and stores particle state in a float texture, so the
 *    RGBA float packing/unpacking fieldplay needs for WebGL1 is gone.
 *  - Its bounds are driven by Desmos's graphpaper bounds rather than its own
 *    pan/zoom, so the flow stays registered with the graph underneath it.
 *  - It renders onto a transparent canvas layered over the Desmos graph
 *    instead of owning the whole screen.
 */
import { GLSL_PRELUDE } from "./latexToGLSL";
import type { FlowColorMode } from "../model";

export interface FlowBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface FlowOptions {
  /**
   * Exact number of particles. They are stored in the smallest square texture
   * that holds them, but only this many are ever drawn, so any value works.
   */
  particleCount: number;
  /** Relative step size for the integrator. */
  speed: number;
  /** How much of the previous frame survives, 0..1. Higher means longer trails. */
  trailPersistence: number;
  /** Per-frame chance that a particle restarts somewhere random, 0..1. */
  dropRate: number;
  pointSize: number;
  opacity: number;
  colorMode: FlowColorMode;
  /** Hex color used by the `fixed` color mode. */
  fixedColor: string;
  /** Draw streamlines at a constant speed instead of the field's own magnitude. */
  normalizeSpeed: boolean;
}

export const DEFAULT_FLOW_OPTIONS: FlowOptions = {
  particleCount: 16_000,
  speed: 1,
  trailPersistence: 0.9,
  dropRate: 0.008,
  pointSize: 1.4,
  opacity: 0.42,
  colorMode: "speed",
  fixedColor: "#6042a6",
  normalizeSpeed: true,
};

export class FlowRendererError extends Error {}

interface ProgramInfo {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

const QUAD = new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]);

export class FlowRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly quadBuffer: WebGLBuffer;
  private readonly framebuffer: WebGLFramebuffer;

  private updateProgram?: ProgramInfo;
  private drawProgram?: ProgramInfo;
  private readonly fadeProgram: ProgramInfo;
  private readonly blitProgram: ProgramInfo;

  private particleRead?: WebGLTexture;
  private particleWrite?: WebGLTexture;
  private indexBuffer?: WebGLBuffer;
  private particleResolution = 0;
  private particleCount = 0;

  private trailFront?: WebGLTexture;
  private trailBack?: WebGLTexture;
  private trailWidth = 0;
  private trailHeight = 0;

  private options: FlowOptions = { ...DEFAULT_FLOW_OPTIONS };
  private bounds: FlowBounds = { xMin: -10, xMax: 10, yMin: -6, yMax: 6 };
  private fieldSource?: { p: string; q: string };
  private frameSeed = 1;
  private destroyed = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
    });
    if (gl === null) {
      throw new FlowRendererError(
        "This browser does not support WebGL2, which the flow visualizer needs."
      );
    }
    if (gl.getExtension("EXT_color_buffer_float") === null) {
      throw new FlowRendererError(
        "This GPU does not support float render targets, which the flow visualizer needs."
      );
    }
    this.gl = gl;

    const quadBuffer = gl.createBuffer();
    const framebuffer = gl.createFramebuffer();
    if (quadBuffer === null || framebuffer === null) {
      throw new FlowRendererError("Could not allocate WebGL resources.");
    }
    this.quadBuffer = quadBuffer;
    this.framebuffer = framebuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);

    this.fadeProgram = this.createProgram(
      SCREEN_VERTEX_SHADER,
      FADE_FRAGMENT_SHADER
    );
    this.blitProgram = this.createProgram(
      SCREEN_VERTEX_SHADER,
      BLIT_FRAGMENT_SHADER
    );
    this.allocateParticles(this.options.particleCount);
  }

  /**
   * Swaps in a new field. Throws {@link FlowRendererError} if the GLSL will not
   * compile, which is the last line of defence behind the LaTeX compiler.
   */
  setField(pGLSL: string, qGLSL: string) {
    if (this.fieldSource?.p === pGLSL && this.fieldSource.q === qGLSL) return;
    const updateProgram = this.createProgram(
      QUAD_VERTEX_SHADER,
      updateFragmentShader(pGLSL, qGLSL)
    );
    const drawProgram = this.createProgram(
      drawVertexShader(pGLSL, qGLSL),
      DRAW_FRAGMENT_SHADER
    );
    this.deleteProgram(this.updateProgram);
    this.deleteProgram(this.drawProgram);
    this.updateProgram = updateProgram;
    this.drawProgram = drawProgram;
    this.fieldSource = { p: pGLSL, q: qGLSL };
    this.seedParticles();
  }

  setBounds(bounds: FlowBounds) {
    this.bounds = bounds;
  }

  setOptions(options: FlowOptions) {
    const countChanged = options.particleCount !== this.particleCount;
    this.options = { ...options };
    if (countChanged) this.allocateParticles(options.particleCount);
  }

  /** Matches the drawing buffer to the CSS box. Returns true if it changed. */
  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number) {
    const width = Math.max(1, Math.round(cssWidth * devicePixelRatio));
    const height = Math.max(1, Math.round(cssHeight * devicePixelRatio));
    if (width === this.trailWidth && height === this.trailHeight) return false;
    this.canvas.width = width;
    this.canvas.height = height;
    this.trailWidth = width;
    this.trailHeight = height;
    this.allocateTrails();
    return true;
  }

  /** Clears the trail texture, e.g. after a pan or zoom. */
  clearTrails() {
    const { gl } = this;
    for (const texture of [this.trailFront, this.trailBack]) {
      if (texture === undefined) continue;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0
      );
      gl.viewport(0, 0, this.trailWidth, this.trailHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  frame() {
    if (
      this.destroyed ||
      this.updateProgram === undefined ||
      this.drawProgram === undefined ||
      this.particleRead === undefined ||
      this.trailFront === undefined ||
      this.trailBack === undefined
    ) {
      return;
    }
    this.frameSeed = (this.frameSeed * 16807) % 2147483647;
    this.stepParticles();
    this.fadeTrails();
    this.drawParticles();
    this.blitToCanvas();
    [this.trailFront, this.trailBack] = [this.trailBack, this.trailFront];
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    const { gl } = this;
    this.deleteProgram(this.updateProgram);
    this.deleteProgram(this.drawProgram);
    this.deleteProgram(this.fadeProgram);
    this.deleteProgram(this.blitProgram);
    for (const texture of [
      this.particleRead,
      this.particleWrite,
      this.trailFront,
      this.trailBack,
    ]) {
      if (texture !== undefined) gl.deleteTexture(texture);
    }
    if (this.indexBuffer !== undefined) gl.deleteBuffer(this.indexBuffer);
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteFramebuffer(this.framebuffer);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }

  // ---- internals ---------------------------------------------------------

  private stepParticles() {
    const { gl } = this;
    const program = this.updateProgram!;
    gl.useProgram(program.program);
    gl.disable(gl.BLEND);
    this.bindQuad(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.particleRead!);
    gl.uniform1i(program.uniforms.u_particles, 0);

    const { xMin, xMax, yMin, yMax } = this.bounds;
    const span = Math.max(xMax - xMin, yMax - yMin);
    gl.uniform2f(program.uniforms.u_min, xMin, yMin);
    gl.uniform2f(program.uniforms.u_max, xMax, yMax);
    gl.uniform1f(
      program.uniforms.u_h,
      this.options.normalizeSpeed
        ? 0.004 * this.options.speed * span
        : 0.01 * this.options.speed
    );
    gl.uniform1f(
      program.uniforms.u_normalize,
      this.options.normalizeSpeed ? 1 : 0
    );
    gl.uniform1f(program.uniforms.u_dropRate, this.options.dropRate);
    gl.uniform1f(program.uniforms.u_seed, this.frameSeed / 2147483647);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.particleWrite!,
      0
    );
    gl.viewport(0, 0, this.particleResolution, this.particleResolution);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    [this.particleRead, this.particleWrite] = [
      this.particleWrite,
      this.particleRead,
    ];
  }

  private fadeTrails() {
    const { gl } = this;
    const program = this.fadeProgram;
    gl.useProgram(program.program);
    gl.disable(gl.BLEND);
    this.bindQuad(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.trailBack!);
    gl.uniform1i(program.uniforms.u_screen, 0);
    gl.uniform1f(program.uniforms.u_fade, this.options.trailPersistence);
    this.bindTrailTarget(this.trailFront!);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private drawParticles() {
    const { gl } = this;
    const program = this.drawProgram!;
    gl.useProgram(program.program);
    this.bindTrailTarget(this.trailFront!);
    gl.enable(gl.BLEND);
    // Colors leave the shader premultiplied, which keeps repeated blending
    // into the trail texture from washing out toward white.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const location = gl.getAttribLocation(program.program, "a_index");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.indexBuffer!);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 1, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.particleRead!);
    gl.uniform1i(program.uniforms.u_particles, 0);
    gl.uniform1i(program.uniforms.u_resolution, this.particleResolution);

    const { xMin, xMax, yMin, yMax } = this.bounds;
    gl.uniform2f(program.uniforms.u_min, xMin, yMin);
    gl.uniform2f(program.uniforms.u_max, xMax, yMax);
    gl.uniform1f(
      program.uniforms.u_pointSize,
      Math.max(
        1,
        this.options.pointSize *
          (this.canvas.width / Math.max(1, this.canvas.clientWidth))
      )
    );
    gl.uniform1f(program.uniforms.u_opacity, this.options.opacity);
    gl.uniform1i(
      program.uniforms.u_colorMode,
      colorModeIndex(this.options.colorMode)
    );
    const [r, g, b] = hexToUnitRGB(this.options.fixedColor);
    gl.uniform3f(program.uniforms.u_fixedColor, r, g, b);
    gl.uniform1f(
      program.uniforms.u_speedScale,
      Math.max(1e-6, (xMax - xMin) / 3)
    );

    gl.drawArrays(gl.POINTS, 0, this.particleCount);
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private blitToCanvas() {
    const { gl } = this;
    const program = this.blitProgram;
    gl.useProgram(program.program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.trailWidth, this.trailHeight);
    gl.disable(gl.BLEND);
    this.bindQuad(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.trailFront!);
    gl.uniform1i(program.uniforms.u_screen, 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private bindTrailTarget(texture: WebGLTexture) {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );
    gl.viewport(0, 0, this.trailWidth, this.trailHeight);
  }

  private bindQuad(program: ProgramInfo) {
    const { gl } = this;
    const location = gl.getAttribLocation(program.program, "a_pos");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
  }

  /**
   * Particle state lives in the smallest square texture that holds `count`
   * particles. Only `count` points are drawn, so the leftover texels in the
   * last row are simply never read and the user gets the exact count they
   * asked for rather than the nearest square.
   */
  private allocateParticles(count: number) {
    const { gl } = this;
    if (this.particleRead !== undefined) gl.deleteTexture(this.particleRead);
    if (this.particleWrite !== undefined) gl.deleteTexture(this.particleWrite);
    if (this.indexBuffer !== undefined) gl.deleteBuffer(this.indexBuffer);
    const resolution = Math.max(1, Math.ceil(Math.sqrt(count)));
    this.particleResolution = resolution;
    this.particleCount = count;

    const indices = new Float32Array(count);
    for (let i = 0; i < count; i++) indices[i] = i;
    const indexBuffer = gl.createBuffer();
    if (indexBuffer === null)
      throw new FlowRendererError("Could not allocate particles.");
    gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    this.indexBuffer = indexBuffer;

    this.particleRead = this.createFloatTexture(resolution);
    this.particleWrite = this.createFloatTexture(resolution);
    this.seedParticles();
  }

  private seedParticles() {
    const { gl } = this;
    if (this.particleRead === undefined || this.particleResolution === 0)
      return;
    const resolution = this.particleResolution;
    const data = new Float32Array(resolution * resolution * 4);
    const { xMin, xMax, yMin, yMax } = this.bounds;
    for (let i = 0; i < resolution * resolution; i++) {
      data[i * 4] = xMin + Math.random() * (xMax - xMin);
      data[i * 4 + 1] = yMin + Math.random() * (yMax - yMin);
      // Stagger initial ages so the whole field does not respawn in lockstep.
      data[i * 4 + 2] = Math.random() * MAX_PARTICLE_AGE;
      data[i * 4 + 3] = Math.random();
    }
    for (const texture of [this.particleRead, this.particleWrite]) {
      gl.bindTexture(gl.TEXTURE_2D, texture!);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA32F,
        resolution,
        resolution,
        0,
        gl.RGBA,
        gl.FLOAT,
        data
      );
    }
  }

  private allocateTrails() {
    const { gl } = this;
    if (this.trailFront !== undefined) gl.deleteTexture(this.trailFront);
    if (this.trailBack !== undefined) gl.deleteTexture(this.trailBack);
    this.trailFront = this.createByteTexture(this.trailWidth, this.trailHeight);
    this.trailBack = this.createByteTexture(this.trailWidth, this.trailHeight);
    this.clearTrails();
  }

  private createFloatTexture(resolution: number) {
    const { gl } = this;
    const texture = gl.createTexture();
    if (texture === null)
      throw new FlowRendererError("Could not allocate a texture.");
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      resolution,
      resolution,
      0,
      gl.RGBA,
      gl.FLOAT,
      null
    );
    return texture;
  }

  private createByteTexture(width: number, height: number) {
    const { gl } = this;
    const texture = gl.createTexture();
    if (texture === null)
      throw new FlowRendererError("Could not allocate a texture.");
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    return texture;
  }

  private createProgram(
    vertexSource: string,
    fragmentSource: string
  ): ProgramInfo {
    const { gl } = this;
    const vertex = this.compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragment = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (program === null)
      throw new FlowRendererError("Could not create a shader program.");
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true) {
      const log = gl.getProgramInfoLog(program) ?? "";
      gl.deleteProgram(program);
      throw new FlowRendererError(
        `Could not link the flow shader. ${log}`.trim()
      );
    }
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (info !== null)
        uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
    return { program, uniforms };
  }

  private compileShader(type: number, source: string) {
    const { gl } = this;
    const shader = gl.createShader(type);
    if (shader === null)
      throw new FlowRendererError("Could not create a shader.");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true) {
      const log = gl.getShaderInfoLog(shader) ?? "";
      gl.deleteShader(shader);
      throw new FlowRendererError(
        `This field could not be compiled for the GPU. ${log}`.trim()
      );
    }
    return shader;
  }

  private deleteProgram(program: ProgramInfo | undefined) {
    if (program !== undefined) this.gl.deleteProgram(program.program);
  }
}

const MAX_PARTICLE_AGE = 400;

function colorModeIndex(mode: FlowColorMode) {
  return mode === "fixed" ? 0 : mode === "speed" ? 1 : 2;
}

export function hexToUnitRGB(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const full =
    value.length === 3 ? [...value].map((char) => char + char).join("") : value;
  const parsed = Number.parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(parsed)) return [0.4, 0.3, 0.7];
  return [
    ((parsed >> 16) & 255) / 255,
    ((parsed >> 8) & 255) / 255,
    (parsed & 255) / 255,
  ];
}

// ---- shader sources ------------------------------------------------------

const QUAD_VERTEX_SHADER = `#version 300 es
precision highp float;
in vec2 a_pos;
void main() { gl_Position = vec4(2.0 * a_pos - 1.0, 0.0, 1.0); }
`;

const SCREEN_VERTEX_SHADER = `#version 300 es
precision highp float;
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos;
  gl_Position = vec4(2.0 * a_pos - 1.0, 0.0, 1.0);
}
`;

const FADE_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_screen;
uniform float u_fade;
in vec2 v_uv;
out vec4 outColor;
void main() {
  // Quantising down keeps the trail from stalling on a non-zero byte value
  // and leaving permanent smudges.
  vec4 color = texture(u_screen, v_uv) * u_fade;
  outColor = floor(color * 255.0) / 255.0;
}
`;

const BLIT_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_screen;
in vec2 v_uv;
out vec4 outColor;
void main() { outColor = texture(u_screen, v_uv); }
`;

function fieldFunctions(pGLSL: string, qGLSL: string) {
  return `
${GLSL_PRELUDE}
vec2 vtField(vec2 p) {
  float u = ${pGLSL};
  float v = ${qGLSL};
  if (isnan(u) || isinf(u)) u = 0.0;
  if (isnan(v) || isinf(v)) v = 0.0;
  return vec2(u, v);
}
`;
}

function updateFragmentShader(pGLSL: string, qGLSL: string) {
  return `#version 300 es
precision highp float;
uniform sampler2D u_particles;
uniform vec2 u_min;
uniform vec2 u_max;
uniform float u_h;
uniform float u_seed;
uniform float u_dropRate;
uniform float u_normalize;
out vec4 outState;

${fieldFunctions(pGLSL, qGLSL)}

float vtRand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 vtVelocity(vec2 p) {
  vec2 v = vtField(p);
  float m = length(v);
  return mix(v, v / max(m, 1e-9), u_normalize);
}

vec2 vtStep(vec2 p) {
  vec2 k1 = vtVelocity(p);
  vec2 k2 = vtVelocity(p + k1 * u_h * 0.5);
  vec2 k3 = vtVelocity(p + k2 * u_h * 0.5);
  vec2 k4 = vtVelocity(p + k3 * u_h);
  return (k1 + 2.0 * k2 + 2.0 * k3 + k4) * u_h / 6.0;
}

void main() {
  ivec2 texel = ivec2(gl_FragCoord.xy);
  vec4 state = texelFetch(u_particles, texel, 0);
  vec2 pos = state.xy;
  float age = state.z;

  vec2 span = u_max - u_min;
  vec2 seed = (pos + gl_FragCoord.xy) * (u_seed + 0.31);
  vec2 respawn = vec2(vtRand(seed + 1.9), vtRand(seed + 8.4)) * span + u_min;

  vec2 delta = vtStep(pos);
  vec2 next = pos + delta;

  bool escaped = any(lessThan(next, u_min - 0.05 * span)) ||
                 any(greaterThan(next, u_max + 0.05 * span));
  bool stalled = length(delta) < 1e-9 * max(span.x, span.y);
  bool expired = age > ${MAX_PARTICLE_AGE}.0 || vtRand(seed) < u_dropRate;
  bool broken = isnan(next.x) || isnan(next.y) || isinf(next.x) || isinf(next.y);

  if (escaped || stalled || expired || broken) {
    next = respawn;
    age = 0.0;
  } else {
    age += 1.0;
  }
  outState = vec4(next, age, state.w);
}
`;
}

function drawVertexShader(pGLSL: string, qGLSL: string) {
  return `#version 300 es
precision highp float;
in float a_index;
uniform sampler2D u_particles;
uniform int u_resolution;
uniform vec2 u_min;
uniform vec2 u_max;
uniform float u_pointSize;
uniform float u_opacity;
uniform int u_colorMode;
uniform vec3 u_fixedColor;
uniform float u_speedScale;
out vec4 v_color;

${fieldFunctions(pGLSL, qGLSL)}

vec3 vtHueToRGB(float hue) {
  vec3 k = mod(hue * 6.0 + vec3(0.0, 4.0, 2.0), 6.0);
  return clamp(min(k, 4.0 - k), 0.0, 1.0);
}

void main() {
  int index = int(a_index);
  ivec2 texel = ivec2(index % u_resolution, index / u_resolution);
  vec4 state = texelFetch(u_particles, texel, 0);

  vec2 normalized = (state.xy - u_min) / (u_max - u_min);
  gl_Position = vec4(2.0 * normalized - 1.0, 0.0, 1.0);
  gl_PointSize = u_pointSize;

  vec2 v = vtField(state.xy);
  vec3 rgb = u_fixedColor;
  if (u_colorMode == 1) {
    // Scale-free ramp: no reduction pass is needed to find the field's range.
    float t = 1.0 - exp(-length(v) / u_speedScale);
    rgb = mix(vec3(0.15, 0.30, 0.68), vec3(0.16, 0.68, 0.62), smoothstep(0.0, 0.5, t));
    rgb = mix(rgb, vec3(0.95, 0.70, 0.20), smoothstep(0.45, 0.85, t));
    rgb = mix(rgb, vec3(0.85, 0.24, 0.22), smoothstep(0.85, 1.0, t));
  } else if (u_colorMode == 2) {
    rgb = vtHueToRGB(fract(atan(v.y, v.x) / 6.2831853 + 1.0));
  }

  // Ease particles in and out so respawns do not pop.
  float fade = min(1.0, state.z / 10.0) *
               min(1.0, (${MAX_PARTICLE_AGE}.0 - state.z) / 40.0);
  float alpha = clamp(u_opacity * fade, 0.0, 1.0);
  v_color = vec4(rgb * alpha, alpha);
}
`;
}

const DRAW_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec4 v_color;
out vec4 outColor;
void main() {
  vec2 offset = gl_PointCoord - vec2(0.5);
  float mask = 1.0 - smoothstep(0.35, 0.5, length(offset));
  outColor = v_color * mask;
}
`;
