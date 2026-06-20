/**
 * liquidGL — Apple SDF + live controls.
 * https://github.com/naughtyduk/liquidGL
 */
(function () {
  'use strict';

  var DEFAULTS = {
    borderRadius: 300,
    refraction: 0.003,
    bevelDepth: 0,
    bevelWidth: 0.088,
    magnify: 1.017,
    saturationBoost: 1.15,
    frost: 0.8,
    resolution: 2.5,
    tintOpacity: 0,
    specularOpacity: 0.5,
    tiltFactor: 4,
    specular: false,
    shadow: true,
    tilt: false
  };

  var params = Object.assign({}, DEFAULTS);
  var resolutionTimer;
  var uiInited = false;
  var toneRaf = 0;
  var LUMINANCE_THRESHOLD = 0.58;

  function forEachLens(fn) {
    var renderer = window.__liquidGLRenderer__;
    if (!renderer || !renderer.lenses) return;
    renderer.lenses.forEach(fn);
  }

  function getRenderer() {
    return window.__liquidGLRenderer__ || null;
  }

  function setCssVar(name, value) {
    document.documentElement.style.setProperty(name, String(value));
  }

  function applyBorderRadius(value) {
    var px = value + 'px';
    document.querySelectorAll('.liquidGL-apple:not(.liquidGL--icon)').forEach(function (el) {
      el.style.borderRadius = px;
    });
    forEachLens(function (lens) {
      lens.updateMetrics();
    });
  }

  function applyLensOptions() {
    forEachLens(function (lens) {
      lens.options.refraction = params.refraction;
      lens.options.bevelDepth = params.bevelDepth;
      lens.options.bevelWidth = params.bevelWidth;
      lens.options.magnify = params.magnify;
      lens.options.centerRefraction = 0;
      lens.options.lensSpread = 0;
      lens.options.lensCurve = 0;
      lens.options.lensConcave = false;
      lens.options.bevelFlat = false;
      lens.options.bevelApple = true;
      lens.options.saturationBoost = params.saturationBoost;
      lens.options.frost = params.frost;
      lens.options.tiltFactor = params.tiltFactor;
      lens.options.specular = params.specular;
      lens.setShadow(params.shadow);
      lens.setTilt(params.tilt);
    });
  }

  function applyCssLayers() {
    setCssVar('--liquidgl-radius', params.borderRadius + 'px');
    setCssVar('--liquidgl-tint-opacity', params.tintOpacity);
    setCssVar('--liquidgl-specular-opacity', params.specularOpacity);
    applyBorderRadius(params.borderRadius);
  }

  function applyAll() {
    applyLensOptions();
    applyCssLayers();
  }

  function scheduleResolutionRecapture(value) {
    clearTimeout(resolutionTimer);
    resolutionTimer = setTimeout(function () {
      var renderer = getRenderer();
      if (!renderer) return;
      renderer._snapshotResolution = Math.max(0.5, Math.min(3, value));
      if (renderer.captureSnapshot) {
        Promise.resolve(renderer.captureSnapshot()).then(function () {
          scheduleTextToneUpdate();
        });
      }
    }, 400);
  }

  function formatOutput(id, value) {
    var out = document.getElementById(id);
    if (!out) return;
    if (id === 'out-radius' || id === 'out-tilt-factor' || id === 'out-resolution') {
      out.textContent = String(Math.round(value * 10) / 10).replace(/\.0$/, '');
      return;
    }
    out.textContent = Number(value).toFixed(3).replace(/\.?0+$/, '');
  }

  function bindRange(id, key, outId, onChange) {
    var input = document.getElementById(id);
    if (!input) return;

    input.addEventListener('input', function () {
      var value = parseFloat(input.value);
      params[key] = value;
      formatOutput(outId, value);
      if (onChange) {
        onChange(value);
      } else {
        applyAll();
      }
    });
  }

  function bindCheckbox(id, key) {
    var input = document.getElementById(id);
    if (!input) return;

    input.addEventListener('change', function () {
      params[key] = input.checked;
      applyAll();
    });
  }

  function getExportJson() {
    return JSON.stringify({
      appleSDF: {
        resolution: params.resolution,
        refraction: params.refraction,
        bevelDepth: params.bevelDepth,
        bevelWidth: params.bevelWidth,
        frost: params.frost,
        magnify: params.magnify,
        saturationBoost: params.saturationBoost,
        bevelApple: true,
        shadow: params.shadow,
        specular: params.specular,
        tilt: params.tilt,
        tiltFactor: params.tiltFactor
      },
      css: {
        borderRadius: params.borderRadius + 'px',
        tintOpacity: params.tintOpacity,
        specularOpacity: params.specularOpacity
      }
    }, null, 2);
  }

  function showToast(message) {
    var toast = document.getElementById('glass-controls-toast');
    if (!toast) return;
    toast.textContent = message;
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () {
      toast.textContent = '';
    }, 2200);
  }

  function syncControlsFromParams() {
    Object.keys(DEFAULTS).forEach(function (key) {
      var ctrlMap = {
        borderRadius: 'ctrl-radius',
        refraction: 'ctrl-refraction',
        bevelDepth: 'ctrl-bevel-depth',
        bevelWidth: 'ctrl-bevel-width',
        magnify: 'ctrl-magnify',
        saturationBoost: 'ctrl-saturation',
        frost: 'ctrl-frost',
        resolution: 'ctrl-resolution',
        tintOpacity: 'ctrl-tint',
        specularOpacity: 'ctrl-specular-css',
        tiltFactor: 'ctrl-tilt-factor'
      };
      var outMap = {
        borderRadius: 'out-radius',
        refraction: 'out-refraction',
        bevelDepth: 'out-bevel-depth',
        bevelWidth: 'out-bevel-width',
        magnify: 'out-magnify',
        saturationBoost: 'out-saturation',
        frost: 'out-frost',
        resolution: 'out-resolution',
        tintOpacity: 'out-tint',
        specularOpacity: 'out-specular-css',
        tiltFactor: 'out-tilt-factor'
      };

      if (ctrlMap[key]) {
        var el = document.getElementById(ctrlMap[key]);
        if (el) el.value = params[key];
      }
      if (outMap[key]) formatOutput(outMap[key], params[key]);
    });

    var specular = document.getElementById('ctrl-specular');
    var shadow = document.getElementById('ctrl-shadow');
    var tilt = document.getElementById('ctrl-tilt');
    if (specular) specular.checked = params.specular;
    if (shadow) shadow.checked = params.shadow;
    if (tilt) tilt.checked = params.tilt;
  }

  function initControls() {
    bindRange('ctrl-radius', 'borderRadius', 'out-radius');
    bindRange('ctrl-refraction', 'refraction', 'out-refraction');
    bindRange('ctrl-bevel-depth', 'bevelDepth', 'out-bevel-depth');
    bindRange('ctrl-bevel-width', 'bevelWidth', 'out-bevel-width');
    bindRange('ctrl-magnify', 'magnify', 'out-magnify');
    bindRange('ctrl-saturation', 'saturationBoost', 'out-saturation');
    bindRange('ctrl-frost', 'frost', 'out-frost');
    bindRange('ctrl-resolution', 'resolution', 'out-resolution', function (value) {
      scheduleResolutionRecapture(value);
      applyAll();
    });
    bindRange('ctrl-tint', 'tintOpacity', 'out-tint');
    bindRange('ctrl-specular-css', 'specularOpacity', 'out-specular-css');
    bindRange('ctrl-tilt-factor', 'tiltFactor', 'out-tilt-factor');

    bindCheckbox('ctrl-specular', 'specular');
    bindCheckbox('ctrl-shadow', 'shadow');
    bindCheckbox('ctrl-tilt', 'tilt');

    var resetBtn = document.getElementById('ctrl-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        params = Object.assign({}, DEFAULTS);
        syncControlsFromParams();
        applyAll();
        scheduleResolutionRecapture(params.resolution);
        showToast('Сброшено к Apple SDF');
      });
    }

    var copyBtn = document.getElementById('ctrl-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var json = getExportJson();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(json).then(function () {
            showToast('JSON скопирован');
          }).catch(function () {
            console.log(json);
            showToast('JSON в консоли');
          });
        } else {
          console.log(json);
          showToast('JSON в консоли');
        }
      });
    }
  }

  function applyZoneTextTone(tone) {
    var panel = document.getElementById('glass-sticky-panel');
    if (!panel || (tone !== 'black' && tone !== 'white')) return;
    if (panel.classList.contains('glass-text-tone--' + tone)) return;
    panel.classList.remove('glass-text-tone--black', 'glass-text-tone--white');
    panel.classList.add('glass-text-tone--' + tone);
  }

  function sampleLuminanceAt(clientX, clientY) {
    var renderer = getRenderer();
    if (!renderer || !renderer.staticSnapshotCanvas || !renderer.snapshotTarget) return null;

    var snapCanvas = renderer.staticSnapshotCanvas;
    var snapRect = renderer.snapshotTarget.getBoundingClientRect();
    var scale = renderer.scaleFactor || 1;
    var x = Math.round((clientX - snapRect.left) * scale);
    var y = Math.round((clientY - snapRect.top) * scale);

    if (x < 0 || y < 0 || x >= snapCanvas.width || y >= snapCanvas.height) return null;

    var ctx = snapCanvas.getContext('2d');
    if (!ctx) return null;

    var pixel = ctx.getImageData(x, y, 1, 1).data;
    return (0.2126 * pixel[0] + 0.7152 * pixel[1] + 0.0722 * pixel[2]) / 255;
  }

  function updateTextToneFromBackground() {
    var buttons = document.querySelectorAll('.liquidGL-apple');
    if (!buttons.length) return;

    var luminances = [];
    buttons.forEach(function (btn) {
      var rect = btn.getBoundingClientRect();
      var lum = sampleLuminanceAt(rect.left + rect.width * 0.5, rect.top + rect.height * 0.5);
      if (lum !== null) luminances.push(lum);
    });

    if (!luminances.length) return;

    var avg = luminances.reduce(function (sum, value) { return sum + value; }, 0) / luminances.length;
    applyZoneTextTone(avg >= LUMINANCE_THRESHOLD ? 'black' : 'white');
  }

  function scheduleTextToneUpdate() {
    if (toneRaf) return;
    toneRaf = requestAnimationFrame(function () {
      toneRaf = 0;
      updateTextToneFromBackground();
    });
  }

  function initScrollZones() {
    var zones = document.querySelectorAll('.glass-zone[data-zone-id]');
    if (!zones.length) return;

    var label = document.getElementById('glass-zone-label');
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.42) {
          if (label) label.textContent = entry.target.getAttribute('data-zone-label') || '';
        }
      });
    }, { threshold: [0.42, 0.55, 0.7] });

    zones.forEach(function (zone) { observer.observe(zone); });

    window.addEventListener('scroll', scheduleTextToneUpdate, { passive: true });
    window.addEventListener('resize', scheduleTextToneUpdate, { passive: true });
    scheduleTextToneUpdate();
  }

  function initLiquidHover() {
    var buttons = document.querySelectorAll('.liquidGL-apple');
    if (!buttons.length) return;

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hoverScale = reducedMotion ? 1.012 : 1.024;
    var maxFollow = reducedMotion ? 0 : 4.5;
    var hoverStates = new WeakMap();

    function syncLens(btn) {
      var renderer = getRenderer();
      if (!renderer) return;
      renderer.lenses.forEach(function (lens) {
        if (lens.el === btn) lens.updateMetrics();
      });
      renderer.render();
    }

    buttons.forEach(function (btn) {
      var state = {
        tx: 0,
        ty: 0,
        targetX: 0,
        targetY: 0,
        active: false,
        raf: 0
      };
      hoverStates.set(btn, state);

      function tick() {
        var s = hoverStates.get(btn);
        s.tx += (s.targetX - s.tx) * 0.16;
        s.ty += (s.targetY - s.ty) * 0.16;
        var scale = s.active ? hoverScale : 1;
        var nearRest = !s.active &&
          Math.abs(s.tx) < 0.04 &&
          Math.abs(s.ty) < 0.04 &&
          Math.abs(s.targetX) < 0.04 &&
          Math.abs(s.targetY) < 0.04;

        if (nearRest) {
          btn.style.transform = '';
          s.tx = 0;
          s.ty = 0;
          s.raf = 0;
          syncLens(btn);
          return;
        }

        btn.style.transform =
          'translate3d(' + s.tx.toFixed(2) + 'px,' + s.ty.toFixed(2) + 'px,0) scale(' + scale + ')';
        syncLens(btn);
        s.raf = requestAnimationFrame(tick);
      }

      function startTick() {
        var s = hoverStates.get(btn);
        if (!s.raf) s.raf = requestAnimationFrame(tick);
      }

      btn.addEventListener('mouseenter', function () {
        var s = hoverStates.get(btn);
        s.active = true;
        btn.classList.add('liquidGL--lift');
        startTick();
      });

      btn.addEventListener('mousemove', function (e) {
        var s = hoverStates.get(btn);
        if (!s.active || !maxFollow) return;
        var rect = btn.getBoundingClientRect();
        var cx = rect.left + rect.width * 0.5;
        var cy = rect.top + rect.height * 0.5;
        var pctX = (e.clientX - cx) / (rect.width * 0.5);
        var pctY = (e.clientY - cy) / (rect.height * 0.5);
        s.targetX = Math.max(-1, Math.min(1, pctX)) * maxFollow;
        s.targetY = Math.max(-1, Math.min(1, pctY)) * maxFollow;
        startTick();
      });

      btn.addEventListener('mouseleave', function () {
        var s = hoverStates.get(btn);
        s.active = false;
        s.targetX = 0;
        s.targetY = 0;
        btn.classList.remove('liquidGL--lift');
        startTick();
      });
    });
  }

  function onLiquidGLReady() {
    if (uiInited) return;
    uiInited = true;
    document.body.classList.add('liquidgl-ready');
    document.querySelectorAll('.liquidGL-apple').forEach(function (el) {
      el.style.pointerEvents = 'auto';
    });
    syncControlsFromParams();
    initControls();
    initLiquidHover();
    scheduleTextToneUpdate();
  }

  function initLiquidGL() {
    if (typeof liquidGL !== 'function') {
      console.error('liquidGL: библиотека не загружена');
      return;
    }

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      params.tilt = false;
    }

    applyCssLayers();

    liquidGL({
      snapshot: '.glass-test-scene',
      target: '.liquidGL-apple',
      resolution: params.resolution,
      refraction: params.refraction,
      bevelDepth: params.bevelDepth,
      bevelWidth: params.bevelWidth,
      frost: params.frost,
      magnify: params.magnify,
      centerRefraction: 0,
      lensSpread: 0,
      lensCurve: 0,
      lensConcave: false,
      bevelFlat: false,
      bevelApple: true,
      saturationBoost: params.saturationBoost,
      shadow: params.shadow,
      specular: params.specular,
      reveal: 'fade',
      tilt: params.tilt,
      tiltFactor: params.tiltFactor,
      on: { init: onLiquidGLReady }
    });
  }

  function init() {
    initScrollZones();
    initLiquidGL();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
