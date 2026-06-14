#!/usr/bin/env node
/**
 * Оптимизация картинок главной: один файл на карточку, resize через sips.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const CARDS = path.join(ROOT, 'images', 'cards');
const SHARED = path.join(ROOT, 'images', 'shared');
const CDN = path.join(ROOT, 'assets', 'cdn');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function sipsResize(src, dest, maxPx) {
  if (!fs.existsSync(src)) {
    console.warn('SKIP missing:', src);
    return false;
  }
  ensureDir(path.dirname(dest));
  execFileSync('sips', ['-Z', String(maxPx), src, '--out', dest], { stdio: 'pipe' });
  var size = fs.statSync(dest).size;
  console.log('OK', path.relative(ROOT, dest), '(' + Math.round(size / 1024) + ' KB)');
  return true;
}

function copyFile(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn('SKIP missing:', src);
    return false;
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  console.log('COPY', path.relative(ROOT, dest));
  return true;
}

ensureDir(CARDS);
ensureDir(SHARED);
var cardSources = [
  { name: 'symbols', src: path.join(ROOT, 'images', 'symbols.png'), max: 1200 },
  { name: 'color', src: path.join(ROOT, 'images', 'color.png'), max: 1200 },
  { name: 'plagin', src: path.join(ROOT, 'images', 'plagin.png'), max: 1200 },
  { name: 'omonete', src: path.join(ROOT, 'images', 'omonete.png'), max: 1200 },
  { name: 'csclick', src: path.join(ROOT, 'images', 'CSClick.png'), max: 1200 },
  { name: 'glavpivmag', src: path.join(ROOT, 'images', 'Glavpivmag.png'), max: 1200 },
  { name: 'smarthome', src: path.join(ROOT, 'images', 'Smarthome.png'), max: 1200 },
  { name: 'raiffeisen-8', src: path.join(ROOT, 'images', 'Raiffeisen-8.png'), max: 1200 },
  { name: 'raiffeisen-9', src: path.join(ROOT, 'images', 'Raiffeisen-9.png'), max: 1200 },
  { name: 'raiffeisen-10', src: path.join(ROOT, 'images', 'Raiffeisen-10.png'), max: 1200 },
  { name: 'raiffeisen-12', src: path.join(ROOT, 'images', 'Raiffeisen-12.png'), max: 1200 },
  { name: 'raiffeisen-13', src: path.join(ROOT, 'images', 'Raiffeisen-13.png'), max: 1200 },
  { name: 'raiffeisen-14', src: path.join(ROOT, 'images', 'Raiffeisen-14.png'), max: 1200 },
  { name: 'raiffeisen-15', src: path.join(ROOT, 'images', 'Raiffeisen-15.png'), max: 1200 },
  { name: 'raiffeisen-17', src: path.join(ROOT, 'images', 'Raiffeisen-17.png'), max: 1200 }
];

console.log('=== Карточки (max 1200px) ===');
cardSources.forEach(function (item) {
  sipsResize(item.src, path.join(CARDS, item.name + '.png'), item.max);
});

console.log('\n=== Аватар (max 400px) ===');
sipsResize(path.join(ROOT, 'avatar.png'), path.join(ROOT, 'images', 'avatar.png'), 400);

console.log('\n=== Favicon ===');
copyFile(path.join(CDN, '65e31511386e84fece3f263a_Favicon-32x32.png'), path.join(SHARED, 'favicon-32.png'));
copyFile(path.join(CDN, '65e31514c7732269df37d43b_Favicon-256x256.png'), path.join(SHARED, 'favicon-256.png'));

console.log('\nГотово.');
