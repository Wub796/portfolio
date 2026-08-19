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

  function closeMenu() {
    var toggle = document.getElementById("navToggle");
    var links = document.getElementById("navLinks");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (links) links.classList.remove("is-open");
  }

  document.addEventListener("click", function (e) {
    var warpLink = e.target.closest ? e.target.closest('a[data-warp]') : null;
    if (warpLink) {
      var href = warpLink.getAttribute("href");
      if (!href || href === "#" || href.indexOf(".html") === -1 && href.indexOf("/") === -1) return;
      e.preventDefault();
      closeMenu();
      try { sessionStorage.setItem("bw-last-planet", currentPlanet); } catch (err) { /* ignore */ }
      if (vtSupported) {
        /* cross-document View Transition — browser morphs old → new, zero flash */
        window.location.href = href;
      } else {
        /* fallback: themed warp overlay covers the swap */
        if (navFade) navFade.classList.add("is-on");
        setTimeout(function () { window.location.href = href; }, 260);
      }
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
     CURSOR — big liquid blob (buttermax style) + afterimage trail
     ------------------------------------------------------------ */
  var glow = document.getElementById("glow");
  var comet = document.getElementById("comet");
  var cctx = comet ? comet.getContext("2d") : null;
  var trail = [];
  function sizeComet() { if (comet) { comet.width = window.innerWidth; comet.height = window.innerHeight; } }
  if (comet) sizeComet();
  window.addEventListener("resize", sizeComet);

  if (finePointer && !reducedMotion && glow) {
    document.body.classList.add("has-cursor");
    var blob = document.getElementById("cursorBlob");
    if (!blob) {
      blob = document.createElement("div");
      blob.id = "cursorBlob";
      blob.className = "cursor-blob";
      blob.setAttribute("aria-hidden", "true");
      document.body.appendChild(blob);
    }
    var mx = -100, my = -100, bx = -100, by = -100, gx = -100, gy = -100, moved = false;
    window.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      if (!moved) { moved = true; blob.style.opacity = ""; }
      if (cctx) trail.push({ x: mx, y: my, t: performance.now() });
      if (trail.length > 24) trail.shift();
    }, { passive: true });
    blob.style.opacity = "0";
    function follow() {
      bx += (mx - bx) * 0.14; by += (my - by) * 0.14;
      gx += (mx - gx) * 0.05; gy += (my - gy) * 0.05;
      /* the blob elongates along motion — liquid trailing feel */
      var vx = mx - bx, vy = my - by;
      var dist = Math.sqrt(vx * vx + vy * vy);
      var ang = Math.atan2(vy, vx);
      var st = Math.min(0.55, dist * 0.007);
      blob.style.transform = "translate(" + bx + "px," + by + "px) translate(-50%,-50%) rotate(" + ang + "rad) scale(" + (1 + st) + "," + (1 - st * 0.5) + ")";
      glow.style.transform = "translate(" + gx + "px," + gy + "px) translate(-50%,-50%)";
      if (cctx) {
        /* fading blob afterimages */
        cctx.clearRect(0, 0, comet.width, comet.height);
        cctx.globalCompositeOperation = "lighter";
        var now = performance.now();
        for (var i = 0; i < trail.length; i++) {
          var a = (now - trail[i].t) / 360;
          if (a > 1) continue;
          var alpha = (1 - a) * 0.3;
          var r = 15 * (1 - a) + 3;
          cctx.fillStyle = "rgba(" + accentRgb[0] + "," + accentRgb[1] + "," + accentRgb[2] + "," + alpha + ")";
          cctx.beginPath();
          cctx.arc(trail[i].x, trail[i].y, r, 0, Math.PI * 2);
          cctx.fill();
        }
        cctx.globalCompositeOperation = "source-over";
      }
      requestAnimationFrame(follow);
    }
    follow();
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest && e.target.closest("a, button, [role='tab'], .dl-card__head")) blob.classList.add("is-big");
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest && e.target.closest("a, button, [role='tab'], .dl-card__head")) blob.classList.remove("is-big");
    });

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

  /* arrival warp flash — fire once, right after paint */
  var warp = document.getElementById("warp");
  if (warp && !reducedMotion) {
    warp.style.setProperty("--wc", accentHex);
    setTimeout(function () {
      warp.classList.add("is-active");
      setTimeout(function () { warp.classList.remove("is-active"); }, 850);
    }, 180);
  }
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
     CREATIVE TEXT — per-letter titles + cascading content blocks
     ------------------------------------------------------------ */
  function splitChars(el) {
    if (!el || el.dataset.split) return;
    el.dataset.split = "1";
    var frag = document.createDocumentFragment();
    var ci = 0;
    Array.prototype.forEach.call(el.childNodes, function (node) {
      if (node.nodeType === 3) {
        node.textContent.split("").forEach(function (c) {
          if (c === " ") { frag.appendChild(document.createTextNode(" ")); return; }
          var s = document.createElement("span");
          s.className = "ch";
          s.style.transitionDelay = ci * 38 + "ms";
          s.textContent = c;
          frag.appendChild(s);
          ci++;
        });
      } else {
        frag.appendChild(node.cloneNode(true));
      }
    });
    el.textContent = "";
    el.appendChild(frag);
  }

  function ensureReveal(el) {
    if (el.classList.contains("reveal")) return;
    el.classList.add("reveal");
    if (reducedMotion) el.classList.add("is-in");
    else if (io) io.observe(el);
  }

  function cascadeChildren(container, base) {
    if (!container || container.classList.contains("cascade")) return;
    container.classList.add("cascade");
    ensureReveal(container);
    Array.prototype.forEach.call(container.children, function (child, idx) {
      child.style.transitionDelay = Math.min(560, idx * 55 + (base || 0)) + "ms";
    });
  }

  document.querySelectorAll(".hero__l1, .hero__l2, .sec__title").forEach(splitChars);

  document.querySelectorAll(".kpis, .rows, .phases, .split, .rules, .stack").forEach(function (el) {
    cascadeChildren(el, 0);
  });
  var dlGridEl = document.getElementById("dlGrid");
  if (dlGridEl) cascadeChildren(dlGridEl, 160);
})();
