# Benjamin Wu — Mission Control

A single-file static personal page aggregating Benjamin Xianming Wu's **studies, college plan, application process, extracurriculars, daily schedule, meal plan, training plan, and summer-program deadlines** — distilled from the Second Brain vault and the "Updated Program List & Timelines."

## Stack

- **Plain HTML + CSS + JS** — no build step, no framework. Drop it anywhere.
- **[Lenis](https://github.com/darkroomengineering/lenis)** (v1.3.26, vendored at `vendor/lenis.min.js`) — smooth scrolling.
- **Design language** inspired by [Fullstack-Empire/GSAP-Awwwards-Website](https://github.com/Fullstack-Empire/GSAP-Awwwards-Website) — the "milk tea" palette (deepened for contrast): cream `#e9dfce` base, brown family (`#523122` dark, `#a26833` mid, `#e3a458` light, `#7f3b2d` red-brown), near-black `#222123` panels for the deadlines + footer. Display type is **Antonio** (condensed uppercase, brutally tight tracking) with Formula-Narrow body and Supply-Mono labels — layered over the [web-development-portfolio](https://github.com/prashantkoirala465/web-development-portfolio) brutalist borders/shadows, the [award-winning-website](https://github.com/adrianhajdin/award-winning-website) structure, and the igloo/buttermax motion layer.
- **Solar-system structure** — the whole site is a planetary system: the hero is the **Sun**, a new orbital **System Map** section has all nine section-planets orbiting it (hover to pause, click to fly), every section header carries its own planet orb with a per-planet accent color, a fixed **orbit rail** on the left tracks your position in the system (SOL → 09), and every section change fires a **warp flash** overlay in the arriving planet's color. The 3D scene tints its wireframe, rings, comet, and rim light to the current planet's accent.
- **WebGL 3D layer** (`js/scene.js`) — [Three.js](https://threejs.org/) via CDN importmap (three@0.160.1 + UnrealBloomPass). Wireframe planet with rings, orbiting satellites, nebulae, three star shells, and a velocity-reactive comet; the camera flies through per-section waypoints as you scroll, stars stretch into hyperspace on fast scroll, and bloom pulses on section changes. Scroll telemetry is published by `main.js` as `window.__scrollProg` / `window.__scrollVel` + `section-change` events.
- **Extras**: comet-trail custom cursor (2D canvas), 3D tilt on rows, 3D flip-in section headers, glitching hero title, perspective marquee. Everything degrades gracefully (no WebGL → plain static site; reduced-motion → static frame).
- Fonts: Antonio + Rader / Formula-Narrow / Supply-Mono (plus the earlier Zentry/General/Circular/Robert set) vendored at `assets/fonts/` — no external font requests.

## Run

```bash
# any static server works
python3 -m http.server 8000
# → http://localhost:8000
```

Or just open `index.html` directly.

## Deploy to GitHub Pages

1. Push this folder to a repo (e.g. `benjaminwu.github.io`).
2. Settings → Pages → deploy from branch `main` / root.
3. Done — Lenis and fonts load from CDN-free local/vendored assets except Google Fonts.

## Sections

`01 Mission` · `02 Studies` (transcript, EOC, junior ladder) · `03 College Plan` (target list, strategic pillars, Operation Liftoff phases) · `04 Application Process` · `05 Extracurriculars` (Sea Cadets, volleyball, research, projects, honors) · `06 Daily Schedule` (school-year ⇄ summer toggle) · `07 Meal Plan` · `08 Training` · `09 Program Deadlines` (live countdowns).

## Editing content

- Deadlines live in `DEADLINES` at the top of `js/main.js` — dates render exactly as written, countdowns compute live against the visitor's clock.
- Schedule grids are static tables in `index.html` (two tables, toggled by `#modeSchool` / `#modeSummer`).
- Everything else is plain markup in `index.html`.

## Credits

- [Lenis — darkroomengineering](https://github.com/darkroomengineering/lenis)
- [shutterkif-oss.github.io](https://github.com/shutterkif-oss/shutterkif-oss.github.io) (design reference)
- Content: Second Brain vault (Benjamin Wu)
