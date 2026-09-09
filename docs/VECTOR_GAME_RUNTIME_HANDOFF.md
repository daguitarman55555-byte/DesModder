# Vector Game Runtime handoff

## Scope

This branch adds a neutral, non-graphic game runtime. It contains no Doom source,
WAD parser, commercial assets, or instructions for adding protected content.

## Isolation

All implementation code lives in:

- `src/plugins/vector-game-runtime/`

Shared integration is limited to:

- one import, registry entry, and transparent getter in `src/plugins/index.ts`
- two English strings in `localization/en.ftl`
- one focused GitHub Actions workflow

Do not merge this folder into `src/plugins/vector-tools/`. The runtime intentionally
owns its engine, input, frame painter, saves, UI, and tests.

## Included capabilities

- A generic `GameEngine` interface
- A documented `WasmGameAdapter` ABI
- WebGL2 framebuffer-to-vector-field rendering
- Direct source-pixel comparison mode
- Pointer-lock mouse input and isolated keyboard input
- Fullscreen
- IndexedDB save/load
- A harmless built-in vector maze
- Lifecycle cleanup when the popover or plugin closes

## WebAssembly ABI

A compatible module exports memory and these functions:

- `game_init()`
- `game_step(dt, forward, strafe, turn, action)`
- `game_framebuffer()`
- `game_width()`
- `game_height()`
- `game_state_size()`
- `game_save(pointer)`
- `game_load(pointer)`

The framebuffer is tightly packed RGBA8. The adapter copies it into an
`ImageData`, while the painter uploads the canvas to a GPU texture and constructs
the vector visualization in a single fragment-shader pass.

## Verification

GitHub Actions runs:

```sh
npm ci
npm run lint:types
npm run lint:eslint
npm run test:unit -- --runTestsByPath src/plugins/vector-game-runtime/MazeDemoEngine.unit.test.ts
npm run build
```

Integrate this PR semantically after the current Vector Tools work. Resolve only
the registry or localization lines if those shared files changed; preserve the
entire plugin directory as an independent unit.
