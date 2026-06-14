#!/usr/bin/env node
/**
 * Montserrat/Open Sans: только cyrillic + latin, веса 400/500/600 normal.
 * node build-slim-fonts.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'fonts-local.css');
const OUT = path.join(ROOT, 'fonts-local.css');
const BACKUP = path.join(ROOT, 'fonts-local.full.css');

var css = fs.readFileSync(SRC, 'utf8');
if (!fs.existsSync(BACKUP)) {
  fs.writeFileSync(BACKUP, css);
  console.log('backup:', BACKUP);
}

var blocks = css.split(/(?=\/\* )/);
var keepComments = ['cyrillic */', 'latin */'];
var keepWeights = ['font-weight: 400', 'font-weight: 500', 'font-weight: 600'];
var kept = blocks.filter(function (block) {
  if (!block.includes('@font-face')) return false;
  if (block.includes('font-style: italic')) return false;
  if (!keepComments.some(function (c) { return block.includes(c); })) return false;
  return keepWeights.some(function (w) { return block.includes(w); });
});

var header = '/* fonts-local — slim: cyrillic + latin, 400/500/600 (auto-generated) */\n\n';
fs.writeFileSync(OUT, header + kept.join('').trim() + '\n');
console.log('slim fonts:', kept.length, 'faces →', OUT);
