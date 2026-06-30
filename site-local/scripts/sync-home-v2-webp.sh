#!/usr/bin/env bash
# Копирует WebP из Cards/Screens/Webp в images/home-v2/devices/ (slug-имена как у PNG).
# Запуск из site-local/: bash scripts/sync-home-v2-webp.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEBP_SRC="$(cd "$ROOT/../Cards/Screens/Webp" && pwd)"
DEVICES="$ROOT/images/home-v2/devices"
LAYERS="$ROOT/images/home-v2/layers"

mkdir -p "$DEVICES"

copy() {
  local src="$1" dest="$2"
  if [[ -f "$src" ]]; then
    cp "$src" "$dest"
    echo "  ✓ $(basename "$dest")"
  else
    echo "  ✗ missing: $src" >&2
  fi
}

echo "→ devices (из Cards/Screens/Webp)"
copy "$WEBP_SRC/Macbook_web view.webp"                       "$DEVICES/raif-rafa-brand_desktop.webp"
copy "$WEBP_SRC/Macbook_mobile view.webp"                    "$DEVICES/raif-rafa-brand_card-mobile.webp"
copy "$WEBP_SRC/Raf_web.webp"                              "$DEVICES/raif-rafa-app_desktop.webp"
copy "$WEBP_SRC/Raf_mobile.webp"                           "$DEVICES/raif-rafa-app_mobile.webp"
copy "$WEBP_SRC/Macbook_web view.webp"                       "$DEVICES/raif-search_desktop.webp"
copy "$WEBP_SRC/Macbook_mobile view.webp"                    "$DEVICES/raif-search_card-mobile.webp"
copy "$WEBP_SRC/Servicedesk_web.webp"                      "$DEVICES/raif-servicedesk_desktop.webp"
copy "$WEBP_SRC/mobile/Servicedesk_web_mobile.webp"      "$DEVICES/raif-servicedesk_card-mobile.webp"
copy "$WEBP_SRC/LegalBPM_web.webp"                         "$DEVICES/sberpravo-redesign_desktop.webp"
copy "$WEBP_SRC/mobile/LegalBPM_web_mobile.webp"         "$DEVICES/sberpravo-redesign_card-mobile.webp"
copy "$WEBP_SRC/SberPravo_web.webp"                        "$DEVICES/sberpravo-catalog_desktop.webp"
copy "$WEBP_SRC/mobile/SberPravo_web.webp"                 "$DEVICES/sberpravo-catalog_card-mobile.webp"
copy "$WEBP_SRC/SberPravo_mobile.webp"                     "$DEVICES/sberpravo-catalog_mobile.webp"
copy "$WEBP_SRC/CSKlick_web.webp"                          "$DEVICES/csclick_desktop.webp"
copy "$WEBP_SRC/CSKlick_mobile.webp"                       "$DEVICES/csclick_mobile.webp"
copy "$WEBP_SRC/CSRadar_web.webp"                          "$DEVICES/csradar_desktop.webp"
copy "$WEBP_SRC/CSRadar_mobile.webp"                       "$DEVICES/csradar_mobile.webp"
copy "$WEBP_SRC/Crafter_web.webp"                          "$DEVICES/crafter_desktop.webp"
copy "$WEBP_SRC/Crafter_mobile.webp"                       "$DEVICES/crafter_mobile.webp"
copy "$WEBP_SRC/ZeSklad_web.webp"                          "$DEVICES/zesklad_desktop.webp"
copy "$WEBP_SRC/ZeSklad_mobile.webp"                       "$DEVICES/zesklad_mobile.webp"
copy "$WEBP_SRC/mobile/SmartHome_mobile_mobile1.webp"      "$DEVICES/smarthome_mobile-1.webp"
copy "$WEBP_SRC/mobile/SmartHome_mobile_mobile2.webp"      "$DEVICES/smarthome_mobile-2.webp"
copy "$WEBP_SRC/mobile/SmartHome_mobile_mobile3.webp"      "$DEVICES/smarthome_mobile-3.webp"
copy "$WEBP_SRC/SibPromStroy_web.webp"                     "$DEVICES/sibpromstroy_desktop.webp"
copy "$WEBP_SRC/mobile/SibPromStroy_web_mobile.webp"       "$DEVICES/sibpromstroy_card-mobile.webp"
copy "$WEBP_SRC/DesignConference_web.webp"                 "$DEVICES/designconference_desktop.webp"
copy "$WEBP_SRC/mobile/DesignConference_web_mobile.webp"   "$DEVICES/designconference_card-mobile.webp"
copy "$WEBP_SRC/GlavPivMag_web.webp"                       "$DEVICES/glavpivmag_desktop.webp"
copy "$WEBP_SRC/mobile/GlavPivMag_web_mobile.webp"         "$DEVICES/glavpivmag_card-mobile.webp"
copy "$WEBP_SRC/Omonete_web.webp"                          "$DEVICES/omonete_desktop.webp"
copy "$WEBP_SRC/mobile/Omonete_web_mobile.webp"            "$DEVICES/omonete_card-mobile.webp"
copy "$WEBP_SRC/WhichColor_web.webp"                       "$DEVICES/color-game_desktop.webp"
copy "$WEBP_SRC/mobile/WhichColor_web_mobile.webp"         "$DEVICES/color-game_card-mobile.webp"
copy "$WEBP_SRC/BasketballGame!_web.webp"                  "$DEVICES/basketball_desktop.webp"
copy "$WEBP_SRC/mobile/BasketballGame!_web_mobile.webp"    "$DEVICES/basketball_card-mobile.webp"
copy "$WEBP_SRC/Symbols_web.webp"                          "$DEVICES/symbols_desktop.webp"
copy "$WEBP_SRC/mobile/Symbols_web_mobile.webp"            "$DEVICES/symbols_card-mobile.webp"

echo "→ layers + остатки (cwebp q=95 из PNG рядом)"
if ! command -v cwebp &>/dev/null; then
  echo "  cwebp не найден — пропуск конвертации слоёв" >&2
  exit 0
fi

for png in "$LAYERS"/*.png "$DEVICES"/*_card-mobile.png; do
  [[ -f "$png" ]] || continue
  webp="${png%.png}.webp"
  if [[ ! -f "$webp" ]]; then
    cwebp -q 95 "$png" -o "$webp" -quiet
    echo "  ✓ $(basename "$webp")"
  fi
done

echo "Готово."
