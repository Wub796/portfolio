/* ============================================================
   WARP FX — WebGPU hyperspace transition (vgpu)
   vercel-labs/vgpu drives a WGSL starfield-streak shader that
   renders fullscreen during SPA page swaps. Loaded lazily the
   first time a data-warp link is hovered/clicked; on browsers
   without WebGPU the module never loads and the site keeps its
   existing CSS-only transition. Every failure path is silent.
   ============================================================ */
(function () {
  "use strict";

  if (window.__warpFX) return;

  var VGPU_FALLBACK_URL = "./vendor/vgpu.esm.mjs";
  var WARP_MS = 850;

  /* Planet accent color catalogue (aligns with scene.js catalogue) */
  var PLANET_ACCENTS = {
    sol:              [0.89, 0.64, 0.35], // #e3a458
    mission:          [0.89, 0.64, 0.35], // #e3a458
    studies:          [0.63, 0.41, 0.20], // #a26833
    college:          [0.50, 0.23, 0.18], // #7f3b2d
    applications:     [0.32, 0.19, 0.13], // #523122
    extracurriculars: [0.79, 0.63, 0.42], // #c9a06b
    schedule:         [0.73, 0.54, 0.35], // #b98a5a
    meal:             [0.85, 0.70, 0.42], // #d9b26a
    training:         [0.54, 0.42, 0.31], // #8a6a4f
    deadlines:        [0.91, 0.78, 0.61], // #e8c89b
  };

  var state = {
    ready: false,       // vgpu context + pipeline warmed
    loading: false,     // dynamic import in flight
    playing: false,
    canvas: null,
    gpu: null,
    vgpu: window.__vgpuModule || null,
    surface: null,
    effect: null,
    loop: null,
    start: 0,
    tint: [0.63, 0.41, 0.2],   // milk-tea accent, overridden per planet
    onDone: null,
    reduced: typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  };

  var SHADER = /* wgsl */ `
struct Params {
  time: f32,        // seconds since warp start
  aspect: f32,      // width / height
  strength: f32,    // overall flash intensity
  tint: vec4f,      // page accent color
}
@group(0) @binding(0) var<uniform> params: Params;

fn hash21(p: vec2f) -> f32 {
  var q = fract(p * vec2f(123.34, 345.45));
  q += dot(q, q + 34.345);
  return fract(q.x * q.y);
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  // centered, aspect-corrected coordinates
  let p = (uv - vec2f(0.5)) * vec2f(params.aspect, 1.0);
  let r = length(p);
  let a = atan2(p.y, p.x);

  // hyperspace: radial streaks whose speed and density surge over time
  let t = params.time;
  let speed = 2.0 + t * t * 5.0;
  let streaks = 90.0;
  let lanes = fract(a / 6.2831853 * streaks + hash21(vec2f(floor(a / 6.2831853 * streaks), 7.0)) * 0.35);

  // stars ride outward; streak length grows with speed
  let z = fract(hash21(vec2f(floor(a / 6.2831853 * streaks), 3.0)) + r * 0.35 - t * speed * 0.18);
  let streak = pow(1.0 - z, 6.0) * smoothstep(0.05, 0.5, r);

  // tunnel flash: whole frame washes to accent, then to white at peak
  let flash = smoothstep(0.0, 0.35, t) * (1.0 - smoothstep(0.55, 1.0, t / max(params.strength, 0.001)));
  let core = smoothstep(0.35, 0.0, r) * flash;

  let col = params.tint.rgb * (streak * 1.6 + core * 2.2) + vec3f(flash * 0.35);
  let alpha = clamp(streak * 1.4 + core * 1.6 + flash * 0.25, 0.0, 1.0) * params.strength;
  return vec4f(col * params.strength, alpha);
}
`;

  function resolveVgpuUrl() {
    if (document.currentScript && document.currentScript.src) {
      try {
        return new URL("../vendor/vgpu.esm.mjs", document.currentScript.src).href;
      } catch (e) {}
    }
    return VGPU_FALLBACK_URL;
  }

  function ensureCanvas() {
    if (state.canvas && state.canvas.parentNode) return state.canvas;
    var existing = document.getElementById("warpfx");
    if (existing) {
      state.canvas = existing;
      return existing;
    }
    var c = document.createElement("canvas");
    c.id = "warpfx";
    c.setAttribute("aria-hidden", "true");
    var parent = document.body || document.documentElement;
    if (parent) parent.appendChild(c);
    state.canvas = c;
    return c;
  }

  function accentRGB(targetSlug) {
    if (targetSlug && PLANET_ACCENTS[targetSlug]) {
      return PLANET_ACCENTS[targetSlug];
    }
    var probe = document.getElementById("cursorDot") || document.body;
    var v = probe ? (getComputedStyle(probe).getPropertyValue("--accent") || "#a26833").trim() : "#a26833";
    var hex = v.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(function (ch) { return ch + ch; }).join("");
    var n = parseInt(hex, 16);
    if (isNaN(n)) return [0.63, 0.41, 0.2];
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  /* Lazily import the vendored vgpu bundle and warm the pipeline. */
  function prepare() {
    if (state.ready || state.loading || state.reduced) return Promise.resolve(false);
    if (!navigator.gpu) return Promise.resolve(false); // no WebGPU: keep CSS transition
    state.loading = true;
    var vgpuUrl = resolveVgpuUrl();
    var loadPromise = state.vgpu
      ? Promise.resolve(state.vgpu) /* module already stashed by a harness or embedder */
      : import(/* webpackIgnore: true */ vgpuUrl);

    return loadPromise
      .then(function (vgpu) {
        state.vgpu = vgpu;
        return vgpu.init({ powerPreference: "low-power" });
      })
      .then(function (gpu) {
        state.gpu = gpu;
        var canvas = ensureCanvas();
        state.surface = state.vgpu.surface(gpu, canvas, {
          alphaMode: "premultiplied",
          dpr: [1, 1.5],
        });
        state.effect = state.vgpu.effect(gpu, SHADER, {
          label: "warp",
          blend: "premultiplied",
          set: { params: { time: 0, aspect: 1, strength: 1, tint: [0, 0, 0, 0] } },
        });
        /* surface targets exist only inside a frame — warm the pipeline
           by drawing one zero-strength frame instead of compile() */
        state.effect.set({ params: { time: 0, aspect: 1, strength: 0, tint: [0, 0, 0, 0] } });
        return state.vgpu.frame(gpu, function (frame) {
          frame.pass({ target: state.surface, clear: { r: 0, g: 0, b: 0, a: 0 } }, state.effect);
        }).done;
      })
      .then(function () {
        state.ready = true;
        state.loading = false;
        return true;
      })
      .catch(function () {
        // Any failure — device lost, compile error, surface issue —
        // silently falls back to the CSS-only transition.
        state.loading = false;
        dispose();
        return false;
      });
  }

  function dispose() {
    if (state.loop) { try { state.loop.stop(); } catch (e) {} state.loop = null; }
    if (state.gpu) { try { state.gpu.dispose(); } catch (e) {} state.gpu = null; }
    state.surface = null;
    state.effect = null;
    state.ready = false;
    if (state.canvas && state.canvas.parentNode) state.canvas.parentNode.removeChild(state.canvas);
    state.canvas = null;
  }

  function resize() {
    if (!state.surface || !state.canvas) return;
    var w = Math.max(1, window.innerWidth);
    var h = Math.max(1, window.innerHeight);
    state.canvas.style.width = w + "px";
    state.canvas.style.height = h + "px";
    /* surface autoResize tracks canvas layout; we only set CSS size here */
  }

  function tickFrame(vgpu) {
    if (!state.playing || !state.gpu) return;
    var t = (performance.now() - state.start) / 1000;
    var u = Math.min(1, t / (WARP_MS / 1000));
    if (u >= 1) {
      stop();
      if (state.onDone) { var cb = state.onDone; state.onDone = null; cb(); }
      return;
    }
    /* intensity: quick attack, hold, release near the end */
    var strength = u < 0.15 ? u / 0.15 : (u > 0.8 ? (1 - u) / 0.2 : 1);
    state.effect.set({
      params: {
        time: t,
        aspect: window.innerWidth / Math.max(1, window.innerHeight),
        strength: Math.max(0, strength),
        tint: [state.tint[0], state.tint[1], state.tint[2], 1],
      },
    });
    vgpu.frame(state.gpu, function (frame) {
      frame.pass({ target: state.surface, clear: { r: 0, g: 0, b: 0, a: 0 } }, state.effect);
    });
  }

  function play(targetSlug, onDone) {
    if (typeof targetSlug === "function") {
      onDone = targetSlug;
      targetSlug = null;
    }
    state.onDone = onDone || null;
    if (!state.ready || state.reduced) {
      if (state.onDone) { var cb = state.onDone; state.onDone = null; cb(); }
      return false;
    }
    var vgpu = state.vgpu;
    if (!vgpu) return false;
    state.tint = accentRGB(targetSlug);
    resize();
    if (state.canvas) state.canvas.classList.add("is-on");
    state.start = performance.now();
    state.playing = true;
    if (state.loop) { try { state.loop.stop(); } catch (e) {} state.loop = null; }
    state.loop = vgpu.frameLoop(state.gpu, function () { tickFrame(vgpu); }, { fps: 60 });
    return true;
  }

  function stop() {
    state.playing = false;
    if (state.loop) { try { state.loop.stop(); } catch (e) {} state.loop = null; }
    if (state.canvas) state.canvas.classList.remove("is-on");
    if (state.gpu && state.surface && state.effect && state.vgpu) {
      try {
        state.effect.set({
          params: {
            time: 0,
            aspect: 1,
            strength: 0,
            tint: [0, 0, 0, 0],
          },
        });
        state.vgpu.frame(state.gpu, function (frame) {
          frame.pass({ target: state.surface, clear: { r: 0, g: 0, b: 0, a: 0 } }, state.effect);
        });
      } catch (e) {}
    }
  }

  /* allow an embedder/harness to inject an already-imported vgpu module */
  function stashModule(m) { if (m) state.vgpu = m; }

  window.__warpFX = {
    /** Preload after first idle; call once at boot. */
    warm: function () {
      if (state.reduced || state.ready || state.loading) return;
      var idle = window.requestIdleCallback || function (cb) { return setTimeout(cb, 300); };
      idle(function () { prepare().catch(function () {}); });
    },
    /** Play the hyperspace flash; calls onDone when finished (or immediately when unsupported). */
    play: function (targetSlug, onDone) {
      if (typeof targetSlug === "function") {
        onDone = targetSlug;
        targetSlug = null;
      }
      if (state.ready) {
        play(targetSlug, onDone);
        return;
      }
      prepare().then(function (ok) {
        if (ok) play(targetSlug, onDone);
        else if (onDone) onDone();
      });
    },
    /** True when the WebGPU path is live. */
    isReady: function () { return state.ready; },
    /** Stop and clear the active warp effect. */
    stop: stop,
    /** Internal: stash the imported module. */
    _module: stashModule,
    window: window,
  };
})();
