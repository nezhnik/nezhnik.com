#!/usr/bin/env node
/**
 * Относительные ссылки для локального просмотра (localhost/site-local/).
 * Запуск: node patch-local-links.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PROJECT_PAGES = new Set([
  'legalbpm.html',
  'sberpravo.html',
  'csclick.html',
  'csradar.html',
  'crafter.html',
  'zesklad.html',
  'sibpromstroy.html',
  'designconference.html',
  'glavpivmag.html',
  'smarthome.html',
  'index.html'
]);

function patchHtml(file, name) {
  let html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const before = html;

  const PROJECT_SLUGS = [
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
  ];

  // Лого и главная → index.html
  html = html.replace(/href="https?:\/\/(?:www\.)?nezhnik\.com\/"/gi, 'href="index.html"');
  html = html.replace(/href="\/"/g, 'href="index.html"');

  // Прод clean URL → page.html
  PROJECT_SLUGS.forEach(function (slug) {
    const re = new RegExp('href="https?:\\/\\/(?:www\\.)?nezhnik\\.com\\/' + slug + '\\/?"', 'gi');
    html = html.replace(re, 'href="' + slug + '.html"');
  });

  // Прод-домен → относительные страницы проектов (.html в URL)
  html = html.replace(/href="https?:\/\/(?:www\.)?nezhnik\.com\/([a-z0-9-]+\.html)"/gi, 'href="$1"');

  // Абсолютные /page.html → page.html
  html = html.replace(/href="\/([a-z0-9-]+\.html)"/gi, 'href="$1"');

  // Якоря шапки: на главной — локально, на проектах — index.html#...
  if (name === 'index.html') {
    html = html.replace(/href="https?:\/\/(?:www\.)?nezhnik\.com\/(#[^"]+)"/gi, 'href="$1"');
  } else {
    html = html.replace(/href="https?:\/\/(?:www\.)?nezhnik\.com\/(#[^"]+)"/gi, 'href="index.html$1"');
  }

  // Внутренние проекты: убрать target="_blank" (удобнее ходить по сайту)
  html = html.replace(
    /<a([^>]*href="([a-z0-9-]+\.html)")([^>]*)target="_blank"([^>]*)>/gi,
    function (m, a, href, b, c) {
      if (!PROJECT_PAGES.has(href) && href !== 'index.html') return m;
      return '<a' + a + b + c + '>';
    }
  );
  html = html.replace(
    /<a([^>]*)target="_blank"([^>]*href="([a-z0-9-]+\.html)")([^>]*)>/gi,
    function (m, a, hrefAttr, href, c) {
      if (!PROJECT_PAGES.has(href) && href !== 'index.html') return m;
      return '<a' + a + hrefAttr + c + '>';
    }
  );

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
console.log('Done:', n, 'files');
