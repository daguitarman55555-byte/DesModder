export type DoomRenderMode = "vectors" | "faithful";

export interface VectorFrameOptions {
  mode: DoomRenderMode;
  cellSize: number;
  strokeWidth: number;
  contrast: number;
  background: number;
}

const DEFAULTS: VectorFrameOptions = {
  mode: "vectors",
  cellSize: 4,
  strokeWidth: 0.22,
  contrast: 1.15,
  background: 0.08,
};

const VERTEX = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D u_frame;
uniform vec2 u_frameSize;
uniform vec2 u_outputSize;
uniform float u_cellSize;
uniform float u_strokeWidth;
uniform float u_contrast;
uniform float u_background;
uniform int u_mode;
in vec2 v_uv;
out vec4 outColor;

float luminance(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void main() {
  vec2 sourceUV = vec2(v_uv.x, 1.0 - v_uv.y);
  vec3 source = texture(u_frame, sourceUV).rgb;
  if (u_mode == 1) {
    outColor = vec4(source, 1.0);
    return;
  }

  vec2 cells = max(vec2(1.0), u_outputSize / u_cellSize);
  vec2 cell = floor(v_uv * cells);
  vec2 local = fract(v_uv * cells) - 0.5;
  vec2 sampleUV = (cell + 0.5) / cells;
  sampleUV.y = 1.0 - sampleUV.y;

  vec2 texel = 1.0 / u_frameSize;
  vec3 color = texture(u_frame, sampleUV).rgb;
  float left = luminance(texture(u_frame, sampleUV - vec2(texel.x, 0.0)).rgb);
  float right = luminance(texture(u_frame, sampleUV + vec2(texel.x, 0.0)).rgb);
  float down = luminance(texture(u_frame, sampleUV - vec2(0.0, texel.y)).rgb);
  float up = luminance(texture(u_frame, sampleUV + vec2(0.0, texel.y)).rgb);
  vec2 gradient = vec2(right - left, up - down);
  float energy = clamp(luminance(color) * u_contrast, 0.0, 1.0);

  // Tangent to the image gradient: Fieldplay-like flow follows visible edges.
  vec2 direction = length(gradient) > 0.002
    ? normalize(vec2(-gradient.y, gradient.x))
    : vec2(cos(energy * 6.28318), sin(energy * 6.28318));
  vec2 normal = vec2(-direction.y, direction.x);
  float along = dot(local, direction);
  float across = abs(dot(local, normal));
  float halfLength = mix(0.12, 0.48, sqrt(energy));
  float shaft = 1.0 - smoothstep(u_strokeWidth, u_strokeWidth + 0.08, across);
  float ends = 1.0 - smoothstep(halfLength, halfLength + 0.06, abs(along));
  float arrow = shaft * ends;

  float headX = along - halfLength * 0.55;
  float head = 1.0 - smoothstep(
    u_strokeWidth,
    u_strokeWidth + 0.08,
    abs(across - max(0.0, headX) * 0.65)
  );
  head *= step(0.0, headX) * step(headX, halfLength * 0.42);
  float glyph = max(arrow, head);
  vec3 backdrop = source * u_background;
  outColor = vec4(mix(backdrop, color, glyph), 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (shader === null) throw new Error("Could not allocate a Doom shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "Unknown shader error.";
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

export default class VectorFrameRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly texture: WebGLTexture;
  private readonly vao: WebGLVertexArrayObject;
  private options = { ...DEFAULTS };
  private sourceWidth = 320;
  private sourceHeight = 200;
  private destroyed = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      preserveDrawingBuffer: false,
    });
    if (gl === null) throw new Error("Doom vector rendering requires WebGL2.");
    this.gl = gl;
    const program = gl.createProgram();
    const texture = gl.createTexture();
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    if (program === null || texture === null || vao === null || buffer === null)
      throw new Error("Could not allocate Doom GPU resources.");
    this.program = program;
    this.texture = texture;
    this.vao = vao;
    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, "a_position");
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(program) ?? "Could not link Doom shaders.");
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  setOptions(options: Partial<VectorFrameOptions>) {
    this.options = { ...this.options, ...options };
  }

  resize(width: number, height: number, ratio = devicePixelRatio) {
    const safeRatio = Math.min(2, Math.max(1, ratio));
    const w = Math.max(1, Math.round(width * safeRatio));
    const h = Math.max(1, Math.round(height * safeRatio));
    if (this.canvas.width === w && this.canvas.height === h) return;
    this.canvas.width = w;
    this.canvas.height = h;
  }

  uploadFrame(pixels: Uint8Array, width = 320, height = 200) {
    if (this.destroyed || pixels.byteLength !== width * height * 4)
      throw new Error("Doom supplied an invalid RGBA framebuffer.");
    this.sourceWidth = width;
    this.sourceHeight = height;
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  }

  uploadCanvas(source: HTMLCanvasElement) {
    if (this.destroyed) return;
    this.sourceWidth = source.width;
    this.sourceHeight = source.height;
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  draw() {
    if (this.destroyed) return;
    const { gl } = this;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    const uniform = (name: string) => gl.getUniformLocation(this.program, name);
    gl.uniform1i(uniform("u_frame"), 0);
    gl.uniform2f(uniform("u_frameSize"), this.sourceWidth, this.sourceHeight);
    gl.uniform2f(uniform("u_outputSize"), this.canvas.width, this.canvas.height);
    gl.uniform1f(uniform("u_cellSize"), this.options.cellSize);
    gl.uniform1f(uniform("u_strokeWidth"), this.options.strokeWidth);
    gl.uniform1f(uniform("u_contrast"), this.options.contrast);
    gl.uniform1f(uniform("u_background"), this.options.background);
    gl.uniform1i(uniform("u_mode"), this.options.mode === "faithful" ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.gl.deleteTexture(this.texture);
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteProgram(this.program);
  }
}
