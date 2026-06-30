/**
 * Hero-видео: чёрный фон → пауза 300 мс → появление 500 мс → анимация → исчезновение 500 мс → loop.
 *
 * Первый цикл: готовность видео → пауза 1 с → старт. После конца — пауза 1 с → loop.
 */
(function () {
  'use strict';

  var HOLD_SEC = 0.3;
  var FADE_SEC = 0.5;
  var PLAYBACK_RATE = 0.9;
  var START_DELAY_MS = 1000;
  var END_HOLD_MS = 1000;

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
    var begun = false;
    var scheduled = false;
    var startTimer = 0;
    var endTimer = 0;
    var cycleDuration = 0;

    function playVideo() {
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    }

    /** Один раз на canplaythrough — когда файл уже в буфере. */
    function lockDuration() {
      if (cycleDuration > 0) return cycleDuration;

      var d = video.duration;
      if (!isFinite(d) || d <= 0) return 0;

      if (video.seekable.length > 0) {
        var seekEnd = video.seekable.end(video.seekable.length - 1);
        if (seekEnd > 0 && seekEnd < d - 0.05) d = seekEnd;
      }

      cycleDuration = d;
      return cycleDuration;
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
      if (!cycleDuration) {
        video.style.opacity = '0';
        return;
      }
      video.style.opacity = String(opacityAt(video.currentTime, cycleDuration));
    }

    function tick() {
      updateOpacity();
      rafId = requestAnimationFrame(tick);
    }

    function startTick() {
      if (ticking) return;
      ticking = true;
      rafId = requestAnimationFrame(tick);
    }

    function stopTick() {
      ticking = false;
      cancelAnimationFrame(rafId);
    }

    function restart() {
      video.currentTime = 0;
      video.style.opacity = '0';
      playVideo();
      startTick();
    }

    function begin() {
      if (begun) return;
      if (lockDuration() <= 0) {
        video.addEventListener('durationchange', begin, { once: true });
        return;
      }

      begun = true;
      video.playbackRate = PLAYBACK_RATE;
      video.removeAttribute('poster');
      video.currentTime = 0;
      video.style.opacity = '0';
      playVideo();
      startTick();
    }

    function scheduleStart() {
      if (scheduled || begun) return;
      scheduled = true;
      startTimer = window.setTimeout(begin, START_DELAY_MS);
    }

    function onReady() {
      if (scheduled || begun) return;
      scheduleStart();
    }

    function onEnded() {
      if (video.currentTime > 0) {
        cycleDuration = video.currentTime;
      }
      stopTick();
      video.pause();
      video.style.opacity = '0';
      if (endTimer) window.clearTimeout(endTimer);
      endTimer = window.setTimeout(function () {
        endTimer = 0;
        restart();
      }, END_HOLD_MS);
    }

    video.style.opacity = '0';
    video.playbackRate = PLAYBACK_RATE;
    video.removeAttribute('loop');
    video.addEventListener('ended', onEnded);

    ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough'].forEach(function (eventName) {
      video.addEventListener(eventName, onReady, { once: true });
    });

    if (video.readyState >= 2) onReady();

    // iOS Safari часто не шлёт canplaythrough — страховка по таймеру.
    window.setTimeout(function () {
      if (!begun) onReady();
    }, 2500);

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && video.paused && begun) playVideo();
    });

    function retryAfterGesture() {
      if (begun) return;
      begin();
      if (begun) {
        document.removeEventListener('pointerdown', retryAfterGesture, true);
        document.removeEventListener('touchstart', retryAfterGesture, true);
      }
    }

    document.addEventListener('pointerdown', retryAfterGesture, true);
    document.addEventListener('touchstart', retryAfterGesture, true);

    window.addEventListener('pagehide', function () {
      cancelAnimationFrame(rafId);
      if (startTimer) window.clearTimeout(startTimer);
      if (endTimer) window.clearTimeout(endTimer);
      document.removeEventListener('pointerdown', retryAfterGesture, true);
      document.removeEventListener('touchstart', retryAfterGesture, true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
