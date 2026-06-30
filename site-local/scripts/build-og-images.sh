#!/usr/bin/env bash
# OG 1200×630: главная — кадр из hero-видео; проекты — карточки с home-v2.
# Запуск из site-local/: bash scripts/build-og-images.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OG_DIR="$ROOT/images/shared/og"
HERO_VIDEO="$ROOT/images/home-v2/misha-nezhnik.mp4"
HERO_SS="${HERO_SS:-2.5}"
CARDS="$ROOT/images/home-v2"

mkdir -p "$OG_DIR"

crop_card() {
  local src="$1" dest="$2"
  ffmpeg -y -loglevel error -i "$src" \
    -vf "scale=-1:630,crop=1200:630" \
    -frames:v 1 "$dest.jpg"
  cwebp -q 90 "$dest.jpg" -o "$dest.webp" -quiet
  rm -f "$dest.jpg"
  echo "  ✓ $(basename "$dest.webp")"
}

echo "→ og-home.webp (hero @ ${HERO_SS}s)"
ffmpeg -y -loglevel error -ss "$HERO_SS" -i "$HERO_VIDEO" \
  -vf "scale=1200:630:force_original_aspect_ratio=increase,crop=1200:630" \
  -frames:v 1 "$ROOT/images/shared/og-home.jpg"
cwebp -q 90 "$ROOT/images/shared/og-home.jpg" -o "$ROOT/images/shared/og-home.webp" -quiet
rm -f "$ROOT/images/shared/og-home.jpg"

echo "→ og/*.webp (карточки проектов)"
while IFS='|' read -r slug card; do
  crop_card "$CARDS/$card" "$OG_DIR/$slug"
done << 'EOF'
raf-identic|work-01.png
raf|work-02.png
onesearch|work-03.png
servicedesk|work-04.png
legalbpm|work-05.png
sberpravo|work-06.png
csclick|work-07.png
csradar|work-08.png
crafter|work-09.png
zesklad|work-10.png
smarthome|work-11.png
sibpromstroy|work-12.png
designconference|work-13.png
glavpivmag|work-14.png
EOF

echo "Готово: images/shared/og-home.webp + 14 в images/shared/og/"
