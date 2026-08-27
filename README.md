# Benjamin Wu — The System

A personal site that is literally a **solar system**: one page per planet. `index.html` is the **Sun** (hero + orbital system map), and every section — mission, studies, college plan, application process, extracurriculars, daily schedule, meal plan, training, deadlines — is its own page, its own planet, with its own accent color and its own framing of one **continuous WebGL world**.

All content (studies, college plan, application process, extracurriculars, daily schedule, meal plan, training plan, and summer-program deadlines) is distilled from the Second Brain vault and the "Updated Program List & Timelines."

## The experience

- **One shared 3D system.** Every page boots the same Three.js world: a sun at the origin, nine planets on live tilted orbits, star shells, nebulae, and a velocity-reactive comet. Clicking any `data-warp` link records your current planet in `sessionStorage`, then the *next* page's camera starts at the planet you left and **flies to the new planet** — hyperspace streaks, comet, and bloom surge during the flight. You never leave the system.
- **No loading screen, no flash.** Navigation is a **cross-document View Transition** (`@view-transition: navigation auto` in the CSS) — the old page morphs into the new one with a smooth zoom/blur warp. Browsers without support get a themed dark overlay instead of a white flash.
- **Per-planet identity.** Each page tints the whole UI (cursor, comet trail, links, progress bar, selection) to its planet's milk-tea accent; the deadlines planet is the dark one (`#222123`), the footer is a dark brutalist close with prev/next planet navigation, and an orbit rail on the left shows where you are.

## Stack

- **Plain HTML + CSS + JS** — no build step, no framework. 10 static pages.
- **[Lenis](https://github.com/darkroomengineering/lenis)** (v1.3.26, vendored at `vendor/lenis.min.js`) — smooth scrolling per page.
- **[anime.js](https://animejs.com/) v4.5** (vendored at `vendor/anime.min.js`) — the motion engine behind the whole experience: `utils.damp` springs (+ cursor blob), `spring` easing (shadow bloom), `animate` + `onUpdate` (hero stat counters), `scrambleText` (link hovers), `ScrollObserver` + paused `createTimeline` (scroll-scrubbed hero / system map / giant footer type), `svg.createMotionPath` (the comet orbiting the system map), and `createSeededRandom` (ambient dust). Every effect is individually guarded — a failure can never break a page.
- **[Three.js](https://threejs.org/)** via CDN importmap (three@0.160.1 + UnrealBloomPass) — the shared solar system; the renderer is transparent so it floats inside the generative sky; degrades silently (no WebGL/CDN → clean static site; `prefers-reduced-motion` → single static frame).
- **[Fluid](https://github.com/enonforetsam/fluid) (`fluid-bg`, vendored at `vendor/fluid-bg.iife.js`)** — a live generative WebGL sky behind the whole site, themed per planet: a calm tan-to-cream flow field on the light pages, a deep near-black-to-amber smoke field on the dark deadlines planet. Each planet gets its own seed so every page has its own composition; pauses when hidden and respects `prefers-reduced-motion`.
- **Design language**: the "milk tea" palette of [Fullstack-Empire/GSAP-Awwwards-Website](https://github.com/Fullstack-Empire/GSAP-Awwwards-Website) (cream `#e9dfce`, browns `#523122`/`#a26833`/`#e3a458`/`#7f3b2d`, near-black `#222123`), **Antonio** display type, brutalist borders/shadows from [prashantkoirala465/web-development-portfolio](https://github.com/prashantkoirala465/web-development-portfolio), structure from [adrianhajdin/award-winning-website](https://github.com/adrianhajdin/award-winning-website), and igloo/buttermax motion.
- Fonts (Antonio, Rader, Formula-Narrow, Supply-Mono, Zentry, General, Circular, Robert) vendored at `assets/fonts/` — no external font requests.

## Pages

| Body | Page | Content |
|---|---|---|
| SOL | `index.html` | hero (sun), marquee, orbital system map, mission teaser |
| 01 | `mission.html` | North Star, short/medium/long-term goals |
| 02 | `studies.html` | transcript, EOC results, junior-year ladder |
| 03 | `college.html` | 12-school target list, strategic pillars, Operation Liftoff phases |
| 04 | `applications.html` | 6-step pipeline, current applications, documents |
| 05 | `extracurriculars.html` | Sea Cadets, volleyball, research, projects, honors |
| 06 | `schedule.html` | school-year ⇄ summer week grid, rules |
| 07 | `meal.html` | calorie cycling, lipid-safe rules, bone stack |
| 08 | `training.html` | day-by-day workouts, height unlock |
| 09 | `deadlines.html` | 21 programs with live countdowns (dark planet) |

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

- Deadlines live in `DEADLINES` at the top of `js/main.js` — dates render exactly as written, countdowns compute live against the visitor's clock.
- Any element with a `data-deadline` attribute (ISO date) renders a live ticking countdown; college phases marked with `data-phase-start` / `data-phase-end` mark themselves live, and the schedule page auto-selects school/summer by the calendar and highlights the current CT row.
- Schedule grids are static tables in `schedule.html` (two tables, toggled by `#modeSchool` / `#modeSummer`).
- Planet config (colors, orbit radius, speed, camera framing) lives in the `P` catalogue at the top of `js/scene.js`.
- The shared page shell (nav, rail, footer) is duplicated per page — edit all copies or generate from one template.
- Per-planet accent tinting lives in `css/style.css` (`body[data-planet="…"]` rules).

## Credits

- [Lenis — darkroomengineering](https://github.com/darkroomengineering/lenis)
- [GSAP-Awwwards-Website — Fullstack-Empire](https://github.com/Fullstack-Empire/GSAP-Awwwards-Website) · [award-winning-website — adrianhajdin](https://github.com/adrianhajdin/award-winning-website) · [web-development-portfolio — prashantkoirala465](https://github.com/prashantkoirala465/web-development-portfolio) · [shutterkif-oss.github.io](https://github.com/shutterkif-oss/shutterkif-oss.github.io) · [fluid — enonforetsam](https://github.com/enonforetsam/fluid) · [igloo.inc](https://www.igloo.inc/) · [buttermax.net](https://buttermax.net/)
- Content: Second Brain vault (Benjamin Wu)
