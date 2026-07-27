# HomeBase

Веб-приложение для совместного быта соседей по квартире: меню на неделю, дежурства по уборке кухни
с обменами, объявления и чат, настройки профиля/проекта, геймифицированная статистика.

Подробный контекст и конвенции проекта — в [CLAUDE.md](./CLAUDE.md).

## Стек

Vite + React + TypeScript (SPA) + React Router + Tailwind v4 + shadcn/ui + Supabase
(Auth, Postgres, RLS, Realtime, Storage) + TanStack Query. Деплой — GitHub Pages через GitHub Actions.

## Локальный запуск

```bash
npm install
cp .env.local.example .env.local   # заполнить VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY
npm run dev
```

Миграции БД лежат в [supabase/migrations](./supabase/migrations) — применяются к Supabase-проекту
через Supabase CLI (`supabase db push`) либо вручную через SQL Editor в дашборде, по порядку файлов.

## Деплой

Пуш в `main` автоматически собирает и публикует сайт на GitHub Pages
(см. [.github/workflows/deploy.yml](./.github/workflows/deploy.yml)). Секреты `VITE_SUPABASE_URL`
и `VITE_SUPABASE_ANON_KEY` должны быть добавлены в GitHub Actions secrets репозитория.
