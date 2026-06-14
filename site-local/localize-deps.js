#!/usr/bin/env node
/**
 * jQuery локально + замена og:image VK на локальный файл.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = __dirname;
const SCRIPTS = path.join(ROOT, 'scripts');
const JQUERY_URL =
  'https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js';
const JQUERY_LOCAL = 'scripts/jquery-3.5.1.min.js';
const OG_LOCAL = 'images/shared/og-cover.jpg';
const VK_OG =
  'https://sun9-59.userapi.com/impg/bBBUthzZ3nhtAQ9KBwfbHbQPkBW2O0KES1DRyA/gx2iUyPNZRU.jpg?size=1200x631&quality=95&sign=f32cb81dc03e56854726dab22a628ca4&type=album';

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function download(url, dest) {
  return new Promise(function (resolve, reject) {
    ensureDir(path.dirname(dest));
    var file = fs.createWriteStream(dest);
    https
      .get(url, function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(dest);
          return download(res.headers.location, dest).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
          return;
        }
        res.pipe(file);
        file.on('finish', function () {
          file.close(resolve);
        });
      })
      .on('error', reject);
  });
}

function patchHtmlFiles() {
  var cloudfront =
    'https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js?site=65cfb22a548897845b7a6710';
  var files = fs.readdirSync(ROOT).filter(function (f) {
    return f.endsWith('.html');
  });
  files.forEach(function (file) {
    var p = path.join(ROOT, file);
    var html = fs.readFileSync(p, 'utf8');
    var next = html.split(cloudfront).join(JQUERY_LOCAL);
    next = next.split(VK_OG).join(OG_LOCAL);
    next = next.split(VK_OG.replace(/&/g, '&amp;')).join(OG_LOCAL);
    if (next !== html) {
      fs.writeFileSync(p, next);
      console.log('PATCH', file);
    }
  });
}

async function main() {
  console.log('=== jQuery ===');
  await download(JQUERY_URL, path.join(ROOT, JQUERY_LOCAL));
  console.log('OK', JQUERY_LOCAL);

  console.log('\n=== og:image ===');
  var ogSrc = path.join(ROOT, 'images', 'shared', 'og-cover.jpg');
  if (!fs.existsSync(ogSrc)) {
    var fromCdn = path.join(ROOT, 'assets', 'cdn');
    var candidates = fs.readdirSync(fromCdn).filter(function (f) {
      return /photo_2024|Slice-2|Frame-1851040498/i.test(f) && /\.(jpg|png)$/i.test(f);
    });
    if (candidates.length) {
      fs.copyFileSync(path.join(fromCdn, candidates[0]), ogSrc);
      console.log('COPY og from', candidates[0]);
    } else {
      try {
        await download(VK_OG, ogSrc);
        console.log('DOWNLOAD og-cover.jpg');
      } catch (e) {
        console.warn('og:image skip:', e.message);
      }
    }
  } else {
    console.log('SKIP og-cover exists');
  }

  console.log('\n=== HTML patches ===');
  patchHtmlFiles();
  console.log('\nГотово.');
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
