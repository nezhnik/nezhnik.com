#!/usr/bin/env bash
# Рамка MacBook (зелёный #008000) + MOV → PNG с прозрачным экраном, WebP, MP4.
# Опционально: мобильная рамка → {slug}_card-mobile.png
# Использование:
#   bash scripts/prepare-card-screen-video.sh <frame-web.png> <video.MOV> <device-slug> [frame-mobile.png]
# Пример:
#   bash scripts/prepare-card-screen-video.sh \
#     "../Cards/Screens/Macbook_web view.png" \
#     "../Cards/Screens/Raf_identic.MOV" \
#     raif-rafa-brand \
#     "../Cards/Screens/Macbook_mobile view.png"

set -euo pipefail

FRAME="${1:?frame web png}"
VIDEO="${2:?video mov}"
SLUG="${3:?device slug, e.g. raif-rafa-brand}"
FRAME_MOBILE="${4:-}"
CRF="${CRF:-18}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEVICES="$ROOT/images/home-v2/devices"
WEBP_SRC="$(cd "$ROOT/../Cards/Screens/Webp" && pwd)"
FFMPEG="${FFMPEG:-/opt/homebrew/bin/ffmpeg}"

mkdir -p "$DEVICES" "$WEBP_SRC"

knockout_green() {
  local src="$1" out="$2"
  python3 << PY
from PIL import Image
from pathlib import Path

src = Path("$src")
out = Path("$out")
im = Image.open(src).convert("RGBA")
px = im.load()
for y in range(im.height):
    for x in range(im.width):
        r, g, b, a = px[x, y]
        if r == 0 and g == 128 and b == 0:
            px[x, y] = (0, 0, 0, 0)
out.parent.mkdir(parents=True, exist_ok=True)
im.save(out)
print("png", out)
PY
}

knockout_green "$FRAME" "$DEVICES/${SLUG}_desktop.png"

cwebp -q 93 "$DEVICES/${SLUG}_desktop.png" -o "$DEVICES/${SLUG}_desktop.webp" -quiet
cp "$DEVICES/${SLUG}_desktop.webp" "$WEBP_SRC/$(basename "$FRAME" .png).webp"

if [[ -n "$FRAME_MOBILE" ]]; then
  knockout_green "$FRAME_MOBILE" "$DEVICES/${SLUG}_card-mobile.png"
  cwebp -q 93 "$DEVICES/${SLUG}_card-mobile.png" -o "$DEVICES/${SLUG}_card-mobile.webp" -quiet
  cp "$DEVICES/${SLUG}_card-mobile.webp" "$WEBP_SRC/$(basename "$FRAME_MOBILE" .png).webp"
fi

"$FFMPEG" -y -i "$VIDEO" \
  -c:v libx264 -crf "$CRF" -preset slow -pix_fmt yuv420p -movflags +faststart -an \
  "$DEVICES/${SLUG}_desktop.mp4" 2>/dev/null

"$FFMPEG" -y -loglevel error -ss 0.1 -i "$DEVICES/${SLUG}_desktop.mp4" -frames:v 1 \
  "$DEVICES/${SLUG}_desktop-poster.jpg" 2>/dev/null
cwebp -q 90 "$DEVICES/${SLUG}_desktop-poster.jpg" -o "$DEVICES/${SLUG}_desktop-poster.webp" -quiet
rm -f "$DEVICES/${SLUG}_desktop-poster.jpg"

ls -lh "$DEVICES/${SLUG}_desktop."{png,webp,mp4} "$DEVICES/${SLUG}_desktop-poster.webp"
if [[ -n "$FRAME_MOBILE" ]]; then
  ls -lh "$DEVICES/${SLUG}_card-mobile."{png,webp}
fi
echo "Готово: ${SLUG}"
