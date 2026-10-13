/** Native Desmos energy bars, built once and opted into by existing presets.
 * Energies are per unit mass for projectile and circular motion; oscillator
 * has m and k in arbitrary coherent units. Bars are explanatory-only.
 */
import type { GalleryVariable, SceneItem } from "./types";
const R = String.raw;
const check = R`\left\{s_{energy}=1\right\}`;
const rect = (
  x: number,
  base: number,
  h: string,
  key: string,
  color: string
): SceneItem => ({
  key,
  explains: true,
  color,
  fill: true,
  fillOpacity: 0.65,
  lineWidth: 1,
  latex: R`\operatorname{polygon}\left(\left(${x},${base}\right),\left(${x + 0.52},${base}\right),\left(${x + 0.52},${base}+${h}\right),\left(${x},${base}+${h}\right)\right)${check}`,
});
export function energyBars(
  id: string,
  dim: 2 | 3
): {
  variables: GalleryVariable[];
  scene: SceneItem[];
} {
  if (!["ap-projectile", "ap-shm", "ap-circular"].includes(id))
    return { variables: [], scene: [] };
  const variables: GalleryVariable[] = [
    {
      name: "s_{energy}",
      value: 1,
      min: 0,
      max: 1,
      step: 1,
      toggle: "Mechanical-energy bars",
    },
  ];
  let K: string;
  let U: string;
  let E: string;
  let thermal = "0";
  if (id === "ap-projectile") {
    const F = R`\frac{v_{0y}+\sqrt{v_{0y}^{2}+2gh}}{g}`;
    const q = R`\min\left(\operatorname{mod}\left(T_{scene},${F}+1\right),${F}\right)`;
    const airborne = R`\left\{\operatorname{mod}\left(T_{scene},${F}+1\right)<${F}:1,0\right\}`;
    K = R`${airborne}\frac{v_{0x}^{2}+\left(v_{0y}-g\left(${q}\right)\right)^{2}}{2}`;
    U = R`${airborne}g\left(h+v_{0y}\left(${q}\right)-\frac{g\left(${q}\right)^{2}}{2}\right)`;
    E = R`\frac{v_{0x}^{2}+v_{0y}^{2}}{2}+gh`;
    // A ball at rest after impact has transferred its mechanical energy to
    // the ground; an explicit thermal channel prevents a false conservation claim.
    thermal = R`\left(1-${airborne}\right)\left(${E}\right)`;
  } else if (id === "ap-shm") {
    const angle = R`\sqrt{\frac{k}{m}}T_{scene}`;
    K = R`\frac{kA^{2}}{2}\sin^{2}\left(${angle}\right)`;
    U = R`\frac{kA^{2}}{2}\cos^{2}\left(${angle}\right)`;
    E = R`\frac{kA^{2}}{2}`;
  } else {
    K = R`\frac{w^{2}R^{2}}{2}`;
    U = "0"; // A constraint force does no work; this is NOT a gravitational potential.
    E = K;
  }
  const [x, y] = id === "ap-projectile" ? [3.6, 3] : [3.6, -5.5];
  const vals = id === "ap-projectile" ? [K, U, thermal, E] : [K, U, E];
  const col = ["#b66a22", "#326aa6", "#8a5ba8", "#367b58"];
  const lab = id === "ap-projectile" ? ["K", "U", "D", "E"] : ["K", "U", "E"];
  if (id !== "ap-projectile") col[2] = "#367b58";
  const scene: SceneItem[] = vals.flatMap((val, i) => {
    const x0 = x + i * 0.75;
    const H = R`\frac{2.25\max\left(0,${val}\right)}{\max\left(0.5,${E}\right)}`;
    if (dim === 3) {
      // A surface rather than a point/label: Desmos 3D has no native labels
      // and Majestic's overlay renders surfaces instead of graph points.
      // In Explanatory the 3D panel legend gives the K/U/D/E order.
      const x3 = 2.0 + 0.66 * i;
      return [
        {
          key: `energy${lab[i]}`,
          latex: R`\left(${x3}+0.42u,-3.7,-2.7+v\left(${H}\right)\right)${check}`,
          domainU: ["0", "1"],
          domainV: ["0", "1"],
          fill: true,
          fillOpacity: 0.8,
          explains: true,
          color: col[i],
        },
      ];
    }
    return [
      rect(x0, y, H, `energy${lab[i]}`, col[i]),
      {
        key: `energyLabel${lab[i]}`,
        latex: R`\left(${x0 + 0.26},${y - 0.26}\right)${check}`,
        label: lab[i],
        points: true,
        pointSize: 1,
        explains: true,
        color: col[i],
      },
    ];
  });
  if (dim === 2) {
    // A paper card under the bars: on top of the flow they were read
    // through a field of particles. First in the list, so drawn beneath.
    const right = x + vals.length * 0.75 - 0.05;
    scene.unshift({
      key: "energyCard",
      latex: R`\operatorname{polygon}\left(\left(${x - 0.3},${y - 0.6}\right),\left(${right},${y - 0.6}\right),\left(${right},${y + 2.55}\right),\left(${x - 0.3},${y + 2.55}\right)\right)${check}`,
      color: "#ffffff",
      fill: true,
      fillOpacity: 0.9,
      lineWidth: 1,
      lineOpacity: 0.3,
      explains: true,
    });
  }
  return { variables, scene };
}
