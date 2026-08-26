# Docker deployment

The project is split into three runtime services:

- `web` — Nginx serves the React build and proxies `/api` to the API.
- `api` — production Express server on the internal port `8080`.
- `db` — PostgreSQL 16 with a named persistent volume.

## First run

```bash
cp .env.docker.example .env
# Fill in the real Clerk keys and a strong POSTGRES_PASSWORD.

docker compose up -d db
docker compose --profile tools run --rm migrate
docker compose up -d api web
```

Open `http://localhost` (or the port from `WEB_PORT`).

## Updates

Build and restart the application images after code changes:

```bash
docker compose build api web
docker compose up -d api web
```

After a database schema change, run the explicit schema sync before restarting
the API:

```bash
docker compose --profile tools run --rm migrate
docker compose up -d api
```

The database is stored in the `postgres_data` Docker volume. Removing that
volume deletes all local Docker database data:

```bash
docker compose down
docker volume rm <project>_postgres_data
```

The frontend Clerk publishable key is embedded during the web image build.
The Clerk secret key is provided only at API container runtime and is never
copied into the frontend image.