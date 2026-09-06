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
import { FieldRangeProbe, intersectBounds } from "./FieldRange";
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
  private readonly range: FieldRangeProbe;
  /**
   * The drawing-buffer rectangle the last frame drew into.
   *
   * Exposed because the measuring pass renders into a buffer of its own, and
   * leaving the viewport at that size drew the whole field into a corner. That
   * failure is invisible to anything except the pixels, so this is what the
   * test looks at instead.
   */
  lastViewport = { width: 0, height: 0 };
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
    this.range = new FieldRangeProbe(gl, array);
  }

  setOptions(options: ArrowOptions) {
    this.options = { ...options };
  }

  setBounds(bounds: FlowBounds) {
    this.bounds = bounds;
  }

  setField(field: FlowField) {
    const { gl } = this;
    if (this.program !== undefined) gl.deleteProgram(this.program.program);
    this.program = this.createProgram(field);
    this.range.setField(field);
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
    if (count === 0) {
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }

    // Measuring renders into a grid-sized buffer of its own, so the viewport is
    // only set once that is done with it. Setting it first meant every frame
    // that had to re-measure drew the whole field into a corner the size of the
    // grid — which is what a change to the field looked like.
    const range = this.magnitudeRange();
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.lastViewport = {
      width: this.canvas.width,
      height: this.canvas.height,
    };
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

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
    this.range.destroy();
    gl.deleteVertexArray(this.emptyArray);
    this.program = undefined;
  }

  /**
   * The range the colour ramp is spread over.
   *
   * Measured across what is on screen, clipped to the sampling domain, because
   * that is the same box the flow visualiser measures and a colour has to mean
   * the same thing in both. Spreading it over the whole domain instead put
   * every visible arrow at the bottom of the ramp whenever the domain was
   * larger than the view.
   */
  private magnitudeRange() {
    const { rangeMode, rangeMinimum, rangeMaximum } = this.options;
    if (rangeMode === "manual") {
      return { minimum: rangeMinimum, maximum: rangeMaximum };
    }
    const box = intersectBounds(this.bounds, this.options.domain);
    return (
      this.range.measure(box ?? this.options.domain) ?? {
        minimum: 0,
        maximum: 1,
      }
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
  float drawn = length(shown);

  // A zero vector has no direction to draw, and a degenerate triangle would
  // still be rasterized. Send it outside the clip volume instead.
  if (magnitude <= 1.0e-9 || drawn <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    v_color = vec4(0.0);
    return;
  }

  // The direction has to come from the unclamped vector: normalizing by the
  // clamped length would scale the direction back up by exactly the amount the
  // clamp took off, and the arrow would come out its original size.
  vec2 dir = shown / drawn;
  // However the length was chosen, an arrow longer than a fraction of the view
  // says nothing — it leaves the screen before its direction reads. This bites
  // when the sampling domain is far larger than what is on screen, where the
  // spacing the length follows is itself larger than the viewport.
  float len = min(drawn, 0.12 * (u_max.x - u_min.x));
  vec2 perp = vec2(-dir.y, dir.x);
  vec2 unitsPerPixel = (u_max - u_min) / u_viewportPx;
  // Thickness is in pixels so it does not change with the zoom — but a pixel is
  // worth more graph units the further out you go, and left alone the shaft
  // ends up wider than the arrow is long. Past that point it is not an arrow
  // any more, just a blob square to its own direction, and a field of them
  // smears into a wash. So the pixel width is also capped against the length.
  float pixel = 0.5 * (unitsPerPixel.x + unitsPerPixel.y);
  // Thin enough never to be wider than long, but never thinner than about half
  // a pixel, or a dense field disappears instead of reading as a fine texture.
  float halfWidth = max(
    min(0.5 * u_shaftWidth * pixel, 0.2 * len),
    0.3 * pixel
  );

  // The head is capped against the arrow's own length, so a short vector keeps
  // a visible shaft instead of becoming a triangle on a dot.
  float headLength = min(u_headSize, 0.45 * len);
  // A head narrower than about twice the shaft does not read as a head at all,
  // so the angle sets its width only while that stays true — and never wider
  // than the arrow is long, for the same reason as the shaft.
  float headHalf = min(
    max(headLength * tan(u_headAngle), 2.4 * halfWidth),
    0.5 * len
  );
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
