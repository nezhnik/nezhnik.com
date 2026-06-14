#!/usr/bin/env node
/**
 * Упрощает <img> на главной: один src, без srcset.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const INDEX = path.join(__dirname, 'index.html');
var html = fs.readFileSync(INDEX, 'utf8');

var cardMap = {
  'images/symbols.png': 'images/cards/symbols.png',
  'images/color.png': 'images/cards/color.png',
  'images/plagin.png': 'images/cards/plagin.png',
  'images/omonete.png': 'images/cards/omonete.png',
  'images/CSClick.png': 'images/cards/csclick.png',
  'images/Glavpivmag.png': 'images/cards/glavpivmag.png',
  'images/Smarthome.png': 'images/cards/smarthome.png'
};

Object.keys(cardMap).forEach(function (oldSrc) {
  var re = new RegExp(
    '<img([^>]*?)src="' + oldSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*>',
    'g'
  );
  html = html.replace(re, '<img$1src="' + cardMap[oldSrc] + '" loading="lazy" alt="">');
});

var raiffeisen = [
  ['676a64d0c5a96b9de224e085_Raiffeisen-8', 'raiffeisen-8'],
  ['676a64d0d1ebce5fb0ee5879_Raiffeisen-9', 'raiffeisen-9'],
  ['676a64d01aa6955efd18cfdd_Raiffeisen-10', 'raiffeisen-10'],
  ['676a64d0ca881a01704a0dab_Raiffeisen-13', 'raiffeisen-13'],
  ['676a64d0ed6cbad1a0ca0deb_Raiffeisen-12', 'raiffeisen-12'],
  ['676aba0db2605216c17c8055_Raiffeisen-14', 'raiffeisen-14'],
  ['676abbc63871bbda8c91c33e_Raiffeisen-15', 'raiffeisen-15'],
  ['676a64d2648dd93b68626321_Raiffeisen-17', 'raiffeisen-17']
];

raiffeisen.forEach(function (pair) {
  var id = pair[0];
  var name = pair[1];
  var re = new RegExp('<img[^>]*assets/cdn/' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^>]*>', 'g');
  html = html.replace(re, '<img alt="" class="image-13" loading="lazy" src="images/cards/' + name + '.png">');
});

html = html.replace(
  /<img alt="" class="image-15"[^>]*src="avatar\.png"[^>]*>/,
  '<img alt="" class="image-15" loading="lazy" src="images/avatar.png" width="400" height="400">'
);

html = html.replace(
  /href="assets\/cdn\/65e31511386e84fece3f263a_Favicon-32x32\.png"/g,
  'href="images/shared/favicon-32.png"'
);
html = html.replace(
  /href="assets\/cdn\/65e31514c7732269df37d43b_Favicon-256x256\.png"/g,
  'href="images/shared/favicon-256.png"'
);

fs.writeFileSync(INDEX, html);
console.log('index.html упрощён: один src на картинку, без srcset.');
