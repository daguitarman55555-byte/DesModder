# Vector Tools — GitHub Actions verification and Pages dashboard

Repo: `daguitarman55555-byte/DesModder`, working branch `feature/vector-tools-foundation`.

## Purpose

`GitHub Actions` runs tests in GitHub's runner, where GitHub, npm, and Desmos may be reachable and the development extension may be loaded. `GitHub Pages` serves **only the resulting static report**. Pages itself cannot install or execute a browser extension and cannot run Puppeteer.

## Install (the previous request said "Don't push," so this bundle was not pushed)

1. The workflow, `scripts/vector-tools-pages-report.cjs`, and the `HEADFUL` switch in `ap-look.cjs` and `ap-latency.cjs` are already on the branch.
2. Latency is `docs/mockups/vector-3d-arrows/ap-latency.cjs`: the time from a slider write until Desmos reports the new value, which is after its recompute. That is the 150 ms budget the presets are held to. It replaced GPT's proxy, which measured only the flow's redraw after one slider.
3. GitHub repository **Settings → Pages → Build and deployment → Source: GitHub Actions**. The repository metadata showed `has_pages: false` at inspection, so this setting is required.
4. Commit the new files to `feature/vector-tools-foundation`. Its **push** trigger runs the workflow automatically. A manual **Run workflow** button for a brand-new workflow generally requires the workflow file to exist on the repository default branch (`main`) first; do not assume that button will appear for a feature-branch-only file.
5. After completion, open **Settings → Pages** for the deployed site URL. On the Actions run page, download `vector-tools-verification` for the full logs and screenshots.

## What runs

- `npm ci`, then `npm run test:unit`, `npx tsc --build`, `npm run build`
- the project's existing `docs/mockups/vector-3d-arrows/ap-look.cjs`, for 9 AP presets × 2 dimensions × 2 modes = 36 expected views
- `ap-latency.cjs`, which moves every physics slider of every preset three times and times Desmos's recompute, recording p50/p95/worst per view
- a static HTML dashboard with explicit PASS/FAIL/NOT RUN status, counts, screenshots, per-view FPS and latency, machine info, and machine-readable JSON

All failures are still published as failures so the report can explain what failed; **a green Pages deployment does not mean a green verification**. No screenshots are marked visually reviewed simply because they were collected. Github-hosted virtualized graphics may not achieve 60 fps; use them for regressions and conduct GPU performance gates on target hardware.

## Known blockers / diagnostic limits

- The existing AP screenshot harness may fail if Desmos changes selectors, if Chrome blocks the unpacked extension, or if GPU initialization fails. Such failures remain in the Actions logs; the dashboard leaves missing views unverified.
- `xvfb-run` provides a virtual desktop to support normal extension loading. It does not provide a hardware GPU.
- The standalone slider metric is a proxy for parameter update/renderer redraw, not an OS-level measurement of pixels appearing on screen. Do not label it "end-to-end 150ms" unless separately measured at the display.
- The previous AP implementation patch has **not** been committed. Testing all nine presets requires first applying that patch. Without it, `ap-motion-graphs`, `ap-pendulum-phase`, and `ap-kepler-areas` will fail/miss views.
- This workflow does not write the repository. Deploying to Pages uses the special GitHub Pages artifact flow, not a source-code push.

## Local report smoke test

From repository root, `mkdir -p out/logs && node scripts/vector-tools-pages-report.cjs`. This should create `site/index.html` and `site/results.json`, marking unavailable stages/views as unverified. Inspect `site/index.html` locally or serve it via a static file server.
