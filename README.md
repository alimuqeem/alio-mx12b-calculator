# ALIO MX-12B Calculator

A cross-platform clone of the Casio MX-12B desktop calculator, rebranded as **ALIO**. It runs entirely in the browser — rendered with [Three.js](https://threejs.org/) on an orthographic (flat, non-perspective) camera rather than DOM/CSS — so there's no install, no download, and no platform-specific executable. White housing, mint-green 12-digit LCD, tactile convex keys laid out to match the real MX-12B, and authentic Casio-style percent-key arithmetic.

![platform](https://img.shields.io/badge/platform-any%20modern%20browser-lightgrey)

**Live demo:** https://alimuqeem.github.io/alio-mx12b-calculator/

## Features

- **12-digit LCD display** with overflow protection — results that exceed 12 digits show `E`.
- **Casio-specific percent-key logic**:
  - `A + B %` → `A + (A × B / 100)` (markup)
  - `A - B %` → `A - (A × B / 100)` (discount)
  - `A × B %` → `(A × B) / 100`
  - `A ÷ B %` → `A ÷ (B / 100)`
  - `B %` alone (no pending operator) → `B / 100`
- **Double-zero key (`00`)** for fast large-number entry, capped at 12 digits.
- **Persistent memory register** (`MC` / `MR` / `M-` / `M+`) with a live `M` indicator, and a momentary `STO` flash on store.
- **Combined `C/AC` key**, matching the real MX-12B: first press clears the current entry (like `C`); pressing again once the display is already `0` performs a full reset (like `AC`).
- **`▶` key** deletes the last entered digit (backspace).
- **Sign toggle (`+/-`)**.
- **Chain calculation** — `5 + 3 × 2 =` evaluates left-to-right like a real four-function calculator.
- **Full keyboard support**: number row + numpad, `+ - * /`, `%`, `Enter`/`=`, `Escape` (full reset), `Backspace`.
- **Mechanical click feedback** on every valid key press, synthesized live via the Web Audio API (no bundled audio files).
- **Mouse, touch, and keyboard input**, all routed through the same dispatcher, so behavior is identical across input methods.

## Running it

It's a static site — no build step, no bundler, no npm install. Three.js is loaded from a CDN via an import map in `index.html`.

```bash
npm start          # python3 -m http.server 8080, then open http://localhost:8080
```

Or just serve the directory with any static file server (`npx serve`, VS Code's Live Server, etc). `file://` won't work — browsers block ES module imports from the filesystem, so it needs to be served over HTTP.

## Running the tests

The calculator's arithmetic engine (`js/calculator-engine.js`) is a pure state machine with no DOM or rendering dependency, so it's covered by a standalone assertion suite and is unaffected by the choice of renderer:

```bash
npm test            # node test/engine.test.js
```

## Project structure

```
index.html                  Page shell: import map for Three.js (CDN), script tags
js/calculator-engine.js       Pure arithmetic state machine (Casio percent semantics, overflow, memory) — no DOM dependency
js/click-sound.js             Web Audio API mechanical click synthesis
js/three-calculator.js        Three.js scene: orthographic camera, canvas-textured flat button meshes, raycasting for input, keyboard wiring
test/engine.test.js           Standalone assertion suite for the engine
```

## Why Three.js instead of an Electron executable

The original build of this project was an Electron desktop app, packaged into per-platform `.dmg`/`.zip` executables. This version replaces that entirely: the same visual design (flat colors, gradients, convex-key shading) is now baked into `<canvas>` textures and mapped onto a grid of Three.js planes viewed through an orthographic camera, so there's no 3D perspective distortion — it still *reads* as a flat calculator face, just rendered via WebGL instead of HTML/CSS. That gets genuine cross-platform reach (anything with a modern browser, including mobile) without shipping or maintaining a native binary per OS.

The arithmetic engine (`calculator-engine.js`) was already a pure, DOM-independent state machine, so it carried over to the new renderer completely unchanged — same file, same 32 passing test assertions.

## Design notes / judgment calls

- **The on-screen key set and pastel-pink color scheme follow a real MX-12B reference photo**: a single `C/AC` key instead of separate `ON/AC`/`C` buttons, a `▶` (backspace) key instead of a dedicated `√` key, lavender number keys, pink operator keys, a magenta `C/AC`, and a rounded `%`/`MU` capsule button. The engine still exposes `inputSqrt`, `allClear`, and `clearEntry` individually — `clearOrAllClear` composes the last two to drive the combined key without losing either behavior.
- **`MU`'s exact real-world semantics are undocumented** — it's wired to the same percent function as `%`, since both live in the same pill and are percent-family keys. `M+` is a real, distinct memory-add key.
- **`C/AC`**: first press clears the current entry only (display resets to `0`, error state clears, pending operator/first operand preserved so you can continue the calculation). Pressing it again once the display is already `0` (or after an error) performs a full reset, including the pending operation. Memory is untouched by either — only `MC` clears memory.
- **Button textures are pre-baked in two states (normal/pressed)** rather than redrawn per-frame — a click swaps the texture and nudges the mesh down a couple of units for ~90ms, mirroring the old CSS `:active` transform, then reverts.
- **Held keys don't repeat** — a `keydown` with `event.repeat === true` is ignored, matching how a physical calculator button behaves when held down.
- **No perspective/orbit camera** — this is a deliberate simplicity trade-off: the calculator reads as a flat 2D face rendered through Three.js/WebGL, not a fully lit 3D product model with depth and shadows.
