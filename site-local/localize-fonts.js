#!/usr/bin/env node
/**
 * Скачивает Montserrat + Open Sans, генерирует fonts-local.css, патчит HTML.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = __dirname;
const FONTS = path.join(ROOT, 'fonts', 'google');
const CSS_OUT = path.join(ROOT, 'fonts-local.css');

const GOOGLE_CSS =
  'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Open+Sans:ital,wght@0,400;0,600;1,400&display=swap';

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function get(url) {
  return new Promise(function (resolve, reject) {
    https
      .get(
        url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        },
        function (res) {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return get(res.headers.location).then(resolve, reject);
          }
          var chunks = [];
          res.on('data', function (c) {
            chunks.push(c);
          });
          res.on('end', function () {
            resolve(Buffer.concat(chunks).toString('utf8'));
          });
        }
      )
      .on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise(function (resolve, reject) {
    ensureDir(path.dirname(dest));
    var file = fs.createWriteStream(dest);
    https
      .get(url, function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(dest);
          return downloadFile(res.headers.location, dest).then(resolve, reject);
        }
        if (res.statusCode !== 200) {
          reject(new Error('HTTP ' + res.statusCode));
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

async function main() {
  console.log('=== Google Fonts CSS ===');
  var css = await get(GOOGLE_CSS);
  var urls = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(function (m) {
    return m[1];
  });
  console.log('woff2 files:', urls.length);

  var localCss = css;
  for (var i = 0; i < urls.length; i++) {
    var url = urls[i];
    var name = 'font-' + String(i + 1).padStart(2, '0') + '.woff2';
    var dest = path.join(FONTS, name);
    await downloadFile(url, dest);
    localCss = localCss.split(url).join('fonts/google/' + name);
    console.log('OK', name);
  }

  fs.writeFileSync(CSS_OUT, localCss);
  console.log('Wrote', path.relative(ROOT, CSS_OUT));

  var oldBlock =
    /<link href="https:\/\/fonts\.googleapis\.com"[^>]*\/>\s*<link crossorigin="anonymous" href="https:\/\/fonts\.gstatic\.com"[^>]*\/>\s*<script src="https:\/\/ajax\.googleapis\.com\/ajax\/libs\/webfont\/1\.6\.26\/webfont\.js"[^>]*><\/script>\s*<script type="text\/javascript">\s*WebFont\.load\(\{[\s\S]*?\}\);\s*<\/script>/g;

  var replacement =
    '<link href="fonts-local.css" rel="stylesheet" type="text/css"/>';

  fs.readdirSync(ROOT)
    .filter(function (f) {
      return f.endsWith('.html');
    })
    .forEach(function (file) {
      var p = path.join(ROOT, file);
      var html = fs.readFileSync(p, 'utf8');
      var next = html.replace(oldBlock, replacement);
      if (next !== html) {
        fs.writeFileSync(p, next);
        console.log('PATCH', file);
      }
    });

  console.log('\nГотово.');
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
