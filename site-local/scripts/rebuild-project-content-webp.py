#!/usr/bin/env python3
"""
PNG/JPG из папок проектов → WebP q=95 в той же папке и в site-local/images/content/.
Источник качества — растровые файлы, не пережатие существующих WebP.

Запуск из site-local/: python3 scripts/rebuild-project-content-webp.py
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import unicodedata
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / "site-local"
CONTENT = SITE / "images" / "content"
ASSET_MAP = json.loads((SITE / "asset-map.json").read_text(encoding="utf-8"))
QUALITY = "95"

PROJECT_PAGES = [
    "designconference.html",
    "glavpivmag.html",
    "sibpromstroy.html",
    "smarthome.html",
    "zesklad.html",
    "crafter.html",
    "csradar.html",
    "csclick.html",
    "sberpravo.html",
    "legalbpm.html",
]

# Где искать исходники (порядок = приоритет)
SEARCH_DIRS = [
    "Главпивмаг",
    "Дизайн-конференция",
    "СберПраво",
    "Сибпромстрой",
    "Умный дом",
    "CS Radar",
    "CS-Клик",
    "Изображения",
    "Оригиналы",
    "Сжатые/Высокое качество",
    "Сжатые",
]

# Локальное имя файла (norm) → norm имени из CDN/asset-map
ALIASES: dict[str, str] = {
    "корзина": "корзина 2",
    "главная роль юрист": "главная",
    "контекст": "дизайн конференция",
    "wireframe": "wirefrrame 2",
    "главная страница": "главная страница 3",
    "главная страница сибпромстрой": "главная страница сибпромстрой 3",
    "страница проекта сибпромстрой": "страница проекта сибпромстрой 2",
    "было": "было 3",
    "сбер": "сберправо стаыи каталог",
    "шаблон страницы": "прототип",
    "каталог 1 уровень все 1920": "каталог 1 уровень все 1920",
    "дизайн конференция main": "дизайн конференция main",
    "crafter": "crafter cover 2",
    "1 1 new routes scan": "план работы",
    "1 4 list routes": "пример сценария",
    "375 главный экран": "cs radar приложение 1",
}

# Явные источники — приоритет над индексом (избегаем коллизий по размеру)
EXPLICIT_SOURCES: dict[str, str] = {
    "дизайн конференция": "Дизайн-конференция/контекст.png",
    "wirefrrame 2": "Дизайн-конференция/Wireframe.png",
    "дизайн конференция 4": "Дизайн-конференция/Дизайн-конференция.png",
    "roadmap": "Изображения/Картинки на светлом фоне/Roadmap.png",
    "главпивмаг": "Изображения/Картинки на светлом фоне/Главпивмаг.png",
    "frame 1851040488": "Изображения/Картинки на светлом фоне/Frame 1851040488.png",
    "каталог 60 ночь": "Изображения/Каталог 6.0 - ночь.png",
    "доработка 41": "Изображения/Доработка 4.1.png",
    "план работы": "Изображения/1.1 New Routes Scan.png",
    "пример сценария": "Изображения/1.4 List Routes.png",
    "cs radar приложение 1": "Изображения/375 — Главный экран.png",
    "сберправо стаый каталог": "СберПраво/Сбер.png",
    "прототип": "СберПраво/Шаблон страницы.jpg",
    "корзина 2": "CS-Клик/Корзина.png",
    "главная": "CS-Клик/Главная.png",
    "было 3": "Сибпромстрой/Было.png",
    "главная страница сибпромстрой 3": "Сибпромстрой/Главная страница – сибпромстрой.png",
    "страница проекта сибпромстрой 2": "Сибпромстрой/Страница проекта –сибпромстрой.png",
    "главная страница 3": "Сибпромстрой/Главная страница.png",
}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFC", unquote(str(s)))
    s = s.lower()
    s = re.sub(r"\.(png|jpe?g|webp)$", "", s, flags=re.I)
    s = s.replace("..", ".").replace("—", "-").replace("–", "-")
    s = s.replace("_", " ").replace("-", " ")
    s = re.sub(r"[^a-z0-9а-яё\s]", "", s)
    return re.sub(r"\s+", " ", s).strip()


def cdn_fname(cdn_key: str) -> str:
    key = cdn_key.replace("assets/cdn/", "")
    return key.split("_", 1)[1] if "_" in key else key


def build_cdn_lookup() -> dict[str, str]:
    out: dict[str, str] = {}
    for cdn, rel in ASSET_MAP.items():
        if not rel.startswith("images/content/"):
            continue
        out[norm(cdn_fname(cdn))] = rel
    return out


def build_file_index() -> dict[str, Path]:
    idx: dict[str, Path] = {}
    for rel_dir in SEARCH_DIRS:
        base = ROOT / rel_dir
        if not base.is_dir():
            continue
        for path in base.rglob("*"):
            if path.suffix.lower() not in (".png", ".jpg", ".jpeg"):
                continue
            key = norm(path.name)
            prev = idx.get(key)
            if not prev or path.stat().st_size > prev.stat().st_size:
                idx[key] = path
            alias = ALIASES.get(key)
            if alias and alias not in idx:
                idx[alias] = path
    return idx


def collect_content_refs() -> list[str]:
    refs: set[str] = set()
    pat = re.compile(r'images/content/[^"\')]+\.(?:webp|png|jpe?g)', re.I)
    for page in PROJECT_PAGES:
        html = (SITE / page).read_text(encoding="utf-8")
        for m in pat.findall(html):
            refs.add(m.replace(".webp", "").rsplit(".", 1)[0] + Path(m).suffix.lower())
    # всегда .png/.jpg путь из asset-map
    out: list[str] = []
    for r in sorted(refs):
        webp = r.endswith(".webp")
        base = r[:-5] if webp else r
        # найти растровый путь на диске
        for ext in (".png", ".jpg", ".jpeg"):
            rel = base.replace("images/content/", "") + ext
            p = CONTENT / Path(rel).name
            if p.exists():
                out.append(f"images/content/{p.name}")
                break
        else:
            # из asset-map
            slug = Path(base).name
            for cdn, arel in ASSET_MAP.items():
                if arel.startswith("images/content/") and Path(arel).stem == Path(slug).stem:
                    out.append(arel)
                    break
    return sorted(set(out))


def to_webp(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["cwebp", "-q", QUALITY, "-m", "6", str(src), "-o", str(dest)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def main() -> None:
    cdn_lookup = build_cdn_lookup()
    file_index = build_file_index()
    rels = collect_content_refs()
    updated = 0
    missing = []

    for rel in rels:
        if not rel.startswith("images/content/"):
            continue
        cdn_key = next((k for k, v in ASSET_MAP.items() if v == rel), None)
        if not cdn_key:
            # попробовать по stem
            stem = Path(rel).stem
            cdn_key = next(
                (k for k, v in ASSET_MAP.items() if v.startswith("images/content/") and Path(v).stem == stem),
                None,
            )
        if not cdn_key:
            missing.append(rel)
            continue

        key = norm(cdn_fname(cdn_key))
        src = None
        if key in EXPLICIT_SOURCES:
            explicit = ROOT / EXPLICIT_SOURCES[key]
            if explicit.exists():
                src = explicit
        if not src:
            src = file_index.get(key)
        if not src:
            for alias_from, alias_to in ALIASES.items():
                if alias_to == key:
                    src = file_index.get(alias_from)
                    if src:
                        break
        site_raster = SITE / rel
        site_webp = site_raster.with_suffix(".webp")

        if src and (not site_raster.exists() or src.stat().st_size >= site_raster.stat().st_size * 0.98):
            shutil.copy2(src, site_raster)
            source_for_webp = site_raster
            # webp рядом с исходником в папке проекта
            src_webp = src.with_suffix(".webp")
            to_webp(src, src_webp)
        elif site_raster.exists():
            source_for_webp = site_raster
        elif site_webp.exists():
            missing.append(f"{rel} (только webp, нет PNG)")
            continue
        else:
            missing.append(rel)
            continue

        to_webp(source_for_webp, site_webp)
        updated += 1
        print(f"✓ {Path(rel).name} ← {source_for_webp.name}")

    print(f"\nГотово: {updated} файлов WebP q={QUALITY}")
    if missing:
        print(f"Не найден источник ({len(missing)}):")
        for m in missing:
            print(f"  - {m}")


if __name__ == "__main__":
    main()
