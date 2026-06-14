#!/usr/bin/env node
/**
 * Миграция hover/scroll с ix2 на CSS + reveal.js.
 * Запуск: node patch-css-hover.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

const REVEAL_SECTION_RE =
  /\b(text_block_main|content_main-screen|context|my-role|research|presentation|result|more-peojects)\b/;

const HOVER_CLASS_RE = /project_card_bento|button_(secondary|primary)/;

function patchHtml(file) {
  let html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const isProject = file !== 'index.html';
  let changed = false;

  if (!html.includes('css/animations.css')) {
    html = html.replace(
      /(<link href="css\/pages\/[^"]+\.css"[^>]*>)/,
      '$1\n<link href="css/animations.css" rel="stylesheet" type="text/css"/>'
    );
    changed = true;
  }

  if (isProject && !html.includes('scripts/reveal.js')) {
    html = html.replace(/<\/body>/, '<script defer src="scripts/reveal.js"></script>\n</body>');
    changed = true;
  }

  // Убрать FOUC-блоки ix2 для карточек (desktop-only inline styles)
  const foucBlock =
    /<style>\s*@media \(min-width: 992px\) \{[\s\S]*?html\.w-mod-js:\s*not\(\.w-mod-ix\)[\s\S]*?\}\s*<\/style>/g;
  if (foucBlock.test(html)) {
    html = html.replace(foucBlock, '');
    changed = true;
  }

  // Карточки и кнопки: снять data-w-id (ix2 перестаёт вешать hover)
  html = html.replace(/<([a-z][a-z0-9]*) ([^>]*?)data-w-id="[^"]*"([^>]*?)>/gi, function (match, tag, before, after) {
    const attrs = before + after;
    if (!HOVER_CLASS_RE.test(attrs)) return match;
    changed = true;
    const cleaned = (before + after).replace(/\s{2,}/g, ' ').trim();
    return '<' + tag + ' ' + cleaned + '>';
  });

  // Лого: hover через CSS
  html = html.replace(
    /(<a[^>]*class="[^"]*link-block[^"]*"[^>]*) data-w-id="609b2d4d-94ce-28ce-6392-8b8f7b0c9309"/g,
    '$1'
  );

  // Scroll-секции на страницах проектов
  if (isProject) {
    html = html.replace(/<([a-z]+) ([^>]*?)data-w-id="([^"]+)"([^>]*?)>/gi, function (match, tag, before, wid, after) {
      const attrs = before + after;
      if (!REVEAL_SECTION_RE.test(attrs)) return match;
      changed = true;
      let newAttrs = before + after;
      if (!/\breveal\b/.test(newAttrs)) {
        newAttrs = newAttrs.replace(/class="/, 'class="reveal ');
      }
      newAttrs = newAttrs.replace(/\s{2,}/g, ' ').trim();
      return '<' + tag + ' ' + newAttrs + '>';
    });
  }

  if (changed) {
    fs.writeFileSync(path.join(ROOT, file), html);
  }
  return changed;
}

const files = fs.readdirSync(ROOT).filter(function (f) {
  return f.endsWith('.html');
});

let n = 0;
files.forEach(function (f) {
  if (patchHtml(f)) {
    console.log('patched', f);
    n++;
  }
});
console.log('Done:', n, 'files updated');
