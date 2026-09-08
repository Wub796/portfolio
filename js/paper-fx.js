/* ============================================================
   PAPER FX — Paper Design Shaders Integration (@paper-design/shaders)
   Brings Paper Design shaders into "The System":
   1. Sol Hero Sun: godRaysFragmentShader radiating solar flares
   2. Planet Coronas: smokeRingFragmentShader creating atmospheric planetary haze
   3. Tactile Paper Texture: paperTextureFragmentShader providing editorial print depth
   Fully responsive, auto-pauses when offscreen, zero-cost reduced motion fallback.
   ============================================================ */
(function () {
  "use strict";

  if (window.__paperFX) return;

  var PLANET_CORONA_COLORS = {
    sol:              ["#ffffff", "#ffd600", "#e3a458", "#a26833"],
    mission:          ["#ffffff", "#ffd600", "#e3a458", "#a26833"],
    studies:          ["#ffffff", "#e3a458", "#a26833", "#523122"],
    college:          ["#ffffff", "#e3a458", "#7f3b2d", "#3a1810"],
    applications:     ["#ffffff", "#a26833", "#523122", "#22130c"],
    extracurriculars: ["#ffffff", "#e3a458", "#c9a06b", "#7a5530"],
    schedule:         ["#ffffff", "#e3a458", "#b98a5a", "#6a4a2a"],
    meal:             ["#ffffff", "#ffd600", "#d9b26a", "#7a5a22"],
    training:         ["#ffffff", "#c9a06b", "#8a6a4f", "#423020"],
    deadlines:        ["#ffffff", "#e8c89b", "#a26833", "#222123"],
  };

  var mounts = {
    sun: null,
    corona: null,
    paper: null,
  };

  var reducedMotion = typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  function hasWebGL2() {
    try {
      var canvas = document.createElement("canvas");
      return !!(window.WebGL2RenderingContext && canvas.getContext("webgl2"));
    } catch (e) {
      return false;
    }
  }

  function getPlanetSlug() {
    return document.body ? (document.body.dataset.planet || "sol") : "sol";
  }

  /* ------------------------------------------------------------
     1. HERO SUN — Paper Design God Rays Shader
     ------------------------------------------------------------ */
  function mountHeroSun(container) {
    if (!container || mounts.sun) return;
    var P = window.PaperShaders;
    if (!P || !P.ShaderMount || !P.godRaysFragmentShader) return;

    try {
      var noiseTex = P.getShaderNoiseTexture ? P.getShaderNoiseTexture() : undefined;
      var uniforms = {
        u_colorBloom: P.getShaderColorFromString("#ffd600cc"),
        u_colorBack: [0, 0, 0, 0],
        u_colors: [
          P.getShaderColorFromString("#ffffff"),
          P.getShaderColorFromString("#ffd600e6"),
          P.getShaderColorFromString("#e3a458e6"),
          P.getShaderColorFromString("#a26833b3"),
          P.getShaderColorFromString("#52312280")
        ],
        u_colorsCount: 5,
        u_density: 0.36,
        u_spotty: 0.20,
        u_midIntensity: 0.65,
        u_midSize: 0.28,
        u_intensity: 0.82,
        u_bloom: 0.45,
        u_noiseTexture: noiseTex,
        u_fit: 1,
        u_scale: 0.95,
        u_rotation: 0,
        u_offsetX: 0,
        u_offsetY: 0,
        u_originX: 0.5,
        u_originY: 0.5,
        u_worldWidth: 1,
        u_worldHeight: 1
      };

      var speed = reducedMotion ? 0 : 0.6;
      mounts.sun = new P.ShaderMount(
        container,
        P.godRaysFragmentShader,
        uniforms,
        { alpha: true, antialias: true },
        speed,
        0,
        1.5,
        1920 * 1080 * 2
      );
    } catch (err) {
      console.warn("[paper-fx] Hero sun mount failed:", err);
    }
  }

  /* ------------------------------------------------------------
     2. PLANET CORONA — Paper Design Smoke Ring Shader
     ------------------------------------------------------------ */
  function mountPlanetCorona(container, planetSlug) {
    if (!container || mounts.corona) return;
    var P = window.PaperShaders;
    if (!P || !P.ShaderMount || !P.smokeRingFragmentShader) return;

    try {
      var colors = PLANET_CORONA_COLORS[planetSlug] || PLANET_CORONA_COLORS.sol;
      var noiseTex = P.getShaderNoiseTexture ? P.getShaderNoiseTexture() : undefined;
      var uniforms = {
        u_colorBack: [0, 0, 0, 0],
        u_colors: colors.map(P.getShaderColorFromString),
        u_colorsCount: colors.length,
        u_thickness: 0.65,
        u_radius: 0.32,
        u_innerShape: 2.5,
        u_noiseScale: 2.2,
        u_noiseIterations: 3,
        u_noiseTexture: noiseTex,
        u_fit: 1,
        u_scale: 1.1,
        u_rotation: 0,
        u_offsetX: 0,
        u_offsetY: 0,
        u_originX: 0.5,
        u_originY: 0.5,
        u_worldWidth: 1,
        u_worldHeight: 1
      };

      var speed = reducedMotion ? 0 : 0.8;
      mounts.corona = new P.ShaderMount(
        container,
        P.smokeRingFragmentShader,
        uniforms,
        { alpha: true, antialias: true },
        speed,
        0,
        1.5,
        1024 * 1024
      );
    } catch (err) {
      console.warn("[paper-fx] Planet corona mount failed:", err);
    }
  }

  /* ------------------------------------------------------------
     3. TACTILE PAPER TEXTURE — Paper Design Texture Shader
     ------------------------------------------------------------ */
  function mountPaperTexture(container) {
    if (!container || mounts.paper) return;
    var P = window.PaperShaders;
    if (!P || !P.ShaderMount || !P.paperTextureFragmentShader) return;

    try {
      var noiseTex = P.getShaderNoiseTexture ? P.getShaderNoiseTexture() : undefined;
      var uniforms = {
        u_image: undefined,
        u_noiseTexture: noiseTex,
        u_colorFront: [0.72, 0.58, 0.42, 0.14],
        u_colorBack: [0.97, 0.95, 0.91, 0.0],
        u_contrast: 0.28,
        u_roughness: 0.32,
        u_fiber: 0.22,
        u_fiberSize: 0.2,
        u_crumples: 0.12,
        u_crumpleSize: 0.3,
        u_folds: 0.15,
        u_foldCount: 4,
        u_fade: 0,
        u_drops: 0.12,
        u_seed: 5.8,
        u_fit: 2,
        u_scale: 0.8,
        u_rotation: 0,
        u_offsetX: 0,
        u_offsetY: 0,
        u_originX: 0.5,
        u_originY: 0.5,
        u_worldWidth: 1,
        u_worldHeight: 1
      };

      mounts.paper = new P.ShaderMount(
        container,
        P.paperTextureFragmentShader,
        uniforms,
        { alpha: true },
        0,
        0,
        1,
        1920 * 1080 * 2
      );
    } catch (err) {
      console.warn("[paper-fx] Paper texture mount failed:", err);
    }
  }

  /* ------------------------------------------------------------
     LIFECYCLE MANAGEMENT
     ------------------------------------------------------------ */
  function destroyMount(key) {
    if (mounts[key]) {
      try {
        if (typeof mounts[key].dispose === "function") {
          mounts[key].dispose();
        }
      } catch (e) {}
      mounts[key] = null;
    }
  }

  function destroyAll() {
    destroyMount("sun");
    destroyMount("corona");
  }

  function init(targetSlug) {
    if (!hasWebGL2() || !window.PaperShaders) return;
    var slug = targetSlug || getPlanetSlug();

    // 1. Hero Sun (only present on Sol / index.html)
    var sunEl = document.querySelector(".hero__sun");
    if (sunEl) {
      if (!mounts.sun) mountHeroSun(sunEl);
    } else {
      destroyMount("sun");
    }

    // 2. Planet header corona
    var coronaEl = document.querySelector(".planet__corona");
    if (coronaEl) {
      destroyMount("corona");
      mountPlanetCorona(coronaEl, slug);
    } else {
      var planetEl = document.querySelector(".planet");
      if (planetEl && !planetEl.querySelector(".planet__corona")) {
        var c = document.createElement("div");
        c.className = "planet__corona";
        c.setAttribute("aria-hidden", "true");
        planetEl.prepend(c);
        destroyMount("corona");
        mountPlanetCorona(c, slug);
      }
    }

    // 3. Tactile Paper Texture
    var paperEl = document.getElementById("paperTexture");
    if (!paperEl && document.body) {
      paperEl = document.createElement("div");
      paperEl.id = "paperTexture";
      paperEl.setAttribute("aria-hidden", "true");
      var scene = document.getElementById("scene3d");
      if (scene && scene.parentNode) {
        scene.parentNode.insertBefore(paperEl, scene.nextSibling);
      } else {
        document.body.appendChild(paperEl);
      }
    }
    if (paperEl && !mounts.paper) {
      mountPaperTexture(paperEl);
    }
  }

  window.__paperFX = {
    init: init,
    update: init,
    destroy: destroyAll,
    getMounts: function () { return mounts; },
    version: "0.0.80",
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(); });
  } else {
    init();
  }
})();
