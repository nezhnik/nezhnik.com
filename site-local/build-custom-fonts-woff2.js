#!/usr/bin/env node
/**
 * TTF/OTF → woff2 + обновление путей в css/pages/*.css
 * node build-custom-fonts-woff2.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const FONTS = path.join(ROOT, 'fonts');
const PAGES_CSS = path.join(ROOT, 'css', 'pages');

const MAP = [
  ['roslindale-text-bold.ttf', 'roslindale-text-bold.woff2'],
  ['roslindale-text-italic.ttf', 'roslindale-text-italic.woff2'],
  ['roslindale-text-regular.ttf', 'roslindale-text-regular.woff2'],
  ['mint-grotesk-black.otf', 'mint-grotesk-black.woff2'],
  ['mint-grotesk-extrabold.otf', 'mint-grotesk-extrabold.woff2'],
  ['mint-grotesk-thin.otf', 'mint-grotesk-thin.woff2'],
  ['mint-grotesk-regular.otf', 'mint-grotesk-regular.woff2'],
  ['mint-grotesk-light.otf', 'mint-grotesk-light.woff2']
];

function compressFont(srcName, outName) {
  var src = path.join(FONTS, srcName);
  var out = path.join(FONTS, outName);
  if (!fs.existsSync(src)) {
    console.log('skip missing:', srcName);
    return;
  }
  if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) {
    console.log('up to date:', outName);
    return;
  }
  try {
    execSync('python3 -m fontTools.ttLib.woff2 compress "' + src + '" -o "' + out + '"', { stdio: 'pipe' });
    console.log('woff2:', outName);
  } catch (e) {
    console.warn('fonttools failed for', srcName, '-', (e.stderr || e.message || '').toString().slice(0, 120));
  }
}

MAP.forEach(function (pair) {
  compressFont(pair[0], pair[1]);
});

fs.readdirSync(PAGES_CSS)
  .filter(function (f) { return f.endsWith('.css'); })
  .forEach(function (file) {
    var p = path.join(PAGES_CSS, file);
    var css = fs.readFileSync(p, 'utf8');
    var next = css;
    MAP.forEach(function (pair) {
      next = next
        .replace(new RegExp(pair[0].replace('.', '\\.'), 'g'), pair[1])
        .replace(
          new RegExp("url\\('\\.\\./\\.\\./fonts/" + pair[1].replace('.', '\\.') + "'\\) format\\('truetype'\\)", 'g'),
          "url('../../fonts/" + pair[1] + "') format('woff2')"
        )
        .replace(
          new RegExp("url\\('\\.\\./\\.\\./fonts/" + pair[1].replace('.', '\\.') + "'\\) format\\('opentype'\\)", 'g'),
          "url('../../fonts/" + pair[1] + "') format('woff2')"
        );
    });
    if (next !== css) {
      fs.writeFileSync(p, next);
      console.log('patched css:', file);
    }
  });

console.log('build-custom-fonts-woff2: готово');
