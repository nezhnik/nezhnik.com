#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

function patchFileContent(text) {
  let n = 0;
  const next = text.replace(/(images\/[^"')]+)\.(png|jpe?g)/gi, function (m, base) {
    n++;
    return base + '.webp';
  });
  return { text: next, n: n };
}

const targets = fs
  .readdirSync(ROOT)
  .filter(function (f) {
    return f.endsWith('.html');
  })
  .map(function (f) {
    return path.join(ROOT, f);
  });

const cssDir = path.join(ROOT, 'css', 'pages');
fs.readdirSync(cssDir).forEach(function (f) {
  if (f.endsWith('.css')) targets.push(path.join(cssDir, f));
});

let total = 0;
targets.forEach(function (file) {
  const raw = fs.readFileSync(file, 'utf8');
  const r = patchFileContent(raw);
  if (r.n > 0) {
    fs.writeFileSync(file, r.text);
    total += r.n;
    console.log(path.relative(ROOT, file), r.n);
  }
});

fs.readdirSync(ROOT)
  .filter(function (f) {
    return f.endsWith('.html');
  })
  .forEach(function (f) {
    const file = path.join(ROOT, f);
    let html = fs.readFileSync(file, 'utf8');
    const before = html;
    html = html.replace(/og-cover\.jpe?g/gi, 'og-cover.webp');
    html = html.replace(
      /images\/shared\/favicon-32\.webp" rel="shortcut icon" type="image\/x-icon"/g,
      'images/shared/favicon-32.webp" rel="shortcut icon" type="image/webp"'
    );
    if (html !== before) fs.writeFileSync(file, html);
  });

console.log('Всего ссылок:', total);
