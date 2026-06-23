#!/usr/bin/env node
/**
 * Liquid glass на всех *.html в site-local/.
 * Запуск после inject-header.js: node patch-glass.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

const GLASS_HEAD = `
<link href="css/glass-liquidgl.css" rel="stylesheet" type="text/css"/>
<link href="css/glass-site.css" rel="stylesheet" type="text/css"/>
<link href="scripts/html2canvas.min.js" rel="preload" as="script"/>
<link href="scripts/liquidGL.js" rel="preload" as="script"/>
<link href="scripts/glass-site.js" rel="preload" as="script"/>
<script>
document.addEventListener('DOMContentLoaded', function () {
  var scene = document.querySelector('.glass-snapshot-scene');
  if (!scene) return;
  scene.querySelectorAll('img').forEach(function (img) {
    if (img.closest('[data-liquid-ignore]')) return;
    if (!img.getAttribute('crossorigin')) img.crossOrigin = 'anonymous';
  });
});
</script>`;

const GLASS_SCRIPTS = `
<script src="scripts/html2canvas.min.js" defer></script>
<script src="scripts/liquidGL.js" defer></script>
<script src="scripts/glass-site.js" defer></script>`;

const FOOTER_BTNS_OLD =
  '<a class="button_primary_body w-button" href="http://t.me/nezhnik" target="_blank">Telegram ✍️</a>\n<a class="button_secondary_body w-button" download="" href="/Резюме — Михаил Нежник, продуктовый дизайнер.pdf" target="_blank">Резюме 👀</a>';

const FOOTER_BTNS_GLASS =
  '<a class="button_primary_body w-button liquidGL liquidGL-apple liquidGL--primary" href="http://t.me/nezhnik" target="_blank" aria-label="Телеграм"><span class="liquidGL-tint" aria-hidden="true"></span><span class="liquidGL-rim" aria-hidden="true"></span><span class="liquidGL-specular" aria-hidden="true"></span><span class="liquidGL-label liquidGL-label--telegram"><span class="telegram-label-text">Телеграм</span><img class="telegram-icon" src="images/shared/telegram-logo.svg" width="20" height="20" alt="" aria-hidden="true"/></span></a>\n<a class="button_secondary_body w-button liquidGL liquidGL-apple liquidGL--dark" download="" href="/Резюме — Михаил Нежник, продуктовый дизайнер.pdf" target="_blank"><span class="liquidGL-tint" aria-hidden="true"></span><span class="liquidGL-rim" aria-hidden="true"></span><span class="liquidGL-specular" aria-hidden="true"></span><span class="liquidGL-label">Резюме 👀</span></a>';

function patch(fileName) {
  const filePath = path.join(ROOT, fileName);
  let html = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  if (!html.includes('css/glass-liquidgl.css')) {
    html = html.replace(
      '<link href="css/animations.css" rel="stylesheet" type="text/css"/>',
      '<link href="css/animations.css" rel="stylesheet" type="text/css"/>' + GLASS_HEAD
    );
    changed = true;
  }

  if (!html.includes('glass-site-page')) {
    html = html.replace(
      '<body class="body">',
      '<body class="body glass-site-page glass-text-tone--black">'
    );
    changed = true;
  }

  if (!html.includes('<main class="glass-snapshot-scene">')) {
    html = html.replace(
      /<!-- \/partial:header -->\s*/,
      '<!-- /partial:header -->\n<main class="glass-snapshot-scene">\n'
    );
    changed = true;
  }

  if (html.includes('<main class="glass-snapshot-scene">') && !html.includes('</main>')) {
    if (html.includes('<script defer src="scripts/reveal.js"></script>')) {
      html = html.replace(
        '<script defer src="scripts/reveal.js"></script>',
        '</main>\n<script defer src="scripts/reveal.js"></script>'
      );
    } else {
      html = html.replace('</body>', '</main>\n</body>');
    }
    changed = true;
  }

  if (!html.includes('<script src="scripts/glass-site.js"')) {
    if (html.includes('<script defer src="scripts/reveal.js"></script>')) {
      html = html.replace(
        '<script defer src="scripts/reveal.js"></script>',
        GLASS_SCRIPTS + '\n<script defer src="scripts/reveal.js"></script>'
      );
    } else {
      html = html.replace('</body>', GLASS_SCRIPTS + '\n</body>');
    }
    changed = true;
  }

  if (fileName === 'index.html' && html.includes(FOOTER_BTNS_OLD)) {
    html = html.replace(FOOTER_BTNS_OLD, FOOTER_BTNS_GLASS);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, html);
    console.log('patched:', fileName);
  } else {
    console.log('skip (already glass):', fileName);
  }
}

fs.readdirSync(ROOT)
  .filter(function (f) {
    return f.endsWith('.html');
  })
  .forEach(patch);

console.log('patch-glass: готово');
