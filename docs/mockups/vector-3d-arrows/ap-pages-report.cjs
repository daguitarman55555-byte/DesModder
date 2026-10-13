/* Static, dependency-free report for GitHub Pages. Reads out/, writes site/.
   CI stage failures are represented as failures, never quietly converted to passes. */
const fs = require("node:fs");
const path = require("node:path");
const root = process.cwd();
const out = path.join(root, "out");
const site = path.join(root, "site");
fs.mkdirSync(site, { recursive: true });
const read = (file, fallback = "") => {
  try {
    return fs.readFileSync(path.join(out, file), "utf8");
  } catch {
    return fallback;
  }
};
const json = (file, fallback = {}) => {
  try {
    return JSON.parse(read(file));
  } catch {
    return fallback;
  }
};
const esc = (v) =>
  String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const safeFile = (s) => /^[\w.-]+\.png$/.test(s);
const stage = json("status.json");
const machine = json("machine.json");
const lines = read("logs/live.log").split(/\r?\n/);
const rowRx = /^(2d|3d)\s+(ap-[\w-]+)\s+(explanatory|majestic)\s+(\{.+\})$/;
const live = [];
for (const line of lines) {
  const match = line.match(rowRx);
  if (!match) continue;
  try {
    const report = JSON.parse(match[4]);
    live.push({
      dimension: match[1],
      preset: match[2],
      mode: match[3],
      fps: typeof report.fps === "number" ? report.fps : null,
      refused: Array.isArray(report.refused) ? report.refused : [],
      flowMessage: report.flowMessage || "",
      legend: report.legend || "",
      shown: Array.isArray(report.shown) ? report.shown : [],
      screenshot: `${match[2]}-${match[1]}-${match[3]}.png`,
    });
  } catch {
    /* raw log is preserved in the downloadable evidence artifact */
  }
}
const latency = json("slider-latency.json", { results: [] });
const latencyRows = Array.isArray(latency.results) ? latency.results : [];
const screenshots = path.join(out, "screenshots");
const siteShots = path.join(site, "screenshots");
fs.mkdirSync(siteShots, { recursive: true });
if (fs.existsSync(screenshots)) {
  for (const file of fs.readdirSync(screenshots))
    if (safeFile(file))
      fs.copyFileSync(path.join(screenshots, file), path.join(siteShots, file));
}
const expected = [
  "ap-projectile",
  "ap-shm",
  "ap-circular",
  "ap-nozzle",
  "ap-conductor",
  "ap-induction",
  "ap-motion-graphs",
  "ap-pendulum-phase",
  "ap-kepler-areas",
  "ap-gauss-flux",
  "ap-ampere-loop",
  "ap-incline-forces",
].flatMap((preset) =>
  ["2d", "3d"].flatMap((dimension) =>
    ["explanatory", "majestic"].map((mode) => `${dimension}|${preset}|${mode}`)
  )
);
const seen = new Set(live.map((r) => `${r.dimension}|${r.preset}|${r.mode}`));
const missing = expected.filter((x) => !seen.has(x));
const summary = {
  generatedAt: new Date().toISOString(),
  sha: process.env.GITHUB_SHA || machine.sha || "",
  stages: stage,
  machine,
  viewCount: live.length,
  expectedCount: expected.length,
  missing,
  refusedCount: live.reduce((n, v) => n + v.refused.length, 0),
  below60fps: live.filter((r) => r.fps != null && r.fps < 60).length,
  sliderRows: latencyRows.length,
  latencyFailures: latencyRows.filter(
    (r) => r.error || (r.p95Ms !== null && r.p95Ms >= 150)
  ).length,
  live,
  latency: latencyRows,
  humanScreenshotReview:
    "NOT PERFORMED BY CI; screenshots must be inspected by a reviewer",
  performanceCaution:
    "GitHub-hosted virtual hardware does not measure end-user GPU FPS",
};
fs.writeFileSync(
  path.join(site, "results.json"),
  JSON.stringify(summary, null, 2)
);
fs.writeFileSync(path.join(site, ".nojekyll"), "");
const getStatus = (key) => {
  if (!Object.prototype.hasOwnProperty.call(stage, key) || stage[key] === null)
    return "NOT RUN";
  if (stage[key] !== 0) return "FAIL";
  if (key === "live")
    return live.some((r) => r.refused.length || r.flowMessage)
      ? "FAIL"
      : live.length !== expected.length
        ? "INCOMPLETE"
        : "MEASURED";
  if (key === "latency")
    return latencyRows.length !== expected.length
      ? "INCOMPLETE"
      : latencyRows.some((r) => r.error || r.p95Ms === null || r.p95Ms >= 150)
        ? "REVIEW"
        : "MEASURED";
  return "PASS";
};
const stamp = (key) => {
  const status = getStatus(key),
    cls = status === "PASS" ? "pass" : status === "FAIL" ? "fail" : "unknown";
  return `<span class="pill ${cls}">${esc(key)}: ${status}</span>`;
};
const latencyMap = new Map(
  latencyRows.map((r) => [`${r.dimension}|${r.preset}|${r.mode}`, r])
);
const rows = [...expected]
  .map((k) => {
    const r = live.find((x) => `${x.dimension}|${x.preset}|${x.mode}` === k);
    const t = latencyMap.get(k);
    if (!r)
      return `<tr><td>${esc(k)}</td><td colspan="4" class="unknown">No completed measurement</td></tr>`;
    const png = fs.existsSync(path.join(siteShots, r.screenshot))
      ? `<a href="screenshots/${esc(r.screenshot)}">View screenshot</a>`
      : "Not captured";
    const status = r.refused.length
      ? "FAIL"
      : r.flowMessage
        ? "CHECK"
        : "NO REFUSALS";
    const fps =
      r.fps === null
        ? "not measured"
        : `${r.fps.toFixed(1)} (${r.fps >= 60 ? "≥60" : "<60"})`;
    const lat = t
      ? t.error
        ? `Error: ${esc(t.error)}`
        : t.p95Ms === null
          ? "timeout/no redraw"
          : `${t.p95Ms} ms p95`
      : "not measured";
    return `<tr><td>${esc(r.preset)}<br><small>${r.dimension} / ${r.mode}</small></td><td>${esc(status)}</td><td>${esc(fps)}</td><td>${lat}</td><td>${png}</td></tr>`;
  })
  .join("\n");
const cards = live
  .filter((r) => fs.existsSync(path.join(siteShots, r.screenshot)))
  .map(
    (r) =>
      `<a class="shot" href="screenshots/${esc(r.screenshot)}"><img loading="lazy" alt="${esc(`${r.preset} ${r.dimension} ${r.mode}`)}" src="screenshots/${esc(r.screenshot)}"/><span>${esc(r.preset)} • ${r.dimension} • ${r.mode}</span></a>`
  )
  .join("");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Vector Tools — Verification</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0c1323;color:#e5edfa;font:15px/1.55 system-ui,-apple-system,Segoe UI,sans-serif}main{max-width:1280px;padding:36px 24px;margin:auto}h1{font-size:clamp(28px,4vw,44px);line-height:1.1;margin:0 0 12px}h2{font-size:23px;margin-top:40px}.lead{color:#a5b9d4;font-size:17px}.meta{padding:14px 18px;background:#18263b;border-radius:10px}.pills{display:flex;gap:8px;flex-wrap:wrap}.pill{font-size:12px;display:inline-block;padding:5px 10px;border-radius:30px;background:#38475e}.pill.pass{background:#164b3a;color:#b2f5d5}.pill.fail{background:#5c2330;color:#ffd3da}.pill.unknown{background:#4a432b;color:#ffebb8}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:14px;margin:22px 0}.stat{padding:20px;border:1px solid #344663;border-radius:12px;background:#141e2d}.stat strong{display:block;font-size:32px}.stat span{color:#a5b9d4}.tablewrap{overflow:auto}table{border-collapse:collapse;width:100%;min-width:720px}td,th{border-bottom:1px solid #344663;padding:11px;text-align:left}th{background:#18263b}small{color:#9babc3}.shots{display:grid;grid-template-columns:repeat(auto-fill,minmax(265px,1fr));gap:16px}.shot{display:block;background:#17263a;border-radius:12px;overflow:hidden;color:#dcecff;text-decoration:none}.shot img{aspect-ratio:1.58;width:100%;object-fit:cover;display:block}.shot span{display:block;padding:10px}a{color:#9dc3ff}code{overflow-wrap:anywhere}.notice{border-left:3px solid #f4bf72;padding:12px 16px;background:#2e2925;margin:20px 0}footer{margin:50px 0;color:#98abc5}
</style></head><body><main><h1>Vector Tools — Verification</h1><p class="lead">Automated checks from GitHub Actions, independently recorded for 2D and 3D, Explanatory and Majestic.</p><p class="meta">Commit <code>${esc(summary.sha.slice(0, 12) || "unknown")}</code> · ${esc(summary.generatedAt)}<br>Runner ${esc(machine.runner || "unknown")} · ${esc((machine.cpus || []).join(", ") || "CPU unknown")} · Node ${esc(machine.node || "unknown")}</p><div class="pills">${["install", "unit", "types", "build", "live", "latency"].map(stamp).join("")}</div><div class="stats"><div class="stat"><strong>${live.length}/${expected.length}</strong><span>views measured</span></div><div class="stat"><strong>${summary.refusedCount}</strong><span>refused expressions in completed views</span></div><div class="stat"><strong>${summary.below60fps}</strong><span>measured views below 60 FPS</span></div><div class="stat"><strong>${latencyRows.length}</strong><span>slider-latency measurements</span></div></div><p class="notice">${missing.length ? "Incomplete: " + missing.length + " view(s) have no measurements. " : ""}A zero refusal count does not imply unmeasured views passed. Screenshots are not automatically reviewed by a human. Runner FPS is not a substitute for an end-user GPU benchmark.</p><h2>View-by-view acceptance</h2><div class="tablewrap"><table><thead><tr><th>Preset / view</th><th>Desmos expressions</th><th>Render FPS</th><th>Slider latency</th><th>Evidence</th></tr></thead><tbody>${rows}</tbody></table></div><h2>Screenshots</h2><div class="shots">${cards || "<p>No screenshots captured.</p>"}</div><footer>Machine-readable <a href="results.json">results.json</a>. For complete diagnostic logs, download the <em>vector-tools-verification</em> artifact from the associated GitHub Actions run.</footer></main></body></html>`;
fs.writeFileSync(path.join(site, "index.html"), html);
console.log(
  `Published report: ${live.length}/${expected.length} views, ${summary.refusedCount} refused; site/index.html`
);
