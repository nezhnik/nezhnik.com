#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const BLOCK = /<section class="footer_cta">[\s\S]*?<\/section>\n?/;

const files = fs.readdirSync(ROOT).filter(function (f) {
  return f.endsWith('.html') && f !== 'index.html';
});

files.forEach(function (f) {
  const filePath = path.join(ROOT, f);
  const html = fs.readFileSync(filePath, 'utf8');
  const next = html.replace(BLOCK, '');
  if (next === html) {
    console.log('skip (not found):', f);
    return;
  }
  fs.writeFileSync(filePath, next);
  console.log('removed footer_cta:', f);
});
