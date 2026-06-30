/**
 * Собирает метаданные слоёв карточек из Figma JSON + скачивает bg и device PNG.
 * Запуск: node scripts/build-card-layers.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'images/home-v2/layers');
const DEVICES_DIR = join(ROOT, 'images/home-v2/devices');

/** slug карточки → имя файлов устройств (как в Figma / README) */
const PROJECT_SLUGS = {
  'work-01': 'raif-rafa-brand',
  'work-02': 'raif-rafa-app',
  'work-03': 'raif-search',
  'work-04': 'raif-servicedesk',
  'work-05': 'sberpravo-redesign',
  'work-06': 'sberpravo-catalog',
  'work-07': 'csclick',
  'work-08': 'csradar',
  'work-09': 'crafter',
  'work-10': 'zesklad',
  'work-11': 'smarthome',
  'work-12': 'sibpromstroy',
  'work-13': 'designconference',
  'work-14': 'glavpivmag',
  'personal-01': 'omonete',
  'personal-02': 'color-game',
  'personal-03': 'basketball',
  'personal-04': 'symbols'
};
const TOKEN = process.env.FIGMA_TOKEN;
if (!TOKEN) {
  console.error('Задайте FIGMA_TOKEN: export FIGMA_TOKEN=figd_…');
  process.exit(1);
}
const FILE_KEY = 'khKpO5YkV2bwF3MJUJ4X1b';
const CARD_W = 1984;
const CARD_H = 940;

const figmaImages = JSON.parse(readFileSync('/tmp/figma-images.json', 'utf8'));
const figmaWork = JSON.parse(readFileSync('/tmp/figma-node.json', 'utf8'));
const figmaPersonal = existsSync('/tmp/figma-personal.json')
  ? JSON.parse(readFileSync('/tmp/figma-personal.json', 'utf8'))
  : null;

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(DEVICES_DIR, { recursive: true });

const pct = (n, base) => +(n / base * 100).toFixed(4);
const rgb = (c) =>
  c ? '#' + [c.r, c.g, c.b].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('') : null;

function fillToBg(f, slug, index) {
  if (f.type === 'SOLID') return { type: 'solid', color: rgb(f.color) };
  if (f.type === 'IMAGE' && f.imageRef) {
    const t = f.imageTransform || [
      [1, 0, 0],
      [0, 1, 0]
    ];
    const sx = t[0][0];
    const tx = t[0][2];
    const sy = t[1][1];
    const ty = t[1][2];
    const suffix = index > 0 ? String(index) : '';
    const local = `images/home-v2/layers/${slug}-bg${suffix}.png`;
    return {
      type: 'image',
      ref: f.imageRef,
      src: figmaImages.meta.images[f.imageRef] || null,
      local,
      size: `${(100 / sx).toFixed(4)}% ${(100 / sy).toFixed(4)}%`,
      position: `${(tx * 100).toFixed(4)}% ${(ty * 100).toFixed(4)}%`
    };
  }
  return null;
}

function deviceBox(n, cb) {
  const b = n.absoluteBoundingBox;
  return {
    nodeId: n.id,
    left: pct(b.x - cb.x, CARD_W),
    top: pct(b.y - cb.y, CARD_H),
    width: pct(b.width, CARD_W),
    height: pct(b.height, CARD_H)
  };
}

function extractCards(rootNode) {
  const out = [];
  function find(n) {
    if (n.name === 'CS-Клик' && n.absoluteBoundingBox?.height === 940) out.push(n);
    (n.children || []).forEach(find);
  }
  find(rootNode);
  return out;
}

function parseCard(card, cardSlug) {
  const projectSlug = PROJECT_SLUGS[cardSlug] || cardSlug;
  const cb = card.absoluteBoundingBox;
  let mac = null;
  const phones = [];
  let titleNode = null;
  let descNode = null;

  (function walk(n) {
    if (/^MacBook Pro/i.test(n.name) && !mac) mac = deviceBox(n, cb);
    if (/^iPhone/i.test(n.name) && n.type === 'FRAME') phones.push(deviceBox(n, cb));
    if (n.characters && n.style?.fontSize === 44) titleNode = n;
    if (n.characters && n.style?.fontSize === 26) descNode = n;
    (n.children || []).forEach(walk);
  })(card);

  const textFrame = card.children?.find((c) => c.name === 'Frame 1851040678');
  const tb = textFrame?.absoluteBoundingBox || titleNode?.absoluteBoundingBox;
  const db = descNode?.absoluteBoundingBox;
  const textBox = tb
    ? {
        left: pct(tb.x - cb.x, CARD_W),
        top: pct(tb.y - cb.y, CARD_H),
        width: pct(textFrame ? tb.width : titleNode.absoluteBoundingBox.width, CARD_W),
        height: textFrame
          ? pct(tb.height, CARD_H)
          : pct((db ? db.y + db.height : tb.y + tb.height) - tb.y, CARD_H)
      }
    : { left: 19.1532, top: 5.9574, width: 61.6935, height: 14.1489 };

  const bgs = (card.fills || [])
    .map((f, i) => fillToBg(f, cardSlug, i))
    .filter(Boolean);

  return {
    slug: cardSlug,
    projectSlug,
    bg: bgs.length === 1 ? bgs[0] : bgs,
    text: textBox,
    mac: mac
      ? {
          nodeId: mac.nodeId,
          src: `images/home-v2/devices/${projectSlug}_desktop.png`,
          left: mac.left,
          top: mac.top,
          width: mac.width,
          height: mac.height
        }
      : null,
    phones: phones.map((p, i) => ({
      nodeId: p.nodeId,
      src:
        phones.length === 1
          ? `images/home-v2/devices/${projectSlug}_mobile.png`
          : `images/home-v2/devices/${projectSlug}_mobile-${i + 1}.png`,
      left: p.left,
      top: p.top,
      width: p.width,
      height: p.height
    }))
  };
}

const workRoot = figmaWork.nodes['826:12468'].document.children.find((c) => c.name === 'Работы');
const workLayers = extractCards(workRoot).map((card, i) =>
  parseCard(card, `work-${String(i + 1).padStart(2, '0')}`)
);

const personalLayers = figmaPersonal
  ? extractCards(figmaPersonal.nodes['944:23154'].document).map((card, i) =>
      parseCard(card, `personal-${String(i + 1).padStart(2, '0')}`)
    )
  : [];

async function download(url, dest) {
  if (!url) return false;
  const res = await fetch(url);
  if (!res.ok) return false;
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return true;
}

async function exportFigmaNodes(ids) {
  const res = await fetch(
    `https://api.figma.com/v1/images/${FILE_KEY}?ids=${encodeURIComponent(ids.join(','))}&format=png&scale=1`,
    { headers: { 'X-Figma-Token': TOKEN } }
  );
  const json = await res.json();
  if (json.err) console.warn('Figma export:', json.err);
  return json.images || {};
}

const allLayers = [...workLayers, ...personalLayers];

for (const layer of allLayers) {
  const bgs = Array.isArray(layer.bg) ? layer.bg : [layer.bg];
  for (let i = 0; i < bgs.length; i++) {
    const bg = bgs[i];
    if (bg?.type === 'image' && bg.src) {
      const dest = join(ROOT, bg.local);
      const ok = await download(bg.src, dest);
      console.log(ok ? 'bg' : 'bg FAIL', bg.local);
      if (ok) bg.src = bg.local;
      delete bg.ref;
    }
  }
  if (layer.mac?.nodeId) {
    // exported in batch below
  }
}

const deviceIds = [];
const deviceMap = [];
for (const layer of allLayers) {
  if (layer.mac?.nodeId) {
    deviceIds.push(layer.mac.nodeId);
    deviceMap.push({ id: layer.mac.nodeId, local: join(ROOT, layer.mac.src), key: 'mac' });
  }
  layer.phones.forEach((p, i) => {
    deviceIds.push(p.nodeId);
    deviceMap.push({ id: p.nodeId, local: join(ROOT, p.src), key: `phone${i}` });
  });
}

for (let i = 0; i < deviceIds.length; i += 3) {
  const batch = deviceIds.slice(i, i + 3);
  if (!batch.length) continue;
  const images = await exportFigmaNodes(batch);
  for (const id of batch) {
    const url = images[id];
    const item = deviceMap.find((d) => d.id === id);
    if (url && item) {
      const ok = await download(url, item.local);
      console.log(ok ? 'device' : 'device FAIL', item.local.replace(ROOT + '/', ''));
    }
  }
  if (i + 3 < deviceIds.length) await new Promise((r) => setTimeout(r, 5000));
}

const output = { work: workLayers, personal: personalLayers };
writeFileSync(join(ROOT, 'scripts/cards-layers.json'), JSON.stringify(output, null, 2));
writeFileSync(
  join(ROOT, 'scripts/cards-layers.js'),
  'window.SITE_CARD_LAYERS=' + JSON.stringify(output) + ';\n'
);
console.log('Wrote scripts/cards-layers.json + .js');
