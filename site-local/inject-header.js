#!/usr/bin/env node
/**
 * Вставляет partials/header.html во все *.html в site-local/.
 *
 * Правите шапку один раз в partials/header.html, затем:
 *   node inject-header.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const HEADER_RE = /<section class="header">[\s\S]*?<\/section>/;

function partialPath() {
  return path.join(ROOT, 'partials', 'header-glass.html');
}

const SITE = 'https://nezhnik.com';

const VARIANTS = {
  'index.html': {
    LOGO_HREF: SITE + '/',
    NAV_ABOUT_HREF: '#about',
    NAV_WORKS_HREF: '#works',
    LOGO_ATTRS: ' aria-current="page"',
    LOGO_CURRENT_CLASS: ' w--current'
  },
  default: {
    LOGO_HREF: SITE + '/',
    NAV_ABOUT_HREF: SITE + '/#about',
    NAV_WORKS_HREF: SITE + '/#works',
    LOGO_ATTRS: '',
    LOGO_CURRENT_CLASS: ''
  }
};

function renderHeader(fileName) {
  const tpl = fs.readFileSync(partialPath(), 'utf8');
  const v = VARIANTS[fileName] || VARIANTS.default;
  return (
    '<!-- partial:header -->\n' +
    tpl.replace(/\{\{(\w+)\}\}/g, function (_, key) {
      return v[key] != null ? v[key] : '';
    }) +
    '\n<!-- /partial:header -->'
  );
}

function inject(fileName) {
  const filePath = path.join(ROOT, fileName);
  let html = fs.readFileSync(filePath, 'utf8');
  const header = renderHeader(fileName);

  if (/<!-- partial:header -->[\s\S]*?<!-- \/partial:header -->/.test(html)) {
    html = html.replace(/<!-- partial:header -->[\s\S]*?<!-- \/partial:header -->/, header);
  } else if (HEADER_RE.test(html)) {
    html = html.replace(HEADER_RE, header);
  } else {
    console.log('skip (no header):', fileName);
    return false;
  }

  html = html.replace(/(<!-- partial:header -->\n)+/g, '<!-- partial:header -->\n');
  html = html.replace(/(<!-- \/partial:header -->\n)+/g, '<!-- /partial:header -->\n');

  fs.writeFileSync(filePath, html);
  console.log('injected:', fileName);
  return true;
}

if (!fs.existsSync(path.join(ROOT, 'partials', 'header-glass.html'))) {
  console.error('Нет файла partials/header-glass.html');
  process.exit(1);
}

let n = 0;
fs.readdirSync(ROOT)
  .filter(function (f) {
    return f.endsWith('.html');
  })
  .forEach(function (f) {
    if (inject(f)) n++;
  });

console.log('Готово:', n, 'страниц');
