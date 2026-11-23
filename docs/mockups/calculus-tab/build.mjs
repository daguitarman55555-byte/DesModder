// Bundles engine.ts, Physics Lab's real engines included, for the mock-up.
//   node docs/mockups/calculus-tab/build.mjs
import esbuild from "esbuild";
import { fileURLToPath } from "url";
import path from "path";

const here = path.dirname(fileURLToPath(import.meta.url));

await esbuild.build({
  entryPoints: [path.join(here, "engine.ts")],
  bundle: true,
  format: "iife",
  globalName: "CalcEngine",
  outfile: path.join(here, "engine.js"),
  target: "es2022",
  legalComments: "none",
  logLevel: "info",
});
