# Bilbohammer Web Guide

Use this file for work inside `bilbohammer/web`.

## Stack

- Next.js 14 App Router, React 18 and TypeScript.
- Prisma ORM with PostgreSQL.
- NextAuth v5 using JWT sessions and Prisma-backed users.
- Tailwind CSS and project-owned UI components.
- Direct uploads to Cloudflare R2 through presigned URLs.

## Main References

- Project setup and env reference: `../README.md`.
- Functional behavior and roles: `../MANUAL_FUNCIONAL.md`.
- Backlog: `docs/backlog/README.md`.
- AI rules: `docs/ai/README.md`.
- R2 upload details: `docs/r2-uploads.md`.

## Code Conventions

- Keep auth and role checks centralized in `src/lib/roles.ts` and route-level guards where they already exist.
- Prefer server-side validation with Zod or explicit checks in API routes.
- Do not introduce local filesystem uploads for new features; use the R2 upload flow.
- Preserve existing UI language and club tone unless the task explicitly changes design direction.
- Avoid broad refactors while implementing feature work.

## Commands

```powershell
npm run dev
npm run lint
npm run build
npm run migration:guards
npx prisma generate
npx prisma migrate dev --name <name>
```

Use `npm`, not another package manager, because the repo has `package-lock.json`.

## Data And Migrations

- Prisma schema lives in `prisma/schema.prisma`.
- Seeds live in `prisma/seed.ts` and `prisma/seed.production.ts`.
- Migration guards live under `scripts/migration-guards.ts` and run via `npm run migration:guards`.
- Do not change production-like data assumptions without documenting the risk in the related backlog task.

## Script Boundary

- `scripts/` belongs to the web app operational surface.
- Do not put Codex-only helpers in this folder.
- If an automation is needed only for AI workflow, document it under `docs/ai` first and ask before adding executable tooling.
