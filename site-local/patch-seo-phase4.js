#!/usr/bin/env node
/**
 * Фаза 4 SEO/perf meta: www, OG/Twitter, JSON-LD, опечатки, noopener, titles.
 * node patch-seo-phase4.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE = 'https://nezhnik.com';
const OG_IMAGE = SITE + '/images/shared/og-cover.webp';

const PROJECTS = {
  'legalbpm.html': { slug: 'legalbpm', name: 'LegalBPM', breadcrumb: 'LegalBPM', cover: 'images/cards/raiffeisen-9.webp' },
  'sberpravo.html': { slug: 'sberpravo', name: 'SberPravo', breadcrumb: 'SberPravo', cover: 'images/content/d4be67ab-каталог-1-уровень-все-1920..webp' },
  'smarthome.html': { slug: 'smarthome', name: 'Умный дом', breadcrumb: 'Приложение умного дома', cover: 'images/content/8b21fec1-main.webp' },
  'zesklad.html': { slug: 'zesklad', name: 'ZeСклад', breadcrumb: 'ZeСклад', cover: 'images/content/48fa6e6b-снимок-экрана-2024-05-05-в-7.40.08-pm.webp' },
  'crafter.html': { slug: 'crafter', name: 'Crafter', breadcrumb: 'Crafter', cover: 'images/content/0ba3fff0-crafter-cover-2.webp' },
  'csclick.html': { slug: 'csclick', name: 'CS-Клик', breadcrumb: 'CS-Клик', cover: 'images/cards/raiffeisen-11.webp' },
  'csradar.html': { slug: 'csradar', name: 'CS Radar', breadcrumb: 'CS Radar', cover: 'images/content/3da549ba-маршруты-на-карте-не-показывать-пути-маршрутов.webp' },
  'sibpromstroy.html': { slug: 'sibpromstroy', name: 'Сибпромстрой', breadcrumb: 'Сибпромстрой', cover: 'images/content/f0effb44-главная-страница-3.webp' },
  'designconference.html': { slug: 'designconference', name: 'Design Conference', breadcrumb: 'Design Conference', cover: 'images/content/52538052-дизаи-н-конференция-main.webp' },
  'glavpivmag.html': { slug: 'glavpivmag', name: 'ГлавПивМаг', breadcrumb: 'ГлавПивМаг', cover: 'images/content/56ad4f40-frame-1851040498.webp' }
};

const TITLE_EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F]/gu;

const TYPO_FIXES = [
  [/Сайта и каталог магазина/g, 'Сайт и каталог магазина'],
  [/длясотрудников/g, 'для сотрудников'],
  [/Дизайн личный кабинет логиста/g, 'Дизайн личного кабинета логиста'],
  [/приложение для IOS/gi, 'приложение для iOS'],
  [/для IOS/g, 'для iOS'],
  [/российскими и&amp;nbsp;иностранными/g, 'российскими и иностранными'],
  [/<h1 class="h1 project csradar">CS-Клик<\/h1>/, '<h1 class="h1 project csclick">CS-Клик</h1>']
];

function stripEmoji(s) {
  return s.replace(TITLE_EMOJI, '').replace(/\s+/g, ' ').trim();
}

function extractMeta(html, name) {
  var re = new RegExp('<meta content="([^"]*)" name="' + name + '"/>');
  var m = html.match(re);
  return m ? m[1].replace(/&amp;/g, '&') : '';
}

function extractTitle(html) {
  var m = html.match(/<title>([^<]*)<\/title>/);
  return m ? m[1].replace(/&amp;/g, '&') : '';
}

function applyWww(html) {
  html = html.replace(/https:\/\/nezhnik\.com\//g, SITE + '/');
  return html;
}

function applyExtraMeta(html) {
  if (!html.includes('property="og:locale"')) {
    html = html.replace(
      /<meta content="website" property="og:type"\/>/,
      '<meta content="website" property="og:type"/>\n' +
        '<meta content="ru_RU" property="og:locale"/>\n' +
        '<meta content="Михаил Нежник" property="og:site_name"/>'
    );
  }
  if (!html.includes('name="twitter:site"')) {
    html = html.replace(
      /<meta content="summary_large_image" name="twitter:card"\/>/,
      '<meta content="summary_large_image" name="twitter:card"/>\n' +
        '<meta content="@nezhnik" name="twitter:site"/>\n' +
        '<meta content="@nezhnik" name="twitter:creator"/>'
    );
  }
  html = html.replace(
    /<meta content="[^"]*" property="og:image"\/>/,
    '<meta content="' + OG_IMAGE + '" property="og:image"/>'
  );
  html = html.replace(
    /<meta content="[^"]*" property="twitter:image"\/>/,
    '<meta content="' + OG_IMAGE + '" property="twitter:image"/>'
  );
  if (html.includes('property="og:image:width"') && !html.includes('property="og:image:width"')) {
    /* keep existing */
  } else if (!html.includes('property="og:image:width"')) {
    html = html.replace(
      /(<link href="[^"]+" rel="canonical"\/>)/,
      '$1\n<meta content="1200" property="og:image:width"/>\n<meta content="630" property="og:image:height"/>'
    );
  }
  return html;
}

function applyCleanTitles(html, fileName) {
  if (fileName === 'index.html') return html;
  var project = PROJECTS[fileName];
  if (!project) return html;

  var clean = project.name + ' – Михаил Нежник';
  html = html.replace(/<title>[^<]*<\/title>/, '<title>' + clean + '</title>');
  html = html.replace(
    /<meta content="[^"]*" property="og:title"\/>/,
    '<meta content="' + clean + '" property="og:title"/>'
  );
  html = html.replace(
    /<meta content="[^"]*" property="twitter:title"\/>/,
    '<meta content="' + clean + '" property="twitter:title"/>'
  );
  return html;
}

function applyNoopener(html) {
  return html.replace(/<a\b([^>]*?)target="_blank"(?![^>]*\brel=)([^>]*)>/gi, function (_, before, after) {
    return '<a' + before + 'target="_blank" rel="noopener noreferrer"' + after + '>';
  });
}

function buildIndexJsonLd() {
  var cases = Object.keys(PROJECTS).map(function (file) {
    var p = PROJECTS[file];
    return {
      '@type': 'ListItem',
      position: 0,
      name: p.name,
      url: SITE + '/' + p.slug
    };
  });
  cases.forEach(function (item, i) {
    item.position = i + 1;
  });

  var graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'Михаил Нежник — Продуктовый дизайнер',
        url: SITE + '/',
        description: extractMetaFromConst(),
        publisher: { '@id': '#person' },
        inLanguage: 'ru'
      },
      {
        '@id': '#person',
        '@type': 'Person',
        name: 'Михаил Нежник',
        url: SITE + '/',
        jobTitle: 'Product Designer',
        sameAs: [
          'https://t.me/nezhnik',
          SITE + '/',
          'https://www.figma.com/community/plugin/1518640289187057362'
        ]
      },
      {
        '@type': 'ItemList',
        name: 'Проекты',
        itemListElement: cases
      }
    ]
  };

  return (
    '<script type="application/ld+json">\n' +
    JSON.stringify(graph, null, 2).replace(/</g, '\\u003c') +
    '\n</script>'
  );
}

function extractMetaFromConst() {
  return 'Михаил Нежник (@nezhnik) — продуктовый дизайнер с 6-летним опытом: FinTech, LegalTech и Логистика. Проектирую сложные B2C-сервисы, внедряю дизайн-процессы, пишу статьи и гайды, нанимаю и управляю командой.';
}

function buildProjectJsonLd(fileName, html) {
  var project = PROJECTS[fileName];
  if (!project) return '';

  var description = extractMeta(html, 'description');
  var title = stripEmoji(extractTitle(html));
  if (title.indexOf('–') === -1) title = project.name + ' – Михаил Нежник';
  var url = SITE + '/' + project.slug;

  var graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Главная', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: project.breadcrumb, item: url }
        ]
      },
      {
        '@type': 'CreativeWork',
        name: project.name,
        headline: title,
        description: description,
        url: url,
        image: SITE + '/' + project.cover,
        inLanguage: 'ru',
        genre: 'Product Design Case Study',
        author: {
          '@type': 'Person',
          name: 'Михаил Нежник',
          url: SITE + '/',
          jobTitle: 'Product Designer',
          sameAs: ['https://t.me/nezhnik', SITE + '/']
        },
        creator: {
          '@type': 'Person',
          name: 'Михаил Нежник',
          url: SITE + '/'
        }
      }
    ]
  };

  return (
    '<script type="application/ld+json">\n' +
    JSON.stringify(graph, null, 2).replace(/</g, '\\u003c') +
    '\n</script>'
  );
}

function applyJsonLd(html, fileName) {
  var block = fileName === 'index.html' ? buildIndexJsonLd() : buildProjectJsonLd(fileName, html);
  if (!block) return html;
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, '');
  return html.replace('</head>', block + '\n</head>');
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

## Проекты (кейсы на сайте)

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

## Другие проекты

- Символы для интерфейсов — ${SITE}/symbols/
- Игра на цветовосприятие — ${SITE}/color/
- Плагин Basketball для Figma — https://www.figma.com/community/plugin/1518640289187057362
- Каталог монет omonete.ru — https://omonete.ru

## Навыки

Product design, UX research, UI Kit, discovery, delivery, дизайн-процессы, FinTech, LegalTech, логистика, 3D-иллюстрации, ИИ в дизайне.

## Язык

Русский (основной), английский (рабочий).
`;
}

function patch(fileName) {
  var filePath = path.join(ROOT, fileName);
  var html = fs.readFileSync(filePath, 'utf8');
  var original = html;

  TYPO_FIXES.forEach(function (pair) {
    html = html.replace(pair[0], pair[1]);
  });

  html = applyWww(html);
  html = applyExtraMeta(html);
  html = applyCleanTitles(html, fileName);
  html = applyNoopener(html);
  html = applyJsonLd(html, fileName);

  if (html !== original) {
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
  .forEach(patch);

fs.writeFileSync(path.join(ROOT, 'llms.txt'), buildLlmsTxt());
console.log('updated: llms.txt');
console.log('patch-seo-phase4: готово');
