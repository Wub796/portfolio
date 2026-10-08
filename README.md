# Benjamin Wu — The System

A personal site that is literally a **solar system**: one page per planet. `index.html` is the **Sun** (hero + orbital system map), and every section — mission, studies, college plan, application process, extracurriculars, daily schedule, meal plan, training, deadlines — is its own page, its own planet, with its own accent color and its own framing of one **continuous WebGL world**.

All content (studies, college plan, application process, extracurriculars, daily schedule, meal plan, training plan, and summer-program deadlines) is distilled from the Second Brain vault and the "Updated Program List & Timelines." The newest pass syncs the site against the September 2026 vault records — the completed two-page resume, the 10-activity Common App list, and the September 2026 email digests.

## The experience

- **One shared 3D system.** Every page boots the same Three.js world: a sun at the origin, nine planets on live tilted orbits, star shells, nebulae, and a velocity-reactive comet. Clicking any `data-warp` link records your current planet in `sessionStorage`, then the *next* page's camera starts at the planet you left and **flies to the new planet** — hyperspace streaks, comet, and bloom surge during the flight. You never leave the system.
- **No loading screen, no flash.** Navigation is a **cross-document View Transition** (`@view-transition: navigation auto` in the CSS) — the old page morphs into the new one with a smooth zoom/blur warp. Browsers without support get a themed dark overlay instead of a white flash.
- **Per-planet identity.** Each page tints the whole UI (cursor, comet trail, links, progress bar, selection) to its planet's milk-tea accent; the deadlines planet is the dark one (`#222123`), the footer is a dark brutalist close with prev/next planet navigation, and an orbit rail on the left shows where you are.

## Stack

- **Plain HTML + CSS + JS** — no build step, no framework. 10 static pages.
- **[Lenis](https://github.com/darkroomengineering/lenis)** (v1.3.26, vendored at `vendor/lenis.min.js`) — smooth scrolling per page, synced through GSAP's ticker for a single jitter-free RAF loop.
- **[anime.js](https://animejs.com/) v4.5** (vendored at `vendor/anime.min.js`) — the motion engine behind springs, scramble text, and motion paths: `utils.damp` springs (+ cursor blob), `spring` easing (shadow bloom), `animate` + `onUpdate` (hero stat counters), `scrambleText` (link hovers), `ScrollObserver` + paused `createTimeline` (scroll-scrubbed hero / system map / giant footer type), `svg.createMotionPath` (the comet orbiting the system map), and `createSeededRandom` (ambient dust). Every effect is individually guarded — a failure can never break a page.
- **[GSAP](https://github.com/greensock/GSAP)** v3.12.7 + ScrollTrigger (vendored at `vendor/gsap.min.js`, `vendor/ScrollTrigger.min.js`) — scroll-driven section reveals, per-character hero text entrance (vanilla SplitText utility), velocity-reactive marquee, 3D tilt cards, and spotlight cursor glow. Visual effects inspired by [React Bits](https://github.com/DavidHDev/react-bits) (`TiltedCard`, `SpotlightCard`, `ScrollVelocity`, `BlurText`), recreated in vanilla JS. Design craft informed by [jakubkrehel/skills](https://github.com/jakubkrehel/skills) (concentric radii, OKLCH tokens, modular type scales), [ibelick/ui-skills](https://github.com/ibelick/ui-skills) (baseline-ui, motion perf), [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) (web design guidelines), and [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (design system patterns).
- **[Three.js](https://threejs.org/)** via CDN importmap (three@0.160.1 + UnrealBloomPass) — the shared solar system; the renderer is transparent so it floats inside the generative sky; degrades silently (no WebGL/CDN → clean static site; `prefers-reduced-motion` → single static frame).
- **[Fluid](https://github.com/enonforetsam/fluid) (`fluid-bg`, vendored at `vendor/fluid-bg.iife.js`)** — a live generative WebGL sky behind the whole site, themed per planet: a calm tan-to-cream flow field on the light pages, a deep near-black-to-amber smoke field on the dark deadlines planet. Each planet gets its own seed so every page has its own composition; pauses when hidden and respects `prefers-reduced-motion`.
- **Planet coronas** (pure CSS in `css/style.css`) — each section-header orb gets a soft two-layer atmospheric halo tinted by its own `--pc` accent plus a slow-breathing drift and tactile surface texture; zero canvases, zero recurring GPU frame costs, static under `prefers-reduced-motion`.
- **Design language**: the "milk tea" palette of [Fullstack-Empire/GSAP-Awwwards-Website](https://github.com/Fullstack-Empire/GSAP-Awwwards-Website) (cream `#e9dfce`, browns `#523122`/`#a26833`/`#e3a458`/`#7f3b2d`, near-black `#222123`), an Awwwards-informed editorial type pairing of **Rader** for display and **General** for reading copy, brutalist borders/shadows from [prashantkoirala465/web-development-portfolio](https://github.com/prashantkoirala465/web-development-portfolio), structure from [adrianhajdin/award-winning-website](https://github.com/adrianhajdin/award-winning-website), and igloo/buttermax motion.
- Fonts (Antonio, Rader, Formula-Narrow, Supply-Mono, Zentry, General, Circular, Robert) vendored at `assets/fonts/` — no external font requests.

## Pages

| Body | Page | Content |
|---|---|---|
| SOL | `index.html` | hero (sun), marquee, orbital system map, mission teaser |
| 01 | `mission.html` | North Star, short/medium/long-term goals |
| 02 | `studies.html` | transcript, EOC results, 2026 honors (Space Center U, NASA TAS Launch Pad, AP Scholar with Distinction), junior-year ladder |
| 03 | `college.html` | 13-school target list, strategic pillars, Operation Liftoff phases |
| 04 | `applications.html` | 6-step pipeline, current applications, documents |
| 05 | `extracurriculars.html` | Sea Cadets, volleyball, research, rocketry + business clubs, YMCA lifeguarding, EMERGE cohort leadership, honors |
| 06 | `schedule.html` | school-year ⇄ summer week grid, rules |
| 07 | `meal.html` | calorie cycling, lipid-safe rules, bone stack |
| 08 | `training.html` | day-by-day workouts, height unlock |
| 09 | `deadlines.html` | 89 programs, competitions, internships, exchanges, and global opportunities with live countdowns, an applied checklist, and the floating orbit dock (dark planet) |

## Orbital Dock

The nine planet pages load [css/orbit.css](css/orbit.css) and the dependency-free classic script [js/orbit.js](js/orbit.js). Sol's HTML is unchanged. The actual existing router swaps `main` client-side; additive `bw:page-leave` / `bw:page-ready` events in [js/main.js](js/main.js) destroy/reinitialize the rig, including arrivals from Sol. Real links and the existing cross-document CSS fallback remain intact.

### Manifest and grouping

`ORBIT_CONFIG` is the ordered per-planet manifest: `{id, title, archetype, source}`. A source is a selector, an array of selectors for a chest, or `{heading: selector}` for a heading and its following siblings up to the next mini-heading. Selectors are all resolved before grouping, so runtime wrappers cannot change positional matching. Only whole panels, tables, lists, grids or heading clusters move—never individual rows or list items. Missing sources abort enhancement and restore the readable document.

A manifest entry may instead declare `each: selector`, which fans one line out into **one body per matched element** — the only way a list of peers becomes a swarm without hand-listing every index. `each` entries take an `archetypes` array cycled across the matches so neighbours never share a silhouette, and `titleSel` names the descendant that supplies each label (here `.row__name`).

Mission has three ports (North Star plus anti-goals, short-term, combined medium/long-term). Studies has seven ports; College four; Applications three; **Extracurriculars is fourteen separate spacecraft** — one per `.row.ecard`, each with its own machine and its own name plate, so every activity is an independent body rather than cargo in one station; Schedule four; Meal six; Training six; Deadlines one freighter carrying the entire generated grid and its empty state. Paired schedule/workout ports share one chest and the original toggle, select their mode on docking, and keep both grids available inside the panel.

`data-orb-title` overrides the label. Otherwise the manifest title, own/preceding mini-heading, element ID, or planet/index provides it (42-character label limit, original copy untouched). `data-orb-as` overrides the art. The deterministic kind map is narrative→moon, list→ringed, metrics→swarm, reference→probe, plan→lander, sequence→rocket, reflective→sail, table→tug, cluster→station, programs→freighter, legend→buoy. Explicit manifest archetypes are used where the launch inventory calls for a specific machine.

Each payload keeps its parent, next sibling and a comment return anchor. Grouped chests additionally preserve an anchor for each original node. Opening moves the actual node and the actual SVG into the reading panel, and closing returns them; no content or SVG cloning. Reveal effects are neutralized only while docked. The deadline navigator is the same existing node, temporarily attached to the reading panel's switch plate; its key map, filters, applied storage and countdown intervals stay owned by the original code.

### Controls and state

- Tab follows port order; Enter/Space dock; Escape or ✕ undock and restore focus. The modal traps focus and makes its background inert.
- Left/Right or `[`/`]` step between ports without closing first. Home focuses the core plate while closed.
- Deadline freighter: `/` search; ↑/↓ or j/k navigate; Home/End first/last program; x toggles applied. Escape clears a focused search first; a second Escape closes the ship.
- At narrow widths the belt becomes a four-port front window, because a small deck cannot hold fourteen bodies without running into the page title. Phones put it on a tall arc, and 761–1100px on a circular one (an ellipse would bunch the ports together at its flat bottom). Swiping or stepping rotates which ports are on stage; tap a visible port. The sheet handle can be pulled down or activated to dismiss. At ≤480px the reading sheet fills the viewport.
- `#orb-<planet>-<1-based index>` is replaced, never pushed, into history. Reload restores a deep-linked panel only once its planet is in view. Session key `bw.orbit.state.v1` stores the last port per planet, not auto-open. There is no staggered launch or intro timeout.

The cached `__getOrbitAnchor()` in [js/scene.js](js/scene.js) publishes projected planet centre/radius and screen-space sun direction at 10Hz. The projection also supplies the planet `slug`, `visible`, and approach `scale`. A live planet must be in front of the camera, centred inside the viewport, and at least 60% of its resting apparent radius before the belt becomes visible and interactive. The entire belt fades in together, already orbiting, and shares the planet's final approach scale; there is no per-body spawn animation. Starting another camera flight invalidates the old projection and hides the old belt synchronously. An offscreen or stale live projection never becomes a viewport-centred fallback. A genuinely failed scene/CDN uses an accent globe at viewport centre; a still-loading module waits for scene readiness rather than a fixed reveal timer. Steady port motion uses compositor Web Animations and CSS transforms/opacity, no rig RAF loop or recurring bounding-box reads. Motion is now complete inclined elliptical revolutions (inner belts faster), with upright labels, hover slowing to 30%, and pointer-down locking. Far-side scale/dimming and a small projected limb mask create depth. A body's whole footprint comes from two custom properties on `.orb__body` (`--orb-art`, `--orb-plate`), so it is sized — not rescaled — and the label keeps full 11px legibility. Bodies are deliberately small against the planet and sit on up to two belts whose radial gap always exceeds a body width; both belt radii also clear the planet's projected disc and glow, so the planet never covers an element. Belt radii are derived from the planet's *live* projected radius and re-placed when that radius or the planet's centre shifts materially, because a camera still arriving would otherwise leave the rig sized for a planet that is not there yet. Port 01 starts at the bottom of the belt facing the viewer. Idle measures measured across all nine pages against a real WebGL planet: every visible body outside the planet's projected disc, no two body boxes intersecting.

Ground Control owns the end of the page. When the deck is on a planet page the page's own chrome sits above the belt (`main#top` takes `z-index:4` with `pointer-events:none`, and only real controls and the footer take pointer events back), so the dark footer paints *over* the belt rather than the belt drawing across it. On top of that the belt fades to zero as the last 60% of a viewport of scroll is reached, and `orb__offstage` carries `!important` so a scrolled-away deck cannot be resurrected by the scroll handler's inline opacity. Port radii leave extra nav/rail clearance. Planet pages space Three.js world orbits 35% wider and hold the station camera until Ground Control takes over; Sol retains its original catalogue, planet sizes and framing. SVG roots carry signature idle motion because animating SVG child groups caused per-frame Chrome layout. The custom cursor recognizes orbital controls, clears locks during docking, renders above the modal, and keeps the OS pointer suppressed across the whole reading panel (`cursor:none` on `.orb__panel` and its subtree, excluding text fields) — the panel's own `cursor:pointer` rules must never outrank that. While docked the cursor chrome (dot, reticle, HUD) is also excluded from the background-inert pass, so it stays live chrome instead of inert page content. The reticle is never scaled with the CSS `scale` property: that property composes *outside* the inline `translate3d`, so a root-level `scale` would draw the crosshair at a fraction of the true pointer coordinates. Docked-state scaling targets the reticle's own ring, cross and brackets instead. Reduced motion has static slots and immediate docking. Failure/pagehide restores source ordering and removes injected UI; without JavaScript the original stacked pages remain readable.

### Panel transitions

The panel's in/out choreography lives in [css/orbit.css](css/orbit.css) as keyframes, and most of it has a non-obvious contract that a later edit can silently break:

- Opening runs `orb-unfurl`, a **polygon → polygon** clip-path interpolation from a small centred quad out to the resting notched rectangle. Closing runs `orb-fold`, whose target is the exact reverse of that quad. That target must stay a polygon with the same six points: `polygon()` → `inset()` does **not** interpolate, so an inset target makes the close snap to its end value on the first frame while the opacity still fades. The explicit `from` keeps the interpolation honest where the resting `clip-path` is `none`.
- Below 760px the panel is a bottom sheet rather than a centred card, so it uses its own `orb-sheet-in` / `orb-sheet-out` pair (`translateY(100%)` ⇄ `0`) instead of the clip animation — reusing the clip animation there made the sheet bloom out of the middle of the viewport on its way up from the bottom edge. At ≤480px the *open* animation is intentionally disabled; closing still slides.
- The `.orb__void` scrim fades in when it is revealed (the `hidden` toggle going from `display:none` to rendered restarts the animation) and fades *out* over 210ms in step with the fold, starting at its current opacity, driven by `veilFade` in [js/orbit.js](js/orbit.js) and cancelled in `finish()`. Leaving the scrim opaque until `finish()` showed roughly 450ms of bare scrim with no panel behind it, and then removed it as a hard pop.
- The rule that kills every per-part machinery animation (`.orb__art :is(.orb__machine, … .orb__cargo)`) is **load-bearing and must stay `!important`**: it is what stops a future per-part rule from silently re-enabling the per-frame Chrome layout pass across the whole deck. The per-part declarations it superseded, and their keyframes, have been deleted rather than left shadowed.
- Docking has a 120ms lock and 300ms flight, and Escape cancels either phase without a delayed panel. Closing releases on the return flight's completion with a 560ms safety timeout; hidden tabs never restart idle motion.
- Previous/next switches use one replaceable 180ms directional content animation, preserve focus on persistent panel controls, and restore each payload's scroll position immediately. The payload entrance does not also run on a switch. Single-port manifests disable previous/next.
- The mobile handle follows the pointer, short pulls settle over 180ms, and pulls over 60px dismiss from the actual release offset. Gesture cancellation settles; synthetic clicks after pulls are suppressed, including when the browser coalesces pointer movement. Vertical scrolling does not rotate the port window. Reduced-motion pulls never translate the sheet.
- Reading thumbnails are static. SVG rings and sail quadrants already carry their rotation pivots in the SVG attributes, so CSS must not add a second `transform-origin` to them.
- Reduced motion names all three roots (`.orb__layer`, `.orb__panel`, `.orb__void`) instead of only their descendants. The panel animates on the panel itself, and the scrim sits outside both trees, so the old descendant-only selectors left both of them animating.

### Verification

Run `node tests/orbit-check.mjs` with an isolated Chrome debugging listener on port 9227 and the static server on 8000. It uses Node built-ins only (no install, no build), real browser pointer/keyboard events, and writes screenshots plus measured browser metrics to `reports/orbit/`. See [the verification report](reports/orbit/REPORT.md) for results and limitations; a successful syntax check is not a substitute for that interaction pass.

`node tests/anim-probe.mjs [page]` measures the motion itself instead of reading the CSS by eye: which part animations actually apply, whether anything in steady flight animates a non-composited property, that the real close interpolates its clip-path mid-flight (rather than landing on the end value), that the scrim comes down with it, and that the bottom sheet travels the right way at both 600px and 390px. `node tests/fold-shot.mjs` freezes those same two transitions and writes the frames to `reports/orbit/diag/`.

`node tests/orbit-arrival.mjs` uses a real WebGL camera on an isolated SwiftShader listener at port 9228 to verify no spacecraft precede their planet on page clicks, revisits, lazy arrivals from Sol, mobile, and reduced motion. It also holds the scene module request for over two seconds to verify slow loading does not trigger a false fallback. Results are in [arrival.json](reports/orbit/arrival.json). This is correctness evidence, not GPU-performance evidence.

`node tests/motion-refinements.mjs` covers interruption, rapid switching, focus retention, SVG bounds, reading-position restoration, real pointer sheet gestures, live reduced-motion changes, teardown, and compositor-only idle motion. It writes [motion-refinements.json](reports/orbit/motion-refinements.json) and captures desktop / mid-drag screenshots. Both this suite and `anim-probe` exit nonzero on failed assertions.

Note that both probes read computed styles from discrete evaluate calls: querying a paused animation's `transform` from inside one long-running page expression returns stale values in headless Chrome, so sampling has to cross the CDP boundary.

## Run

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

Or just open `index.html` directly (navigation works from `file://` too — every link is a real `.html` file).

## Deploy to Vercel

**Zero config** — the repo is a static folder.

1. Push this folder to GitHub (or any git host).
2. In Vercel: **Add New → Project → Import** the repo.
3. Framework preset: **Other** (leave build command empty, output directory empty).
4. Deploy. `vercel.json` adds immutable caching for fonts and vendored assets.

Or from the CLI: `npx vercel` (deploys the static folder as-is).

## Editing content

- Deadlines live in `DEADLINES` at the top of `js/main.js` — dates render exactly as written, countdowns compute live against the visitor's clock. The list combines the EMERGE Target College Database, a full scan of the uploaded 41-page program spreadsheet, and the September 2026 vault additions (Sea Cadet National Council, HVA Elite Academy, TxCAN, Diamond Challenge, SXSW EDU, Blue Ocean, Paradigm), including STEM research, AI/CS, aerospace/electrical/mechanical engineering, business/entrepreneurship, internships, competitions, and international opportunities. Set `primaryKind: "opens"` when only an application-open date is published (the card counts down to the window opening instead of a deadline), and `link` to add a program-page link to the expanded card.
- The deadlines list is also a checklist: every row carries a tick rail that marks a program as applied, keyed by program name (so marks survive reordering) and stored in `localStorage` under `bw.deadlines.applied.v1`. The dock surfaces the tally — click it to filter to marked programs, use the ✕ beside it (which asks once) to clear every mark, or press `x` to tick the card you last stepped to. Marks are per-browser; no account or server is involved.
- The floating deadline dock (`#dlDock`) is injected into `<body>` by `js/main.js`, gated to the deadlines planet by `body:not([data-planet="deadlines"]) .dl-dock{display:none}`, and removed when the planet changes so its observers and scroll loop never outlive the page. Its keyboard map: `/` search, `↑ ↓ j k` step, `Home` `End` jump, `x` mark applied, `Esc` clear search.
- The dock never strands you in an empty filter: a result set of zero collapses the grid to no height, so while nothing matches it stays awake off the deck's own section and the footer stops tucking it away — the only way back out of that filter is right there. The empty panel (`#dlEmpty`) names what emptied the list (search term, applied marks, field) and reveals a `Show every program` button (`#dlReset`) only while something is narrowing the list; each transition into emptiness is announced through the dock's live region.
- Any element with a `data-deadline` attribute (ISO date) renders a live ticking countdown; college phases marked with `data-phase-start` / `data-phase-end` mark themselves live, and the schedule page auto-selects school/summer by the calendar and highlights the current CT row.
- Schedule grids are static tables in `schedule.html` (two tables, toggled by `#modeSchool` / `#modeSummer`).
- Planet config (colors, orbit radius, speed, camera framing) lives in the `P` catalogue at the top of `js/scene.js`.
- The shared page shell (nav, rail, footer) is duplicated per page — edit all copies or generate from one template.
- Per-planet accent tinting lives in `css/style.css` (`body[data-planet="…"]` rules).

## Credits

- [Lenis — darkroomengineering](https://github.com/darkroomengineering/lenis)
- [GSAP — greensock / Webflow](https://github.com/greensock/GSAP)
- [React Bits — DavidHDev](https://github.com/DavidHDev/react-bits) (visual reference for TiltedCard, SpotlightCard, ScrollVelocity, BlurText effects)
- [agent-skills — vercel-labs](https://github.com/vercel-labs/agent-skills) · [ui-skills — ibelick](https://github.com/ibelick/ui-skills) · [skills — jakubkrehel](https://github.com/jakubkrehel/skills) · [ui-ux-pro-max-skill — nextlevelbuilder](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (design craft guidelines)
- [GSAP-Awwwards-Website — Fullstack-Empire](https://github.com/Fullstack-Empire/GSAP-Awwwards-Website) · [award-winning-website — adrianhajdin](https://github.com/adrianhajdin/award-winning-website) · [web-development-portfolio — prashantkoirala465](https://github.com/prashantkoirala465/web-development-portfolio) · [shutterkif-oss.github.io](https://github.com/shutterkif-oss/shutterkif-oss.github.io) · [fluid — enonforetsam](https://github.com/enonforetsam/fluid) · [igloo.inc](https://www.igloo.inc/) · [buttermax.net](https://buttermax.net/)
- Content: Second Brain vault (Benjamin Wu) — refreshed against the completed résumé, Common App activity list, and September 2026 email digests
