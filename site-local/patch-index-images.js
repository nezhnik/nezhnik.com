#!/usr/bin/env node
/**
 * Пути и классы картинок на главной — как на nezhnik.com.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const INDEX = path.join(__dirname, 'index.html');
let html = fs.readFileSync(INDEX, 'utf8');

const byNode = [
  ['w-node-symbols-card', 'images/symbols.png', 'image-13 small'],
  ['w-node-color-card', 'images/color.png', 'image-13 small'],
  ['w-node-basketball-card', 'images/plagin.png', 'image-13 small'],
  ['w-node-omonete-card', 'images/omonete.png', 'image-13 small'],
  ['w-node-_1c1bcd75-f437-10b7-14cd-d73f74c957b8', 'images/Raiffeisen-8.png', 'image-13 small'],
  ['w-node-_1c1bcd75-f437-10b7-14cd-d73f74c957be-5b7a671f', 'images/Raiffeisen-9.png', 'image-13 small'],
  ['w-node-_1c1bcd75-f437-10b7-14cd-d73f74c957c4-5b7a671f', 'images/Raiffeisen-10.png', 'image-13 big'],
  ['w-node-_8dd4b1d2-1e19-599e-04d9-b30415bb1065', 'images/CSClick.png', 'image-13 small'],
  ['w-node-_21cf6dde-1fd5-4aba-edb5-f6139e081b48', 'images/Raiffeisen-13.png', 'image-13 small'],
  ['w-node-_1c1bcd75-f437-10b7-14cd-d73f74c957d6', 'images/Raiffeisen-12.png', 'image-13 big'],
  ['w-node-_9f4e1578-9e6b-0554-4f53-142320a3c038', 'images/Raiffeisen-14.png', 'image-13 small'],
  ['w-node-_23b78794-f031-007c-2171-e2b10495fee3', 'images/Raiffeisen-15.png', 'image-13 small'],
  ['w-node-_1718b283-4a1c-864e-f9e5-37d4d0aaa8e2', 'images/Raiffeisen-17.png', 'image-13 big'],
  ['w-node-_3f89422e-4bcf-3660-5e11-09ddada91629', 'images/Glavpivmag.png', 'image-13 small'],
  ['w-node-d0fca12c-af3a-7c04-365a-76c67b0de602', 'images/Smarthome.png', 'image-13 small']
];

byNode.forEach(function (triple) {
  const nodeId = triple[0];
  const src = triple[1];
  const cls = triple[2];
  const re = new RegExp(
    '(id="' + nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*>[\\s\\S]*?<img alt="" class=")[^"]*(" loading="lazy" src=")[^"]*(")',
    'm'
  );
  if (!re.test(html)) {
    console.warn('WARN node', nodeId);
    return;
  }
  html = html.replace(re, '$1' + cls + '$2' + src + '$3');
});

fs.writeFileSync(INDEX, html);
console.log('index.html обновлён: имена и классы как на проде.');
