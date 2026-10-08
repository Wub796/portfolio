# Orbital Dock — verification report

Everything here is measured, not asserted. The suites use Node built-ins only (no install, no
build): a static server and an isolated Chrome debugging listener.

```bash
python3 -m http.server 8000 --bind 127.0.0.1
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --remote-debugging-port=9227 \
  --user-data-dir=/tmp/plan-audit-chrome about:blank
```

Port `9227` runs without WebGL (the compositor path, which is the meaningful one for motion).
A second listener on `9228` adds `--enable-unsafe-swiftshader --use-angle=swiftshader` when the
Three.js planet itself has to be exercised.

## Suites and results

| Suite | What it covers | Result |
| --- | --- | --- |
| `tests/orbit-check.mjs` | Every page, every port open/close, browser metrics | 9/9 pages, all ports, `LayoutCount 0`, `LayoutDuration 0`, 60 fps, `maxFrameGap` 16.8 ms |
| `tests/orbit-interactions.mjs` | Docked cursor suppression, inert pass, focus, history, scroll lock, Ground Control, rollback | `failures: []` |
| `tests/orbit-fallbacks.mjs` | Mobile and reduced-motion per planet | 9/9 pages |
| `tests/anim-probe.mjs` | Motion itself: applied part animations, compositor census, close interpolation, scrim, bottom sheet | 19/19 assertions |
| `tests/audit-static.mjs` | Local links, fragments, assets, duplicate ids, CSS integrity | 0 problems |
| `tests/audit-runtime.mjs` | All ten pages plus the client-side router chain | 10/10 pages clean, router 10/10 hops landed, `failures: []` |
| `tests/fold-shot.mjs` | Freezes the close fold and the sheet slide for inspection | frames in `diag/` |

Per page the runtime audit reports `dupIds 0`, `brokenImgs 0`, `emptyHrefs 0`, `hashOnlyHrefs 0`,
`exceptions 0`, `http 0`, `console 0`, `fonts loaded`, `orbitLayers 1`, `cursorEls 3`. Every planet
page also reports `bodyOverflowX: hidden`, which is deliberate rather than a defect. The eight
`envNoise` entries per page are the expected WebGL-unavailable lines from the no-WebGL listener.

## Static audit triage

The auditor previously failed on two findings that are not defects, and it now says so instead:

- `var(--orb-arm-angle)` and `var(--sz)` have no definition anywhere, but every single use supplies
  a fallback (`var(--orb-arm-angle,0deg)`). An optional knob with a fallback is a note, not an
  error; the check now only fails an undefined property that is used somewhere *without* a
  fallback.
- `"max-height" declared twice in one block` for `.orb__panel` is the intentional `82vh` → `82dvh`
  pair, and remains a note.

Three genuine duplicate properties were removed from [../../css/style.css](../../css/style.css):
`.sec__num` declared `font-weight` twice in one block (`800` then `700`), `.dl-card__head` declared
`padding:0` and then `padding:1.15rem 1rem`, and the `.glow` progressive-enhancement block
re-declared the resting plain gradient verbatim before its `color-mix` version. All three were
no-ops at runtime; the audit now reports no duplicate property in `style.css`.

`reports/orbit/REPORT.md` did not exist while `README.md` linked to it. It does now.

## Animation defects found and fixed

### 1 · The panel close snapped to its end value

`@keyframes orb-fold` targeted `clip-path: inset(48% 44%)`. `polygon() → inset()` does **not**
interpolate, so the panel jumped to the collapsed rectangle on the first frame of the close while
only the opacity eased. Measured directly:

```
polygon -> inset   : inset(48% 44%)          <- at 50%, i.e. the end value already
polygon -> polygon : polygon(calc(24% + 6px) 23%, 76% 23%, 76% calc(77% - 6px), ...)
```

The fold now targets a polygon with the same six points as `orb-unfurl`'s `from`, so closing is
opening played backwards. Sampled at 45% of the real animation:

```
polygon(calc(41.2121% + 0.498938px) 38.3369%, 58.7879% 38.3369%,
        58.7879% calc(61.6631% - 0.498938px), calc(45.37% - 0.498938px) 61.6631%,
        41.2121% 61.6631%, 41.2121% calc(38.3369% + 0.498938px))
```

See `diag/fold-desktop-45.png`.

### 2 · The bottom sheet bloomed out of the middle of the viewport

Below 760px the panel is a bottom sheet that overrides `clip-path` to `none`, but it still ran the
centred-card clip animation, so it unfurled from the centre of the screen while sitting on the
bottom edge. It now has its own `orb-sheet-in` / `orb-sheet-out` pair. At 600×900 the resolved
`translateY` travels `453 → 0` going up and `0 → 302 → 445 → 453` coming down, with no `clip-path`
left behind at rest. At ≤480px the open animation stays disabled by design; closing still slides.
See `diag/sheet-mobile-50.png`.

### 3 · The scrim popped, and lagged the panel

`.orb__void` was toggled with `hidden`, so it appeared instantly and vanished only in `finish()` —
about 450 ms after the panel had already folded, leaving a bare scrim over nothing and then a hard
removal. It now fades in when it is revealed and fades out over 300 ms in step with the fold
(`veilFade` in [../../js/orbit.js](../../js/orbit.js), cancelled in `finish()` so a later open
cannot inherit opacity 0).

### 4 · Dead per-part animations were a latent layout hazard

The rule that kills the named machinery animations is `!important`, so the roughly twelve per-part
`animation:` declarations beneath it were dead code — and a live trap: the comment above them
claimed they animated, so a later specificity nudge would have re-enabled the per-frame Chrome
layout path measured earlier at ~61 layouts/s. The declarations and their nine orphaned keyframes
(`orb-libration`, `orb-ring`, `orb-hunt`, `orb-wing`, `orb-arm`, `orb-leg`, `orb-cube`,
`orb-flutter`, `orb-cargo`) are gone; the static geometry (`transform-origin`, `transform-box`, the
`--orb-arm-angle` rotation) is kept. No referenced keyframe is missing and no defined keyframe is
unreferenced.

### 5 · Reduced motion left the panel and the scrim animating

The reduced-motion selectors only matched *descendants* of `.orb__layer` and `.orb__panel`. The
panel animates on the panel itself, and `.orb__void` sits outside both trees, so both kept
animating. All three roots are now named.

Steady flight remains compositor-only: 30 running animations, **0** animating a non-composited
property, and `LayoutCount 0` with `LayoutDuration 0` while docked.

## Limitations

- The SwiftShader WebGL listener runs the scene at roughly 15–25 fps with 50–70 ms tasks. That is a
  software rasteriser, not real-hardware evidence; the no-WebGL compositor path is the measurement
  that means something.
- Both probes read computed styles from discrete evaluate calls. Querying a *paused* animation's
  `transform` from inside one long-running page expression returns stale values in this headless
  build (clip-path seeks do resolve, transforms do not), which is why sampling crosses the CDP
  boundary per sample.
- No real screen reader and no physical mobile device were involved.
- The app's own preview pane cannot load Three.js: the import map is rejected because
  `modulepreload` precedes `importmap` in `<head>`. That ordering is pre-existing and is also
  present in the untouched `index.html`; the `9228` listener is used for the planet itself.
