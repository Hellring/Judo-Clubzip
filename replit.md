# JudoClub Manager

A multi-club judo management system for athlete tracking, payment management, competition management with brackets, fight timing with judo scoring, and multi-role access.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed demo data (2 clubs, 9 athletes, 2 competitions, 8 payments)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + shadcn/ui + wouter routing + react-i18next (RU/EN)
- API: Express 5 + Clerk auth middleware
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/index.ts` — DB schema (users, clubs, club_members, athletes, payments, competitions, weight_categories, participants, fights, fight_events)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/` — generated React Query hooks and Zod schemas (via Orval)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, clubs, athletes, payments, competitions, fights)
- `artifacts/judo-app/src/pages/` — all 12 React pages
- `artifacts/judo-app/src/i18n/` — translation files (ru.json, en.json)
- `scripts/src/seed.ts` — demo data seeder

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed React Query hooks on frontend
- Clerk for auth (whitelabel); `requireAuth()` middleware on all mutating routes; `getAuth(req)` for user identity
- Fight scoring computed server-side from events array on every event add/delete (no cached score)
- IPPON and HANSOKU events auto-finish the fight and set the winner in backend logic
- Express 5 `req.params` types are `string | string[]` — always cast with `as string` in parseInt calls

## Product

- **Clubs**: create/manage judo clubs, view member lists and payment summaries
- **Athletes**: full athlete profiles, fight history, payment tracking, belt/weight tracking
- **Competitions**: Olympic (single-elimination bracket) and round-robin formats with auto-bracket generation
- **Fight Timer**: countdown timer with ippon/waza-ari/shido/hansoku scoring, auto-finish on ippon/hansoku
- **Payments**: track membership dues, mark paid/pending/overdue
- **Roles**: super_admin / club_admin / coach / athlete / parent
- **i18n**: Russian (default) + English switcher in the navbar

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm run typecheck:libs` after any `lib/*` change to rebuild declarations before artifact checks
- Orval generates `<OperationId>Params` collisions if endpoints have BOTH path params AND query params — keep query params off nested-path endpoints in the OpenAPI spec
- Seed script creates users by Clerk userId placeholder; real users are created on first sign-in via `/api/auth/me`
- Fight duration default is 240 seconds (4 min); competitions can override per-fight via `fightDurationSeconds`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
