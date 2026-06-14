#!/usr/bin/env node
/**
 * PNG/JPG → WebP + обновление ссылок в HTML и css/pages/.
 * PNG/JPG остаются на диске как бэкап.
 * Запуск: node convert-to-webp.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const IMG = path.join(ROOT, 'images');
const QUALITY_CONTENT = '90';
const QUALITY_CARD = '88';
const QUALITY_SMALL = '92';
const SMALL_BYTES = 80 * 1024;
const report = { converted: [], skipped: [], failed: [], refsPatched: 0 };

function human(n) {
  return Math.round(n / 1024) + ' KB';
}

function walkImages(dir, acc) {
  if (!fs.existsSync(dir)) return acc;
  fs.readdirSync(dir).forEach(function (name) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkImages(full, acc);
    else if (/\.(png|jpe?g)$/i.test(name)) acc.push(full);
  });
  return acc;
}

function qualityFor(file) {
  const rel = path.relative(IMG, file).replace(/\\/g, '/');
  const size = fs.statSync(file).size;
  if (size < SMALL_BYTES) return QUALITY_SMALL;
  if (rel.indexOf('content/') === 0) return QUALITY_CONTENT;
  return QUALITY_CARD;
}

function convertFile(file) {
  const out = file.replace(/\.(png|jpe?g)$/i, '.webp');
  const before = fs.statSync(file).size;
  const q = qualityFor(file);
  const args = ['-q', q, '-m', '6', '-mt', file, '-o', out];

  try {
    execFileSync('cwebp', args, { stdio: 'pipe' });
  } catch (e) {
    report.failed.push({ file: path.relative(ROOT, file), error: String(e.message || e) });
    return;
  }

  if (!fs.existsSync(out)) {
    report.failed.push({ file: path.relative(ROOT, file), error: 'no output' });
    return;
  }

  const after = fs.statSync(out).size;
  report.converted.push({
    file: path.relative(ROOT, file),
    webp: path.relative(ROOT, out),
    quality: q,
    before: before,
    after: after,
    saved: Math.max(0, before - after),
    pct: before > after ? Math.round((1 - after / before) * 100) : 0
  });
  console.log(
    'webp',
    path.relative(ROOT, out),
    'q' + q,
    human(before) + ' → ' + human(after),
    '(' + (before > after ? '-' + Math.round((1 - after / before) * 100) + '%' : 'same') + ')'
  );
}

function patchFileContent(text) {
  let n = 0;
  const next = text.replace(
    /(images\/[^"')]+)\.(png|jpe?g)/gi,
    function (m, base, ext) {
      n++;
      return base + '.webp';
    }
  );
  return { text: next, n: n };
}

function patchRefs() {
  const targets = fs
    .readdirSync(ROOT)
    .filter(function (f) {
      return f.endsWith('.html');
    })
    .map(function (f) {
      return path.join(ROOT, f);
    });

  const cssDir = path.join(ROOT, 'css', 'pages');
  if (fs.existsSync(cssDir)) {
    fs.readdirSync(cssDir).forEach(function (f) {
      if (f.endsWith('.css')) targets.push(path.join(cssDir, f));
    });
  }

  targets.forEach(function (file) {
    const raw = fs.readFileSync(file, 'utf8');
    const r = patchFileContent(raw);
    if (r.n > 0) {
      fs.writeFileSync(file, r.text);
      report.refsPatched += r.n;
      console.log('refs', path.relative(ROOT, file), r.n);
    }
  });
}

function main() {
  const files = walkImages(IMG, []);
  console.log('Конвертация', files.length, 'файлов...\n');

  let beforeTotal = 0;
  let afterTotal = 0;
  files.forEach(function (f) {
    beforeTotal += fs.statSync(f).size;
    convertFile(f);
  });

  report.converted.forEach(function (r) {
    afterTotal += r.after;
  });

  console.log('\nОбновление ссылок в HTML/CSS...');
  patchRefs();

  fs.readdirSync(ROOT)
    .filter(function (f) {
      return f.endsWith('.html');
    })
    .forEach(function (f) {
      const file = path.join(ROOT, f);
      let html = fs.readFileSync(file, 'utf8');
      const before = html;
      html = html.replace(/og-cover\.jpe?g/gi, 'og-cover.webp');
      html = html.replace(
        /images\/shared\/favicon-32\.webp" rel="shortcut icon" type="image\/x-icon"/g,
        'images/shared/favicon-32.webp" rel="shortcut icon" type="image/webp"'
      );
      if (html !== before) fs.writeFileSync(file, html);
    });

  report.summary = {
    files: report.converted.length,
    pngJpgBytes: beforeTotal,
    webpBytes: afterTotal,
    savedBytes: beforeTotal - afterTotal
  };

  fs.writeFileSync(path.join(ROOT, 'webp-report.json'), JSON.stringify(report, null, 2));

  console.log('\n---');
  console.log(
    'WebP:', report.converted.length,
    '| было PNG/JPG:', human(beforeTotal),
    '| стало WebP:', human(afterTotal),
    '| экономия:', human(beforeTotal - afterTotal),
    '| ссылок обновлено:', report.refsPatched
  );
  if (report.failed.length) console.log('Ошибок:', report.failed.length);
}

main();
