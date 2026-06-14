#!/usr/bin/env node
/**
 * Оптимизация страниц проектов: один src на <img>, resize, чистые пути.
 * Карточки Raiffeisen → images/cards/, остальное → images/content/.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const CDN = path.join(ROOT, 'assets', 'cdn');
const CARDS = path.join(ROOT, 'images', 'cards');
const CONTENT = path.join(ROOT, 'images', 'content');
const FONTS = path.join(ROOT, 'fonts');
const MAP_FILE = path.join(ROOT, 'asset-map.json');

const CARD_MAX = 1200;
const BENTO_MAX = 1440;
const MAIN_MAX = 1600;
const WIDE_MAX = 1920;

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function sipsResize(src, dest, maxPx) {
  if (!fs.existsSync(src)) {
    console.warn('SKIP missing:', src);
    return false;
  }
  ensureDir(path.dirname(dest));
  var ext = path.extname(dest).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') {
    execFileSync('sips', ['-Z', String(maxPx), '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', src, '--out', dest], {
      stdio: 'pipe'
    });
  } else {
    execFileSync('sips', ['-Z', String(maxPx), src, '--out', dest], { stdio: 'pipe' });
  }
  var size = fs.statSync(dest).size;
  console.log('OK', path.relative(ROOT, dest), '(' + Math.round(size / 1024) + ' KB)');
  return true;
}

function copyAsIs(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn('SKIP missing:', src);
    return false;
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  console.log('COPY', path.relative(ROOT, dest));
  return true;
}

function cardDest(cdnFile) {
  var m = cdnFile.match(/Raiffeisen-(\d+)\.png$/i);
  if (!m) return null;
  return 'images/cards/raiffeisen-' + m[1] + '.png';
}

function contentDest(cdnFile) {
  var hash = cdnFile.split('_')[0].slice(-8);
  var rest = cdnFile.split('_').slice(1).join('_');
  var base = rest.replace(/\.(png|jpg|jpeg|webp|svg)$/i, '');
  var slug = base
    .replace(/%[0-9A-F]{2}/gi, '-')
    .replace(/[^\w\u0400-\u04FF.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 56);
  var ext = path.extname(cdnFile).toLowerCase() || '.png';
  if (!slug) slug = 'asset';
  return 'images/content/' + hash + '-' + slug + ext;
}

function fontDest(cdnFile) {
  var map = {
    '65d12984abbdd97a28b60a1d_60e4249bd8f95b37bea9f160_RoslindaleDisplayCondensed-Regular.woff2':
      'fonts/roslindale-display-condensed.woff2',
    '65d12d27452c981001cbe359_61eaf39e1d62ff0d83071705_Mint-Grotesk---Medium.woff2':
      'fonts/mint-grotesk-medium.woff2',
    '65d126cbf6c81fb0a322c156_RoslindaleText-Bold.ttf': 'fonts/roslindale-text-bold.ttf',
    '65d126cb9da2c3f9316f103b_RoslindaleText-Italic.ttf': 'fonts/roslindale-text-italic.ttf',
    '65d126cb4c76575a9e6ad91f_RoslindaleText-Regular.ttf': 'fonts/roslindale-text-regular.ttf',
    '65d126cae366dcfc3c9b1143_MintGroteskTrial-BlackDisplay-BF64336b1ccc2da.otf':
      'fonts/mint-grotesk-black.otf',
    '65d126ca7ea1ca162b3b0c33_MintGroteskTrial-ExtraBoldDisplay-BF64336b1cb118a.otf':
      'fonts/mint-grotesk-extrabold.otf',
    '65d126cb0d26c81a8870c3bf_MintGroteskTrial-Thin-BF64336b1cad33b.otf': 'fonts/mint-grotesk-thin.otf',
    '65d126cbe96ecdcc19a19680_MintGroteskTrial-RegularDisplay-BF64336b1cd46bb.otf':
      'fonts/mint-grotesk-regular.otf',
    '65d126cb4bcb5f3b5091138c_MintGroteskTrial-LightDisplay-BF64336b1caee34.otf':
      'fonts/mint-grotesk-light.otf'
  };
  return map[cdnFile] || null;
}

function maxForImgTag(tag) {
  if (/moreprojects|image-13/.test(tag)) return CARD_MAX;
  if (/bento-image/.test(tag)) return BENTO_MAX;
  if (/_1920|image-main/.test(tag)) return WIDE_MAX;
  if (/image-inside-project/.test(tag)) return MAIN_MAX;
  return MAIN_MAX;
}

function collectCdnRefs() {
  var refs = new Map();
  var htmlFiles = fs.readdirSync(ROOT).filter(function (f) {
    return f.endsWith('.html');
  });
  htmlFiles.forEach(function (file) {
    var html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    var imgRe = /<img\b[^>]*>/gi;
    var tag;
    while ((tag = imgRe.exec(html))) {
      var srcM = tag[0].match(/\bsrc="assets\/cdn\/([^"]+)"/);
      if (!srcM) continue;
      var cdnFile = srcM[1];
      if (cdnFile.endsWith('.js')) continue;
      if (!refs.has(cdnFile)) refs.set(cdnFile, { max: maxForImgTag(tag[0]), from: file });
    }
  });
  var css = fs.readFileSync(path.join(ROOT, 'style2.css'), 'utf8');
  var urlRe = /assets\/cdn\/([^"')]+)/g;
  var m;
  while ((m = urlRe.exec(css))) {
    var f = m[1];
    if (!refs.has(f)) refs.set(f, { max: MAIN_MAX, from: 'style2.css' });
  }
  return refs;
}

function buildAssets(refs) {
  var map = {};
  ensureDir(CARDS);
  ensureDir(CONTENT);
  ensureDir(FONTS);

  refs.forEach(function (meta, cdnFile) {
    var src = path.join(CDN, cdnFile);
    var rel;

    if (/\.(woff2?|ttf|otf)$/i.test(cdnFile)) {
      rel = fontDest(cdnFile);
      if (!rel) {
        rel = 'fonts/' + cdnFile.replace(/^[^_]+_/, '').toLowerCase();
      }
      copyAsIs(src, path.join(ROOT, rel));
      map['assets/cdn/' + cdnFile] = rel;
      return;
    }

    rel = cardDest(cdnFile);
    if (rel) {
      sipsResize(src, path.join(ROOT, rel), CARD_MAX);
      map['assets/cdn/' + cdnFile] = rel;
      return;
    }

    rel = contentDest(cdnFile);
    sipsResize(src, path.join(ROOT, rel), meta.max);
    map['assets/cdn/' + cdnFile] = rel;
  });

  map['avatar.png'] = 'images/avatar.png';
  return map;
}

function simplifyImgTag(tag, map) {
  var srcM = tag.match(/\bsrc="([^"]+)"/);
  if (!srcM) return tag;
  var src = srcM[1];
  var newSrc = map[src] || src;
  var classM = tag.match(/\bclass="([^"]*)"/);
  var altM = tag.match(/\balt="([^"]*)"/);
  var cls = classM ? classM[1] : '';
  var alt = altM ? altM[1] : '';
  var loading = /loading="lazy"/.test(tag) ? ' loading="lazy"' : ' loading="lazy"';
  return '<img alt="' + alt + '" class="' + cls + '"' + loading + ' src="' + newSrc + '">';
}

function applyToHtml(file, map) {
  var filePath = path.join(ROOT, file);
  var html = fs.readFileSync(filePath, 'utf8');
  html = html.replace(/<img\b[^>]*>/gi, function (tag) {
    if (!/assets\/cdn\//.test(tag) && !/avatar\.png/.test(tag)) return tag;
    return simplifyImgTag(tag, map);
  });
  Object.keys(map).forEach(function (oldPath) {
    if (oldPath.indexOf('assets/cdn/') !== 0) return;
    html = html.split(oldPath).join(map[oldPath]);
  });
  html = html.replace(/\bavatar\.png\b/g, 'images/avatar.png');
  fs.writeFileSync(filePath, html);
  console.log('HTML', file);
}

function applyToCss(map) {
  var cssPath = path.join(ROOT, 'style2.css');
  var css = fs.readFileSync(cssPath, 'utf8');
  Object.keys(map)
    .sort(function (a, b) {
      return b.length - a.length;
    })
    .forEach(function (oldPath) {
      css = css.split(oldPath).join(map[oldPath]);
    });
  css = css.replace(/\burl\("avatar\.png"\)/g, 'url("images/avatar.png")');
  css = css.replace(/\burl\('avatar\.png'\)/g, "url('images/avatar.png')");
  fs.writeFileSync(cssPath, css);
  console.log('CSS style2.css');
}

console.log('=== Сбор ссылок ===');
var refs = collectCdnRefs();
console.log('Уникальных assets/cdn:', refs.size);

console.log('\n=== Обработка файлов ===');
var map = buildAssets(refs);
fs.writeFileSync(MAP_FILE, JSON.stringify(map, null, 2));
console.log('\nКарта:', path.relative(ROOT, MAP_FILE), Object.keys(map).length, 'записей');

console.log('\n=== Замена в HTML/CSS ===');
fs.readdirSync(ROOT)
  .filter(function (f) {
    return f.endsWith('.html');
  })
  .forEach(function (f) {
    applyToHtml(f, map);
  });
applyToCss(map);

console.log('\nГотово.');
