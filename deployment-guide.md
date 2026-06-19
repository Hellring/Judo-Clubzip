# Руководство по развёртыванию JudoClub Manager в боевой среде

## Обзор

JudoClub Manager — это монорепозиторий на базе pnpm с двумя основными сервисами:

| Сервис | Директория | Описание |
|--------|-----------|---------|
| **Фронтенд** | `artifacts/judo-app` | React + Vite SPA |
| **API-сервер** | `artifacts/api-server` | Express 5 + Drizzle ORM |

---

## Требования к окружению

### Обязательные переменные окружения

| Переменная | Где используется | Описание |
|-----------|-----------------|---------|
| `DATABASE_URL` | API-сервер | Строка подключения к PostgreSQL (формат: `postgresql://user:password@host:5432/dbname`) |
| `CLERK_SECRET_KEY` | API-сервер | Секретный ключ Clerk (начинается с `sk_live_...` в production) |
| `CLERK_PUBLISHABLE_KEY` | API-сервер | Публичный ключ Clerk (`pk_live_...`) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Фронтенд (сборка) | Тот же публичный ключ Clerk |
| `PORT` | API-сервер | Порт для API (обычно `8080`) |

### Опциональные переменные

| Переменная | Описание |
|-----------|---------|
| `VITE_CLERK_PROXY_URL` | Прокси-путь Clerk (автоматически задаётся Replit при деплое) |
| `NODE_ENV` | Установите `production` для production-сборки |

---

## Подготовка базы данных

### 1. Создание PostgreSQL-базы

**На Replit:** используйте встроенную интеграцию PostgreSQL (вкладка Database в панели инструментов).

**На сторонних серверах:**
```bash
createdb judoclub_production
```

### 2. Применение схемы (миграции)

```bash
# Из корня монорепозитория
pnpm --filter @workspace/db run push
```

> **Важно:** Всегда делайте резервную копию базы перед применением схемы в production.

### 3. Начальные данные (опционально)

```bash
# Загрузить демо-данные (2 клуба, 9 спортсменов, 2 соревнования)
pnpm --filter @workspace/scripts run seed
```

---

## Развёртывание на Replit

### Шаг 1 — Настройка Clerk

1. Откройте вкладку **Auth** в панели Replit.
2. Clerk будет автоматически настроен через `setupClerkWhitelabelAuth()`.
3. В production ключи (`pk_live_`, `sk_live_`) подставляются автоматически.

### Шаг 2 — Настройка базы данных

1. Перейдите в раздел **Database** в Replit.
2. Создайте PostgreSQL базу — `DATABASE_URL` будет задан автоматически.
3. Примените схему:
   ```bash
   pnpm --filter @workspace/db run push
   ```

### Шаг 3 — Публикация

1. Нажмите кнопку **Deploy** в Replit.
2. Replit автоматически:
   - Собирает фронтенд (`vite build`)
   - Собирает API (`node ./build.mjs`)
   - Запускает production-процессы
   - Устанавливает SSL-сертификат
   - Настраивает Clerk production-ключи

---

## Развёртывание на собственном сервере

### Шаг 1 — Сборка

```bash
# Установить зависимости
pnpm install

# Сборка всего монорепозитория
pnpm run build
```

### Шаг 2 — Запуск API-сервера

```bash
cd artifacts/api-server
NODE_ENV=production PORT=8080 node --enable-source-maps ./dist/index.mjs
```

### Шаг 3 — Раздача фронтенда

Собранные файлы находятся в `artifacts/judo-app/dist/`. Используйте Nginx или любой статический хостинг.

**Пример конфигурации Nginx:**

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Фронтенд (SPA)
    location / {
        root /path/to/judo-app/dist;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Clerk proxy
    location /api/__clerk/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
    }
}
```

### Шаг 4 — Process Manager (рекомендуется PM2)

```bash
npm install -g pm2

pm2 start artifacts/api-server/dist/index.mjs \
  --name judoclub-api \
  --env production \
  -- --enable-source-maps

pm2 save
pm2 startup
```

---

## Первый вход в систему

### Автоматический администратор

При старте API-сервер автоматически создаёт пользователя-администратора:

| Поле | Значение |
|------|---------|
| **Email** | `hellring92@gmail.com` |
| **Пароль** | `Zse4Xdr5!@#$` |
| **Роль** | `super_admin` |

> **Важно:** После первого входа рекомендуется сменить пароль через настройки аккаунта.

### Первые шаги после развёртывания

1. Войдите под учётной записью администратора.
2. Перейдите в **Admin** → создайте клуб.
3. Пригласите тренеров через форму приглашения по email.
4. Назначьте клуб каждому пользователю.

---

## Безопасность

### Обязательные меры для production

- [ ] Установить HTTPS (SSL/TLS) — обязательно для Clerk
- [ ] Использовать production-ключи Clerk (`pk_live_`, `sk_live_`)
- [ ] Сменить пароль администратора по умолчанию
- [ ] Настроить firewall (закрыть прямой доступ к порту 8080)
- [ ] Включить логирование запросов и ошибок
- [ ] Настроить резервное копирование базы данных (ежедневно)
- [ ] Добавить rate limiting на API (например, `express-rate-limit`)
- [ ] Проверить CORS-настройки (`origin: true` заменить на список разрешённых доменов)

### Текущее CORS (нужно изменить для production)

В `artifacts/api-server/src/app.ts` замените:
```typescript
app.use(cors({ credentials: true, origin: true }));
```
На:
```typescript
app.use(cors({
  credentials: true,
  origin: ['https://yourdomain.com'],
}));
```

---

## Мониторинг и логирование

- Логи API пишутся через **Pino** в структурированном JSON-формате.
- Endpoint проверки работоспособности: `GET /api/health`
- Рекомендуется подключить **Datadog**, **Grafana** или **Sentry** для production-мониторинга.

---

## Обновление приложения

```bash
# 1. Получить изменения
git pull

# 2. Установить/обновить зависимости
pnpm install

# 3. Применить изменения схемы БД (если есть)
pnpm --filter @workspace/db run push

# 4. Пересобрать и перезапустить
pnpm run build
pm2 restart judoclub-api
```

---

## Решение типичных проблем

| Проблема | Решение |
|---------|---------|
| `DATABASE_URL` не задан | Добавьте переменную в secrets/env |
| Ошибка Clerk "Failed to load" | Убедитесь, что `CLERK_PUBLISHABLE_KEY` и `CLERK_SECRET_KEY` заданы |
| 401 на все API-запросы | Проверьте, что Clerk middleware подключён до роутов |
| Пустой список пользователей | Войдите в систему — пользователь создаётся при первом входе |
| `node_modules missing` | Выполните `pnpm install` |
| Ошибка схемы БД | Выполните `pnpm --filter @workspace/db run push` |
