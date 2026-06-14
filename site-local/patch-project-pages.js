#!/usr/bin/env node
/**
 * Доводит страницы проектов: reveal.js, чистка img.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

function patchProjectPages() {
  var files = fs.readdirSync(ROOT).filter(function (f) {
    return f.endsWith('.html') && f !== 'index.html';
  });

  files.forEach(function (file) {
    var p = path.join(ROOT, file);
    var html = fs.readFileSync(p, 'utf8');
    var next = html;

    if (next.indexOf('scripts/reveal.js') === -1) {
      next = next.replace(/<\/body>/, '<script defer src="scripts/reveal.js"></script>\n</body>');
    }

    if (next !== html) {
      fs.writeFileSync(p, next);
      console.log('PATCH', file);
    }
  });
}

function patchIndexCards() {
  var p = path.join(ROOT, 'index.html');
  var html = fs.readFileSync(p, 'utf8');
  var next = html.replace(/\s+sizes="[^"]*"/g, '');
  next = next.replace(/(<img[^>]*loading="lazy"[^>]*)\s+loading="lazy"\s+alt="">/g, '$1>');
  if (next !== html) {
    fs.writeFileSync(p, next);
    console.log('PATCH index.html (sizes + дубли img)');
  }
}

patchProjectPages();
patchIndexCards();
console.log('Готово.');
