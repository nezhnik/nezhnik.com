#!/usr/bin/env node
/**
 * Пересжимает PNG > 800 KB в images/cards и images/content через sips.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const MIN_BYTES = 800 * 1024;
const dirs = [path.join(ROOT, 'images', 'cards'), path.join(ROOT, 'images', 'content')];

function compress(file) {
  var before = fs.statSync(file).size;
  if (before < MIN_BYTES) return;
  var tmp = file + '.tmp.png';
  execFileSync(
    'sips',
    ['-Z', '1600', '-s', 'format', 'png', file, '--out', tmp],
    { stdio: 'pipe' }
  );
  var after = fs.statSync(tmp).size;
  if (after >= before) {
    fs.unlinkSync(tmp);
    console.log('SKIP', path.relative(ROOT, file), '(sips не уменьшил)');
    return;
  }
  fs.renameSync(tmp, file);
  console.log(
    path.relative(ROOT, file),
    Math.round(before / 1024) + ' KB →',
    Math.round(after / 1024) + ' KB'
  );
}

dirs.forEach(function (dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(function (name) {
    if (!/\.png$/i.test(name)) return;
    compress(path.join(dir, name));
  });
});

console.log('Готово.');
