#!/usr/bin/env node
/**
 * Дожимает PNG, которые не прошли quality 85-100.
 * Пробует 82-98, затем 80-95 — только если файл стал меньше.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const REPORT = path.join(ROOT, 'compress-content-report.json');

const TIERS = ['82-98', '80-95'];

function human(b) {
  return Math.round(b / 1024) + ' KB';
}

function tryQuant(file, quality) {
  const tmp = path.join('/tmp', 'pngq-' + process.pid + '-' + path.basename(file));
  if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  try {
    execFileSync(
      'pngquant',
      ['--quality=' + quality, '--speed', '1', '--skip-if-larger', '--force', '--output', tmp, file],
      { stdio: 'pipe' }
    );
  } catch (e) {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    return null;
  }
  if (!fs.existsSync(tmp)) return null;
  return tmp;
}

const skipped = JSON.parse(fs.readFileSync(REPORT, 'utf8')).skipped || [];
const results = [];

skipped.forEach(function (row) {
  const file = path.join(ROOT, row.file);
  if (!fs.existsSync(file)) return;

  const before = fs.statSync(file).size;
  let best = null;
  let tier = null;

  TIERS.forEach(function (q) {
    const tmp = tryQuant(file, q);
    if (!tmp) return;
    const after = fs.statSync(tmp).size;
    if (!best || after < best.after) {
      if (best && fs.existsSync(best.tmp)) fs.unlinkSync(best.tmp);
      best = { tmp: tmp, after: after, tier: q };
      tier = q;
    } else if (fs.existsSync(tmp)) {
      fs.unlinkSync(tmp);
    }
  });

  if (!best || best.after >= before) {
    console.log('SKIP', row.file, human(before), '(не удалось без потери)');
    return;
  }

  fs.copyFileSync(best.tmp, file);
  fs.unlinkSync(best.tmp);
  results.push({ file: row.file, before: before, after: best.after, tier: tier });
  console.log(
    'OK  ',
    row.file,
    human(before),
    '→',
    human(best.after),
    '(' + tier + ', -' + Math.round((1 - best.after / before) * 100) + '%)'
  );
});

const out = path.join(ROOT, 'compress-skipped-report.json');
fs.writeFileSync(out, JSON.stringify(results, null, 2));
console.log('\nГотово:', results.length, 'файлов');
