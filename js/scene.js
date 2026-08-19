/* ============================================================
   SCENE 3D — immersive WebGL layer behind the whole page.
   Wireframe planet + rings + orbiting satellites + nebulae +
   star shells. Camera flies through waypoints as you scroll,
   stars stretch into hyperspace on fast scroll, a comet
   streaks by, bloom pulses on section changes.
   Loaded as a module after main.js; degrades silently if
   WebGL / CDN is unavailable.
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

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarse, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe9dfce);
  scene.fog = new THREE.FogExp2(0xe9dfce, 0.028);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);
  camera.position.set(0, 0, 6);

  /* ---------- lights ---------- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const key = new THREE.PointLight(0xe3a458, 60, 70);
  key.position.set(7, 5, 6);
  scene.add(key);
  const rim = new THREE.PointLight(0xe3d3bc, 55, 70);
  rim.position.set(-7, -4, -5);
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
  const starTex = radial("rgba(255,255,255,1)", "rgba(255,255,255,0)");

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
      color: 0x523122, size, map: starTex, transparent: true, opacity: opacity * 0.45,
      depthWrite: false, blending: THREE.NormalBlending, sizeAttenuation: true,
    });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    starLayers.push({ pts, mat, size });
    return pts;
  }
  starShell(coarse ? 350 : 950, 22, 80, 0.55, 0.85);
  starShell(coarse ? 250 : 750, 9, 26, 0.28, 0.5);
  starShell(coarse ? 120 : 360, 3.5, 12, 0.16, 0.35);

  /* ---------- nebulae ---------- */
  const nebDefs = [
    [[0, "rgba(227,211,188,0.0)"], [0.55, "rgba(227,211,188,0.8)"], [1, "rgba(227,211,188,0)"]],
    [[0, "rgba(227,164,88,0.0)"], [0.5, "rgba(227,164,88,0.45)"], [1, "rgba(227,164,88,0)"]],
    [[0, "rgba(162,104,51,0.0)"], [0.55, "rgba(162,104,51,0.4)"], [1, "rgba(162,104,51,0)"]],
    [[0, "rgba(127,59,45,0.0)"], [0.55, "rgba(127,59,45,0.35)"], [1, "rgba(127,59,45,0)"]],
  ];
  const nebulas = [];
  nebDefs.forEach((stops, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: nebulaTex(stops), transparent: true, opacity: 0.55,
      blending: THREE.NormalBlending, depthWrite: false,
    }));
    const a = (i / nebDefs.length) * Math.PI * 2 + 0.6;
    s.position.set(Math.cos(a) * 18, (i % 2 ? 1 : -1) * 5, Math.sin(a) * 18 - 10);
    s.scale.set(30, 30, 1);
    scene.add(s);
    nebulas.push(s);
  });

  /* ---------- planet ---------- */
  const planet = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.5, 32),
    new THREE.MeshStandardMaterial({ color: 0x523122, roughness: 0.5, metalness: 0.2, emissive: 0x24150d })
  );
  const wire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.64, 8),
    new THREE.MeshBasicMaterial({ wireframe: true, color: 0xe3a458, transparent: true, opacity: 0.65 })
  );
  const atmo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radial("rgba(227,164,88,0.7)", "rgba(227,164,88,0)"),
    transparent: true, opacity: 0.26, blending: THREE.NormalBlending, depthWrite: false,
  }));
  atmo.scale.set(5.6, 5.6, 1);
  planet.add(core, wire, atmo);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.05, 2.55, 96),
    new THREE.MeshBasicMaterial({ color: 0x523122, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false })
  );
  ring.rotation.set(1.85, 0.35, 0);
  planet.add(ring);
  const ring2 = new THREE.Mesh(
    new THREE.RingGeometry(2.78, 2.88, 96),
    new THREE.MeshBasicMaterial({ color: 0xe3d3bc, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })
  );
  ring2.rotation.set(1.85, 0.35, 0.12);
  planet.add(ring2);
  scene.add(planet);

  /* ---------- satellites ---------- */
  const sats = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    const satCol = [0xe3a458, 0xe3d3bc, 0x7f3b2d][i];
    const m = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.11, 2),
      new THREE.MeshStandardMaterial({ color: satCol, emissive: satCol, emissiveIntensity: 0.9 })
    );
    const r = 2.15 + i * 0.55;
    g.add(m);
    planet.add(g);
    sats.push({ g, m, r, ph: (i / 3) * Math.PI * 2, speed: 0.4 + i * 0.25 });
    const orb = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.008, r + 0.008, 72),
      new THREE.MeshBasicMaterial({ color: 0xb09a7f, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false })
    );
    orb.rotation.copy(ring.rotation);
    planet.add(orb);
  }

  /* ---------- comet (velocity reactive) ---------- */
  const cometMat = new THREE.SpriteMaterial({
    map: radial("rgba(255,255,255,1)", "rgba(255,255,255,0)"),
    transparent: true, opacity: 0, blending: THREE.NormalBlending, depthWrite: false,
  });
  const comet = new THREE.Sprite(cometMat);
  comet.scale.set(1.2, 1.2, 1);
  scene.add(comet);
  let cometA = Math.random() * Math.PI * 2;

  /* ---------- bloom ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.45, 0.6, 0.3);
  composer.addPass(bloom);

  /* ---------- camera flight path (section by section) ---------- */
  const WAY = [
    [0.00, [0, 0, 6.0]],      // hero — close-up planet
    [0.10, [2.8, 0.9, 5.4]],  // mission
    [0.22, [4.4, 1.5, 4.6]],  // studies
    [0.34, [0, 2.7, 5.8]],    // college — high orbit
    [0.46, [-4, 1.1, 4.4]],   // applications
    [0.58, [2.9, -1.5, 5.0]], // extracurriculars
    [0.70, [0, 0, 3.6]],      // schedule — dive in
    [0.82, [-2.6, 1.9, 4.2]], // meal
    [0.93, [0, -1.7, 5.4]],   // training
    [1.00, [0, 0, 10.0]],     // deadlines/footer — pull out to hyperspace
  ];
  function camAt(p) {
    p = Math.max(0, Math.min(1, p)) * (WAY.length - 1);
    const i = Math.min(WAY.length - 2, Math.floor(p));
    const t = p - i;
    const s = t * t * (3 - 2 * t);
    const a = WAY[i][1], b = WAY[i + 1][1];
    return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];
  }

  /* ---------- input ---------- */
  let mx = 0, my = 0;
  if (!coarse && !reduced) {
    window.addEventListener("mousemove", (e) => {
      mx = (e.clientX / window.innerWidth) * 2 - 1;
      my = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }
  window.addEventListener("section-change", () => {
    bloomBoost = 1.7;
    // tint the scene to the arriving planet's accent
    const hex = window.__planetAccent;
    if (hex) {
      const c = new THREE.Color(hex);
      wire.material.color.set(c);
      ring2.material.color.set(c);
      cometMat.color.set(c);
      rim.color.set(c);
    }
  });

  /* ---------- main loop ---------- */
  let bloomBoost = 0;
  const clock = new THREE.Clock();

  function loop() {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;

    const prog = window.__scrollProg || 0;
    const vel = window.__scrollVel || 0;
    const speed = 1 + Math.min(4, Math.abs(vel) * 0.9);

    // stars drift + hyperspace stretch
    starLayers.forEach((s, i) => {
      s.pts.rotation.y += dt * 0.004 * (i + 1);
      s.pts.rotation.x += dt * 0.001 * (i % 2 ? 1 : -1);
      s.mat.size = s.size * (1 + Math.min(3.2, Math.abs(vel) * 1.1));
    });

    // planet
    planet.rotation.y += dt * 0.06 * speed;
    wire.rotation.y -= dt * 0.02;
    wire.rotation.z += dt * 0.012;
    const planetPulse = 1 + Math.min(0.18, Math.abs(vel) * 0.05);
    core.scale.setScalar(planetPulse);
    wire.scale.setScalar(1 + (planetPulse - 1) * 0.7);

    // satellites
    sats.forEach((s) => {
      s.ph += dt * s.speed * speed;
      s.g.position.set(Math.cos(s.ph) * s.r, 0, Math.sin(s.ph) * s.r);
      s.g.lookAt(planet.position);
    });

    // comet — streaks harder as you scroll faster
    cometA += dt * (0.12 + Math.min(1.6, Math.abs(vel) * 0.5));
    const cr = 7 + Math.abs(vel) * 2;
    comet.position.set(Math.cos(cometA) * cr, Math.sin(cometA * 1.3) * 1.2, Math.sin(cometA) * cr - 4);
    cometMat.opacity = Math.min(0.95, 0.16 + Math.abs(vel) * 0.5);
    const cs = 1 + Math.abs(vel) * 0.8;
    comet.scale.set(cs, cs, 1);

    // nebulae breathe
    nebulas.forEach((n, i) => {
      n.material.opacity = 0.32 + Math.sin(t * 0.3 + i * 1.7) * 0.12;
    });

    // camera flies along the section path + mouse parallax
    const cp = camAt(prog);
    camera.position.x = cp[0] + mx * 0.7;
    camera.position.y = cp[1] + my * 0.5;
    camera.position.z = cp[2];
    camera.lookAt(0, 0, 0);

    // bloom surges on fast scroll + section changes
    bloomBoost = Math.max(0, bloomBoost - dt * 1.2);
    bloom.strength = 0.4 + Math.min(0.8, Math.abs(vel) * 0.3) + bloomBoost;

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
    window.__scrollProg = 0;
    composer.render();
  } else {
    loop();
  }

  window.__scene3d = { ok: true };
} catch (err) {
  console.warn("3D scene disabled:", err);
  window.__scene3d = { ok: false, err: String(err) };
}
