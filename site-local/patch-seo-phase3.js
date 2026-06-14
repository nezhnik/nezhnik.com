#!/usr/bin/env node
/**
 * Фаза 3 SEO/контент: h3, тексты из резюме, llms.txt.
 * node patch-seo-phase3.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE = 'https://nezhnik.com';

const META_DESC =
  'Михаил Нежник (@nezhnik) — продуктовый дизайнер с 6-летним опытом: FinTech, LegalTech и Логистика. Проектирую сложные B2C-сервисы, внедряю дизайн-процессы, пишу статьи и гайды, нанимаю и управляю командой.';

const ABOUT_LINE1 =
  '👋 Привет, я — продуктовый дизайнер с\u00A06-летним опытом: FinTech, LegalTech и\u00A0Логистика. Проектирую сложные B2C-сервисы, внедряю дизайн-процессы, пишу статьи и\u00A0гайды, нанимаю и\u00A0управляю командой.';

function applyH3(html) {
  return html.replace(
    /<div class="h3([^"]*)">((?:[^<]|<(?!\/div>))*?)<\/div>/g,
    function (_, cls, inner) {
      return '<h3 class="h3' + cls + '">' + inner + '</h3>';
    }
  );
}

function applyIndexContent(html) {
  html = html.replace(
    /<meta content="[^"]*" name="description"\/>/,
    '<meta content="' + META_DESC + '" name="description"/>'
  );
  html = html.replace(
    /<meta content="[^"]*" property="og:description"\/>/,
    '<meta content="' + META_DESC + '" property="og:description"/>'
  );
  html = html.replace(
    /<meta content="[^"]*" property="twitter:description"\/>/,
    '<meta content="' + META_DESC + '" property="twitter:description"/>'
  );

  html = html.replace(
    /<div class="p card quickstack(?: about-intro)?">\s*👋[\s\S]*?<\/div>/,
    '<div class="p card quickstack about-intro">\n                        ' +
      ABOUT_LINE1 +
      '\n                        <br/>\n</div>'
  );

  html = html.replace(
    /<div class="p card quickstack">6 лет в профессии\.[\s\S]*?<\/div>\s*/g,
    ''
  );

  html = html.replace(
    /"description": "Продуктовый дизайнер с экспертизой[^"]*"/,
    '"description": "' + META_DESC.replace(/"/g, '\\"') + '"'
  );

  return html;
}

function buildLlmsTxt() {
  return `# Михаил Нежник — Продуктовый дизайнер

> Михаил Нежник (@nezhnik) — продуктовый дизайнер с 6-летним опытом: FinTech, LegalTech и Логистика. Проектирую сложные B2C-сервисы, внедряю дизайн-процессы, пишу статьи и гайды, нанимаю и управляю командой.

## Контакты

- Сайт: ${SITE}/
- Telegram: https://t.me/nezhnik
- Email: через Telegram

## Обо мне

Михаил Нежник (@nezhnik) — продуктовый дизайнер с 6-летним опытом: FinTech, LegalTech и Логистика. Проектирую сложные B2C-сервисы, внедряю дизайн-процессы, пишу статьи и гайды, нанимаю и управляю командой.

Опыт: Райффайзенбанк, Сбер, Mish Design.

## Проекты (кейсы)

- CS Radar — ${SITE}/csradar
- CS-Клик — ${SITE}/csclick
- Crafter Logistic — ${SITE}/crafter
- LegalBPM — ${SITE}/legalbpm
- SberPravo — ${SITE}/sberpravo
- ZeСклад — ${SITE}/zesklad
- Умный дом — ${SITE}/smarthome
- Сибпромстрой — ${SITE}/sibpromstroy
- Design Conference — ${SITE}/designconference
- ГлавПивМаг — ${SITE}/glavpivmag

## Навыки

Product design, UX research, UI Kit, discovery, delivery, дизайн-процессы, FinTech, LegalTech, логистика, 3D-иллюстрации, ИИ в дизайне.

## Язык

Русский (основной), английский (рабочий).
`;
}

function patch(fileName) {
  const filePath = path.join(ROOT, fileName);
  let html = fs.readFileSync(filePath, 'utf8');
  const original = html;

  html = applyH3(html);

  if (fileName === 'index.html') {
    html = applyIndexContent(html);
  }

  if (html !== original) {
    fs.writeFileSync(filePath, html);
    console.log('patched:', fileName);
  } else {
    console.log('skip (no changes):', fileName);
  }
}

fs.readdirSync(ROOT)
  .filter(function (f) {
    return f.endsWith('.html');
  })
  .forEach(patch);

const llmsPath = path.join(ROOT, 'llms.txt');
fs.writeFileSync(llmsPath, buildLlmsTxt());
console.log('written: llms.txt');

console.log('patch-seo-phase3: готово');
