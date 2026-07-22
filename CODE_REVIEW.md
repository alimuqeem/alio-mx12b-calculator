# Code Review — 2026-07-22

A full-codebase review (engine, renderer, click sound, HTML shell) run by an
Opus-model agent, focused on correctness and robustness bugs rather than
style. No high-severity findings — the arithmetic engine never produced a
numerically wrong answer. 3 medium and 8 low-severity findings below.

Commit with the fixes: `71789d0`.

## Fixed

| Severity | Issue | Fix |
|---|---|---|
| Medium | `formatNumber` capped fractional precision at 9 digits regardless of the 12-digit display budget (fixed `1e9` rounding constant). `1 ÷ 3` showed `0.333333333` instead of using the full budget. | Replaced with `toPrecision(15)` significant-digit rounding — still neutralises float noise (`0.1 + 0.2`) but lets small numbers use the full 12-digit budget (`1/3` now shows `0.33333333333`), and is safe at any magnitude (a fixed decimal multiplier can overflow `Number`'s safe-integer range for numbers with many integer digits). |
| Medium | Memory recall (`MR`) silently showed `0` instead of `E` when the register held an unrepresentable value — `formatNumber` returning `null` was coerced to `'0'` instead of raising the error state, unlike every other overflow path in the engine. | `memoryRecall` now calls `setError` on overflow, matching `inputOperator`/`inputEquals`/`inputPercent`. |
| Medium | `ClickSound.play()` ran before the display re-render in the dispatch chain with no error handling. An `AudioContext` failure (unsupported browser, blocked autoplay, etc.) would throw and skip the re-render, freezing the visible display while engine state kept advancing underneath it. | Wrapped in try/catch so an audio failure can never block a render — worst case, no click sound plays. |
| Low | Pressing `0` then `00` produced `"000"` instead of staying `"0"` — the leading-zero-replacement branch excluded `'00'` from its check for no reason. | Branch now handles `'00'` the same as the initial-entry case. |
| Low | No WebGL availability check. A disabled/unsupported GPU left a blank page with zero explanation. | Added a capability check before any Three.js object is constructed; shows a plain-text fallback message instead. |
| Low | The Poppins font-load `await` had no error handling and would hard-abort module execution if it rejected, or if the Font Loading API was absent entirely. | Wrapped in try/catch; falls back to the system font already in the canvas font stack. |
| Low | Right/middle mouse clicks on the canvas both opened a context menu and registered a keypress (no `e.button` check on `pointerdown`). | Only the primary button (`e.button === 0`) now dispatches. |
| Low | The `requestAnimationFrame` loop called `renderer.render()` every frame forever, even though nothing in the scene animates continuously — pure battery/GPU waste while idle. | Switched to render-on-demand: a `needsRender` flag set by state changes, resize, and the press-visual timeout; `animate()` skips the actual render call when nothing changed. |

## Open — flagged, not fixed

| Severity | Issue | Why left alone |
|---|---|---|
| Low | Hard runtime dependency on external CDNs (three.js from unpkg, Poppins from Google Fonts) with no self-hosted fallback — if either is unreachable, the app doesn't render. | Fixing this means vendoring those files into the repo, which is an architecture change, not a bug fix. Left for a deliberate decision rather than a silent change. |
| Low | `5 + 0` then `C/AC` performs a full reset instead of clearing just the `0` entry, because the engine can't distinguish "untouched initial zero" from "a zero the user just typed" (`clearOrAllClear` keys off `display === '0'`). | Low-stakes, and arguably matches how many real combined C/AC calculators behave. Disambiguating would need a new state flag — deferred rather than adding speculative complexity for an edge case. |
| Low | `inputSqrt` is implemented and tested in the engine but has no UI key and no keyboard shortcut. | Intentional — the real MX-12B reference photo has no √ key. Documented in `README.md`'s design notes. |

## Testing

`test/engine.test.js`: 37 assertions (up from 32), including 5 added as
regression coverage for the digit-entry, precision, and memory-overflow
fixes above. Run with `npm test`.
