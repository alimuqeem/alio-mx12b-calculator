# ALIO MX-12B Calculator

A fully functional, desktop-executable clone of the Casio MX-12B desktop calculator, built with Electron and rebranded as **ALIO**. Matte white housing, angled 12-digit LCD, tactile convex keys, and authentic Casio-style percent-key arithmetic.

![platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)

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
- **Square root (`√`)** and **sign toggle (`+/-`)**.
- **Chain calculation** — `5 + 3 × 2 =` evaluates left-to-right like a real four-function calculator.
- **Full keyboard support**: number row + numpad, `+ - * /`, `%`, `Enter`/`=`, `Escape` (AC), `Backspace`.
- **Mechanical click feedback** on every valid key press, synthesized live via the Web Audio API (no bundled audio files).

## Running from source

```bash
npm install
npm start
```

## Running the tests

The calculator's arithmetic engine (`js/calculator-engine.js`) is a pure state machine with no DOM dependency, so it's covered by a standalone assertion suite:

```bash
node test/engine.test.js
```

## Building a standalone executable

Builds are produced with [electron-builder](https://www.electron.build/).

```bash
npm run build:mac     # .dmg + .zip (arm64 + x64), builds and runs on macOS
npm run build:win     # .zip containing the Windows executable
npm run build:linux   # .zip containing the Linux executable
npm run dist           # all three platforms in one pass
```

> **Note:** only the macOS build was actually compiled and smoke-tested on the machine this project was built on. The Windows and Linux `build` targets in `package.json` are configured and should produce valid artifacts when run on (or cross-compiled for) their respective platforms, but they have not been executed or verified here.

Packaged executables are **not committed to this repository** — two ~90–97 MB `.dmg`/`.zip` files per architecture sit right at GitHub's 100 MB per-file hard limit, and checking binaries that large into git history bloats every future clone. Instead, built artifacts are published under this repo's **[Releases](../../releases)** page, which is GitHub's intended mechanism for shipping binaries. Source, build config, and this README are the only things tracked in git.

## Project structure

```
main.js                 Electron main process (window creation)
preload.js               Preload script (no privileged APIs exposed)
index.html                App shell / key layout markup
css/style.css              Housing, display, and key styling
js/calculator-engine.js    Pure arithmetic state machine (Casio percent semantics, overflow, memory)
js/click-sound.js          Web Audio API mechanical click synthesis
js/renderer.js             DOM + keyboard wiring, dispatches into the engine
test/engine.test.js        Standalone assertion suite for the engine
```

## Design notes / judgment calls

A few behaviors weren't fully specified in the brief and were filled in with the most Casio-authentic default:

- **`C` vs `AC`**: `C` clears the current entry only (display resets to `0`, error state clears, but any pending operator/first operand is preserved so you can continue the calculation). `AC` performs a full reset, including the pending operation — memory is untouched by both (only `MC` clears memory).
- **`Backspace`** (keyboard-only, no on-screen key per the spec) deletes the last digit of the entry in progress.
- **Held keys don't repeat** — a `keydown` with `event.repeat === true` is ignored, matching how a physical calculator button behaves when held down.
