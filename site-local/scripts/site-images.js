/**
 * Переключатель PNG ↔ WebP для карточек home-v2.
 *
 * Откат на PNG (любой из способов):
 *   1. SITE_USE_WEBP = false  (ниже)
 *   2. URL: ?images=png
 *
 * Принудительно WebP: ?images=webp
 */
(function () {
  'use strict';

  /** false — PNG, true — WebP */
  window.SITE_USE_WEBP = true;

  var param = new URLSearchParams(location.search).get('images');
  if (param === 'png') window.SITE_USE_WEBP = false;
  if (param === 'webp') window.SITE_USE_WEBP = true;

  window.siteImageUrl = function (pngPath) {
    if (!pngPath || !window.SITE_USE_WEBP) return pngPath;
    return String(pngPath).replace(/\.png(\?.*)?$/i, '.webp$1');
  };
})();
