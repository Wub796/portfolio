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
     FLUID BACKGROUND — Disabled so 3D solar system is clean & clear
     ------------------------------------------------------------ */
  var fluidLayer = document.getElementById("fluidLayer");
  if (fluidLayer) fluidLayer.style.display = "none";

  /* ------------------------------------------------------------
     DEADLINES — Updated Program List & Timelines
     16 premier aerospace, research, and selective STEM programs
     ------------------------------------------------------------ */
  var DEADLINES = [
    {
      org: "U.S. House of Representatives",
      name: "Congressional App Challenge",
      type: "Competition",
      status: "countdown",
      primary: "2026-10-26T12:00:00-04:00",
      events: [
        ["Registration Window", "Opens annually in May"],
        ["Submission Deadline", "October 26, 2026 at 12:00 PM ET"],
        ["Judging & Announcements", "November – December"],
      ],
      note: "GridEvac AI entered — demo video + codebase submitted.",
    },
    {
      org: "NASA",
      name: "NASA HUNCH (Software & Hardware Engineering)",
      type: "Engineering Competition",
      status: "open",
      events: [
        ["Registration / Kickoff", "August – September"],
        ["Preliminary Design Reviews (PDR)", "October – November"],
        ["Critical Design Reviews (CDR)", "February – March"],
        ["Final Review / National Showcase", "April"],
      ],
      note: "Software & Hardware Engineering tracks — pairs with flight logger and payload prototyping.",
    },
    {
      org: "CEE · MIT",
      name: "Research Science Institute (RSI - CEE / MIT)",
      type: "Research Program",
      status: "countdown",
      primary: "2027-01-15T23:59:00-05:00",
      events: [
        ["Applications Open", "September / October"],
        ["Application Deadline", "Mid-January"],
        ["Program Dates", "Late June – early August (6-week summer program)"],
      ],
      note: "6-week MIT summer research program — apply winter of junior year.",
    },
    {
      org: "Yale University",
      name: "Yale Young Global Scholars (YYGS)",
      type: "Summer Program",
      status: "countdown",
      primary: "2026-11-15T23:59:00-05:00",
      events: [
        ["Applications Open", "September"],
        ["Early Action Deadline", "Mid-November"],
        ["Regular Decision Deadline", "Early January"],
        ["Session Dates", "Three 2-week residential sessions across June and July"],
      ],
      note: "Applied Science & Engineering track.",
    },
    {
      org: "Houston Science Fairs",
      name: "Science and Engineering Fair of Houston (SEFH)",
      type: "Competition",
      status: "countdown",
      primary: "2027-01-25T23:59:00-06:00",
      events: [
        ["Project Registration Deadline", "Late January / Early February"],
        ["Fair Competition Dates", "Mid-to-late February"],
        ["ISEF Advancement Announcement", "March"],
      ],
      note: "SEFH → Texas State Science Fair → Regeneron ISEF pipeline.",
    },
    {
      org: "MIT Lincoln Laboratory",
      name: "MIT Beaver Works Summer Institute (BWSI)",
      type: "Summer Program",
      status: "countdown",
      primary: "2027-04-15T23:59:00-04:00",
      events: [
        ["Self-Registration & Prerequisite Access", "Late January / Early February"],
        ["Summer Application Deadline", "Mid-April"],
        ["Program Dates", "July (4-week summer program)"],
      ],
      note: "Target: Autonomous Air Vehicle Racing / Unmanned Air Systems.",
    },
    {
      org: "UT Austin · NASA",
      name: "UT Austin STEM Enhancement in Earth Science (SEES)",
      type: "Research Program",
      status: "countdown",
      primary: "2027-02-22T23:59:00-06:00",
      events: [
        ["Applications Open", "December / January"],
        ["Application Deadline", "February 22, 2026 (Annual)"],
        ["Distance Learning Modules", "May 15 – July 1"],
        ["On-Site Residency / Virtual Symposium", "July 5 – July 21"],
      ],
      note: "NASA / CSR research internship working directly with earth & planetary scientists.",
    },
    {
      org: "Lumos",
      name: "Lumos Fellows",
      type: "Fellowship",
      status: "rolling",
      events: [
        ["Application Window", "Rolling admissions across seasonal cohorts"],
        ["Program Duration", "6-week cohort-based accelerator"],
      ],
      note: "Startup & deep tech fellowship accelerator.",
    },
    {
      org: "Boston University",
      name: "Boston University RISE (Research in Science & Engineering)",
      type: "Research Program",
      status: "countdown",
      primary: "2027-02-04T23:59:00-05:00",
      events: [
        ["Application Window", "Opens December 15"],
        ["Student Application Deadline", "February 4, 2026 at 11:59 PM EST"],
        ["Recommendation Letters Deadline", "February 11, 2026 at 11:59 PM EST"],
        ["Admissions Decisions", "6–8 weeks post-deadline (Late March / Early April)"],
        ["Program Dates", "June 28 – August 7, 2026 (6-week residential/commuter research program)"],
      ],
      note: "6-week university laboratory research under faculty mentorship.",
    },
    {
      org: "UIUC Grainger Engineering",
      name: "UIUC WYSE – Illinois Aerospace Institute (IAI) Camp",
      type: "Aerospace Camp",
      status: "countdown",
      primary: "2027-03-25T23:59:00-05:00",
      events: [
        ["Application Window", "Opens early February"],
        ["Priority Deadline", "Late March"],
        ["Decision Notifications", "Late April – early May"],
        ["Session 1 Dates", "July 12 – July 18, 2026"],
        ["Session 2 Dates", "July 26 – August 1, 2026"],
      ],
      note: "Aerodynamics, flight mechanics, propulsion & wind tunnel testing at UIUC.",
    },
    {
      org: "AIA · NAR",
      name: "The American Rocketry Challenge (TARC)",
      type: "Rocketry Competition",
      status: "countdown",
      primary: "2026-12-31T23:59:00-05:00",
      events: [
        ["Registration Window", "September – December"],
        ["Qualifying Flights Due", "April"],
        ["National Finals", "May"],
      ],
      note: "National model rocketry competition (Registration: Sep – Dec; Flights due: Apr; Finals: May).",
    },
    {
      org: "Caltech · NASA JPL",
      name: "Caltech Summer Secondary Student Science Program",
      type: "Aerospace Research",
      status: "countdown",
      primary: "2027-02-15T23:59:00-08:00",
      events: [
        ["Application Deadline", "February"],
        ["Program Dates", "Summer (6–8 weeks)"],
      ],
      note: "Space science and planetary engineering research with Caltech/JPL faculty.",
    },
    {
      org: "NASA Johnson Space Center",
      name: "NASA High School Aerospace Scholars (HAS)",
      type: "Aerospace Program",
      status: "countdown",
      primary: "2026-10-20T23:59:00-05:00",
      events: [
        ["Registration Window", "August – October"],
        ["Online Coursework", "Junior Year"],
        ["JSC On-Site Residency", "June – July"],
      ],
      note: "Online course with Johnson Space Center residential experience.",
    },
    {
      org: "Columbia University",
      name: "Columbia University Pre-College Program (Engineering & Applied Science)",
      type: "Pre-College",
      status: "countdown",
      primary: "2027-04-01T23:59:00-04:00",
      events: [
        ["Application Deadlines", "February – April"],
        ["Course Sessions", "June – August"],
      ],
      note: "Intensive coursework in aerospace systems, mechanical engineering, and CS.",
    },
    {
      org: "Harvard University",
      name: "Harvard Secondary School Program (SSP)",
      type: "Pre-College",
      status: "countdown",
      primary: "2027-04-15T23:59:00-04:00",
      events: [
        ["Application Deadlines", "April"],
        ["Course Sessions", "June – August"],
      ],
      note: "College-credit undergraduate coursework in physics, computing, and aerospace mechanics.",
    },
    {
      org: "UPenn Engineering · Wharton",
      name: "UPenn Management & Technology Summer Institute (M&TSI)",
      type: "Summer Institute",
      status: "countdown",
      primary: "2027-02-01T23:59:00-05:00",
      events: [
        ["Application Deadline", "February 1"],
        ["Program Dates", "July (3 weeks)"],
      ],
      note: "Engineering prototyping and technological management with Penn Engineering and Wharton.",
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
     EXPERIMENTAL ASTRO-NAV RETICLE, GYRO GIMBAL & TELEMETRY HUD
     ------------------------------------------------------------ */
  var glow = document.getElementById("glow");
  var cometCanvas = document.getElementById("comet");
  var cctx = cometCanvas ? cometCanvas.getContext("2d") : null;

  if (finePointer && !reducedMotion && glow) {
    document.body.classList.add("has-cursor");

    /* ---- 1. PRECISION POINTER DOT ---- */
    var dotEl = document.getElementById("cursorDot");
    if (!dotEl) {
      dotEl = document.createElement("div");
      dotEl.id = "cursorDot";
      dotEl.className = "cursor--dot";
      dotEl.setAttribute("aria-hidden", "true");
      document.body.appendChild(dotEl);
    }

    /* ---- 2. ASTRO-NAV GYRO RETICLE ---- */
    var reticle = document.getElementById("cursorReticle");
    if (!reticle) {
      reticle = document.createElement("div");
      reticle.id = "cursorReticle";
      reticle.className = "cursor-reticle";
      reticle.setAttribute("aria-hidden", "true");
      reticle.innerHTML = '<div class="cursor-reticle__ring"></div>' +
                          '<div class="cursor-reticle__cross"></div>' +
                          '<div class="cursor-reticle__brackets"></div>';
      document.body.appendChild(reticle);
    }

    /* ---- 3. LIVE TELEMETRY HUD BADGE ---- */
    var hudEl = document.getElementById("cursorHud");
    if (!hudEl) {
      hudEl = document.createElement("div");
      hudEl.id = "cursorHud";
      hudEl.className = "cursor-hud";
      hudEl.setAttribute("aria-hidden", "true");
      hudEl.innerHTML = '<b>[ORBIT]</b> 0 km/h · ' + currentPlanet.toUpperCase();
      document.body.appendChild(hudEl);
    }

    /* ---- 4. CONSTELLATION ION WAKE CANVAS ---- */
    var dpr = window.devicePixelRatio || 1;
    var cw = 0, ch = 0;
    function resizeCanvas() {
      if (!cometCanvas) return;
      cw = window.innerWidth;
      ch = window.innerHeight;
      cometCanvas.width = cw * dpr;
      cometCanvas.height = ch * dpr;
      if (cctx) cctx.scale(dpr, dpr);
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    var particles = [];
    var shockwaves = [];
    var MAX_PARTICLES = 40;

    /* ---- state ---- */
    var mx = -100, my = -100, dx = -100, dy = -100, rx = -100, ry = -100, gx = -100, gy = -100, hx = -100, hy = -100;
    var moved = false, followT = 0, lastSpawnT = 0, lastHudT = 0;
    var currentLockLabel = null;

    window.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      if (!moved) {
        moved = true;
        dotEl.style.opacity = "";
        reticle.style.opacity = "";
        hudEl.style.opacity = "";
      }
    }, { passive: true });
    dotEl.style.opacity = "0";
    reticle.style.opacity = "0";
    hudEl.style.opacity = "0";

    /* ---- animation loop ---- */
    function follow() {
      var now = performance.now();
      var dt = Math.min(45, now - (followT || now));
      followT = now;

      /* Precision dot follows mouse instantly with silky high-speed damp */
      if (window.anime && anime.utils && anime.utils.damp) {
        dx = anime.utils.damp(dx, mx, 40, dt); dy = anime.utils.damp(dy, my, 40, dt);
        rx = anime.utils.damp(rx, mx, 16, dt); ry = anime.utils.damp(ry, my, 16, dt);
        hx = anime.utils.damp(hx, mx, 9, dt);  hy = anime.utils.damp(hy, my, 9, dt);
        gx = anime.utils.damp(gx, mx, 5, dt);  gy = anime.utils.damp(gy, my, 5, dt);
      } else {
        dx += (mx - dx) * 0.45; dy += (my - dy) * 0.45;
        rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
        hx += (mx - hx) * 0.1;  hy += (my - hy) * 0.1;
        gx += (mx - gx) * 0.05; gy += (my - gy) * 0.05;
      }

      dotEl.style.transform = "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px) translate(-50%,-50%)";

      /* Velocity & attitude angle */
      var vx = mx - rx, vy = my - ry;
      var dist = Math.sqrt(vx * vx + vy * vy);
      var ang = Math.atan2(vy, vx);
      var speedKmh = Math.round(dist * 24);

      /* Reticle attitude tilt & velocity stretch */
      var st = Math.min(0.35, dist * 0.005);
      reticle.style.transform = "translate(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px) translate(-50%,-50%) rotate(" + ang.toFixed(3) + "rad) scale(" + (1 + st).toFixed(3) + "," + (1 - st * 0.35).toFixed(3) + ")";

      /* Telemetry HUD position & dynamic readout */
      hudEl.style.transform = "translate(" + (hx + 24).toFixed(1) + "px," + (hy + 18).toFixed(1) + "px)";
      if (now - lastHudT > 80) {
        lastHudT = now;
        if (currentLockLabel) {
          hudEl.innerHTML = '<b>[LOCK // ' + currentLockLabel + ']</b>';
        } else if (dist > 3) {
          hudEl.innerHTML = '<b>[VEL]</b> ' + speedKmh + ' km/h · ' + Math.round(ang * 180 / Math.PI) + '°';
        } else {
          hudEl.innerHTML = '<b>[ORBIT]</b> 0 km/h · ' + currentPlanet.toUpperCase();
        }
      }

      glow.style.transform = "translate(" + gx.toFixed(1) + "px," + gy.toFixed(1) + "px) translate(-50%,-50%)";

      /* ---- 5. CONSTELLATION ION WAKE PHYSICS ON CANVAS ---- */
      if (cctx && cw > 0 && ch > 0) {
        cctx.clearRect(0, 0, cw, ch);

        /* Spawn ion wake sparks during movement */
        if (dist > 1.5 && now - lastSpawnT > 28 && particles.length < MAX_PARTICLES) {
          lastSpawnT = now;
          particles.push({
            x: mx + (Math.random() - 0.5) * 6,
            y: my + (Math.random() - 0.5) * 6,
            vx: -vx * 0.12 + (Math.random() - 0.5) * 0.8,
            vy: -vy * 0.12 + (Math.random() - 0.5) * 0.8,
            life: 1.0,
            decay: 0.032 + Math.random() * 0.02,
            size: 2.2 + Math.random() * 2.2,
          });
        }

        /* Update & render particles + constellation vector lines */
        var activePts = [];
        for (var pi = particles.length - 1; pi >= 0; pi--) {
          var p = particles[pi];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= p.decay;
          if (p.life <= 0) {
            particles.splice(pi, 1);
            continue;
          }
          activePts.push(p);

          /* Draw glowing stellar ember */
          var alpha = Math.max(0, p.life);
          cctx.fillStyle = "rgba(" + accentRgb.join(",") + "," + (0.55 * alpha).toFixed(3) + ")";
          cctx.beginPath();
          cctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
          cctx.fill();

          /* Specular highlight glint */
          cctx.fillStyle = "rgba(255,255,255," + (0.75 * alpha).toFixed(3) + ")";
          cctx.beginPath();
          cctx.arc(p.x - 0.5, p.y - 0.5, (p.size * 0.45) * alpha, 0, Math.PI * 2);
          cctx.fill();
        }

        /* Draw vector constellation lines between nearby particles */
        for (var i = 0; i < activePts.length; i++) {
          for (var j = i + 1; j < activePts.length; j++) {
            var p1 = activePts[i], p2 = activePts[j];
            var pdist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
            if (pdist < 55) {
              var lineAlpha = (1 - pdist / 55) * Math.min(p1.life, p2.life) * 0.35;
              cctx.strokeStyle = "rgba(" + accentRgb.join(",") + "," + lineAlpha.toFixed(3) + ")";
              cctx.lineWidth = 1;
              cctx.beginPath();
              cctx.moveTo(p1.x, p1.y);
              cctx.lineTo(p2.x, p2.y);
              cctx.stroke();
            }
          }
        }

        /* Update & render RCS shockwaves */
        for (var si = shockwaves.length - 1; si >= 0; si--) {
          var sw = shockwaves[si];
          sw.r += 2.8;
          sw.life -= 0.055;
          if (sw.life <= 0) {
            shockwaves.splice(si, 1);
            continue;
          }
          cctx.strokeStyle = "rgba(" + accentRgb.join(",") + "," + (0.65 * sw.life).toFixed(3) + ")";
          cctx.lineWidth = 1.5;
          cctx.beginPath();
          cctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
          cctx.stroke();
        }
      }

      requestAnimationFrame(follow);
    }
    follow();

    /* ---- 6. INTERACTIVE TARGET LOCK & RCS THRUSTER PULSE ---- */
    document.addEventListener("mouseover", function (e) {
      var target = e.target.closest && e.target.closest("a, button, [role='tab'], .dl-card__head, .cta, .row, .uni, .kpi");
      if (target) {
        reticle.classList.add("is-target");
        dotEl.classList.add("is-target");
        hudEl.classList.add("is-target");
        var label = target.getAttribute("data-short") || target.innerText || target.getAttribute("aria-label") || "TARGET";
        label = label.trim().split("\n")[0].substring(0, 16).toUpperCase();
        currentLockLabel = label;
      }
    });

    document.addEventListener("mouseout", function (e) {
      var target = e.target.closest && e.target.closest("a, button, [role='tab'], .dl-card__head, .cta, .row, .uni, .kpi");
      if (target) {
        reticle.classList.remove("is-target");
        dotEl.classList.remove("is-target");
        hudEl.classList.remove("is-target");
        currentLockLabel = null;
      }
    });

    document.addEventListener("mousedown", function () {
      reticle.classList.add("is-down");
      /* Spawn impulse RCS shockwave burst on canvas */
      if (cctx) {
        shockwaves.push({ x: mx, y: my, r: 4, life: 1.0 });
        for (var bi = 0; bi < 10; bi++) {
          var bAng = (bi / 10) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
          var bSpeed = 2 + Math.random() * 3.5;
          particles.push({
            x: mx, y: my,
            vx: Math.cos(bAng) * bSpeed,
            vy: Math.sin(bAng) * bSpeed,
            life: 1.0,
            decay: 0.045 + Math.random() * 0.03,
            size: 2.8 + Math.random() * 2,
          });
        }
      }
    });

    document.addEventListener("mouseup", function () {
      reticle.classList.remove("is-down");
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
     BACKGROUND SCENE BLUR ON CONTENT SECTIONS
     Gently softens and diffuses 3D background when reading dense content
     ------------------------------------------------------------ */
  var sceneCanvas = document.getElementById("scene3d");
  if (sceneCanvas && "IntersectionObserver" in window && !reducedMotion) {
    var blurSections = Array.prototype.slice.call(
      document.querySelectorAll(".sec:not(#hero):not(.sys-sec), .schedule-wrap, .dl, .rows, .mission__cols, .split, .rules, .tbl")
    );
    var activeBlurMap = new Map();
    var blurObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        activeBlurMap.set(en.target, en.isIntersecting);
      });
      var hasVisibleSection = false;
      activeBlurMap.forEach(function (isVisible) {
        if (isVisible) hasVisibleSection = true;
      });
      sceneCanvas.classList.toggle("is-blurred", hasVisibleSection);
    }, { threshold: 0.1, rootMargin: "-8% 0px -15% 0px" });

    blurSections.forEach(function (sec) {
      blurObserver.observe(sec);
    });
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
     SOLAR SYSTEM DOCK SYNC (home only)
     ------------------------------------------------------------ */
  var dockBtns = document.querySelectorAll(".sys__dock-btn");
  var sysPlanets = document.querySelectorAll(".sys__planet");
  dockBtns.forEach(function (btn, i) {
    btn.addEventListener("mouseenter", function () {
      if (sysPlanets[i]) sysPlanets[i].classList.add("is-dock-active");
    });
    btn.addEventListener("mouseleave", function () {
      if (sysPlanets[i]) sysPlanets[i].classList.remove("is-dock-active");
    });
  });

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
      idx.textContent = pad(i + 1);

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
