/**
 * Liquid Glass — преломление фона ЗА кнопкой (не дубликат viewport).
 *
 * Chrome / Edge: backdrop-filter + SVG feDisplacementMap
 * https://kube.io/blog/liquid-glass-css-svg
 * https://aave.com/design/building-glass-for-the-web
 *
 * Safari / Firefox: fallback — матовое стекло (blur + блик), без «картинки в кнопке».
 */
(function () {
  'use strict';

  var filterVersion = 0;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function roundedRectSDF(px, py, w, h, r) {
    var rx = Math.min(r, w / 2);
    var ry = Math.min(r, h / 2);
    var cx = clamp(px, rx, w - rx);
    var cy = clamp(py, ry, h - ry);
    var dx = px - cx;
    var dy = py - cy;
    return Math.sqrt(dx * dx + dy * dy) - Math.min(rx, ry);
  }

  function generateLensMap(width, height, radius, options) {
    var depth = (options && options.depth) != null ? options.depth : 12;
    var curvature = (options && options.curvature) != null ? options.curvature : 42;
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    var imageData = ctx.createImageData(width, height);
    var data = imageData.data;
    var qw = Math.ceil(width / 2);
    var qh = Math.ceil(height / 2);
    var curv = curvature / 100;

    for (var i = 0; i < data.length; i += 4) {
      data[i] = 128;
      data[i + 1] = 128;
      data[i + 2] = 128;
      data[i + 3] = 255;
    }

    for (var y = 0; y < qh; y++) {
      for (var x = 0; x < qw; x++) {
        var mirrors = [
          [x, y, 1, 1],
          [width - 1 - x, y, -1, 1],
          [x, height - 1 - y, 1, -1],
          [width - 1 - x, height - 1 - y, -1, -1]
        ];

        for (var m = 0; m < mirrors.length; m++) {
          var px = mirrors[m][0];
          var py = mirrors[m][1];
          var mx = mirrors[m][2];
          var my = mirrors[m][3];
          var sdf = roundedRectSDF(px + 0.5, py + 0.5, width, height, radius);
          if (sdf > 0.5) continue;

          var nx = (px + 0.5) / width - 0.5;
          var ny = (py + 0.5) / height - 0.5;
          var inside = clamp(-sdf / (Math.min(width, height) * 0.28), 0, 1);
          var bowl = Math.pow(inside, 0.6 + curv * 0.45) * (depth / 12);
          var dx = nx * bowl * 5.5;
          var dy = ny * bowl * 5.5;
          var idx = (py * width + px) * 4;

          data[idx] = clamp(128 + dx * mx, 0, 255);
          data[idx + 1] = clamp(128 + dy * my, 0, 255);
          data[idx + 2] = 128;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }

  function buildFilter(mapUrl, scale, filterId) {
    var svg = document.getElementById('glass-svg-root');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'glass-svg-root';
      svg.setAttribute('aria-hidden', 'true');
      svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      document.body.appendChild(svg);
    }

    var defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.appendChild(defs);
    }

    var existing = defs.querySelector('#' + filterId);
    if (existing) existing.remove();

    var filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', filterId);
    filter.setAttribute('data-glass-filter', 'true');
    filter.setAttribute('x', '0');
    filter.setAttribute('y', '0');
    filter.setAttribute('width', '100%');
    filter.setAttribute('height', '100%');
    filter.setAttribute('color-interpolation-filters', 'sRGB');

    function fe(name, attrs) {
      var node = document.createElementNS('http://www.w3.org/2000/svg', name);
      Object.keys(attrs).forEach(function (key) { node.setAttribute(key, attrs[key]); });
      return node;
    }

    filter.appendChild(fe('feImage', {
      result: 'map',
      href: mapUrl,
      preserveAspectRatio: 'none'
    }));

    filter.appendChild(fe('feDisplacementMap', {
      in: 'SourceGraphic',
      in2: 'map',
      scale: String(scale),
      xChannelSelector: 'R',
      yChannelSelector: 'G'
    }));

    defs.appendChild(filter);
    return filterId;
  }

  function supportsSvgBackdrop() {
    if (window.CSS && CSS.supports) {
      return CSS.supports('backdrop-filter', 'url("#g")') ||
        CSS.supports('-webkit-backdrop-filter', 'url("#g")');
    }
    return /Chrome|Chromium|Edg\//.test(navigator.userAgent);
  }

  function getVariant(button) {
    if (button.classList.contains('button_primary_header') || button.classList.contains('button_primary_body')) {
      return 'primary';
    }
    if (button.classList.contains('button_secondary_header') || button.classList.contains('button_secondary_body')) {
      return 'secondary-dark';
    }
    return 'light';
  }

  function wrapLabel(node) {
    if (node.querySelector('.glass-label')) return;
    var label = document.createElement('span');
    label.className = 'glass-label';
    while (node.firstChild) label.appendChild(node.firstChild);
    node.appendChild(label);
  }

  function resetButton(button) {
    button.dataset.glassReady = '';
    button.classList.remove(
      'glass-ready',
      'glass-ready--primary',
      'glass-ready--secondary-dark',
      'glass-ready--light',
      'glass-ready--refract',
      'glass-ready--fallback'
    );
    button.querySelectorAll('.glass-backdrop, .glass-tint, .glass-specular, .glass-rim').forEach(function (node) {
      node.remove();
    });
    var label = button.querySelector('.glass-label');
    if (label) {
      while (label.firstChild) button.appendChild(label.firstChild);
      label.remove();
    }
  }

  function initButton(button, index, options) {
    options = options || {};
    if (button.dataset.glassReady === 'true') return;

    button.classList.add('glass-ready', 'glass-ready--' + getVariant(button));
    wrapLabel(button);

    var backdrop = document.createElement('span');
    backdrop.className = 'glass-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    var tint = document.createElement('span');
    tint.className = 'glass-tint';
    tint.setAttribute('aria-hidden', 'true');

    var specular = document.createElement('span');
    specular.className = 'glass-specular';
    specular.setAttribute('aria-hidden', 'true');

    var rim = document.createElement('span');
    rim.className = 'glass-rim';
    rim.setAttribute('aria-hidden', 'true');

    button.insertBefore(backdrop, button.firstChild);
    button.insertBefore(tint, button.firstChild);
    button.insertBefore(specular, button.firstChild);
    button.insertBefore(rim, button.firstChild);

    var blur = options.blur != null ? options.blur : 14;
    var saturate = options.saturate != null ? options.saturate : 1.45;
    var depth = options.depth != null ? options.depth : 12;
    var curvature = options.curvature != null ? options.curvature : 42;
    var scaleMul = options.scaleMul != null ? options.scaleMul : 0.11;

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && supportsSvgBackdrop()) {
      var rect = button.getBoundingClientRect();
      var width = Math.max(Math.round(rect.width), 72);
      var height = Math.max(Math.round(rect.height), 36);
      var radius = parseFloat(getComputedStyle(button).borderRadius) || 12;
      var mapUrl = generateLensMap(width, height, radius, { depth: depth, curvature: curvature });
      var scale = clamp(Math.round(Math.min(width, height) * scaleMul), 4, 14);
      var filterId = 'glass-btn-filter-' + index;
      buildFilter(mapUrl, scale, filterId);
      backdrop.style.backdropFilter = 'blur(' + blur + 'px) saturate(' + saturate + ') url(#' + filterId + ')';
      backdrop.style.webkitBackdropFilter = backdrop.style.backdropFilter;
      button.classList.add('glass-ready--refract');
    } else {
      button.classList.add('glass-ready--fallback');
    }

    button.dataset.glassReady = 'true';
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
  }

  function init(selector, options) {
    var nodes = document.querySelectorAll(selector || '[data-glass]');
    for (var i = 0; i < nodes.length; i++) initButton(nodes[i], i, options);
    initScrollZones();
  }

  function rebuild(selector, options) {
    var nodes = document.querySelectorAll(selector || '[data-glass]');
    for (var i = 0; i < nodes.length; i++) resetButton(nodes[i]);
    init(selector, options);
  }

  window.NezhnikGlass = {
    init: init,
    rebuild: rebuild,
    resetButton: resetButton,
    generateLensMap: generateLensMap,
    supportsSvgBackdrop: supportsSvgBackdrop
  };

  if (window.__GLASS_DISABLE_AUTO_INIT__) return;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init('[data-glass]'); });
  } else {
    init('[data-glass]');
  }
})();
