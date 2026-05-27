# Data And Migration Rules

- Treat Prisma schema changes as high risk until migration and seed behavior are checked.
- Add a migration for schema changes unless the task explicitly targets prototyping only.
- Review `prisma/seed.ts` after schema changes.
- Review `prisma/seed.production.ts` when auth, admin user creation or required production defaults change.
- Use `scripts/migration-guards.ts` for preflight checks that protect existing data.
- Do not silently delete or reinterpret existing records.

## Naming

- Use descriptive migration names: `npx prisma migrate dev --name <feature_or_fix>`.
- Prefer stable enum and field names that match business language in the functional manual.

## Backlog

If a migration requires a product decision or manual cleanup, record it in `docs/backlog`.
