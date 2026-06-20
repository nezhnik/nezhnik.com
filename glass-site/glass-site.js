/**
 * liquidGL — интеграция на дубль главной (glass-site/).
 * Snapshot: quick (стекло сразу) → final (полная предзагрузка, тихая замена).
 *
 * Перенос на прод (nezhnik.com): вынести glass-site.js/css + scripts/ в общий бандл;
 * на страницах со стеклом — .glass-snapshot-scene, .liquidGL-apple, локальные img (без CDN);
 * Spline/тяжёлые блоки — data-liquid-ignore + отложенная загрузка.
 */
(function () {
  'use strict';

  var PARAMS = {
    borderRadius: 300,
    refraction: 0.003,
    bevelDepth: 0,
    bevelWidth: 0.088,
    magnify: 1.017,
    saturationBoost: 1.15,
    frost: 0.55,
    resolution: 1.5,
    tintOpacity: 0,
    specularOpacity: 0.5,
    tiltFactor: 4,
    specular: false,
    shadow: true,
    tilt: false
  };

  var toneRaf = 0;
  var scrollRaf = 0;
  var toneViewportObserver = null;
  var toneState = new WeakMap();
  var LUMINANCE_TO_WHITE = 0.42;
  var LUMINANCE_TO_BLACK = 0.48;
  var BACKDROP_FILL_SMOOTH = 0.2;
  var BACKDROP_LIGHTEN_MAX = 0.28;
  var BACKDROP_DARKEN_MAX = 0.24;
  var BACKDROP_DARK_FAINT_LIGHTEN = 0.09;
  var lastToneScrollY = -1;
  var inited = false;
  var snapshotReady = false;
  var MAX_FINAL_RECAPTURES = 4;

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
      '.glass-snapshot-scene .project_card_bento * {',
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
    var stableFrames = isQuick ? 1 : 4;
    var stableAttempts = isQuick ? 12 : 50;

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
      freezeCapture(renderer);
      watchSceneResize();
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

    SNAPSHOT.phase = 'quick';
    SNAPSHOT.finalAttempts = 0;
    requestQuickCapture();
  }

  function getButtonTone(btn) {
    var state = toneState.get(btn);
    if (state && (state.tone === 'black' || state.tone === 'white')) return state.tone;
    if (btn.classList.contains('glass-text-tone--white')) return 'white';
    return 'black';
  }

  function applyButtonTextTone(btn, tone) {
    if (!btn || (tone !== 'black' && tone !== 'white')) return;
    var next = 'glass-text-tone--' + tone;
    if (btn.classList.contains(next)) return;
    btn.classList.remove('glass-text-tone--black', 'glass-text-tone--white');
    btn.classList.add(next);
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

  function applyButtonBackdropTone(btn, bg) {
    if (!btn) return;

    var rawFill = bg && bg.fill !== undefined ? bg.fill : 0.56;
    var state = toneState.get(btn) || { tone: getButtonTone(btn), lum: null };
    var fill = smoothBackdropFill(btn, rawFill);
    var strength = backdropStrengthFromFill(fill, bg && bg.isLight);

    state.backdropFill = fill;
    toneState.set(btn, state);

    btn.style.setProperty('--glass-tint-lighten', strength.lighten.toFixed(3));
    btn.style.setProperty('--glass-tint-darken', strength.darken.toFixed(3));
  }

  function toneFromLuminance(lum, currentTone) {
    if (currentTone === 'white') {
      return lum >= LUMINANCE_TO_BLACK ? 'black' : 'white';
    }
    return lum < LUMINANCE_TO_WHITE ? 'white' : 'black';
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

  function mapClientToSnapshotPixel(renderer, clientX, clientY) {
    var snapCanvas = renderer.staticSnapshotCanvas;
    var snapRect = renderer.snapshotTarget.getBoundingClientRect();
    var scale = renderer.scaleFactor || 1;
    var docX = clientX - snapRect.left;
    var docY = clientY - snapRect.top;
    var x = Math.round(docX * scale);
    var y = Math.round(docY * scale);

    return {
      x: Math.max(0, Math.min(snapCanvas.width - 1, x)),
      y: Math.max(0, Math.min(snapCanvas.height - 1, y))
    };
  }

  function relativeLuminance(r, g, b) {
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }

  function sampleRectLuminances(renderer, clientX0, clientY0, clientX1, clientY1) {
    if (!renderer || !renderer.staticSnapshotCanvas || !renderer.snapshotTarget) return [];

    var snapCanvas = renderer.staticSnapshotCanvas;
    var p0 = mapClientToSnapshotPixel(renderer, clientX0, clientY0);
    var p1 = mapClientToSnapshotPixel(renderer, clientX1, clientY1);
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
          if (data[idx + 3] < 8) continue;
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

  function analyzeBackgroundForBackdrop(stats) {
    if (!stats) return null;

    var hasLightFill = stats.brightMass >= 0.1 || stats.p90 >= 0.64 || stats.topMean >= 0.56;
    var isUniformLight = stats.p50 >= 0.46 && stats.p75 >= 0.52;
    var isTextOnLight = stats.spread > 0.22 && hasLightFill;
    var isUniformDark = stats.p75 < 0.32 && stats.p50 < 0.28 && stats.darkMass > 0.55;

    if (isTextOnLight || isUniformLight || hasLightFill) {
      return { fill: stats.fill, isLight: true, isDark: false, darkMass: stats.darkMass };
    }
    if (isUniformDark) {
      return { fill: stats.p25, isLight: false, isDark: true, darkMass: stats.darkMass };
    }
    if (stats.p75 < 0.38 && stats.darkMass > 0.4 && stats.brightMass < 0.08) {
      return { fill: stats.fill, isLight: false, isDark: true, darkMass: stats.darkMass };
    }
    return {
      fill: stats.fill,
      isLight: stats.p50 >= 0.44,
      isDark: false,
      darkMass: stats.darkMass
    };
  }

  function analyzeBackgroundForText(stats) {
    if (!stats) return null;

    var hasBrightFill = stats.brightMass >= 0.05 || stats.p90 >= 0.55 || stats.topMean >= 0.48;
    var isTextOnLight = stats.spread > 0.16 && hasBrightFill;
    var isUniformLight = stats.p75 >= 0.5 || (stats.p50 >= 0.42 && stats.brightMass >= 0.04);
    var isUniformDark = stats.p75 < 0.3 && stats.p50 < 0.26 &&
      stats.darkMass > 0.58 && stats.brightMass < 0.04;

    return {
      fill: Math.max(stats.topMean, stats.brightMean, stats.p90 * 0.85),
      isLight: isTextOnLight || isUniformLight || hasBrightFill,
      isDark: isUniformDark,
      darkMass: stats.darkMass,
      brightMass: stats.brightMass,
      p90: stats.p90
    };
  }

  function toneFromBackgroundFill(bg, currentTone) {
    if (!bg) return currentTone;

    if (bg.isLight) {
      return 'black';
    }

    if (bg.isDark) {
      return 'white';
    }

    return toneFromLuminance(bg.fill, currentTone);
  }

  function resetButtonToneSmoothing(btn) {
    var state = toneState.get(btn);
    if (!state) return;
    state.lum = null;
    state.backdropFill = null;
  }

  function sampleBackdropBackground(btn, renderer) {
    var rect = btn.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    if (!renderer) return null;

    var anchored = isViewportAnchored(btn);
    var padX = Math.max(10, rect.width * 0.2);
    var padY = anchored
      ? Math.max(6, rect.height * 0.42)
      : Math.max(5, rect.height * 0.22);

    return analyzeBackgroundForBackdrop(buildBackgroundStats(sampleRectLuminances(
      renderer,
      rect.left - padX,
      rect.top - padY,
      rect.right + padX,
      rect.bottom + padY
    )));
  }

  function sampleTextBackground(btn, renderer) {
    var rect = btn.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    if (!renderer) return null;

    var rowY = rect.top + rect.height * 0.5;
    var band = Math.max(2, rect.height * 0.14);
    var padX = Math.max(14, rect.width * 0.28);
    var samples = sampleRectLuminances(
      renderer,
      rect.left - padX,
      rowY - band,
      rect.right + padX,
      rowY + band
    );

    if (!isViewportAnchored(btn)) {
      var padY = Math.max(5, rect.height * 0.18);
      samples = samples.concat(sampleRectLuminances(
        renderer,
        rect.left - padX * 0.5,
        rect.top - padY,
        rect.right + padX * 0.5,
        rect.bottom + padY
      ));
    }

    return analyzeBackgroundForText(buildBackgroundStats(samples));
  }

  function resolveButtonTone(btn, bg, currentTone) {
    return toneFromBackgroundFill(bg, currentTone);
  }

  function updateTextToneFromBackground() {
    var renderer = getRenderer();
    if (!renderer || !renderer.staticSnapshotCanvas) return;

    var buttons = document.querySelectorAll('.liquidGL-apple');
    if (!buttons.length) return;

    buttons.forEach(function (btn) {
      var backdropBg = sampleBackdropBackground(btn, renderer);
      var textBg = sampleTextBackground(btn, renderer);
      var state = toneState.get(btn) || { tone: getButtonTone(btn), lum: null };

      applyButtonBackdropTone(btn, backdropBg || { fill: 0.56 });

      if (!textBg) {
        toneState.set(btn, state);
        return;
      }

      var nextTone = resolveButtonTone(btn, textBg, state.tone);

      state.lum = textBg.fill;
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
      var scrollY = window.scrollY || 0;

      if (lastToneScrollY < 0 || Math.abs(scrollY - lastToneScrollY) > 120) {
        document.querySelectorAll('.liquidGL-apple').forEach(resetButtonToneSmoothing);
      }
      lastToneScrollY = scrollY;

      var renderer = getRenderer();
      if (renderer && renderer.texture) renderer.render();
      scheduleTextToneUpdate();
    });
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

      btn.addEventListener('mouseenter', function () {
        hoverStates.get(btn).active = true;
        btn.classList.add('liquidGL--lift');
        startTick();
      });

      btn.addEventListener('mousemove', function (e) {
        var s = hoverStates.get(btn);
        if (!s.active || !maxFollow) return;
        var rect = btn.getBoundingClientRect();
        var cx = rect.left + rect.width * 0.5;
        var cy = rect.top + rect.height * 0.5;
        s.targetX = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width * 0.5))) * maxFollow;
        s.targetY = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height * 0.5))) * maxFollow;
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

  function init() {
    window.addEventListener('scroll', scheduleScrollSync, { passive: true });
    window.addEventListener('resize', scheduleScrollSync, { passive: true });
    scheduleDeferredSpline();
    initLiquidGL();
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
