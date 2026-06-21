/**
 * Hero-видео: чёрный фон → пауза 300 мс → появление 500 мс → анимация → исчезновение 500 мс → loop.
 */
(function () {
  'use strict';

  var HOLD_SEC = 0.3;
  var FADE_SEC = 0.5;
  var PLAYBACK_RATE = 0.9;

  function clamp01(n) {
    return Math.min(1, Math.max(0, n));
  }

  function init() {
    var video = document.querySelector('.home-v2-hero__video');
    if (!video) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      video.style.opacity = '1';
      video.loop = true;
      video.play().catch(function () {});
      return;
    }

    var rafId = 0;
    var ticking = false;

    function playVideo() {
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    }

    function opacityAt(t, duration) {
      var holdEnd = HOLD_SEC;
      var fadeInEnd = holdEnd + FADE_SEC;
      var fadeOutStart = duration - FADE_SEC;

      if (t < holdEnd) return 0;
      if (t < fadeInEnd) return clamp01((t - holdEnd) / FADE_SEC);
      if (t >= fadeOutStart) return clamp01((duration - t) / FADE_SEC);
      return 1;
    }

    function updateOpacity() {
      var t = video.currentTime;
      var d = video.duration;
      video.style.opacity = d && isFinite(d) ? String(opacityAt(t, d)) : '0';
    }

    function tick() {
      updateOpacity();
      rafId = requestAnimationFrame(tick);
    }

    function restart() {
      video.currentTime = 0;
      video.style.opacity = '0';
      playVideo();
    }

    function startTick() {
      if (ticking) return;
      ticking = true;
      rafId = requestAnimationFrame(tick);
    }

    video.style.opacity = '0';
    video.playbackRate = PLAYBACK_RATE;
    video.removeAttribute('poster');
    video.addEventListener('ended', restart);

    video.addEventListener('loadeddata', function onReady() {
      video.removeEventListener('loadeddata', onReady);
      playVideo();
      startTick();
    });

    if (video.readyState >= 2) {
      playVideo();
      startTick();
    }

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && video.paused) playVideo();
    });

    window.addEventListener('pagehide', function () {
      cancelAnimationFrame(rafId);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
