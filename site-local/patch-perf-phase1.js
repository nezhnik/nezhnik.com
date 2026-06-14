#!/usr/bin/env node
/**
 * Фаза 1 perf: site-core.css, slim preloads, hero LCP, recompress heavy webp.
 * node patch-perf-phase1.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const CORE_CSS = path.join(ROOT, 'css', 'site-core.css');
const PARTS = [
  'css/animations.css',
  'css/glass-liquidgl.css',
  'css/glass-site.css'
];

const HEAVY_WEBP = [
  'images/content/b3ccd87a-страница-проекта-сибпромстрои-2.webp',
  'images/content/7a982653-дизаи-н-конференция-4.webp',
  'images/content/2068de02-3d-иллюстрации-2-2-2.webp'
];

function buildCoreCss() {
  var out = '/* site-core — animations + glass (auto-generated) */\n\n';
  PARTS.forEach(function (rel) {
    out += '/* --- ' + rel + ' --- */\n';
    out += fs.readFileSync(path.join(ROOT, rel), 'utf8').trim() + '\n\n';
  });
  fs.writeFileSync(CORE_CSS, out);
  console.log('built:', CORE_CSS, '(' + Math.round(out.length / 1024) + ' KB)');
}

function patchHtmlCssAndPreload(fileName) {
  var filePath = path.join(ROOT, fileName);
  var html = fs.readFileSync(filePath, 'utf8');
  var original = html;

  html = html.replace(
    /<link href="css\/animations\.css" rel="stylesheet" type="text\/css"\/>\n<link href="css\/glass-liquidgl\.css" rel="stylesheet" type="text\/css"\/>\n<link href="css\/glass-site\.css" rel="stylesheet" type="text\/css"\/>/,
    '<link href="css/site-core.css" rel="stylesheet" type="text/css"/>'
  );

  html = html.replace(
    /<link href="scripts\/html2canvas\.min\.js" rel="preload" as="script"\/>\n<link href="scripts\/liquidGL\.js" rel="preload" as="script"\/>\n<link href="scripts\/glass-site\.js" rel="preload" as="script"\/>/,
    '<link href="scripts/liquidGL.js" rel="preload" as="script"/>'
  );

  if (fileName === 'index.html' && !html.includes('rel="preload" as="image"')) {
    html = html.replace(
      /<link href="css\/pages\/index\.css"/,
      '<link href="images/avatar.webp" rel="preload" as="image" type="image/webp"/>\n<link href="css/pages/index.css"'
    );
  }

  if (fileName !== 'index.html') {
    var heroMatch = html.match(
      /<img([^>]*class="image-main[^"]*"[^>]*src="([^"]+)"[^>]*)>/
    );
    if (heroMatch) {
      var heroSrc = heroMatch[2];
      var preloadTag =
        '<link href="' + heroSrc + '" rel="preload" as="image" type="image/webp"/>';
      if (!html.includes(preloadTag)) {
        html = html.replace(
          /<link href="css\/pages\//,
          preloadTag + '\n<link href="css/pages/'
        );
      }
      html = html.replace(
        /<img([^>]*class="image-main[^"]*"[^>]*)>/,
        function (_, attrs) {
          var next = attrs
            .replace(/\sloading="lazy"/, '')
            .replace(/\sfetchpriority="[^"]*"/, '');
          if (!/loading=/.test(next)) next += ' loading="eager"';
          if (!/fetchpriority=/.test(next)) next += ' fetchpriority="high"';
          return '<img' + next + '>';
        }
      );
    }
  }

  if (html !== original) {
    fs.writeFileSync(filePath, html);
    console.log('perf html:', fileName);
  }
}

function recompressHeavy() {
  HEAVY_WEBP.forEach(function (rel) {
    var abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      console.log('skip missing:', rel);
      return;
    }
    var before = fs.statSync(abs).size;
    var tmp = abs + '.tmp';
    try {
      execSync('cwebp -quiet -q 78 "' + abs + '" -o "' + tmp + '"', { stdio: 'pipe' });
      fs.renameSync(tmp, abs);
      var after = fs.statSync(abs).size;
      console.log('recompressed:', rel, Math.round(before / 1024) + 'KB →', Math.round(after / 1024) + 'KB');
    } catch (e) {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      console.warn('cwebp failed:', rel, e.message);
    }
  });
}

buildCoreCss();

fs.readdirSync(ROOT)
  .filter(function (f) {
    return f.endsWith('.html');
  })
  .forEach(patchHtmlCssAndPreload);

recompressHeavy();
console.log('patch-perf-phase1: готово');
