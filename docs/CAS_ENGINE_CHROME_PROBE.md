# CalcForge engine inside a Chrome extension: measured

2026-11-09. These are the browser gates GPT's CAS research could not run, because its environment could not install an extension. GPT's probe (`DesModder_CAS_DE_Probes.zip`, `extension-probe.py`) was run on Rafael's PC.

**Setup**

- Windows 11, Puppeteer 24.0.0's Chrome for Testing 131, headless, fresh profile per run.
- CalcForge `(5).zip` (Pyodide 0.27.7, SymPy 1.14.0).
- The 20 "bench" fixtures, plus a repeat of case 01.

**Harness change.** The test content script also writes its reply onto `<html data-cas-research>`. Its `console.log` runs in the isolated world, where Puppeteer never hears it. The first runs therefore timed out after 10 minutes even though the route worked.

## Results

The extension-page boot time and memory columns come from `probe.html`. Memory is the whole browser process tree: about 555 MB before the test, peaking 336–340 MB above that during the test, and back to within 5 MB of the starting level 5 s after the worker ends.

| Variant                                    | Extension page `probe.html`                                                     | Desmos 2D graph → offscreen worker                                                  | Desmos 3D graph → offscreen worker  |
| ------------------------------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------- |
| Default MV3 CSP                            | **Refused**: "neither 'wasm-eval' nor 'unsafe-eval' is an allowed source"       | (worker never boots)                                                                | (worker never boots)                |
| Source, `'wasm-unsafe-eval'`               | Boot 5.3 s, 20/20 ok, median 0.60 s, max 7.8 s (case 14, Bessel), repeat 1.8 ms | Boot 4.9 s, 20/20 ok, median 0.53 s                                                 | Boot 5.1 s, 20/20 ok, median 0.54 s |
| Bytecode, `'wasm-unsafe-eval'`             | Boot 3.8 s, 20/20 ok, median 0.54 s, max 8.3 s                                  | Boot 3.3 s, 20/20 ok                                                                | Boot 3.4 s, 20/20 ok                |
| Source, with DesModder's `dist` loaded too | Boot 4.8 s, 20/20 ok                                                            | Boot 5.2 s, 20/20 ok; page `crossOriginIsolated` true (DesModder's COEP/COOP rules) | Boot 4.9 s, 20/20 ok; isolated true |

An earlier source run with `'wasm-unsafe-eval'` booted in 6.1 s and also answered 20/20.

## What this settles

- **Chrome MV3 can host the engine.** The route is a content script → service worker → offscreen document (`reasons: ["WORKERS"]`) → dedicated worker on the extension origin. It needs the `offscreen` permission and `extension_pages` CSP `script-src 'self' 'wasm-unsafe-eval'`.
- **It works on both the 2D and 3D calculators.** It also works with DesModder's COEP/COOP header rules active.
- **"ok" means CalcForge reported success.** It is not GPT's independent verification. GPT's correctness gaps (cases 15, 37–38, 44, 48 and others) stand.
- **Bytecode boots about 1.5 s faster** in this run, at the cost of +20.6 MB packed instead of +9.8 MB for source.

## Not covered

- Firefox (MV2 background-page worker): Firefox is not installed here.
- Headful Chrome with the real GPU.
- A slower machine.
- Signed Web Store packaging and review.
