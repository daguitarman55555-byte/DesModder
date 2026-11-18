/*
 * The bench's FLIP/APIC solver on the GPU, in WebGL2 fragment shaders, so
 * 5 mm cells run faster than the CPU's 30 ms a step. It is the CPU solver in
 * flip.js step for step, with four differences, each because a fragment
 * shader cannot do the CPU's version cheaply:
 *
 * - Pressure is solved by conjugate gradient preconditioned with one
 *   multigrid V-cycle (McAdams, Sifakis & Teran 2010), for a fixed number of
 *   iterations from the last step's pressure, not with MIC(0), whose
 *   preconditioner runs cell after cell. Every scalar stays on the GPU.
 * - Particles are pushed apart from the neighbours found in a table of bins
 *   0.4 h across, all at once rather than one after another.
 * - Particle-to-grid adds with float blending: each particle draws one 3x3
 *   point over the u faces, v faces and cell centres it touches.
 * - The fastest particle, which sizes the next step, is read a step or two
 *   late, plus what gravity can have added since.
 *
 * State lives in float textures. Particle i is texel (i % PW, i / PW) of
 * P0 (x, y, vx, vy), P1 (APIC's du/dx, du/dy, dv/dx, dv/dy) and F (on the
 * grid this step). Grid cell (i, j) is texel (i, j), the CPU's i * fNumY + j;
 * u sits on its left face, v on its bottom face, as in flip.js.
 *
 * Scenes and the page read pos, vel, particleDensity, cellType and p as on
 * the CPU; each is read back from the GPU the first time it is asked for
 * after a step, so a frame pays for one read of each, not one a step.
 *
 * Needs flip.js first (it borrows nextDt, advance, volume, front and
 * surfaceAt). Works on the page and in a worker (OffscreenCanvas).
 */
(function (root) {
  "use strict";

  const PW = 512; // particle texture width
  const SPREAD = 64; // interleaving of the particle draws
  const FLUID = 0;
  const AIR = 1;
  const SOLID = 2;

  const COMMON = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
uniform ivec2 N;
uniform float h;
uniform float r;
uniform vec4 obs;   // x, y, radius, active
uniform vec2 obsV;
const float FLUID = 0., AIR = 1., SOLID = 2.;
const ivec2 E1 = ivec2(1, 0), E2 = ivec2(0, 1);
bool inGrid(ivec2 c) { return c.x >= 0 && c.y >= 0 && c.x < N.x && c.y < N.y; }
bool obsCell(ivec2 c) {
  if (obs.w <= 0. || c.x < 1 || c.y < 1 || c.x > N.x - 2 || c.y > N.y - 2) return false;
  vec2 d = (vec2(c) + 0.5) * h - obs.xy;
  return dot(d, d) < obs.z * obs.z;
}
bool solidCell(ivec2 c) {
  if (c.x <= 0 || c.y <= 0 || c.x >= N.x - 1 || c.y >= N.y - 1) return true;
  return obsCell(c);
}
`;

  const CELL = `
uniform sampler2D cellT;
float typeAt(ivec2 c) { return inGrid(c) ? texelFetch(cellT, c, 0).r : SOLID; }
float sAt(ivec2 c) { return typeAt(c) == SOLID ? 0. : 1.; }
`;

  const FULL_VS = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID & 1) * 4 - 1), float((gl_VertexID & 2) * 2 - 1));
  gl_Position = vec4(p, 0., 1.);
}`;

  // Walls and the obstacle, as handleParticleCollisions.
  const COLLIDE = `
void collide(inout vec2 p, inout vec2 v) {
  if (obs.w > 0.) {
    vec2 d = p - obs.xy;
    float d2 = dot(d, d);
    float reach = obs.z + r;
    if (d2 < reach * reach) {
      float dl = max(sqrt(d2), 1e-9);
      vec2 n = d2 > 0. ? d / dl : vec2(0., 1.);
      p = obs.xy + n * reach;
      float vn = dot(v - obsV, n);
      if (vn < 0.) v -= vn * n;
    }
  }
  p = clamp(p, vec2(h + r), vec2(float(N.x - 1) * h - r, float(N.y - 1) * h - r));
}
`;

  const PARTICLE = `
uniform int np;
int pid() { ivec2 t = ivec2(gl_FragCoord.xy); return t.y * ${PW} + t.x; }
`;

  // ------------------------------------------------------------ programs
  const PROGRAMS = {
    // Particle to grid: one 3x3 point per particle, additive. Outputs the
    // weighted u and its weight, the same for v, and density with occupancy.
    p2g: {
      vs: `${COMMON}
uniform sampler2D P0, P1;
uniform float apic;
uniform int block, np;
flat out vec4 pv;
flat out vec4 af;
flat out ivec2 occ;
void main() {
  // Interleaved order: neighbours in the seeding are far apart in the draw,
  // so additions to one cell do not queue behind each other.
  int id = (gl_VertexID % ${SPREAD}) * block + gl_VertexID / ${SPREAD};
  if (id >= np) { gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 1.; return; }
  ivec2 t = ivec2(id % ${PW}, id / ${PW});
  vec4 p = texelFetch(P0, t, 0);
  af = texelFetch(P1, t, 0) * apic;
  float x = clamp(p.x, h, float(N.x - 1) * h);
  float y = clamp(p.y, h, float(N.y - 1) * h);
  pv = vec4(x, y, p.zw);
  occ = clamp(ivec2(floor(p.xy / h)), ivec2(0), N - 1);
  ivec2 base = ivec2(floor(vec2(x, y) / h - 0.5));
  gl_Position = vec4((vec2(base) + 1.5) / vec2(N) * 2. - 1., 0., 1.);
  gl_PointSize = 3.;
}`,
      fs: `${COMMON}
flat in vec4 pv;
flat in vec4 af;
flat in ivec2 occ;
layout(location = 0) out vec4 oU;
layout(location = 1) out vec4 oV;
layout(location = 2) out vec4 oC;
float w1(int X, int a, int b, float t) { return (X == a ? 1. - t : 0.) + (X == b ? t : 0.); }
void main() {
  ivec2 X = ivec2(gl_FragCoord.xy);
  float x = pv.x, y = pv.y, hh = 0.5 * h;
  {
    int x0 = min(int(floor(x / h)), N.x - 2);
    float tx = (x - float(x0) * h) / h;
    int y0 = min(int(floor((y - hh) / h)), N.y - 2);
    float ty = (y - hh - float(y0) * h) / h;
    float w = w1(X.x, x0, min(x0 + 1, N.x - 2), tx) * w1(X.y, y0, min(y0 + 1, N.y - 2), ty);
    float val = pv.z + af.x * (float(X.x) * h - x) + af.y * (float(X.y) * h + hh - y);
    oU = vec4(w * val, w, 0., 0.);
  }
  {
    int x0 = min(int(floor((x - hh) / h)), N.x - 2);
    float tx = (x - hh - float(x0) * h) / h;
    int y0 = min(int(floor(y / h)), N.y - 2);
    float ty = (y - float(y0) * h) / h;
    float w = w1(X.x, x0, min(x0 + 1, N.x - 2), tx) * w1(X.y, y0, min(y0 + 1, N.y - 2), ty);
    float val = pv.w + af.z * (float(X.x) * h + hh - x) + af.w * (float(X.y) * h - y);
    oV = vec4(w * val, w, 0., 0.);
  }
  {
    int x0 = int(floor((x - hh) / h));
    float tx = (x - hh - float(x0) * h) / h;
    int y0 = int(floor((y - hh) / h));
    float ty = (y - hh - float(y0) * h) / h;
    float w = w1(X.x, x0, min(x0 + 1, N.x - 2), tx) * w1(X.y, y0, min(y0 + 1, N.y - 2), ty);
    oC = vec4(w, X == occ ? 1. : 0., 0., 0.);
  }
}`,
    },

    // Normalise the sums; solid faces take the solid's velocity. Cell types.
    prep: {
      fs: `${COMMON}
uniform sampler2D accU, accV, accC;
layout(location = 0) out vec4 oVel;
layout(location = 1) out vec4 oCell;
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 au = texelFetch(accU, c, 0), av = texelFetch(accV, c, 0), ac = texelFetch(accC, c, 0);
  float u = au.g > 0. ? au.r / au.g : 0.;
  float v = av.g > 0. ? av.r / av.g : 0.;
  bool sc = solidCell(c);
  if (sc || solidCell(c - E1)) u = obsCell(c) || obsCell(c - E1) ? obsV.x : 0.;
  if (sc || solidCell(c - E2)) v = obsCell(c) || obsCell(c - E2) ? obsV.y : 0.;
  oVel = vec4(u, v, 0., 0.);
  oCell = vec4(sc ? SOLID : ac.g > 0. ? FLUID : AIR, ac.r, 0., 0.);
}`,
    },

    // Right-hand sides: minus the divergence, and the drift solve's outflow.
    rhs: {
      fs: `${COMMON}${CELL}
uniform sampler2D vel0;
uniform float rest, band, driftScale, driftSurface;
out vec4 o;
bool deepInside(ivec2 c) {
  for (int di = -2; di <= 2; di++)
    for (int dj = -2; dj <= 2; dj++) {
      if (abs(di) + abs(dj) > 2) continue;
      ivec2 q = c + ivec2(di, dj);
      if (inGrid(q) && texelFetch(cellT, q, 0).r == AIR) return false;
    }
  return true;
}
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 cell = texelFetch(cellT, c, 0);
  float ss = sAt(c + E1) + sAt(c - E1) + sAt(c + E2) + sAt(c - E2);
  if (cell.r != FLUID || ss == 0.) { o = vec4(0.); return; }
  vec4 v = texelFetch(vel0, c, 0);
  float div = texelFetch(vel0, c + E1, 0).x - v.x + texelFetch(vel0, c + E2, 0).y - v.y;
  float b = 0.;
  if (driftScale > 0.) {
    float raw = cell.g - rest;
    float excess = raw > band ? raw - band : raw < -band ? raw + band : 0.;
    if (deepInside(c) || (excess > 0. && driftSurface > 0.)) b = driftScale * excess;
  }
  o = vec4(-div, b, 0., 0.);
}`,
    },

    // One half-sweep of red-black SOR on A q = b, A as in projectPcg.
    sor: {
      fs: `${COMMON}${CELL}
uniform sampler2D qT, rhsT;
uniform int parity, chan;
uniform float omega, qScale;
out vec4 o;
float nb(ivec2 c) { return typeAt(c) == FLUID ? texelFetch(qT, c, 0).r * qScale : 0.; }
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  float q = texelFetch(qT, c, 0).r * qScale;
  float ss = sAt(c + E1) + sAt(c - E1) + sAt(c + E2) + sAt(c - E2);
  if (typeAt(c) != FLUID || ss == 0.) { o = vec4(0.); return; }
  if (((c.x + c.y) & 1) != parity) { o = vec4(q); return; }
  float b = texelFetch(rhsT, c, 0)[chan];
  float gs = (b + nb(c + E1) + nb(c - E1) + nb(c + E2) + nb(c - E2)) / ss;
  o = vec4(q + omega * (gs - q));
}`,
    },

    // Conjugate gradient, as projectPcg but every scalar a 1x1 texture.
    // Start: q from last step's times qScale, r = b - A q.
    pcgInit: {
      fs: `${COMMON}${CELL}
uniform sampler2D qT, rhsT;
uniform int chan;
uniform float qScale;
layout(location = 0) out vec4 oQ;
layout(location = 1) out vec4 oR;
float nq(ivec2 c) { return typeAt(c) == FLUID ? texelFetch(qT, c, 0).r * qScale : 0.; }
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  float ss = sAt(c + E1) + sAt(c - E1) + sAt(c + E2) + sAt(c - E2);
  if (typeAt(c) != FLUID || ss == 0.) { oQ = vec4(0.); oR = vec4(0.); return; }
  float q = nq(c);
  float Aq = ss * q - nq(c + E1) - nq(c - E1) - nq(c + E2) - nq(c - E2);
  oQ = vec4(q);
  oR = vec4(texelFetch(rhsT, c, 0)[chan] - Aq);
}`,
    },

    // A d, and d . A d per cell for the sum.
    matvec: {
      fs: `${COMMON}${CELL}
uniform sampler2D dT;
out vec4 o;
float nd(ivec2 c) { return typeAt(c) == FLUID ? texelFetch(dT, c, 0).r : 0.; }
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  float ss = sAt(c + E1) + sAt(c - E1) + sAt(c + E2) + sAt(c - E2);
  if (typeAt(c) != FLUID || ss == 0.) { o = vec4(0.); return; }
  float d = nd(c);
  float Ad = ss * d - nd(c + E1) - nd(c - E1) - nd(c + E2) - nd(c - E2);
  o = vec4(Ad, d * Ad, 0., 0.);
}`,
    },

    // q += alpha d, r -= alpha A d, alpha = sigma / (d . A d).
    pcgUpdate: {
      fs: `${COMMON}
uniform sampler2D qT, rT, dT, adT, sigT, dAdT;
layout(location = 0) out vec4 oQ;
layout(location = 1) out vec4 oR;
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  float dAd = texelFetch(dAdT, ivec2(0), 0).r;
  float alpha = dAd != 0. ? texelFetch(sigT, ivec2(0), 0).r / dAd : 0.;
  oQ = vec4(texelFetch(qT, c, 0).r + alpha * texelFetch(dT, c, 0).r);
  oR = vec4(texelFetch(rT, c, 0).r - alpha * texelFetch(adT, c, 0).r);
}`,
    },

    // d = z + beta d, beta = sigma new / sigma old (0 on the first).
    pcgDir: {
      fs: `${COMMON}
uniform sampler2D zT, dT, newT, oldT;
uniform float first;
out vec4 o;
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  float old = texelFetch(oldT, ivec2(0), 0).r;
  float beta = first > 0. || old == 0. ? 0. : texelFetch(newT, ivec2(0), 0).r / old;
  o = vec4(texelFetch(zT, c, 0).r + beta * texelFetch(dT, c, 0).r);
}`,
    },

    // Sum over 8x8 blocks: of X.r Y.r (mode 0), X.g (1) or X.r (2).
    sum: {
      fs: `${COMMON}
uniform sampler2D X, Y;
uniform ivec2 size;
uniform int mode;
out vec4 o;
void main() {
  ivec2 b = ivec2(gl_FragCoord.xy) * 8;
  float s = 0.;
  for (int i = 0; i < 8; i++)
    for (int j = 0; j < 8; j++) {
      ivec2 c = b + ivec2(i, j);
      if (c.x >= size.x || c.y >= size.y) continue;
      vec4 t = texelFetch(X, c, 0);
      s += mode == 0 ? t.r * texelFetch(Y, c, 0).r : mode == 1 ? t.g : t.r;
    }
  o = vec4(s);
}`,
    },

    // Multigrid: a coarse cell is liquid if any of its four is, solid if all
    // four are, else air.
    coarseType: {
      fs: `${COMMON}
uniform sampler2D fineT;
uniform ivec2 NF;
out vec4 o;
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy) * 2;
  float liquid = 0., solid = 0.;
  for (int i = 0; i < 4; i++) {
    ivec2 f = c + ivec2(i & 1, i >> 1);
    float t = f.x < NF.x && f.y < NF.y ? texelFetch(fineT, f, 0).r : SOLID;
    liquid += t == FLUID ? 1. : 0.;
    solid += t == SOLID ? 1. : 0.;
  }
  o = vec4(liquid > 0. ? FLUID : solid == 4. ? SOLID : AIR);
}`,
    },

    // The fine residual b - A q, summed over each coarse cell's four and
    // halved: with piecewise-constant prolongation the Galerkin coarse
    // operator is twice the coarse grid's own stencil.
    restrict: {
      fs: `${COMMON}${CELL}
uniform sampler2D fineT, qF, rhsF, coarseT;
uniform ivec2 NF;
uniform int chan;
out vec4 o;
float fType(ivec2 c) { return c.x >= 0 && c.y >= 0 && c.x < NF.x && c.y < NF.y ? texelFetch(fineT, c, 0).r : SOLID; }
float fs_(ivec2 c) { return fType(c) == SOLID ? 0. : 1.; }
float fq(ivec2 c) { return fType(c) == FLUID ? texelFetch(qF, c, 0).r : 0.; }
void main() {
  ivec2 C = ivec2(gl_FragCoord.xy);
  if (texelFetch(coarseT, C, 0).r != FLUID) { o = vec4(0.); return; }
  float sum = 0.;
  for (int i = 0; i < 4; i++) {
    ivec2 c = C * 2 + ivec2(i & 1, i >> 1);
    if (fType(c) != FLUID) continue;
    float ss = fs_(c + E1) + fs_(c - E1) + fs_(c + E2) + fs_(c - E2);
    if (ss == 0.) continue;
    float Aq = ss * fq(c) - fq(c + E1) - fq(c - E1) - fq(c + E2) - fq(c - E2);
    sum += texelFetch(rhsF, c, 0)[chan] - Aq;
  }
  o = vec4(0.5 * sum);
}`,
    },

    // Add the coarse correction to each liquid cell.
    prolong: {
      fs: `${COMMON}${CELL}
uniform sampler2D qT, qC;
out vec4 o;
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  float q = texelFetch(qT, c, 0).r;
  float ss = sAt(c + E1) + sAt(c - E1) + sAt(c + E2) + sAt(c - E2);
  if (typeAt(c) == FLUID && ss > 0.) q += texelFetch(qC, c / 2, 0).r;
  o = vec4(q);
}`,
    },

    // The same, fused with the first half-sweep after it: one pass fewer a
    // level. A liquid neighbour always has a non-solid side (this cell), so
    // it takes the correction too.
    prolongSor: {
      fs: `${COMMON}${CELL}
uniform sampler2D qT, qC, rhsT;
uniform int parity;
out vec4 o;
float nq(ivec2 c) {
  return typeAt(c) == FLUID ? texelFetch(qT, c, 0).r + texelFetch(qC, c / 2, 0).r : 0.;
}
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  float ss = sAt(c + E1) + sAt(c - E1) + sAt(c + E2) + sAt(c - E2);
  if (typeAt(c) != FLUID || ss == 0.) { o = vec4(0.); return; }
  float q = nq(c);
  if (((c.x + c.y) & 1) != parity) { o = vec4(q); return; }
  float b = texelFetch(rhsT, c, 0).r;
  o = vec4((b + nq(c + E1) + nq(c - E1) + nq(c + E2) + nq(c - E2)) / ss);
}`,
    },

    // Largest |b - A q| and |b| over the liquid, for checking convergence.
    residual: {
      fs: `${COMMON}${CELL}
uniform sampler2D qT, rhsT;
uniform int chan;
out vec4 o;
float nq(ivec2 c) { return typeAt(c) == FLUID ? texelFetch(qT, c, 0).r : 0.; }
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  float ss = sAt(c + E1) + sAt(c - E1) + sAt(c + E2) + sAt(c - E2);
  if (typeAt(c) != FLUID || ss == 0.) { o = vec4(0.); return; }
  float b = texelFetch(rhsT, c, 0)[chan];
  float Aq = ss * nq(c) - nq(c + E1) - nq(c - E1) - nq(c + E2) - nq(c - E2);
  o = vec4(abs(b - Aq), abs(b), 0., 0.);
}`,
    },

    // Apply the pressure; mark the faces that border liquid or solid.
    project: {
      fs: `${COMMON}${CELL}
uniform sampler2D vel0, qT;
out vec4 o;
float Q(ivec2 c) { return inGrid(c) ? texelFetch(qT, c, 0).r : 0.; }
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 v0 = texelFetch(vel0, c, 0);
  float q = Q(c), s = sAt(c), t = typeAt(c);
  float u = v0.x, v = v0.y;
  if (s > 0. && sAt(c - E1) > 0.) u += Q(c - E1) - q;
  if (s > 0. && sAt(c - E2) > 0.) v += Q(c - E2) - q;
  o = vec4(u, v, t != AIR || typeAt(c - E1) != AIR ? 1. : 0., t != AIR || typeAt(c - E2) != AIR ? 1. : 0.);
}`,
    },

    // One layer of extrapolation into the air, as extrapolateVelocity.
    extrapolate: {
      fs: `${COMMON}
uniform sampler2D X;
out vec4 o;
void main() {
  ivec2 c = ivec2(gl_FragCoord.xy);
  vec4 f = texelFetch(X, c, 0);
  o = f;
  if (c.x < 1 || c.y < 1 || c.x > N.x - 2 || c.y > N.y - 2) return;
  vec4 a = texelFetch(X, c - E1, 0), b = texelFetch(X, c + E1, 0);
  vec4 d = texelFetch(X, c - E2, 0), e = texelFetch(X, c + E2, 0);
  if (f.z == 0.) {
    float n = a.z + b.z + d.z + e.z;
    if (n > 0.) { o.x = (a.z * a.x + b.z * b.x + d.z * d.x + e.z * e.x) / n; o.z = 1.; }
  }
  if (f.w == 0.) {
    float n = a.w + b.w + d.w + e.w;
    if (n > 0.) { o.y = (a.w * a.y + b.w * b.y + d.w * d.y + e.w * e.y) / n; o.w = 1.; }
  }
}`,
    },

    // Move particles: through last step's grid (RK2), or by their own
    // velocity; then gravity and collisions.
    advect: {
      fs: `${COMMON}${PARTICLE}${COLLIDE}
uniform sampler2D P0, F, velX;
uniform float dt, gridAdvect, hasField;
uniform vec2 g;
out vec4 o;
float face(ivec2 c, int k) {
  if (obsCell(c) || obsCell(c - (k == 0 ? E1 : E2))) return k == 0 ? obsV.x : obsV.y;
  return texelFetch(velX, c, 0)[k];
}
float sampleKnown(int k, vec2 p, float fallback) {
  float dx = k == 0 ? 0. : 0.5 * h, dy = k == 0 ? 0.5 * h : 0.;
  float x = clamp(p.x, h, float(N.x - 1) * h), y = clamp(p.y, h, float(N.y - 1) * h);
  int x0 = min(int(floor((x - dx) / h)), N.x - 2);
  float tx = (x - dx - float(x0) * h) / h;
  int x1 = min(x0 + 1, N.x - 2);
  int y0 = min(int(floor((y - dy) / h)), N.y - 2);
  float ty = (y - dy - float(y0) * h) / h;
  int y1 = min(y0 + 1, N.y - 2);
  ivec2 c0 = ivec2(x0, y0), c1 = ivec2(x1, y0), c2 = ivec2(x1, y1), c3 = ivec2(x0, y1);
  float k0 = texelFetch(velX, c0, 0)[2 + k] * (1. - tx) * (1. - ty);
  float k1 = texelFetch(velX, c1, 0)[2 + k] * tx * (1. - ty);
  float k2 = texelFetch(velX, c2, 0)[2 + k] * tx * ty;
  float k3 = texelFetch(velX, c3, 0)[2 + k] * (1. - tx) * ty;
  float w = k0 + k1 + k2 + k3;
  float s = k0 * face(c0, k) + k1 * face(c1, k) + k2 * face(c2, k) + k3 * face(c3, k);
  return w < 0.999 ? fallback * (1. - w) + s : s;
}
void main() {
  vec4 p = texelFetch(P0, ivec2(gl_FragCoord.xy), 0);
  if (pid() >= np) { o = p; return; }
  vec2 x = p.xy, v = p.zw;
  if (gridAdvect > 0.) {
    if (hasField > 0.) {
      if (texelFetch(F, ivec2(gl_FragCoord.xy), 0).r == 0.) x += dt * v;
      else {
        vec2 m = x + 0.5 * dt * vec2(sampleKnown(0, x, v.x), sampleKnown(1, x, v.y));
        x += dt * vec2(sampleKnown(0, m, v.x), sampleKnown(1, m, v.y));
      }
    }
    v += dt * g;
  } else {
    v += dt * g;
    x += dt * v;
  }
  collide(x, v);
  o = vec4(x, v);
}`,
    },

    // Keep apart, step 1: each particle writes its position and id + 1 into
    // its bin, bins 0.4 h across, at most about one particle each. Where
    // two share a bin one is lost from the table, but still sees the other.
    bin: {
      vs: `${COMMON}
uniform sampler2D P0;
uniform ivec2 NB;
uniform float cb;
uniform int block, np;
flat out vec4 pv;
void main() {
  int id = (gl_VertexID % ${SPREAD}) * block + gl_VertexID / ${SPREAD};
  if (id >= np) { gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 1.; return; }
  ivec2 t = ivec2(id % ${PW}, id / ${PW});
  vec4 p = texelFetch(P0, t, 0);
  pv = vec4(p.xy, float(id + 1), 0.);
  vec2 b = clamp(floor(p.xy / cb), vec2(0.), vec2(NB - 1));
  gl_Position = vec4((b + 0.5) / vec2(NB) * 2. - 1., 0., 1.);
  gl_PointSize = 1.;
}`,
      fs: `${COMMON}
flat in vec4 pv;
out vec4 o;
void main() { o = pv; }`,
    },

    // Step 2: push each particle half the overlap away from every particle
    // within 2r, as pushParticlesApart, all at once; then collide.
    separate: {
      fs: `${COMMON}${PARTICLE}${COLLIDE}
uniform sampler2D P0, binT;
uniform ivec2 NB;
uniform float cb, minDist;
out vec4 o;
void main() {
  vec4 p = texelFetch(P0, ivec2(gl_FragCoord.xy), 0);
  int id = pid();
  if (id >= np) { o = p; return; }
  ivec2 b = ivec2(floor(p.xy / cb));
  vec2 move = vec2(0.);
  for (int i = -2; i <= 2; i++)
    for (int j = -2; j <= 2; j++) {
      ivec2 c = b + ivec2(i, j);
      if (c.x < 0 || c.y < 0 || c.x >= NB.x || c.y >= NB.y) continue;
      vec4 q = texelFetch(binT, c, 0);
      if (q.z == 0. || int(q.z) - 1 == id) continue;
      vec2 d = q.xy - p.xy;
      float d2 = dot(d, d);
      if (d2 > minDist * minDist || d2 == 0.) continue;
      float dl = sqrt(d2);
      move -= d * (0.5 * (minDist - dl) / dl);
    }
  vec2 x = p.xy + move, v = p.zw;
  collide(x, v);
  o = vec4(x, v);
}`,
    },

    // Grid to particle (FLIP or APIC), then wall friction by the log law.
    g2p: {
      fs: `${COMMON}${CELL}${PARTICLE}
uniform sampler2D P0, P1, F, velX, vel0;
uniform float flipRatio, apic, friction, dt;
layout(location = 0) out vec4 oP;
layout(location = 1) out vec4 oA;
layout(location = 2) out vec4 oF;
float faceValid(ivec2 c, ivec2 off) {
  float a = typeAt(c), b = typeAt(c - off);
  if (a == SOLID || b == SOLID) return 0.;
  return a == FLUID || b == FLUID ? 1. : 0.;
}
// Returns (new velocity, weight); grad gets the APIC gradient.
vec2 gather(int k, vec2 p, float pvel, inout vec2 grad) {
  float dx = k == 0 ? 0. : 0.5 * h, dy = k == 0 ? 0.5 * h : 0.;
  ivec2 off = k == 0 ? E1 : E2;
  float x = clamp(p.x, h, float(N.x - 1) * h), y = clamp(p.y, h, float(N.y - 1) * h);
  int x0 = min(int(floor((x - dx) / h)), N.x - 2);
  float tx = (x - dx - float(x0) * h) / h;
  int x1 = min(x0 + 1, N.x - 2);
  int y0 = min(int(floor((y - dy) / h)), N.y - 2);
  float ty = (y - dy - float(y0) * h) / h;
  int y1 = min(y0 + 1, N.y - 2);
  float sx = 1. - tx, sy = 1. - ty;
  ivec2 c0 = ivec2(x0, y0), c1 = ivec2(x1, y0), c2 = ivec2(x1, y1), c3 = ivec2(x0, y1);
  float v0 = faceValid(c0, off), v1 = faceValid(c1, off), v2 = faceValid(c2, off), v3 = faceValid(c3, off);
  float d0 = sx * sy, d1 = tx * sy, d2 = tx * ty, d3 = sx * ty;
  float f0 = texelFetch(velX, c0, 0)[k], f1 = texelFetch(velX, c1, 0)[k];
  float f2 = texelFetch(velX, c2, 0)[k], f3 = texelFetch(velX, c3, 0)[k];
  float w = v0 * d0 + v1 * d1 + v2 * d2 + v3 * d3;
  if (w <= 0.) return vec2(pvel, 0.);
  float pic = (v0 * d0 * f0 + v1 * d1 * f1 + v2 * d2 * f2 + v3 * d3 * f3) / w;
  if (apic > 0.) {
    if (v0 * v1 * v2 * v3 > 0.)
      grad = vec2(sy * (f1 - f0) + ty * (f2 - f3), sx * (f3 - f0) + tx * (f2 - f1)) / h;
    else grad = vec2(0.);
    return vec2(pic, w);
  }
  float g0 = texelFetch(vel0, c0, 0)[k], g1 = texelFetch(vel0, c1, 0)[k];
  float g2 = texelFetch(vel0, c2, 0)[k], g3 = texelFetch(vel0, c3, 0)[k];
  float corr = (v0 * d0 * (f0 - g0) + v1 * d1 * (f1 - g1) + v2 * d2 * (f2 - g2) + v3 * d3 * (f3 - g3)) / w;
  return vec2((1. - flipRatio) * pic + flipRatio * (pvel + corr), w);
}
vec2 rub(vec2 v, float dist, vec2 tg, float wallSpeed) {
  const float nu = 1e-6;
  float y = min(max(dist, 0.1 * h), h);
  float ut = dot(v, tg) - wallSpeed;
  float u = abs(ut);
  if (u < 1e-6) return v;
  float us = sqrt(nu * u / y);
  for (int k = 0; k < 6; k++) {
    float plus = y * us / nu;
    if (plus < 11.) break;
    us = u / (log(plus) / 0.41 + 5.2);
  }
  float slow = min(us * us / h * dt, u);
  return v - sign(ut) * slow * tg;
}
void main() {
  ivec2 t = ivec2(gl_FragCoord.xy);
  vec4 p = texelFetch(P0, t, 0);
  vec4 a = texelFetch(P1, t, 0);
  if (pid() >= np) { oP = p; oA = a; oF = texelFetch(F, t, 0); return; }
  vec2 gu = a.xy, gv = a.zw;
  vec2 ru = gather(0, p.xy, p.z, gu);
  vec2 rv = gather(1, p.xy, p.w, gv);
  vec2 v = vec2(ru.x, rv.x);
  if (friction > 0.) {
    float x = p.x, y = p.y;
    if (x - h < h) v = rub(v, x - h, vec2(0., 1.), 0.);
    if (float(N.x - 1) * h - x < h) v = rub(v, float(N.x - 1) * h - x, vec2(0., 1.), 0.);
    if (y - h < h) v = rub(v, y - h, vec2(1., 0.), 0.);
    if (obs.w > 0.) {
      vec2 d = p.xy - obs.xy;
      float dl = length(d);
      if (dl > 0. && dl - obs.z < h) {
        vec2 tg = vec2(-d.y, d.x) / dl;
        v = rub(v, dl - obs.z, tg, dot(obsV, tg));
      }
    }
  }
  oP = vec4(p.xy, v);
  oA = vec4(gu, gv);
  oF = vec4(ru.y > 0. && rv.y > 0. ? 1. : 0.);
}`,
    },

    // Drift correction: move particles by the drift solve's face field.
    drift: {
      fs: `${COMMON}${CELL}${PARTICLE}${COLLIDE}
uniform sampler2D P0, qT;
uniform float dt;
out vec4 o;
float Q(ivec2 c) { return inGrid(c) ? texelFetch(qT, c, 0).r : 0.; }
float faceVal(ivec2 c, ivec2 off) {
  return sAt(c) > 0. && sAt(c - off) > 0. ? Q(c - off) - Q(c) : 0.;
}
float sampleFace(int k, vec2 p) {
  float dx = k == 0 ? 0. : 0.5 * h, dy = k == 0 ? 0.5 * h : 0.;
  ivec2 off = k == 0 ? E1 : E2;
  float x = clamp(p.x, h, float(N.x - 1) * h), y = clamp(p.y, h, float(N.y - 1) * h);
  int x0 = min(int(floor((x - dx) / h)), N.x - 2);
  float tx = (x - dx - float(x0) * h) / h;
  int x1 = min(x0 + 1, N.x - 2);
  int y0 = min(int(floor((y - dy) / h)), N.y - 2);
  float ty = (y - dy - float(y0) * h) / h;
  int y1 = min(y0 + 1, N.y - 2);
  ivec2 c[4] = ivec2[4](ivec2(x0, y0), ivec2(x1, y0), ivec2(x1, y1), ivec2(x0, y1));
  float w[4] = float[4]((1. - tx) * (1. - ty), tx * (1. - ty), tx * ty, (1. - tx) * ty);
  float sum = 0., ws = 0.;
  for (int i = 0; i < 4; i++) {
    float k2 = typeAt(c[i]) != AIR || typeAt(c[i] - off) != AIR ? w[i] : 0.;
    sum += k2 * faceVal(c[i], off);
    ws += k2;
  }
  return ws > 0. ? sum / ws : 0.;
}
void main() {
  vec4 p = texelFetch(P0, ivec2(gl_FragCoord.xy), 0);
  if (pid() >= np) { o = p; return; }
  vec2 x = p.xy + dt * vec2(sampleFace(0, p.xy), sampleFace(1, p.xy));
  vec2 v = p.zw;
  collide(x, v);
  o = vec4(x, v);
}`,
    },

    // Max over 4x4 blocks: of speed squared from P0 (first), then of .r.
    reduce: {
      fs: `${COMMON}
uniform sampler2D X;
uniform ivec2 size;
uniform float first;
out vec4 o;
void main() {
  ivec2 b = ivec2(gl_FragCoord.xy) * 4;
  float m = 0.;
  for (int i = 0; i < 4; i++)
    for (int j = 0; j < 4; j++) {
      ivec2 c = b + ivec2(i, j);
      if (c.x >= size.x || c.y >= size.y) continue;
      vec4 t = texelFetch(X, c, 0);
      m = max(m, first > 0. ? dot(t.zw, t.zw) : t.r);
    }
  o = vec4(m);
}`,
    },
  };

  // ------------------------------------------------------------ context
  let shared = null;

  function context() {
    if (shared) return shared;
    if (typeof OffscreenCanvas === "undefined") return null;
    const gl = new OffscreenCanvas(1, 1).getContext("webgl2", {
      antialias: false,
      depth: false,
      stencil: false,
    });
    if (!gl) return null;
    for (const e of ["EXT_color_buffer_float", "EXT_float_blend"])
      if (!gl.getExtension(e)) return null;
    gl.bindVertexArray(gl.createVertexArray());
    shared = { gl, programs: {}, fbos: new Map(), nextId: 1 };
    return shared;
  }

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      throw new Error(gl.getShaderInfoLog(s) + "\n" + src);
    return s;
  }

  function program(ctx, name) {
    if (ctx.programs[name]) return ctx.programs[name];
    const { gl } = ctx;
    const def = PROGRAMS[name];
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, def.vs || FULL_VS));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, def.fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
      throw new Error(name + ": " + gl.getProgramInfoLog(p));
    const uniforms = {};
    const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(p, i);
      uniforms[info.name] = {
        loc: gl.getUniformLocation(p, info.name),
        type: info.type,
      };
    }
    return (ctx.programs[name] = { p, uniforms });
  }

  class GpuFlip {
    static available() {
      try {
        return !!context();
      } catch (e) {
        return false;
      }
    }

    constructor({ width, height, h, maxParticles, density = 1000 }) {
      const ctx = context();
      if (!ctx) throw new Error("WebGL2 with float render targets is needed");
      this.ctx = ctx;
      this.gl = ctx.gl;
      this.gpu = true;
      this.h = h;
      this.invH = 1 / h;
      this.fNumX = Math.round(width / h);
      this.fNumY = Math.round(height / h);
      this.width = this.fNumX * h;
      this.height = this.fNumY * h;
      this.density = density;
      this.fNumCells = this.fNumX * this.fNumY;
      this.r = 0.3 * h;
      this.seedDx = 2 * this.r;
      this.seedDy = Math.sqrt(3) * this.r;
      this.restDensity = (h * h) / (this.seedDx * this.seedDy);
      this.maxParticles = maxParticles;
      this.numParticles = 0;
      this.obstacle = { active: false, x: 0, y: 0, r: 0, vx: 0, vy: 0 };
      this.time = 0;
      this.speedReads = []; // readbacks of the fastest particle in flight
      this.speedKnown = { v: 0, time: 0 };
      this.gMag = 9.81;
      this.stepCount = 0;
      this.hasField = false;
      this.dtPrev = { main: 0, drift: 0 };
      this.pending = []; // particles added since the last upload
      this.pendingStart = 0;
      this.mirror = {}; // read-back arrays and the step they belong to
      this.version = 0;

      const gl = this.gl;
      const nx = this.fNumX;
      const ny = this.fNumY;
      this.PH = Math.max(1, Math.ceil(maxParticles / PW));
      const tex = (w, hgt, fmt) => {
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texStorage2D(gl.TEXTURE_2D, 1, fmt, w, hgt);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        t._id = ctx.nextId++;
        t._w = w;
        t._h = hgt;
        this.textures.push(t);
        return t;
      };
      const pair = (w, hgt, fmt) => {
        const p = { a: tex(w, hgt, fmt), b: tex(w, hgt, fmt) };
        p.swap = () => ([p.a, p.b] = [p.b, p.a]);
        return p;
      };
      this.textures = [];
      const { RGBA32F, RG32F, R32F } = gl;
      this.P0 = pair(PW, this.PH, RGBA32F);
      this.P1 = pair(PW, this.PH, RGBA32F);
      this.F = pair(PW, this.PH, R32F);
      this.accU = tex(nx, ny, RG32F);
      this.accV = tex(nx, ny, RG32F);
      this.accC = tex(nx, ny, RG32F);
      this.vel0 = tex(nx, ny, RGBA32F);
      this.cell = tex(nx, ny, RGBA32F);
      this.rhs = tex(nx, ny, RG32F);
      this.q = pair(nx, ny, R32F);
      this.qd = pair(nx, ny, R32F);
      this.velX = pair(nx, ny, RGBA32F);
      this.resT = tex(nx, ny, RG32F);
      this.cb = 0.4 * h;
      this.NB = [
        Math.ceil(this.width / this.cb),
        Math.ceil(this.height / this.cb),
      ];
      this.binT = tex(this.NB[0], this.NB[1], RGBA32F);
      // Multigrid levels: level 0 is the grid itself.
      this.levels = [{ N: [nx, ny], type: this.cell, rhs: this.rhs }];
      for (let w = nx, hh = ny; Math.max(w, hh) > 8; ) {
        w = Math.ceil(w / 2);
        hh = Math.ceil(hh / 2);
        this.levels.push({
          N: [w, hh],
          type: tex(w, hh, R32F),
          rhs: tex(w, hh, R32F),
          q: pair(w, hh, R32F),
        });
      }
      this.cg = {
        r: pair(nx, ny, R32F),
        z: pair(nx, ny, R32F),
        d: pair(nx, ny, R32F),
        adT: tex(nx, ny, RG32F),
        sig: pair(1, 1, R32F),
        dAd: tex(1, 1, R32F),
      };
      this.gridChain = [];
      for (let w = nx, hh = ny; w > 1 || hh > 1; ) {
        w = Math.ceil(w / 8);
        hh = Math.ceil(hh / 8);
        this.gridChain.push(tex(w, hh, R32F));
      }
      this.chain = [];
      let w = PW;
      let hh = this.PH;
      do {
        w = Math.ceil(w / 4);
        hh = Math.ceil(hh / 4);
        this.chain.push(tex(w, hh, R32F));
      } while (w > 1 || hh > 1);
    }

    dispose() {
      const gl = this.gl;
      for (const r of this.speedReads) {
        gl.deleteSync(r.sync);
        gl.deleteBuffer(r.buf);
      }
      for (const b of this.freeBuffers || []) gl.deleteBuffer(b);
      this.speedReads = [];
      for (const t of this.textures) {
        for (const [key, fbo] of this.ctx.fbos)
          if (key.split(",").includes(String(t._id))) {
            gl.deleteFramebuffer(fbo);
            this.ctx.fbos.delete(key);
          }
        gl.deleteTexture(t);
      }
      this.textures = [];
    }

    // ---------------------------------------------------------- plumbing
    fbo(targets) {
      const key = targets.map((t) => t._id).join(",");
      let f = this.ctx.fbos.get(key);
      if (!f) {
        const gl = this.gl;
        f = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, f);
        targets.forEach((t, i) =>
          gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0 + i,
            gl.TEXTURE_2D,
            t,
            0
          )
        );
        gl.drawBuffers(targets.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
        this.ctx.fbos.set(key, f);
      }
      return f;
    }

    run(name, uniforms, targets, opts = {}) {
      const gl = this.gl;
      const prog = program(this.ctx, name);
      gl.useProgram(prog.p);
      const o = this.obstacle;
      const all = {
        N: [this.fNumX, this.fNumY],
        h: this.h,
        r: this.r,
        obs: [o.x, o.y, o.r, o.active ? 1 : 0],
        obsV: [o.vx, o.vy],
        np: this.numParticles,
        ...uniforms,
      };
      let unit = 0;
      for (const [name2, u] of Object.entries(prog.uniforms)) {
        const val = all[name2];
        if (val === undefined) throw new Error(`${name}: no ${name2}`);
        switch (u.type) {
          case gl.SAMPLER_2D:
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, val);
            gl.uniform1i(u.loc, unit++);
            break;
          case gl.FLOAT:
            gl.uniform1f(u.loc, val);
            break;
          case gl.INT:
            gl.uniform1i(u.loc, val);
            break;
          case gl.FLOAT_VEC2:
            gl.uniform2fv(u.loc, val);
            break;
          case gl.FLOAT_VEC4:
            gl.uniform4fv(u.loc, val);
            break;
          case gl.INT_VEC2:
            gl.uniform2iv(u.loc, val);
            break;
          default:
            throw new Error("uniform type " + u.type);
        }
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo(targets));
      const t = targets[0];
      gl.viewport(0, 0, t._w, opts.rows ?? t._h);
      if (opts.points != null) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (opts.blend !== false) {
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.ONE, gl.ONE);
        }
        if (opts.points > 0) gl.drawArrays(gl.POINTS, 0, opts.points);
        gl.disable(gl.BLEND);
      } else gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    block() {
      return Math.ceil(this.numParticles / SPREAD);
    }

    rows() {
      return Math.max(1, Math.ceil(this.numParticles / PW));
    }

    read(t, rows) {
      const gl = this.gl;
      const out = new Float32Array(t._w * rows * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo([t]));
      gl.readBuffer(gl.COLOR_ATTACHMENT0);
      gl.readPixels(0, 0, t._w, rows, gl.RGBA, gl.FLOAT, out);
      return out;
    }

    // ---------------------------------------------------------- particles
    addParticle(x, y, vx = 0, vy = 0) {
      if (this.numParticles >= this.maxParticles) return false;
      if (!this.pending.length) this.pendingStart = this.numParticles;
      this.pending.push(x, y, vx, vy);
      this.numParticles++;
      this.version++;
      return true;
    }

    flush() {
      if (!this.pending.length) return;
      const gl = this.gl;
      const data = new Float32Array(this.pending);
      let i = this.pendingStart;
      const end = i + data.length / 4;
      gl.bindTexture(gl.TEXTURE_2D, this.P0.a);
      while (i < end) {
        const row = Math.floor(i / PW);
        const x0 = i - row * PW;
        const n = Math.min(PW - x0, end - i);
        const from = (i - this.pendingStart) * 4;
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          x0,
          row,
          n,
          1,
          gl.RGBA,
          gl.FLOAT,
          data.subarray(from, from + 4 * n)
        );
        i += n;
      }
      this.pending = [];
    }

    // The CPU's arrays, read back once per step at most.
    sync(key) {
      const m = this.mirror;
      if (m[key + "V"] === this.version) return;
      this.flush();
      if (key === "particles") {
        const n = this.numParticles;
        const raw = this.read(this.P0.a, this.rows());
        const pos =
          m.pos && m.pos.length >= 2 * n
            ? m.pos
            : new Float32Array(2 * this.maxParticles);
        const vel =
          m.vel && m.vel.length >= 2 * n
            ? m.vel
            : new Float32Array(2 * this.maxParticles);
        for (let i = 0; i < n; i++) {
          pos[2 * i] = raw[4 * i];
          pos[2 * i + 1] = raw[4 * i + 1];
          vel[2 * i] = raw[4 * i + 2];
          vel[2 * i + 1] = raw[4 * i + 3];
        }
        m.pos = pos;
        m.vel = vel;
      } else if (key === "grid") {
        const nx = this.fNumX;
        const ny = this.fNumY;
        const cell = this.read(this.cell, ny);
        const q = this.read(this.q.a, ny);
        const N = this.fNumCells;
        m.cellType = m.cellType || new Int32Array(N);
        m.p = m.p || new Float32Array(N);
        const cp = (this.density * this.h) / (this.dtPrev.main || 1 / 60);
        for (let i = 0; i < nx; i++)
          for (let j = 0; j < ny; j++) {
            const t = (j * nx + i) * 4;
            m.cellType[i * ny + j] = cell[t];
            m.p[i * ny + j] = cp * q[t];
          }
      } else if (key === "density") {
        // From the particles as they are now, as updateParticleDensity.
        this.scatter();
        const nx = this.fNumX;
        const ny = this.fNumY;
        const d = this.read(this.accC, ny);
        m.density = m.density || new Float32Array(this.fNumCells);
        for (let i = 0; i < nx; i++)
          for (let j = 0; j < ny; j++)
            m.density[i * ny + j] = d[(j * nx + i) * 4];
      }
      m[key + "V"] = this.version;
    }

    get pos() {
      this.sync("particles");
      return this.mirror.pos;
    }
    get vel() {
      this.sync("particles");
      return this.mirror.vel;
    }
    get particleDensity() {
      this.sync("density");
      return this.mirror.density;
    }
    get cellType() {
      this.sync("grid");
      return this.mirror.cellType;
    }
    get p() {
      this.sync("grid");
      return this.mirror.p;
    }

    updateParticleDensity() {
      this.sync("density");
    }

    /** Seed the hexagonal lattice over a region, as FlipFluid.fill. */
    fill(x0, y0, x1, y1, inside = () => true) {
      const { seedDx, seedDy, r } = this;
      let row = 0;
      for (let y = y0 + r; y <= y1 - r + 1e-9; y += seedDy, row++)
        for (let x = x0 + r + (row % 2) * r; x <= x1 - r + 1e-9; x += seedDx)
          if (inside(x, y)) this.addParticle(x, y);
    }

    // ---------------------------------------------------------- the step
    scatter(apic = 0) {
      this.run(
        "p2g",
        { P0: this.P0.a, P1: this.P1.a, apic, block: this.block() },
        [this.accU, this.accV, this.accC],
        { points: this.block() * SPREAD }
      );
    }

    /** Red-black sweeps on one multigrid level; `scale` multiplies q first. */
    smooth(lv, pair, chan, iters, scale = 1, order = 0, omega = 1) {
      for (let k = 0; k < iters; k++)
        for (let half = 0; half < 2; half++) {
          const parity = half ^ order;
          this.run(
            "sor",
            {
              N: lv.N,
              qT: pair.a,
              cellT: lv.type,
              rhsT: lv.rhs,
              parity,
              chan,
              omega,
              qScale: k === 0 && half === 0 ? scale : 1,
            },
            [pair.b]
          );
          pair.swap();
        }
    }

    /**
     * z = M r: one multigrid V-cycle from zero, the preconditioner. Red-black
     * sweeps down, black-red up, so M is symmetric as conjugate gradient
     * needs. A coarse cell is liquid if any of its four is.
     */
    vcycle(z, rTex, smoothing) {
      const L = this.levels;
      const lv0 = { ...L[0], rhs: rTex };
      const lvs = [lv0, ...L.slice(1)];
      // Each level starts from zero: its first half-sweep reads q times 0,
      // which saves a clear a level.
      const qs = [z];
      for (let l = 0; l < lvs.length - 1; l++) {
        const lv = lvs[l];
        this.smooth(lv, qs[l], 0, smoothing, 0, 0);
        const next = lvs[l + 1];
        this.run(
          "restrict",
          {
            N: next.N,
            NF: lv.N,
            fineT: lv.type,
            qF: qs[l].a,
            rhsF: lv.rhs,
            coarseT: next.type,
            chan: 0,
          },
          [next.rhs]
        );
        qs.push(next.q);
      }
      // The coarsest grid is at most 8 cells across.
      const last = lvs.length - 1;
      this.smooth(lvs[last], qs[last], 0, 2, 0, 0);
      this.smooth(lvs[last], qs[last], 0, 2, 1, 1);
      for (let l = last - 1; l >= 0; l--) {
        const lv = lvs[l];
        // Black-red on the way up: prolong with the black half, then red.
        this.run(
          "prolongSor",
          {
            N: lv.N,
            qT: qs[l].a,
            qC: qs[l + 1].a,
            cellT: lv.type,
            rhsT: lv.rhs,
            parity: 1,
          },
          [qs[l].b]
        );
        qs[l].swap();
        this.run(
          "sor",
          {
            N: lv.N,
            qT: qs[l].a,
            cellT: lv.type,
            rhsT: lv.rhs,
            parity: 0,
            chan: 0,
            omega: 1,
            qScale: 1,
          },
          [qs[l].b]
        );
        qs[l].swap();
        this.smooth(lv, qs[l], 0, smoothing - 1, 1, 1);
      }
    }

    /** Sum a grid field into a 1x1 texture (mode as the `sum` shader). */
    sum(X, Y, mode, target) {
      let size = [this.fNumX, this.fNumY];
      let src = X;
      this.gridChain.forEach((t, k) => {
        const out = k === this.gridChain.length - 1 ? target : t;
        this.run(
          "sum",
          { X: src, Y: k === 0 ? Y : src, size, mode: k === 0 ? mode : 2 },
          [out]
        );
        src = out;
        size = [t._w, t._h];
      });
    }

    /**
     * Solve A q = b (b in channel `chan` of rhs) from the last step's q
     * times `scale`, by `iters` iterations of conjugate gradient
     * preconditioned with a multigrid V-cycle (McAdams, Sifakis & Teran
     * 2010). Red-black sweeps alone moved pressure a cell a sweep: 50 of
     * them let the 5 mm paddle's water lose 16% of its volume in half a
     * second. V-cycles alone cut the residual only 25% a cycle, since the
     * coarse grids see the free surface coarsely.
     */
    solve(q, chan, iters, scale, smoothing = 1) {
      const { r, z, d, adT, sig, dAd } = this.cg;
      this.run(
        "pcgInit",
        { qT: q.a, rhsT: this.rhs, cellT: this.cell, chan, qScale: scale },
        [q.b, r.b]
      );
      q.swap();
      r.swap();
      this.vcycle(z, r.a, smoothing);
      this.sum(z.a, r.a, 0, sig.a);
      this.run(
        "pcgDir",
        { zT: z.a, dT: d.a, newT: sig.a, oldT: sig.a, first: 1 },
        [d.b]
      );
      d.swap();
      for (let k = 0; k < iters; k++) {
        this.run("matvec", { dT: d.a, cellT: this.cell }, [adT]);
        this.sum(adT, adT, 1, dAd);
        this.run(
          "pcgUpdate",
          { qT: q.a, rT: r.a, dT: d.a, adT, sigT: sig.a, dAdT: dAd },
          [q.b, r.b]
        );
        q.swap();
        r.swap();
        if (k === iters - 1) break;
        this.vcycle(z, r.a, smoothing);
        this.sum(z.a, r.a, 0, sig.b);
        this.run(
          "pcgDir",
          { zT: z.a, dT: d.a, newT: sig.b, oldT: sig.a, first: 0 },
          [d.b]
        );
        d.swap();
        sig.swap();
      }
    }

    clear(t) {
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo([t]));
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    /** Largest |b - A q| over the largest |b|, for the main or drift solve. */
    residual(drift = false) {
      const pair = drift ? this.qd : this.q;
      this.run(
        "residual",
        { qT: pair.a, rhsT: this.rhs, cellT: this.cell, chan: drift ? 1 : 0 },
        [this.resT]
      );
      const d = this.read(this.resT, this.fNumY);
      let r = 0;
      let b = 0;
      for (let i = 0; i < d.length; i += 4) {
        r = Math.max(r, d[i]);
        b = Math.max(b, d[i + 1]);
      }
      return b > 0 ? r / b : 0;
    }

    step(dt, o) {
      this.flush();
      this.version++;
      const apic = o.transfer === "apic" ? 1 : 0;
      const gridAdvect = o.advect === "grid";
      const cgIters = o.cgIters ?? 6;
      const every = o.driftEvery ?? 4;
      this.stepCount++;
      const drift = o.compensateDrift !== false && this.stepCount % every === 0;
      const driftK = Math.min((o.driftK ?? 0.1) * every, 1);
      const rows = this.rows();
      const np = this.numParticles;

      // Move, add gravity, collide.
      this.run(
        "advect",
        {
          P0: this.P0.a,
          F: this.F.a,
          velX: this.velX.a,
          dt,
          gridAdvect: gridAdvect ? 1 : 0,
          hasField: this.hasField ? 1 : 0,
          g: [o.gx ?? 0, o.gy ?? -9.81],
        },
        [this.P0.b],
        { rows }
      );
      this.P0.swap();
      // The fastest particle, for the next step's length (as the CPU's
      // integrateParticles measures it: after gravity, before the grid).
      this.measureSpeed();
      this.gMag = Math.hypot(o.gx ?? 0, o.gy ?? -9.81);
      this.queueSpeedRead(this.time + dt);
      if (o.separate !== false)
        for (let k = 0; k < (o.particleIters ?? 1); k++) {
          const common = { NB: this.NB, cb: this.cb };
          this.run(
            "bin",
            { P0: this.P0.a, block: this.block(), ...common },
            [this.binT],
            {
              points: this.block() * SPREAD,
              blend: false,
            }
          );
          this.run(
            "separate",
            {
              P0: this.P0.a,
              binT: this.binT,
              minDist: 2 * this.r * (o.separation ?? 1),
              ...common,
            },
            [this.P0.b],
            { rows }
          );
          this.P0.swap();
        }

      // Particles to grid, cell types, right-hand sides.
      this.scatter(apic);
      this.run("prep", { accU: this.accU, accV: this.accV, accC: this.accC }, [
        this.vel0,
        this.cell,
      ]);
      for (let l = 1; l < this.levels.length; l++) {
        const lv = this.levels[l];
        const fine = this.levels[l - 1];
        this.run("coarseType", { N: lv.N, NF: fine.N, fineT: fine.type }, [
          lv.type,
        ]);
      }
      this.run(
        "rhs",
        {
          cellT: this.cell,
          vel0: this.vel0,
          rest: this.restDensity,
          band: (o.driftBand ?? 0) * this.restDensity,
          driftScale: drift ? (driftK * this.h) / (dt * this.restDensity) : 0,
          driftSurface: o.driftSurface === false ? 0 : 1,
        },
        [this.rhs]
      );

      // Pressure, from last step's rescaled to this step's length.
      const warm = o.warmStart !== false;
      const scaleMain =
        warm && this.dtPrev.main > 0 ? dt / this.dtPrev.main : 0;
      this.solve(this.q, 0, cgIters, scaleMain);
      this.dtPrev.main = dt;
      this.lastPcgIters = cgIters;
      this.run("project", { vel0: this.vel0, qT: this.q.a, cellT: this.cell }, [
        this.velX.b,
      ]);
      this.velX.swap();
      if (gridAdvect)
        for (let k = 0; k < 2; k++) {
          this.run("extrapolate", { X: this.velX.a }, [this.velX.b]);
          this.velX.swap();
        }
      this.hasField = true;

      // Grid to particles, wall friction.
      this.run(
        "g2p",
        {
          P0: this.P0.a,
          P1: this.P1.a,
          F: this.F.a,
          velX: this.velX.a,
          vel0: this.vel0,
          cellT: this.cell,
          flipRatio: o.flipRatio ?? 0.9,
          apic,
          friction: o.wallFriction === false ? 0 : 1,
          dt,
        },
        [this.P0.b, this.P1.b, this.F.b],
        { rows }
      );
      this.P0.swap();
      this.P1.swap();
      this.F.swap();

      // Drift correction, by position only.
      if (drift) {
        const scaleDrift =
          warm && this.dtPrev.drift > 0 ? this.dtPrev.drift / dt : 0;
        this.solve(this.qd, 1, o.driftCgIters ?? 2, scaleDrift);
        this.dtPrev.drift = dt;
        this.run(
          "drift",
          { P0: this.P0.a, qT: this.qd.a, cellT: this.cell, dt },
          [this.P0.b],
          { rows }
        );
        this.P0.swap();
      }
      this.time += dt;
    }

    /**
     * The fastest particle, for the next step's length. Reading it at once
     * made the CPU wait for the GPU every step, so neither ran while the
     * other did: 6.8 ms a 5 mm paddle step against 4.6 without the wait.
     * It is read into a buffer instead and collected a step or two later,
     * plus what gravity can have added since, which the CFL rule needs.
     */
    queueSpeedRead(time) {
      const gl = this.gl;
      const buf =
        (this.freeBuffers || (this.freeBuffers = [])).pop() ||
        gl.createBuffer();
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buf);
      gl.bufferData(gl.PIXEL_PACK_BUFFER, 16, gl.STREAM_READ);
      gl.bindFramebuffer(
        gl.FRAMEBUFFER,
        this.fbo([this.chain[this.chain.length - 1]])
      );
      gl.readBuffer(gl.COLOR_ATTACHMENT0);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, 0);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      this.speedReads.push({ buf, sync, time });
    }

    collectSpeed(force) {
      const gl = this.gl;
      const px = new Float32Array(4);
      while (this.speedReads.length) {
        const r = this.speedReads[0];
        const state = gl.clientWaitSync(r.sync, 0, 0);
        const ready =
          state === gl.ALREADY_SIGNALED || state === gl.CONDITION_SATISFIED;
        if (!ready && !(force || this.speedReads.length > 3)) break;
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, r.buf);
        gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, px);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        gl.deleteSync(r.sync);
        this.freeBuffers.push(r.buf);
        this.speedReads.shift();
        this.speedKnown = { v: Math.sqrt(px[0]), time: r.time };
      }
    }

    /** Wait for every queued pass: read one texel of the particles. */
    finish() {
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo([this.P0.a]));
      gl.readBuffer(gl.COLOR_ATTACHMENT0);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, new Float32Array(4));
    }

    get maxSpeed() {
      if (this.numParticles === 0) return 0;
      this.collectSpeed(false);
      const k = this.speedKnown;
      return k.v + this.gMag * Math.max(this.time - k.time, 0);
    }

    measureSpeed() {
      let src = this.P0.a;
      let size = [PW, this.rows()];
      this.chain.forEach((t, k) => {
        this.run("reduce", { X: src, size, first: k === 0 ? 1 : 0 }, [t]);
        src = t;
        size = [t._w, t._h];
      });
    }
  }

  const F =
    root.FlipFluid ||
    (typeof require !== "undefined" ? require("./flip.js").FlipFluid : null);
  for (const m of ["nextDt", "advance", "volume", "front", "surfaceAt"])
    GpuFlip.prototype[m] = F.prototype[m];
  GpuFlip.FLUID = FLUID;
  GpuFlip.AIR = AIR;
  GpuFlip.SOLID = SOLID;

  if (typeof module !== "undefined" && module.exports)
    module.exports = { GpuFlip };
  else root.GpuFlip = GpuFlip;
})(typeof globalThis !== "undefined" ? globalThis : this);
