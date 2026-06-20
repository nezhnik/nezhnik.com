# Экспорт устройств для карточек home-v2

Положи PNG в `site-local/images/home-v2/devices/` с **прозрачным фоном** (только рамка + экран).

## Именование

```
{slug}_desktop.png      — MacBook Pro 16
{slug}_mobile.png       — iPhone (если один)
{slug}_mobile-2.png     — второй iPhone (Smart home)
{slug}_mobile-3.png     — третий iPhone (Smart home)
```

Пример: `crafter_desktop.png`, `crafter_mobile.png` — да, так и называй.

## Рабочие проекты

| slug | desktop | mobile | Что экспортировать в Figma |
|------|---------|--------|--------------------------|
| `raif-rafa-brand` | ✓ | — | MacBook Pro 16 |
| `raif-rafa-app` | ✓ | ✓ | MacBook + iPhone 15 Pro |
| `raif-search` | ✓ | — | MacBook |
| `raif-servicedesk` | ✓ | — | MacBook |
| `sberpravo-redesign` | ✓ | — | MacBook |
| `sberpravo-catalog` | ✓ | ✓ | MacBook + iPhone |
| `csclick` | ✓ | ✓ | MacBook + iPhone |
| `csradar` | ✓ | ✓ | MacBook + iPhone |
| `crafter` | ✓ | ✓ | MacBook + iPhone |
| `zesklad` | ✓ | ✓ | MacBook + iPhone |
| `smarthome` | — | ✓ ×3 | 3× iPhone (без Mac) |
| `sibpromstroy` | ✓ | — | MacBook |
| `designconference` | ✓ | — | MacBook |
| `glavpivmag` | ✓ | — | MacBook |

## Личные проекты

| slug | desktop | mobile |
|------|---------|--------|
| `omonete` | ✓ | — |
| `color-game` | ✓ | — |
| `basketball` | ✓ | — |
| `symbols` | ✓ | — |

## Как экспортировать из Figma

1. Открой карточку проекта (фрейм CS-Клик, 1984×940)
2. Выдели **только** `MacBook Pro 16` или `iPhone 15 Pro…`
3. Export → PNG, 1× или 2×
4. Сохрани с именем из таблицы

Фоны уже лежат в `images/home-v2/layers/*-bg.png` — их заново качать не нужно.

После добавления файлов обнови страницу (`Cmd+Shift+R`).
