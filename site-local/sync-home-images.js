#!/usr/bin/env node
/**
 * Синхронизация картинок главной с nezhnik.com (имена и содержимое как на проде).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const IMG = path.join(ROOT, 'images');
const CARDS = path.join(IMG, 'cards');
const SITE = 'https://nezhnik.com/images/';
const CDN = 'https://cdn.prod.website-files.com/65cfb22a548897845b7a6710/';

const FROM_SITE = [
  'symbols.png',
  'color.png',
  'plagin.png',
  'omonete.png',
  'CSClick.png',
  'Glavpivmag.png',
  'Smarthome.png'
];

const FROM_CDN = [
  ['Raiffeisen-8.png', '676a64d0c5a96b9de224e085_Raiffeisen%208.png'],
  ['Raiffeisen-9.png', '676a64d0d1ebce5fb0ee5879_Raiffeisen%209.png'],
  ['Raiffeisen-10.png', '676a64d01aa6955efd18cfdd_Raiffeisen%2010.png'],
  ['Raiffeisen-11.png', '676e5ae5f761fd8475e4e462_Raiffeisen-11.png'],
  ['Raiffeisen-12.png', '676a64d0ed6cbad1a0ca0deb_Raiffeisen%2012.png'],
  ['Raiffeisen-13.png', '676a64d0ca881a01704a0dab_Raiffeisen%2013.png'],
  ['Raiffeisen-14.png', '676aba0db2605216c17c8055_Raiffeisen%2014.png'],
  ['Raiffeisen-15.png', '676abbc63871bbda8c91c33e_Raiffeisen%2015.png'],
  ['Raiffeisen-16.png', '676a64d0edeeceaba1685b57_Raiffeisen-16.png'],
  ['Raiffeisen-17.png', '676a64d2648dd93b68626321_Raiffeisen%2017.png'],
  ['Raiffeisen-18.png', '676abe633353e07eb0ba0d4b_Raiffeisen-18.png']
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

FROM_CDN.forEach(function (pair) {
  CARD_MIRROR[pair[0]] = pair[0].toLowerCase();
});

function download(url, dest) {
  return new Promise(function (resolve, reject) {
    const file = fs.createWriteStream(dest);
    https
      .get(url, function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(dest);
          return download(res.headers.location, dest).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          return reject(new Error(url + ' HTTP ' + res.statusCode));
        }
        res.pipe(file);
        file.on('finish', function () {
          file.close(resolve);
        });
      })
      .on('error', reject);
  });
}

function optimize(file) {
  const before = fs.statSync(file).size;
  const resized = file + '.resize.png';
  execFileSync('sips', ['-Z', '1800', file, '--out', resized], { stdio: 'pipe' });
  const tmp = file + '.q.png';
  try {
    execFileSync(
      'pngquant',
      ['--quality=92-100', '--speed', '1', '--skip-if-larger', '--force', '--output', tmp, resized],
      { stdio: 'pipe' }
    );
    if (fs.existsSync(tmp)) {
      const after = fs.statSync(tmp).size;
      if (after < before) {
        fs.copyFileSync(tmp, file);
        fs.unlinkSync(tmp);
      }
    }
  } catch (e) {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
  if (fs.existsSync(resized)) {
    const rs = fs.statSync(resized).size;
    if (rs < fs.statSync(file).size) fs.copyFileSync(resized, file);
    fs.unlinkSync(resized);
  }
  return { before: before, after: fs.statSync(file).size };
}

async function main() {
  fs.mkdirSync(CARDS, { recursive: true });
  const results = [];

  for (const name of FROM_SITE) {
    const dest = path.join(IMG, name);
    const url = SITE + encodeURI(name).replace(/%20/g, '%20');
    await download(SITE + name, dest);
    const stat = optimize(dest);
    results.push({ file: name, ...stat });
    console.log('OK', name, Math.round(stat.before / 1024) + '→' + Math.round(stat.after / 1024) + ' KB');
  }

  for (const pair of FROM_CDN) {
    const name = pair[0];
    const dest = path.join(IMG, name);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 50000) {
      console.log('SKIP', name, '(уже скачан)');
      const stat = optimize(dest);
      results.push({ file: name, ...stat });
      continue;
    }
    try {
      await download(CDN + pair[1], dest);
    } catch (e) {
      const fallbacks = [
        path.join(ROOT, '..', 'images', name),
        path.join(CARDS, CARD_MIRROR[name] || name.toLowerCase())
      ];
      const found = fallbacks.find(function (p) {
        return fs.existsSync(p);
      });
      if (found) {
        fs.copyFileSync(found, dest);
        console.log('FALLBACK', path.basename(found), '→', name);
      } else {
        console.warn('SKIP', name, e.message);
        continue;
      }
    }
    const stat = optimize(dest);
    results.push({ file: name, ...stat });
    console.log('OK', name, Math.round(stat.before / 1024) + '→' + Math.round(stat.after / 1024) + ' KB');
  }

  Object.keys(CARD_MIRROR).forEach(function (srcName) {
    const cardName = CARD_MIRROR[srcName];
    fs.copyFileSync(path.join(IMG, srcName), path.join(CARDS, cardName));
  });

  fs.writeFileSync(path.join(ROOT, 'sync-home-images-report.json'), JSON.stringify(results, null, 2));
  console.log('\nЗеркало в images/cards/ обновлено.');
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
