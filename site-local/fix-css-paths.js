#!/usr/bin/env node
/**
 * CSS в css/pages/ — пути images/ и fonts/ относительно корня сайта.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const CSS_DIR = path.join(__dirname, 'css', 'pages');

function fix(css) {
  return css
    .replace(/url\("images\//g, 'url("../../images/')
    .replace(/url\('images\//g, "url('../../images/")
    .replace(/url\("fonts\//g, 'url("../../fonts/')
    .replace(/url\('fonts\//g, "url('../../fonts/");
}

fs.readdirSync(CSS_DIR)
  .filter(function (f) {
    return f.endsWith('.css');
  })
  .forEach(function (file) {
    var p = path.join(CSS_DIR, file);
    var css = fs.readFileSync(p, 'utf8');
    var next = fix(css);
    if (next !== css) {
      fs.writeFileSync(p, next);
      console.log('FIX', file);
    }
  });

console.log('Готово.');
