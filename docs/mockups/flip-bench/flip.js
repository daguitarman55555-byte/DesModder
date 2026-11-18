/*
 * FLIP liquid in 2D, for the liquid bench (README.md beside this file).
 *
 * The method and its structure follow Matthias Müller's Ten Minute Physics
 * "18-flip.html" (Copyright 2022 Matthias Müller, MIT License; the notice is
 * in LICENSE-MULLER.txt). Changes from his version, each for a reason the
 * bench measures:
 *
 * - The rest density is the seeding density, not the mean of the first step,
 *   which counts the thin surface cells and so lets the interior compress.
 * - The obstacle pushes particles out to its rim and removes only the
 *   velocity into it, so a fast obstacle cannot leave particles inside.
 * - Steps are sized by a CFL number, so the caller can trade speed for
 *   accuracy and the bench can say what each choice costs.
 * - It reports volume, the dam-break front and the surface height.
 *
 * Units are SI: metres, seconds, m/s. y points up. Cell (i, j) covers
 * [i h, (i+1) h] x [j h, (j+1) h]; u sits on its left face, v on its bottom
 * face. Columns 0 and fNumX-1 and row 0 are walls; the top is open.
 *
 * Loads as a browser script (window.FlipFluid) or with require().
 */
(function (root) {
  "use strict";

  const FLUID = 0;
  const AIR = 1;
  const SOLID = 2;

  class FlipFluid {
    constructor({ width, height, h, maxParticles, density = 1000 }) {
      this.h = h;
      this.invH = 1 / h;
      this.fNumX = Math.round(width / h);
      this.fNumY = Math.round(height / h);
      this.width = this.fNumX * h;
      this.height = this.fNumY * h;
      this.density = density;
      const cells = this.fNumX * this.fNumY;
      this.fNumCells = cells;
      this.u = new Float32Array(cells);
      this.v = new Float32Array(cells);
      this.du = new Float32Array(cells);
      this.dv = new Float32Array(cells);
      this.prevU = new Float32Array(cells);
      this.prevV = new Float32Array(cells);
      this.p = new Float32Array(cells);
      this.s = new Float32Array(cells);
      this.wallS = new Float32Array(cells);
      this.cellType = new Int32Array(cells);
      this.particleDensity = new Float32Array(cells);

      // Hexagonal seeding two radii apart: this many particles per cell.
      this.r = 0.3 * h;
      this.seedDx = 2 * this.r;
      this.seedDy = Math.sqrt(3) * this.r;
      this.restDensity = (h * h) / (this.seedDx * this.seedDy);

      this.maxParticles = maxParticles;
      this.pos = new Float32Array(2 * maxParticles);
      this.vel = new Float32Array(2 * maxParticles);
      // APIC's affine velocity per particle: du/dx, du/dy, dv/dx, dv/dy.
      this.aff = new Float32Array(4 * maxParticles);
      this.numParticles = 0;

      this.pInvSpacing = 1 / (2.2 * this.r);
      this.pNumX = Math.floor(this.width * this.pInvSpacing) + 1;
      this.pNumY = Math.floor(this.height * this.pInvSpacing) + 1;
      this.pNumCells = this.pNumX * this.pNumY;
      this.numCellParticles = new Int32Array(this.pNumCells);
      this.firstCellParticle = new Int32Array(this.pNumCells + 1);
      this.cellParticleIds = new Int32Array(maxParticles);

      this.obstacle = { active: false, x: 0, y: 0, r: 0, vx: 0, vy: 0 };
      this.time = 0;
      this.maxSpeed = 0;

      const n = this.fNumY;
      for (let i = 0; i < this.fNumX; i++)
        for (let j = 0; j < this.fNumY; j++)
          this.wallS[i * n + j] =
            i === 0 || i === this.fNumX - 1 || j === 0 ? 0 : 1;
      this.s.set(this.wallS);
    }

    addParticle(x, y, vx = 0, vy = 0) {
      if (this.numParticles >= this.maxParticles) return false;
      const i = this.numParticles++;
      this.pos[2 * i] = x;
      this.pos[2 * i + 1] = y;
      this.vel[2 * i] = vx;
      this.vel[2 * i + 1] = vy;
      this.aff.fill(0, 4 * i, 4 * i + 4);
      return true;
    }

    /** Seed the hexagonal lattice over a region; inside(x, y) may cut it. */
    fill(x0, y0, x1, y1, inside = () => true) {
      const { seedDx, seedDy, r } = this;
      let row = 0;
      for (let y = y0 + r; y <= y1 - r + 1e-9; y += seedDy, row++)
        for (let x = x0 + r + (row % 2) * r; x <= x1 - r + 1e-9; x += seedDx)
          if (inside(x, y)) this.addParticle(x, y);
    }

    /** Walls plus the obstacle's cells, with the obstacle's velocity on them. */
    updateSolids() {
      this.s.set(this.wallS);
      const o = this.obstacle;
      if (!o.active) return;
      const { h, fNumX, fNumY } = this;
      const n = fNumY;
      const reach = o.r + h;
      const i0 = Math.max(1, Math.floor((o.x - reach) / h));
      const i1 = Math.min(fNumX - 2, Math.ceil((o.x + reach) / h));
      const j0 = Math.max(1, Math.floor((o.y - reach) / h));
      const j1 = Math.min(fNumY - 2, Math.ceil((o.y + reach) / h));
      for (let i = i0; i <= i1; i++)
        for (let j = j0; j <= j1; j++) {
          const dx = (i + 0.5) * h - o.x;
          const dy = (j + 0.5) * h - o.y;
          if (dx * dx + dy * dy < o.r * o.r) {
            const c = i * n + j;
            this.s[c] = 0;
            this.u[c] = o.vx;
            this.u[c + n] = o.vx;
            this.v[c] = o.vy;
            this.v[c + 1] = o.vy;
          }
        }
    }

    /** Gravity on every particle; with `move`, also move it by its own velocity. */
    integrateParticles(dt, gx, gy, move = true) {
      const { pos, vel } = this;
      let max2 = 0;
      for (let i = 0; i < this.numParticles; i++) {
        vel[2 * i] += dt * gx;
        vel[2 * i + 1] += dt * gy;
        if (move) {
          pos[2 * i] += vel[2 * i] * dt;
          pos[2 * i + 1] += vel[2 * i + 1] * dt;
        }
        const s2 = vel[2 * i] ** 2 + vel[2 * i + 1] ** 2;
        if (s2 > max2) max2 = s2;
      }
      this.maxSpeed = Math.sqrt(max2);
    }

    pushParticlesApart(numIters, scale = 1) {
      const { pos, pInvSpacing, pNumX, pNumY, numCellParticles } = this;
      const { firstCellParticle, cellParticleIds } = this;
      const np = this.numParticles;
      numCellParticles.fill(0);
      for (let i = 0; i < np; i++) {
        const xi = clamp(Math.floor(pos[2 * i] * pInvSpacing), 0, pNumX - 1);
        const yi = clamp(
          Math.floor(pos[2 * i + 1] * pInvSpacing),
          0,
          pNumY - 1
        );
        numCellParticles[xi * pNumY + yi]++;
      }
      let first = 0;
      for (let c = 0; c < this.pNumCells; c++) {
        first += numCellParticles[c];
        firstCellParticle[c] = first;
      }
      firstCellParticle[this.pNumCells] = first;
      for (let i = 0; i < np; i++) {
        const xi = clamp(Math.floor(pos[2 * i] * pInvSpacing), 0, pNumX - 1);
        const yi = clamp(
          Math.floor(pos[2 * i + 1] * pInvSpacing),
          0,
          pNumY - 1
        );
        const c = xi * pNumY + yi;
        firstCellParticle[c]--;
        cellParticleIds[firstCellParticle[c]] = i;
      }

      const minDist = 2 * this.r * scale;
      const minDist2 = minDist * minDist;
      for (let iter = 0; iter < numIters; iter++) {
        for (let i = 0; i < np; i++) {
          const px = pos[2 * i];
          const py = pos[2 * i + 1];
          const pxi = Math.floor(px * pInvSpacing);
          const pyi = Math.floor(py * pInvSpacing);
          const x0 = Math.max(pxi - 1, 0);
          const y0 = Math.max(pyi - 1, 0);
          const x1 = Math.min(pxi + 1, pNumX - 1);
          const y1 = Math.min(pyi + 1, pNumY - 1);
          for (let xi = x0; xi <= x1; xi++)
            for (let yi = y0; yi <= y1; yi++) {
              const c = xi * pNumY + yi;
              const end = firstCellParticle[c + 1];
              for (let k = firstCellParticle[c]; k < end; k++) {
                const id = cellParticleIds[k];
                if (id === i) continue;
                let dx = pos[2 * id] - pos[2 * i];
                let dy = pos[2 * id + 1] - pos[2 * i + 1];
                const d2 = dx * dx + dy * dy;
                if (d2 > minDist2 || d2 === 0) continue;
                const d = Math.sqrt(d2);
                const s = (0.5 * (minDist - d)) / d;
                dx *= s;
                dy *= s;
                pos[2 * i] -= dx;
                pos[2 * i + 1] -= dy;
                pos[2 * id] += dx;
                pos[2 * id + 1] += dy;
              }
            }
        }
      }
    }

    /**
     * Wall friction by the log law, as the LBM's slip wall (Malaspinas &
     * Sagaut): for a particle a distance y from a wall, sliding along it at
     * u, the friction velocity u* solves u / u* = ln(y u* / nu) / kappa + B,
     * and the wall's stress rho u*^2 slows the cell-thick layer beside it by
     * u*^2 / h a second. Without it a dam-break jet climbed the far wall to
     * 2.96 times the column, against 2.1-2.3 measured (energy.cjs).
     */
    applyWallFriction(dt, nu = 1e-6) {
      const { pos, vel, h, fNumX } = this;
      const left = h;
      const right = (fNumX - 1) * h;
      const floor = h;
      const o = this.obstacle;
      for (let i = 0; i < this.numParticles; i++) {
        const x = pos[2 * i];
        const y = pos[2 * i + 1];
        // Each wall within a cell: [distance, tangent x, tangent y, wall speed].
        if (x - left < h) this.rub(i, x - left, 0, 1, 0, dt, nu);
        if (right - x < h) this.rub(i, right - x, 0, 1, 0, dt, nu);
        if (y - floor < h) this.rub(i, y - floor, 1, 0, 0, dt, nu);
        if (o.active) {
          const dx = x - o.x;
          const dy = y - o.y;
          const d = Math.hypot(dx, dy);
          if (d > 0 && d - o.r < h) {
            const tx = -dy / d;
            const ty = dx / d;
            this.rub(i, d - o.r, tx, ty, o.vx * tx + o.vy * ty, dt, nu);
          }
        }
      }
    }

    rub(i, dist, tx, ty, wallSpeed, dt, nu) {
      const { vel, h } = this;
      const y = Math.min(Math.max(dist, 0.1 * h), h);
      const ut = vel[2 * i] * tx + vel[2 * i + 1] * ty - wallSpeed;
      const u = Math.abs(ut);
      if (u < 1e-6) return;
      // Fixed point for u*; the laminar sublayer (u* = sqrt(nu u / y)) floors it.
      let us = Math.sqrt((nu * u) / y);
      for (let k = 0; k < 6; k++) {
        const plus = (y * us) / nu;
        if (plus < 11) break;
        us = u / (Math.log(plus) / 0.41 + 5.2);
      }
      const slow = Math.min(((us * us) / h) * dt, u);
      const s = Math.sign(ut) * slow;
      vel[2 * i] -= s * tx;
      vel[2 * i + 1] -= s * ty;
    }

    handleParticleCollisions() {
      const { pos, vel, h, r, fNumX, fNumY } = this;
      const minX = h + r;
      const maxX = (fNumX - 1) * h - r;
      const minY = h + r;
      const maxY = fNumY * h - r;
      const o = this.obstacle;
      const reach = o.r + r;
      for (let i = 0; i < this.numParticles; i++) {
        let x = pos[2 * i];
        let y = pos[2 * i + 1];
        if (o.active) {
          const dx = x - o.x;
          const dy = y - o.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < reach * reach) {
            const d = Math.sqrt(d2) || 1e-9;
            const nx = d2 > 0 ? dx / d : 0;
            const ny = d2 > 0 ? dy / d : 1;
            x = o.x + nx * reach;
            y = o.y + ny * reach;
            const vn = (vel[2 * i] - o.vx) * nx + (vel[2 * i + 1] - o.vy) * ny;
            if (vn < 0) {
              vel[2 * i] -= vn * nx;
              vel[2 * i + 1] -= vn * ny;
            }
          }
        }
        // Walls move the particle back but keep its velocity: the grid's
        // solid faces stop the flow into the wall. Zeroing it here (Müller's
        // choice) disagrees with the FLIP update, which then hands the
        // particle the grid's cancelling of this step's gravity on top of
        // zero, so particles on the floor jumped at g dt, 14 cm/s (rest.cjs).
        if (x < minX) x = minX;
        if (x > maxX) x = maxX;
        if (y < minY) y = minY;
        if (y > maxY) {
          y = maxY;
          if (vel[2 * i + 1] > 0) vel[2 * i + 1] = 0; // the open top has no grid wall
        }
        pos[2 * i] = x;
        pos[2 * i + 1] = y;
      }
    }

    /**
     * Particle-to-grid (toGrid) or back. FLIP blends the grid's velocity
     * (PIC) with the particle's own plus the grid's change; APIC (Jiang et al.
     * 2015, SIGGRAPH) instead carries an affine velocity per particle, so the
     * grid hands back its local gradient as well as its value: little of the
     * damping of PIC and none of the noise of FLIP. For bilinear weights the
     * affine part is the gradient of the interpolated field.
     */
    transferVelocities(toGrid, flipRatio, apic = false) {
      const { fNumX, fNumY, h, invH, pos, vel, cellType, s, aff } = this;
      const n = fNumY;
      const h2 = 0.5 * h;
      const np = this.numParticles;

      if (toGrid) {
        this.prevU.set(this.u);
        this.prevV.set(this.v);
        this.du.fill(0);
        this.dv.fill(0);
        this.u.fill(0);
        this.v.fill(0);
        for (let c = 0; c < this.fNumCells; c++)
          cellType[c] = s[c] === 0 ? SOLID : AIR;
        for (let i = 0; i < np; i++) {
          const xi = clamp(Math.floor(pos[2 * i] * invH), 0, fNumX - 1);
          const yi = clamp(Math.floor(pos[2 * i + 1] * invH), 0, fNumY - 1);
          const c = xi * n + yi;
          if (cellType[c] === AIR) cellType[c] = FLUID;
        }
      }

      for (let component = 0; component < 2; component++) {
        const dx = component === 0 ? 0 : h2;
        const dy = component === 0 ? h2 : 0;
        const f = component === 0 ? this.u : this.v;
        const prevF = component === 0 ? this.prevU : this.prevV;
        const d = component === 0 ? this.du : this.dv;
        const offset = component === 0 ? n : 1;

        for (let i = 0; i < np; i++) {
          const x = clamp(pos[2 * i], h, (fNumX - 1) * h);
          const y = clamp(pos[2 * i + 1], h, (fNumY - 1) * h);
          const x0 = Math.min(Math.floor((x - dx) * invH), fNumX - 2);
          const tx = (x - dx - x0 * h) * invH;
          const x1 = Math.min(x0 + 1, fNumX - 2);
          const y0 = Math.min(Math.floor((y - dy) * invH), fNumY - 2);
          const ty = (y - dy - y0 * h) * invH;
          const y1 = Math.min(y0 + 1, fNumY - 2);
          const sx = 1 - tx;
          const sy = 1 - ty;
          const d0 = sx * sy;
          const d1 = tx * sy;
          const d2 = tx * ty;
          const d3 = sx * ty;
          const nr0 = x0 * n + y0;
          const nr1 = x1 * n + y0;
          const nr2 = x1 * n + y1;
          const nr3 = x0 * n + y1;

          if (toGrid) {
            const pv = vel[2 * i + component];
            if (apic) {
              // Each face gets the particle's velocity at that face.
              const cx = aff[4 * i + 2 * component];
              const cy = aff[4 * i + 2 * component + 1];
              const fx0 = x0 * h + dx - x;
              const fx1 = x1 * h + dx - x;
              const fy0 = y0 * h + dy - y;
              const fy1 = y1 * h + dy - y;
              f[nr0] += (pv + cx * fx0 + cy * fy0) * d0;
              f[nr1] += (pv + cx * fx1 + cy * fy0) * d1;
              f[nr2] += (pv + cx * fx1 + cy * fy1) * d2;
              f[nr3] += (pv + cx * fx0 + cy * fy1) * d3;
            } else {
              f[nr0] += pv * d0;
              f[nr1] += pv * d1;
              f[nr2] += pv * d2;
              f[nr3] += pv * d3;
            }
            d[nr0] += d0;
            d[nr1] += d1;
            d[nr2] += d2;
            d[nr3] += d3;
          } else {
            // A face counts if it borders liquid and no solid. Müller also
            // counts solid faces, whose change over a step is zero; a particle
            // on the floor then never has its gravity cancelled (rest.cjs).
            const valid0 = faceValid(cellType[nr0], cellType[nr0 - offset]);
            const valid1 = faceValid(cellType[nr1], cellType[nr1 - offset]);
            const valid2 = faceValid(cellType[nr2], cellType[nr2 - offset]);
            const valid3 = faceValid(cellType[nr3], cellType[nr3 - offset]);
            const w = valid0 * d0 + valid1 * d1 + valid2 * d2 + valid3 * d3;
            if (w > 0) {
              const pic =
                (valid0 * d0 * f[nr0] +
                  valid1 * d1 * f[nr1] +
                  valid2 * d2 * f[nr2] +
                  valid3 * d3 * f[nr3]) /
                w;
              const corr =
                (valid0 * d0 * (f[nr0] - prevF[nr0]) +
                  valid1 * d1 * (f[nr1] - prevF[nr1]) +
                  valid2 * d2 * (f[nr2] - prevF[nr2]) +
                  valid3 * d3 * (f[nr3] - prevF[nr3])) /
                w;
              if (apic) {
                vel[2 * i + component] = pic;
                // The gradient of the bilinear interpolant, where all four
                // faces count; next to a solid or open air, plain PIC.
                if (valid0 && valid1 && valid2 && valid3) {
                  aff[4 * i + 2 * component] =
                    (sy * (f[nr1] - f[nr0]) + ty * (f[nr2] - f[nr3])) * invH;
                  aff[4 * i + 2 * component + 1] =
                    (sx * (f[nr3] - f[nr0]) + tx * (f[nr2] - f[nr1])) * invH;
                } else {
                  aff[4 * i + 2 * component] = 0;
                  aff[4 * i + 2 * component + 1] = 0;
                }
              } else {
                const flip = vel[2 * i + component] + corr;
                vel[2 * i + component] =
                  (1 - flipRatio) * pic + flipRatio * flip;
              }
            }
          }
        }

        if (toGrid) {
          for (let c = 0; c < this.fNumCells; c++) if (d[c] > 0) f[c] /= d[c];
          for (let i = 0; i < fNumX; i++)
            for (let j = 0; j < fNumY; j++) {
              const c = i * n + j;
              const solid = cellType[c] === SOLID;
              if (solid || (i > 0 && cellType[c - n] === SOLID))
                this.u[c] = this.prevU[c];
              if (solid || (j > 0 && cellType[c - 1] === SOLID))
                this.v[c] = this.prevV[c];
            }
        }
      }
    }

    updateParticleDensity() {
      const { fNumX, fNumY, h, invH, pos } = this;
      const n = fNumY;
      const h2 = 0.5 * h;
      const d = this.particleDensity;
      d.fill(0);
      for (let i = 0; i < this.numParticles; i++) {
        const x = clamp(pos[2 * i], h, (fNumX - 1) * h);
        const y = clamp(pos[2 * i + 1], h, (fNumY - 1) * h);
        const x0 = Math.floor((x - h2) * invH);
        const tx = (x - h2 - x0 * h) * invH;
        const x1 = Math.min(x0 + 1, fNumX - 2);
        const y0 = Math.floor((y - h2) * invH);
        const ty = (y - h2 - y0 * h) * invH;
        const y1 = Math.min(y0 + 1, fNumY - 2);
        const sx = 1 - tx;
        const sy = 1 - ty;
        if (x0 < fNumX && y0 < fNumY) d[x0 * n + y0] += sx * sy;
        if (x1 < fNumX && y0 < fNumY) d[x1 * n + y0] += tx * sy;
        if (x1 < fNumX && y1 < fNumY) d[x1 * n + y1] += tx * ty;
        if (x0 < fNumX && y1 < fNumY) d[x0 * n + y1] += sx * ty;
      }
    }

    /** Gauss-Seidel pressure projection of (u, v): no divergence in liquid cells. */
    solveIncompressibility(numIters, dt, overRelaxation) {
      this.prevU.set(this.u);
      this.prevV.set(this.v);
      this.project(this.u, this.v, this.p, numIters, dt, overRelaxation, 0);
    }

    /**
     * Project (u, v) toward a divergence of driftScale * excess density in
     * each liquid cell (0: none). `this.solver` picks conjugate gradient
     * ("pcg", the default) or Müller's Gauss-Seidel ("gs"), where numIters is
     * the pass count. Gauss-Seidel needs more passes as cells shrink: still
     * water at 5 mm moved at 8.7 cm/s after 50 passes and 1.8 after 200, at
     * 52 ms a step (rest.cjs).
     */
    project(u, v, p, numIters, dt, overRelaxation, driftScale) {
      if (this.solver !== "gs")
        return this.projectPcg(
          u,
          v,
          p,
          dt,
          driftScale,
          this.pcgMaxIters ?? 200,
          this.pcgTol ?? 1e-4,
          driftScale > 0 ? "drift" : "main",
          driftScale === 0 && this.warmStart !== false
        );
      const { fNumX, fNumY, s, cellType } = this;
      const n = fNumY;
      p.fill(0);
      const cp = (this.density * this.h) / dt;
      const rest = this.restDensity;
      const compensateDrift = driftScale > 0;
      for (let iter = 0; iter < numIters; iter++) {
        for (let i = 1; i < fNumX - 1; i++)
          for (let j = 1; j < fNumY - 1; j++) {
            const c = i * n + j;
            if (cellType[c] !== FLUID) continue;
            const left = c - n;
            const right = c + n;
            const bottom = c - 1;
            const top = c + 1;
            const sx0 = s[left];
            const sx1 = s[right];
            const sy0 = s[bottom];
            const sy1 = s[top];
            const ss = sx0 + sx1 + sy0 + sy1;
            if (ss === 0) continue;
            let div = u[right] - u[c] + v[top] - v[c];
            if (compensateDrift) {
              const compression = this.particleDensity[c] - rest;
              if (compression > 0) div -= driftScale * compression;
            }
            const pr = (-div / ss) * overRelaxation;
            p[c] += cp * pr;
            u[c] -= sx0 * pr;
            u[right] += sx1 * pr;
            v[c] -= sy0 * pr;
            v[top] += sy1 * pr;
          }
      }
    }

    /**
     * The same projection by conjugate gradient with the MIC(0)
     * preconditioner (Bridson, Fluid Simulation for Computer Graphics, 2nd
     * ed., ch. 5). The unknown q is pressure in velocity units, p dt/(rho h):
     * a face between cells a and b changes by q_a - q_b, air cells hold 0,
     * and solid faces do not move. Liquid cells solve A q = target - div.
     *
     * The main solve starts from the last step's pressure, rescaled to this
     * step's length (`warm`): pressure changes little between steps, so this
     * saves iterations. Each solve keeps its own workspace.
     */
    projectPcg(
      u,
      v,
      p,
      dt,
      driftScale,
      maxIters,
      relTol,
      key = "main",
      warm = false
    ) {
      const { fNumX, fNumY, s, cellType } = this;
      const n = fNumY;
      const N = this.fNumCells;
      if (!this.pcgWs) this.pcgWs = {};
      if (!this.pcgWs[key] || this.pcgWs[key].q.length !== N) {
        const a = () => new Float64Array(N);
        this.pcgWs[key] = {
          q: a(),
          r: a(),
          z: a(),
          d: a(),
          w: a(),
          precon: a(),
          diag: a(),
          ai: a(),
          aj: a(),
          cells: new Int32Array(N),
          prevQ: a(),
          dtPrev: 0,
        };
      }
      const ws = this.pcgWs[key];
      const { q, r, z, d, w, precon, diag, ai, aj } = ws;
      const list = ws.cells;
      let count = 0;
      const rest = this.restDensity;
      q.fill(0);
      r.fill(0);
      d.fill(0);
      diag.fill(0);
      ai.fill(0);
      aj.fill(0);
      let maxB = 0;
      for (let i = 1; i < fNumX - 1; i++)
        for (let j = 1; j < fNumY - 1; j++) {
          const c = i * n + j;
          if (cellType[c] !== FLUID) continue;
          const ss = s[c - n] + s[c + n] + s[c - 1] + s[c + 1];
          if (ss === 0) continue;
          list[count++] = c;
          diag[c] = ss;
          if (cellType[c + n] === FLUID) ai[c] = -1;
          if (cellType[c + 1] === FLUID) aj[c] = -1;
          let div = u[c + n] - u[c] + v[c + 1] - v[c];
          if (driftScale > 0) {
            // Two cells deep in the water, correct both ways; nearer the
            // surface only push out. Pushing out alone ratchets: sloshing
            // water rose 18 mm in 6 s. Pulling in the cell just under the
            // surface, which reads light because its particles spread into
            // the half-empty cell above, acts like surface tension and damped
            // the sloshing 15 times too fast (slosh.cjs).
            // A dead band: cells within `driftBand` of rest density are
            // noise, and correcting them roughened still water's surface by
            // 2 mm as the displacement escaped through it (volume.cjs).
            const raw = this.particleDensity[c] - rest;
            const band = this.driftBand * rest;
            const excess =
              raw > band ? raw - band : raw < -band ? raw + band : 0;
            const inside = this.deepInside(c);
            if (inside || (excess > 0 && this.driftSurface))
              div -= driftScale * excess;
          }
          r[c] = -div;
          if (Math.abs(r[c]) > maxB) maxB = Math.abs(r[c]);
        }
      if (warm && ws.dtPrev > 0) {
        // Pressure in velocity units, p dt / (rho h), grows with the step;
        // the drift solve's unknown, a displacement over dt, shrinks with it.
        // Rescaling the drift start the main solve's way made 5 mm sloshing
        // blow up (slosh-energy.cjs).
        const scale = key === "drift" ? ws.dtPrev / dt : dt / ws.dtPrev;
        for (let k = 0; k < count; k++) {
          const c = list[k];
          q[c] = ws.prevQ[c] * scale;
        }
        for (let k = 0; k < count; k++) {
          const c = list[k];
          r[c] -=
            diag[c] * q[c] +
            ai[c] * q[c + n] +
            ai[c - n] * q[c - n] +
            aj[c] * q[c + 1] +
            aj[c - 1] * q[c - 1];
        }
      }
      // A cell whose every neighbour is solid has diag 0 above and is left out.
      if (count && maxB > 1e-9) {
        // MIC(0): tau 0.97, safety 0.25, in increasing cell order.
        precon.fill(0);
        for (let k = 0; k < count; k++) {
          const c = list[k];
          const l = c - n;
          const b = c - 1;
          const pl = precon[l];
          const pb = precon[b];
          let e =
            diag[c] -
            (ai[l] * pl) ** 2 -
            (aj[b] * pb) ** 2 -
            0.97 * (ai[l] * aj[l] * pl * pl + aj[b] * ai[b] * pb * pb);
          if (e < 0.25 * diag[c]) e = diag[c];
          precon[c] = 1 / Math.sqrt(e);
        }
        const applyPrecon = () => {
          for (let k = 0; k < count; k++) {
            const c = list[k];
            const l = c - n;
            const b = c - 1;
            w[c] =
              (r[c] - ai[l] * precon[l] * w[l] - aj[b] * precon[b] * w[b]) *
              precon[c];
          }
          for (let k = count - 1; k >= 0; k--) {
            const c = list[k];
            z[c] =
              (w[c] -
                ai[c] * precon[c] * z[c + n] -
                aj[c] * precon[c] * z[c + 1]) *
              precon[c];
          }
        };
        w.fill(0);
        z.fill(0);
        applyPrecon();
        for (let k = 0; k < count; k++) {
          const c = list[k];
          d[c] = z[c];
        }
        let sigma = 0;
        for (let k = 0; k < count; k++) {
          const c = list[k];
          sigma += z[c] * r[c];
        }
        const tol = relTol * maxB;
        let iters = 0;
        for (; iters < maxIters; iters++) {
          let dz = 0;
          for (let k = 0; k < count; k++) {
            const c = list[k];
            const az =
              diag[c] * d[c] +
              ai[c] * d[c + n] +
              ai[c - n] * d[c - n] +
              aj[c] * d[c + 1] +
              aj[c - 1] * d[c - 1];
            z[c] = az;
            dz += az * d[c];
          }
          if (dz === 0) break;
          const alpha = sigma / dz;
          let maxR = 0;
          for (let k = 0; k < count; k++) {
            const c = list[k];
            q[c] += alpha * d[c];
            r[c] -= alpha * z[c];
            if (Math.abs(r[c]) > maxR) maxR = Math.abs(r[c]);
          }
          if (maxR <= tol) {
            iters++;
            break;
          }
          z.fill(0);
          w.fill(0);
          applyPrecon();
          let sigmaNew = 0;
          for (let k = 0; k < count; k++) {
            const c = list[k];
            sigmaNew += z[c] * r[c];
          }
          const beta = sigmaNew / sigma;
          sigma = sigmaNew;
          for (let k = 0; k < count; k++) {
            const c = list[k];
            d[c] = z[c] + beta * d[c];
          }
        }
        this.lastPcgIters = iters;
      }
      if (warm) {
        ws.prevQ.set(q);
        ws.dtPrev = dt;
      }
      // Faces: u[c] sits between c - n and c, v[c] between c - 1 and c.
      for (let i = 1; i < fNumX; i++)
        for (let j = 1; j < fNumY; j++) {
          const c = i * n + j;
          if (s[c] > 0 && s[c - n] > 0) u[c] += q[c - n] - q[c];
          if (s[c] > 0 && s[c - 1] > 0) v[c] += q[c - 1] - q[c];
        }
      const cp = (this.density * this.h) / dt;
      for (let c = 0; c < N; c++) p[c] = cp * q[c];
    }

    /**
     * Drift compensation, by position only. Particles bunch up where the
     * interpolated velocity is not quite divergence-free. Müller removes the
     * excess inside the main pressure solve, so the outflow becomes part of
     * the velocity FLIP keeps and adds energy every step: still water at 1 cm
     * cells bounced at 10-90 cm/s (rest.cjs). Here a second projection of a
     * zero field toward an outflow of driftK of each cell's excess this step,
     * k (excess / rest) h / dt, only moves the particles, the way Kugelstadt
     * et al. (2019) correct density by position.
     */
    correctDrift(dt, numIters, overRelaxation, driftK) {
      if (!this.cu) {
        this.cu = new Float32Array(this.fNumCells);
        this.cv = new Float32Array(this.fNumCells);
        this.cp = new Float32Array(this.fNumCells);
      }
      const { cu, cv } = this;
      cu.fill(0);
      cv.fill(0);
      const driftScale = (driftK * this.h) / (dt * this.restDensity);
      // Positions only, so a rough solve does: 1e-3 or 15 iterations.
      if (this.solver === "gs")
        this.project(cu, cv, this.cp, numIters, dt, overRelaxation, driftScale);
      else
        this.projectPcg(
          cu,
          cv,
          this.cp,
          dt,
          driftScale,
          15,
          1e-3,
          "drift",
          this.warmStart
        );
      const { pos } = this;
      for (let i = 0; i < this.numParticles; i++) {
        const x = pos[2 * i];
        const y = pos[2 * i + 1];
        pos[2 * i] += dt * this.sampleFace(cu, 0, x, y);
        pos[2 * i + 1] += dt * this.sampleFace(cv, 1, x, y);
      }
      this.handleParticleCollisions();
    }

    /** Whether every cell within two of c, across and up and down, is liquid or solid. */
    deepInside(c) {
      const { cellType, fNumX, fNumY } = this;
      const n = fNumY;
      const i = (c / n) | 0;
      const j = c - i * n;
      for (let di = -2; di <= 2; di++)
        for (let dj = -2; dj <= 2; dj++) {
          if (Math.abs(di) + Math.abs(dj) > 2) continue;
          const ii = i + di;
          const jj = j + dj;
          if (ii < 0 || jj < 0 || ii >= fNumX || jj >= fNumY) continue;
          if (cellType[ii * n + jj] === AIR) return false;
        }
      return true;
    }

    /**
     * Move particles through the last projected grid velocity, by RK2
     * (Bridson, ch. 7). Müller moves each particle by its own velocity, whose
     * FLIP noise is not divergence-free, so the water compresses unless a
     * strong drift correction undoes it. A particle with no liquid face near
     * it, spray in open air, keeps its own velocity.
     */
    advectThroughGrid(dt) {
      const { pos, vel, u, v } = this;
      if (!this.knownU) return; // no projected field yet
      const ku = this.knownU;
      const kv = this.knownV;
      for (let i = 0; i < this.numParticles; i++) {
        const x = pos[2 * i];
        const y = pos[2 * i + 1];
        const u1 = this.sampleKnown(u, ku, 0, x, y, vel[2 * i]);
        const v1 = this.sampleKnown(v, kv, 1, x, y, vel[2 * i + 1]);
        const mx = x + 0.5 * dt * u1;
        const my = y + 0.5 * dt * v1;
        pos[2 * i] = x + dt * this.sampleKnown(u, ku, 0, mx, my, vel[2 * i]);
        pos[2 * i + 1] =
          y + dt * this.sampleKnown(v, kv, 1, mx, my, vel[2 * i + 1]);
      }
    }

    /**
     * Carry the projected velocity two faces out into the air, each unknown
     * face taking the mean of its known neighbours (Bridson, ch. 4). Without
     * it a particle at the surface sampled only the faces below it, and still
     * water's surface stood 2-5 mm rough instead of 1 (the bench's still
     * scene).
     */
    extrapolateVelocity(layers = 2) {
      const { fNumX, fNumY, cellType } = this;
      const n = fNumY;
      const N = this.fNumCells;
      if (!this.knownU) {
        this.knownU = new Uint8Array(N);
        this.knownV = new Uint8Array(N);
        this.knownTmp = new Uint8Array(N);
      }
      for (let component = 0; component < 2; component++) {
        const f = component === 0 ? this.u : this.v;
        const known = component === 0 ? this.knownU : this.knownV;
        const offset = component === 0 ? n : 1;
        for (let c = 0; c < N; c++) {
          const a = cellType[c];
          const b = c - offset >= 0 ? cellType[c - offset] : SOLID;
          known[c] = a !== AIR || b !== AIR ? 1 : 0;
        }
        const tmp = this.knownTmp;
        for (let layer = 0; layer < layers; layer++) {
          tmp.set(known);
          for (let i = 1; i < fNumX - 1; i++)
            for (let j = 1; j < fNumY - 1; j++) {
              const c = i * n + j;
              if (known[c]) continue;
              let sum = 0;
              let count = 0;
              if (known[c - n]) (sum += f[c - n]), count++;
              if (known[c + n]) (sum += f[c + n]), count++;
              if (known[c - 1]) (sum += f[c - 1]), count++;
              if (known[c + 1]) (sum += f[c + 1]), count++;
              if (count) {
                f[c] = sum / count;
                tmp[c] = 1;
              }
            }
          known.set(tmp);
        }
      }
    }

    /** Bilinear sample over known faces; with none near, `fallback`. */
    sampleKnown(f, known, component, px, py, fallback) {
      const { fNumX, fNumY, h, invH } = this;
      const n = fNumY;
      const dx = component === 0 ? 0 : 0.5 * h;
      const dy = component === 0 ? 0.5 * h : 0;
      const x = clamp(px, h, (fNumX - 1) * h);
      const y = clamp(py, h, (fNumY - 1) * h);
      const x0 = Math.min(Math.floor((x - dx) * invH), fNumX - 2);
      const tx = (x - dx - x0 * h) * invH;
      const x1 = Math.min(x0 + 1, fNumX - 2);
      const y0 = Math.min(Math.floor((y - dy) * invH), fNumY - 2);
      const ty = (y - dy - y0 * h) * invH;
      const y1 = Math.min(y0 + 1, fNumY - 2);
      const c0 = x0 * n + y0;
      const c1 = x1 * n + y0;
      const c2 = x1 * n + y1;
      const c3 = x0 * n + y1;
      const k0 = known[c0] * (1 - tx) * (1 - ty);
      const k1 = known[c1] * tx * (1 - ty);
      const k2 = known[c2] * tx * ty;
      const k3 = known[c3] * (1 - tx) * ty;
      const w = k0 + k1 + k2 + k3;
      if (w < 0.999)
        return (
          fallback * (1 - w) +
          (w > 0 ? k0 * f[c0] + k1 * f[c1] + k2 * f[c2] + k3 * f[c3] : 0)
        );
      return k0 * f[c0] + k1 * f[c1] + k2 * f[c2] + k3 * f[c3];
    }

    /** Bilinear sample of a face field (0: u, 1: v) over faces next to liquid. */
    sampleFace(f, component, px, py, fallback = 0) {
      const { fNumX, fNumY, h, invH, cellType } = this;
      const n = fNumY;
      const dx = component === 0 ? 0 : 0.5 * h;
      const dy = component === 0 ? 0.5 * h : 0;
      const offset = component === 0 ? n : 1;
      const x = clamp(px, h, (fNumX - 1) * h);
      const y = clamp(py, h, (fNumY - 1) * h);
      const x0 = Math.min(Math.floor((x - dx) * invH), fNumX - 2);
      const tx = (x - dx - x0 * h) * invH;
      const x1 = Math.min(x0 + 1, fNumX - 2);
      const y0 = Math.min(Math.floor((y - dy) * invH), fNumY - 2);
      const ty = (y - dy - y0 * h) * invH;
      const y1 = Math.min(y0 + 1, fNumY - 2);
      const w0 = (1 - tx) * (1 - ty);
      const w1 = tx * (1 - ty);
      const w2 = tx * ty;
      const w3 = (1 - tx) * ty;
      const c0 = x0 * n + y0;
      const c1 = x1 * n + y0;
      const c2 = x1 * n + y1;
      const c3 = x0 * n + y1;
      const k0 = cellType[c0] !== AIR || cellType[c0 - offset] !== AIR ? w0 : 0;
      const k1 = cellType[c1] !== AIR || cellType[c1 - offset] !== AIR ? w1 : 0;
      const k2 = cellType[c2] !== AIR || cellType[c2 - offset] !== AIR ? w2 : 0;
      const k3 = cellType[c3] !== AIR || cellType[c3 - offset] !== AIR ? w3 : 0;
      const sum = k0 * f[c0] + k1 * f[c1] + k2 * f[c2] + k3 * f[c3];
      const wsum = k0 + k1 + k2 + k3;
      return wsum > 0 ? sum / wsum : fallback;
    }

    /** One step of length dt. */
    step(dt, o) {
      const iters = o.pressureIters ?? 50;
      const omega = o.overRelaxation ?? 1.9;
      this.solver = o.solver ?? "pcg";
      this.warmStart = o.warmStart !== false;
      this.pcgTol = o.pcgTol ?? 1e-4;
      this.driftSurface = o.driftSurface ?? true;
      this.driftBand = o.driftBand ?? 0;
      this.updateSolids();
      const gridAdvect = o.advect === "grid";
      if (gridAdvect) this.advectThroughGrid(dt);
      this.integrateParticles(dt, o.gx ?? 0, o.gy ?? -9.81, !gridAdvect);
      if (o.separate !== false)
        this.pushParticlesApart(o.particleIters ?? 1, o.separation ?? 1);
      this.handleParticleCollisions();
      const apic = o.transfer === "apic";
      this.transferVelocities(true, 0, apic);
      this.updateParticleDensity();
      this.solveIncompressibility(iters, dt, omega);
      if (gridAdvect) this.extrapolateVelocity();
      this.transferVelocities(false, o.flipRatio ?? 0.9, apic);
      if (o.wallFriction !== false) this.applyWallFriction(dt);
      // Drift correction every `driftEvery` steps, at that many times the
      // strength (capped at all the excess), since drift builds up slowly.
      this.stepCount = (this.stepCount || 0) + 1;
      const every = o.driftEvery ?? 4;
      if (o.compensateDrift !== false && this.stepCount % every === 0)
        this.correctDrift(
          dt,
          o.driftIters ?? 20,
          omega,
          Math.min((o.driftK ?? 0.1) * every, 1)
        );
      this.time += dt;
    }

    /**
     * The next step's length: at most `left`, maxDt, and cfl cells of travel.
     * Bridson's bound counts the speed gravity can add over the step too, or
     * water at rest takes a full maxDt step and the projection turns that
     * step's gravity into a jet at the dam face.
     */
    nextDt(left, o) {
      const g = Math.hypot(o.gx ?? 0, o.gy ?? -9.81);
      const speed = Math.max(this.maxSpeed + Math.sqrt(5 * this.h * g), 1e-6);
      return Math.min(left, o.maxDt ?? 1 / 60, ((o.cfl ?? 1) * this.h) / speed);
    }

    /**
     * Advance by `duration` in steps no longer than maxDt and, once the
     * water moves, no longer than cfl cells per step. Returns the step count.
     */
    advance(duration, o) {
      let left = duration;
      let steps = 0;
      while (left > 1e-9) {
        const dt = this.nextDt(left, o);
        this.step(dt, o);
        left -= dt;
        steps++;
        if (o.maxSteps && steps >= o.maxSteps) break;
      }
      return steps;
    }

    /** Liquid area in m², counting each cell as full up to rest density. */
    volume() {
      this.updateParticleDensity();
      let cells = 0;
      const rest = this.restDensity;
      for (let c = 0; c < this.fNumCells; c++)
        cells += Math.min(this.particleDensity[c] / rest, 1);
      return cells * this.h * this.h;
    }

    /**
     * The dam-break front: the right edge of the last cell below yMax that is
     * at least half full, as the LBM check reads it (phi >= 0.5). A lone
     * particle ahead of the water does not count.
     */
    front(yMax) {
      this.updateParticleDensity();
      const { h, fNumX, fNumY } = this;
      const n = fNumY;
      const rows = Math.max(1, Math.floor(yMax / h));
      const half = 0.5 * this.restDensity;
      for (let i = fNumX - 2; i >= 1; i--)
        for (let j = 1; j < Math.min(rows, fNumY); j++)
          if (this.particleDensity[i * n + j] >= half) return (i + 1) * h;
      return h;
    }

    /** Height of the surface over x, from where the density falls to half. */
    surfaceAt(x) {
      const { h, fNumY } = this;
      const n = fNumY;
      const i = clamp(Math.floor(x / h), 1, this.fNumX - 2);
      const half = 0.5 * this.restDensity;
      const d = this.particleDensity;
      for (let j = fNumY - 2; j >= 1; j--) {
        const below = d[i * n + j];
        if (below >= half) {
          const above = d[i * n + j + 1];
          const t = (below - half) / Math.max(below - above, 1e-9);
          return (j + 0.5 + Math.min(t, 1)) * h;
        }
      }
      return h;
    }
  }

  function faceValid(a, b) {
    if (a === SOLID || b === SOLID) return 0;
    return a === FLUID || b === FLUID ? 1 : 0;
  }

  function clamp(x, lo, hi) {
    return x < lo ? lo : x > hi ? hi : x;
  }

  FlipFluid.FLUID = FLUID;
  FlipFluid.AIR = AIR;
  FlipFluid.SOLID = SOLID;

  if (typeof module !== "undefined" && module.exports)
    module.exports = { FlipFluid };
  else root.FlipFluid = FlipFluid;
})(typeof globalThis !== "undefined" ? globalThis : this);
