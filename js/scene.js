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
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

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

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 3.4, 30);

  /* ------------------------------------------------------------
     PLANET CATALOGUE — colors from the milk-tea palette.
     d = orbit radius · s = radius · cam = framing offset
     ------------------------------------------------------------ */
  const P = {
    sol:              { n: "Sol",           c: 0xe3a458, s: 1.10, d: 0,    sp: 0,     tilt: 0,    ring: false, cam: [0, 3.4, 27] },
    mission:          { n: "Mission",       c: 0xe3a458, s: 1.00, d: 4.6,  sp: 0.046, tilt: 0.16, ring: true,  cam: [0, 0.5, 5.0] },
    studies:          { n: "Studies",       c: 0xa26833, s: 1.10, d: 5.6,  sp: 0.038, tilt: -0.10, ring: false, cam: [1.1, -0.4, 5.4] },
    college:          { n: "College",       c: 0x7f3b2d, s: 1.30, d: 6.6,  sp: 0.031, tilt: 0.22, ring: true,  cam: [0, 1.7, 6.2] },
    applications:     { n: "Applications",  c: 0x523122, s: 1.40, d: 7.6,  sp: 0.026, tilt: -0.16, ring: false, cam: [-1.2, 0.4, 6.6] },
    extracurriculars: { n: "Extracurriculars", c: 0xc9a06b, s: 1.50, d: 8.6, sp: 0.022, tilt: 0.08, ring: false, cam: [0.6, -1.0, 7.2] },
    schedule:         { n: "Schedule",      c: 0xb98a5a, s: 1.70, d: 9.6,  sp: 0.019, tilt: 0.26, ring: true,  cam: [0, 0.9, 8.0] },
    meal:             { n: "Meal",          c: 0xd9b26a, s: 1.80, d: 10.6, sp: 0.017, tilt: -0.08, ring: false, cam: [1.3, 0.7, 8.6] },
    training:         { n: "Training",      c: 0x8a6a4f, s: 1.90, d: 11.6, sp: 0.014, tilt: 0.12,  ring: false, cam: [-0.9, -0.7, 9.1] },
    deadlines:        { n: "Deadlines",     c: 0xe8c89b, s: 2.10, d: 12.6, sp: 0.012, tilt: -0.20, ring: true,  cam: [0, -1.5, 10.0] },
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

  /* ---------- the sun ---------- */
  const sun = new THREE.Group();
  sun.add(new THREE.Mesh(
    new THREE.IcosahedronGeometry(P.sol.s, 6),
    new THREE.MeshBasicMaterial({ color: 0xe3a458 })
  ));
  sun.add(new THREE.Mesh(
    new THREE.IcosahedronGeometry(P.sol.s * 1.32, 3),
    new THREE.MeshBasicMaterial({ wireframe: true, color: 0xffe8c2, transparent: true, opacity: 0.4 })
  ));
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radial("rgba(255,214,120,0.9)", "rgba(255,214,120,0)"),
    transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  corona.scale.set(11, 11, 1);
  sun.add(corona);
  scene.add(sun);

  /* ---------- planets ---------- */
  const bodies = {};
  const sats = [];
  Object.keys(P).forEach((k, i) => {
    if (k === "sol") return;
    const cfg = P[k];
    const g = new THREE.Group();

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(cfg.s, 5),
      new THREE.MeshStandardMaterial({
        color: cfg.c, roughness: 0.55, metalness: 0.18,
        emissive: new THREE.Color(cfg.c).multiplyScalar(darkPage ? 0.32 : 0.08),
      })
    );
    const wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(cfg.s * 1.1, 6),
      new THREE.MeshBasicMaterial({ wireframe: true, color: cfg.c, transparent: true, opacity: 0.5 })
    );
    const atmo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: radial("rgba(255,255,255,0.55)", "rgba(255,255,255,0)"),
      transparent: true, opacity: darkPage ? 0.2 : 0.13, depthWrite: false,
    }));
    atmo.scale.set(cfg.s * 3.6, cfg.s * 3.6, 1);
    g.add(core, wire, atmo);

    if (cfg.ring) {
      const r1 = new THREE.Mesh(
        new THREE.RingGeometry(cfg.s * 1.38, cfg.s * 1.72, 80),
        new THREE.MeshBasicMaterial({ color: darkPage ? 0x2b2a2d : 0x523122, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })
      );
      r1.rotation.set(1.72, 0.35, 0);
      const r2 = new THREE.Mesh(
        new THREE.RingGeometry(cfg.s * 1.85, cfg.s * 1.94, 80),
        new THREE.MeshBasicMaterial({ color: cfg.c, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })
      );
      r2.rotation.set(1.72, 0.35, 0.15);
      g.add(r1, r2);
    }

    for (let i = 0; i < 2; i++) {
      const m = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.08, 2),
        new THREE.MeshStandardMaterial({ color: cfg.c, emissive: cfg.c, emissiveIntensity: 0.85 })
      );
      g.add(m);
      sats.push({ m, r: cfg.s * 1.15 + i * 0.5, ph: (i / 2) * Math.PI * 2 + k.length, sp: 0.5 + i * 0.35 });
    }

    /* orbit path — a tilted circle matching the planet's motion */
    const path = new THREE.Mesh(
      new THREE.RingGeometry(cfg.d - 0.04, cfg.d + 0.04, 128),
      new THREE.MeshBasicMaterial({ color: PATH, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })
    );
    path.rotation.x = cfg.tilt - Math.PI / 2;
    scene.add(path);

    scene.add(g);
    /* spread the planets around the orbit so they never bunch up */
    bodies[k] = { cfg, g, phase: (i / 9) * Math.PI * 2 + (Math.random() - 0.5) * 0.4 };
  });

  /* ---------- comet (velocity / warp reactive) ---------- */
  const cometMat = new THREE.SpriteMaterial({
    map: glowTex, transparent: true, opacity: 0, blending: THREE.NormalBlending, depthWrite: false,
  });
  const comet = new THREE.Sprite(cometMat);
  comet.scale.set(1.4, 1.4, 1);
  scene.add(comet);
  let cometA = Math.random() * Math.PI * 2;

  /* ---------- bloom ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.34, 0.62, 0.32);
  composer.addPass(bloom);

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
    if (k === "sol") return { pos: new THREE.Vector3(0, 3.4, 27), look: new THREE.Vector3(0, 0, 0) };
    const pp = planetPos(k, t);
    return {
      pos: new THREE.Vector3(pp.x + cfg.cam[0], pp.y + cfg.cam[1], pp.z + cfg.cam[2]),
      look: pp.clone(),
    };
  }

  /* ---------- arrival flight: from the previous planet ---------- */
  let simT = 0;
  let last = null;
  try { last = sessionStorage.getItem("bw-last-planet"); } catch (e) { /* ignore */ }
  const fromSlug = last && P[last] && last !== slug ? last : null;
  const toFrame = frameOf(slug, 0);
  let fromFrame;
  if (last && P[last] && last !== slug) fromFrame = frameOf(last, 0);
  else fromFrame = { pos: toFrame.pos.clone().add(new THREE.Vector3(0, 0, 9)), look: toFrame.look.clone() };
  const FLY = 2.6;
  let arr = reduced ? 1 : 0;

  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

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
  let bloomBoost = 0;
  let warp = reduced ? 0 : 1;

  function loop() {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    const dt = Math.min(0.05, clock.getDelta());
    simT += dt * (0.7 + (1 - arr) * 2.2); // world time speeds up during warp

    /* place planets on their orbits; on a section page only the current
       planet (and the one we flew from, during arrival) stays visible */
    Object.keys(bodies).forEach((k) => {
      bodies[k].g.position.copy(planetPos(k, simT));
      bodies[k].g.visible = slug === "sol" || k === slug || (arr < 1 && k === fromSlug);
    });
    window.__sceneVis = Object.keys(bodies).filter((k) => bodies[k].g.visible);

    /* arrival tween */
    if (arr < 1) {
      arr = Math.min(1, arr + dt / FLY);
      const e = easeInOut(arr);
      warp = 1 - e;
      camera.position.lerpVectors(fromFrame.pos, toFrame.pos, e);
      camera.lookAt(new THREE.Vector3().lerpVectors(fromFrame.look, toFrame.look, e));
    } else {
      warp = 0;
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
      camera.lookAt(toFrame.look);
    }

    const speed = 1 + Math.min(4, Math.abs(vel) * 0.7);

    /* stars drift + hyperspace stretch during warp */
    starLayers.forEach((s, i) => {
      s.pts.rotation.y += dt * 0.004 * (i + 1);
      s.pts.rotation.x += dt * 0.001 * (i % 2 ? 1 : -1);
      s.mat.size = s.size * (1 + Math.min(3.4, warp * 3.2 + Math.abs(vel) * 1.1));
    });

    /* planets spin + satellites */
    Object.keys(bodies).forEach((k) => {
      const b = bodies[k];
      b.g.rotation.y += dt * 0.05 * speed;
    });
    sats.forEach((s) => {
      s.ph += dt * s.sp * speed;
      s.m.position.set(Math.cos(s.ph) * s.r, 0, Math.sin(s.ph) * s.r);
    });

    /* sun breathes; its corona fades out if the camera passes close to it */
    const sunPulse = 1 + Math.sin(simT * 0.8) * 0.05 + warp * 0.08;
    sun.scale.setScalar(sunPulse);
    const camDist = camera.position.length();
    const coronaK = Math.max(0, Math.min(1, (camDist - 2.2) / 3));
    corona.material.opacity = (0.42 + Math.sin(simT * 0.9) * 0.06 + warp * 0.14) * coronaK;

    /* comet — streaks harder the faster you move */
    cometA += dt * (0.1 + warp * 0.5 + Math.min(1.4, Math.abs(vel) * 0.4));
    const cr = 9 + warp * 6 + Math.abs(vel) * 1.5;
    comet.position.set(Math.cos(cometA) * cr, Math.sin(cometA * 1.3) * 1.4, Math.sin(cometA) * cr - 5);
    cometMat.opacity = Math.min(0.95, warp * 0.85 + Math.abs(vel) * 0.5);
    const cs = 1.1 + warp * 1.6 + Math.abs(vel) * 0.8;
    comet.scale.set(cs, cs, 1);

    /* nebulae breathe */
    nebulas.forEach((n, i) => {
      n.material.opacity = 0.3 + Math.sin(simT * 0.3 + i * 1.7) * 0.11;
    });

    /* bloom surges on warp + fast scroll (kept soft) */
    bloomBoost = Math.max(0, bloomBoost - dt * 1.2);
    bloom.strength = 0.3 + Math.min(0.55, Math.abs(vel) * 0.18) + warp * 0.42 + bloomBoost;

    composer.render();
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", onResize);

  if (reduced) {
    Object.keys(bodies).forEach((k) => {
      bodies[k].g.position.copy(planetPos(k, 0));
      bodies[k].g.visible = slug === "sol" || k === slug || (arr < 1 && k === fromSlug);
    });
    window.__sceneVis = Object.keys(bodies).filter((k) => bodies[k].g.visible);
    camera.position.copy(toFrame.pos);
    camera.lookAt(toFrame.look);
    composer.render();
  } else {
    loop();
  }

  window.__scene3d = { ok: true, slug, arrival: arr, dark: darkPage };
} catch (err) {
  console.warn("3D scene disabled:", err);
  window.__scene3d = { ok: false, err: String(err) };
}
