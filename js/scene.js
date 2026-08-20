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

  /* ---------- procedural high-detail planetary textures ---------- */
  function createPlanetTexture(k, baseColorHex, isDark) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext("2d");
    const col = new THREE.Color(baseColorHex);
    const hsl = {};
    col.getHSL(hsl);

    ctx.fillStyle = "#" + col.getHexString();
    ctx.fillRect(0, 0, 512, 256);

    if (k === "schedule" || k === "college" || k === "deadlines") {
      /* Banded gas giant with planetary currents, jet streams and storms */
      const bands = 28;
      for (let i = 0; i < bands; i++) {
        const y = (i / bands) * 256;
        const h = 256 / bands + 3;
        const lVar = hsl.l + (Math.sin(i * 1.6) * 0.2 + (Math.random() - 0.5) * 0.08);
        ctx.fillStyle = `hsl(${Math.round(hsl.h * 360)}, ${Math.round(hsl.s * 100)}%, ${Math.max(6, Math.min(94, Math.round(lVar * 100)))}%)`;
        ctx.fillRect(0, y, 512, h);

        ctx.beginPath();
        for (let x = 0; x <= 512; x += 12) {
          const dy = Math.sin(x * 0.05 + i * 0.9) * 5 + Math.cos(x * 0.12) * 2.5;
          if (x === 0) ctx.moveTo(x, y + dy);
          else ctx.lineTo(x, y + dy);
        }
        ctx.strokeStyle = `hsla(${Math.round(hsl.h * 360 + 10)}, ${Math.round(hsl.s * 100)}%, ${Math.max(10, Math.min(90, Math.round((lVar + 0.12) * 100)))}%, 0.4)`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      /* Great cyclonic vortex */
      const spotX = 160 + (k.length * 45) % 220;
      const spotY = 120 + Math.sin(k.length) * 28;
      const stormGrad = ctx.createRadialGradient(spotX, spotY, 2, spotX, spotY, 34);
      stormGrad.addColorStop(0, `hsla(${Math.round(hsl.h * 360 + 25)}, 90%, 80%, 0.85)`);
      stormGrad.addColorStop(0.5, `hsla(${Math.round(hsl.h * 360 - 20)}, 75%, 35%, 0.6)`);
      stormGrad.addColorStop(1, "transparent");
      ctx.fillStyle = stormGrad;
      ctx.beginPath();
      ctx.ellipse(spotX, spotY, 36, 20, 0.12, 0, Math.PI * 2);
      ctx.fill();
    } else if (k === "mission" || k === "studies" || k === "extracurriculars" || k === "meal") {
      /* Terrestrial continents, marbled fluid currents & polar ice caps */
      for (let n = 0; n < 45; n++) {
        const cx = Math.random() * 512;
        const cy = 25 + Math.random() * 206;
        const r = 20 + Math.random() * 60;
        const lVar = hsl.l + (Math.random() - 0.5) * 0.32;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `hsla(${Math.round(hsl.h * 360 + (Math.random() - 0.5) * 35)}, ${Math.round(hsl.s * 100)}%, ${Math.round(Math.max(10, Math.min(92, lVar * 100)))}%, 0.8)`);
        grad.addColorStop(0.7, `hsla(${Math.round(hsl.h * 360)}, ${Math.round(hsl.s * 85)}%, ${Math.round(Math.max(10, Math.min(90, lVar * 100)))}%, 0.45)`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      /* Polar Caps */
      const polarN = ctx.createLinearGradient(0, 0, 0, 32);
      polarN.addColorStop(0, "rgba(255,255,255,0.9)");
      polarN.addColorStop(1, "transparent");
      ctx.fillStyle = polarN;
      ctx.fillRect(0, 0, 512, 32);

      const polarS = ctx.createLinearGradient(0, 224, 0, 256);
      polarS.addColorStop(0, "transparent");
      polarS.addColorStop(1, "rgba(255,255,255,0.9)");
      ctx.fillStyle = polarS;
      ctx.fillRect(0, 224, 512, 32);
    } else {
      /* Applications & Training: Rugged impact craters & tectonic fault lines */
      for (let c = 0; c < 75; c++) {
        const x = Math.random() * 512;
        const y = Math.random() * 256;
        const cr = 4 + Math.random() * 28;
        const rimGrad = ctx.createRadialGradient(x, y, cr * 0.3, x, y, cr);
        rimGrad.addColorStop(0, "rgba(0,0,0,0.65)");
        rimGrad.addColorStop(0.8, "rgba(255,255,255,0.45)");
        rimGrad.addColorStop(1, "transparent");
        ctx.fillStyle = rimGrad;
        ctx.beginPath();
        ctx.arc(x, y, cr, 0, Math.PI * 2);
        ctx.fill();
      }
      /* Tectonic ridges */
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 1.5;
      for (let r = 0; r < 8; r++) {
        ctx.beginPath();
        let lx = Math.random() * 512;
        let ly = Math.random() * 256;
        ctx.moveTo(lx, ly);
        for (let s = 0; s < 5; s++) {
          lx += (Math.random() - 0.5) * 90;
          ly += (Math.random() - 0.5) * 60;
          ctx.lineTo(lx, ly);
        }
        ctx.stroke();
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
