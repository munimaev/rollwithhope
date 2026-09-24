# roll with hope

Правила Daggerheart на русском — читать онлайн: https://munimaev.github.io/rollwithhope

Статический сайт на Vue 3 + Vite + `vite-ssg`. Контент (`content/`) собирается скриптом
`scripts/sync` из личного Obsidian-хранилища и коммитится в этот репозиторий как обычные
файлы — само хранилище (там есть приватный контент) сюда никогда не попадает.

## Разработка

```bash
npm ci
npm run dev          # локальный сервер
npm run typecheck
npm test
npm run build         # vite-ssg build + пережатие lang + индексация Pagefind → dist/
npm run preview
```

## Обновление контента

Нужен доступ к хранилищу (папка Obsidian vault с `01︱📚︱Правила` и `96︱🛠️︱Сайт`):

```bash
VAULT_PATH=/путь/к/хранилищу npm run sync          # предупреждения не блокируют
VAULT_PATH=/путь/к/хранилищу npm run sync:strict   # любое предупреждение — стоп
```

`sync` полностью пересобирает `content/pages/**/*.vue` (настоящие Vue-компоненты),
`public/images/**` и `content/manifest.json` с нуля и печатает отчёт
(добавлено/изменено/убрано/предупреждения). После этого обычный `git diff` в `content/`
и `public/images/` показывает, что реально изменилось.

Правила экспорта (что публикуется, как считаются слаги, обработка картинок и
Obsidian-синтаксиса) — в `96︱🛠️︱Сайт/Архитектура.md` внутри хранилища.

## Деплой

`.github/workflows/deploy.yml` — на каждый push в `main` собирает `dist/` и публикует
на GitHub Pages. CI не имеет доступа к хранилищу и работает только с уже закоммиченным
`content/`.
