#!/usr/bin/env node
/**
 * Сжатие PNG в images/content/ (и тяжёлых в images/cards/)
 * pngquant --quality=85-100: без видимой потери, пропуск если не уменьшилось.
 * Запуск: node compress-content.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const MIN_BYTES = 200 * 1024;
const QUALITY = '92-100';

const TARGET_DIRS = [
  path.join(ROOT, 'images', 'content'),
  path.join(ROOT, 'images', 'cards')
];

const report = {
  compressed: [],
  skipped: [],
  failed: []
};

function human(bytes) {
  return Math.round(bytes / 1024) + ' KB';
}

function compressPng(file) {
  const before = fs.statSync(file).size;
  if (before < MIN_BYTES) return;

  const tmp = file + '.pngquant.tmp.png';
  const rel = path.relative(ROOT, file);

  try {
    execFileSync(
      'pngquant',
      ['--quality=' + QUALITY, '--speed', '1', '--skip-if-larger', '--force', '--output', tmp, file],
      { stdio: 'pipe' }
    );
  } catch (e) {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    const code = e.status;
    if (code === 99 || code === 98) {
      report.skipped.push({ file: rel, reason: 'quality floor', before: before });
      return;
    }
    report.failed.push({ file: rel, error: String(e.message || e) });
    return;
  }

  if (!fs.existsSync(tmp)) {
    report.skipped.push({ file: rel, reason: 'skip-if-larger', before: before });
    return;
  }

  const after = fs.statSync(tmp).size;
  if (after >= before) {
    fs.unlinkSync(tmp);
    report.skipped.push({ file: rel, reason: 'not smaller', before: before });
    return;
  }

  fs.renameSync(tmp, file);
  report.compressed.push({
    file: rel,
    before: before,
    after: after,
    saved: before - after,
    pct: Math.round((1 - after / before) * 100)
  });
}

TARGET_DIRS.forEach(function (dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(function (name) {
    if (!/\.png$/i.test(name)) return;
    compressPng(path.join(dir, name));
  });
});

let saved = 0;
report.compressed.forEach(function (r) {
  saved += r.saved;
  console.log('OK  ', r.file, human(r.before), '→', human(r.after), '(' + r.pct + '%)');
});
report.skipped.forEach(function (r) {
  console.log('SKIP', r.file, '(' + r.reason + ',', human(r.before) + ')');
});
report.failed.forEach(function (r) {
  console.log('FAIL', r.file, r.error);
});

const outPath = path.join(ROOT, 'compress-content-report.json');
fs.writeFileSync(outPath, JSON.stringify({ quality: QUALITY, savedBytes: saved, ...report }, null, 2));

console.log('\nСжато:', report.compressed.length);
console.log('Пропущено:', report.skipped.length);
console.log('Экономия:', human(saved));
console.log('Отчёт:', path.relative(ROOT, outPath));
