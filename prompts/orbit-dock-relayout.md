# MISSION PROMPT — "Orbital Dock": every planet page becomes a swarm of spacecraft

You are working in a plain static site (no build step, no framework): **"Benjamin Wu — The System"**, a personal site that is literally a solar system.

## 0 · Ground truth — read these before writing a line

Repo facts you must verify yourself, then respect:

- `index.html` is the **Sun / main page**. **Do not change it.** (Verify with `git diff --stat index.html` — it must be empty when you're done.)
- Nine planet pages, each with `body data-planet="…"`: `mission.html`, `studies.html`, `college.html`, `applications.html`, `extracurriculars.html`, `schedule.html`, `meal.html`, `training.html`, `deadlines.html`.
- Stack: plain HTML + CSS + vendored JS. Lenis (smooth scroll), anime.js v4.5, GSAP + ScrollTrigger, Three.js v0.160.1 via CDN `importmap`, `fluid-bg` (currently disabled in `js/main.js`). No npm install, no bundler, must keep working from `file://` *and* `python3 -m http.server 8000`.
- Per-page shell: `header.nav`, `#progress`, `nav.rail` (left orbit-rail planet nav), then `main.page > section.sec.sec--page > .wrap` (the real content), then `footer.foot`.
- The content that must become orbiters is the **direct children of `section.sec--page > .wrap`** — KPI strips (`.kpis > .kpi`), `.grid2` clusters of `.panel`, clusters of `.panel`/`.mini-h` groups, `.rows` card grids (`.row.uni`, `.row.step`, `.row.ecard`), tables (`.tbl`, `.sched`), checklists (`ul.check`), `.rules`, `.legend`, `.prog` grids, and on `deadlines.html` the generated program grid.
- Per-planet identity: `body[data-planet="…"]` rules in `css/style.css` set `--accent`; the planet catalogue `P` in `js/scene.js` holds each planet's hex `c`, size `s`, orbit `d`, tilt, and camera framing `cam`.
- Existing JS hooks you may extend (follow these conventions, don't invent a parallel system): `window.__scene3d` (`{ok, slug, arrival, dark}`), `window.__sceneVis`, `window.__getSceneState()` (`{planet, pos, look, simT}`), `window.__flyToPlanet(slug)`, `window.__scrollVel`.
- Existing precedent to imitate: the floating deadline dock `#dlDock` — injected into `<body>` by `js/main.js`, gated per planet (`body:not([data-planet="deadlines"]) .dl-dock{display:none}`), removed when the planet changes so its observers never outlive the page. Also the `--pc` CSS planet coronas.
- Every effect in this codebase is individually guarded so a failure can never break a page. Match that.

## 1 · The experience you are building

Today each planet page is a flat, stacked document: hero header, then blocks laid out top-to-bottom. Replace that on the **nine non-Sun pages** with an **orbital dock**:

The page's planet still hangs in the live Three.js system at the centre of the viewport, but it is now the anchor of a working station. Every top-level content block on the page is **launched off the page** and becomes a physical body in orbit around that planet — a moon, a satellite, a probe, a lander, a rocket, a sail, a freighter — **`closed` by default**: nothing but its art, a small machined label plate, and a port indicator. Nothing is readable until the visitor **clicks a body**. Clicking runs a **docking sequence**: the body flies in, the planet recedes, and the real content block unfurls inside a centred reading panel. Closing sends the body back out to its slot on the belt.

The flat document never disappears from the DOM — it becomes the *payload* of the orbiters. No content is rewritten, duplicated, or summarized: the same KPI tiles, tables, checklists and program cards must be what opens.

Design target: an Awwwards-calibre instrument panel in space. Physical, engineered, quiet — this site's existing "milk tea" aerospace brutalist language, not a videogame HUD.

## 2 · Non-negotiable constraints

1. **Zero new dependencies, zero build step.** Pure HTML/CSS/JS. New files: `css/orbit.css`, `js/orbit.js` (classic script, not a module — `js/scene.js` already owns the module + importmap). Link/script tags added to the nine planet pages only.
2. **`index.html` untouched.** The Sun page keeps its current layout exactly.
3. **No content duplication, no cloning.** Build the orbit layer at runtime *from the existing DOM*. Move the **real block element** into the reading panel on open, and return it to its original anchor (stored parent + `nextSibling`) on close. Never clone (clones break the deadlines dock's listeners, the applied-tick `localStorage` state `bw.deadlines.applied.v1`, and the toggles on `schedule.html` / `training.html`).
4. **Never move a row out of its parent.** Only whole top-level elements move: a `<table>`, a `<div class="panel">`, `<ul class="check">`. Never `<tr>`, never `<li>`, never anything that would produce invalid HTML. When a body's content is a cluster, the cluster's *chest* (its wrapper) is what moves; inside, structure is untouched.
5. **Never gate content visibility from CSS alone.** Without JS (or if `js/orbit.js` throws at any point) the page must be the readable stacked document it is today. The orbit layer must be added by JS, add a `html.orb-ready` class only after the first successful layout pass, and on any error remove everything it injected and restore the document order.
6. **No `transform` / `filter` / `backdrop-filter` / `will-change` / `contain` on `html`, `body`, or any ancestor of the fixed reading panel.** Any of those creates a containing block and silently breaks `position: fixed` panels and the existing `#dlDock`. Keep the perspective on inner belt wrappers only.
7. **No CSS 3D perspective on the page wrapper; no canvas for the bodies.** Bodies are inline **SVG + CSS** so their labels are real, selectable, translatable text.
8. **Don't break what exists:** `[data-warp]` cross-document View Transitions, `sessionStorage` planet handoff, Lenis smooth scroll, the `nav.rail`, the countdowns (`.live-cd`, `data-deadline`, `data-phase-start/end`), the deadline dock's full keyboard map (`/`, `↑ ↓ j k`, `Home`, `End`, `x`, `Esc`) and its filters/ticks/empty-state, and the site's no-loading-screen rule.
9. **Respect `prefers-reduced-motion`** (static slots, no drift, instant open/close) and **degrade silently** with no WebGL, no CDN, or no fonts.
10. **Composite-only idle animation.** Idle body motion uses CSS transform/opacity animations. No per-frame JS layout reads (no `getBoundingClientRect` in the RAF loop), no animating `top/left/width/height`.

## 3 · Architecture

**`js/orbit.js`** (one guarded IIFE, bails out entirely on `body[data-planet="sol"]` or `index.html`):

- `ORBIT_CONFIG` — per-planet plan: an ordered array of body definitions, each `{ id, title, archetype, source }` where `source` is a CSS selector or an index path into `section.sec--page > .wrap` children (e.g. `"[data-orb='kpis']"`, `".grid2 > .panel:nth-of-type(2) > .mini-h"` groups). This is the *only* place layout decisions live — nine pages change by config, not nine hand-edits of HTML.
- **Grouper** — resolves each config entry into `{ element, title, index }`. Title precedence: explicit `data-orb-title` → nearest preceding `h3.mini-h` / `h2.sec__title` → block's own `id` → `"{page} · {n}"`. Titles are clamped to ~42 characters.
- **Belt rig** — the orbit geometry. Expose one function `place(body)` that writes a single `transform: translate3d(x, y, 0) scale(s) rotate(a)` string per body from `{ radius, phase, speed, inclination, z }`. Screen position of the planet comes from a new scene hook (below); fall back to viewport centre with a nominal radius when WebGL is unavailable. Nearer belts orbit faster (rough Kepler feel). Depth is faked with `scale`, `opacity`, `brightness()` and `z-index` banding so bodies genuinely pass **behind** the planet's limb and dim on the far side.
- **Scene hook** — extend `js/scene.js` (small, additive, guarded) to publish, at ~10 Hz, the current planet's **screen position and apparent radius** plus the **screen-space sun direction** (the planet is the light source for the orbiters), e.g. `window.__getOrbitAnchor()` returning `{ x, y, r, sunX, sunY, ok }`. Use it to set `--orb-sun-x/--orb-sun-y` so every body is lit by the planet it orbits, and to ring the real planet rather than the viewport centre. Never let this hook throw into the render loop.
- **State machine** — `idle → hover → locked (arming) → transit → open → closing → idle`. Store `{ planet, openIndex, lastIndex }`; persist only `bw.orbit.state.v1` in `sessionStorage` (which body the visitor last opened on each planet) for a "handshake" highlight on return — **never auto-open**.
- **Renderer order**: `#scene3d` canvas → `#orbitLayer` (fixed, `pointer-events:none`, `z-index` between canvas and content) → reading panel (fixed, top of stack). Bodies get `pointer-events:auto`.

**`css/orbit.css`** — token-driven using the page's existing `--accent`, `--bg`, `--text`, `--on-accent`, the `--p*` planet colours, and the vendored Supply-Mono / General / Rader faces. All new classes prefixed `.orb…` and scoped under `html.orb-ready` so a JS failure leaves the site clean.

Ambience (aesthetic, all `aria-hidden`, all cheap): a scatter of **micro-debris** in the outer belt (~10–14 tiny fragments, 2–6px, slowly tumbling, one catching the planet's light), a faint **orbit trace** (a 0.4px dashed ellipse at each belt's inclination, 0.14 alpha), an occasional **micrometeor streak**, and a **halo flare** when a body crosses the planet's limb — matching the scene's bloom rather than fighting it.

## 4 · The bodies — hand-craft each one, no two alike

Every body is a single inline `<svg viewBox="0 0 120 120">` with **named parts** (`<g class="orb__wing">`, `.orb__dish`, `.orb__leg`) so parts can be animated independently in CSS. Rules for all bodies:

- **Material honesty.** Metals get two-stop gradients plus a 1px specular edge on the sun side, foils get a crumpled pattern (SVG `feTurbulence` at low opacity — one shared filter definition, not one per body), thermal blankets get soft creases, painted hulls get scuffs and a faded registration decal. Nothing is a flat disc or a rounded rectangle.
- **Light from the planet.** Body shading uses `.orb__light` gradients oriented by `--orb-sun-x/y`; the planet-facing side is warm (`--accent`-tinted), the far side falls to the page's near-black. Rim light on the sun side only.
- **Beacons and emissives.** Every body carries at least one small emissive: a strobe (120ms flash, 2.4s period, 0.6–1.4s offset per body), a warm cupola glow, an RTG bloom, or a thruster plume. Emissives are the only saturated colour on the page.
- **Idle motion is part of the body.** Each has a signature idle (spin, yaw, gimbal hunt, tether counter-rotation, sail flutter). Idle animations are CSS-only and phase-offset per body so the swarm never pulses in unison.
- **Affordance.** A closed body shows: the art (96–140px desktop), a machined label plate with `index · title` in Supply-Mono at ≥11px effective, and a small **port indicator** (a filled ring that lights on hover) — plus a 4-corner reticle that draws on hover. A closed body must never show a content preview or truncated copy.
- **Occlusion cost.** Keep each SVG under ~120 nodes and the whole page under ~900 generated nodes.

### Archetype catalogue (assign — adapt — but keep the silhouettes distinct)

| # | Archetype | Silhouette & named parts | Idle | Opens into |
|---|---|---|---|---|
| 1 | **Luna-class cratered moon** | Sphere with 3 terminator gradient layers; 9 craters as inset radial gradients, each with a raised rim on the sun side and a shadow on the far side; 3 low-contrast maria as irregular blobs; regolith speckle; thin dust halo | Slow axial spin so crater shadows slide; ±1.2° libration over 26s | Narrative/goal blocks |
| 2 | **Ringed shepherd moon** | Oblate body; 3 ring bands (0.55 / 0.35 / 0.18 alpha) with a Cassini-style gap at 0.72r; ring **shadow cast on the body** (a 0.25-alpha arc band); ring particles as a `stroke-dasharray:2 3` fine dash | Ring plane precesses ±0.4° over 40s while the body spins slowly | Long lists (the 13-school list) |
| 3 | **Comms satellite** | Boxy bus with gold-foil solar texture; twin solar wings that **track the planet** (JS sets their rotation, ~0.05 rpm, so foreshortening reads as 3D); 2-axis dish in its own `<g>` with a 0.6° hunting oscillation; 3 whip antennas; a magnetometer boom (hairline + tip dot); RTG shroud with 3 fins; propulsion bell with a 6-frame plume puff when the body transits | Dish hunts, wings hold sun-lock, beacon strobes | Metrics / stats blocks |
| 4 | **Crewed station** | 6 modules in a T on a lattice truss; 4 solar wings (12 visible cells each, 0.5px seams); ridged white radiators; a cupola with warm interior glow; 2 docked capsules (one Progress-style cylinder + cone, one Dragon-style with a folded nose); a 7-segment robotic arm that sways 1.2° and gently tracks the open panel's scroll; offset red/green nav strobes; micrometeoroid scuffs | Whole station yaws ±8°; the arm has its own slow cycle | Cluster pages with many items (14 extracurricular cards, 89 program cards) |
| 5 | **Deep-space probe (Voyager-class)** | 10-sided bus with concentric-seam High Gain Antenna on 3 struts; three booms — science, RTG (finned cylinder with faint bloom), magnetometer; crumpled thermal-blanket texture with a specular highlight | 0.2 rpm roll; the dish stays locked on the planet | Honors / recognition / long-range reference |
| 6 | **Lander + descent stage** | Octagonal deck with gold-foil blanket; 4 legs (footpad + 2 diagonal struts each) whose pistons micro-breathe; a stowed rover under the deck (3 wheels + mast visible); 2 thruster clusters with a landing dust cone; soot streaking on the deck | Legs breathe; plume puffs only when transiting | Plans, phases, pipelines (Operation Liftoff, the 6-step application pipeline) |
| 7 | **3-stage launch vehicle** | Stacked stages with fins, an interstage stripe, and a lattice escape tower at the nose; black/white quadrant roll pattern; soot near the base; RCS nozzle marks | Hovers nose-up with the planet as "down"; ±2° gimbal; exhaust shimmer only while transiting | Ladders / sequences (junior-year AP ladder, training progressions) |
| 8 | **Cubesat swarm** | 4–7 six-unit cubesats flying in formation — each with its own accent tint, whip antennas, and a tiny camera port; per-body drift phase; a shared faint formation envelope line | Collective drift with per-body noise | Small item groups (4-tile KPI strips, 4-rule lists) |
| 9 | **Solar sail / light probe** | 4 triangular sail quadrants on a translucent film (0.14 alpha, stars show through) with 4 thinner booms, a pin-size central bus, one beacon; a light-pressure tumble (one full turn / 48s, always slightly inclined) | Quadrant shear ±0.8° with a slow low-frequency ripple | Reflective, aspirational blocks (North Star, strategic pillars) |
| 10 | **Orbital tug + tethered cargo pallet** | Tug with a single engine bell and a docking clamp with a sequenced approach light; cargo pallet of stacked crates (each crate a slightly different tint and scale, 0.4px straps, per-crate stencil); a 12px tether with 4 beads | Gravity-gradient pair counter-rotates around its barycenter, tether taut and pointing at the planet | Tabular data (schedule grids, the compact college table, documents) |
| 11 | **Heavy freighter (container hauler)** | Long spine hull, blunt nose, 4 engine bells, radiator winglets, and stacks of containers **grouped and colour-coded by category**; each stack is cradled by a visible clamp frame; hull scorched along the flight axis | Very slow yaw; clamps micro-shift; bells idle-cool | The 89-program deadlines grid — one container group per program `type` |

Assign archetypes by content kind, deterministically (a `kind → archetype` map), and honour `data-orb-as="probe"` overrides in the page HTML. If a page yields more than **6** closed bodies, cluster into an **inner belt** (primary content) and **outer belt** (reference material) rather than shrinking art — legibility wins.

## 5 · Page-by-page launch manifest (this is the actual inventory — no guesswork)

| Page | Source blocks | Bodies |
|---|---|---|
| `mission.html` | `mission__cols` → 3 columns | North Star → **solar sail**; short-term goals → **comms satellite**; medium/long-term → **deep-space probe** |
| `studies.html` | `.kpis` (4 tiles); `grid2 > panel` 1 (coursework table); `panel` 2 has 5 `h3.mini-h` clusters | KPI strip → **cubesat swarm**; coursework → **tug + cargo pallet**; state assessments → **lander**; honors & recognition → **Voyager probe**; SAT → **comms satellite**; graduation profile → **ringed shepherd moon**; junior-year ladder → **3-stage rocket** |
| `college.html` | `rows.unis` (13 schools); 2 `panel`s; `tbl--compact`; `phases` | Target list → **ringed shepherd moon**; strategic pillars → **solar sail**; compact table → **cargo pallet**; Operation Liftoff phases → **lander** |
| `applications.html` | `rows.steps` (6 steps); 2 `panel`s | 6-step pipeline → **tug + 6 numbered crates**; current applications → **crewed station**; documents → **comms satellite** |
| `extracurriculars.html` | `rows.ecards` (14 cards) | → **crewed station**, 14 docked modules/pallets; if the page has category headings, group by category into at most 4 bodies |
| `schedule.html` | `toggle`; 2 `sched` grids; `rules` (4); `legend` | School/summer grid → **cargo hauler, one pallet per grid** (keep the toggle **inside** the open panel header as a small switch plate); rules → **cubesat swarm**; legend → **beacon buoy** |
| `meal.html` | `.kpis` (4); 5 `panel`s | KPI strip → **cubesat swarm**; panels → **moon / lander / tug / probe / solar sail** by content kind |
| `training.html` | 2 `prog` grids (14 cards); 4 `panel`s | Workout grids → **crewed station** + **cargo hauler**; panels → **moon / lander / probe** |
| `deadlines.html` | generated `dl` grid (89 program cards) + existing `#dlDock` | Program grid → **heavy freighter**, one colour-coded container group per program `type`; `#dlDock` stays exactly as it is, but docks to the freighter's plate while open and tucks away when closed (its existing behavior must not change) |
| `footer.foot` | — | **Not a body.** Becomes **Ground Control**: normal flow *below* the 100dvh orbit stage (prev/next planet + return to sol). Reachable by scrolling only while no panel is open, because Lenis is stopped while one is — so the stage ends the page like a gravity well. |

## 6 · Interaction & state machine

- **Closed (default).** Planet at centre, all bodies closed on their belts, each slowly orbiting with its own phase. `nav.rail`, `.nav`, `#progress` unchanged. Document still scrolls (Lenis active) so the footer / Ground Control is reachable.
- **Hover/focus.** Reticle draws (4 corner brackets + a rotating dashed ring, 180ms), body brightness +6%, port indicator lights, label plate warms, and the belt trace under that body brightens. Hovering also **slows that body's orbit to 30%** so it can be clicked accurately — and it must still be clickable while moving (never trap the pointer).
- **Open (click / `Enter` / `Space`)** — three beats, calm and mechanical:
  1. **Lock-on (~220ms)** — scale 1.04, reticle snaps, one soft click cue line appears in the label ("docking…").
  2. **Transit (~420ms)** — the body flies its shortest path to the panel anchor while its siblings ease into the vacated slot (60ms stagger), the planet recedes (`scale .86`, `blur 6px`, `brightness .55`), the belts dim to 0.35, and background bodies stop orbiting.
  3. **Unfurl (~300ms)** — the real content block is revealed: the panel clip-path opens from the body's own silhouette, the body shrinks into the panel's header as a live thumbnail of the same SVG, and its label crossfades into a breadcrumb (`02 · Coursework — 9th & 10th`).
- **The panel.** Fixed, centred, `max-width: min(760px, 92vw)`, `max-height: 82vh`, its own inner scroll container with `overscroll-behavior: contain; touch-action: pan-y`, a sticky header (thumbnail + title + `✕`), and a footer strip with `← previous body` / `next body →`. **Lenis is stopped while open** (so the stage behind cannot scroll away) and started again on close. The panel scrolls internally, never the document.
- **Close** — `✕`, `Esc`, or clicking the void outside the panel (with a 260ms "outside click still armed" guard so an accidental click right after opening doesn't close it). Reverse animation runs at **0.7×** the open duration; the body returns to its slot and resumes its idle; siblings close ranks. If the content block was scrolled, its scroll position is remembered per body.
- **Keyboard** — Tab order follows belt order; bodies are button-semantics with `aria-expanded`; `Esc` closes and returns focus to the body; `←`/`→` (and `[`/`]`) open the previous/next body directly without closing first; `Home` returns focus to the core plate; the deadlines dock's own keys (`/`, `j k`, `x`, `Home`, `End`) work when its freighter is open.
- **Deep link** — opening sets `#orb-<planet>-<index>` via `history.replaceState`; loading a page with that hash opens that body after the intro; closing removes the hash. No new history entries (back must still leave the page).
- **Intro (once per session, never a loading screen)** — on first arrival, bodies launch from behind the planet over 900ms with spring easing and staggered by 70ms, then settle into orbit. Skipped under reduced motion and skipped entirely when `bw.orbit.intro.v1` was already set within the last 30 minutes. Returning to a planet with session state does a 300ms **handshake highlight** on the last-opened body instead of auto-opening.

## 7 · Responsive, fallbacks, accessibility

- **`≤760px`** — one inclined belt; bodies 40% smaller (min art 56px); only the nearest 3–4 slots legible at a time; the belt is drag-rotatable (a 120px/s flick advances a slot; the nearest slot snaps) and tap opens. The panel becomes a bottom sheet with a drag-to-dismiss handle.
- **`≤480px`** — the open state is a full-screen sheet; a persistent `✕` and a visible body count ("3 of 6").
- **`prefers-reduced-motion`** — bodies sit in static slots around the planet, no drift/spin/flutter, open and close are instant cross-fades, no intro. Content must be just as reachable.
- **No WebGL / no CDN / scene threw (`window.__scene3d.ok === false`)** — orbit around the viewport centre with a nominal radius and a soft accent glow standing in for the planet; everything else works.
- **No JS** — the plain stacked page (unchanged).
- **A11y** — the orbit layer is a `<nav>`-free landmark-free decoration except the bodies themselves: each body is a real focusable control with a readable accessible name (`"{index}. {title} — open"` processed state), the panel is `role="dialog" aria-modal="true"` with `aria-labelledby` on its title, focus is trapped while open and restored on close, state changes are announced through one polite live region ("Panel opened: Coursework"), and body art is `aria-hidden`. Never rely on colour or motion alone to signal "closed" — the label plate states it ("closed" → "docked").
- **Moved-block hygiene** — when a block becomes a body, neutralize the page's scroll-reveal classes on it and its descendants (`.reveal`, `.flip3d`, and any GSAP-driven initial `opacity:0`) so an opened panel can never be blank; after moving, assert the opened panel's own computed opacity is 1. Countdowns (`.live-cd`, `data-deadline`) must keep ticking after the move — verify by watching a countdown change inside an open freighter.

## 8 · Performance budget

- Only one RAF loop for the orbit rig, and it **pauses** when `document.hidden`, when the intro is done and all bodies are in steady orbit (positions written once per phase change is fine if you can express the idle as a CSS animation on an inner element while the belt position is static between open/close events), and always under reduced motion.
- Idle motion: CSS transform/opacity only. No layout-triggering properties, no `getBoundingClientRect` per frame, no `filter: blur()` accumulation across many large layers (blur only on the planet backdrop and only while a panel is open).
- Target: no long task > 50ms on load, layout count during idle ≈ 0, and the closed swarm animating at 60fps on a 2019 MacBook Air with the Three.js scene also running.
- Everything the layer adds is removed on `pagehide`, and never survives navigation (matching the `#dlDock` teardown pattern).

## 9 · Definition of done — verify all of it yourself, then report honestly

Run the site locally (`python3 -m http.server 8000`) and drive it in a real browser. For **each of the nine planet pages**:

1. Closed state: planet visible, every content block present as a distinct body, no two silhouettes alike, labels legible, nothing overlapping the nav/rail, no console errors.
2. Open **every** body on the page, one by one: content is complete and identical to the source block, no blank panels, tables/lists intact, countdowns still ticking, dock filters/ticks/keyboard still working on `deadlines.html`.
3. Close returns the block to its exact original DOM position and order (`outerHTML` order unchanged; `git diff --stat` on the nine HTML files shows only the added `<link>`/`<script>` tags and optional `data-orb-*` hints).
4. Keyboard-only pass: Tab → Enter → Esc → arrows → focus restoration. Screen-reader name/role/state spot-check.
5. Deep link: open a body, copy the URL, reload — same body opens; `Esc` removes the hash; browser Back leaves the page (no history spam).
6. `390×844` viewport: belt drag/tap, sheet, dismiss, nothing clipped.
7. Emulate `prefers-reduced-motion: reduce`: static slots, usable, no intro.
8. Stub out WebGL (`window.__scene3d = {ok:false}`) — the layout still works around a glow.
9. Disable JS entirely — the pages are still clean stacked documents (screenshot).
10. `git diff --stat index.html` → empty. No new dependencies in `package.json`. No build step added. Works over `file://`.
11. Report measured evidence (not vibes): idle frame rate, layout/task timings, and a screenshot of at least three different bodies per page family. List anything you could not verify instead of claiming it passes.

## 10 · Do not

- Add npm packages, a bundler, a framework, or a build step.
- Touch `index.html`, rewrite or shorten any copy, or move content into JS strings.
- Clone content nodes, or move rows/`li` out of their parents.
- Convert the site to an SPA or replace the cross-document View Transitions.
- Put `transform`/`filter`/`will-change` on `html`/`body` (it breaks the fixed panel and `#dlDock`).
- Draw the bodies on a canvas, or make them image sprites — the labels must be real text.
- Break the deadline dock's keyboard map, applied ticks (`bw.deadlines.applied.v1`), filters or empty-state, or the schedule/training toggles.
- Add a loading screen, or hide content with CSS before JS runs.
- Ship a body that is just a circle with a gradient. If it doesn't read as a real machine at 96px, it isn't done.

Deliverables: `css/orbit.css`, `js/orbit.js`, small additive edits to `js/scene.js` (planet screen anchor + sun direction), the nine planet pages wired up, and a README section documenting the orbit config, grouping rules, archetype map and keyboard map.
