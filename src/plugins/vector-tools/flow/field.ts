/**
 * What every part of the overlay needs to know about a field.
 *
 * Split out from `FlowRenderer` because the range probe reads a field too, and
 * the renderer reads the probe — a cycle if either owned these.
 */
import { GLSL_PRELUDE } from "./latexToGLSL";

export interface FlowBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/**
 * The field to advect by, as compiled GLSL.
 *
 * A gradient field arrives as its scalar function rather than as two
 * components, because the GPU cannot differentiate symbolically the way the
 * generated Desmos expressions do — it has to sample instead.
 */
export type FlowField =
  | { kind: "components"; p: string; q: string }
  | { kind: "gradient"; f: string };

export class FlowRendererError extends Error {}

/**
 * Both shaders that evaluate the field include this, and both declare `u_min`
 * and `u_max` before it — which is what lets the gradient step size follow the
 * viewport without an extra uniform.
 */
export function fieldFunctions(field: FlowField) {
  const body =
    field.kind === "gradient"
      ? `
float vtScalar(vec2 p) { return ${field.f}; }
vec2 vtField(vec2 p) {
  // The generated Desmos arrows differentiate symbolically; the GPU cannot, so
  // it central-differences instead. The step follows the viewport so the
  // gradient stays smooth at any zoom, and it is exact for the quadratics that
  // most potentials are built from.
  float h = 1.0e-3 * max(u_max.x - u_min.x, u_max.y - u_min.y);
  float u = (vtScalar(p + vec2(h, 0.0)) - vtScalar(p - vec2(h, 0.0))) / (2.0 * h);
  float v = (vtScalar(p + vec2(0.0, h)) - vtScalar(p - vec2(0.0, h))) / (2.0 * h);`
      : `
vec2 vtField(vec2 p) {
  float u = ${field.p};
  float v = ${field.q};`;
  return `
${GLSL_PRELUDE}
${body}
  if (isnan(u) || isinf(u)) u = 0.0;
  if (isnan(v) || isinf(v)) v = 0.0;
  return vec2(u, v);
}
`;
}
