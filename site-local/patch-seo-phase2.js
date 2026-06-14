#!/usr/bin/env node
/**
 * Фаза 2 SEO: alt, JSON-LD, h2, H1, og:url, LegalTech, 6 лет.
 * node patch-seo-phase2.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE = 'https://nezhnik.com';

const PROJECTS = {
  'legalbpm.html': {
    slug: 'legalbpm',
    name: 'LegalBPM',
    breadcrumb: 'LegalBPM'
  },
  'sberpravo.html': {
    slug: 'sberpravo',
    name: 'SberPravo',
    breadcrumb: 'SberPravo'
  },
  'smarthome.html': {
    slug: 'smarthome',
    name: 'Умный дом',
    breadcrumb: 'Приложение умного дома'
  },
  'zesklad.html': {
    slug: 'zesklad',
    name: 'ZeСклад',
    breadcrumb: 'ZeСклад'
  },
  'crafter.html': {
    slug: 'crafter',
    name: 'Crafter',
    breadcrumb: 'Crafter'
  },
  'csclick.html': {
    slug: 'csclick',
    name: 'CS-Клик',
    breadcrumb: 'CS-Клик'
  },
  'csradar.html': {
    slug: 'csradar',
    name: 'CS Radar',
    breadcrumb: 'CS Radar'
  },
  'sibpromstroy.html': {
    slug: 'sibpromstroy',
    name: 'Сибпромстрой',
    breadcrumb: 'Сибпромстрой'
  },
  'designconference.html': {
    slug: 'designconference',
    name: 'Design Conference',
    breadcrumb: 'Design Conference'
  },
  'glavpivmag.html': {
    slug: 'glavpivmag',
    name: 'ГлавПивМаг',
    breadcrumb: 'ГлавПивМаг'
  }
};

function escapeAttr(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/\s+/g, ' ')
    .trim();
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

function lastH2Before(html, pos) {
  var chunk = html.slice(Math.max(0, pos - 2500), pos);
  var matches = chunk.match(/<(?:div|h2) class="h2[^"]*">([^<]+)<\/(?:div|h2)>/g);
  if (!matches || !matches.length) return '';
  var last = matches[matches.length - 1];
  var m = last.match(/>([^<]+)</);
  return m ? m[1].trim() : '';
}

function lastH3Before(html, pos) {
  var chunk = html.slice(Math.max(0, pos - 1200), pos);
  var matches = chunk.match(/<div class="h3[^"]*">([^<]+)<\/div>/g);
  if (!matches || !matches.length) return '';
  var last = matches[matches.length - 1];
  var m = last.match(/>([^<]+)</);
  return m ? m[1].trim() : '';
}

function inferAlt(attrs, html, index, fileName) {
  var project = PROJECTS[fileName];
  var projectName = project ? project.name : '';

  if (/\bimage-15\b/.test(attrs)) {
    return 'Михаил Нежник — продуктовый дизайнер, портрет';
  }
  if (/\bimage-main\b/.test(attrs)) {
    return projectName ? projectName + ' — обложка проекта' : 'Обложка проекта';
  }
  if (/\blogo project\b/.test(attrs)) {
    return projectName ? projectName + ' — логотип проекта' : 'Логотип проекта';
  }
  if (/\bbento-image\b/.test(attrs)) {
    var h2 = lastH2Before(html, index);
    if (h2 && projectName) return projectName + ' — ' + h2;
    if (h2) return h2;
    return projectName || 'Иллюстрация проекта';
  }
  if (/\bimage-inside-project\b/.test(attrs)) {
    var section = lastH2Before(html, index);
    if (section && projectName) return projectName + ' — ' + section;
    if (section) return section + ' — скриншот интерфейса';
    return projectName ? projectName + ' — скриншот интерфейса' : 'Скриншот интерфейса';
  }
  if (/\bimage-13\b/.test(attrs)) {
    var h3 = lastH3Before(html, index);
    if (h3) return h3;
    return 'Превью проекта';
  }

  var h3fallback = lastH3Before(html, index);
  if (h3fallback) return h3fallback;

  return projectName || 'Изображение проекта';
}

function applyAlts(html, fileName) {
  return html.replace(/<img([^>]*?)>/gi, function (match, attrs, offset) {
    if (!/alt=""/.test(attrs)) return match;
    var alt = inferAlt(attrs, html, offset, fileName);
    return '<img' + attrs.replace('alt=""', 'alt="' + escapeAttr(alt) + '"') + '>';
  });
}

function applyH2(html) {
  return html.replace(
    /<div class="h2([^"]*)">((?:[^<]|<(?!\/div>))*?)<\/div>/g,
    function (_, cls, inner) {
      return '<h2 class="h2' + cls + '">' + inner + '</h2>';
    }
  );
}

function buildJsonLd(fileName, html) {
  var project = PROJECTS[fileName];
  if (!project) return '';

  var description = extractMeta(html, 'description');
  var url = SITE + '/' + project.slug;

  var graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': 'Главная',
            'item': SITE + '/'
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': project.breadcrumb,
            'item': url
          }
        ]
      },
      {
        '@type': 'CreativeWork',
        'name': project.name,
        'headline': extractTitle(html),
        'description': description,
        'url': url,
        'inLanguage': 'ru',
        'genre': 'Product Design Case Study',
        'author': {
          '@type': 'Person',
          'name': 'Михаил Нежник',
          'url': SITE + '/',
          'jobTitle': 'Product Designer'
        },
        'creator': {
          '@type': 'Person',
          'name': 'Михаил Нежник',
          'url': SITE + '/'
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

function applyOgUrl(html, fileName) {
  if (fileName === 'index.html') return html;
  var project = PROJECTS[fileName];
  if (!project) return html;
  var tag = '<meta content="' + SITE + '/' + project.slug + '" property="og:url"/>';
  if (html.includes('property="og:url"')) return html;
  return html.replace(
    /(<link href="[^"]+" rel="canonical"\/>)/,
    '$1\n' + tag
  );
}

function applyJsonLd(html, fileName) {
  if (fileName === 'index.html') return html;
  var block = buildJsonLd(fileName, html);
  if (!block || html.includes('"@type": "CreativeWork"')) return html;
  return html.replace('</head>', block + '\n</head>');
}

function applyH1Fixes(html, fileName) {
  if (fileName === 'designconference.html') {
    if (!html.includes('<h1 hidden class="h1 project designconference">')) {
      html = html.replace(
        '<div class="logo-or-project-name project">\n<img crossorigin="anonymous" alt="" class="logo project designconference"',
        '<div class="logo-or-project-name project">\n<h1 hidden class="h1 project designconference">Design Conference</h1>\n<img crossorigin="anonymous" alt="Design Conference — логотип проекта" class="logo project designconference"'
      );
    }
  }
  if (fileName === 'zesklad.html') {
    html = html.replace(
      '<h1 class="h1 project zesklad">ZE</h1>\n<h1 class="h1 project zesklad sklad">SKLAD</h1>',
      '<h1 class="h1 project zesklad" aria-label="ZeСклад">ZE</h1>\n<span class="h1 project zesklad sklad" aria-hidden="true">SKLAD</span>'
    );
  }
  if (fileName === 'sberpravo.html') {
    html = html.replace(
      '<h1 class="h1 project sber">Сбер</h1>\n<h1 class="h1 project pravo">Право</h1>',
      '<h1 class="h1 project sber" aria-label="СберПраво">Сбер</h1>\n<span class="h1 project pravo" aria-hidden="true">Право</span>'
    );
  }
  return html;
}

function applyIndexFixes(html) {
  html = html.replace(/LigalTech/g, 'LegalTech');
  html = html.replace(/5 лет в профессии/g, '6 лет в профессии');
  html = html.replace(/<div class="h3 card quickstack">5 лет опыта<\/div>/, '<div class="h3 card quickstack">6 лет опыта</div>');
  return html;
}

function patch(fileName) {
  var filePath = path.join(ROOT, fileName);
  var html = fs.readFileSync(filePath, 'utf8');
  var original = html;

  html = applyH1Fixes(html, fileName);
  html = applyH2(html);
  html = applyAlts(html, fileName);
  html = applyOgUrl(html, fileName);
  html = applyJsonLd(html, fileName);

  if (fileName === 'index.html') {
    html = applyIndexFixes(html);
  }

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

console.log('patch-seo-phase2: готово');
