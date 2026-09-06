/**
 * The arrows, drawn by this extension instead of by Desmos.
 *
 * The generator writes a field as ordinary Desmos expressions, which is what
 * makes a graph shareable — but it costs three restricted parametrics per
 * arrow, and Desmos starts to labour somewhere under ten thousand of them. This
 * draws the same field on the overlay canvas instead: one instance per arrow,
 * the field evaluated in the vertex shader, no expressions written and no cap
 * worth naming.
 *
 * What it buys beyond speed is the arrowhead. A Desmos arrowhead is two line
 * segments, because a filled triangle per arrow would be a polygon per arrow;
 * here it is three vertices, so the heads are solid and taper the way a drawn
 * vector field's do. The head also shrinks on a short arrow rather than
 * swallowing it.
 *
 * Nothing here animates. Arrows are redrawn when the view, the field or the
 * settings change, and sit still otherwise.
 */
import {
  fieldFunctions,
  FlowRendererError,
  hexToUnitRGB,
} from "./FlowRenderer";
import type { FlowBounds, FlowField } from "./FlowRenderer";
import { PALETTE_GLSL, paletteUniforms, type PaletteID } from "../palettes";
import type { VectorColorMode, VectorLengthMode } from "../model";

export interface ArrowOptions {
  /** Sample counts across the domain, which is one arrow per grid point. */
  columns: number;
  rows: number;
  domain: FlowBounds;
  lengthMode: VectorLengthMode;
  targetLength: number;
  scale: number;
  maximumLength: number;
  compression: number;
  /** Length of the arrowhead in graph units, before it is capped on a short arrow. */
  headSize: number;
  headAngle: number;
  /** Shaft thickness in CSS pixels, so it does not change with the zoom. */
  shaftWidth: number;
  colorMode: VectorColorMode;
  palette: PaletteID;
  fixedColor: string;
  opacity: number;
  /** `automatic` measures the grid; `manual` uses the two values below. */
  rangeMode: "automatic" | "manual";
  rangeMinimum: number;
  rangeMaximum: number;
}

export const DEFAULT_ARROW_OPTIONS: ArrowOptions = {
  columns: 21,
  rows: 13,
  domain: { xMin: -10, xMax: 10, yMin: -6, yMax: 6 },
  lengthMode: "normalized",
  targetLength: 0.6,
  scale: 1,
  maximumLength: 1,
  compression: 1,
  headSize: 0.22,
  headAngle: 0.42,
  shaftWidth: 2.4,
  colorMode: "magnitude",
  palette: "spectral",
  fixedColor: "#6042a6",
  opacity: 1,
  rangeMode: "automatic",
  rangeMinimum: 0,
  rangeMaximum: 1,
};

const LENGTH_MODE_INDEX: Record<VectorLengthMode, number> = {
  actual: 0,
  normalized: 1,
  scaled: 2,
  clamped: 3,
  compressed: 4,
  "direction-only": 1,
};

const COLOR_MODE_INDEX: Record<VectorColorMode, number> = {
  fixed: 0,
  magnitude: 1,
  "log-magnitude": 2,
  direction: 3,
  "x-component": 4,
  "y-component": 5,
};

/** Vertices per arrow: two triangles of shaft, one of head. */
const VERTICES_PER_ARROW = 9;

export class ArrowRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly emptyArray: WebGLVertexArrayObject;
  private program?: {
    program: WebGLProgram;
    uniforms: Record<string, WebGLUniformLocation | null>;
  };
  private measureProgram?: {
    program: WebGLProgram;
    uniforms: Record<string, WebGLUniformLocation | null>;
  };
  private measureTexture?: WebGLTexture;
  private measureFramebuffer?: WebGLFramebuffer;
  private measureSize = { columns: 0, rows: 0 };
  /** The grid's own magnitude range, measured on the GPU and cached. */
  private measured?: { minimum: number; maximum: number };
  private options: ArrowOptions = { ...DEFAULT_ARROW_OPTIONS };
  private bounds: FlowBounds = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
  private destroyed = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
    });
    if (gl === null) {
      throw new FlowRendererError(
        "This browser could not open a WebGL2 canvas for the arrows."
      );
    }
    this.gl = gl;
    const array = gl.createVertexArray();
    if (array === null)
      throw new FlowRendererError("Could not set up the arrow renderer.");
    // The geometry comes from gl_VertexID and gl_InstanceID, so the draw needs
    // a bound vertex array but no buffers in it at all.
    this.emptyArray = array;
  }

  setOptions(options: ArrowOptions) {
    const before = this.options;
    this.options = { ...options };
    if (
      before.columns !== options.columns ||
      before.rows !== options.rows ||
      before.domain.xMin !== options.domain.xMin ||
      before.domain.xMax !== options.domain.xMax ||
      before.domain.yMin !== options.domain.yMin ||
      before.domain.yMax !== options.domain.yMax ||
      before.colorMode !== options.colorMode
    ) {
      this.measured = undefined;
    }
  }

  setBounds(bounds: FlowBounds) {
    this.bounds = bounds;
  }

  setField(field: FlowField) {
    const { gl } = this;
    if (this.program !== undefined) gl.deleteProgram(this.program.program);
    if (this.measureProgram !== undefined)
      gl.deleteProgram(this.measureProgram.program);
    this.program = this.createProgram(field);
    this.measureProgram = this.createMeasureProgram(field);
    this.measured = undefined;
  }

  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number) {
    const width = Math.max(1, Math.round(cssWidth * devicePixelRatio));
    const height = Math.max(1, Math.round(cssHeight * devicePixelRatio));
    if (width === this.canvas.width && height === this.canvas.height) return;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  get arrowCount() {
    return Math.max(0, this.options.columns) * Math.max(0, this.options.rows);
  }

  frame() {
    const { gl } = this;
    if (this.destroyed || this.program === undefined) return;
    const count = this.arrowCount;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (count === 0) return;

    const range = this.magnitudeRange();
    const { uniforms, program } = this.program;
    gl.useProgram(program);
    gl.bindVertexArray(this.emptyArray);
    gl.enable(gl.BLEND);
    // Premultiplied, matching the flow, so the two layers composite the same way.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const { xMin, xMax, yMin, yMax } = this.bounds;
    const { options } = this;
    gl.uniform2f(uniforms.u_min, xMin, yMin);
    gl.uniform2f(uniforms.u_max, xMax, yMax);
    gl.uniform2f(
      uniforms.u_viewportPx,
      Math.max(1, this.canvas.width),
      Math.max(1, this.canvas.height)
    );
    gl.uniform2i(
      uniforms.u_grid,
      Math.max(1, options.columns),
      Math.max(1, options.rows)
    );
    gl.uniform4f(
      uniforms.u_domain,
      options.domain.xMin,
      options.domain.yMin,
      options.domain.xMax,
      options.domain.yMax
    );
    gl.uniform1i(uniforms.u_lengthMode, LENGTH_MODE_INDEX[options.lengthMode]);
    gl.uniform1f(uniforms.u_targetLength, options.targetLength);
    gl.uniform1f(uniforms.u_scale, options.scale);
    gl.uniform1f(uniforms.u_maxLength, options.maximumLength);
    gl.uniform1f(uniforms.u_compression, Math.max(1e-6, options.compression));
    gl.uniform1f(uniforms.u_headSize, options.headSize);
    gl.uniform1f(uniforms.u_headAngle, options.headAngle);
    gl.uniform1f(
      uniforms.u_shaftWidth,
      options.shaftWidth *
        (this.canvas.width /
          Math.max(1, this.canvas.clientWidth || this.canvas.width))
    );
    gl.uniform1f(uniforms.u_opacity, options.opacity);
    gl.uniform1i(uniforms.u_colorMode, COLOR_MODE_INDEX[options.colorMode]);
    const [r, g, b] = hexToUnitRGB(options.fixedColor);
    gl.uniform3f(uniforms.u_fixedColor, r, g, b);
    gl.uniform1f(uniforms.u_speedScale, Math.max(1e-6, (xMax - xMin) / 6));
    gl.uniform2f(uniforms.u_range, range.minimum, range.maximum);
    const palette = paletteUniforms(options.palette);
    gl.uniform1fv(uniforms.u_paletteAt, palette.positions);
    gl.uniform3fv(uniforms.u_paletteRGB, palette.colors);
    gl.uniform1i(uniforms.u_paletteCount, palette.count);
    gl.uniform1i(
      uniforms.u_paletteIsHue,
      options.palette === "direction-hue" ? 1 : 0
    );

    gl.drawArraysInstanced(gl.TRIANGLES, 0, VERTICES_PER_ARROW, count);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    const { gl } = this;
    if (this.program !== undefined) gl.deleteProgram(this.program.program);
    if (this.measureProgram !== undefined)
      gl.deleteProgram(this.measureProgram.program);
    if (this.measureTexture !== undefined)
      gl.deleteTexture(this.measureTexture);
    if (this.measureFramebuffer !== undefined)
      gl.deleteFramebuffer(this.measureFramebuffer);
    gl.deleteVertexArray(this.emptyArray);
    this.program = undefined;
    this.measureProgram = undefined;
  }

  /**
   * The smallest and largest magnitude anywhere on the grid.
   *
   * Without it the ramp has to be entered by a scale-free curve, which spends
   * most of its range on magnitudes no arrow actually has — zoom in on a
   * rotational field and every arrow comes out at the hot end. The generated
   * expressions take Desmos's `min` and `max` over the list; this renders the
   * same magnitudes into a one-texel-per-arrow buffer and reads them back.
   *
   * The result is cached: arrows do not animate, so this runs when the field,
   * the domain or the grid changes and not on a pan.
   */
  private magnitudeRange() {
    const { rangeMode, rangeMinimum, rangeMaximum } = this.options;
    if (rangeMode === "manual") {
      return { minimum: rangeMinimum, maximum: rangeMaximum };
    }
    if (this.measured !== undefined) return this.measured;
    this.measured = this.measureMagnitudes() ?? { minimum: 0, maximum: 1 };
    return this.measured;
  }

  private measureMagnitudes() {
    const { gl } = this;
    if (this.measureProgram === undefined) return undefined;
    const columns = Math.max(1, this.options.columns);
    const rows = Math.max(1, this.options.rows);
    // A float render target is what makes one texel per arrow readable at full
    // precision. Without the extension there is nothing to measure with.
    if (gl.getExtension("EXT_color_buffer_float") === null) return undefined;

    if (
      this.measureTexture === undefined ||
      this.measureSize.columns !== columns ||
      this.measureSize.rows !== rows
    ) {
      if (this.measureTexture !== undefined)
        gl.deleteTexture(this.measureTexture);
      const texture = gl.createTexture();
      if (texture === null) return undefined;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.R32F,
        columns,
        rows,
        0,
        gl.RED,
        gl.FLOAT,
        null
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.measureTexture = texture;
      this.measureSize = { columns, rows };
    }
    if (this.measureFramebuffer === undefined) {
      const framebuffer = gl.createFramebuffer();
      if (framebuffer === null) return undefined;
      this.measureFramebuffer = framebuffer;
    }

    const { program, uniforms } = this.measureProgram;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.measureFramebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.measureTexture,
      0
    );
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return undefined;
    }
    gl.useProgram(program);
    gl.bindVertexArray(this.emptyArray);
    gl.disable(gl.BLEND);
    gl.viewport(0, 0, columns, rows);
    gl.uniform4f(
      uniforms.u_domain,
      this.options.domain.xMin,
      this.options.domain.yMin,
      this.options.domain.xMax,
      this.options.domain.yMax
    );
    gl.uniform2i(uniforms.u_grid, columns, rows);
    gl.uniform2f(
      uniforms.u_min,
      this.options.domain.xMin,
      this.options.domain.yMin
    );
    gl.uniform2f(
      uniforms.u_max,
      this.options.domain.xMax,
      this.options.domain.yMax
    );
    gl.uniform1i(
      uniforms.u_logarithmic,
      this.options.colorMode === "log-magnitude" ? 1 : 0
    );
    // Three vertices covering the target, so every texel runs the field once.
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const pixels = new Float32Array(columns * rows);
    gl.readPixels(0, 0, columns, rows, gl.RED, gl.FLOAT, pixels);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);

    let minimum = Infinity;
    let maximum = -Infinity;
    for (const value of pixels) {
      if (!Number.isFinite(value)) continue;
      if (value < minimum) minimum = value;
      if (value > maximum) maximum = value;
    }
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum))
      return undefined;
    return { minimum, maximum };
  }

  private createMeasureProgram(field: FlowField) {
    return this.linkProgram(
      MEASURE_VERTEX_SHADER,
      measureFragmentShader(field),
      "measure"
    );
  }

  private createProgram(field: FlowField) {
    return this.linkProgram(
      arrowVertexShader(field),
      ARROW_FRAGMENT_SHADER,
      "arrow"
    );
  }

  private linkProgram(
    vertexSource: string,
    fragmentSource: string,
    name: string
  ) {
    const { gl } = this;
    const vertex = this.compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragment = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (program === null)
      throw new FlowRendererError(`Could not create the ${name} program.`);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true) {
      const log = gl.getProgramInfoLog(program) ?? "";
      gl.deleteProgram(program);
      throw new FlowRendererError(
        `Could not link the ${name} shader. ${log}`.trim()
      );
    }
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (info === null) continue;
      uniforms[info.name] = gl.getUniformLocation(program, info.name);
      const array = /^(.*)\[0\]$/.exec(info.name);
      if (array !== null) uniforms[array[1]] = uniforms[info.name];
    }
    return { program, uniforms };
  }

  private compileShader(type: number, source: string) {
    const { gl } = this;
    const shader = gl.createShader(type);
    if (shader === null)
      throw new FlowRendererError("Could not create an arrow shader.");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true) {
      const log = gl.getShaderInfoLog(shader) ?? "";
      gl.deleteShader(shader);
      throw new FlowRendererError(
        `The field could not be drawn as arrows. ${log}`.trim()
      );
    }
    return shader;
  }
}

/**
 * One arrow per instance, nine vertices each, and no vertex buffer.
 *
 * The shaft is a quad and the head a triangle, both written in a frame where
 * the arrow runs along +x from its grid point. `gl_VertexID` picks the corner
 * and `gl_InstanceID` the grid point, so the whole field is one draw call over
 * geometry that only exists in this shader.
 */
function arrowVertexShader(field: FlowField) {
  return `#version 300 es
precision highp float;
uniform vec2 u_min;
uniform vec2 u_max;
uniform vec2 u_viewportPx;
uniform ivec2 u_grid;
uniform vec4 u_domain;
uniform int u_lengthMode;
uniform float u_targetLength;
uniform float u_scale;
uniform float u_maxLength;
uniform float u_compression;
uniform float u_headSize;
uniform float u_headAngle;
uniform float u_shaftWidth;
uniform float u_opacity;
uniform int u_colorMode;
uniform vec3 u_fixedColor;
uniform float u_speedScale;
uniform vec2 u_range;
out vec4 v_color;

${fieldFunctions(field)}
${PALETTE_GLSL}

const vec2 SHAFT[6] = vec2[6](
  vec2(0.0, -1.0), vec2(1.0, -1.0), vec2(1.0, 1.0),
  vec2(0.0, -1.0), vec2(1.0, 1.0), vec2(0.0, 1.0)
);
const vec2 HEAD[3] = vec2[3](
  vec2(0.0, -1.0), vec2(1.0, 0.0), vec2(0.0, 1.0)
);

/** The same factor the generated expressions scale a vector by. */
float vtLengthFactor(float magnitude) {
  float safe = max(magnitude, 1.0e-9);
  if (u_lengthMode == 0) return 1.0;
  if (u_lengthMode == 1) return u_targetLength / safe;
  if (u_lengthMode == 2) return u_scale;
  if (u_lengthMode == 3) return min(u_scale * magnitude, u_maxLength) / safe;
  return u_scale * log(1.0 + u_compression * magnitude) /
         (u_compression * safe);
}

vec3 vtArrowColor(vec2 v, float magnitude) {
  if (u_colorMode == 0) return u_fixedColor;
  if (u_colorMode == 3) {
    return vtHueRamp(fract(atan(v.y, v.x) / 6.2831853 + 1.0));
  }
  if (u_colorMode == 4 || u_colorMode == 5) {
    // Signed, so the ramp is entered from its middle outwards.
    float component = u_colorMode == 4 ? v.x : v.y;
    return vtPalette(0.5 + 0.5 * tanh(component / u_speedScale));
  }
  float m = u_colorMode == 2 ? log(1.0 + max(magnitude, 0.0)) : magnitude;
  // Against the grid's own range, the same span the generated expressions take
  // with Desmos's min and max, so switching who draws the arrows does not
  // change what a color means.
  float span = max(u_range.y - u_range.x, 1.0e-9);
  return vtPalette(clamp((m - u_range.x) / span, 0.0, 1.0));
}

void main() {
  int column = gl_InstanceID % u_grid.x;
  int row = gl_InstanceID / u_grid.x;
  vec2 counts = max(vec2(u_grid) - 1.0, vec2(1.0));
  vec2 step = (u_domain.zw - u_domain.xy) / counts;
  vec2 base = u_domain.xy + vec2(float(column), float(row)) * step;

  vec2 v = vtField(base);
  float magnitude = length(v);
  vec2 shown = v * vtLengthFactor(magnitude);
  float len = length(shown);

  // A zero vector has no direction to draw, and a degenerate triangle would
  // still be rasterized. Send it outside the clip volume instead.
  if (magnitude <= 1.0e-9 || len <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    v_color = vec4(0.0);
    return;
  }

  vec2 dir = shown / len;
  vec2 perp = vec2(-dir.y, dir.x);
  vec2 unitsPerPixel = (u_max - u_min) / u_viewportPx;
  float halfWidth = 0.5 * u_shaftWidth *
                    0.5 * (unitsPerPixel.x + unitsPerPixel.y);

  // The head is capped against the arrow's own length, so a short vector keeps
  // a visible shaft instead of becoming a triangle on a dot.
  float headLength = min(u_headSize, 0.45 * len);
  // A head narrower than about twice the shaft does not read as a head at all,
  // so the angle sets its width only while that stays true. Zooming out shrinks
  // the arrow but not the shaft, which is what makes the floor necessary.
  float headHalf = max(headLength * tan(u_headAngle), 2.4 * halfWidth);
  float shaftEnd = max(len - headLength, 0.0);

  vec2 local;
  if (gl_VertexID < 6) {
    vec2 corner = SHAFT[gl_VertexID];
    local = vec2(corner.x * shaftEnd, corner.y * halfWidth);
  } else {
    vec2 corner = HEAD[gl_VertexID - 6];
    local = vec2(mix(shaftEnd, len, corner.x), corner.y * headHalf);
  }

  vec2 world = base + dir * local.x + perp * local.y;
  vec2 normalized = (world - u_min) / (u_max - u_min);
  gl_Position = vec4(2.0 * normalized - 1.0, 0.0, 1.0);

  float alpha = clamp(u_opacity, 0.0, 1.0);
  v_color = vec4(vtArrowColor(v, magnitude) * alpha, alpha);
}
`;
}

const ARROW_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec4 v_color;
out vec4 outColor;
void main() { outColor = v_color; }
`;

/** A single triangle covering the target, so every texel runs the field once. */
const MEASURE_VERTEX_SHADER = `#version 300 es
precision highp float;
void main() {
  vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

/**
 * One texel per arrow, holding that arrow's magnitude.
 *
 * Reading this back is how the range the colors are spread over is found,
 * without asking the CPU to evaluate a field it cannot evaluate.
 */
function measureFragmentShader(field: FlowField) {
  return `#version 300 es
precision highp float;
uniform vec4 u_domain;
uniform ivec2 u_grid;
uniform int u_logarithmic;
// The field's own code refers to these — a gradient sizes its difference step
// from them — so they are uploaded as the domain being sampled.
uniform vec2 u_min;
uniform vec2 u_max;
out float outMagnitude;

${fieldFunctions(field)}

void main() {
  ivec2 texel = ivec2(gl_FragCoord.xy);
  vec2 counts = max(vec2(u_grid) - 1.0, vec2(1.0));
  vec2 step = (u_domain.zw - u_domain.xy) / counts;
  vec2 base = u_domain.xy + vec2(texel) * step;
  float magnitude = length(vtField(base));
  if (!(magnitude == magnitude)) magnitude = 0.0;
  outMagnitude = u_logarithmic == 1 ? log(1.0 + max(magnitude, 0.0)) : magnitude;
}
`;
}
