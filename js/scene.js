/* ============================================================
   SCENE 3D — ONE CONTINUOUS SOLAR SYSTEM, ONE PAGE PER PLANET.
   Every page boots the same WebGL world: a sun at the origin
   and nine planets on live orbits. Each page is a planet; the
   camera starts at the *previous* planet's framing (handed off
   through sessionStorage by main.js) and flies to this one, so
   navigating feels like traveling through a single system —
   no loading screen, no flash, just a continuous journey.
   Loaded as a module after main.js; degrades silently if
   WebGL / the CDN is unavailable.
   ============================================================ */
import * as THREE from "three";

try {
  const canvas = document.getElementById("scene3d");
  if (!canvas) throw new Error("no canvas");

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const slug = document.body.dataset.planet || "sol";

  /* the scene is transparent — the fluid sky (mounted by main.js)
     provides the background, themed per page. Keep the dark-page
     palette here for stars / planets so they read on the dark fluid. */
  const darkPage = slug === "deadlines";
  const STAR = darkPage ? 0xe8c89b : 0x523122;
  const PATH = darkPage ? 0x3a352f : 0xb09a7f;

  /* the renderer is transparent so the generative fluid sky (fluid-bg,
     mounted by main.js) shows through and the system floats inside it */
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !coarse, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearAlpha(0);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 6.2, 48);

  /* ------------------------------------------------------------
     PLANET CATALOGUE — expansive wide-orbit cosmic distribution
     d = orbit radius · s = radius · cam = framing offset
     ------------------------------------------------------------ */
  const P = {
    sol:              { n: "Sol",           c: 0xe3a458, s: 2.00, d: 0,    sp: 0,     tilt: 0,     ring: false, cam: [0, 6.2, 48] },
    mission:          { n: "Mission",       c: 0xe3a458, s: 1.45, d: 8.5,  sp: 0.042, tilt: 0.16,  ring: true,  cam: [0, 0.9, 7.5] },
    studies:          { n: "Studies",       c: 0xa26833, s: 1.60, d: 11.8, sp: 0.035, tilt: -0.10, ring: false, cam: [1.6, -0.6, 8.2] },
    college:          { n: "College",       c: 0x7f3b2d, s: 1.80, d: 15.2, sp: 0.029, tilt: 0.22,  ring: true,  cam: [0, 2.4, 9.2] },
    applications:     { n: "Applications",  c: 0x523122, s: 1.95, d: 18.8, sp: 0.024, tilt: -0.16, ring: false, cam: [-1.7, 0.6, 10.0] },
    extracurriculars: { n: "Extracurriculars", c: 0xc9a06b, s: 2.10, d: 22.5, sp: 0.020, tilt: 0.08,  ring: false, cam: [1.0, -1.5, 10.8] },
    schedule:         { n: "Schedule",      c: 0xb98a5a, s: 2.30, d: 26.2, sp: 0.017, tilt: 0.26,  ring: true,  cam: [0, 1.5, 11.8] },
    meal:             { n: "Meal",          c: 0xd9b26a, s: 2.45, d: 30.0, sp: 0.015, tilt: -0.08, ring: false, cam: [2.0, 1.1, 12.6] },
    training:         { n: "Training",      c: 0x8a6a4f, s: 2.60, d: 33.8, sp: 0.013, tilt: 0.12,  ring: false, cam: [-1.4, -1.1, 13.4] },
    deadlines:        { n: "Deadlines",     c: 0xe8c89b, s: 2.80, d: 38.0, sp: 0.011, tilt: -0.20, ring: true,  cam: [0, -2.2, 14.4] },
  };

  /* ---------- lights ---------- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const sunLight = new THREE.PointLight(0xe3a458, 140, 260);
  sunLight.position.set(0, 0, 0);
  scene.add(sunLight);
  const rim = new THREE.PointLight(0xe3d3bc, 60, 160);
  rim.position.set(-18, -8, -24);
  scene.add(rim);

  /* ---------- texture helpers ---------- */
  function radial(inner, outer) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, inner);
    gr.addColorStop(1, outer);
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  const glowTex = radial("rgba(255,255,255,1)", "rgba(255,255,255,0)");

  function nebulaTex(stops) {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    stops.forEach((s) => gr.addColorStop(s[0], s[1]));
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }

  /* ---------- star shells ---------- */
  const starLayers = [];
  function starShell(count, rMin, rMax, size, opacity) {
    const pos = new Float32Array(count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      v.randomDirection().multiplyScalar(rMin + Math.random() * (rMax - rMin));
      pos[i * 3] = v.x;
      pos[i * 3 + 1] = v.y;
      pos[i * 3 + 2] = v.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: STAR, size, map: glowTex, transparent: true, opacity: opacity * (darkPage ? 0.5 : 0.4),
      depthWrite: false, blending: THREE.NormalBlending, sizeAttenuation: true,
    });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    starLayers.push({ pts, mat, size });
  }
  starShell(coarse ? 300 : 800, 40, 150, 0.5, 0.8);
  starShell(coarse ? 200 : 600, 14, 44, 0.26, 0.5);
  starShell(coarse ? 100 : 300, 5, 18, 0.15, 0.35);

  /* ---------- nebulae ---------- */
  const nebDefs = darkPage ? [
    [[0, "rgba(232,200,155,0)"], [0.55, "rgba(232,200,155,0.14)"], [1, "rgba(232,200,155,0)"]],
    [[0, "rgba(162,104,51,0)"], [0.5, "rgba(162,104,51,0.2)"], [1, "rgba(162,104,51,0)"]],
    [[0, "rgba(82,49,34,0)"], [0.55, "rgba(82,49,34,0.28)"], [1, "rgba(82,49,34,0)"]],
    [[0, "rgba(58,52,44,0)"], [0.55, "rgba(58,52,44,0.4)"], [1, "rgba(58,52,44,0)"]],
  ] : [
    [[0, "rgba(227,211,188,0)"], [0.55, "rgba(227,211,188,0.7)"], [1, "rgba(227,211,188,0)"]],
    [[0, "rgba(227,164,88,0)"], [0.5, "rgba(227,164,88,0.4)"], [1, "rgba(227,164,88,0)"]],
    [[0, "rgba(162,104,51,0)"], [0.55, "rgba(162,104,51,0.35)"], [1, "rgba(162,104,51,0)"]],
    [[0, "rgba(127,59,45,0)"], [0.55, "rgba(127,59,45,0.3)"], [1, "rgba(127,59,45,0)"]],
  ];
  const nebulas = [];
  nebDefs.forEach((stops, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: nebulaTex(stops), transparent: true, opacity: 0.5,
      blending: THREE.NormalBlending, depthWrite: false,
    }));
    const a = (i / nebDefs.length) * Math.PI * 2 + 0.6;
    s.position.set(Math.cos(a) * 46, (i % 2 ? 1 : -1) * 9, Math.sin(a) * 46 - 20);
    s.scale.set(70, 70, 1);
    scene.add(s);
    nebulas.push(s);
  });

  /* ---------- ultra-high-definition procedural planetary textures (1024x512) ---------- */
  function createPlanetTexture(k, baseColorHex, isDark) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const ctx = c.getContext("2d");
    const col = new THREE.Color(baseColorHex);
    const hsl = {};
    col.getHSL(hsl);

    const hDeg = Math.round(hsl.h * 360);
    const sPct = Math.round(hsl.s * 100);
    const lPct = Math.round(hsl.l * 100);

    ctx.fillStyle = "#" + col.getHexString();
    ctx.fillRect(0, 0, 1024, 512);

    if (k === "mission") {
      /* 01 MISSION: Golden Terrestrial Earth-like with archipelagos, shallow reefs, and wispy clouds */
      const ocean = ctx.createLinearGradient(0, 0, 0, 512);
      ocean.addColorStop(0, `hsl(${hDeg}, ${sPct}%, 18%)`);
      ocean.addColorStop(0.5, `hsl(${hDeg}, ${sPct}%, 28%)`);
      ocean.addColorStop(1, `hsl(${hDeg}, ${sPct}%, 18%)`);
      ctx.fillStyle = ocean;
      ctx.fillRect(0, 0, 1024, 512);

      for (let n = 0; n < 80; n++) {
        const cx = Math.random() * 1024;
        const cy = 60 + Math.random() * 392;
        const r = 18 + Math.random() * 120;
        const landGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        landGrad.addColorStop(0, `hsl(${hDeg + 15}, 85%, 68%)`);
        landGrad.addColorStop(0.65, `hsl(${hDeg}, 75%, 52%)`);
        landGrad.addColorStop(0.88, `hsl(${hDeg - 15}, 80%, 38%)`);
        landGrad.addColorStop(1, "transparent");
        ctx.fillStyle = landGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "rgba(255,255,255,0.42)";
      for (let w = 0; w < 30; w++) {
        ctx.beginPath();
        let wx = Math.random() * 1024;
        let wy = 50 + Math.random() * 412;
        ctx.moveTo(wx, wy);
        for (let s = 0; s < 8; s++) {
          wx += (Math.random() - 0.2) * 80;
          wy += Math.sin(wx * 0.02) * 20;
          ctx.bezierCurveTo(wx - 20, wy + 15, wx + 20, wy - 15, wx, wy);
        }
        ctx.fill();
      }

      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillRect(0, 0, 1024, 42);
      ctx.fillRect(0, 470, 1024, 42);

    } else if (k === "studies") {
      /* 02 STUDIES: Dune Ridges, Canyon Networks & Martian Ochre Strata */
      const duneGrad = ctx.createLinearGradient(0, 0, 0, 512);
      duneGrad.addColorStop(0, `hsl(${hDeg - 10}, 65%, 22%)`);
      duneGrad.addColorStop(0.5, `hsl(${hDeg}, 70%, 36%)`);
      duneGrad.addColorStop(1, `hsl(${hDeg - 10}, 65%, 22%)`);
      ctx.fillStyle = duneGrad;
      ctx.fillRect(0, 0, 1024, 512);

      for (let y = 30; y < 482; y += 7) {
        ctx.beginPath();
        ctx.strokeStyle = `hsla(${hDeg + (y % 14 === 0 ? 25 : -15)}, 70%, ${y % 14 === 0 ? 55 : 24}%, 0.55)`;
        ctx.lineWidth = 2.5;
        for (let x = 0; x <= 1024; x += 16) {
          const dy = Math.sin(x * 0.03 + y * 0.2) * 4.5 + Math.cos(x * 0.07) * 2.5;
          if (x === 0) ctx.moveTo(x, y + dy);
          else ctx.lineTo(x, y + dy);
        }
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(40,18,10,0.7)";
      ctx.lineWidth = 2.5;
      for (let c = 0; c < 12; c++) {
        ctx.beginPath();
        let cx = Math.random() * 1024;
        let cy = 80 + Math.random() * 352;
        ctx.moveTo(cx, cy);
        for (let s = 0; s < 12; s++) {
          cx += (Math.random() - 0.5) * 60;
          cy += (Math.random() - 0.5) * 35;
          ctx.lineTo(cx, cy);
        }
        ctx.stroke();
      }

    } else if (k === "college") {
      /* 03 COLLEGE: Jovian Banded Giant with Crimson Turbulence & Storm Ovals */
      const numBands = 44;
      for (let b = 0; b < numBands; b++) {
        const y = (b / numBands) * 512;
        const h = 512 / numBands + 4;
        const lVar = hsl.l + Math.sin(b * 1.5) * 0.22 + (b % 3 === 0 ? 0.08 : -0.06);
        ctx.fillStyle = `hsl(${hDeg + (b % 2 ? 15 : -10)}, ${sPct}%, ${Math.max(8, Math.min(92, Math.round(lVar * 100)))}%)`;
        ctx.fillRect(0, y, 1024, h);

        ctx.beginPath();
        ctx.strokeStyle = `hsla(${hDeg + 25}, 80%, ${Math.round(lVar * 100 + 15)}%, 0.45)`;
        ctx.lineWidth = 2;
        for (let x = 0; x <= 1024; x += 16) {
          const dy = Math.sin(x * 0.04 + b) * 7 + Math.sin(x * 0.12) * 3;
          if (x === 0) ctx.moveTo(x, y + dy);
          else ctx.lineTo(x, y + dy);
        }
        ctx.stroke();
      }

      for (let v = 0; v < 2; v++) {
        const vx = 300 + v * 420;
        const vy = 200 + v * 120;
        const sGrad = ctx.createRadialGradient(vx, vy, 4, vx, vy, 48);
        sGrad.addColorStop(0, "rgba(255,140,110,0.95)");
        sGrad.addColorStop(0.5, "rgba(180,45,30,0.8)");
        sGrad.addColorStop(0.8, "rgba(90,20,15,0.5)");
        sGrad.addColorStop(1, "transparent");
        ctx.fillStyle = sGrad;
        ctx.beginPath();
        ctx.ellipse(vx, vy, 54, 28, 0.08, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (k === "applications") {
      /* 04 APPLICATIONS: Bronze Basalt World with Luminous Rayed Impact Craters */
      ctx.fillStyle = "#1e140e";
      ctx.fillRect(0, 0, 1024, 512);

      for (let p = 0; p < 25; p++) {
        const px = Math.random() * 1024;
        const py = Math.random() * 512;
        const pr = 40 + Math.random() * 120;
        const pGrad = ctx.createRadialGradient(px, py, 0, px, py, pr);
        pGrad.addColorStop(0, `hsl(${hDeg}, 40%, 26%)`);
        pGrad.addColorStop(1, "transparent");
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let c = 0; c < 90; c++) {
        const cx = Math.random() * 1024;
        const cy = Math.random() * 512;
        const cr = 4 + Math.random() * 26;

        if (cr > 16) {
          ctx.strokeStyle = "rgba(230,200,160,0.28)";
          ctx.lineWidth = 1.2;
          for (let ray = 0; ray < 10; ray++) {
            const angle = (ray / 10) * Math.PI * 2 + Math.random() * 0.2;
            const rLen = cr * (3 + Math.random() * 4);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle) * rLen, cy + Math.sin(angle) * rLen);
            ctx.stroke();
          }
        }

        const cGrad = ctx.createRadialGradient(cx, cy, cr * 0.25, cx, cy, cr);
        cGrad.addColorStop(0, "rgba(10,5,2,0.85)");
        cGrad.addColorStop(0.75, "rgba(220,180,130,0.65)");
        cGrad.addColorStop(1, "transparent");
        ctx.fillStyle = cGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (k === "extracurriculars") {
      /* 05 EXTRACURRICULARS: Caramel Milk-Tea Silky Marbled Fluid Convection World */
      for (let s = 0; s < 70; s++) {
        const sx = Math.random() * 1024;
        const sy = Math.random() * 512;
        const sr = 35 + Math.random() * 140;
        const swirlGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
        swirlGrad.addColorStop(0, `hsl(${hDeg + 20}, 85%, 78%)`);
        swirlGrad.addColorStop(0.4, `hsl(${hDeg}, 75%, 60%)`);
        swirlGrad.addColorStop(0.8, `hsl(${hDeg - 15}, 65%, 42%)`);
        swirlGrad.addColorStop(1, "transparent");
        ctx.fillStyle = swirlGrad;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let r = 0; r < 20; r++) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255,240,210,0.45)";
        ctx.lineWidth = 3;
        let rx = Math.random() * 1024;
        let ry = Math.random() * 512;
        ctx.moveTo(rx, ry);
        for (let seg = 0; seg < 6; seg++) {
          rx += (Math.random() - 0.5) * 160;
          ry += (Math.random() - 0.5) * 90;
          ctx.quadraticCurveTo(rx + 40, ry - 40, rx, ry);
        }
        ctx.stroke();
      }

    } else if (k === "schedule") {
      /* 06 SCHEDULE: Ultra-Fine Master Multi-Strata Saturnian Gas Giant */
      const numBelts = 64;
      for (let b = 0; b < numBelts; b++) {
        const y = (b / numBelts) * 512;
        const h = 512 / numBelts + 3;
        const lVar = hsl.l + Math.sin(b * 1.8) * 0.18 + Math.cos(b * 0.5) * 0.1;
        ctx.fillStyle = `hsl(${hDeg + (b % 4 ? 8 : -8)}, ${Math.round(hsl.s * 85)}%, ${Math.max(12, Math.min(88, Math.round(lVar * 100)))}%)`;
        ctx.fillRect(0, y, 1024, h);

        if (b % 2 === 0) {
          ctx.fillStyle = "rgba(255,255,255,0.18)";
          ctx.fillRect(0, y, 1024, 1.5);
        }
      }

      const eqGrad = ctx.createLinearGradient(0, 220, 0, 292);
      eqGrad.addColorStop(0, "transparent");
      eqGrad.addColorStop(0.5, "rgba(255,255,255,0.4)");
      eqGrad.addColorStop(1, "transparent");
      ctx.fillStyle = eqGrad;
      ctx.fillRect(0, 220, 1024, 72);

    } else if (k === "meal") {
      /* 07 MEAL: Honey Amber Luminous Oasis World with Cellular Tessellation */
      ctx.fillStyle = "#8a5818";
      ctx.fillRect(0, 0, 1024, 512);

      for (let c = 0; c < 120; c++) {
        const cx = Math.random() * 1024;
        const cy = Math.random() * 512;
        const cr = 14 + Math.random() * 45;
        const cGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, cr);
        cGrad.addColorStop(0, "hsl(48, 95%, 76%)");
        cGrad.addColorStop(0.65, "hsl(40, 90%, 54%)");
        cGrad.addColorStop(0.9, "hsl(30, 80%, 36%)");
        cGrad.addColorStop(1, "transparent");
        ctx.fillStyle = cGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(255,220,120,0.35)";
      ctx.lineWidth = 2.5;
      for (let a = 0; a < 8; a++) {
        ctx.beginPath();
        const ay = 40 + a * 60;
        ctx.moveTo(0, ay);
        for (let x = 0; x <= 1024; x += 32) {
          ctx.lineTo(x, ay + Math.sin(x * 0.02 + a) * 18);
        }
        ctx.stroke();
      }

    } else if (k === "training") {
      /* 08 TRAINING: Alpine Tectonic World with Mountain Ridges & Magma Fissures */
      const baseGrad = ctx.createLinearGradient(0, 0, 0, 512);
      baseGrad.addColorStop(0, "#2c1c14");
      baseGrad.addColorStop(0.5, "#483226");
      baseGrad.addColorStop(1, "#2c1c14");
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, 1024, 512);

      for (let m = 0; m < 55; m++) {
        const mx = Math.random() * 1024;
        const my = 40 + Math.random() * 432;
        const mr = 25 + Math.random() * 85;
        const mGrad = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
        mGrad.addColorStop(0, "rgba(255,255,255,0.85)");
        mGrad.addColorStop(0.35, "hsl(28, 45%, 48%)");
        mGrad.addColorStop(0.7, "hsl(20, 40%, 28%)");
        mGrad.addColorStop(1, "transparent");
        ctx.fillStyle = mGrad;
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(255,110,40,0.65)";
      ctx.lineWidth = 1.8;
      for (let f = 0; f < 14; f++) {
        ctx.beginPath();
        let fx = Math.random() * 1024;
        let fy = Math.random() * 512;
        ctx.moveTo(fx, fy);
        for (let s = 0; s < 8; s++) {
          fx += (Math.random() - 0.5) * 80;
          fy += (Math.random() - 0.5) * 45;
          ctx.lineTo(fx, fy);
        }
        ctx.stroke();
      }

    } else if (k === "deadlines") {
      /* 09 DEADLINES: Obsidian Brutalist Monolith World with Platinum & Neon Gold Trace Filaments */
      ctx.fillStyle = "#121114";
      ctx.fillRect(0, 0, 1024, 512);

      for (let f = 0; f < 40; f++) {
        const fx = Math.random() * 1024;
        const fy = Math.random() * 512;
        const fr = 30 + Math.random() * 90;
        const fGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
        fGrad.addColorStop(0, "rgba(65,60,72,0.6)");
        fGrad.addColorStop(0.6, "rgba(28,26,32,0.4)");
        fGrad.addColorStop(1, "transparent");
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.arc(fx, fy, fr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(232,200,155,0.75)";
      ctx.lineWidth = 1.5;
      for (let g = 0; g < 22; g++) {
        ctx.beginPath();
        let gx = Math.floor(Math.random() * 32) * 32;
        let gy = Math.floor(Math.random() * 16) * 32;
        ctx.moveTo(gx, gy);
        for (let s = 0; s < 5; s++) {
          if (Math.random() > 0.5) gx += (Math.random() > 0.5 ? 64 : -64);
          else gy += (Math.random() > 0.5 ? 64 : -64);
          ctx.lineTo(gx, gy);
        }
        ctx.stroke();

        ctx.fillStyle = "rgba(255,225,180,0.95)";
        ctx.beginPath();
        ctx.arc(gx, gy, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  function createBumpTexture(k) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, 256, 128);

    for (let i = 0; i < 70; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 128;
      const r = 3 + Math.random() * 24;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, Math.random() > 0.45 ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)");
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }

  function createRingTexture(colorHex) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 1;
    const ctx = c.getContext("2d");
    const col = new THREE.Color(colorHex);
    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.12, `rgba(${Math.round(col.r*255)},${Math.round(col.g*255)},${Math.round(col.b*255)},0.7)`);
    grad.addColorStop(0.38, `rgba(${Math.round(col.r*255)},${Math.round(col.g*255)},${Math.round(col.b*255)},0.95)`);
    grad.addColorStop(0.48, "rgba(0,0,0,0.05)"); /* Cassini Division */
    grad.addColorStop(0.55, `rgba(${Math.round(col.r*255)},${Math.round(col.g*255)},${Math.round(col.b*255)},0.85)`);
    grad.addColorStop(0.88, `rgba(${Math.round(col.r*255)},${Math.round(col.g*255)},${Math.round(col.b*255)},0.5)`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 1);
    return new THREE.CanvasTexture(c);
  }

  /* ---------- the sun ---------- */
  const sun = new THREE.Group();
  const sunMat = new THREE.MeshBasicMaterial({
    map: createPlanetTexture("schedule", 0xffc470, false),
    color: 0xffd988,
  });
  sun.add(new THREE.Mesh(new THREE.SphereGeometry(P.sol.s, 48, 36), sunMat));
  sun.add(new THREE.Mesh(
    new THREE.IcosahedronGeometry(P.sol.s * 1.28, 3),
    new THREE.MeshBasicMaterial({ wireframe: true, color: 0xffe8c2, transparent: true, opacity: 0.35 })
  ));
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radial("rgba(255,214,120,0.9)", "rgba(255,214,120,0)"),
    transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  corona.scale.set(18, 18, 1);
  sun.add(corona);
  scene.add(sun);

  /* ---------- shared geometries for planets & satellites ---------- */
  const sharedSphereGeo = new THREE.SphereGeometry(1, 48, 36);
  const sharedWireGeo = new THREE.IcosahedronGeometry(1.08, 2);
  const sharedSatGeo = new THREE.SphereGeometry(0.1, 16, 16);
  const sharedRingGeo = new THREE.RingGeometry(1.35, 2.25, 64);
  const atmoTex = radial("rgba(255,255,255,0.6)", "rgba(255,255,255,0)");

  /* ---------- planets ---------- */
  const bodies = {};
  const sats = [];
  Object.keys(P).forEach((k, i) => {
    if (k === "sol") return;
    const cfg = P[k];
    const g = new THREE.Group();

    const planetTex = createPlanetTexture(k, cfg.c, darkPage);
    const bumpTex = createBumpTexture(k);

    const core = new THREE.Mesh(
      sharedSphereGeo,
      new THREE.MeshStandardMaterial({
        map: planetTex,
        bumpMap: bumpTex,
        bumpScale: 0.055,
        roughness: 0.52,
        metalness: 0.16,
        emissive: new THREE.Color(cfg.c).multiplyScalar(darkPage ? 0.32 : 0.08),
      })
    );
    core.scale.setScalar(cfg.s);

    const wire = new THREE.Mesh(
      sharedWireGeo,
      new THREE.MeshBasicMaterial({ wireframe: true, color: cfg.c, transparent: true, opacity: 0.38 })
    );
    wire.scale.setScalar(cfg.s);

    const atmo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: atmoTex, transparent: true, opacity: darkPage ? 0.22 : 0.14, depthWrite: false,
    }));
    atmo.scale.set(cfg.s * 3.4, cfg.s * 3.4, 1);
    g.add(core, wire, atmo);

    if (cfg.ring) {
      const ringMat = new THREE.MeshStandardMaterial({
        map: createRingTexture(cfg.c),
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        roughness: 0.6,
        metalness: 0.1,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(sharedRingGeo, ringMat);
      ringMesh.scale.setScalar(cfg.s);
      ringMesh.rotation.set(1.72, 0.35, 0.12);
      g.add(ringMesh);
    }

    for (let j = 0; j < 2; j++) {
      const m = new THREE.Mesh(
        sharedSatGeo,
        new THREE.MeshStandardMaterial({ color: cfg.c, emissive: cfg.c, emissiveIntensity: 0.85 })
      );
      g.add(m);
      sats.push({ m, r: cfg.s * 1.22 + j * 0.55, ph: (j / 2) * Math.PI * 2 + k.length, sp: 0.55 + j * 0.35 });
    }

    /* orbit path — a tilted circle matching the planet's motion */
    const path = new THREE.Mesh(
      new THREE.RingGeometry(cfg.d - 0.04, cfg.d + 0.04, 64),
      new THREE.MeshBasicMaterial({ color: PATH, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })
    );
    path.rotation.x = cfg.tilt - Math.PI / 2;
    scene.add(path);

    scene.add(g);
    bodies[k] = { cfg, g, core, wire, phase: (i / 9) * Math.PI * 2 + (Math.random() - 0.5) * 0.4 };
  });

  /* ---------- framing: where the camera sits for a planet ---------- */
  function planetPos(k, t) {
    const cfg = P[k];
    if (k === "sol") return new THREE.Vector3(0, 0, 0);
    const a = bodies[k].phase + t * cfg.sp;
    return new THREE.Vector3(
      Math.cos(a) * cfg.d,
      Math.sin(a) * cfg.d * Math.sin(cfg.tilt),
      Math.sin(a) * cfg.d * Math.cos(cfg.tilt)
    );
  }
  function frameOf(k, t) {
    const cfg = P[k];
    if (k === "sol") return { pos: new THREE.Vector3(0, 6.2, 48), look: new THREE.Vector3(0, 0, 0) };
    const pp = planetPos(k, t);
    return {
      pos: new THREE.Vector3(pp.x + cfg.cam[0], pp.y + cfg.cam[1], pp.z + cfg.cam[2]),
      look: pp.clone(),
    };
  }

  /* ---------- snapshot & seamless state handoff ---------- */
  let simT = 0;
  let lastPlanet = null;
  let lastCamPos = null;
  let lastCamLook = null;
  try {
    lastPlanet = sessionStorage.getItem("bw-last-planet");
    const posStr = sessionStorage.getItem("bw-last-cam-pos");
    const lookStr = sessionStorage.getItem("bw-last-cam-look");
    const timeStr = sessionStorage.getItem("bw-last-sim-t");
    if (posStr) lastCamPos = JSON.parse(posStr);
    if (lookStr) lastCamLook = JSON.parse(lookStr);
    if (timeStr) simT = parseFloat(timeStr) || 0;
  } catch (e) { /* ignore */ }

  let currentSlug = slug;
  let fromSlug = lastPlanet && P[lastPlanet] && lastPlanet !== currentSlug ? lastPlanet : null;
  let toFrame = frameOf(currentSlug, simT);

  let fromFrame;
  if (lastCamPos && lastCamLook && fromSlug) {
    fromFrame = {
      pos: new THREE.Vector3(lastCamPos[0], lastCamPos[1], lastCamPos[2]),
      look: new THREE.Vector3(lastCamLook[0], lastCamLook[1], lastCamLook[2]),
    };
  } else {
    fromFrame = fromSlug ? frameOf(fromSlug, simT) : toFrame;
  }

  let FLY = 2.8;
  let arr = (reduced || !fromSlug) ? 1 : 0;
  let curLook = fromSlug ? fromFrame.look.clone() : toFrame.look.clone();

  camera.position.copy(fromSlug ? fromFrame.pos : toFrame.pos);
  camera.lookAt(curLook);

  /* dynamic continuous flight for seamless SPA transition */
  window.__flyToPlanet = function (targetSlug) {
    if (!P[targetSlug]) return;
    if (targetSlug === currentSlug) return;
    fromSlug = currentSlug;
    currentSlug = targetSlug;
    fromFrame = {
      pos: camera.position.clone(),
      look: curLook.clone(),
    };
    toFrame = frameOf(currentSlug, simT);
    arr = 0;
    FLY = 2.8;
  };

  /* quintic ease-in-out for silky cinematic spacecraft departure & arrival */
  function easeQuint(t) {
    return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
  }

  /* ---------- input ---------- */
  let mx = 0, my = 0;
  if (!coarse && !reduced) {
    window.addEventListener("mousemove", (e) => {
      mx = (e.clientX / window.innerWidth) * 2 - 1;
      my = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

  /* ---------- main loop ---------- */
  const clock = new THREE.Clock();

  function loop() {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    const dt = Math.min(0.05, clock.getDelta());
    simT += dt * 0.7;

    /* place planets on their orbits; on a section page only the current
       planet (and the one we flew from, during arrival) stays visible */
    Object.keys(bodies).forEach((k) => {
      bodies[k].g.position.copy(planetPos(k, simT));
      bodies[k].g.visible = currentSlug === "sol" || k === currentSlug || (arr < 1 && k === fromSlug);
    });
    window.__sceneVis = Object.keys(bodies).filter((k) => bodies[k].g.visible);

    /* arrival tween: smooth slowed-down orbital arc trajectory */
    if (fromSlug && arr < 1) {
      arr = Math.min(1, arr + dt / FLY);
      const e = easeQuint(arr);
      const arcHeight = Math.sin(e * Math.PI) * 3.4;
      camera.position.lerpVectors(fromFrame.pos, toFrame.pos, e);
      camera.position.y += arcHeight;
      camera.position.z += arcHeight * 0.4;
      curLook.lerpVectors(fromFrame.look, toFrame.look, e);
      camera.lookAt(curLook);
    }

    /* post-arrival: subtle idle drift + mouse parallax + scroll pull-back */
    const vel = window.__scrollVel || 0;
    if (arr >= 1) {
      const t = simT;
      const sc = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const ox = Math.sin(t * 0.22) * 0.35 + mx * 0.55;
      const oy = Math.cos(t * 0.18) * 0.28 + my * 0.42;
      const oz = sc * 1.6 + Math.sin(t * 0.12) * 0.3;
      camera.position.copy(toFrame.pos);
      camera.position.x += ox;
      camera.position.y += oy;
      camera.position.z += oz;
      curLook.copy(toFrame.look);
      camera.lookAt(curLook);
    }

    /* export live state for seamless handoff to next page */
    window.__getSceneState = function () {
      return {
        planet: slug,
        pos: [camera.position.x, camera.position.y, camera.position.z],
        look: [curLook.x, curLook.y, curLook.z],
        simT: simT,
      };
    };

    const speed = 1 + Math.min(4, Math.abs(vel) * 0.7);

    /* stars drift */
    starLayers.forEach((s, i) => {
      s.pts.rotation.y += dt * 0.004 * (i + 1);
      s.pts.rotation.x += dt * 0.001 * (i % 2 ? 1 : -1);
      s.mat.size = s.size * (1 + Math.min(1.5, Math.abs(vel) * 0.5));
    });

    /* planets spin surface textures & telemetry cages */
    Object.keys(bodies).forEach((k) => {
      const b = bodies[k];
      if (b.core) b.core.rotation.y += dt * 0.08 * speed;
      if (b.wire) {
        b.wire.rotation.y -= dt * 0.035 * speed;
        b.wire.rotation.x += dt * 0.015 * speed;
      }
    });
    sats.forEach((s) => {
      s.ph += dt * s.sp * speed;
      s.m.position.set(Math.cos(s.ph) * s.r, Math.sin(s.ph * 2) * 0.22, Math.sin(s.ph) * s.r);
    });

    /* sun breathes */
    const sunPulse = 1 + Math.sin(simT * 0.8) * 0.04;
    sun.scale.setScalar(sunPulse);
    const camDist = camera.position.length();
    const coronaK = Math.max(0, Math.min(1, (camDist - 2.2) / 3));
    corona.material.opacity = (0.38 + Math.sin(simT * 0.9) * 0.05) * coronaK;

    /* nebulae breathe */
    nebulas.forEach((n, i) => {
      n.material.opacity = 0.18 + Math.sin(simT * 0.3 + i * 1.7) * 0.06;
    });

    renderer.render(scene, camera);
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", onResize);

  /* instant frame 0 render so canvas paints with zero delay */
  Object.keys(bodies).forEach((k) => {
    bodies[k].g.position.copy(planetPos(k, 0));
    bodies[k].g.visible = slug === "sol" || k === slug || (arr < 1 && k === fromSlug);
  });
  window.__sceneVis = Object.keys(bodies).filter((k) => bodies[k].g.visible);
  renderer.render(scene, camera);

  if (!reduced) {
    loop();
  }

  window.__scene3d = { ok: true, slug, arrival: arr, dark: darkPage };
} catch (err) {
  console.warn("3D scene disabled:", err);
  window.__scene3d = { ok: false, err: String(err) };
}
