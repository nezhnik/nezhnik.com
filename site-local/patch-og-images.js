#!/usr/bin/env node
/**
 * OG/Twitter: картинка, title, description + JSON-LD image/description.
 * Главная — текст из hero; проекты — описание карточки с главной.
 * node patch-og-images.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE = 'https://nezhnik.com';

const HOME_DESC =
  'Привет, я — продуктовый дизайнер с 6-летним опытом: FinTech, LegalTech и Логистика. ' +
  'Проектирую сложные B2C- и B2B-сервисы, внедряю дизайн-процессы, пишу статьи и гайды, нанимаю и управляю командой.';

const HOME_TITLE = 'Михаил Нежник, продуктовый дизайнер';

/** file → { image, desc, title?, url? } */
const META = {
  'index.html': {
    image: 'images/shared/og-home.webp',
    desc: HOME_DESC,
    title: HOME_TITLE,
    url: SITE + '/'
  },
  'raf-identic.html': {
    image: 'images/shared/og/raf-identic.webp',
    desc: 'Айдентика и визуальный стиль Рафа — основного ИИ‑ассистента для всех сотрудников',
    title: 'Раф, айдентика ИИ-ассистента',
    url: SITE + '/raf-identic'
  },
  'raf.html': {
    image: 'images/shared/og/raf.webp',
    desc: 'Веб-интерфейс и мобильное приложение Рафа — основного ИИ‑ассистента для всех сотрудников',
    title: 'Раф, ИИ-ассистент',
    url: SITE + '/raf'
  },
  'onesearch.html': {
    image: 'images/shared/og/onesearch.webp',
    desc: 'Редизайн и проектирование единого решения поиска для основных порталов банка — «Инсайдер» и «Сервис-деск»',
    title: 'Поиск внутренних порталов',
    url: SITE + '/onesearch'
  },
  'servicedesk.html': {
    image: 'images/shared/og/servicedesk.webp',
    desc: 'Редизайн портала «Сервис-деск» — сервиса решения рабочих вопросов всех сотрудников и обращений клиентов банка',
    title: 'Портал Сервис-деск',
    url: SITE + '/servicedesk'
  },
  'legalbpm.html': {
    image: 'images/shared/og/legalbpm.webp',
    desc: 'Редизайн юридического сервиса «LegalBPM» — системы менеджмента бизнес-процессов правовых запросов и судебной работы Сбера',
    title: 'Сбер Право — LegalBPM — Михаил Нежник',
    url: SITE + '/legalbpm'
  },
  'sberpravo.html': {
    image: 'images/shared/og/sberpravo.webp',
    desc: 'Каталог услуг и набор 3D-иллюстраций для юридического сервиса Сбера',
    title: 'Сбер Право',
    url: SITE + '/sberpravo'
  },
  'csclick.html': {
    image: 'images/shared/og/csclick.webp',
    desc: 'Сервис заказа товаров «CS-Клик» для всех сотрудников и партнеров Сбера',
    title: 'Сбер — CS-Клик — Михаил Нежник',
    url: SITE + '/csclick'
  },
  'csradar.html': {
    image: 'images/shared/og/csradar.webp',
    desc: 'Личные кабинеты логистов и операторов для логистической платформы «CS Radar»',
    title: 'Сбер — CS Radar — Михаил Нежник',
    url: SITE + '/csradar'
  },
  'crafter.html': {
    image: 'images/shared/og/crafter.webp',
    desc: 'Личные кабинеты логистов и перевозчиков для логистической компании',
    title: 'Crafter — Михаил Нежник',
    url: SITE + '/crafter'
  },
  'zesklad.html': {
    image: 'images/shared/og/zesklad.webp',
    desc: 'Личный кабинет и сайт для сервиса хранения вещей',
    title: 'ZeСклад — Михаил Нежник',
    url: SITE + '/zesklad'
  },
  'smarthome.html': {
    image: 'images/shared/og/smarthome.webp',
    desc: 'Концепция приложения умного дома',
    title: 'Smart home — Михаил Нежник',
    url: SITE + '/smarthome'
  },
  'sibpromstroy.html': {
    image: 'images/shared/og/sibpromstroy.webp',
    desc: 'Редизайн сайта для строительной компании',
    title: 'Сибпромстрой — Михаил Нежник',
    url: SITE + '/sibpromstroy'
  },
  'designconference.html': {
    image: 'images/shared/og/designconference.webp',
    desc: 'Лендинг для дизайн-конференции',
    title: 'Design Conference — Михаил Нежник',
    url: SITE + '/designconference'
  },
  'glavpivmag.html': {
    image: 'images/shared/og/glavpivmag.webp',
    desc: 'Главная страница и каталог для магазина крафтового пива',
    title: 'ГлавПивМаг — Михаил Нежник',
    url: SITE + '/glavpivmag'
  }
};

function escAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function setMetaContent(html, attr, key, value) {
  const re = new RegExp('<meta content="[^"]*" ' + attr + '="' + key + '"\\/>');
  return html.replace(re, '<meta content="' + escAttr(value) + '" ' + attr + '="' + key + '"/>');
}

function setMeta(html, key, value) {
  if (html.includes('property="' + key + '"')) {
    html = setMetaContent(html, 'property', key, value);
  }
  if (html.includes('name="' + key + '"')) {
    html = setMetaContent(html, 'name', key, value);
  }
  return html;
}

function patchHtml(fileName, meta) {
  const filePath = path.join(ROOT, fileName);
  if (!fs.existsSync(filePath)) return false;

  let html = fs.readFileSync(filePath, 'utf8');
  const before = html;
  const imageUrl = SITE + '/' + meta.image;

  html = setMeta(html, 'description', meta.desc);
  html = setMeta(html, 'og:title', meta.title);
  html = setMeta(html, 'og:description', meta.desc);
  html = setMeta(html, 'og:image', imageUrl);
  html = setMeta(html, 'twitter:title', meta.title);
  html = setMeta(html, 'twitter:description', meta.desc);
  html = setMeta(html, 'twitter:image', imageUrl);

  if (meta.url) {
    if (html.includes('property="og:url"')) {
      html = setMetaContent(html, 'property', 'og:url', meta.url);
    }
    const canonRe = /<link href="[^"]*" rel="canonical"\/>/;
    if (canonRe.test(html)) {
      html = html.replace(canonRe, '<link href="' + meta.url + '" rel="canonical"/>');
    }
  }

  html = html.replace(/"image": "https:\/\/nezhnik\.com\/[^"]+"/g, '"image": "' + imageUrl + '"');

  html = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, function (block, json) {
    try {
      const data = JSON.parse(json);
      const graph = data['@graph'] || (data['@type'] ? [data] : []);
      graph.forEach(function (node) {
        if (node['@type'] === 'CreativeWork' || node['@type'] === 'WebSite') {
          node.description = meta.desc;
          if (node['@type'] === 'CreativeWork') node.image = imageUrl;
        }
      });
      return (
        '<script type="application/ld+json">\n' +
        JSON.stringify(data, null, 2).replace(/</g, '\\u003c') +
        '\n</script>'
      );
    } catch (e) {
      return block;
    }
  });

  if (meta.title && fileName !== 'index.html') {
    html = html.replace(/<title>[^<]*<\/title>/, '<title>' + escAttr(meta.title) + '</title>');
  }

  if (html !== before) {
    fs.writeFileSync(filePath, html);
    console.log('meta:', fileName);
    return true;
  }
  console.log('skip:', fileName);
  return false;
}

Object.keys(META).forEach(function (fileName) {
  patchHtml(fileName, META[fileName]);
});
console.log('patch-og-images: готово');
