#!/usr/bin/env python3
"""
Копирует исходники кейсов в папки проектов (без удаления из «Изображения»)
и пересобирает WebP q=95 рядом с оригиналом и в site-local/images/content/.

Запуск из site-local/: python3 scripts/organize-project-images.py
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

PAGES: dict[str, str] = {
    "glavpivmag.html": "Главпивмаг",
    "designconference.html": "Дизайн-конференция",
    "sberpravo.html": "СберПраво",
    "sibpromstroy.html": "Сибпромстрой",
    "csradar.html": "CS Radar",
    "csclick.html": "CS-Клик",
    "crafter.html": "Crafter",
    "zesklad.html": "ZeСклад",
    "smarthome.html": "Умный дом",
    "legalbpm.html": "LegalBPM",
}

SEARCH_DIRS = [
    "Главпивмаг",
    "Дизайн-конференция",
    "СберПраво",
    "Сибпромстрой",
    "CS Radar",
    "CS-Клик",
    "Crafter",
    "ZeСклад",
    "Умный дом",
    "Smart Home",
    "LegalBPM",
    "Изображения",
]

# norm(cdn_fname) → относительный путь от ROOT (приоритет над индексом)
EXPLICIT_SOURCES: dict[str, str] = {
    "roadmap": "Изображения/Картинки на светлом фоне/Roadmap.png",
    "главпивмаг": "Изображения/Картинки на светлом фоне/Главпивмаг.png",
    "frame 1851040488": "Изображения/Картинки на светлом фоне/Frame 1851040488.png",
    "frame 1851040498": "Главпивмаг/Frame 1851040498.png",
    "каталог 60 ночь": "Изображения/Каталог 6.0 - ночь.png",
    "доработка 41": "Изображения/Доработка 4.1.png",
    "снимок экрана 2024 03 20 в 125531 am": "Изображения/Снимок экрана 2024-03-20 в 12.55.31 AM.png",
    "снимок экрана 2024 03 19 в 75442 pm": "Изображения/Снимок экрана 2024-03-19 в 7.54.42 PM.png",
    "дизайн конференция": "Дизайн-конференция/контекст.png",
    "wirefrrame 2": "Дизайн-конференция/Wireframe.png",
    "дизайн конференция 4": "Дизайн-конференция/Дизайн-конференция.png",
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
    "wirefrrame": "Сибпромстрой/Wirefrrame.png",
    "сибпромстрой": "Сибпромстрой/Сибпромстрой.png",
    "logo design conference": "Дизайн-конференция/Logo Design Conference.png",
    "результат": "Дизайн-конференция/Результат.png",
    "дизайн конференция main": "Дизайн-конференция/Дизайн-конференция main.png",
    "снимок экрана 2024 04 02 в 23418 pm": "Дизайн-конференция/Снимок экрана 2024-04-02 в 2.34.18 PM.png",
    "маршруты на карте не показывать пути маршрутов": "CS Radar/Маршруты на карте — не показывать пути маршрутов.png",
    "снимок экрана 2024 05 26 в 1240 1": "CS Radar/Снимок экрана 2024-05-26 в 12.40 1.png",
    "frame 1851040492": "СберПраво/Frame 1851040492.png",
    "каталог 1 уровень все 1920": "СберПраво/Каталог 1 уровень – Все – 1920..jpg",
    "структура страницы": "СберПраво/Структура страницы.jpg",
    "адрес пункта самовывоз": "CS-Клик/Адрес пункта самовывоз.png",
    "оформление заказа": "CS-Клик/Оформление заказа.png",
    "main": "Smart Home/8b21fec1-main.png",
    "v chem sila brom": "Smart Home/3eef955b-v-chem-sila-brom_.png",
    "i believe i can change": "Smart Home/93119d48-i-believe-i-can-change.png",
    "are you serious": "Smart Home/03498c74-are-you-serious_.png",
    "colors": "Smart Home/8b56c79b-colors.png",
    "end": "Smart Home/e22871e9-end.png",
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


def cdn_to_local_name(cdn_name: str) -> str:
    """CDN-имя → читаемое имя файла для папки проекта."""
    base = Path(cdn_name)
    stem = base.stem.replace("-", " ")
    return stem + base.suffix


def build_file_index() -> dict[str, Path]:
    idx: dict[str, Path] = {}
    for rel_dir in SEARCH_DIRS + ["site-local/images/content"]:
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
    return idx


def resolve_cdn_key(stem: str) -> str | None:
    png_rel = f"images/content/{stem}.png"
    cdn_key = next((k for k, v in ASSET_MAP.items() if v == png_rel), None)
    if not cdn_key:
        cdn_key = next(
            (k for k, v in ASSET_MAP.items() if v.startswith("images/content/") and Path(v).stem == stem),
            None,
        )
    return cdn_key


def find_source(key: str, stem: str, file_index: dict[str, Path]) -> Path | None:
    if key in EXPLICIT_SOURCES:
        p = ROOT / EXPLICIT_SOURCES[key]
        if p.exists():
            return p
    src = file_index.get(key)
    if src:
        return src
    site_png = CONTENT / f"{stem}.png"
    site_jpg = CONTENT / f"{stem}.jpg"
    if site_png.exists():
        return site_png
    if site_jpg.exists():
        return site_jpg
    return None


def to_webp(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["cwebp", "-q", QUALITY, "-m", "6", str(src), "-o", str(dest)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def copy_to_project(src: Path, proj_dir: Path, cdn_name: str) -> Path:
    """Копирует в папку проекта; для файлов с сайта — читаемое имя из CDN."""
    proj_dir.mkdir(parents=True, exist_ok=True)
    if str(src).startswith(str(CONTENT)):
        dest_name = cdn_to_local_name(cdn_name)
    else:
        dest_name = src.name
    dest = proj_dir / dest_name
    if not dest.exists() or src.stat().st_size > dest.stat().st_size * 1.02:
        shutil.copy2(src, dest)
        print(f"  copy → {proj_dir.name}/{dest_name}")
    return dest


def main() -> None:
    file_index = build_file_index()
    pat = re.compile(r'images/content/([^"\')]+\.webp)', re.I)
    copied = 0
    rebuilt = 0

    for page, proj in PAGES.items():
        proj_dir = ROOT / proj
        refs = sorted(set(pat.findall((SITE / page).read_text(encoding="utf-8"))))
        print(f"\n=== {proj} ({len(refs)} изображений) ===")

        for ref in refs:
            stem = Path(ref).stem
            cdn_key = resolve_cdn_key(stem)
            if not cdn_key:
                print(f"  ! нет CDN для {ref}")
                continue
            cdn_name = cdn_fname(cdn_key)
            key = norm(cdn_name)
            src = find_source(key, stem, file_index)
            if not src:
                print(f"  ! нет источника: {cdn_name}")
                continue

            local = copy_to_project(src, proj_dir, cdn_name)
            copied += 1

            # PNG/JPG на сайте — из лучшего локального оригинала
            site_rel = ASSET_MAP.get(cdn_key, f"images/content/{stem}{local.suffix}")
            site_raster = SITE / site_rel
            if not site_raster.exists() or local.stat().st_size >= site_raster.stat().st_size * 0.98:
                shutil.copy2(local, site_raster)

            site_webp = site_raster.with_suffix(".webp")
            proj_webp = local.with_suffix(".webp")
            to_webp(local, proj_webp)
            to_webp(local, site_webp)
            rebuilt += 1
            print(f"  webp ← {local.name}")

    print(f"\nГотово: скопировано/проверено {copied}, пересобрано WebP {rebuilt}")


if __name__ == "__main__":
    main()
