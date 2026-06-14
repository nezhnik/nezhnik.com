#!/usr/bin/env node
/**
 * Восстановление с CDN + мягкое сжатие без заметной потери качества.
 * — content: до 2240px (2× для ширины 1120px в кейсах)
 * — cards / главная: до 1800px
 * — pngquant --quality=92-100 (пропуск, если хуже)
 *
 * Запуск: node restore-and-optimize-images.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const CDN_MAP = JSON.parse(fs.readFileSync(path.join(ROOT, 'cdn-map.json'), 'utf8'));
const ASSET_MAP = JSON.parse(fs.readFileSync(path.join(ROOT, 'asset-map.json'), 'utf8'));
const SITE_IMG = 'https://nezhnik.com/images/';
const CDN_SITE = 'https://cdn.prod.website-files.com/65cfb22a548897845b7a6710/';

const PNG_QUALITY = '92-100';
const MAX_CONTENT = 2240;
const MAX_CARD = 1800;

const HOME_FROM_SITE = [
  'symbols.png', 'color.png', 'plagin.png', 'omonete.png',
  'CSClick.png', 'Glavpivmag.png', 'Smarthome.png'
];

const HOME_CDN = [
  ['Raiffeisen-8.png', '676a64d0c5a96b9de224e085_Raiffeisen%208.png'],
  ['Raiffeisen-9.png', '676a64d0d1ebce5fb0ee5879_Raiffeisen%209.png'],
  ['Raiffeisen-10.png', '676a64d01aa6955efd18cfdd_Raiffeisen%2010.png'],
  ['Raiffeisen-11.png', '676e5ae5f761fd8475e4e462_Raiffeisen-11.png'],
  ['Raiffeisen-12.png', '676a64d0ed6cbad1a0ca0deb_Raiffeisen%2012.png'],
  ['Raiffeisen-13.png', '676a64d0ca881a01704a0dab_Raiffeisen%2013.png'],
  ['Raiffeisen-14.png', '676aba0db2605216c17c8055_Raiffeisen%2014.png'],
  ['Raiffeisen-15.png', '676abbc63871bbda8c91c33e_Raiffeisen%2015.png'],
  ['Raiffeisen-16.png', '676a64d0edeeceaba1685b57_Raiffeisen%2016.png'],
  ['Raiffeisen-17.png', '676a64d2648dd93b68626321_Raiffeisen%2017.png'],
  ['Raiffeisen-18.png', '676abe633353e07eb0ba0d4b_Raiffeisen%2018.png']
];

const CARD_MIRROR = {
  'symbols.png': 'symbols.png',
  'color.png': 'color.png',
  'plagin.png': 'plagin.png',
  'omonete.png': 'omonete.png',
  'CSClick.png': 'csclick.png',
  'Glavpivmag.png': 'glavpivmag.png',
  'Smarthome.png': 'smarthome.png'
};
HOME_CDN.forEach(function (pair) {
  CARD_MIRROR[pair[0]] = pair[0].toLowerCase();
});

const report = { restored: [], failed: [], totalBefore: 0, totalAfter: 0 };

function human(n) {
  return Math.round(n / 1024) + ' KB';
}

function download(url, dest) {
  return new Promise(function (resolve, reject) {
    const file = fs.createWriteStream(dest);
    https
      .get(url, function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          try { fs.unlinkSync(dest); } catch (e) {}
          return download(res.headers.location, dest).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          file.close();
          try { fs.unlinkSync(dest); } catch (e) {}
          return reject(new Error('HTTP ' + res.statusCode + ' ' + url));
        }
        res.pipe(file);
        file.on('finish', function () {
          file.close(resolve);
        });
      })
      .on('error', reject);
  });
}

function getWidth(file) {
  try {
    const out = execFileSync('sips', ['-g', 'pixelWidth', file], { encoding: 'utf8' });
    const m = out.match(/pixelWidth:\s*(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  } catch (e) {
    return 0;
  }
}

function resizeIfNeeded(file, maxPx) {
  const w = getWidth(file);
  if (!w || w <= maxPx) return;
  const ext = path.extname(file);
  const tmp = file + '.resize' + ext;
  execFileSync('sips', ['-Z', String(maxPx), file, '--out', tmp], { stdio: 'pipe' });
  fs.renameSync(tmp, file);
}

function optimizePng(file) {
  const before = fs.statSync(file).size;
  const tmp = file + '.q.png';
  try {
    execFileSync(
      'pngquant',
      ['--quality=' + PNG_QUALITY, '--speed', '1', '--skip-if-larger', '--force', '--output', tmp, file],
      { stdio: 'pipe' }
    );
    if (fs.existsSync(tmp)) {
      const after = fs.statSync(tmp).size;
      if (after < before) fs.renameSync(tmp, file);
      else fs.unlinkSync(tmp);
    }
  } catch (e) {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
  return { before: before, after: fs.statSync(file).size };
}

function optimizeJpg(file) {
  const before = fs.statSync(file).size;
  const tmp = file + '.jpg.tmp';
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '88', file, '--out', tmp], {
    stdio: 'pipe'
  });
  const after = fs.statSync(tmp).size;
  if (after < before) fs.renameSync(tmp, file);
  else fs.unlinkSync(tmp);
  return { before: before, after: fs.statSync(file).size };
}

function urlsForAsset(assetKey) {
  const list = [];
  Object.keys(CDN_MAP).forEach(function (url) {
    if (CDN_MAP[url] === assetKey) list.push(url);
  });
  return list;
}

function pickBestUrl(urls) {
  if (!urls.length) return null;
  const full = urls.filter(function (u) {
    return !/-p-\d+\.(png|jpe?g)(\?|$)/i.test(u);
  });
  if (full.length) return full[0];
  var best = urls[0];
  var bestW = 0;
  urls.forEach(function (u) {
    var m = u.match(/-p-(\d+)\./i);
    var w = m ? parseInt(m[1], 10) : 0;
    if (w > bestW) {
      bestW = w;
      best = u;
    }
  });
  return best;
}

async function processFile(destRel, url, maxPx) {
  const dest = path.join(ROOT, destRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = dest + '.dl';
  try {
    await download(url, tmp);
    if (fs.statSync(tmp).size < 500) throw new Error('too small');
    fs.renameSync(tmp, dest);
    if (/\.png$/i.test(dest)) {
      resizeIfNeeded(dest, maxPx);
      var stat = optimizePng(dest);
    } else if (/\.jpe?g$/i.test(dest)) {
      resizeIfNeeded(dest, maxPx);
      stat = optimizeJpg(dest);
    } else {
      stat = { before: fs.statSync(dest).size, after: fs.statSync(dest).size };
    }
    report.restored.push({
      file: destRel,
      before: stat.before,
      after: stat.after
    });
    report.totalBefore += stat.before;
    report.totalAfter += stat.after;
    console.log('OK', destRel, human(stat.before) + ' → ' + human(stat.after));
  } catch (e) {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    report.failed.push({ file: destRel, url: url, error: String(e.message || e) });
    console.log('FAIL', destRel, e.message || e);
  }
}

async function restoreFromAssetMap() {
  const seen = new Set();
  const entries = Object.entries(ASSET_MAP);

  for (const pair of entries) {
    const assetKey = pair[0];
    const localRel = pair[1];
    if (!/^images\/(content|cards)\//.test(localRel)) continue;
    if (seen.has(localRel)) continue;
    seen.add(localRel);

    const urls = urlsForAsset(assetKey);
    const url = pickBestUrl(urls);
    if (!url) {
      report.failed.push({ file: localRel, error: 'no CDN url for ' + assetKey });
      continue;
    }
    const maxPx = localRel.indexOf('images/content/') === 0 ? MAX_CONTENT : MAX_CARD;
    await processFile(localRel, url, maxPx);
  }
}

async function restoreHomeImages() {
  for (const name of HOME_FROM_SITE) {
    await processFile('images/' + name, SITE_IMG + name, MAX_CARD);
    const cardName = CARD_MIRROR[name];
    if (cardName) {
      fs.copyFileSync(path.join(ROOT, 'images', name), path.join(ROOT, 'images/cards', cardName));
    }
  }
  for (const pair of HOME_CDN) {
    await processFile('images/' + pair[0], CDN_SITE + pair[1], MAX_CARD);
    const cardName = CARD_MIRROR[pair[0]];
    if (cardName) {
      fs.copyFileSync(path.join(ROOT, 'images', pair[0]), path.join(ROOT, 'images/cards', cardName));
    }
  }
}

async function main() {
  console.log('Восстановление content + cards с CDN...');
  await restoreFromAssetMap();
  console.log('\nГлавная (images/) + зеркало cards/...');
  await restoreHomeImages();

  fs.writeFileSync(
    path.join(ROOT, 'restore-images-report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log('\n---');
  console.log(
    'Файлов:', report.restored.length,
    '| ошибок:', report.failed.length,
    '| было:', human(report.totalBefore),
    '| стало:', human(report.totalAfter)
  );
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
