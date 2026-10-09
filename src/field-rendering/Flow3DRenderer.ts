/**
 * A field over Desmos 3D drawn as a flowing fluid: particles carried by the
 * field, each trailing the path it has just come along, the picture a fluid
 * or gas simulation draws.
 *
 * The method is fieldplay's (Andrei Kashcha, MIT; see `LICENSE-fieldplay.md`
 * and `FlowRenderer.ts`, its 2D port): particle state in float textures, an
 * RK4 step in a fragment shader each frame, particles that are dropped and
 * respawned somewhere random so the flow never drains into its sinks. What
 * changes in 3D is the trail. The 2D flow fades a screen-space texture, which
 * is right on still graph paper and smears the moment a 3D view rotates,
 * because last frame's pixels were last frame's projection. Here each
 * particle keeps its last few positions in world space, in a ring of texture
 * layers, and the trail is drawn from them every frame with the current
 * camera, so rotating the view never smears it.
 *
 * Unlike the 2D flow, the step follows real time rather than the frame: a
 * 144 Hz display advects no faster than a 60 Hz one (briefing §11.1, which
 * records the 2D flow's version of that defect).
 */
import {
  mathToClip,
  multiplyMat4,
  projectToScreen,
  type Camera3D,
} from "./camera3d";
import {
  field3dFunctions,
  sameField3D,
  uploadField3DParameters,
  type Field3D,
} from "./field3d";
import { FieldScale3D, type ScaleRule3D } from "./FieldScale3D";
import { FlowRendererError } from "./FlowRenderer";
import {
  CLIP_GLSL,
  CUT_GLSL,
  cutUniforms,
  depthRange,
  HASH_GLSL,
  hexToUnitRGB,
  uploadCut,
  type CutSettings,
} from "./glsl3d";
import type { Box3D, Overlay3DRenderer } from "./Overlay3D";
import {
  PALETTE_GLSL,
  PALETTE_LUT_SIZE,
  paletteLUT,
  paletteUniforms,
  type PaletteID,
} from "./palettes";
import { linkProgram3D, uniformsOf, type Uniforms } from "./program3d";
import { AUTO_SURFACE_RESOLUTION, SurfaceDepth } from "./SurfaceDepth";
import type { Surface3D } from "./surfaces3d";
import { boxScreenSize, type Occlusion3D } from "./Arrow3DRenderer";

export interface Flow3DOptions {
  /** Particles, or Auto from the box's size on screen. Up to 200,000. */
  particles: number | "auto";
  /** Box half-widths per second at the scale's speed, or along each path. */
  speed: number;
  /**
   * Every particle at the same speed, along the field's direction. Off, the
   * field's own strength sets the pace (capped near a pole), as a simulation
   * would show it; on, slow regions stay readable.
   */
  normalizeSpeed: boolean;
  /** Frames of trail behind each particle. */
  trail: number;
  /** Seconds a particle lives, on average, before it starts again elsewhere. */
  lifetime: number;
  opacity: number;
  /** How bright a soft dot each particle's head is, 0 for none. */
  glow: number;
  /**
   * Whether a particle that reaches a pole's core starts again elsewhere,
   * as a sink in a simulation absorbs what flows into it. Off, particles pile
   * up at sinks, which is also a true picture of the field.
   */
  absorb: boolean;
  pointPx: number;
  /** A dark laid over the graph, as a simulation is drawn on; "" for none. */
  backdrop: string;
  backdropOpacity: number;
  colorMode: "speed" | "fixed" | "direction" | "scalar";
  /** For `scalar`: the tint at which the ramp is three quarters out. */
  tintScale?: number;
  palette: PaletteID;
  fixedColor: string;
  saturation: number;
  contrast: number;
  scale: number | ScaleRule3D;
  fog: boolean;
  clip: boolean;
  cut: CutSettings;
  occlusion: Occlusion3D;
  surfaceResolution: number | "auto";
  /**
   * A black hole at the origin bending the light of what is behind it: the
   * flow behind the hole is drawn where a lens of that mass shows it, the
   * hole's shadow is drawn black, and the horizon absorbs what reaches it.
   */
  lens: boolean;
  /** The horizon's radius, the Schwarzschild radius, in math units. */
  horizon: number;
  /**
   * With the lens: gas coming towards you brighter and hotter, going away
   * dimmer, at the orbital speed the hole's mass gives — Doppler beaming —
   * and everything dimmed close to the horizon by gravitational redshift.
   */
  beaming: boolean;
  /**
   * Draw every this-many-th point of each trail: 1 is every point, 2 half of
   * them. Trails move a pixel or two a step, so 2 looks the same at half the
   * vertices.
   */
  trailStride: number;
  /**
   * While the view is still, keep the trails as a picture that fades a
   * little each step and add only each particle's newest segment, instead of
   * drawing every trail whole each frame; any change of view redraws them
   * whole. False redraws every frame.
   */
  incremental: boolean;
  /**
   * How far past each face of the box particles live and are born, as a
   * fraction of its size, with the count raised to keep the box as dense
   * (see SPAWN_GLSL). Only while the box clips: unclipped, particles out
   * there would be drawn.
   */
  margin: number;
}

export const MAX_FLOW_PARTICLES_3D = 200_000;
export const MAX_FLOW_TRAIL_3D = 64;

export const DEFAULT_FLOW_3D_OPTIONS: Flow3DOptions = {
  particles: "auto",
  speed: 0.35,
  normalizeSpeed: false,
  trail: 48,
  lifetime: 4,
  opacity: 0.6,
  glow: 0.3,
  absorb: true,
  pointPx: 2,
  backdrop: "#05070d",
  backdropOpacity: 0.9,
  colorMode: "speed",
  palette: "spectral",
  fixedColor: "#8fd3f0",
  saturation: 1,
  contrast: 1,
  scale: "field",
  fog: true,
  clip: true,
  cut: { cutaway: "off", angle: Math.PI / 2, turn: undefined },
  occlusion: "hide",
  surfaceResolution: "auto",
  lens: false,
  horizon: 0.45,
  beaming: true,
  trailStride: 2,
  incremental: true,
  margin: 0.08,
};

/**
 * Where particles live: the box and a margin past each face. A particle is
 * born anywhere in it and lives until it leaves it, and what is outside the
 * box is clipped from the picture as everything is. Particles born only in
 * the box left the face the flow comes in through faded — nothing there had
 * had time to grow a trail; with the margin they arrive already moving.
 */
const SPAWN_GLSL = `
uniform float u_margin;
vec3 vtSpawnMin() { return u_boxMin - u_margin * (u_boxMax - u_boxMin); }
vec3 vtSpawnMax() { return u_boxMax + u_margin * (u_boxMax - u_boxMin); }
bool vtOutsideSpawn(vec3 m) {
  return any(lessThan(m, vtSpawnMin())) || any(greaterThan(m, vtSpawnMax()))
    || any(isnan(m));
}
`;

/**
 * Auto's particle count, from the box's size on screen: about one particle
 * per 30 square pixels of it. Fewer and longer-trailed than a 2D flow's,
 * because a 3D flow is seen through its own depth: at one per 12 the box
 * filled with an even fuzz in which no structure showed, where a simulation
 * picture reads through fewer, longer lines.
 */
/**
 * How big the box is on screen, in a way turning the view does not change:
 * the length its diagonal would have seen square-on. Auto's particle count
 * follows it.
 *
 * It used to follow the diagonal of the box's outline, which turning the
 * view changes by up to one and a half times with nothing having got bigger
 * (14,000 to 31,000 particles, rotate-restart.cjs); a count crossing a power
 * of two reallocates the particles, and every particle starts again, so the
 * flow restarted now and then while being dragged round. Each half-edge
 * from the centre, projected: the sum of their squared lengths on screen is
 * twice the square of the box's displayed half-side, whichever way it faces.
 */
export function boxDiagonalPx(camera: Camera3D, box: Box3D) {
  const clip = mathToClip(camera);
  const c = [0, 1, 2].map((i) => (box.min[i] + box.max[i]) / 2);
  const centre = projectToScreen(camera, c[0], c[1], c[2], clip);
  if (centre === undefined) return boxScreenSize(camera, box);
  let sum = 0;
  for (let i = 0; i < 3; i++) {
    const p = [...c];
    p[i] = box.max[i];
    const edge = projectToScreen(camera, p[0], p[1], p[2], clip);
    if (edge === undefined) return boxScreenSize(camera, box);
    sum += (edge.x - centre.x) ** 2 + (edge.y - centre.y) ** 2;
  }
  // sum = 2h² for a displayed half-side h; the diagonal is 2h√3.
  return Math.sqrt(6 * sum);
}

export function autoFlowParticles3D(boxPx: number) {
  return clamp(Math.round(boxPx ** 2 / 30), 4_000, 40_000);
}

export interface Flow3DFrame {
  particles: number;
  trail: number;
  speedScale: number;
  scaleSource: ScaleRule3D | "manual";
  cameraAzimuth: number;
  hidingSurfaces: number;
  /** Steps taken since starting, for the tests. */
  steps: number;
}

const SCALE_SAMPLING = {
  placement: "jitter" as const,
  count: 10,
  sliceAxis: 2 as const,
  slicePosition: 0.5,
  instances: 1000,
};

/** One step for every particle, writing its new state and its trail point. */
function stepFragment(field: Field3D) {
  return `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D u_state;
uniform int u_init;
uniform int u_count;
uniform float u_frame;
uniform float u_dt;
uniform float u_speed;
uniform float u_speedScale;
uniform int u_normalize;
uniform int u_tinted;
uniform float u_lifetime;
uniform int u_absorb;
uniform int u_lens;
uniform float u_horizon;
uniform uint u_seed;
uniform highp sampler2D u_pool;
uniform int u_pooled;
layout(location = 0) out vec4 o_state;
layout(location = 1) out vec4 o_trail;
${field3dFunctions(field)}
${HASH_GLSL}
${CLIP_GLSL}
${SPAWN_GLSL}

/**
 * Velocity in math units per second. Along the field's direction in box
 * half-widths, so a box with unequal axes still looks like the field; at the
 * field's own relative strength, capped at four times the scale's speed so a
 * pole does not fling its particles out of the box in one frame.
 */
vec3 vtVelocity(vec3 p) {
  vec3 half_ = 0.5 * (u_boxMax - u_boxMin);
  vec3 F = vtField(p);
  vec3 w = F / half_;
  float l = length(w);
  if (l < 1.0e-12) return vec3(0.0);
  float pace = u_normalize == 1 ? 1.0 : min(length(F) / u_speedScale, 4.0);
  return half_ * (w / l) * u_speed * pace;
}

/**
 * Where a particle is born. Without a seed, anywhere in the box. With one, a
 * point drawn from the birth pool (see BIRTH_POOL_FRAGMENT), nudged by a
 * thousandth of the box so particles that drew the same point part at once.
 * A pool entry no try landed in is no particle this step; the next step
 * draws again.
 */
vec3 vtBirth(uint key) {
  vec3 h = vtHash3(key);
  if (u_pooled == 0) return mix(vtSpawnMin(), vtSpawnMax(), h);
  ivec2 size = textureSize(u_pool, 0);
  vec4 b = texelFetch(u_pool, ivec2(h.xy * vec2(size)) % size, 0);
  if (b.w < 0.5) return vtSpawnMax() + (u_boxMax - u_boxMin);
  vec3 jitter = (vtHash3(key ^ 0x68bc21ebu) - 0.5) * 1.0e-3 * (u_boxMax - u_boxMin);
  return clamp(b.xyz + jitter, vtSpawnMin(), vtSpawnMax());
}

void main() {
  ivec2 q = ivec2(gl_FragCoord.xy);
  int width = textureSize(u_state, 0).x;
  int id = q.y * width + q.x;
  vec4 s = texelFetch(u_state, q, 0);
  vec3 r = vtHash3(uint(id) * 2654435761u ^ u_seed);
  // Each step a particle starts again with probability dt / lifetime, so
  // lifetimes are spread out — the flow never blinks as one generation ends
  // — and their mean is the lifetime in seconds at any frame rate. r is new
  // every step, because the seed is.
  bool respawn = u_init == 1 || r.x < u_dt / max(u_lifetime, 1.0e-3);
  // The field's strength where the particle ends this step, for its trail's
  // colour: measured once, and used by the sink test too.
  float here = 0.0;
  if (!respawn) {
    vec3 p = s.xyz;
    float h = u_dt;
    vec3 k1 = vtVelocity(p);
    vec3 k2 = vtVelocity(p + 0.5 * h * k1);
    vec3 k3 = vtVelocity(p + 0.5 * h * k2);
    vec3 k4 = vtVelocity(p + h * k3);
    vec3 next = p + h * (k1 + 2.0 * k2 + 2.0 * k3 + k4) / 6.0;
    // Out of the box, or stopped where the field vanishes: start again. So
    // too in a pole's core, where the field is thirty times the scale: there
    // a sink would otherwise collect every particle in the box into one
    // white knot, where a simulation's outflow absorbs them.
    here = length(vtField(next));
    bool core = u_absorb == 1 && here > 30.0 * u_speedScale;
    // Nothing comes back out of a horizon.
    bool fell = u_lens == 1 && length(next) < u_horizon;
    if (vtOutsideSpawn(next) || length(k1) == 0.0 || core || fell) respawn = true;
    else s.xyz = next;
  }
  if (respawn) {
    vec3 born = vtBirth(uint(id) ^ (u_seed * 747796405u));
    // Not born this step: hidden, and tried again next step.
    s = vec4(born, vtOutsideSpawn(born) ? -1.0e9 : u_frame);
    here = length(vtField(born));
  }
  if (id >= u_count) s.w = -1.0e9;
  o_state = s;
  // Coloured by the field's tint, the trail carries that instead of the
  // strength: the draw has no field functions, only what each point stored.
  o_trail = vec4(s.xyz, u_tinted == 1 ? vtTint(s.xyz) : here);
}
`;
}

/**
 * The birth pool: points sampled from the seed's density, by rejection, a
 * slice of rows at a time.
 *
 * Births used to be sampled where they happened, in the step, up to 64 tries
 * each. A GPU runs neighbouring particles in lockstep, so one respawn in a
 * group held the whole group through every try: with tens of thousands of
 * particles, nearly every group had one each frame, and a heavy seed (the
 * galaxy's arms, the black hole's disk) was evaluated millions of times a
 * frame. Sampling into a pool of 4,096 points instead, a sixteenth refreshed
 * each step — the whole pool every quarter of a second, quick enough for a
 * seed that moves with the clock — costs 64 tries for 256 points, and a
 * respawn is one lookup.
 */
const POOL_SIDE = 64;
const POOL_ROWS_PER_STEP = 4;

function birthPoolFragment(field: Field3D) {
  return `#version 300 es
precision highp float;
precision highp int;
uniform uint u_seed;
out vec4 o_birth;
${field3dFunctions(field)}
${HASH_GLSL}
${CLIP_GLSL}
${SPAWN_GLSL}
void main() {
  ivec2 q = ivec2(gl_FragCoord.xy);
  uint key = uint(q.y * ${POOL_SIDE} + q.x) * 2654435761u ^ u_seed;
  for (uint i = 0u; i < 64u; i++) {
    vec3 h = vtHash3(key + i * 2246822519u);
    vec3 p = mix(vtSpawnMin(), vtSpawnMax(), h);
    if (vtHash3(key ^ (i * 3266489917u + 374761393u)).x < vtSeed(p)) {
      o_birth = vec4(p, 1.0);
      return;
    }
  }
  o_birth = vec4(0.0);
}
`;
}

const FULLSCREEN_VERTEX = `#version 300 es
const vec2 P[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
void main() { gl_Position = vec4(P[gl_VertexID], 0.0, 1.0); }
`;

const DRAW_UNIFORMS = `
uniform mat4 u_mathToView;
uniform mat4 u_projection;
uniform highp sampler2D u_state;
uniform highp sampler2DArray u_trail;
uniform int u_width;
uniform int u_layers;
uniform int u_newest;
uniform float u_frame;
uniform float u_speedScale;
uniform int u_colorMode;
uniform vec3 u_fixedColor;
uniform float u_tintScale;
uniform float u_opacity;
uniform vec2 u_depthRange;
uniform int u_lens;
uniform int u_ortho;
uniform vec3 u_lensView;
uniform float u_horizonView;
uniform float u_horizon;
uniform float u_image;
uniform int u_side;
uniform int u_beaming;
uniform int u_stride;
uniform int u_needsAlong;
`;

/**
 * The lens: where a point mass at the origin shows a point behind it.
 *
 * The thin-lens equation of a point mass, the textbook weak-field
 * approximation: a source β from the line of sight to the hole is seen at
 * θ = (β ± √(β² + 4θ_E²)) / 2, with θ_E² = 2 r_s d / (D_L D_S) for a source d
 * behind the hole. The + image is the main one, pushed outward; the − image is
 * the faint second one on the far side of the hole, flipped. Worked in the
 * lens plane (angles times D_L), which an orthographic camera reaches as D_L
 * grows without bound. A point in front of the hole is not lensed, and one
 * just behind barely is, so a trail crossing the hole's depth stays joined.
 * The images nearest the hole are where the approximation is weakest: the
 * real ones sit a little closer in.
 */
const LENS_GLSL = `
vec3 vtLens(vec3 P) {
  if (u_lens == 0) return P;
  float dL = -u_lensView.z;
  float dS = -P.z;
  // The second image's pass clamps points in front to just behind, where
  // their image is at the hole's centre, under its shadow.
  float d = u_image < 0.0 ? max(dS - dL, 1.0e-4) : dS - dL;
  if (d <= 0.0 || dL <= 0.0) return P;
  dS = dL + d;
  vec2 b;
  float E2;
  if (u_ortho == 1) {
    b = P.xy - u_lensView.xy;
    E2 = 2.0 * u_horizonView * d;
  } else {
    b = (P.xy / dS - u_lensView.xy / dL) * dL;
    E2 = 2.0 * u_horizonView * d * dL / dS;
  }
  float bl = max(length(b), 1.0e-6);
  float th = 0.5 * (bl + u_image * sqrt(bl * bl + 4.0 * E2));
  vec2 img = b / bl * th;
  if (u_ortho == 1) P.xy = u_lensView.xy + img;
  else P.xy = (u_lensView.xy / dL + img / dL) * dS;
  P.z = -dS;
  return P;
}
/**
 * 1 for a point on the side of the hole this pass draws, else 0. "Behind" is
 * behind the near face of the shadow's sphere, not the hole's depth plane: gas
 * plunging inside that sphere is under the shadow, and a plane would cut the
 * disk with a straight edge across it.
 */
float vtSide(vec3 view) {
  if (u_side == 0) return 1.0;
  float dL = -u_lensView.z;
  vec2 b = u_ortho == 1 ? view.xy - u_lensView.xy : view.xy * dL / max(-view.z, 1.0e-6) - u_lensView.xy;
  float R = 2.598 * u_horizonView;
  bool behind = -view.z > dL - sqrt(max(R * R - dot(b, b), 0.0));
  return (u_side == 1) == behind ? 1.0 : 0.0;
}
/**
 * Doppler beaming and gravitational redshift: the factor δ = √(1−β²)/(1−β·n)
 * for gas at the circular-orbit speed β = √(r_s / 2r) of the hole's mass,
 * moving along the flow, seen along n; times √(1 − r_s/r) for the climb out.
 * Brightness goes as that factor cubed.
 */
float vtShift(vec3 math, vec3 along, vec3 view) {
  if (u_lens == 0 || u_beaming == 0) return 1.0;
  float r = max(length(math), u_horizon * 1.0001);
  float beta = min(sqrt(u_horizon / (2.0 * r)), 0.7);
  vec3 dir = mat3(u_mathToView) * along;
  dir = length(dir) > 0.0 ? normalize(dir) : vec3(0.0);
  vec3 n = u_ortho == 1 ? vec3(0.0, 0.0, 1.0) : normalize(-view);
  float delta = sqrt(1.0 - beta * beta) / (1.0 - beta * dot(dir, n));
  return delta * sqrt(1.0 - u_horizon / r);
}
`;

const DRAW_COLOR = `
uniform highp sampler2D u_paletteLUT;
/**
 * The colour, shifted hotter or cooler by g, the beaming's frequency ratio.
 * The ramp is read from its lookup texture (see paletteLUT): every trail
 * point of every particle asks for a colour each frame, and walking the stops
 * for each was a measurable part of drawing them.
 */
vec3 vtFlowColor(float m, vec3 along, float g) {
  if (u_colorMode == 1) return vtAdjust(u_fixedColor);
  if (u_colorMode == 2) return abs(along);
  if (u_colorMode == 3) {
    // m is the tint here, stored by the step.
    float d = 0.5 + 0.5 * tanh(m / u_tintScale);
    return texture(u_paletteLUT, vec2((d * 255.0 + 0.5) / 256.0, 0.5)).rgb;
  }
  float t = clamp(1.0 - exp(-m / u_speedScale) + 0.3 * log2(g), 0.0, 1.0);
  return texture(u_paletteLUT, vec2((t * 255.0 + 0.5) / 256.0, 0.5)).rgb;
}
/** Colour and opacity, brightened by g³ without passing white. */
vec4 vtLit(vec3 c, float a, float g) {
  float gain = g * g * g;
  return vec4(min(c * a * gain, vec3(1.0)), min(a * gain, 1.0));
}
float vtFogFor(vec3 view) {
  return clamp((-view.z - u_depthRange.x) / max(u_depthRange.y - u_depthRange.x, 1.0e-6), 0.0, 1.0);
}
`;

/** Each particle's trail, newest point first, as one line strip. */
const TRAIL_VERTEX = `#version 300 es
precision highp float;
precision highp int;
${DRAW_UNIFORMS}
out vec4 v_color;
out vec3 v_view;
out vec3 v_math;
out float v_fog;
${PALETTE_GLSL}
${DRAW_COLOR}
${LENS_GLSL}
vec4 vtTrailAt(ivec2 q, int back) {
  int layer = (u_newest - back + u_layers * 4) % u_layers;
  return texelFetch(u_trail, ivec3(q, layer), 0);
}
void main() {
  ivec2 q = ivec2(gl_InstanceID % u_width, gl_InstanceID / u_width);
  vec4 s = texelFetch(u_state, q, 0);
  int age = int(u_frame - s.w);
  // Every u_stride-th point of the ring, and always its oldest.
  int back = min(gl_VertexID * u_stride, u_layers - 1);
  // Points from before this particle's current life are not its trail:
  // collapse them onto its oldest real point, invisibly, so the strip has no
  // segment jumping from where it died to where it was reborn — and, being
  // zero length, no fragments either.
  bool real = back <= age && s.w > -1.0e8;
  vec4 t = vtTrailAt(q, real ? back : max(min(age, u_layers - 1), 0));
  // The direction along the trail is only read by the direction colours and
  // by beaming; a uniform branch, so the fetch is skipped when neither is on.
  vec4 ahead = u_needsAlong == 1 ? vtTrailAt(q, max(back - u_stride, 0)) : t;
  vec3 view = (u_mathToView * vec4(t.xyz, 1.0)).xyz;
  v_view = view;
  v_math = t.xyz;
  v_fog = vtFogFor(view);
  gl_Position = u_projection * vec4(vtLens(view), 1.0);
  // Bright at the head, fading to nothing at the tail, as a streak behind a
  // moving particle does.
  float f = 1.0 - float(back) / float(max(u_layers - 1, 1));
  float a = real ? u_opacity * f * f * vtSide(view) : 0.0;
  vec3 along = ahead.xyz - t.xyz;
  along = length(along) > 0.0 ? normalize(along) : vec3(0.0, 0.0, 1.0);
  float g = vtShift(t.xyz, along, view);
  v_color = vtLit(vtFlowColor(t.w, along, g), a, g);
}
`;

/** Each particle's head, as a soft dot. */
const HEAD_VERTEX = `#version 300 es
precision highp float;
precision highp int;
${DRAW_UNIFORMS}
uniform float u_pointPx;
out vec4 v_color;
out vec3 v_view;
out vec3 v_math;
out float v_fog;
${PALETTE_GLSL}
${DRAW_COLOR}
${LENS_GLSL}
void main() {
  ivec2 q = ivec2(gl_VertexID % u_width, gl_VertexID / u_width);
  vec4 s = texelFetch(u_state, q, 0);
  vec4 t = texelFetch(u_trail, ivec3(q, u_newest), 0);
  vec4 before = u_needsAlong == 1
    ? texelFetch(u_trail, ivec3(q, (u_newest + u_layers - 1) % u_layers), 0)
    : t;
  vec3 view = (u_mathToView * vec4(t.xyz, 1.0)).xyz;
  v_view = view;
  v_math = t.xyz;
  v_fog = vtFogFor(view);
  bool shown = s.w > -1.0e8 && vtSide(view) > 0.0;
  gl_Position = shown ? u_projection * vec4(vtLens(view), 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
  gl_PointSize = u_pointPx;
  vec3 along = t.xyz - before.xyz;
  along = length(along) > 0.0 ? normalize(along) : vec3(0.0, 0.0, 1.0);
  float g = vtShift(t.xyz, along, view);
  v_color = vtLit(vtFlowColor(t.w, along, g), u_opacity, g);
}
`;

const FLOW_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
uniform int u_clip;
uniform int u_round;
uniform int u_density;
uniform float u_fog;
uniform float u_alpha;
in vec4 v_color;
in vec3 v_view;
in vec3 v_math;
in float v_fog;
out vec4 outColor;
${CLIP_GLSL}
${CUT_GLSL}
void main() {
  if (u_clip == 1 && vtOutsideBox(v_math)) discard;
  if (vtCutAway(v_math, v_view)) discard;
  float a = 1.0;
  if (u_round == 1) {
    // A soft core and a falloff: thousands of these overlapping are what
    // makes a dense flow read as light rather than as dots.
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    a = exp(-4.0 * r * r);
  }
  a *= u_alpha * mix(1.0, 0.2, v_fog * u_fog);
  outColor = v_color * a;
  // Into the kept trails on the dark, as optical depth, −ln(1 − c): summed
  // and then put back through 1 − e^(−sum), that is screen blending exactly
  // (see compositeAccum), but a sum can be faded without changing its hue.
  if (u_density == 1) outColor = -log(1.0 - min(outColor, vec4(0.999)));
}
`;

/**
 * The hole's shadow and its photon ring, over the flow behind it.
 *
 * The shadow is the disc no light from behind gets through: radius
 * (3√3 / 2) r_s, the photon sphere's capture radius seen from far away. The
 * ring at its edge is the light that went round the hole on the way.
 */
const SHADOW_FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 u_centerPx;
uniform float u_radiusPx;
uniform int u_mode;
uniform vec3 u_ringColor;
uniform float u_ring;
uniform float u_holeDistance;
uniform float u_shadowView;
uniform vec2 u_depthMap;
uniform int u_ortho;
out vec4 outColor;
void main() {
  float r = length(gl_FragCoord.xy - u_centerPx) / max(u_radiusPx, 1.0e-3);
  if (u_mode == 0) {
    // The shadow is a sphere's silhouette, so it is written into the depth
    // buffer at the sphere's near face: the flow behind it then fails the
    // depth test and is never drawn, at no cost, while what is in front of
    // it passes and is drawn over the black.
    if (r > 1.0) discard;
    float a = 1.0 - smoothstep(0.96, 1.0, r);
    outColor = vec4(0.0, 0.0, 0.0, a);
    float z = -(u_holeDistance - u_shadowView * sqrt(max(1.0 - r * r, 0.0)));
    float ndc = u_ortho == 1
      ? u_depthMap.x * z + u_depthMap.y
      : (u_depthMap.x * z + u_depthMap.y) / -z;
    gl_FragDepth = clamp(0.5 * ndc + 0.5, 0.0, 1.0);
  } else {
    float w = 1.5 / max(u_radiusPx, 1.0);
    float g = u_ring * exp(-pow((r - 1.0 - w) / w, 2.0));
    outColor = vec4(u_ringColor * g, g);
  }
}
`;

/** A flat colour over the target: with constant-alpha blending, the fade. */
const FLAT_FRAGMENT = `#version 300 es
precision highp float;
out vec4 outColor;
void main() { outColor = vec4(1.0); }
`;

/**
 * The accumulated trails, onto the canvas. On the dark they were kept as
 * optical depth, which 1 − e^(−d) turns back into light.
 */
const COMPOSITE_FRAGMENT = `#version 300 es
precision highp float;
uniform highp sampler2D u_accum;
uniform int u_density;
out vec4 outColor;
void main() {
  vec4 c = texelFetch(u_accum, ivec2(gl_FragCoord.xy), 0);
  outColor = u_density == 1 ? 1.0 - exp(-c) : c;
}
`;

export class Flow3DRenderer implements Overlay3DRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly vao: WebGLVertexArrayObject;
  private readonly framebuffer: WebGLFramebuffer;
  private readonly trailProgram: WebGLProgram;
  private readonly trailUniforms: Uniforms;
  private readonly headProgram: WebGLProgram;
  private readonly headUniforms: Uniforms;
  private readonly shadowProgram: WebGLProgram;
  private readonly shadowUniforms: Uniforms;
  private stepProgram?: WebGLProgram;
  private stepUniforms: Uniforms = {};
  private poolProgram?: WebGLProgram;
  private poolUniforms: Uniforms = {};
  private pool?: WebGLTexture;
  private poolRow = 0;
  private lut?: WebGLTexture;
  private lutKey = "";
  private readonly flatProgram: WebGLProgram;
  private readonly compositeProgram: WebGLProgram;
  private readonly compositeUniforms: Uniforms;
  /**
   * The trails as a picture, for a still view: a float colour target with a
   * depth buffer of its own, the view it was drawn for, and the step it has
   * the trails up to.
   */
  private accum?: {
    texture: WebGLTexture;
    depth: WebGLRenderbuffer;
    framebuffer: WebGLFramebuffer;
    width: number;
    height: number;
  };
  private accumKey = "";
  private accumFrame = -1;
  /** Steps whose fade is still owed to the kept picture. */
  private fadeDebt = 0;
  /** For the tests: whether the last frame redrew the trails whole. */
  lastRedrewTrails = true;
  private readonly surfaceDepth: SurfaceDepth;
  private readonly scale: FieldScale3D;
  private state: WebGLTexture[] = [];
  private trail?: WebGLTexture;
  /** Texels a side of the state texture; particles ≤ side². */
  private side = 0;
  private layers = 0;
  private read = 0;
  private frame = 0;
  private newest = 0;
  private needsInit = true;
  private heldBoxPx?: number;
  private margin = 0;
  /** Set when the particles start again, so a kept picture of trails goes. */
  private needsTrailRedraw = true;
  private lastStep?: number;
  private field?: Field3D;
  private options: Flow3DOptions = DEFAULT_FLOW_3D_OPTIONS;
  private parameters: ReadonlyMap<string, number> = new Map();
  private time = 0;
  private pixelRatio = 1;
  last?: Flow3DFrame;

  /**
   * `smoothLines` multisamples the canvas: smoother trails at two to three and
   * a half times the cost of drawing them (measured on this machine's GPU);
   * fixed for the canvas's life, since WebGL decides it at creation.
   */
  constructor(
    private readonly canvas: HTMLCanvasElement,
    readonly smoothLines = false
  ) {
    const gl = canvas.getContext("webgl2", {
      antialias: smoothLines,
      premultipliedAlpha: true,
      alpha: true,
      depth: true,
    });
    if (gl === null) {
      throw new FlowRendererError(
        "This browser cannot draw the 3D flow: it has no WebGL2."
      );
    }
    if (gl.getExtension("EXT_color_buffer_float") === null) {
      throw new FlowRendererError(
        "The 3D flow needs float render targets, which this browser does not offer. The arrows still work."
      );
    }
    this.gl = gl;
    this.vao = gl.createVertexArray();
    this.framebuffer = gl.createFramebuffer();
    this.trailProgram = linkProgram3D(gl, TRAIL_VERTEX, FLOW_FRAGMENT);
    this.trailUniforms = uniformsOf(gl, this.trailProgram);
    this.headProgram = linkProgram3D(gl, HEAD_VERTEX, FLOW_FRAGMENT);
    this.headUniforms = uniformsOf(gl, this.headProgram);
    this.shadowProgram = linkProgram3D(gl, FULLSCREEN_VERTEX, SHADOW_FRAGMENT);
    this.flatProgram = linkProgram3D(gl, FULLSCREEN_VERTEX, FLAT_FRAGMENT);
    this.compositeProgram = linkProgram3D(
      gl,
      FULLSCREEN_VERTEX,
      COMPOSITE_FRAGMENT
    );
    this.compositeUniforms = uniformsOf(gl, this.compositeProgram);
    this.shadowUniforms = uniformsOf(gl, this.shadowProgram);
    this.surfaceDepth = new SurfaceDepth(gl);
    this.scale = new FieldScale3D(gl, this.vao);
  }

  get isContextLost() {
    return this.gl.isContextLost();
  }

  /** A flow is always moving. */
  readonly animating = true;

  setField(field: Field3D) {
    if (sameField3D(this.field, field) && this.stepProgram !== undefined)
      return;
    const { gl } = this;
    const step = linkProgram3D(gl, FULLSCREEN_VERTEX, stepFragment(field));
    if (this.stepProgram !== undefined) gl.deleteProgram(this.stepProgram);
    this.stepProgram = step;
    this.stepUniforms = uniformsOf(gl, step);
    if (this.poolProgram !== undefined) gl.deleteProgram(this.poolProgram);
    this.poolProgram =
      field.seed === undefined
        ? undefined
        : linkProgram3D(gl, FULLSCREEN_VERTEX, birthPoolFragment(field));
    this.poolUniforms =
      this.poolProgram === undefined ? {} : uniformsOf(gl, this.poolProgram);
    this.field = field;
    this.scale.setField(field);
    // A new field is a new flow: every particle starts again.
    this.needsInit = true;
  }

  setSurfaces(surfaces: readonly Surface3D[]) {
    this.surfaceDepth.setSurfaces(surfaces);
  }

  setOptions(options: Flow3DOptions) {
    this.options = options;
  }

  setParameters(values: ReadonlyMap<string, number>) {
    this.parameters = values;
  }

  setTime(seconds: number) {
    this.time = seconds;
  }

  resize(width: number, height: number, pixelRatio: number) {
    this.pixelRatio = pixelRatio;
    const w = Math.max(1, Math.round(width * pixelRatio));
    const h = Math.max(1, Math.round(height * pixelRatio));
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
  }

  /**
   * State and trail storage big enough for this many particles and this long
   * a trail. The state side grows in powers of two, so dragging the count
   * slider does not reallocate on every move; a different trail length is a
   * different ring, so it starts the trails again.
   */
  private allocate(particles: number, trail: number) {
    const { gl } = this;
    const side =
      2 ** Math.ceil(Math.log2(Math.max(16, Math.ceil(Math.sqrt(particles)))));
    if (side === this.side && trail === this.layers && this.trail !== undefined)
      return;
    for (const t of this.state) gl.deleteTexture(t);
    if (this.trail !== undefined) gl.deleteTexture(this.trail);
    const make2D = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, side, side);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      return t;
    };
    this.state = [make2D(), make2D()];
    // Half floats for the trail: positions to about one part in two
    // thousand of the box, which no screen resolves, at half the memory —
    // which is what lets 200,000 particles keep a trail on an integrated GPU.
    this.trail = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.trail);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA16F, side, side, trail);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    this.side = side;
    this.layers = trail;
    this.needsInit = true;
  }

  /**
   * The box's size on screen (see boxDiagonalPx), held while it changes by
   * less than 15%, so the small wobble perspective gives it as the view
   * turns does not count either.
   */
  private steadyBoxPx(measured: number) {
    const held = this.heldBoxPx;
    if (held === undefined || measured > held * 1.15 || measured < held / 1.15)
      this.heldBoxPx = measured;
    return this.heldBoxPx!;
  }

  /** Advances every particle by the real time since the last step. */
  private step(box: Box3D, particles: number, speedScale: number) {
    const { gl, field } = this;
    if (this.stepProgram === undefined || field === undefined) return;
    const now = performance.now();
    const elapsed =
      this.lastStep === undefined ? 0 : (now - this.lastStep) / 1000;
    // Desmos redraws and the animation loop can both land in one frame; a
    // second step a few milliseconds later would only crowd the trail.
    if (!this.needsInit && elapsed < 0.004) return;
    this.lastStep = now;
    // Capped, so a backgrounded tab resumes as a flow, not a teleport.
    const dt = Math.min(elapsed, 0.05);
    const o = this.options;
    this.frame++;
    // A whole pool before the first births, a quarter of it each step after.
    const pooled = this.refreshPool(box, this.needsInit);
    this.newest = this.frame % this.layers;
    const write = 1 - this.read;
    const u = this.stepUniforms;
    gl.useProgram(this.stepProgram);
    gl.bindVertexArray(this.vao);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.state[write],
      0
    );
    gl.framebufferTextureLayer(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT1,
      this.trail!,
      0,
      this.newest
    );
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.viewport(0, 0, this.side, this.side);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.state[this.read]);
    gl.uniform1i(u.u_state, 0);
    uploadField3DParameters(gl, u, field, this.parameters, this.time);
    gl.uniform3fv(u.u_boxMin, box.min);
    gl.uniform3fv(u.u_boxMax, box.max);
    gl.uniform1f(u.u_margin, this.margin);
    gl.uniform1i(u.u_init, this.needsInit ? 1 : 0);
    gl.uniform1i(u.u_count, particles);
    gl.uniform1f(u.u_frame, this.frame);
    gl.uniform1f(u.u_dt, dt);
    gl.uniform1f(u.u_speed, o.speed);
    gl.uniform1f(u.u_speedScale, Math.max(1e-9, speedScale));
    gl.uniform1i(u.u_normalize, o.normalizeSpeed ? 1 : 0);
    gl.uniform1i(u.u_tinted, o.colorMode === "scalar" ? 1 : 0);
    gl.uniform1f(u.u_lifetime, o.lifetime);
    gl.uniform1i(u.u_absorb, o.absorb ? 1 : 0);
    gl.uniform1i(u.u_lens, o.lens ? 1 : 0);
    gl.uniform1f(u.u_horizon, o.horizon);
    gl.uniform1ui(u.u_seed, (this.frame * 2246822519) >>> 0);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, pooled ? this.pool! : null);
    gl.uniform1i(u.u_pool, 2);
    gl.uniform1i(u.u_pooled, pooled ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.drawBuffers([gl.BACK]);
    this.read = write;
    if (this.needsInit) this.needsTrailRedraw = true;
    this.needsInit = false;
  }

  /**
   * Draws `paint` into the kept picture of trails, clearing it first when
   * `clear`. The picture has the canvas's size, float colour so a long fade
   * never bands, and a depth buffer of its own for what hides the trails.
   */
  private accumulate(clear: boolean, paint: () => void) {
    const { gl } = this;
    const { width } = this.canvas;
    const { height } = this.canvas;
    if (
      this.accum === undefined ||
      this.accum.width !== width ||
      this.accum.height !== height
    ) {
      if (this.accum !== undefined) {
        gl.deleteTexture(this.accum.texture);
        gl.deleteRenderbuffer(this.accum.depth);
        gl.deleteFramebuffer(this.accum.framebuffer);
      }
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, width, height);
      const depth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
      gl.renderbufferStorage(
        gl.RENDERBUFFER,
        gl.DEPTH_COMPONENT24,
        width,
        height
      );
      const framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0
      );
      gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER,
        gl.DEPTH_ATTACHMENT,
        gl.RENDERBUFFER,
        depth
      );
      this.accum = { texture, depth, framebuffer, width, height };
      clear = true;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.accum.framebuffer);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.viewport(0, 0, width, height);
    if (clear) {
      gl.clearColor(0, 0, 0, 0);
      gl.clearDepth(1);
      gl.depthMask(true);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.depthMask(false);
    }
    paint();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
  }

  /**
   * One step's fade of the kept trails: by 1 − 3/layers, so a trail kept as
   * a picture is about as long and as bright as one drawn whole, whose
   * opacity falls as (1 − age/layers)², averaging a third; e^(−3·age/layers)
   * averages a little under a third too. Measured with look-compare.cjs:
   * brightness and colourfulness within about ten percent of trails redrawn
   * each frame, on every preset tried.
   *
   * On the dark, what is faded is optical depth (see FLOW_FRAGMENT), not
   * screen-blended light. Fading light that screen blending has squeezed
   * towards white squeezes it further each step, which turned every preset
   * grey: a sum fades without changing hue.
   */
  private fadeAccum(layers: number, dark: boolean, steps: number) {
    const { gl } = this;
    const keep = Math.max(0, 1 - 3 / Math.max(layers, 4)) ** steps;
    gl.useProgram(this.flatProgram);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendColor(0, 0, 0, keep);
    gl.blendFunc(gl.ZERO, gl.CONSTANT_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.accumBlend(dark);
  }

  /**
   * How trails are blended into the kept picture: on the dark, summed as
   * optical depth; on paper, painted over as they are on the canvas.
   */
  private accumBlend(dark: boolean) {
    const { gl } = this;
    if (dark) gl.blendFunc(gl.ONE, gl.ONE);
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  /** The kept trails onto the canvas, blended as trails drawn there are. */
  private compositeAccum(dark: boolean) {
    const { gl } = this;
    gl.useProgram(this.compositeProgram);
    gl.disable(gl.DEPTH_TEST);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.accum!.texture);
    gl.uniform1i(this.compositeUniforms.u_accum, 4);
    gl.uniform1i(this.compositeUniforms.u_density, dark ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.enable(gl.BLEND);
    this.restoreTrailBlend(dark);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private restoreTrailBlend(dark: boolean) {
    const { gl } = this;
    if (dark) {
      gl.blendFuncSeparate(
        gl.ONE,
        gl.ONE_MINUS_SRC_COLOR,
        gl.ONE,
        gl.ONE_MINUS_SRC_ALPHA
      );
    } else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  /** The palette's lookup texture, rebuilt only when the ramp changes. */
  private updateLUT(o: Flow3DOptions) {
    const key = `${o.palette}|${o.saturation}|${o.contrast}`;
    if (key === this.lutKey && this.lut !== undefined) return;
    const { gl } = this;
    if (this.lut === undefined) {
      this.lut = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.lut);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, PALETTE_LUT_SIZE, 1);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindTexture(gl.TEXTURE_2D, this.lut);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      PALETTE_LUT_SIZE,
      1,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      paletteLUT(o.palette, {
        saturation: o.saturation,
        contrast: o.contrast,
      })
    );
    this.lutKey = key;
  }

  /**
   * Resamples a slice of the birth pool (all of it if `whole`), for a field
   * with a seed; false for one without, whose births need no pool.
   */
  private refreshPool(box: Box3D, whole: boolean) {
    const { gl, field } = this;
    if (this.poolProgram === undefined || field === undefined) return false;
    if (this.pool === undefined) {
      this.pool = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.pool);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, POOL_SIDE, POOL_SIDE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      whole = true;
    }
    const u = this.poolUniforms;
    gl.useProgram(this.poolProgram);
    gl.bindVertexArray(this.vao);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.pool,
      0
    );
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT1,
      gl.TEXTURE_2D,
      null,
      0
    );
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    uploadField3DParameters(gl, u, field, this.parameters, this.time);
    gl.uniform3fv(u.u_boxMin, box.min);
    gl.uniform3fv(u.u_boxMax, box.max);
    gl.uniform1f(u.u_margin, this.margin);
    gl.uniform1ui(u.u_seed, (this.frame * 2654435761 + 12345) >>> 0);
    const rows = whole ? POOL_SIDE : POOL_ROWS_PER_STEP;
    const from = whole ? 0 : this.poolRow;
    gl.viewport(0, from, POOL_SIDE, rows);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.poolRow = (from + rows) % POOL_SIDE;
    gl.useProgram(this.stepProgram!);
    return true;
  }

  draw(camera: Camera3D, box: Box3D) {
    const { gl, options: o, field } = this;
    if (field === undefined) return;
    const boxPx = this.steadyBoxPx(boxDiagonalPx(camera, box));
    this.margin = o.clip ? Math.max(0, o.margin) : 0;
    // As many more as the margin's volume holds, so the box is as dense.
    const particles = Math.min(
      MAX_FLOW_PARTICLES_3D,
      Math.round(
        (o.particles === "auto"
          ? autoFlowParticles3D(boxPx)
          : Math.max(1, Math.round(o.particles))) *
          (1 + 2 * this.margin) ** 3
      )
    );
    const trail = Math.round(clamp(o.trail, 2, MAX_FLOW_TRAIL_3D));
    this.allocate(particles, trail);
    const { speedScale, scaleSource } = this.scale.resolve(
      o.scale,
      box,
      SCALE_SAMPLING,
      this.parameters,
      this.time
    );
    this.step(box, particles, speedScale);

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // The backdrop, as a simulation is drawn on: a dark laid over the graph,
    // not opaque, so the box and the axes still show through it faintly.
    const [br, bg, bb] = hexToUnitRGB(
      o.backdrop === "" ? "#000000" : o.backdrop
    );
    const ba = o.backdrop === "" ? 0 : clamp(o.backdropOpacity, 0, 1);
    gl.clearColor(br * ba, bg * ba, bb * ba, ba);
    gl.clearDepth(1);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.bindVertexArray(this.vao);

    const mathToView = multiplyMat4(camera.view, camera.world);
    const occluding = o.occlusion !== "over" && this.surfaceDepth.count > 0;
    if (occluding) {
      this.surfaceDepth.draw(
        mathToView,
        camera.projection,
        box,
        o.surfaceResolution === "auto"
          ? AUTO_SURFACE_RESOLUTION
          : o.surfaceResolution,
        this.parameters,
        this.time,
        // On a backdrop, cut it away where the graph's solids are, so a
        // charge or a plate shows on the dark rather than vanishing under it.
        ba > 0
      );
    }
    gl.enable(gl.BLEND);
    // On a dark backdrop, light builds up where trails cross, which is the
    // glow of a dense flow — by screen blending, which brightens towards
    // white without passing it, rather than adding, which clipped every
    // crowded region to a flat white blob. On the white graph paper light
    // would vanish, so there it is ordinary see-through paint.
    if (ba > 0) {
      gl.blendFuncSeparate(
        gl.ONE,
        gl.ONE_MINUS_SRC_COLOR,
        gl.ONE,
        gl.ONE_MINUS_SRC_ALPHA
      );
    } else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);

    const cut = cutUniforms(mathToView, box, o.cut);
    const palette = paletteUniforms(o.palette);
    this.updateLUT(o);
    const hole = lensFrame(camera, mathToView, o, box);
    const stride = Math.max(1, Math.min(8, Math.round(o.trailStride)));
    // Points drawn per trail: every stride-th, and the oldest.
    const strip = Math.ceil((this.layers - 1) / stride) + 1;
    const common = (u: Uniforms) => {
      gl.uniformMatrix4fv(u.u_mathToView, false, mathToView);
      gl.uniformMatrix4fv(u.u_projection, false, camera.projection);
      gl.uniform3fv(u.u_boxMin, box.min);
      gl.uniform3fv(u.u_boxMax, box.max);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.state[this.read]);
      gl.uniform1i(u.u_state, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.trail ?? null);
      gl.uniform1i(u.u_trail, 1);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(u.u_width, this.side);
      gl.uniform1i(u.u_layers, this.layers);
      gl.uniform1i(u.u_newest, this.newest);
      gl.uniform1f(u.u_frame, this.frame);
      gl.uniform1f(u.u_speedScale, Math.max(1e-9, speedScale));
      gl.uniform1i(
        u.u_colorMode,
        o.colorMode === "fixed"
          ? 1
          : o.colorMode === "direction"
            ? 2
            : o.colorMode === "scalar"
              ? 3
              : 0
      );
      gl.uniform1f(u.u_tintScale, Math.max(1e-9, o.tintScale ?? 1));
      gl.uniform3fv(u.u_fixedColor, hexToUnitRGB(o.fixedColor));
      gl.uniform2fv(u.u_depthRange, depthRange(mathToView, box));
      gl.uniform1i(u.u_clip, o.clip ? 1 : 0);
      gl.uniform1f(u.u_fog, o.fog ? 1 : 0);
      uploadCut(gl, u, cut);
      gl.uniform1fv(u.u_paletteAt, palette.positions);
      gl.uniform3fv(u.u_paletteRGB, palette.colors);
      gl.uniform1i(u.u_paletteCount, palette.count);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this.lut ?? null);
      gl.uniform1i(u.u_paletteLUT, 3);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(u.u_paletteIsHue, o.palette === "direction-hue" ? 1 : 0);
      gl.uniform1f(u.u_saturation, o.saturation);
      gl.uniform1f(u.u_contrast, o.contrast);
      gl.uniform1i(u.u_lens, hole === undefined ? 0 : 1);
      gl.uniform1i(u.u_ortho, camera.orthographic ? 1 : 0);
      gl.uniform3fv(u.u_lensView, hole?.view ?? [0, 0, 0]);
      gl.uniform1f(u.u_horizonView, hole?.horizonView ?? 0);
      gl.uniform1f(u.u_horizon, o.horizon);
      gl.uniform1i(u.u_beaming, o.beaming ? 1 : 0);
      gl.uniform1i(u.u_stride, stride);
      gl.uniform1i(
        u.u_needsAlong,
        o.colorMode === "direction" || (hole !== undefined && o.beaming) ? 1 : 0
      );
    };
    const passes = (draw: (alpha: number) => void) => {
      if (occluding && o.occlusion === "fade") {
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.GREATER);
        draw(0.25);
      }
      if (occluding || hole !== undefined) {
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
      } else {
        gl.disable(gl.DEPTH_TEST);
      }
      draw(1);
    };

    /**
     * Trail strips for one side of the hole and one of its images: `vertices`
     * points of each, every `step`-th of its ring.
     */
    // Whether trails are going into the kept picture as optical depth.
    let density = 0;
    const strips = (
      side: number,
      image: number,
      vertices: number,
      step: number,
      dim = 1
    ) => {
      gl.useProgram(this.trailProgram);
      const tu = this.trailUniforms;
      common(tu);
      gl.uniform1i(tu.u_side, side);
      gl.uniform1f(tu.u_image, image);
      gl.uniform1i(tu.u_stride, step);
      gl.uniform1i(tu.u_density, density);
      gl.uniform1f(tu.u_opacity, o.opacity * dim);
      gl.uniform1i(tu.u_round, 0);
      passes((alpha) => {
        gl.uniform1f(tu.u_alpha, alpha);
        gl.drawArraysInstanced(gl.LINE_STRIP, 0, vertices, particles);
      });
    };
    const heads = (side: number, image: number) => {
      if (o.glow <= 0) return;
      gl.useProgram(this.headProgram);
      const hu = this.headUniforms;
      common(hu);
      gl.uniform1i(hu.u_side, side);
      gl.uniform1f(hu.u_image, image);
      gl.uniform1f(hu.u_opacity, o.opacity * o.glow);
      gl.uniform1i(hu.u_round, 1);
      gl.uniform1f(
        hu.u_pointPx,
        o.pointPx * (1 + 2 * o.glow) * this.pixelRatio
      );
      passes((alpha) => {
        gl.uniform1f(hu.u_alpha, alpha);
        gl.drawArrays(gl.POINTS, 0, particles);
      });
    };
    // The shadow first, into the depth buffer as well as the colour, so
    // every trail behind it is rejected by the depth test: one pass for the
    // main image of everything, one for the faint second image of what is
    // behind. The photon ring goes over everything, after.
    if (hole !== undefined) this.drawShadowDisc(hole, camera, ba > 0);
    const images: [number, number][] =
      hole === undefined
        ? [[0, 1]]
        : [
            [0, 1],
            [1, -1],
          ];

    // The trails: whole, into the canvas, for a view that is moving or when
    // asked to; otherwise into the kept picture, only the newest segments.
    const viewKey = JSON.stringify([
      mathToView,
      camera.projection,
      this.canvas.width,
      this.canvas.height,
      box,
      o.opacity,
      o.colorMode,
      o.fixedColor,
      o.cut,
      o.clip,
      o.fog,
      o.occlusion,
      o.lens,
      o.horizon,
      o.beaming,
      stride,
      this.lutKey,
      this.layers,
      this.side,
      particles,
      ba > 0,
      this.surfaceDepth.count,
      // A slider a surface reads moves the surface, and what it hides.
      occluding ? [...this.parameters] : 0,
    ]);
    const surfacesMove = this.surfaceDepth.moving;
    const keep = o.incremental && !surfacesMove;
    if (!keep) {
      for (const [side, image] of images) strips(side, image, strip, stride);
      this.lastRedrewTrails = true;
    } else {
      const redraw =
        this.accum === undefined ||
        this.accumKey !== viewKey ||
        this.needsTrailRedraw;
      this.accumulate(redraw, () => {
        this.accumBlend(ba > 0);
        density = ba > 0 ? 1 : 0;
        if (redraw) {
          if (occluding) {
            gl.colorMask(false, false, false, false);
            gl.depthMask(true);
            this.surfaceDepth.draw(
              mathToView,
              camera.projection,
              box,
              o.surfaceResolution === "auto"
                ? AUTO_SURFACE_RESOLUTION
                : o.surfaceResolution,
              this.parameters,
              this.time
            );
            gl.depthMask(false);
            gl.colorMask(true, true, true, true);
          }
          if (hole !== undefined) {
            gl.colorMask(false, false, false, false);
            this.drawShadowDisc(hole, camera, ba > 0);
            gl.colorMask(true, true, true, true);
          }
          for (const [side, image] of images)
            strips(side, image, strip, stride);
        } else if (this.accumFrame !== this.frame) {
          // A step has been taken since: fade the picture by one step's
          // worth, and add each particle's newest segment.
          // Faded every second step by two steps' worth, which looks the
          // same at half the cost of a pass over the whole picture.
          this.fadeDebt += this.frame - Math.max(this.accumFrame, 0);
          if (this.fadeDebt >= 2) {
            this.fadeAccum(this.layers, ba > 0, this.fadeDebt);
            this.fadeDebt = 0;
          }
          // A particle moves about a pixel a step, and a line a pixel long
          // often lights no pixel at all; so each step's segment reaches back
          // three steps, covering every pixel of the trail about three times,
          // at a third of the opacity.
          for (const [side, image] of images) strips(side, image, 2, 3, 1 / 3);
        }
        density = 0;
      });
      this.accumKey = viewKey;
      this.accumFrame = this.frame;
      this.needsTrailRedraw = false;
      this.lastRedrewTrails = redraw;
      this.compositeAccum(ba > 0);
    }
    for (const [side, image] of images) heads(side, image);
    if (hole !== undefined) this.drawPhotonRing(hole, palette, ba > 0);
    gl.depthMask(true);
    gl.bindVertexArray(null);
    this.last = {
      particles,
      trail: this.layers,
      speedScale,
      scaleSource,
      cameraAzimuth: cut.facing,
      hidingSurfaces: occluding ? this.surfaceDepth.count : 0,
      steps: this.frame,
    };
  }

  /** The hole's shadow: black, opaque, and written into the depth buffer. */
  private drawShadowDisc(hole: LensFrame, camera: Camera3D, dark: boolean) {
    const { gl } = this;
    const u = this.shadowUniforms;
    gl.useProgram(this.shadowProgram);
    this.shadowPlacement(hole);
    gl.uniform1f(u.u_holeDistance, -hole.view[2]);
    gl.uniform1f(u.u_shadowView, ((3 * Math.sqrt(3)) / 2) * hole.horizonView);
    gl.uniform2f(u.u_depthMap, camera.projection[10], camera.projection[14]);
    gl.uniform1i(u.u_ortho, camera.orthographic ? 1 : 0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);
    // Black over the backdrop, and opaque, so the graph does not show
    // through the hole.
    gl.blendFuncSeparate(
      gl.ZERO,
      gl.ONE_MINUS_SRC_ALPHA,
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA
    );
    gl.uniform1i(u.u_mode, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.depthMask(false);
    // Back to the flow's own blending.
    if (dark) {
      gl.blendFuncSeparate(
        gl.ONE,
        gl.ONE_MINUS_SRC_COLOR,
        gl.ONE,
        gl.ONE_MINUS_SRC_ALPHA
      );
    } else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  /** The photon ring at the shadow's edge, in the palette's hottest colour. */
  private drawPhotonRing(
    hole: LensFrame,
    palette: ReturnType<typeof paletteUniforms>,
    dark: boolean
  ) {
    const { gl } = this;
    const u = this.shadowUniforms;
    gl.useProgram(this.shadowProgram);
    gl.disable(gl.DEPTH_TEST);
    this.shadowPlacement(hole);
    const n = palette.count;
    gl.uniform3fv(u.u_ringColor, palette.colors.slice((n - 1) * 3, n * 3));
    gl.uniform1f(u.u_ring, 0.8);
    gl.uniform1i(u.u_mode, 1);
    if (dark) {
      gl.blendFuncSeparate(
        gl.ONE,
        gl.ONE_MINUS_SRC_COLOR,
        gl.ONE,
        gl.ONE_MINUS_SRC_ALPHA
      );
    } else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private shadowPlacement(hole: LensFrame) {
    const { gl } = this;
    const u = this.shadowUniforms;
    gl.uniform2fv(u.u_centerPx, [
      hole.centerPx[0] * this.canvas.width,
      hole.centerPx[1] * this.canvas.height,
    ]);
    gl.uniform1f(u.u_radiusPx, hole.shadowPx * this.canvas.height);
  }

  destroy() {
    const { gl } = this;
    for (const t of this.state) gl.deleteTexture(t);
    if (this.trail !== undefined) gl.deleteTexture(this.trail);
    if (this.stepProgram !== undefined) gl.deleteProgram(this.stepProgram);
    if (this.poolProgram !== undefined) gl.deleteProgram(this.poolProgram);
    if (this.pool !== undefined) gl.deleteTexture(this.pool);
    if (this.lut !== undefined) gl.deleteTexture(this.lut);
    gl.deleteProgram(this.trailProgram);
    gl.deleteProgram(this.headProgram);
    gl.deleteProgram(this.shadowProgram);
    gl.deleteProgram(this.flatProgram);
    gl.deleteProgram(this.compositeProgram);
    if (this.accum !== undefined) {
      gl.deleteTexture(this.accum.texture);
      gl.deleteRenderbuffer(this.accum.depth);
      gl.deleteFramebuffer(this.accum.framebuffer);
    }
    gl.deleteFramebuffer(this.framebuffer);
    this.surfaceDepth.dispose();
    this.scale.dispose();
    gl.deleteVertexArray(this.vao);
  }
}

interface LensFrame {
  /** The hole's centre in view coordinates. */
  view: number[];
  /** The horizon radius in view units. */
  horizonView: number;
  /** The hole's centre on the canvas, 0..1 from the bottom left. */
  centerPx: [number, number];
  /** The shadow's radius as a fraction of the canvas height. */
  shadowPx: number;
}

/**
 * Where the hole is for this frame, or nothing without a lens or with the
 * hole behind the camera.
 *
 * The world matrix scales math units to view units, unequally if the box's
 * axes differ; the horizon is scaled by the geometric mean, the scale of a
 * volume, so a sphere stays the size of a sphere on average.
 */
function lensFrame(
  camera: Camera3D,
  mathToView: readonly number[],
  o: Flow3DOptions,
  box: Box3D
): LensFrame | undefined {
  if (!o.lens || !(o.horizon > 0)) return undefined;
  // A hole the box has been moved off is not in the picture: nothing of it
  // is drawn, as nothing of a surface outside the box is, rather than a
  // shadow and a ring hanging beside the box and bending what is inside it.
  if (box.min.some((lo, i) => lo > 0 || box.max[i] < 0)) return undefined;
  const m = mathToView;
  const det =
    m[0] * (m[5] * m[10] - m[9] * m[6]) -
    m[4] * (m[1] * m[10] - m[9] * m[2]) +
    m[8] * (m[1] * m[6] - m[5] * m[2]);
  const unit = Math.cbrt(Math.abs(det));
  const view = [m[12], m[13], m[14]];
  const distance = -view[2];
  if (!(distance > 0) || !(unit > 0)) return undefined;
  const horizonView = o.horizon * unit;
  const p = camera.projection;
  const clip = [
    p[0] * view[0] + p[4] * view[1] + p[8] * view[2] + p[12],
    p[1] * view[0] + p[5] * view[1] + p[9] * view[2] + p[13],
    p[3] * view[0] + p[7] * view[1] + p[11] * view[2] + p[15],
  ];
  const shadow = ((3 * Math.sqrt(3)) / 2) * horizonView;
  // Half the canvas height per unit of NDC; p[5] maps view height to NDC.
  const shadowNdc = camera.orthographic
    ? shadow * p[5]
    : (shadow * p[5]) / distance;
  return {
    view,
    horizonView,
    centerPx: [(clip[0] / clip[2] + 1) / 2, (clip[1] / clip[2] + 1) / 2],
    shadowPx: shadowNdc / 2,
  };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
