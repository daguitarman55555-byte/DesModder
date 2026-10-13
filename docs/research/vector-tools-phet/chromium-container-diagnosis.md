# Vector Tools: browser verification through GitHub Actions + GitHub Pages

The Chromium blocker was located in the current execution container:

- source policy fragment `/etc/chromium/policies/managed/.policy_merge/001_base_url_blocklist.json`, which contains `URLBlocklist: ["*"]`;
- source fragment `/etc/chromium/policies/managed/.policy_merge/001_base_extensions.json`, which contains `ExtensionInstallBlocklist: ["*"]`;
- merged effective policy `/etc/chromium/policies/managed/000_policy_merge.json`.

The fragments and merged file are owned by root. Their institutional origin is not identifiable from these files. An unrelated DNS failure currently prevents ordinary GitHub cloning from this container. These are **container** restrictions, not user Chrome-account settings.

## Contents

- `.github/workflows/vector-tools-pages.yml`: feature-branch GitHub Actions workflow: npm ci, Jest, TypeScript, extension build, Desmos live check, latency check, Pages upload/deploy.
- `scripts/vector-tools-slider-latency.cjs`: per-view, ten-update redraw-latency benchmark.
- `docs/mockups/vector-3d-arrows/ap-pages-report.cjs`: produces `site/index.html` and `site/results.json`; unmeasured views remain unverified.
- `changes/ap-look.headful.patch`: enables HEADFUL=1 for Chrome under Xvfb, preserving existing defaults.
- `docs/VERIFY_GITHUB_PAGES.md`: install and usage guide, limitations, and verification distinctions.

See the installation instructions in `docs/VERIFY_GITHUB_PAGES.md`.

## Validation actually performed in this conversation

- Parsed workflow YAML locally.
- `node --check` passed for both new scripts.
- Static report generator ran locally; it showed 0/36 views as missing when there were no measurements.
- Synthetic-report test demonstrated that a refused expression, failed TypeScript check, and absent latency stage are represented accurately, not concealed.

**Not run:** GitHub-hosted workflow, Desmos Chromium test, extension install, real FPS, actual p95 slider latency. This bundle was **not pushed**.
