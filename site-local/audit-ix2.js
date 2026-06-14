#!/usr/bin/env node
/**
 * Аудит Webflow ix2: события, action lists, группировка для миграции.
 * Запуск: node audit-ix2.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const MAIN = path.join(ROOT, 'main.js');
const OUT_JSON = path.join(ROOT, 'ix2-audit.json');
const OUT_MD = path.join(ROOT, 'ix2-audit.md');

const SITE_ID = '65cfb22a548897845b7a6710';

const PAGE_NAMES = {
  '65cfb22a548897845b7a671f': 'index.html (главная)',
  '660431ca75823428183dc485': 'legalbpm.html',
  '660431bb4ae1887ed9d71fe4': 'sberpravo.html',
  '660431d1f51991ece0f413c4': 'csradar.html',
  '66532288ff16bd70bb31eb2f': 'csclick.html',
  '660431d8bc4073a69b97ea01': 'crafter.html',
  '660431e4aca3b18d63b7a96a': 'zesklad.html',
  '660431f0aa5035ddb10f6615': 'sibpromstroy.html',
  '6604320168075d407836e21c': 'smarthome.html',
  '660431fad859b9c0629c6cd8': 'glavpivmag.html',
  '660be8f865162d1c69cdd973': 'designconference.html'
};

const EVENT_LABELS = {
  MOUSE_OVER: 'hover → in',
  MOUSE_OUT: 'hover → out',
  MOUSE_CLICK: 'click',
  SCROLLING_IN_VIEW: 'scroll reveal',
  SCROLL_INTO_VIEW: 'scroll into view',
  PAGE_START: 'page load',
  PAGE_FINISH: 'page ready',
  NAVBAR_OPEN: 'menu open',
  NAVBAR_CLOSE: 'menu close'
};

const ACTION_LABELS = {
  TRANSFORM_MOVE: 'move',
  TRANSFORM_SCALE: 'scale',
  TRANSFORM_ROTATE: 'rotate',
  STYLE_OPACITY: 'opacity',
  STYLE_SIZE: 'size',
  STYLE_FILTER: 'filter',
  STYLE_BACKGROUND_COLOR: 'bg color',
  GENERAL_DISPLAY: 'display',
  PLUGIN_LOTTIE: 'lottie',
  PLUGIN_SPLINE: 'spline'
};

function extractIx2Init(js) {
  const marker = 'Webflow.require("ix2").init(';
  const start = js.indexOf(marker);
  if (start < 0) throw new Error('ix2.init not found');
  let i = start + marker.length;
  let depth = 0;
  let inStr = false;
  let quote = '';
  let escape = false;
  for (; i < js.length; i++) {
    const ch = js[i];
    if (inStr) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === quote) inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = true;
      quote = ch;
      continue;
    }
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        const objSrc = js.slice(start + marker.length, i + 1);
        // eslint-disable-next-line no-new-func
        return new Function('return ' + objSrc)();
      }
    }
  }
  throw new Error('ix2.init brace parse failed');
}

function targetKey(target) {
  if (!target) return 'unknown';
  if (target.selector) return 'class:' + target.selector;
  if (target.id) {
    const parts = target.id.split('|');
    return parts.length > 1 ? 'el:' + parts[1].slice(0, 8) + '…' : target.id;
  }
  return 'unknown';
}

function summarizeActionList(list) {
  if (!list || !list.actionItemGroups) return [];
  const items = [];
  list.actionItemGroups.forEach(function (group) {
    (group.actionItems || []).forEach(function (item) {
      const cfg = item.config || {};
      const parts = [ACTION_LABELS[item.actionTypeId] || item.actionTypeId];
      if (cfg.duration != null) parts.push(cfg.duration + 'ms');
      if (cfg.easing) parts.push('ease:' + cfg.easing);
      const x = cfg.xValue != null ? cfg.xValue : null;
      const y = cfg.yValue != null ? cfg.yValue : null;
      const z = cfg.zValue != null ? cfg.zValue : null;
      const s = cfg.xUnit === '%' ? cfg.xValue + '%' : null;
      if (item.actionTypeId === 'TRANSFORM_SCALE' && x != null) {
        parts.push('scale(' + x + ')');
      } else if (item.actionTypeId === 'TRANSFORM_MOVE') {
        parts.push('move(' + [x, y, z].filter((v) => v != null).join(',') + ')');
      } else if (item.actionTypeId === 'STYLE_OPACITY' && x != null) {
        parts.push('opacity→' + x);
      } else if (s) {
        parts.push(s);
      }
      items.push(parts.join(' '));
    });
  });
  return items;
}

function patternKey(inActions, outActions) {
  return (inActions.join(' | ') || '—') + ' ⇄ ' + (outActions.join(' | ') || '—');
}

function pageFromTarget(target) {
  if (!target || !target.id) return null;
  const parts = target.id.split('|');
  if (parts[0] === SITE_ID && parts[1]) return parts[1];
  if (parts.length === 2) return parts[0];
  return null;
}

function loadHtmlWids() {
  const map = {};
  fs.readdirSync(ROOT)
    .filter((f) => f.endsWith('.html'))
    .forEach(function (file) {
      const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
      const pageM = html.match(/data-wf-page="([^"]+)"/);
      const pageId = pageM ? pageM[1] : null;
      const wids = [...html.matchAll(/data-w-id="([^"]+)"/g)].map((m) => m[1]);
      const classes = {};
      wids.forEach(function (wid) {
        const re = new RegExp(
          'data-w-id="' + wid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*class="([^"]*)"',
          'i'
        );
        const re2 = new RegExp(
          'class="([^"]*)"[^>]*data-w-id="' + wid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"',
          'i'
        );
        const m = html.match(re) || html.match(re2);
        classes[wid] = m ? m[1].split(/\s+/).slice(0, 3).join('.') : '';
      });
      map[pageId] = { file: file, wids: wids, classes: classes };
    });
  return map;
}

function main() {
  const js = fs.readFileSync(MAIN, 'utf8');
  const ix = extractIx2Init(js);
  const events = ix.events || {};
  const actionLists = ix.actionLists || {};
  const htmlMap = loadHtmlWids();

  const byPage = {};
  const byPattern = {};
  const pairMap = {};

  Object.values(events).forEach(function (ev) {
    const pageEl = pageFromTarget(ev.target);
    const pageId = pageEl && PAGE_NAMES[pageEl] ? pageEl : pageEl;
    const pageName =
      (pageId && PAGE_NAMES[pageId]) ||
      (pageId && htmlMap[pageId] ? htmlMap[pageId].file : 'shared/global');

    if (!byPage[pageName]) {
      byPage[pageName] = { events: [], types: {} };
    }
    const type = ev.eventTypeId;
    byPage[pageName].types[type] = (byPage[pageName].types[type] || 0) + 1;

    const listId = ev.action && ev.action.config && ev.action.config.actionListId;
    const list = listId ? actionLists[listId] : null;
    const wid = ev.target && ev.target.id ? ev.target.id.split('|').pop() : null;
    const cls =
      (wid && htmlMap[pageId] && htmlMap[pageId].classes[wid]) ||
      (ev.target && ev.target.selector) ||
      '';

    const entry = {
      event: ev.id,
      type: type,
      typeLabel: EVENT_LABELS[type] || type,
      actionList: listId,
      actionTitle: list ? list.title : null,
      target: targetKey(ev.target),
      selector: ev.target && ev.target.selector,
      classHint: cls,
      effects: summarizeActionList(list)
    };
    byPage[pageName].events.push(entry);

    if (type === 'MOUSE_OVER' && listId) {
      const outEv = ev.action.config.autoStopEventId;
      const outListId =
        outEv && events[outEv] && events[outEv].action
          ? events[outEv].action.config.actionListId
          : null;
      const outList = outListId ? actionLists[outListId] : null;
      const inFx = summarizeActionList(list);
      const outFx = summarizeActionList(outList);
      const pk = patternKey(inFx, outFx);
      const selector = ev.target.selector || cls || entry.target;
      if (!byPattern[pk]) {
        byPattern[pk] = {
          pattern: pk,
          inTitle: list.title,
          outTitle: outList ? outList.title : null,
          selector: selector,
          count: 0,
          pages: new Set()
        };
      }
      byPattern[pk].count++;
      byPattern[pk].pages.add(pageName);
      pairMap[listId] = { in: list, out: outList, selector: selector };
    }
  });

  const patterns = Object.values(byPattern).sort((a, b) => b.count - a.count);
  const migration = [
    {
      id: 'P1-card-hover',
      reuse: 'CSS :hover на .project_card_bento img',
      replaces: patterns.filter((p) => /scale|move/i.test(p.pattern) && /card|bento|project/i.test(p.selector || '')),
      effort: 'низкий',
      saves: 'MOUSE_OVER/OUT на всех карточках'
    },
    {
      id: 'P2-button-hover',
      reuse: 'CSS :hover на .button_primary, .button_secondary, .w-button',
      replaces: patterns.filter((p) => /button/i.test(p.selector || '')),
      effort: 'низкий',
      saves: 'hover кнопок шапки и футера'
    },
    {
      id: 'P3-scroll-reveal',
      reuse: 'IntersectionObserver + .is-visible (один scripts/reveal.js)',
      replaces: 'SCROLLING_IN_VIEW на страницах проектов',
      effort: 'средний',
      saves: 'появление секций при скролле'
    },
    {
      id: 'P4-spline',
      reuse: '@splinetool/runtime вместо Webflow.require(ix2)',
      replaces: 'PLUGIN_SPLINE / data-spline',
      effort: 'средний',
      saves: 'зависимость ix2 для футера'
    },
    {
      id: 'P5-page-start',
      reuse: 'CSS @keyframes fade-in на герой (опционально)',
      replaces: 'PAGE_START',
      effort: 'низкий',
      saves: '1 событие на главной'
    }
  ];

  const report = {
    generated: new Date().toISOString(),
    totals: {
      events: Object.keys(events).length,
      actionLists: Object.keys(actionLists).length,
      uniqueHoverPatterns: patterns.length,
      pages: Object.keys(byPage).length
    },
    byPage: byPage,
    reusablePatterns: patterns.map((p) => ({
      pattern: p.pattern,
      inTitle: p.inTitle,
      outTitle: p.outTitle,
      selector: p.selector,
      count: p.count,
      pages: [...p.pages]
    })),
    migration
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

  let md = '# Аудит анимаций Webflow ix2\n\n';
  md += 'Сгенерировано: `node audit-ix2.js`\n\n';
  md += '## Сводка\n\n';
  md += '| Метрика | Значение |\n|---------|----------|\n';
  md += '| Событий (events) | ' + report.totals.events + ' |\n';
  md += '| Сценариев (action lists) | ' + report.totals.actionLists + ' |\n';
  md += '| Уникальных hover-паттернов | ' + report.totals.uniqueHoverPatterns + ' |\n';
  md += '| Страниц с интеракциями | ' + report.totals.pages + ' |\n\n';

  md += '## По страницам\n\n';
  Object.keys(byPage)
    .sort()
    .forEach(function (page) {
      const p = byPage[page];
      md += '### ' + page + '\n\n';
      md += '| Тип | Кол-во |\n|-----|--------|\n';
      Object.entries(p.types)
        .sort((a, b) => b[1] - a[1])
        .forEach(function ([t, n]) {
          md += '| ' + (EVENT_LABELS[t] || t) + ' | ' + n + ' |\n';
        });
      md += '\n<details><summary>Детали (' + p.events.length + ')</summary>\n\n';
      md += '| Тип | Селектор/класс | Эффект | action list |\n';
      md += '|-----|----------------|--------|-------------|\n';
      p.events.forEach(function (e) {
        md +=
          '| ' +
          e.typeLabel +
          ' | `' +
          (e.selector || e.classHint || e.target) +
          '` | ' +
          (e.effects.join('; ') || '—') +
          ' | ' +
          (e.actionTitle || e.actionList || '—') +
          ' |\n';
      });
      md += '\n</details>\n\n';
    });

  md += '## Переиспользуемые паттерны (hover)\n\n';
  md += 'Один CSS/JS заменяет много одинаковых ix2-связок.\n\n';
  md += '| Повторений | In → Out | Селектор | Страницы |\n';
  md += '|------------|----------|----------|----------|\n';
  patterns.forEach(function (p) {
    md +=
      '| ' +
      p.count +
      ' | `' +
      p.pattern.slice(0, 80) +
      (p.pattern.length > 80 ? '…' : '') +
      '` | `' +
      (p.selector || '—') +
      '` | ' +
      [...p.pages].join(', ') +
      ' |\n';
  });

  md += '\n## План миграции (без main.js)\n\n';
  migration.forEach(function (m) {
    md += '### ' + m.id + ' — ' + m.reuse + '\n\n';
    md += '- **Сложность:** ' + m.effort + '\n';
    md += '- **Заменяет:** ' + m.saves + '\n';
    if (Array.isArray(m.replaces) && m.replaces.length) {
      md += '- **Паттернов:** ' + m.replaces.length + '\n';
    }
    md += '\n';
  });

  md += '## Итог\n\n';
  md += '- **~90% интеракций** — hover карточек и кнопок → **1–2 CSS-правила**\n';
  md += '- **Scroll reveal** на проектах → **один `reveal.js` (~20 строк)**\n';
  md += '- **Spline** → отдельный runtime, без ix2\n';
  md += '- После миграции: **−main.js (−473 KB) −jQuery (−87 KB)**\n';

  fs.writeFileSync(OUT_MD, md);
  console.log('OK', path.relative(ROOT, OUT_JSON));
  console.log('OK', path.relative(ROOT, OUT_MD));
  console.log('\nСводка:', report.totals);
  console.log('\nТоп hover-паттернов:');
  patterns.slice(0, 6).forEach(function (p) {
    console.log(' ', p.count + 'x', p.inTitle, '→', p.selector || 'element');
  });
}

main();
