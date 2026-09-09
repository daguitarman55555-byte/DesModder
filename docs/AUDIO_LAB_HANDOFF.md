# Audio Lab handoff for Claude Code

## Read this first

Audio Lab is an independent DesModder plugin on `feature/audio-lab` and draft PR
#2. It must remain separate from Vector Tools. Do not move Audio Lab into
`src/plugins/vector-tools`, import either plugin from the other, or combine their
settings, controllers, panels, tests, generated expression IDs, or lifecycle.

The branch started from main commit `930bd35`, after Vector Tools PR #1 was
merged. Audio Lab development deliberately did not edit any file under
`src/plugins/vector-tools`.

## What version 1 does

- Adds Audio Lab to DesModder's utility menu as an enabled-by-default plugin.
- Signs in to Spotify using Authorization Code with PKCE. No client secret is
  used or stored.
- Accepts Spotify track, album, playlist, episode, and show links.
- Controls playback on the user's active Spotify player: play a pasted link,
  pause, resume, previous, and next.
- Shows the current track, artist, device, progress, and duration.
- Opens Spotify in a normal browser tab when the user needs to activate a
  playback device.
- Captures audio only after the user clicks **Analyze tab audio** and explicitly
  selects a tab with **Share tab audio** enabled.
- Draws a live waveform and frequency spectrum with three performance presets.
- Optionally analyzes a local audio file.
- Sends finite, downsampled waveform and spectrum point lists to Desmos using
  the stable IDs `audio_lab_waveform` and `audio_lab_spectrum`.
- Cleans up animation frames, polling, pending requests, object URLs, audio
  nodes, streams, and message listeners when the panel closes.

## Architecture and security

Spotify OAuth and Web API requests run in the extension background worker in
`src/spotify.ts`. Tokens stay in `chrome.storage.local` and are never posted to
the Desmos page. The page plugin sends typed commands through the existing
page/content/background message bridge and receives only safe profile or
playback data.

The public Spotify client ID is:

```text
4052ea1384df4eb9a35141159c5a328e
```

The redirect registered during development is:

```text
https://dedbladjlfimolmophheclffaonghgic.chromiumapp.org/spotify
```

If Chrome assigns a different unpacked-extension ID, add the corresponding
`https://<extension-id>.chromiumapp.org/spotify` URI in the Spotify developer
dashboard. Never add a Spotify client secret to this repository.

Spotify playback is intentionally not embedded in an iframe. Spotify blocks the
original page URL from framing, and a remote player SDK is a poor fit for a
Manifest V3 extension. Audio Lab controls the user's active Spotify tab or app
through the Web API. A Spotify Premium account and an active playback device are
required by Spotify for these player endpoints.

The Web API cannot expose decoded copyrighted audio samples. Live visualization
therefore uses Chrome's user-approved tab capture. This is why playback and
analysis are two separate buttons.

## Owned files

Audio Lab owns all files under:

```text
src/plugins/audio-lab/
```

It also adds one focused Spotify service:

```text
src/spotify.ts
```

Shared integration files touched by the feature are:

- `src/plugins/index.ts`: plugin registration and typed getter.
- `src/core-plugins/pillbox-menus/components/Menu.tsx`: utility-menu entry.
- `localization/en.ftl`: English plugin name and description.
- `public/chrome/manifest.json`: `identity`, Spotify API host permissions.
- `src/background.ts`: dispatches Spotify commands to the background service.
- `src/preload/content.ts`: forwards typed Audio Lab requests and responses.
- `src/utils/messages.ts`: declares the message protocol and returns listener
  handles so Audio Lab can unregister its page listener.

Conflicts in those shared files should be resolved semantically while retaining
both Claude's optimization changes and the small Audio Lab integration hooks.

## Integration procedure

After the current optimization pass is clean:

1. Fetch `feature/audio-lab` or draft PR #2.
2. Merge the branch into the optimized branch, or cherry-pick the Audio Lab
   commits in order.
3. Resolve only shared-file conflicts listed above. Do not copy Vector Tools
   code into Audio Lab or Audio Lab code into Vector Tools.
4. Confirm `git diff -- src/plugins/vector-tools` contains only the optimization
   work that already existed on Claude's branch.
5. Run the verification commands below.

## Verification

```bash
npm run lint
npm run test:unit
npm run build
npm run build-ff
```

Run `npm run test:integration` when the environment can download/access the
Desmos calculator fixture.

Manual Chrome test:

1. Build with `npm run build`.
2. Load or reload the repository's `dist` folder at `chrome://extensions`.
3. Open or hard-refresh `https://www.desmos.com/calculator`.
4. Open the DesModder menu and select **Audio Lab**.
5. Sign in, open Spotify, start any track once, paste a Spotify link, and press
   **Play**.
6. Press **Analyze tab audio**, choose the Spotify tab, enable **Share tab
   audio**, and confirm both canvases animate.
7. Press **Send snapshot to Desmos** and confirm the two expression-list items
   appear.
8. Close and reopen the panel, then repeat analysis to check cleanup and source
   switching.

If the Audio Lab button is missing, check that the loaded extension points to
the current `dist`, `audio-lab` is present in the plugin registry and utility
category, it is enabled in the DesModder plugin list, and Desmos was refreshed
after the extension reload.

## Current boundaries

- Chrome OAuth is supported. Firefox builds compile, but Spotify sign-in reports
  that it is Chrome-only until an equivalent Firefox identity flow is added.
- Audio Lab analyzes the mixed tab output that Chrome supplies; Spotify does not
  provide per-instrument stems or raw samples through its Web API.
- Snapshot export is intentionally bounded to 256 waveform and 192 spectrum
  points for calculator responsiveness.
