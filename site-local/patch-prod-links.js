#!/usr/bin/env node
/**
 * Прод-ссылки для заливки на nezhnik.com (clean URLs).
 * В git храним эту версию; для локального теста: node patch-local-links.js
 *
 * Запуск: node patch-prod-links.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE = 'https://nezhnik.com';

const PROJECT_SLUGS = new Set([
  'raf-identic',
  'raf',
  'onesearch',
  'servicedesk',
  'legalbpm',
  'sberpravo',
  'csclick',
  'csradar',
  'crafter',
  'zesklad',
  'sibpromstroy',
  'designconference',
  'glavpivmag',
  'smarthome'
]);

const HOME_PAGES = new Set(['index.html']);

function patchWorkCardsJs() {
  const filePath = path.join(ROOT, 'scripts/work-cards.js');
  if (!fs.existsSync(filePath)) return false;
  let js = fs.readFileSync(filePath, 'utf8');
  const before = js;
  js = js.replace(/href: '([a-z0-9-]+)\.html'/g, function (m, slug) {
    if (PROJECT_SLUGS.has(slug)) return "href: '" + SITE + '/' + slug + "'";
    return m;
  });
  if (js !== before) {
    fs.writeFileSync(filePath, js);
    console.log('patched scripts/work-cards.js');
    return true;
  }
  return false;
}

function slugFromHref(href) {
  const m = href.match(/^([a-z0-9-]+)\.html$/i);
  return m ? m[1] : null;
}

function patchHtml(file, name) {
  let html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const before = html;

  // Лого и главная
  html = html.replace(/href="index\.html"/gi, 'href="' + SITE + '/"');

  // Якоря на главной
  if (HOME_PAGES.has(name)) {
    html = html.replace(/href="index\.html(#[^"]+)"/gi, 'href="$1"');
  } else {
    html = html.replace(/href="index\.html(#[^"]+)"/gi, 'href="' + SITE + '/$1"');
  }

  // Относительные страницы проектов → clean URL
  html = html.replace(/href="([a-z0-9-]+)\.html"/gi, function (m, slug) {
    if (slug === 'index') return 'href="' + SITE + '/"';
    if (PROJECT_SLUGS.has(slug)) return 'href="' + SITE + '/' + slug + '"';
    return m;
  });

  // Локальный корень → прод
  html = html.replace(/href="\//g, 'href="' + SITE + '/');

  if (html !== before) {
    fs.writeFileSync(path.join(ROOT, file), html);
    return true;
  }
  return false;
}

const files = fs.readdirSync(ROOT).filter(function (f) {
  return f.endsWith('.html');
});

let n = 0;
files.forEach(function (f) {
  if (patchHtml(f, f)) {
    console.log('patched', f);
    n++;
  }
});
patchWorkCardsJs();
console.log('Done:', n, 'html files');
