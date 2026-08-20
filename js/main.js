/* ============================================================
   BENJAMIN WU SYSTEM — shared UI for every page.
   One page per planet. Clicking any [data-warp] link records
   the current planet in sessionStorage, then hands the browser
   a cross-document View Transition (CSS @view-transition) so
   the old page morphs into the new one with no flash; older
   browsers get a themed warp overlay instead. The new page's
   3D scene then flies the camera from the previous planet.
   ============================================================ */
(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var currentPlanet = document.body.dataset.planet || "sol";

  function accentCSS() {
    /* read from a body descendant so the body[data-planet] override wins */
    var el = document.getElementById("cursorDot") || document.body;
    return (getComputedStyle(el).getPropertyValue("--accent") || "").trim() || "#a26833";
  }
  function hexRgb(hex) {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  var accentHex = accentCSS();
  var accentRgb = hexRgb(accentHex);

  /* ------------------------------------------------------------
     FLUID — generative milk-tea sky behind the solar system.
     Each planet gets its own seed (same palette family, own
     composition); the dark deadlines planet gets a dark palette.
     Vendored from github.com/enonforetsam/fluid (fluid-bg).
     ------------------------------------------------------------ */
  var FLUID_BASE = "0.35,1.1,3,0.02,1,8,0,8";
  var FLUID_TAIL = ",0,0,1.7778,0,0,1,0,0,0,0,0,9072207,11574627,14203285,16053467,0,0,0,0,0,0,0";
  var FLUID_DARK_TAIL = ",0,0,1.7778,0,0,10,0,0,0,0,0,1247764,2826016,6045484,13214563,0,0,0,0,0,0,0";
  var FLUID_SEEDS = { sol: 1, mission: 2, studies: 3, college: 4, applications: 5, extracurriculars: 6, schedule: 7, meal: 8, training: 9, deadlines: 10 };
  var fluidHash = "#p=" + FLUID_BASE + "," + (FLUID_SEEDS[currentPlanet] || 1) + (currentPlanet === "deadlines" ? FLUID_DARK_TAIL : FLUID_TAIL);
  if (window.FluidBg) {
    var fluidLayer = document.getElementById("fluidLayer");
    if (fluidLayer) {
      try { window.__fluid = window.FluidBg.fluidBackground(fluidLayer, { hash: fluidHash }); }
      catch (err) { console.warn("fluid background disabled:", err); }
    }
  }

  /* ------------------------------------------------------------
     DEADLINES — from the "Updated Program List & Timelines".
     Dates kept verbatim as provided; countdowns computed live.
     ------------------------------------------------------------ */
  var DEADLINES = [
    {
      org: "U.S. House of Representatives",
      name: "Congressional App Challenge",
      type: "Competition",
      status: "countdown",
      primary: "2026-10-26T16:00:00-04:00",
      events: [
        ["Registration opens", "Annually in May"],
        ["Submission deadline", "Oct 26, 2026 · 12:00 PM ET"],
        ["Judging & announcements", "Nov – Dec"],
      ],
      note: "GridEvac AI entered — demo video + codebase submitted.",
    },
    {
      org: "NASA",
      name: "NASA HUNCH — Software & Hardware Engineering",
      type: "Competition",
      status: "open",
      events: [
        ["Registration / kickoff", "Aug – Sep (now open)"],
        ["Preliminary Design Review", "Oct – Nov"],
        ["Critical Design Review", "Feb – Mar"],
        ["Final review / national showcase", "Apr"],
      ],
      note: "Rocketry program track — ties into the custom flight logger.",
    },
    {
      org: "CEE · MIT",
      name: "Research Science Institute (RSI)",
      type: "Research Program",
      status: "countdown",
      primary: "2027-01-15T23:59:00-05:00",
      events: [
        ["Applications open", "Sep / Oct 2026"],
        ["Application deadline", "Mid-Jan 2027"],
        ["Program dates", "Late Jun – early Aug (6 weeks)"],
      ],
      note: "Rising-senior only — apply winter of junior year.",
    },
    {
      org: "Yale University",
      name: "Yale Young Global Scholars (YYGS)",
      type: "Summer Program",
      status: "countdown",
      primary: "2026-11-15T23:59:00-05:00",
      events: [
        ["Applications open", "Sep 2026"],
        ["Early Action deadline", "Mid-Nov 2026"],
        ["Regular Decision deadline", "Early Jan 2027"],
        ["Sessions", "Three 2-week sessions · Jun – Jul"],
      ],
      note: "Must be 16 by Jul 19, 2026.",
    },
    {
      org: "Houston-area science fairs",
      name: "Science & Engineering Fair of Houston (SEFH)",
      type: "Competition",
      status: "countdown",
      primary: "2027-01-25T23:59:00-06:00",
      events: [
        ["Project registration", "Late Jan / early Feb"],
        ["Fair competition", "Mid-to-late Feb"],
        ["ISEF advancement announced", "Mar"],
      ],
      note: "SEFH → ISEF advancement path.",
    },
    {
      org: "MIT Lincoln Laboratory",
      name: "MIT Beaver Works Summer Institute (BWSI)",
      type: "Summer Program",
      status: "countdown",
      primary: "2027-04-15T23:59:00-04:00",
      events: [
        ["Self-registration & prereq access", "Late Jan / early Feb"],
        ["Summer application deadline", "Mid-Apr"],
        ["Program dates", "Jul (4 weeks)"],
      ],
      note: "Target: Autonomous Air Vehicle Racing / Unmanned Air System tracks.",
    },
    {
      org: "UT Austin · NASA",
      name: "STEM Enhancement in Earth Science (SEES)",
      type: "Research Program",
      status: "closed",
      primary: "2026-02-22T23:59:00-06:00",
      events: [
        ["Applications open", "Dec / Jan"],
        ["Application deadline", "Feb 22 (2026 cycle)"],
        ["Distance learning modules", "May 15 – Jul 1"],
        ["On-site residency / symposium", "Jul 5 – Jul 21"],
      ],
      note: "Given deadline passed — next cycle applies early Spring 2027 per master plan.",
    },
    {
      org: "Lumos",
      name: "Lumos Fellows",
      type: "Fellowship",
      status: "rolling",
      events: [
        ["Application window", "Rolling — seasonal cohorts"],
        ["Program duration", "6-week cohort accelerator"],
      ],
      note: "Rolling admissions across seasonal cohorts.",
    },
    {
      org: "Boston University",
      name: "BU Research in Science & Engineering (RISE)",
      type: "Research Program",
      status: "countdown",
      primary: "2027-02-04T23:59:00-05:00",
      events: [
        ["Application window opens", "Dec 15, 2026"],
        ["Student deadline", "Feb 4 · 11:59 PM EST"],
        ["Recommendation letters", "Feb 11"],
        ["Decisions", "6–8 weeks post-deadline"],
        ["Program dates", "Jun 28 – Aug 7 (6 weeks)"],
      ],
      note: "Discipline benchmark: student forms by Feb 4, recommenders by Feb 11.",
    },
    {
      org: "UIUC WYSE",
      name: "Illinois Aerospace Institute (IAI) Camp",
      type: "Summer Program",
      status: "countdown",
      primary: "2027-03-25T23:59:00-05:00",
      events: [
        ["Application opens", "Early Feb"],
        ["Priority deadline", "Late Mar"],
        ["Decision notifications", "Late Apr – early May"],
        ["Session dates", "Two 1-week sessions · Jul"],
      ],
      note: "Given session dates Jul 12–18 & Jul 26–Aug 1 (2026) — next cycle Jul 2027.",
    },
    {
      org: "AIA / NAR",
      name: "American Rocketry Challenge (TARC)",
      type: "Rocketry Competition",
      status: "countdown",
      primary: "2026-12-31T23:59:00-05:00",
      events: [
        ["Registration", "Sep – Dec"],
        ["Qualifying flights due", "Apr"],
        ["National finals", "May"],
      ],
      note: "High-power rocketry — pairs with HPR L1 cert and NASA SLI.",
    },
    {
      org: "Caltech · JPL",
      name: "Caltech Summer Secondary Student Science Program",
      type: "Research Program",
      status: "countdown",
      primary: "2027-02-15T23:59:00-05:00",
      events: [
        ["Deadlines", "Feb"],
      ],
      note: "Space science & planetary engineering research with Caltech/JPL faculty.",
    },
    {
      org: "NASA · Texas",
      name: "High School Aerospace Scholars (HAS)",
      type: "Summer Program",
      status: "open",
      events: [
        ["Registration", "Aug – Oct"],
        ["Online course", "Junior year"],
        ["JSC residency", "Jun – Jul"],
      ],
      note: "Requires nomination from a State Legislator — letter drafted.",
    },
    {
      org: "Columbia University",
      name: "Columbia Pre-College — Engineering & Applied Science",
      type: "Pre-College",
      status: "countdown",
      primary: "2027-04-01T23:59:00-04:00",
      events: [
        ["Deadlines", "Feb – Apr"],
        ["Sessions", "Jun – Aug"],
      ],
      note: "Aerospace systems, mechanical engineering, and CS coursework.",
    },
    {
      org: "Harvard University",
      name: "Harvard Secondary School Program (SSP)",
      type: "Pre-College",
      status: "countdown",
      primary: "2027-04-30T23:59:00-04:00",
      events: [
        ["Deadlines", "Apr"],
        ["Sessions", "Jun – Aug"],
      ],
      note: "College-credit coursework — physics, computing, aerospace mechanics.",
    },
    {
      org: "UPenn · Wharton",
      name: "Management & Technology Summer Institute (M&TSI)",
      type: "Summer Program",
      status: "countdown",
      primary: "2027-02-01T23:59:00-05:00",
      events: [
        ["Deadline", "Feb 1"],
        ["Program", "Jul"],
      ],
      note: "Engineering prototyping + technological management — Penn Engineering × Wharton.",
    },
  ];

  /* ------------------------------------------------------------
     LENIS — smooth scrolling
     ------------------------------------------------------------ */
  var lenis = null;
  if (window.Lenis && !reducedMotion) {
    lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  function scrollToY(y) {
    if (lenis) lenis.scrollTo(y, { offset: -72, duration: 1.2 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  }

  /* ------------------------------------------------------------
     SCROLL TELEMETRY — progress bar + feeds the 3D scene
     ------------------------------------------------------------ */
  window.__scrollVel = 0;
  var lastY = 0, lastT = performance.now();
  function trackScroll(y) {
    var now = performance.now();
    var dt = now - lastT;
    var v = dt > 80 ? 0 : ((y - lastY) / Math.max(4, dt)) * 16.6;
    window.__scrollVel += (v - window.__scrollVel) * 0.18;
    lastY = y; lastT = now;
  }

  /* ------------------------------------------------------------
     NAVIGATION — warp between planets, no flash.
     ------------------------------------------------------------ */
  var vtSupported = typeof document.startViewTransition === "function";
  var navFade = document.getElementById("navFade");
  var exitLock = false;

  function closeMenu() {
    var toggle = document.getElementById("navToggle");
    var links = document.getElementById("navLinks");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (links) links.classList.remove("is-open");
  }

  function doNavigate(href) {
    window.location.href = href;
  }

  document.addEventListener("click", function (e) {
    var warpLink = e.target.closest ? e.target.closest('a[data-warp]') : null;
    if (warpLink) {
      var href = warpLink.getAttribute("href");
      if (!href || href === "#" || href.indexOf(".html") === -1 && href.indexOf("/") === -1) return;
      e.preventDefault();
      closeMenu();
      if (exitLock) return;
      exitLock = true;
      try { sessionStorage.setItem("bw-last-planet", currentPlanet); } catch (err) { /* ignore */ }
      doNavigate(href);
      return;
    }
    var anchor = e.target.closest ? e.target.closest('a[data-scroll]') : null;
    if (anchor) {
      var target = document.querySelector(anchor.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      scrollToY(target.getBoundingClientRect().top + (window.scrollY || 0));
      closeMenu();
    }
  });

  /* ------------------------------------------------------------
     CURSOR — precision dot + liquid blob + organic 8-node fluid tail
     ------------------------------------------------------------ */
  var glow = document.getElementById("glow");
  var comet = document.getElementById("comet");
  if (comet) comet.style.display = "none";

  if (finePointer && !reducedMotion && glow) {
    document.body.classList.add("has-cursor");

    var dotEl = document.getElementById("cursorDot");
    var blob = document.getElementById("cursorBlob");
    if (!blob) {
      blob = document.createElement("div");
      blob.id = "cursorBlob";
      blob.className = "cursor-blob";
      blob.setAttribute("aria-hidden", "true");
      document.body.appendChild(blob);
    }

    /* ---- build 6 refined fluid trail nodes ---- */
    var TRAIL_N = 6;
    var trailDots = [];
    var trailFrag = document.createDocumentFragment();
    for (var ti = 0; ti < TRAIL_N; ti++) {
      var dot = document.createElement("div");
      dot.className = "cursor-trail";
      dot.setAttribute("aria-hidden", "true");
      var s = 1 - (ti + 1) / (TRAIL_N + 1.2);
      var size = Math.round(26 * s);
      var op = (0.42 * Math.pow(s, 1.4)).toFixed(3);
      dot.style.cssText = "position:fixed;top:0;left:0;pointer-events:none;border-radius:50%;z-index:" + (298 - ti) + ";" +
        "width:" + size + "px;height:" + size + "px;opacity:" + op + ";" +
        "background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.55) 0%,rgba(" + accentRgb.join(",") + ",.45) 50%,transparent 78%);" +
        "box-shadow:0 0 10px rgba(" + accentRgb.join(",") + ",.2);" +
        "filter:blur(" + (0.8 + ti * 0.4).toFixed(1) + "px);will-change:transform;transform:translate(-100px,-100px)";
      trailFrag.appendChild(dot);
      trailDots.push({ el: dot, x: -100, y: -100 });
    }
    document.body.appendChild(trailFrag);

    /* ---- state ---- */
    var mx = -100, my = -100, dx = -100, dy = -100, bx = -100, by = -100, gx = -100, gy = -100;
    var moved = false, followT = 0;

    window.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      if (!moved) {
        moved = true;
        blob.style.opacity = "";
        if (dotEl) dotEl.style.opacity = "";
      }
    }, { passive: true });
    blob.style.opacity = "0";
    if (dotEl) dotEl.style.opacity = "0";

    /* ---- animation loop ---- */
    function follow() {
      var now = performance.now();
      var dt = Math.min(45, now - (followT || now));
      followT = now;

      /* precision dot tracks tightly */
      if (window.anime && anime.utils && anime.utils.damp) {
        dx = anime.utils.damp(dx, mx, 36, dt); dy = anime.utils.damp(dy, my, 36, dt);
        bx = anime.utils.damp(bx, mx, 18, dt); by = anime.utils.damp(by, my, 18, dt);
        gx = anime.utils.damp(gx, mx, 5, dt);  gy = anime.utils.damp(gy, my, 5, dt);
      } else {
        dx += (mx - dx) * 0.45; dy += (my - dy) * 0.45;
        bx += (mx - bx) * 0.2;  by += (my - by) * 0.2;
        gx += (mx - gx) * 0.05; gy += (my - gy) * 0.05;
      }

      if (dotEl) dotEl.style.transform = "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px) translate(-50%,-50%)";

      /* squash-stretch along velocity */
      var vx = mx - bx, vy = my - by;
      var dist = Math.sqrt(vx * vx + vy * vy);
      var ang = Math.atan2(vy, vx);
      var st = Math.min(0.4, dist * 0.006);
      blob.style.transform = "translate(" + bx.toFixed(1) + "px," + by.toFixed(1) + "px) translate(-50%,-50%) rotate(" + ang.toFixed(3) + "rad) scale(" + (1 + st).toFixed(3) + "," + (1 - st * 0.4).toFixed(3) + ")";
      glow.style.transform = "translate(" + gx.toFixed(1) + "px," + gy.toFixed(1) + "px) translate(-50%,-50%)";

      /* trail dots follow in a smooth chained stream */
      var prevX = bx, prevY = by;
      for (var i = 0; i < TRAIL_N; i++) {
        var d = trailDots[i];
        var dampRate = Math.max(6, 20 - i * 2);
        if (window.anime && anime.utils && anime.utils.damp) {
          d.x = anime.utils.damp(d.x, prevX, dampRate, dt);
          d.y = anime.utils.damp(d.y, prevY, dampRate, dt);
        } else {
          var ease = 0.25 - i * 0.025;
          d.x += (prevX - d.x) * ease;
          d.y += (prevY - d.y) * ease;
        }

        var curDist = Math.sqrt(Math.pow(d.x - prevX, 2) + Math.pow(d.y - prevY, 2));
        var nodeScale = (0.8 + Math.min(0.4, curDist * 0.02)).toFixed(2);
        d.el.style.transform = "translate(" + d.x.toFixed(1) + "px," + d.y.toFixed(1) + "px) translate(-50%,-50%) scale(" + nodeScale + ")";
        prevX = d.x;
        prevY = d.y;
      }

      requestAnimationFrame(follow);
    }
    follow();

    /* ---- interactive states ---- */
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest && e.target.closest("a, button, [role='tab'], .dl-card__head, .cta, .row, .uni")) {
        blob.classList.add("is-big");
        if (dotEl) dotEl.classList.add("is-hidden");
      }
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest && e.target.closest("a, button, [role='tab'], .dl-card__head, .cta, .row, .uni")) {
        blob.classList.remove("is-big");
        if (dotEl) dotEl.classList.remove("is-hidden");
      }
    });
    document.addEventListener("mousedown", function () {
      blob.classList.add("is-down");
    });
    document.addEventListener("mouseup", function () {
      blob.classList.remove("is-down");
    });

    /* ---- 3D tilt on cards ---- */
    var tiltEls = Array.prototype.slice.call(document.querySelectorAll(".row, .uni"));
    tiltEls.forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transitionDuration = "0.12s";
        el.style.transform = "perspective(700px) rotateX(" + (-py * 7).toFixed(2) + "deg) rotateY(" + (px * 9).toFixed(2) + "deg) translateZ(0)";
      });
      el.addEventListener("mouseleave", function () {
        el.style.transitionDuration = "";
        el.style.transform = "";
      });
    });
  }

  /* ------------------------------------------------------------
     NAV — solid state, mobile menu, progress bar, rail
     ------------------------------------------------------------ */
  var nav = document.getElementById("nav");
  var progressBar = document.getElementById("progressBar");
  var navToggle = document.getElementById("navToggle");
  var navLinksEl = document.getElementById("navLinks");
  var railNodes = Array.prototype.slice.call(document.querySelectorAll(".rail__node"));

  if (navToggle && navLinksEl) {
    navToggle.addEventListener("click", function () {
      var open = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!open));
      navLinksEl.classList.toggle("is-open", !open);
    });
  }

  /* mark the current planet on the rail + nav */
  railNodes.forEach(function (node) {
    if (node.getAttribute("data-planet") === currentPlanet) node.classList.add("is-cur");
  });
  var navLinksArr = Array.prototype.slice.call(document.querySelectorAll(".nav__links a"));
  navLinksArr.forEach(function (a) {
    var href = a.getAttribute("href") || "";
    var mine = href.replace(".html", "").replace("/", "");
    if (mine === currentPlanet || (currentPlanet === "sol" && mine === "index")) a.classList.add("is-active");
  });

  function onScroll() {
    var y = window.scrollY || 0;
    trackScroll(y);
    if (nav) nav.classList.toggle("is-solid", y > 24);
    if (progressBar) {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      progressBar.style.width = (max > 0 ? y / max : 0) * 100 + "%";
    }
  }
  if (lenis) lenis.on("scroll", function (e) { onScroll(); });
  else window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* warp flash disabled — clean, instant page load */
  var warp = document.getElementById("warp");
  if (warp) warp.style.display = "none";
  /* browsers without View Transitions: fade the warp overlay OUT on
     arrival so the new page emerges from the dark instead of popping in */
  if (navFade) {
    if (!vtSupported) {
      var arrived = false;
      try { arrived = !!sessionStorage.getItem("bw-last-planet"); } catch (err) { /* ignore */ }
      if (arrived) {
        navFade.classList.add("is-on");
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { navFade.classList.remove("is-on"); });
        });
      }
    } else {
      navFade.classList.remove("is-on");
    }
  }

  /* ------------------------------------------------------------
     REVEAL — staggered cascade so content never just appears
     ------------------------------------------------------------ */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  var revealCount = 0;
  if ("IntersectionObserver" in window && !reducedMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.style.transitionDelay = Math.min(420, revealCount * 60) + "ms";
          revealCount++;
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -30px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ------------------------------------------------------------
     HOUSTON CLOCK (home only)
     ------------------------------------------------------------ */
  var clock = document.getElementById("houstonClock");
  function tickClock() {
    try {
      clock.textContent = new Date().toLocaleTimeString("en-US", {
        timeZone: "America/Chicago", hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
      });
    } catch (e) { /* leave as-is */ }
  }
  if (clock) { tickClock(); setInterval(tickClock, 1000); }

  /* ------------------------------------------------------------
     SCHEDULE TOGGLE (schedule page)
     ------------------------------------------------------------ */
  var modeSchool = document.getElementById("modeSchool");
  var modeSummer = document.getElementById("modeSummer");
  var tableSchool = document.getElementById("tableSchool");
  var tableSummer = document.getElementById("tableSummer");
  function setMode(summer) {
    modeSchool.classList.toggle("is-on", !summer);
    modeSummer.classList.toggle("is-on", summer);
    modeSchool.setAttribute("aria-selected", String(!summer));
    modeSummer.setAttribute("aria-selected", String(summer));
    tableSchool.hidden = summer;
    tableSummer.hidden = !summer;
  }
  if (modeSchool && modeSummer) {
    modeSchool.addEventListener("click", function () { setMode(false); });
    modeSummer.addEventListener("click", function () { setMode(true); });
  }

  /* ------------------------------------------------------------
     DEADLINES — accordion + live countdowns (deadlines page)
     ------------------------------------------------------------ */
  function pad(n) { return String(n).padStart(2, "0"); }

  function renderCountdown(statusEl, countEl, target) {
    var now = Date.now();
    var diff = target - now;
    var numEl = countEl.querySelector(".c-num");
    var lblEl = countEl.querySelector(".c-lbl");
    if (diff <= 0) {
      statusEl.textContent = "Cycle closed";
      statusEl.className = "dl-card__status s-closed";
      if (numEl) numEl.textContent = "0";
      if (lblEl) lblEl.textContent = "deadline passed";
      return;
    }
    var days = Math.floor(diff / 86400000);
    var hrs = Math.floor((diff % 86400000) / 3600000);
    var mins = Math.floor((diff % 3600000) / 60000);
    var secs = Math.floor((diff % 60000) / 1000);
    if (numEl) numEl.textContent = pad(days);
    if (lblEl) lblEl.textContent = "d " + pad(hrs) + "h " + pad(mins) + "m " + pad(secs) + "s · until deadline";

    if (diff <= 60 * 86400000) {
      statusEl.textContent = "Deadline soon";
      statusEl.className = "dl-card__status s-soon";
    } else {
      statusEl.textContent = "Application open";
      statusEl.className = "dl-card__status s-open";
    }
  }

  var grid = document.getElementById("dlGrid");
  if (grid) {
    DEADLINES.forEach(function (p, i) {
      var card = document.createElement("article");
      card.className = "dl-card";

      var head = document.createElement("button");
      head.className = "dl-card__head";
      head.type = "button";
      head.setAttribute("aria-expanded", "false");

      var idx = document.createElement("span");
      idx.className = "dl-card__idx";
      idx.textContent = "0" + (i + 1);

      var t = document.createElement("span");
      t.className = "dl-card__t";
      var tb = document.createElement("b");
      tb.textContent = p.name;
      var ti = document.createElement("i");
      ti.textContent = p.org + " · " + p.type;
      t.appendChild(tb);
      t.appendChild(ti);

      var status = document.createElement("span");
      status.className = "dl-card__status";

      var count = document.createElement("span");
      count.className = "dl-card__count";
      var cNum = document.createElement("span");
      cNum.className = "c-num";
      cNum.textContent = "--";
      var cLbl = document.createElement("span");
      cLbl.className = "c-lbl";
      count.appendChild(cNum);
      count.appendChild(cLbl);

      var plus = document.createElement("span");
      plus.className = "dl-card__plus";
      plus.textContent = "+";
      plus.setAttribute("aria-hidden", "true");

      if (p.status === "rolling") {
        status.textContent = "Rolling";
        status.classList.add("s-rolling");
        cLbl.textContent = "apply anytime";
        cNum.textContent = "∞";
      } else if (p.primary) {
        var target = new Date(p.primary).getTime();
        status.dataset.target = String(target);
        renderCountdown(status, count, target);
      } else {
        status.textContent = "Window open";
        status.classList.add("s-open");
        cLbl.textContent = "no fixed deadline";
        cNum.textContent = "◈";
      }

      head.appendChild(idx);
      head.appendChild(t);
      head.appendChild(status);
      head.appendChild(count);
      head.appendChild(plus);

      var body = document.createElement("div");
      body.className = "dl-card__body";
      body.hidden = true;

      var dates = document.createElement("div");
      dates.className = "dl-card__dates";
      p.events.forEach(function (ev) {
        var row = document.createElement("span");
        var b = document.createElement("b");
        b.textContent = ev[0] + ":";
        row.appendChild(b);
        row.appendChild(document.createTextNode(" " + ev[1]));
        dates.appendChild(row);
      });
      body.appendChild(dates);

      if (p.note) {
        var note = document.createElement("p");
        note.className = "dl-card__note";
        note.textContent = p.note;
        body.appendChild(note);
      }

      head.addEventListener("click", function () {
        var open = body.hidden;
        body.hidden = !open;
        card.classList.toggle("is-open", open);
        head.setAttribute("aria-expanded", String(open));
      });

      card.appendChild(head);
      card.appendChild(body);
      grid.appendChild(card);
    });
  }

  setInterval(function () {
    var els = document.querySelectorAll(".dl-card__status[data-target]");
    for (var i = 0; i < els.length; i++) {
      var st = els[i];
      var t = Number(st.dataset.target);
      var card = st.closest(".dl-card");
      var countEl = card ? card.querySelector(".dl-card__count") : null;
      if (countEl) renderCountdown(st, countEl, t);
    }
  }, 1000);

  /* ------------------------------------------------------------
     ANIME ORCHESTRA — the rest of anime.js v4, wired in everywhere.

     1. MAGNETIC CTA   — anime.utils.damp pulls the button toward the
                         cursor; spring easing blooms its shadow.
     2. STAT COUNTERS  — anime.animate + onUpdate count hero numbers up.
     3. SCRAMBLE LINKS — scrambleText modifier on the `text` property
                         for every nav / CTA / footer link hover.
     4. SCROLL SCRUB   — paused createTimeline for the hero, the system
                         map and the giant footer type, linked to
                         ScrollObserver (anime.onScroll + sync), so
                         scroll position scrubs the motion directly.
     5. MOTION-PATH COMET — svg.createMotionPath rides the ellipse in
                         the system map forever.
     6. AMBIENT DUST   — createSeededRandom scatters motes, each one a
                         looping animation with random duration/delay.

     Each feature is individually guarded — one failure can never
     take the page down with it.
     ------------------------------------------------------------ */
  if (window.anime && !reducedMotion) {

    /* ---- 1. MAGNETIC CTA ---- */
    Array.prototype.forEach.call(document.querySelectorAll(".cta"), function (cta) {
      if (!finePointer) return;
      var curX = 0, curY = 0, tx = 0, ty = 0, magnetOn = false, rafId = 0, lastT = 0;
      function magnetLoop() {
        var now = performance.now();
        var dt = Math.min(50, now - (lastT || now));
        lastT = now;
        curX = anime.utils.damp(curX, tx, 15, dt);
        curY = anime.utils.damp(curY, ty, 15, dt);
        if (Math.abs(curX - tx) > 0.05 || Math.abs(curY - ty) > 0.05 || magnetOn) {
          cta.style.transform = "translate(" + curX.toFixed(2) + "px," + curY.toFixed(2) + "px)";
          rafId = requestAnimationFrame(magnetLoop);
        } else {
          rafId = 0;
          cta.style.transform = "";
        }
      }
      cta.addEventListener("mouseenter", function () {
        try {
          anime.animate(cta, {
            boxShadow: ["8px 8px 0 rgb(" + accentRgb.join(",") + ")", "14px 14px 0 rgb(" + accentRgb.join(",") + ")"],
            duration: 600,
            easing: anime.spring({ stiffness: 160, damping: 14 }),
          });
        } catch (err) { /* shadow spring is decorative */ }
      });
      cta.addEventListener("mousemove", function (e) {
        var r = cta.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var reach = Math.max(r.width, r.height) * 0.9;
        var dx = e.clientX - cx, dy = e.clientY - cy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        magnetOn = true;
        if (dist > reach) { tx = 0; ty = 0; return; }
        var pull = 1 - dist / reach;
        tx = dx * 0.22 * pull;
        ty = dy * 0.22 * pull;
        if (!rafId) magnetLoop();
      });
      cta.addEventListener("mouseleave", function () {
        magnetOn = false; tx = 0; ty = 0;
        if (!rafId) magnetLoop();
      });
    });

    /* ---- 2. STAT COUNTERS ---- */
    var statBs = Array.prototype.slice.call(document.querySelectorAll(".hero__stats b"));
    statBs = statBs.filter(function (b) {
      if (b.id === "houstonClock") return false;
      return /^\d+(\.\d+)?$/.test((b.textContent || "").trim());
    });
    if (statBs.length) {
      var statData = statBs.map(function (b) {
        var txt = b.textContent.trim();
        var dot = txt.indexOf(".");
        var frac = dot > -1 ? txt.length - dot - 1 : 0;
        return { el: b, target: parseFloat(txt), frac: frac };
      });
      function formatStat(d, v) { return d.frac ? v.toFixed(d.frac) : String(Math.round(v)); }
      function countUp(d) {
        var counter = { v: 0 };
        try {
          anime.animate({
            targets: counter,
            v: [0, d.target],
            duration: 1500,
            delay: 320,
            easing: "easeOutExpo",
            onUpdate: function () { d.el.textContent = formatStat(d, counter.v); },
          });
        } catch (err) { return; }
        /* safety — a stalled engine must never leave a zero on screen */
        setTimeout(function () {
          if (parseFloat(d.el.textContent) < d.target * 0.95) {
            d.el.textContent = formatStat(d, d.target);
          }
        }, 3400);
      }
      if ("IntersectionObserver" in window) {
        var statIO = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            var d = statData.filter(function (s) { return s.el === en.target; })[0];
            if (!d) return;
            statIO.unobserve(en.target);
            countUp(d);
          });
        }, { threshold: 0.5 });
        statData.forEach(function (d) { statIO.observe(d.el); });
      } else {
        statData.forEach(countUp);
      }
    }

    /* ---- 3. SCRAMBLE LINKS ---- */
    var scrambleBusy = new WeakMap();
    function scrambleIn(el) {
      if (scrambleBusy.get(el)) return;
      var original = (el.textContent || "").trim();
      if (!original) return;
      scrambleBusy.set(el, true);
      try {
        anime.animate(el, {
          text: { value: original, modifier: anime.scrambleText({ duration: 640, revealDelay: 60 }) },
          duration: 640,
          easing: "linear",
        });
      } catch (err) { /* text property unsupported here — hover stays plain */ }
      setTimeout(function () { scrambleBusy.set(el, false); }, 780);
    }
    document.addEventListener("mouseover", function (e) {
      var a = e.target && e.target.closest ? e.target.closest(".nav__links a, .nav__brand, .cta__large, .foot__sol a") : null;
      if (a) scrambleIn(a);
    });

    /* ---- 4. SCROLL SCRUB (ScrollObserver + linked paused timeline) ---- */
    function scrubTimeline(sel, addMotion, thresholds) {
      var target = document.querySelector(sel);
      if (!target) return;
      var tl = anime.createTimeline({ autoplay: false });
      var added = addMotion(tl, target);
      if (!added) return;
      try {
        var params = { target: sel, linked: tl, sync: true };
        if (thresholds) { params.enter = thresholds[0]; params.leave = thresholds[1]; }
        anime.onScroll(params);
      } catch (err) { /* scrub is decorative; never fatal */ }
    }
    /* hero content drifts down + dims as the first screen scrolls away */
    scrubTimeline(".hero", function (tl, hero) {
      var inner = hero.querySelector(".hero__inner");
      if (!inner) return false;
      tl.add(inner, { translateY: [0, 70], opacity: [1, 0], duration: 1000, easing: "linear" }, 0);
      return true;
    }, ["top top", "bottom top"]);
    /* the system map tilts + rises as you approach it */
    scrubTimeline(".sys-sec", function (tl, sec) {
      var sys = sec.querySelector(".sys");
      if (!sys) return false;
      tl.add(sys, { translateY: [0, -34], rotate: [0, 2.4], duration: 1000, easing: "linear" }, 0);
      return true;
    });
    /* the giant footer type slides as the footer crosses the screen */
    scrubTimeline(".foot", function (tl, foot) {
      var giant = foot.querySelector(".foot__giant");
      if (!giant) return false;
      tl.add(giant, { translateX: [0, "-7%"], rotate: [0, 1.4], duration: 1000, easing: "linear" }, 0);
      return true;
    });

    /* ---- 5. MOTION-PATH COMET ---- */
    var sysMap = document.querySelector(".sys");
    if (sysMap && anime.svg && anime.svg.createMotionPath) {
      var SVGNS = "http://www.w3.org/2000/svg";
      var orbitSvg = document.createElementNS(SVGNS, "svg");
      orbitSvg.setAttribute("viewBox", "0 0 100 100");
      orbitSvg.setAttribute("class", "sys__orbitpath");
      orbitSvg.setAttribute("aria-hidden", "true");
      var orbitPath = document.createElementNS(SVGNS, "path");
      orbitPath.setAttribute("d", "M50,50 m-47,0 a47,31 0 1,1 94,0 a47,31 0 1,1 -94,0");
      orbitPath.setAttribute("fill", "none");
      orbitSvg.appendChild(orbitPath);
      sysMap.appendChild(orbitSvg);
      var comet = document.createElement("div");
      comet.className = "sys__comet";
      comet.setAttribute("aria-hidden", "true");
      sysMap.appendChild(comet);
      try {
        var mp = anime.svg.createMotionPath(orbitPath);
        anime.animate(comet, {
          translateX: mp.translateX,
          translateY: mp.translateY,
          rotate: mp.rotate,
          duration: 16000,
          loop: true,
          easing: "linear",
        });
      } catch (err) { /* comet stays parked */ }
    }
  }
})();
