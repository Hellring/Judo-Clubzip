# Развёртывание JudoClub Manager в Docker

## Что запускается

Docker Compose поднимает четыре сервиса:

- `web` — Nginx раздаёт React-приложение и проксирует `/api` в API;
- `api` — production-сервер Express на внутреннем порту `8080`;
- `db` — PostgreSQL 16 с постоянным Docker volume;
- `migrate` — одноразовая команда синхронизации схемы БД.

## Требования

- Docker Engine 24+;
- Docker Compose v2;
- production-ключи Clerk;
- домен с HTTPS для боевого окружения.

## Первый запуск

Скопируйте пример переменных окружения:

```bash
cp .env.docker.example .env
```

Заполните в `.env`:

```env
POSTGRES_PASSWORD=сильный_пароль_базы
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
ADMIN_PASSWORD=пароль_предопределённого_администратора
```

Значения `CLERK_SECRET_KEY` и `POSTGRES_PASSWORD` нельзя встраивать во
frontend или коммитить в Git. `ADMIN_PASSWORD` также хранится только в
секретах окружения.

Предопределённый администратор имеет email `hellring92@gmail.com` и роль
`super_admin`. Если пользователя ещё нет в Clerk, API создаст его с паролем из
`ADMIN_PASSWORD`. При запуске API пароль существующего предопределённого
администратора синхронизируется с `ADMIN_PASSWORD`; активные Clerk-сессии при
этом завершаются.

Запустите PostgreSQL:

```bash
docker compose up -d db
```

Примените схему базы:

```bash
docker compose --profile tools run --rm migrate
```

Соберите и запустите приложение:

```bash
docker compose up -d --build api web
```

После запуска проверьте состояние контейнеров:

```bash
docker compose ps
docker compose logs -f api
```

Приложение будет доступно по адресу `http://localhost`. Если нужен другой
порт, укажите его в `.env`:

```env
WEB_PORT=8080
```

## Production через домен

Перед публикацией:

1. Направьте DNS-запись домена на сервер.
2. Настройте HTTPS через reverse proxy (Caddy, Traefik или внешний
   балансировщик).
3. Укажите production-ключи Clerk.
4. Если используется Clerk proxy на собственном домене, задайте:

   ```env
   VITE_CLERK_PROXY_URL=https://judo.example.com/api/__clerk
   CLERK_PROXY_URL=https://judo.example.com/api/__clerk
   ```

5. После изменения `VITE_*` переменных обязательно пересоберите frontend:

   ```bash
   docker compose build --no-cache web
   docker compose up -d web
   ```

## Внешняя PostgreSQL

По умолчанию используется контейнер `db`. Для внешней PostgreSQL можно
задать полный URL подключения:

```env
DATABASE_URL=postgresql://user:password@db.example.com:5432/judo
```

В этом случае миграцию можно запустить так же:

```bash
docker compose --profile tools run --rm migrate
```

## Обновление приложения

После изменений в коде:

```bash
docker compose build api web
docker compose up -d api web
```

После изменений схемы БД сначала примените её, а затем перезапустите API:

```bash
docker compose --profile tools run --rm migrate
docker compose up -d api
```

Сервис миграции запускается явно, чтобы обновление production-схемы не
происходило неожиданно при каждом старте приложения.

## Резервное копирование и остановка

База хранится в volume `postgres_data`. Перед удалением volume сделайте
резервную копию:

```bash
docker compose exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

Остановить контейнеры без удаления данных:

```bash
docker compose down
```

Удаление volume удалит локальные данные базы:

```bash
docker compose down
docker volume rm <project>_postgres_data
```

Секретный ключ Clerk передаётся только API-контейнеру во время запуска.
Публичный ключ Clerk встраивается в frontend во время сборки и не является
секретом.