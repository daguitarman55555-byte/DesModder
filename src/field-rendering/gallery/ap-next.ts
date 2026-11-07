/** Gauss's law, with up to ten charges placed anywhere (see point-charges.ts).
 * Every GPU vector is a physical field, not a proxy for an unrelated graph.
 * Numerical Desmos sums are quadratures; exact enclosed-source sums are separate.
 */
import {
  flow2D,
  flow3D,
  inked,
  only as on,
  point,
  toggle as toggleOf,
  variable,
} from "./kit";
import {
  chargeScene,
  chargeVariables,
  fieldComponent,
  listField,
  LISTS,
  potential,
  ringLayout,
} from "./point-charges";
import type { GalleryPreset, SceneItem } from "./types";

const R = String.raw;
const toggle = (name: string, text: string) => toggleOf(name, 1, text);
const { obj, path, ball } = inked("#4b6276");
const curve = (
  key: string,
  coordinates: string[],
  domain: readonly [string, string],
  other: Partial<SceneItem> = {}
) => path(key, coordinates, domain, { lineWidth: 2.5, ...other });
const sphere = (
  key: string,
  coords: string[],
  dim: 2 | 3,
  radius = "0.19",
  other: Partial<SceneItem> = {}
) =>
  ball(key, coords, dim, {
    radius,
    pointSize: 13,
    extra: {
      color: "#c58143",
      ...(dim === 3 ? { majesticColor: "#e9a95d" } : {}),
      ...other,
    },
  });

/** Point-charge field, in normalized units epsilon_0=1, k_e=1/(4 pi).
 * The 2D view is a section of the full 3D Coulomb field, not 2D electrostatics.
 */
function gauss(): GalleryPreset {
  /** ε₀ = 1: Coulomb's constant is 1/4π, and the flux is the charge. */
  const k = R`\frac{1}{4\pi}`;
  const layout = ringLayout(
    [
      { q: 2, at: [-0.7, 0, 0] },
      { q: -1, at: [2.5, 0, 0] },
    ],
    3,
    k,
    4
  );
  const values = [
    ...chargeVariables(layout, 3, [-3, 3, 0.25]),
    variable("C_{gx}", 0, -3, 3, 0.1),
    variable("C_{gy}", 0, -3, 3, 0.1),
    variable("C_{gz}", 0, -3, 3, 0.1),
    variable("R_{g}", 1.7, 0.5, 4, 0.1),
    variable("N_{g}", 80, 40, 200, 20),
    variable(R`\alpha_{g}`, 1.0, 0, 6.28, 0.05),
    variable(R`\beta_{g}`, 1.2, 0.05, 3.09, 0.05),
    toggle("s_{gauss}", "Gaussian surface and sample"),
  ];
  const C = ["C_{gx}", "C_{gy}", "C_{gz}"];
  const helpers: SceneItem[] = [
    // Equal-area Fibonacci quadrature, avoiding polar pole overweighting.
    obj("gheight", R`H_{g}(n)=1-\frac{2\left(n+0.5\right)}{N_{g}}`, {
      hidden: true,
    }),
    obj(
      "gphase",
      R`A_{g}(n)=\operatorname{mod}\left(2.399963229728653n,2\pi\right)`,
      { hidden: true }
    ),
    obj(
      "gpx",
      R`P_{gx}(n)=C_{gx}+R_{g}\sqrt{1-H_{g}(n)^{2}}\cos\left(A_{g}(n)\right)`,
      { hidden: true }
    ),
    obj(
      "gpy",
      R`P_{gy}(n)=C_{gy}+R_{g}\sqrt{1-H_{g}(n)^{2}}\sin\left(A_{g}(n)\right)`,
      { hidden: true }
    ),
    obj("gpz", R`P_{gz}(n)=C_{gz}+R_{g}H_{g}(n)`, { hidden: true }),
  ];
  const P = ["P_{gx}(n)", "P_{gy}(n)", "P_{gz}(n)"];
  // E·n̂ at the n-th sample, summed over the charges in use by Desmos.
  const toSample = P.map(
    (s, a) => R`\left(${s}-${[LISTS.x, LISTS.y, LISTS.z][a]}\right)`
  );
  const radial = P.map((s, a) => R`\left(${s}-${C[a]}\right)`);
  const dot = R`\operatorname{total}\left(\frac{${LISTS.q}\left(${toSample.map((d, a) => `${d}${radial[a]}`).join("+")}\right)}{4\pi R_{g}\left(${toSample.map((d) => `${d}^{2}`).join("+")}\right)^{1.5}}\right)`;
  helpers.push(obj("gsample", R`J_{g}(n)=${dot}`, { hidden: true }));
  helpers.push(
    obj(
      "gflux",
      R`\Phi_{g}=\frac{4\pi R_{g}^{2}}{N_{g}}\sum_{n=0}^{N_{g}-1}J_{g}(n)`,
      { color: "#245c8e" }
    )
  );
  helpers.push(
    obj(
      "genclosed",
      // The exact charge inside: those in use within R_g of the centre.
      R`Q_{g}=\operatorname{total}\left(\left\{${["x", "y", "z"]
        .map(
          (_, i) =>
            R`\left(${[LISTS.x, LISTS.y, LISTS.z][i]}-${C[i]}\right)^{2}`
        )
        .join("+")}<R_{g}^{2}:${LISTS.q},0\right\}\right)`,
      { color: "#a14a29" }
    )
  );
  helpers.push(obj("gresidual", R`D_{g}=\Phi_{g}-Q_{g}`, { color: "#6f547e" }));
  const sample = [
    R`C_{gx}+R_{g}\sin\left(\beta_{g}\right)\cos\left(\alpha_{g}\right)`,
    R`C_{gy}+R_{g}\sin\left(\beta_{g}\right)\sin\left(\alpha_{g}\right)`,
    R`C_{gz}+R_{g}\cos\left(\beta_{g}\right)`,
  ];
  // The field at the sample point, dotted with the outward normal there.
  helpers.push(
    obj("gfield", R`E_{gvt}=${listField(k, sample)}`, { hidden: true })
  );
  const localDotExact = ["x", "y", "z"]
    .map((a, i) => R`E_{gvt}.${a}\frac{${sample[i]}-${C[i]}}{R_{g}}`)
    .join("+");
  helpers.push(obj("gdot", R`E_{gn}=${localDotExact}`, { color: "#47678c" }));
  helpers.push(
    obj(
      "gprobeColor",
      R`C_{gprobe}=\left\{E_{gn}\ge0:\operatorname{rgb}(235,150,89),\operatorname{rgb}(85,132,221)\right\}`,
      { hidden: true }
    )
  );
  const fields2 = [0, 1].map((a) => fieldComponent(layout, a, ["x", "y", "0"]));
  const fields3 = [0, 1, 2].map((a) =>
    fieldComponent(layout, a, ["x", "y", "z"])
  );
  const circle = (dim: 2 | 3): SceneItem[] =>
    dim === 2
      ? [
          curve(
            "gaussianRim",
            [R`C_{gx}+R_{g}\cos(t)`, R`C_{gy}+R_{g}\sin(t)`],
            ["0", R`2\pi`],
            {
              color: "#b28a52",
              explains: true,
              lineStyle: "DASHED",
              lineWidth: 3,
              latex:
                point(R`C_{gx}+R_{g}\cos(t)`, R`C_{gy}+R_{g}\sin(t)`) +
                on("s_{gauss}=1"),
            }
          ),
          // The law, read off the graph: the flux summed beside the charge
          // inside, which agree wherever the sphere is. To two places: the
          // seventh of a Riemann sum is noise, not physics.
          obj(
            "gaussRound",
            R`F_{gr}=\operatorname{round}\left(\Phi_{g},2\right)`,
            {
              hidden: true,
            }
          ),
          obj(
            "gaussReadout",
            point("C_{gx}", R`C_{gy}+R_{g}+0.6`) + on("s_{gauss}=1"),
            {
              explains: true,
              points: true,
              pointSize: 0,
              color: "#245c8e",
              label: R`${"`"}\Phi_{E}=${"$"}{F_{gr}}${"`"}     ${"`"}\frac{Q_{\mathrm{enc}}}{\varepsilon_{0}}=${"$"}{Q_{g}}${"`"}`,
              labelSize: 1.2,
            }
          ),
        ]
      : // A wireframe, five latitudes and six meridians: a filled sphere
        // drew solid over the flow, hiding the charge inside it, and a
        // Gaussian surface is not a material shell anyway.
        [
          curve(
            "gaussianLatitudes",
            [
              R`C_{gx}+R_{g}\cos(t)\sin(L)`,
              R`C_{gy}+R_{g}\sin(t)\sin(L)`,
              R`C_{gz}+R_{g}\cos(L)`,
            ],
            ["0", R`2\pi`],
            {
              color: "#b28a52",
              majesticColor: "#e2c08a",
              explains: true,
              lineWidth: 1,
              latex:
                point(
                  R`C_{gx}+R_{g}\cos(t)\sin(L)`,
                  R`C_{gy}+R_{g}\sin(t)\sin(L)`,
                  R`C_{gz}+R_{g}\cos(L)`
                ).replace(
                  /L/g,
                  R`\left[\frac{\pi}{6},\frac{\pi}{3},\frac{\pi}{2},\frac{2\pi}{3},\frac{5\pi}{6}\right]`
                ) + on("s_{gauss}=1"),
            }
          ),
          curve(
            "gaussianMeridians",
            [
              R`C_{gx}+R_{g}\cos(M)\sin(t)`,
              R`C_{gy}+R_{g}\sin(M)\sin(t)`,
              R`C_{gz}+R_{g}\cos(t)`,
            ],
            ["0", R`2\pi`],
            {
              color: "#b28a52",
              majesticColor: "#e2c08a",
              explains: true,
              lineWidth: 1,
              latex:
                point(
                  R`C_{gx}+R_{g}\cos(M)\sin(t)`,
                  R`C_{gy}+R_{g}\sin(M)\sin(t)`,
                  R`C_{gz}+R_{g}\cos(t)`
                ).replace(
                  /M/g,
                  R`\left[0,\frac{\pi}{6},\frac{\pi}{3},\frac{\pi}{2},\frac{2\pi}{3},\frac{5\pi}{6}\right]`
                ) + on("s_{gauss}=1"),
            }
          ),
        ];
  const scene = (dim: 2 | 3): SceneItem[] => [
    ...helpers,
    // Its 2D view is the z = 0 slice of charges that keep their z, so its
    // sums need every charge's z there too.
    ...chargeScene(dim, "0.2", { listAxes: 3 }),
    ...circle(dim),
    sphere(
      "normalProbe",
      dim === 2 ? sample.slice(0, 2) : sample,
      dim,
      "0.075",
      {
        explains: true,
        color: "#d49b4a",
        colorLatex: dim === 3 ? "C_{gprobe}" : undefined,
      }
    ),
    sphere("center", dim === 2 ? C.slice(0, 2) : C, dim, "0.05", {
      explains: true,
      color: "#8e8992",
    }),
    ...(dim === 3
      ? [
          obj("dragCenter", point(...C), {
            explains: true,
            points: true,
            pointSize: 10,
            drag3d: C as [string, string, string],
            name3d: { label: "center", color: "#8e8992" },
          }),
        ]
      : []),
  ];
  return {
    id: "ap-gauss-flux",
    name: "Gauss's law: flux and enclosed charge",
    category: "ap2",
    apUnit: 10,
    blurb:
      "Up to ten charges, set with N_q and dragged anywhere by their handles, and a Gaussian sphere to move round them. A 3D Gaussian surface is mathematical, not a material shell. The native Fibonacci sum approximates its electric flux; Q_g is the exact enclosed charge in ε₀=1 units. Avoid placing charges on the surface. In 2D this is a slice, not a 2D flux integral.",
    // Potential, as on the charges: E·n̂ measured from the sphere's centre
    // meant something only on the surface, and coloured the rest grey.
    meaning: {
      quantity: "Electric potential V",
      low: "negative, near −",
      zero: "V = 0",
      high: "positive, near +",
    },
    palette: "charge",
    majesticPalette: "charge-glow",
    onPaper: true,
    extent: 5,
    xLatex: fields2[0],
    yLatex: fields2[1],
    tint: {
      latex: potential(layout, ["x", "y", "0"]),
      latex3d: potential(layout, ["x", "y", "z"]),
      scale: 0.3,
    },
    variables: values,
    scene: scene(2),
    flow: flow2D({ speed: 0.35, density: 0.7, normalize: true, opacity: 0.47 }),
    space: {
      blurb:
        "3D Coulomb field of up to ten charges (N_q), each dragged by its handle, and a movable Gaussian sphere. Φ_g is a finite quadrature, Q_g is exact. Sphere neutral; a selected point's E·n is in the expression list; continuous surface colouring is NOT claimed.",
      xLatex: fields3[0],
      yLatex: fields3[1],
      zLatex: fields3[2],
      variables: values,
      scene: scene(3),
      look: flow3D({ speed: 0.35 * 0.6, density: 0.8, normalize: true }),
    },
  };
}
export const AP_NEXT: readonly GalleryPreset[] = [gauss()];
