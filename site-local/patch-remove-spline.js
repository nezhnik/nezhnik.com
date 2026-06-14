#!/usr/bin/env node
/**
 * Удаление Spline, Webflow main.js, jQuery.
 * Запуск: node patch-remove-spline.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

function patchHtml(file) {
  let html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  let changed = false;

  const splineBlock =
    /\s*<div class="spline-scene"[^>]*>[\s\S]*?<\/div>\s*(?=<\/div>\s*<\/section>)/g;
  if (splineBlock.test(html)) {
    html = html.replace(splineBlock, '\n');
    changed = true;
  }

  const scripts = [
    /<script[^>]*src="scripts\/jquery-3\.5\.1\.min\.js"[^>]*><\/script>\s*/g,
    /<script[^>]*src="main\.js"[^>]*><\/script>\s*/g,
    /<script defer src="scripts\/spline-defer\.js"><\/script>\s*/g
  ];
  scripts.forEach(function (re) {
    if (re.test(html)) {
      html = html.replace(re, '');
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(path.join(ROOT, file), html);
  }
  return changed;
}

function stripSplineCss(css) {
  let next = css.replace(/\.spline-scene[^{]*\{[^}]*\}\s*/g, '');
  next = next.replace(/,\s*\.spline-scene-2/g, '');
  next = next.replace(/,\s*\.spline-scene-3/g, '');
  next = next.replace(/\.spline-scene-2[^{]*\{[^}]*\}\s*/g, '');
  next = next.replace(/\.spline-scene-3[^{]*\{[^}]*\}\s*/g, '');
  return next;
}

function patchPageCss(file) {
  const full = path.join(ROOT, file);
  let css = fs.readFileSync(full, 'utf8');
  const stripped = stripSplineCss(css);
  if (stripped !== css) {
    fs.writeFileSync(full, stripped);
    return true;
  }
  return false;
}

const htmlFiles = fs.readdirSync(ROOT).filter(function (f) {
  return f.endsWith('.html');
});

let htmlN = 0;
htmlFiles.forEach(function (f) {
  if (patchHtml(f)) {
    console.log('html', f);
    htmlN++;
  }
});

const cssDir = path.join(ROOT, 'css', 'pages');
let cssN = 0;
fs.readdirSync(cssDir).forEach(function (f) {
  if (f.endsWith('.css') && patchPageCss(path.join('css', 'pages', f))) {
    console.log('css', f);
    cssN++;
  }
});

const toDelete = [
  path.join(ROOT, 'scripts', 'spline-defer.js'),
  path.join(ROOT, 'main.js'),
  path.join(ROOT, 'scripts', 'jquery-3.5.1.min.js')
];
toDelete.forEach(function (p) {
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log('deleted', path.relative(ROOT, p));
  }
});

console.log('Done:', htmlN, 'html,', cssN, 'css');
