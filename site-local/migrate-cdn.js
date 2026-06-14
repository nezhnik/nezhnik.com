#!/usr/bin/env node
/**
 * Скачивает CDN-ассеты Webflow и заменяет URL на локальные пути в site-local/.
 * Запуск: node migrate-cdn.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ROOT = __dirname;
const CDN_DIR = path.join(ROOT, 'assets', 'cdn');
const SCAN_EXT = ['.html', '.css'];
const CDN_HOSTS = [
  'cdn.prod.website-files.com',
  'uploads-ssl.webflow.com'
];

function walkFiles(dir, acc) {
  if (!fs.existsSync(dir)) return acc;
  fs.readdirSync(dir).forEach(function (name) {
    var full = path.join(dir, name);
    var stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name === 'assets' || name === 'fonts' || name === 'scripts') return;
      walkFiles(full, acc);
    } else if (SCAN_EXT.some(function (ext) { return name.endsWith(ext); })) {
      acc.push(full);
    }
  });
  return acc;
}

function extractUrls(content) {
  var re = /https?:\/\/[^\s"'<>\\)]+/g;
  var urls = content.match(re) || [];
  return urls.filter(function (url) {
    try {
      var host = new URL(url).hostname;
      return CDN_HOSTS.indexOf(host) !== -1;
    } catch (e) {
      return false;
    }
  }).map(function (url) {
    return url.replace(/[),;]+$/, '');
  });
}

function localNameFromUrl(url) {
  var u = new URL(url);
  var parts = u.pathname.split('/').filter(Boolean);
  var raw = decodeURIComponent(parts[parts.length - 1] || 'asset.bin');
  raw = raw.replace(/[<>:"|?*]/g, '-').replace(/\s+/g, '-');
  if (!raw) raw = 'asset.bin';
  return raw;
}

function localPathForUrl(url) {
  return 'assets/cdn/' + localNameFromUrl(url);
}

function download(url, dest) {
  return new Promise(function (resolve, reject) {
    var getter = url.startsWith('https') ? https : http;
    var file = fs.createWriteStream(dest);
    getter.get(url, { headers: { 'User-Agent': 'site-local-migrate/1.0' } }, function (res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        return resolve(download(res.headers.location, dest));
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
      }
      res.pipe(file);
      file.on('finish', function () {
        file.close(resolve);
      });
    }).on('error', function (err) {
      file.close();
      try { fs.unlinkSync(dest); } catch (e) {}
      reject(err);
    });
  });
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  if (!fs.existsSync(CDN_DIR)) fs.mkdirSync(CDN_DIR, { recursive: true });

  var files = walkFiles(ROOT, []);
  var urlSet = new Set();
  files.forEach(function (file) {
    extractUrls(fs.readFileSync(file, 'utf8')).forEach(function (u) { urlSet.add(u); });
  });

  var urls = Array.from(urlSet).sort();
  console.log('Найдено уникальных CDN URL:', urls.length);

  var map = {};
  var ok = 0;
  var fail = 0;

  for (var i = 0; i < urls.length; i++) {
    var url = urls[i];
    var localRel = localPathForUrl(url);
    var localAbs = path.join(ROOT, localRel);
    map[url] = localRel;

    if (fs.existsSync(localAbs) && fs.statSync(localAbs).size > 0) {
      ok += 1;
      continue;
    }

    process.stdout.write('[' + (i + 1) + '/' + urls.length + '] ' + localNameFromUrl(url) + '... ');
    try {
      await download(url, localAbs);
      console.log('ok');
      ok += 1;
    } catch (e) {
      console.log('FAIL', e.message);
      fail += 1;
    }
  }

  var replaced = 0;
  files.forEach(function (file) {
    var src = fs.readFileSync(file, 'utf8');
    var next = src;
    urls.forEach(function (url) {
      var localRel = map[url];
      if (!localRel) return;
      next = next.split(url).join(localRel);
      next = next.split(url.replace(/&/g, '&amp;')).join(localRel);
    });
    if (next !== src) {
      fs.writeFileSync(file, next);
      replaced += 1;
    }
  });

  fs.writeFileSync(path.join(ROOT, 'cdn-map.json'), JSON.stringify(map, null, 2));
  console.log('\nСкачано/есть:', ok, '| Ошибок:', fail, '| Файлов обновлено:', replaced);
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
