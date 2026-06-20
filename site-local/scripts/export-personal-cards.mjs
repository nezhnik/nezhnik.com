import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const TOKEN = process.env.FIGMA_TOKEN;
if (!TOKEN) {
  console.error('Задайте FIGMA_TOKEN: export FIGMA_TOKEN=figd_…');
  process.exit(1);
}
const FILE = 'khKpO5YkV2bwF3MJUJ4X1b';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../images/home-v2');

const cards = [
  ['I944:23154;906:22998', 'personal-01.png'],
  ['I944:23154;906:23042', 'personal-02.png'],
  ['I944:23154;906:23064', 'personal-03.png'],
  ['I944:23154;906:23020', 'personal-04.png']
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [id, file] of cards) {
  let url = '';
  for (let attempt = 1; attempt <= 8; attempt++) {
    const res = await fetch(
      `https://api.figma.com/v1/images/${FILE}?ids=${encodeURIComponent(id)}&format=png&scale=1`,
      { headers: { 'X-Figma-Token': TOKEN } }
    );
    const json = await res.json();
    url = json.images?.[id] || '';
    if (url) break;
    console.log(`${file}: retry ${attempt}`, json.err || json.status);
    await sleep(45000);
  }
  if (!url) {
    console.error(`Failed: ${file}`);
    continue;
  }
  const img = await fetch(url);
  writeFileSync(join(OUT, file), Buffer.from(await img.arrayBuffer()));
  console.log(`Saved ${file}`);
  await sleep(15000);
}
