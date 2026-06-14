#!/usr/bin/env node
/**
 * Сжатие PNG в images/cards/ через pngquant (нужен: brew install pngquant).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CARDS = path.join(__dirname, 'images', 'cards');
const MIN_KB = 300;

fs.readdirSync(CARDS).forEach(function (name) {
  if (!/\.png$/i.test(name)) return;
  var file = path.join(CARDS, name);
  var before = fs.statSync(file).size;
  if (before < MIN_KB * 1024) return;
  var bak = file + '.bak';
  fs.copyFileSync(file, bak);
  execFileSync('pngquant', ['--quality=92-100', '--speed', '1', '--skip-if-larger', '--force', '--output', file, bak], {
    stdio: 'pipe'
  });
  fs.unlinkSync(bak);
  var after = fs.statSync(file).size;
  console.log(name, Math.round(before / 1024) + ' KB →', Math.round(after / 1024) + ' KB');
});

console.log('Готово.');
