/**
 * How large the field gets over a given box, measured on the GPU.
 *
 * Both halves of the picture colour by magnitude, and a colour only means
 * something against a range. They used to pick their own: the arrows spread
 * their ramp over the whole sampling domain, the flow over a scale-free curve
 * sized by the viewport. On a domain the size of the view those nearly agree,
 * and on a domain far larger than the view they do not agree at all — every
 * arrow sits at the bottom of the ramp while the particles over them use its
 * whole length. Same field, two scales, and a picture that reads as two.
 *
 * So neither owns the range any more. Both measure the same box — what is on
 * screen — through this, and map their ramp linearly across it.
 *
 * The CPU cannot do this itself: the field only exists as compiled GLSL. So a
 * small grid of samples is rendered into a float texture and read back. The
 * grid is a fixed size rather than one texel per arrow, because the range is a
 * property of the field over a region and not of how densely it is being drawn
 * — which also keeps the readback at a few kilobytes when the arrows number in
 * the hundreds of thousands.
 */
import { fieldFunctions, FlowRendererError } from "./field";
import type { FlowBounds, FlowField } from "./field";

export interface MagnitudeRange {
  minimum: number;
  maximum: number;
}

/**
 * Samples per side. 64 is enough to find the range of anything smooth enough
 * to be worth drawing as a field, and costs a 16KB readback.
 */
const SAMPLES = 64;

/** Boxes this close together would not move the range meaningfully. */
function sameBox(a: FlowBounds, b: FlowBounds) {
  const span = Math.max(a.xMax - a.xMin, a.yMax - a.yMin, 1e-9);
  const tolerance = span * 1e-4;
  return (
    Math.abs(a.xMin - b.xMin) < tolerance &&
    Math.abs(a.xMax - b.xMax) < tolerance &&
    Math.abs(a.yMin - b.yMin) < tolerance &&
    Math.abs(a.yMax - b.yMax) < tolerance
  );
}

/** The part of `box` that is also inside `within`, or undefined if none is. */
export function intersectBounds(
  box: FlowBounds,
  within: FlowBounds
): FlowBounds | undefined {
  const xMin = Math.max(box.xMin, within.xMin);
  const xMax = Math.min(box.xMax, within.xMax);
  const yMin = Math.max(box.yMin, within.yMin);
  const yMax = Math.min(box.yMax, within.yMax);
  if (xMax <= xMin || yMax <= yMin) return undefined;
  return { xMin, xMax, yMin, yMax };
}

export class FieldRangeProbe {
  private program?: {
    program: WebGLProgram;
    uniforms: Record<string, WebGLUniformLocation | null>;
  };
  private texture?: WebGLTexture;
  private framebuffer?: WebGLFramebuffer;
  private readonly pixels = new Float32Array(SAMPLES * SAMPLES);
  private cached?: { box: FlowBounds; range: MagnitudeRange };
  private unavailable = false;

  constructor(
    private readonly gl: WebGL2RenderingContext,
    private readonly vertexArray: WebGLVertexArrayObject
  ) {}

  setField(field: FlowField) {
    const { gl } = this;
    if (this.program !== undefined) gl.deleteProgram(this.program.program);
    this.program = this.link(field);
    this.cached = undefined;
  }

  /**
   * The field's magnitude range over `box`, or undefined if it cannot be
   * measured — no float render target, or no field compiled yet. Repeating a
   * box returns the cached answer, so panning re-measures once per new view
   * rather than once per frame.
   */
  measure(box: FlowBounds): MagnitudeRange | undefined {
    if (this.unavailable || this.program === undefined) return undefined;
    if (this.cached !== undefined && sameBox(this.cached.box, box)) {
      return this.cached.range;
    }
    const range = this.render(box);
    if (range === undefined) return undefined;
    this.cached = { box: { ...box }, range };
    return range;
  }

  destroy() {
    const { gl } = this;
    if (this.program !== undefined) gl.deleteProgram(this.program.program);
    if (this.texture !== undefined) gl.deleteTexture(this.texture);
    if (this.framebuffer !== undefined) gl.deleteFramebuffer(this.framebuffer);
    this.program = undefined;
    this.texture = undefined;
    this.framebuffer = undefined;
  }

  private render(box: FlowBounds): MagnitudeRange | undefined {
    const { gl } = this;
    // A float render target is what makes the magnitudes readable at all.
    if (gl.getExtension("EXT_color_buffer_float") === null) {
      this.unavailable = true;
      return undefined;
    }
    if (!this.ensureTarget()) return undefined;

    const { program, uniforms } = this.program!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer!);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.texture!,
      0
    );
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      this.unavailable = true;
      return undefined;
    }

    gl.useProgram(program);
    gl.bindVertexArray(this.vertexArray);
    gl.disable(gl.BLEND);
    gl.viewport(0, 0, SAMPLES, SAMPLES);
    gl.uniform2f(uniforms.u_min, box.xMin, box.yMin);
    gl.uniform2f(uniforms.u_max, box.xMax, box.yMax);
    gl.uniform1f(uniforms.u_samples, SAMPLES);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.readPixels(0, 0, SAMPLES, SAMPLES, gl.RED, gl.FLOAT, this.pixels);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);

    let minimum = Infinity;
    let maximum = -Infinity;
    for (const value of this.pixels) {
      if (!Number.isFinite(value)) continue;
      if (value < minimum) minimum = value;
      if (value > maximum) maximum = value;
    }
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum))
      return undefined;
    return { minimum, maximum };
  }

  private ensureTarget() {
    const { gl } = this;
    if (this.texture === undefined) {
      const texture = gl.createTexture();
      if (texture === null) return false;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.R32F,
        SAMPLES,
        SAMPLES,
        0,
        gl.RED,
        gl.FLOAT,
        null
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.texture = texture;
    }
    if (this.framebuffer === undefined) {
      const framebuffer = gl.createFramebuffer();
      if (framebuffer === null) return false;
      this.framebuffer = framebuffer;
    }
    return true;
  }

  private link(field: FlowField) {
    const { gl } = this;
    const vertex = this.compile(gl.VERTEX_SHADER, RANGE_VERTEX_SHADER);
    const fragment = this.compile(
      gl.FRAGMENT_SHADER,
      rangeFragmentShader(field)
    );
    const program = gl.createProgram();
    if (program === null)
      throw new FlowRendererError("Could not create the range program.");
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true) {
      const log = gl.getProgramInfoLog(program) ?? "";
      gl.deleteProgram(program);
      throw new FlowRendererError(
        `Could not link the range shader. ${log}`.trim()
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

  private compile(type: number, source: string) {
    const { gl } = this;
    const shader = gl.createShader(type);
    if (shader === null)
      throw new FlowRendererError("Could not create a range shader.");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true) {
      const log = gl.getShaderInfoLog(shader) ?? "";
      gl.deleteShader(shader);
      throw new FlowRendererError(
        `The field's range could not be measured. ${log}`.trim()
      );
    }
    return shader;
  }
}

/** One triangle covering the target, so every texel runs the field once. */
const RANGE_VERTEX_SHADER = `#version 300 es
precision highp float;
void main() {
  vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

function rangeFragmentShader(field: FlowField) {
  return `#version 300 es
precision highp float;
// The field's own code reads these — a gradient sizes its difference step from
// them — and they are the box being measured, which is what it should be.
uniform vec2 u_min;
uniform vec2 u_max;
uniform float u_samples;
out float outMagnitude;

${fieldFunctions(field)}

void main() {
  vec2 at = (floor(gl_FragCoord.xy) + 0.5) / u_samples;
  float magnitude = length(vtField(u_min + at * (u_max - u_min)));
  // NaN compares false with itself, and a NaN texel would poison the range.
  if (!(magnitude == magnitude)) magnitude = 0.0;
  outMagnitude = magnitude;
}
`;
}
