#!/bin/bash
# Экспорт карточек «Личные» из Figma (node 944:23154)
set -euo pipefail
TOKEN="${FIGMA_TOKEN:?Задайте FIGMA_TOKEN: export FIGMA_TOKEN=figd_…}"
FILE="khKpO5YkV2bwF3MJUJ4X1b"
OUT="/Users/mihail/Desktop/Мой сайт/site-local/images/home-v2"

ids=(
  "I944:23154;906:22998:personal-01.png"
  "I944:23154;906:23042:personal-02.png"
  "I944:23154;906:23064:personal-03.png"
  "I944:23154;906:23020:personal-04.png"
)

for entry in "${ids[@]}"; do
  IFS=':' read -r -a parts <<< "$entry"
  node_id="${parts[0]}:${parts[1]};${parts[2]}:${parts[3]}"
  file="${parts[4]}"
  echo "Export $node_id -> $file"
  for attempt in 1 2 3 4 5; do
    json=$(curl -s -H "X-Figma-Token: $TOKEN" \
      "https://api.figma.com/v1/images/${FILE}?ids=${node_id//:/%3A}&format=png&scale=1")
    url=$(node -e "const j=JSON.parse(process.argv[1]); const k=Object.keys(j.images||{})[0]; process.stdout.write((j.images&&j.images[k])||'');" "$json")
    if [ -n "$url" ] && [ "$url" != "null" ]; then
      curl -sL "$url" -o "$OUT/$file"
      echo "  OK $file"
      break
    fi
    echo "  retry $attempt: $json"
    sleep 45
  done
  sleep 15
done
