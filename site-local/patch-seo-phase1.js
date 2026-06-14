#!/usr/bin/env node
/**
 * Фаза 1 SEO/деплой: lang, crossorigin, мёртвые ссылки.
 * node patch-seo-phase1.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

const RAIF_OLD =
  /<a class="link-block-3 notallowed w-inline-block" href="#" target="_blank">([\s\S]*?)<\/a>/g;
const RAIF_NEW =
  '<div class="link-block-3 notallowed w-inline-block" aria-disabled="true">$1</div>';

function patchHtml(fileName) {
  const filePath = path.join(ROOT, fileName);
  let html = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  if (!html.includes('lang="ru"')) {
    html = html.replace(/<html(\s)/, '<html lang="ru"$1');
    changed = true;
  }

  const beforeCross = html;
  html = html.replace(/<img(?![^>]*\bcrossorigin\b)([^>]*?)>/gi, '<img crossorigin="anonymous"$1>');
  if (html !== beforeCross) changed = true;

  const beforeRaif = html;
  html = html.replace(RAIF_OLD, RAIF_NEW);
  if (html !== beforeRaif) changed = true;

  if (changed) {
    fs.writeFileSync(filePath, html);
    console.log('patched:', fileName);
  } else {
    console.log('skip:', fileName);
  }
}

fs.readdirSync(ROOT)
  .filter(function (f) {
    return f.endsWith('.html');
  })
  .forEach(patchHtml);

console.log('patch-seo-phase1: готово');
