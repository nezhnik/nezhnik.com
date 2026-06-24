/**
 * liquidGL — интеграция на дубль главной (glass-site/).
 * Snapshot: один полный final-снимок всей .glass-snapshot-scene (вся высота, все img eager).
 *
 * Перенос на прод (nezhnik.com): вынести glass-site.js/css + scripts/ в общий бандл;
 * на страницах со стеклом — .glass-snapshot-scene, .liquidGL-apple, локальные img (без CDN);
 * Spline/тяжёлые блоки — data-liquid-ignore + отложенная загрузка.
 */
(function () {
  'use strict';

  var PARAMS = {
    borderRadius: 300,
    refraction: 0.0045,
    bevelDepth: 0,
    bevelWidth: 0.11,
    magnify: 1.02,
    saturationBoost: 1.15,
    frost: 0.55,
    resolution: 1.35,
    tintOpacity: 0,
    specularOpacity: 0.5,
    tiltFactor: 4,
    specular: false,
    shadow: false,
    tilt: false
  };

  var toneRaf = 0;
  var scrollRaf = 0;
  var toneViewportObserver = null;
  var toneState = new WeakMap();
  var TONE_LUM_THRESHOLD = 0.44;
  var TONE_LUM_TO_WHITE = 0.36;
  var TONE_LUM_TO_BLACK = 0.52;
  var TONE_LUM_SMOOTH = 0.12;
  var BACKDROP_FILL_SMOOTH = 0.2;
  var BACKDROP_LIGHTEN_MAX = 0.28;
  var BACKDROP_DARKEN_MAX = 0.24;
  var BACKDROP_DARK_FAINT_LIGHTEN = 0.09;
  var lastToneScrollY = -1;
  var inited = false;
  var snapshotReady = false;
  var resetLiquidHoverOnScroll = null;
  var recaptureScrollTimer = null;

  /* Apple CSS specular — только opacity блика, WebGL-физика из PARAMS */
  var APPLE_GLASS_SPECULAR = {
    light: 0.8,
    dark: 0.6
  };

  /* Mobile header — Telegram / Резюме (Figma Glass: Refraction 100, Depth 16, Frost 7, Splay 6, Light 80%) */
  var MOBILE_HEADER_GLASS = {
    frost: 0.07,
    refraction: 0.01,
    bevelDepth: 0.16,
    bevelWidth: 0.06,
    specularOpacity: 0.8
  };
  var MAX_FINAL_RECAPTURES = 10;

  var SNAPSHOT = {
    phase: 'idle',
    pipelineActive: false,
    finalAttempts: 0,
    resizeHooked: false
  };

  var captureStyleEl = null;
  var splineActivated = false;

  function getRenderer() {
    return window.__liquidGLRenderer__ || null;
  }

  function forEachLens(fn) {
    var renderer = getRenderer();
    if (!renderer || !renderer.lenses) return;
    renderer.lenses.forEach(fn);
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

  function applyCssLayers() {
    setCssVar('--liquidgl-radius', PARAMS.borderRadius + 'px');
    setCssVar('--liquidgl-tint-opacity', PARAMS.tintOpacity);
    setCssVar('--liquidgl-specular-opacity', PARAMS.specularOpacity);
    applyBorderRadius(PARAMS.borderRadius);
  }

  function applyLensOptions() {
    forEachLens(function (lens) {
      lens.options.refraction = PARAMS.refraction;
      lens.options.bevelDepth = PARAMS.bevelDepth;
      lens.options.bevelWidth = PARAMS.bevelWidth;
      lens.options.magnify = PARAMS.magnify;
      lens.options.centerRefraction = 0;
      lens.options.lensSpread = 0;
      lens.options.lensCurve = 0;
      lens.options.lensConcave = false;
      lens.options.bevelFlat = false;
      lens.options.bevelApple = true;
      lens.options.saturationBoost = PARAMS.saturationBoost;
      lens.options.frost = PARAMS.frost;
      lens.options.tiltFactor = PARAMS.tiltFactor;
      lens.options.specular = PARAMS.specular;
      lens.setShadow(PARAMS.shadow);
      lens.setTilt(PARAMS.tilt);
    });
  }

  function syncCanvasLayer() {
    var renderer = getRenderer();
    if (!renderer || !renderer.canvas) return;
    var maxZ = 0;
    renderer.lenses.forEach(function (lens) {
      var node = lens.el;
      while (node && node !== document.body) {
        var style = window.getComputedStyle(node);
        if (style.position !== 'static' && style.zIndex !== 'auto') {
          var z = parseInt(style.zIndex, 10);
          if (!isNaN(z) && z > maxZ) maxZ = z;
        }
        node = node.parentElement;
      }
    });
    renderer.canvas.style.zIndex = String(maxZ > 0 ? maxZ - 1 : 4);
  }

  function forceReveal(renderer) {
    if (!renderer) return;
    renderer.lenses.forEach(function (lens) {
      lens._revealProgress = 1;
      lens.el.style.opacity = lens.originalOpacity || '1';
      if (lens._shadowEl) lens._shadowEl.style.opacity = '1';
    });
    if (renderer.canvas) renderer.canvas.style.opacity = '1';
  }

  function getScene() {
    return document.querySelector('.glass-snapshot-scene');
  }

  function getSceneHeight() {
    var scene = getScene();
    if (!scene) return document.documentElement.scrollHeight;
    return Math.max(scene.scrollHeight, scene.offsetHeight);
  }

  function getSceneImages(scene) {
    return Array.prototype.filter.call(scene.querySelectorAll('img'), function (img) {
      return !img.closest('[data-liquid-ignore]');
    });
  }

  function allSceneImagesReady(scene) {
    var imgs = getSceneImages(scene);
    if (!imgs.length) return true;
    return imgs.every(function (img) {
      return img.complete && img.naturalWidth > 0;
    });
  }

  function primeCorsImage(img) {
    try {
      var src = img.currentSrc || img.src || '';
      if (!src) return;
      var url = new URL(src, window.location.href);
      if (url.origin === window.location.origin) return;
      if (img.crossOrigin !== 'anonymous') {
        img.crossOrigin = 'anonymous';
      }
      if (!img.complete) {
        img.src = '';
        img.src = src;
      }
    } catch (e) {}
  }

  function reloadCorsImages(scene) {
    getSceneImages(scene).forEach(function (img) {
      try {
        var src = img.currentSrc || img.src || '';
        if (!src) return;
        var url = new URL(src, window.location.href);
        if (url.origin === window.location.origin) return;
        if (img.crossOrigin === 'anonymous' && img.complete && img.naturalWidth > 0) return;
        img.crossOrigin = 'anonymous';
        img.src = '';
        img.src = src;
      } catch (e) {}
    });
  }

  function primeSceneImages(scene, mode) {
    getImagesForCapture(scene, mode).forEach(function (img) {
      img.loading = 'eager';
      if ('fetchPriority' in img) {
        try { img.fetchPriority = 'high'; } catch (e) {}
      }
      primeCorsImage(img);
    });
  }

  function injectCaptureStyles() {
    if (captureStyleEl) return;
    captureStyleEl = document.createElement('style');
    captureStyleEl.id = 'glass-capture-fix';
    captureStyleEl.textContent = [
      '.glass-snapshot-scene [data-w-id] {',
      '  opacity: 1 !important;',
      '  transform: none !important;',
      '  filter: none !important;',
      '}',
      '.glass-snapshot-scene .project_card_bento,',
      '.glass-snapshot-scene .project_card_bento *,',
      '.glass-snapshot-scene .home-v2-project-card,',
      '.glass-snapshot-scene .home-v2-project-card * {',
      '  opacity: 1 !important;',
      '}',
      '.glass-snapshot-scene img {',
      '  visibility: visible !important;',
      '}'
    ].join('\n');
    document.head.appendChild(captureStyleEl);
  }

  function removeCaptureStyles() {
    if (!captureStyleEl) return;
    captureStyleEl.remove();
    captureStyleEl = null;
  }

  function whenWebflowReady(callback) {
    if (document.documentElement.classList.contains('w-mod-ix')) {
      callback();
      return;
    }

    var done = false;
    function finish() {
      if (done) return;
      done = true;
      observer.disconnect();
      callback();
    }

    var observer = new MutationObserver(finish);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    setTimeout(finish, 3500);
  }

  function forceLoadImage(img, timeoutMs) {
    img.loading = 'eager';
    if ('fetchPriority' in img) {
      try { img.fetchPriority = 'high'; } catch (e) {}
    }

    var src = img.currentSrc || img.src;
    if (!src) return Promise.resolve();

    return new Promise(function (resolve) {
      var settled = false;

      function finish() {
        if (settled) return;
        settled = true;
        if (img.decode) {
          img.decode().then(resolve).catch(resolve);
        } else {
          resolve();
        }
      }

      if (img.complete && img.naturalWidth > 0) {
        finish();
        return;
      }

      img.addEventListener('load', finish, { once: true });
      img.addEventListener('error', finish, { once: true });
      setTimeout(finish, timeoutMs);
    });
  }

  function getImagesForCapture(scene, mode) {
    var imgs = getSceneImages(scene);
    if (mode !== 'quick') return imgs;

    var fold = window.innerHeight * 1.3;
    return imgs.filter(function (img) {
      var rect = img.getBoundingClientRect();
      return rect.width > 0 && rect.bottom > 0 && rect.top < fold;
    });
  }

  function preloadSceneImages(scene, mode, timeoutMs) {
    return Promise.all(getImagesForCapture(scene, mode).map(function (img) {
      return forceLoadImage(img, timeoutMs);
    }));
  }

  function whenLayoutStable(callback, opts) {
    opts = opts || {};
    var minStable = opts.minStableFrames || 6;
    var maxAttempts = opts.maxAttempts || 100;
    var lastH = 0;
    var stable = 0;
    var attempts = 0;

    function tick() {
      var h = getSceneHeight();
      if (Math.abs(h - lastH) < 2) stable += 1;
      else {
        stable = 0;
        lastH = h;
      }
      attempts += 1;

      if (stable >= minStable || attempts >= maxAttempts) {
        callback();
        return;
      }
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  function whenCaptureReady(mode, callback) {
    var scene = getScene();
    if (!scene) {
      callback();
      return;
    }

    var isQuick = mode === 'quick';
    var imgTimeout = isQuick ? 600 : 6000;
    var stableFrames = isQuick ? 1 : 6;
    var stableAttempts = isQuick ? 12 : 80;

    function runReady() {
      primeSceneImages(scene, mode);
      if (!isQuick) reloadCorsImages(scene);

      var waits = [preloadSceneImages(scene, mode, imgTimeout)];

      if (!isQuick && document.fonts && document.fonts.ready) {
        waits.push(document.fonts.ready.catch(function () {}));
      }

      Promise.all(waits).then(function () {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            whenLayoutStable(callback, {
              minStableFrames: stableFrames,
              maxAttempts: stableAttempts
            });
          });
        });
      });
    }

    if (isQuick) {
      runReady();
      return;
    }

    whenWebflowReady(runReady);
  }

  function wrapCapture(renderer) {
    var nativeCapture = renderer.captureSnapshot.bind(renderer);

    renderer.captureSnapshot = function () {
      injectCaptureStyles();
      return Promise.resolve().then(function () {
        return new Promise(function (resolve) {
          requestAnimationFrame(function () {
            requestAnimationFrame(resolve);
          });
        });
      }).then(function () {
        return nativeCapture();
      }).finally(function () {
        removeCaptureStyles();
      });
    };

    renderer._originalCaptureSnapshot = renderer.captureSnapshot;
  }

  function unlockCapture(renderer) {
    if (!renderer || !renderer._originalCaptureSnapshot) return;
    renderer._snapshotFrozen = false;
    snapshotReady = false;
    renderer.captureSnapshot = renderer._originalCaptureSnapshot;
  }

  function activateDeferredSpline() {
    if (splineActivated) return;
    var el = document.querySelector('.spline-scene[data-spline-defer-url]');
    if (!el) return;
    splineActivated = true;

    var url = el.getAttribute('data-spline-defer-url');
    if (!url) return;

    el.setAttribute('data-animation-type', 'spline');
    el.setAttribute('data-spline-url', url);

    if (window.Webflow && typeof window.Webflow.require === 'function') {
      try {
        var ix2 = window.Webflow.require('ix2');
        if (ix2 && typeof ix2.init === 'function') ix2.init();
      } catch (e) {}
    }
  }

  function scheduleDeferredSpline() {
    var el = document.querySelector('.spline-scene[data-spline-defer-url]');
    if (!el || splineActivated) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
        observer.disconnect();
        activateDeferredSpline();
      }, { rootMargin: '240px 0px' });
      observer.observe(el);
    }
  }

  function freezeCapture(renderer) {
    if (!renderer || renderer._snapshotFrozen) return;
    renderer._snapshotFrozen = true;
    snapshotReady = true;
    SNAPSHOT.phase = 'done';
    renderer.captureSnapshot = function () {
      return Promise.resolve(true);
    };
    scheduleTextToneUpdate();
    setTimeout(scheduleTextToneUpdate, 280);
    activateDeferredSpline();
  }

  function shouldFinalizeCapture(renderer) {
    var scene = getScene();
    if (!scene || !renderer) return false;
    if (!allSceneImagesReady(scene)) return false;

    var currentH = getSceneHeight();
    var snapH = renderer._snapshotDocHeight || 0;
    return Math.abs(currentH - snapH) <= 40;
  }

  function requestQuickCapture() {
    var renderer = getRenderer();
    if (!renderer) return;
    if (renderer._recapturePending || renderer._capturing) return;

    SNAPSHOT.phase = 'quick';
    renderer._recapturePending = true;
    unlockCapture(renderer);

    whenCaptureReady('quick', function () {
      renderer._recapturePending = false;
      if (!renderer._capturing) renderer.captureSnapshot();
    });
  }

  function requestFinalCapture() {
    var renderer = getRenderer();
    if (!renderer) return;
    if (renderer._recapturePending || renderer._capturing) return;

    if (SNAPSHOT.finalAttempts >= MAX_FINAL_RECAPTURES) {
      watchSceneResize();
      if (shouldFinalizeCapture(renderer)) {
        freezeCapture(renderer);
      }
      return;
    }

    SNAPSHOT.phase = 'final';
    SNAPSHOT.finalAttempts += 1;
    renderer._recapturePending = true;
    unlockCapture(renderer);

    whenCaptureReady('final', function () {
      renderer._recapturePending = false;
      if (!renderer._capturing) renderer.captureSnapshot();
    });
  }

  function watchSceneResize() {
    if (SNAPSHOT.resizeHooked || !window.ResizeObserver) return;
    var scene = getScene();
    if (!scene) return;

    SNAPSHOT.resizeHooked = true;
    var lastH = getSceneHeight();

    new ResizeObserver(function () {
      if (SNAPSHOT.phase !== 'done') return;
      var renderer = getRenderer();
      if (!renderer || renderer._capturing || renderer._recapturePending) return;

      var h = getSceneHeight();
      if (Math.abs(h - lastH) < 80) return;
      lastH = h;

      SNAPSHOT.phase = 'final';
      SNAPSHOT.finalAttempts = 0;
      requestFinalCapture();
    }).observe(scene);
  }

  function lockSnapshotAfterUpload(renderer) {
    if (!renderer || renderer._uploadHooked) return;
    renderer._uploadHooked = true;
    wrapCapture(renderer);

    var originalUpload = renderer._uploadTexture.bind(renderer);

    renderer._uploadTexture = function (srcCanvas) {
      if (!srcCanvas || !srcCanvas.width) return;
      originalUpload(srcCanvas);

      applyLensOptions();
      syncCanvasLayer();
      renderer.render();
      forceReveal(renderer);
      document.querySelectorAll('.liquidGL-apple').forEach(function (btn) {
        var state = toneState.get(btn);
        if (state) state.lum = null;
      });
      scheduleTextToneUpdate();

      if (SNAPSHOT.phase === 'quick') {
        SNAPSHOT.phase = 'final';
        SNAPSHOT.finalAttempts = 0;
        requestFinalCapture();
        return;
      }

      whenLayoutStable(function () {
        if (shouldFinalizeCapture(renderer)) {
          applyLensOptions();
          renderer.render();
          freezeCapture(renderer);
          watchSceneResize();
          return;
        }
        if (!renderer._recapturePending) {
          requestFinalCapture();
        }
      }, { minStableFrames: 4, maxAttempts: 60 });
    };
  }

  function startSnapshotPipeline() {
    if (SNAPSHOT.pipelineActive) return;
    SNAPSHOT.pipelineActive = true;

    SNAPSHOT.phase = 'final';
    SNAPSHOT.finalAttempts = 0;
    requestFinalCapture();
  }

  function getButtonTone(btn) {
    var state = toneState.get(btn);
    if (state && (state.tone === 'black' || state.tone === 'white')) return state.tone;
    if (btn.classList.contains('glass-text-tone--white')) return 'white';
    return 'black';
  }

  function shouldUseAppleGlassPreset(btn, tone) {
    if (!btn) return null;
    if (isMobileHeaderGlassButton(btn)) return null;
    if (tone === 'white') return 'dark';
    if (tone === 'black') return 'light';
    return null;
  }

  function isMobileHeaderGlassButton(btn) {
    if (!btn) return false;
    if (
      btn.closest('.home-v2-cta') &&
      btn.classList.contains('liquidGL--primary') &&
      btn.querySelector('.liquidGL-label--telegram')
    ) {
      return true;
    }
    var w = window.innerWidth || document.documentElement.clientWidth || 1280;
    if (w > 991) return false;
    if (!btn.closest('.glass-site-page .header')) return false;
    if (btn.classList.contains('liquidGL--primary') && btn.querySelector('.liquidGL-label--telegram')) {
      return true;
    }
    return !!btn.querySelector('.liquidGL-label--resume');
  }

  function applyLensGlassForButton(btn, tone) {
    var renderer = getRenderer();
    if (!renderer || !btn) return;

    var preset = shouldUseAppleGlassPreset(btn, tone);
    var mobileHeader = isMobileHeaderGlassButton(btn);

    renderer.lenses.forEach(function (lens) {
      if (lens.el !== btn) return;

      if (mobileHeader) {
        lens.options.frost = MOBILE_HEADER_GLASS.frost;
        lens.options.refraction = MOBILE_HEADER_GLASS.refraction;
        lens.options.bevelDepth = MOBILE_HEADER_GLASS.bevelDepth;
        lens.options.bevelWidth = MOBILE_HEADER_GLASS.bevelWidth;
        lens.options.magnify = PARAMS.magnify;
        lens.options.saturationBoost = PARAMS.saturationBoost;
        lens.options.specular = PARAMS.specular;
        btn.style.setProperty('--liquidgl-specular-opacity', String(MOBILE_HEADER_GLASS.specularOpacity));
        return;
      }

      lens.options.frost = PARAMS.frost;
      lens.options.refraction = PARAMS.refraction;
      lens.options.bevelDepth = PARAMS.bevelDepth;
      lens.options.bevelWidth = PARAMS.bevelWidth;
      lens.options.magnify = PARAMS.magnify;
      lens.options.saturationBoost = PARAMS.saturationBoost;
      lens.options.specular = PARAMS.specular;

      if (preset === 'light') {
        btn.style.setProperty('--liquidgl-specular-opacity', String(APPLE_GLASS_SPECULAR.light));
      } else if (preset === 'dark') {
        btn.style.setProperty('--liquidgl-specular-opacity', String(APPLE_GLASS_SPECULAR.dark));
      } else {
        btn.style.setProperty('--liquidgl-specular-opacity', String(PARAMS.specularOpacity));
      }
    });

    renderer.render();
  }

  function applyButtonShadow(btn) {
    if (!btn) return;
    if (shouldUseAppleGlassPreset(btn, getButtonTone(btn))) {
      btn.style.removeProperty('--liquidgl-shadow');
      return;
    }
    var label = btn.querySelector('.liquidGL-label');
    if (!label) return;
    var rgb = getComputedStyle(label).color.match(/\d+/g);
    if (!rgb || rgb.length < 3) return;
    var lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
    btn.style.setProperty('--liquidgl-shadow', lum > 0.6 ? '#BCBCBC' : '#F5F5F5');
  }

  function applyButtonTextTone(btn, tone) {
    if (!btn || (tone !== 'black' && tone !== 'white')) return;
    var next = 'glass-text-tone--' + tone;
    if (btn.classList.contains(next)) {
      applyButtonShadow(btn);
      applyLensGlassForButton(btn, tone);
      return;
    }
    btn.classList.remove('glass-text-tone--black', 'glass-text-tone--white');
    btn.classList.add(next);
    applyButtonShadow(btn);
    applyLensGlassForButton(btn, tone);
  }

  function backdropStrengthFromFill(fill, isLight) {
    if (isLight || fill >= 0.42) {
      var lightT = Math.max(0, Math.min(1, (fill - 0.4) / 0.45));
      return {
        lighten: Math.min(BACKDROP_LIGHTEN_MAX, 0.12 + lightT * (BACKDROP_LIGHTEN_MAX - 0.12)),
        darken: 0
      };
    }

    var darkK = Math.min(1, (0.42 - fill) / 0.32);
    return {
      lighten: 0.055 + darkK * (BACKDROP_DARK_FAINT_LIGHTEN - 0.055),
      darken: Math.min(BACKDROP_DARKEN_MAX * 0.12, darkK * BACKDROP_DARKEN_MAX * 0.1)
    };
  }

  function smoothBackdropFill(btn, fill) {
    var state = toneState.get(btn);
    if (!state || state.backdropFill === undefined || state.backdropFill === null) {
      return fill;
    }
    return state.backdropFill + (fill - state.backdropFill) * BACKDROP_FILL_SMOOTH;
  }

  function applyButtonBackdropTone(btn, bg, nextTone) {
    if (!btn) return;
    if (shouldUseAppleGlassPreset(btn, nextTone || getButtonTone(btn))) return;

    var rawFill = bg && bg.fill !== undefined ? bg.fill : 0.56;
    var state = toneState.get(btn) || { tone: getButtonTone(btn), lum: null };
    var fill = smoothBackdropFill(btn, rawFill);
    var strength = backdropStrengthFromFill(fill, bg && bg.isLight);

    state.backdropFill = fill;
    toneState.set(btn, state);

    btn.style.setProperty('--glass-tint-lighten', strength.lighten.toFixed(3));
    btn.style.setProperty('--glass-tint-darken', strength.darken.toFixed(3));
  }

  function toneFromMedianLuminance(lum) {
    return lum >= TONE_LUM_THRESHOLD ? 'black' : 'white';
  }

  function resolveButtonTone(smoothedLum, currentTone) {
    if (currentTone === 'white') {
      return smoothedLum >= TONE_LUM_TO_BLACK ? 'black' : 'white';
    }
    if (currentTone === 'black') {
      return smoothedLum < TONE_LUM_TO_WHITE ? 'white' : 'black';
    }
    return toneFromMedianLuminance(smoothedLum);
  }

  function smoothToneLuminance(btn, rawLum) {
    var state = toneState.get(btn);
    if (!state || state.smoothedLum === null || state.smoothedLum === undefined) {
      return rawLum;
    }
    return state.smoothedLum + (rawLum - state.smoothedLum) * TONE_LUM_SMOOTH;
  }

  function resolveToneLuminance(stats) {
    if (!stats) return TONE_LUM_THRESHOLD;

    var isUniformLight = stats.p25 >= 0.48 && stats.p50 >= 0.44;

    /* Белый текст на тёмной заливке (баннеры проектов) — не путать со светлым фоном */
    var isTextOnDark = stats.spread > 0.12 &&
      stats.p25 < 0.4 &&
      stats.p10 < 0.42 &&
      (stats.p90 >= 0.46 || stats.brightMass >= 0.015);

    /* Тёмный текст на светлой заливке («Мой подход», белые блоки) */
    var isTextOnLight = stats.spread > 0.14 &&
      stats.p25 >= 0.4 &&
      (stats.p90 >= 0.45 || stats.p75 >= 0.42 || stats.brightMass >= 0.03);

    var isUniformDark = stats.spread < 0.22 &&
      stats.p75 < 0.32 &&
      stats.p50 < 0.28 &&
      stats.darkMass >= 0.5;

    if (isTextOnDark || isUniformDark) {
      return Math.min(stats.p25, stats.p10 + 0.02);
    }
    if (isUniformLight || isTextOnLight) {
      return Math.max(stats.p75, stats.brightMean, stats.p50);
    }
    return stats.p50;
  }

  function isViewportAnchored(el) {
    var node = el;
    while (node && node !== document.body) {
      var pos = window.getComputedStyle(node).position;
      if (pos === 'fixed' || pos === 'sticky') return true;
      node = node.parentElement;
    }
    return false;
  }

  function getPageScrollY() {
    if (window.visualViewport && typeof window.visualViewport.pageTop === 'number') {
      return window.visualViewport.pageTop;
    }
    return window.scrollY || 0;
  }

  function getPageScrollX() {
    if (window.visualViewport && typeof window.visualViewport.pageLeft === 'number') {
      return window.visualViewport.pageLeft;
    }
    return window.scrollX || 0;
  }

  function getSnapshotRoot(renderer) {
    var target = renderer.snapshotTarget;
    var rect = target.getBoundingClientRect();
    return {
      top: rect.top + getPageScrollY(),
      left: rect.left + getPageScrollX()
    };
  }

  function getSnapshotDocSize(renderer) {
    var scale = renderer.scaleFactor || 1;
    var canvas = renderer.staticSnapshotCanvas;
    return {
      width: renderer._snapshotDocWidth || (canvas ? canvas.width / scale : 0),
      height: renderer._snapshotDocHeight || (canvas ? canvas.height / scale : 0)
    };
  }

  function capSnapshotDocCoords(renderer, docX, docY) {
    var size = getSnapshotDocSize(renderer);
    var inset = 2;
    var maxW = Math.max(0, size.width - 1 - inset);
    var maxH = Math.max(0, size.height - 1 - inset);

    return {
      docX: Math.max(inset, Math.min(maxW, docX)),
      docY: Math.max(inset, Math.min(maxH, docY)),
      hitTop: docY < inset,
      hitBottom: docY > maxH,
      hitLeft: docX < inset,
      hitRight: docX > maxW
    };
  }

  function getMaxScrollY() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function shouldFreezeTone(renderer) {
    var maxScroll = getMaxScrollY();
    var y = getPageScrollY();

    if (y < -1 || y > maxScroll + 1) {
      return true;
    }

    if (window.visualViewport) {
      var vv = window.visualViewport;
      if (Math.abs(vv.offsetTop) > 1 || Math.abs(vv.offsetLeft) > 1) {
        return true;
      }
      if (Math.abs(vv.pageTop - y) > 3) {
        return true;
      }
    }

    if (renderer && maxScroll > 0 && y >= maxScroll - 2) {
      var scene = getScene();
      if (scene) {
        var snapRect = scene.getBoundingClientRect();
        var expectedTop = snapRect.top;
        var headerBtn = document.querySelector('.header .liquidGL-apple');
        if (headerBtn) {
          var btnRect = headerBtn.getBoundingClientRect();
          var docY = btnRect.top - snapRect.top;
          if (docY > getSnapshotDocSize(renderer).height - 4) {
            return true;
          }
        }
      }
    }

    return false;
  }

  function maybeRecaptureOnScrollMismatch() {
    var renderer = getRenderer();
    if (!renderer || !snapshotReady || SNAPSHOT.phase !== 'done') return;
    if (renderer._recapturePending || renderer._capturing) return;

    var scene = getScene();
    if (!scene) return;

    var currentH = getSceneHeight();
    var snapH = renderer._snapshotDocHeight || 0;
    if (currentH - snapH <= 80) return;

    if (recaptureScrollTimer) return;
    recaptureScrollTimer = setTimeout(function () {
      recaptureScrollTimer = null;
      SNAPSHOT.phase = 'final';
      SNAPSHOT.finalAttempts = 0;
      requestFinalCapture();
    }, 500);
  }

  function mapClientToSnapshotPixel(renderer, clientX, clientY, el) {
    var snapCanvas = renderer.staticSnapshotCanvas;
    var scale = renderer.scaleFactor || 1;
    var snapRect = renderer.snapshotTarget.getBoundingClientRect();
    var docX = clientX - snapRect.left;
    var docY = clientY - snapRect.top;

    var capped = capSnapshotDocCoords(renderer, docX, docY);

    return {
      docX: docX,
      docY: docY,
      hitTop: capped.hitTop,
      hitBottom: capped.hitBottom,
      x: Math.max(0, Math.min(snapCanvas.width - 1, Math.round(capped.docX * scale))),
      y: Math.max(0, Math.min(snapCanvas.height - 1, Math.round(capped.docY * scale)))
    };
  }

  function isAboveSnapshotZone(el, renderer, clientY) {
    if (!el || !renderer) return false;
    var snapRect = renderer.snapshotTarget.getBoundingClientRect();
    return (clientY - snapRect.top) < 0;
  }

  function isBelowSnapshotZone(el, renderer, clientY) {
    if (!el || !renderer) return false;
    var snapRect = renderer.snapshotTarget.getBoundingClientRect();
    var docY = clientY - snapRect.top;
    return docY > getSnapshotDocSize(renderer).height - 2;
  }

  function relativeLuminance(r, g, b) {
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }

  function sampleRectLuminances(renderer, clientX0, clientY0, clientX1, clientY1, el) {
    if (!renderer || !renderer.staticSnapshotCanvas || !renderer.snapshotTarget) return [];

    if (el && isViewportAnchored(el)) {
      var midY = (clientY0 + clientY1) * 0.5;
      if (isAboveSnapshotZone(el, renderer, midY)) {
        return [0.94, 0.93, 0.95, 0.92];
      }
    }

    var snapCanvas = renderer.staticSnapshotCanvas;
    var p0 = mapClientToSnapshotPixel(renderer, clientX0, clientY0, el);
    var p1 = mapClientToSnapshotPixel(renderer, clientX1, clientY1, el);
    var x0 = Math.max(0, Math.min(p0.x, p1.x));
    var y0 = Math.max(0, Math.min(p0.y, p1.y));
    var x1 = Math.min(snapCanvas.width - 1, Math.max(p0.x, p1.x));
    var y1 = Math.min(snapCanvas.height - 1, Math.max(p0.y, p1.y));
    var w = x1 - x0 + 1;
    var h = y1 - y0 + 1;
    if (w < 1 || h < 1) return [];

    var ctx = snapCanvas.getContext('2d');
    if (!ctx) return [];

    try {
      var step = 1;
      var maxSamples = 900;

      if (w * h > maxSamples) {
        step = Math.ceil(Math.sqrt((w * h) / maxSamples));
      }

      var data = ctx.getImageData(x0, y0, w, h).data;
      var values = [];

      for (var y = 0; y < h; y += step) {
        for (var x = 0; x < w; x += step) {
          var idx = (y * w + x) * 4;
          if (data[idx + 3] < 8) {
            // html2canvas оставляет «дыры» (alpha≈0) там, где в DOM белый фон
            // вне snapshot — их нельзя игнорировать, иначе редкие тёмные пиксели
            // от аватарки залипают в белом тексте при скролле вверх
            values.push(0.96);
            continue;
          }
          values.push(relativeLuminance(data[idx], data[idx + 1], data[idx + 2]));
        }
      }

      return values;
    } catch (e) {
      return [];
    }
  }

  function percentile(sorted, ratio) {
    if (!sorted.length) return 0;
    var idx = Math.min(sorted.length - 1, Math.floor(sorted.length * ratio));
    return sorted[idx];
  }

  function meanBrightCluster(sorted, startRatio) {
    var start = Math.min(sorted.length - 1, Math.floor(sorted.length * startRatio));
    if (start >= sorted.length - 1) return sorted[sorted.length - 1];

    var sum = 0;
    for (var i = start; i < sorted.length; i++) sum += sorted[i];
    return sum / (sorted.length - start);
  }

  function buildBackgroundStats(luminances) {
    if (!luminances.length) return null;

    var sorted = luminances.slice().sort(function (a, b) { return a - b; });
    var p10 = percentile(sorted, 0.1);
    var p25 = percentile(sorted, 0.25);
    var p50 = percentile(sorted, 0.5);
    var p75 = percentile(sorted, 0.75);
    var p90 = percentile(sorted, 0.9);
    var brightMean = meanBrightCluster(sorted, 0.55);
    var topMean = meanBrightCluster(sorted, 0.68);
    var spread = p90 - p10;
    var darkMass = 0;
    var brightMass = 0;

    sorted.forEach(function (lum) {
      if (lum < 0.34) darkMass += 1;
      if (lum >= 0.6) brightMass += 1;
    });
    darkMass /= sorted.length;
    brightMass /= sorted.length;

    return {
      fill: Math.max(brightMean, topMean * 0.9, p50),
      p10: p10,
      p25: p25,
      p50: p50,
      p75: p75,
      p90: p90,
      spread: spread,
      brightMean: brightMean,
      topMean: topMean,
      darkMass: darkMass,
      brightMass: brightMass
    };
  }

  function resetButtonToneSmoothing(btn) {
    var state = toneState.get(btn);
    if (!state) return;
    state.lum = null;
    state.smoothedLum = null;
    state.backdropFill = null;
  }

  function sampleButtonMedianLuminance(btn, renderer) {
    var rect = btn.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1 || !renderer) return TONE_LUM_THRESHOLD;

    var state = toneState.get(btn);
    if (shouldFreezeTone(renderer)) {
      if (state && state.lum !== null && state.lum !== undefined) {
        return state.lum;
      }
    }

    var rowY = rect.top + rect.height * 0.5;

    var centerPx = mapClientToSnapshotPixel(
      renderer,
      rect.left + rect.width * 0.5,
      rowY,
      btn
    );
    if (centerPx.hitTop || isAboveSnapshotZone(btn, renderer, rowY)) {
      return 0.94;
    }
    if (centerPx.hitBottom && state &&
        state.lum !== null && state.lum !== undefined) {
      return state.lum;
    }

    if (isBelowSnapshotZone(btn, renderer, rowY)) {
      if (state && state.lum !== null && state.lum !== undefined) {
        return state.lum;
      }
      return TONE_LUM_THRESHOLD;
    }

    var samples;
    var anchored = isViewportAnchored(btn);

    if (anchored) {
      var inset = Math.max(2, rect.width * 0.06);
      var interior = sampleRectLuminances(
        renderer,
        rect.left + inset,
        rect.top + 2,
        rect.right - inset,
        rect.bottom - 2,
        btn
      );

      /* Вес на области под стеклом — не реагировать на лёгкое касание края */
      samples = interior.concat(interior).concat(interior);

      var ctxBand = Math.max(4, rect.height * 0.18);
      var ctxPadX = Math.max(6, rect.width * 0.14);

      samples = samples.concat(sampleRectLuminances(
        renderer,
        rect.left + ctxPadX,
        rect.bottom,
        rect.right - ctxPadX,
        rect.bottom + ctxBand,
        btn
      ));
      samples = samples.concat(sampleRectLuminances(
        renderer,
        rect.left + ctxPadX,
        rect.top - ctxBand,
        rect.right - ctxPadX,
        rect.top,
        btn
      ));
    } else {
      var padX = Math.max(14, rect.width * 0.3);
      var band = Math.max(3, rect.height * 0.22);
      samples = sampleRectLuminances(
        renderer,
        rect.left - padX,
        rowY - band,
        rect.right + padX,
        rowY + band,
        btn
      );
    }

    if (!anchored) {
      var padY = Math.max(6, rect.height * 0.2);
      samples = samples.concat(sampleRectLuminances(
        renderer,
        rect.left - padX * 0.45,
        rect.top - padY,
        rect.right + padX * 0.45,
        rect.bottom + padY,
        btn
      ));
    }

    var stats = buildBackgroundStats(samples);
    if (!stats) {
      if (state && state.lum !== null && state.lum !== undefined) {
        return state.lum;
      }
      return TONE_LUM_THRESHOLD;
    }
    return resolveToneLuminance(stats);
  }

  function updateTextToneFromBackground() {
    var renderer = getRenderer();
    if (!renderer || !renderer.staticSnapshotCanvas) return;

    var buttons = document.querySelectorAll('.liquidGL-apple');
    if (!buttons.length) return;

    if (shouldFreezeTone(renderer)) {
      var kept = false;
      buttons.forEach(function (btn) {
        var prev = toneState.get(btn);
        if (!prev || prev.lum === null || prev.lum === undefined || !prev.tone) return;
        kept = true;
        applyButtonBackdropTone(btn, {
          fill: prev.lum,
          isLight: prev.lum >= TONE_LUM_THRESHOLD,
          isDark: prev.lum < TONE_LUM_THRESHOLD
        }, prev.tone);
        applyButtonTextTone(btn, prev.tone);
      });
      if (kept) return;
    }

    buttons.forEach(function (btn) {
      var rawLum = sampleButtonMedianLuminance(btn, renderer);
      var currentTone = getButtonTone(btn);
      var smoothedLum = smoothToneLuminance(btn, rawLum);
      var isLight = smoothedLum >= TONE_LUM_THRESHOLD;
      var nextTone = resolveButtonTone(smoothedLum, currentTone);
      var state = toneState.get(btn) || { tone: currentTone, lum: null, smoothedLum: null };

      applyButtonBackdropTone(btn, {
        fill: smoothedLum,
        isLight: isLight,
        isDark: !isLight
      }, nextTone);

      state.lum = rawLum;
      state.smoothedLum = smoothedLum;
      state.tone = nextTone;
      toneState.set(btn, state);
      applyButtonTextTone(btn, nextTone);
    });
  }

  var toneEndTimer = 0;

  function scheduleTextToneUpdate() {
    if (toneRaf) return;
    toneRaf = requestAnimationFrame(function () {
      toneRaf = 0;
      updateTextToneFromBackground();
    });

    if (toneEndTimer) clearTimeout(toneEndTimer);
    toneEndTimer = setTimeout(function () {
      toneEndTimer = 0;
      updateTextToneFromBackground();
    }, 220);
  }

  function initToneViewportWatch() {
    if (toneViewportObserver || !window.IntersectionObserver) return;

    toneViewportObserver = new IntersectionObserver(function (entries) {
      var needsUpdate = entries.some(function (entry) {
        return entry.isIntersecting && entry.intersectionRatio >= 0.2;
      });
      if (needsUpdate) scheduleTextToneUpdate();
    }, { threshold: [0, 0.2, 0.6] });

    document.querySelectorAll('.liquidGL-apple').forEach(function (btn) {
      toneViewportObserver.observe(btn);
    });
  }

  function scheduleScrollSync() {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(function () {
      scrollRaf = 0;
      var scrollY = getPageScrollY();
      var renderer = getRenderer();

      if (resetLiquidHoverOnScroll) resetLiquidHoverOnScroll();

      if (!shouldFreezeTone(renderer)) {
        if (lastToneScrollY >= 0 && scrollY < lastToneScrollY - 6) {
          document.querySelectorAll('.liquidGL-apple').forEach(function (btn) {
            if (isViewportAnchored(btn)) resetButtonToneSmoothing(btn);
          });
        }
        if (lastToneScrollY < 0 || Math.abs(scrollY - lastToneScrollY) > 120) {
          document.querySelectorAll('.liquidGL-apple').forEach(resetButtonToneSmoothing);
        }
      }
      lastToneScrollY = scrollY;
      if (renderer && renderer.texture) {
        renderer.lenses.forEach(function (lens) {
          lens.updateMetrics();
        });
        renderer.render();
      }
      maybeRecaptureOnScrollMismatch();
      scheduleTextToneUpdate();
    });
  }

  function initLiquidHover() {
    var buttons = document.querySelectorAll('.liquidGL-apple');
    if (!buttons.length) return;

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hoverScale = reducedMotion ? 1.012 : 1.024;
    var maxFollow = reducedMotion ? 0 : 4.5;
    var isTouchUI = window.matchMedia('(hover: none), (pointer: coarse)').matches;
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
      var state = { tx: 0, ty: 0, targetX: 0, targetY: 0, active: false, raf: 0 };
      hoverStates.set(btn, state);

      function tick() {
        var s = hoverStates.get(btn);
        s.tx += (s.targetX - s.tx) * 0.16;
        s.ty += (s.targetY - s.ty) * 0.16;
        var scale = s.active ? hoverScale : 1;
        var nearRest = !s.active &&
          Math.abs(s.tx) < 0.04 && Math.abs(s.ty) < 0.04 &&
          Math.abs(s.targetX) < 0.04 && Math.abs(s.targetY) < 0.04;

        if (nearRest) {
          btn.style.transform = '';
          s.tx = 0; s.ty = 0; s.raf = 0;
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

      function activateHover() {
        hoverStates.get(btn).active = true;
        btn.classList.add('liquidGL--lift');
        startTick();
      }

      function deactivateHover() {
        var s = hoverStates.get(btn);
        s.active = false;
        s.targetX = 0;
        s.targetY = 0;
        btn.classList.remove('liquidGL--lift');
        startTick();
      }

      function updateFollow(clientX, clientY) {
        var s = hoverStates.get(btn);
        if (!s.active || !maxFollow) return;
        var rect = btn.getBoundingClientRect();
        var cx = rect.left + rect.width * 0.5;
        var cy = rect.top + rect.height * 0.5;
        s.targetX = Math.max(-1, Math.min(1, (clientX - cx) / (rect.width * 0.5))) * maxFollow;
        s.targetY = Math.max(-1, Math.min(1, (clientY - cy) / (rect.height * 0.5))) * maxFollow;
        startTick();
      }

      if (isTouchUI) {
        btn.addEventListener('touchstart', function (e) {
          if (!e.touches.length) return;
          activateHover();
          updateFollow(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });

        btn.addEventListener('touchmove', function (e) {
          if (!hoverStates.get(btn).active || !e.touches.length) return;
          updateFollow(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });

        btn.addEventListener('touchend', deactivateHover);
        btn.addEventListener('touchcancel', deactivateHover);
      } else {
        btn.addEventListener('mouseenter', activateHover);

        btn.addEventListener('mousemove', function (e) {
          updateFollow(e.clientX, e.clientY);
        });

        btn.addEventListener('mouseleave', deactivateHover);
      }
    });

    resetLiquidHoverOnScroll = function () {
      buttons.forEach(function (btn) {
        var s = hoverStates.get(btn);
        if (!s) return;
        if (!s.active && !s.raf && !btn.style.transform && !btn.classList.contains('liquidGL--lift')) {
          return;
        }
        if (s.raf) cancelAnimationFrame(s.raf);
        s.raf = 0;
        s.active = false;
        s.targetX = 0;
        s.targetY = 0;
        s.tx = 0;
        s.ty = 0;
        btn.style.transform = '';
        btn.classList.remove('liquidGL--lift');
      });
    };
  }

  function onLiquidGLReady() {
    if (inited) return;
    inited = true;
    document.body.classList.add('liquidgl-ready');
    document.querySelectorAll('.liquidGL-apple').forEach(function (el) {
      el.style.pointerEvents = 'auto';
    });
    document.querySelectorAll('.liquidGL-apple').forEach(function (el) {
      el.classList.add('glass-text-tone--black');
      el.style.setProperty('--glass-tint-lighten', '0.18');
      el.style.setProperty('--glass-tint-darken', '0');
      toneState.set(el, { tone: 'black', lum: null });
    });
    applyLensOptions();
    syncCanvasLayer();
    initLiquidHover();
    initToneViewportWatch();
    scheduleTextToneUpdate();
    requestAnimationFrame(function () {
      document.querySelectorAll('.liquidGL-apple').forEach(applyButtonShadow);
    });
  }

  function initLiquidGL() {
    if (typeof liquidGL !== 'function') {
      console.error('glass-site: liquidGL не загружен');
      return;
    }

    if (!getScene()) {
      console.error('glass-site: .glass-snapshot-scene не найден');
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      PARAMS.tilt = false;
    }

    applyCssLayers();

    liquidGL({
      snapshot: '.glass-snapshot-scene',
      target: '.liquidGL-apple',
      autoRecapture: false,
      deferSnapshot: true,
      resolution: PARAMS.resolution,
      refraction: PARAMS.refraction,
      bevelDepth: PARAMS.bevelDepth,
      bevelWidth: PARAMS.bevelWidth,
      frost: PARAMS.frost,
      magnify: PARAMS.magnify,
      centerRefraction: 0,
      lensSpread: 0,
      lensCurve: 0,
      lensConcave: false,
      bevelFlat: false,
      bevelApple: true,
      saturationBoost: PARAMS.saturationBoost,
      shadow: PARAMS.shadow,
      specular: PARAMS.specular,
      reveal: 'none',
      tilt: PARAMS.tilt,
      tiltFactor: PARAMS.tiltFactor,
      on: { init: onLiquidGLReady }
    });

    lockSnapshotAfterUpload(getRenderer());
    onLiquidGLReady();
    forceReveal(getRenderer());
    startSnapshotPipeline();
  }

  function applyDeviceParams() {
    var w = window.innerWidth || document.documentElement.clientWidth || 1280;
    if (w < 768) {
      PARAMS.resolution = 1;
      PARAMS.frost = 0.45;
      PARAMS.tilt = false;
    } else if (w < 1200) {
      PARAMS.resolution = 1.35;
    } else {
      PARAMS.resolution = 1.35;
    }
  }

  function scheduleLiquidGLInit() {
    applyDeviceParams();
    var run = function () {
      initLiquidGL();
    };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(run, { timeout: 2500 });
    } else {
      setTimeout(run, 150);
    }
  }

  function init() {
    window.addEventListener('scroll', scheduleScrollSync, { passive: true });
    window.addEventListener('resize', scheduleScrollSync, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('scroll', scheduleScrollSync, { passive: true });
      window.visualViewport.addEventListener('resize', scheduleScrollSync, { passive: true });
    }
    scheduleDeferredSpline();
    scheduleLiquidGLInit();
  }

  function boot() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  boot();
})();
