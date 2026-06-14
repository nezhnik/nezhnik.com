#!/usr/bin/env node
/**
 * PurgeCSS: отдельный CSS на каждую страницу + общий fonts-local.css.
 * style2.full.css — полная копия для отката.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const CSS_SRC = path.join(ROOT, 'style2.css');
const CSS_FULL = path.join(ROOT, 'style2.full.css');
const CSS_DIR = path.join(ROOT, 'css', 'pages');

const SAFELIST = {
  standard: [
    'w-mod-js',
    'w-mod-touch',
    'w-mod-ix',
    'w-mod-ix3',
    'w-mod-ix2',
    'w--current',
    'w--open',
    'w--nav-link-open',
    'w--nav-dropdown-open',
    'w--nav-dropdown-toggle-open',
    'w--tab-active',
    'w--redirected-checked',
    'w--ecommerce-cart-open',
    'w--ecommerce-cart-empty',
    'w-backgroundvideo-backgroundvideoplaypausebutton',
    'w-background-video--control'
  ],
  deep: [/w-mod/, /w--/, /^w-/, /wf-/, /splide/, /spline/],
  greedy: [/w-node/, /data-w-id/]
};

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

if (!fs.existsSync(CSS_FULL)) {
  fs.copyFileSync(CSS_SRC, CSS_FULL);
  console.log('Backup:', path.relative(ROOT, CSS_FULL));
}

ensureDir(CSS_DIR);

var pages = fs.readdirSync(ROOT).filter(function (f) {
  return f.endsWith('.html');
});

var safelistJson = path.join(ROOT, '.purge-safelist.json');
fs.writeFileSync(safelistJson, JSON.stringify(SAFELIST));

var totalBefore = fs.statSync(CSS_SRC).size;
var savings = [];

pages.forEach(function (page) {
  var outName = page.replace('.html', '.css');
  var outFile = path.join(CSS_DIR, outName);
  execFileSync(
    'npx',
    [
      'purgecss',
      '--css',
      CSS_SRC,
      '--content',
      path.join(ROOT, page),
      '--output',
      CSS_DIR,
      '--safelist',
      safelistJson
    ],
    { cwd: ROOT, stdio: 'pipe' }
  );
  var generated = path.join(CSS_DIR, 'style2.css');
  if (fs.existsSync(generated)) {
    fs.renameSync(generated, outFile);
  }
  var cssBody = fs.readFileSync(outFile, 'utf8');
  cssBody = cssBody
    .replace(/url\("images\//g, 'url("../../images/')
    .replace(/url\('images\//g, "url('../../images/")
    .replace(/url\("fonts\//g, 'url("../../fonts/')
    .replace(/url\('fonts\//g, "url('../../fonts/");
  fs.writeFileSync(outFile, cssBody);
  var size = fs.statSync(outFile).size;
  savings.push({ page: page, kb: Math.round(size / 1024) });
  var htmlPath = path.join(ROOT, page);
  var html = fs.readFileSync(htmlPath, 'utf8');
  var next = html.replace(
    '<link href="style2.css" rel="stylesheet" type="text/css"/>',
    '<link href="css/pages/' + outName + '" rel="stylesheet" type="text/css"/>'
  );
  if (next !== html) {
    fs.writeFileSync(htmlPath, next);
  }
  console.log(
    page,
    '→',
    path.relative(ROOT, outFile),
    '(' + Math.round(size / 1024) + ' KB, −' + Math.round((1 - size / totalBefore) * 100) + '%)'
  );
});

try {
  fs.unlinkSync(safelistJson);
} catch (e) {}

console.log('\nБыло style2.css:', Math.round(totalBefore / 1024) + ' KB на каждой странице');
console.log('Готово.');
