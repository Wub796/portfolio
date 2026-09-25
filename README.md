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
