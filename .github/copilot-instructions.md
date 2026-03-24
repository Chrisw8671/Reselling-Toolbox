<!-- Copilot instructions for AI coding agents in this repository -->

# Copilot instructions — Reselling-Toolbox

Purpose: give an AI coding assistant only the repository-specific facts and patterns needed to be immediately productive.

**Project Overview**

- **Type:** Next.js app (App Router) using the `app/` directory for pages and API routes.
- **Backend:** Postgres via Prisma. Schema is at `prisma/schema.prisma`; runtime client is exported from `lib/prisma.ts`.
- **Front-end:** React + TypeScript components in `components/`. Pages and route handlers live under `app/`.

**Key files to reference**

- `package.json` — scripts: `dev`, `build`, `start`, `lint`, `format`.
- `app/api/*/route.ts` — Next.js route handlers (read these when adding or modifying API endpoints).
- `lib/prisma.ts` — single PrismaClient instance; always import `prisma` from here for DB access.
- `prisma/schema.prisma` and `prisma/migrations/` — DB model source of truth; do not hardcode DB schema elsewhere.

**Developer workflows (commands)**

- Run dev server: `npm run dev` (or `pnpm dev`, `yarn dev`).
- Build: `npm run build` and start production: `npm run start`.
- Prisma Migrations: use the Prisma CLI (e.g. `npx prisma migrate dev` / `npx prisma db push`) and commit generated migrations under `prisma/migrations/`.

**Project-specific patterns & conventions**

- App Router: components under `app/` are server components by default. Add `'use client'` at the top of a file when a component must run in the browser.
- API route handlers follow the `app/api/.../route.ts` pattern and export route methods (e.g., `export async function GET(req)` / `POST`). Inspect existing handlers to match request/response shapes.
- Database access always uses the singleton `prisma` from `lib/prisma.ts` to avoid multiple clients in development. Example:

```ts
import { prisma } from "../../lib/prisma";
const item = await prisma.stockUnit.findUnique({ where: { sku: "..." } });
```

- Migrations are source-controlled in `prisma/migrations/`. When generating a migration, ensure the SQL and `schema.prisma` changes are consistent.

**Integration points & external deps**

- Prisma + Postgres: `DATABASE_URL` must be set in the environment for dev and production.
- Excel import/export uses `exceljs` (see `app/api/export/*`).
- Charts use `recharts` in the UI.

**What to avoid / common pitfalls**

- Do not instantiate a raw `new PrismaClient()` across multiple modules; always import the `prisma` export from `lib/prisma.ts`.
- Prefer making API changes by editing the route handler under `app/api/.../route.ts` rather than adding custom Express-style servers.
- The app uses Next.js App Router semantics — changing a page file's export shape or moving from server to client requires adding `'use client'` and adjusting imports.

**When making changes**

- Update `prisma/schema.prisma` and generate a migration; commit the new migration.
- Run `npm run build` locally if the change touches SSR or middleware.

**Quick references for common tasks**

- Add API route: create `app/api/<name>/route.ts` and export `GET/POST/PUT/DELETE` handlers.
- DB access: import `prisma` from `lib/prisma.ts` and use prisma client methods.
- Run dev: `npm run dev` (Windows users can also run `start-reseller.bat`).

If anything above is unclear or you want additional examples inserted (for example, a specific `route.ts` or common Prisma queries used in this repo), tell me which area to expand.
