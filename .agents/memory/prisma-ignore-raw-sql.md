---
name: Prisma @@ignore models — raw SQL required
description: Prisma models without a valid unique identifier get @@ignore and are excluded from the generated client; they require $queryRaw.
---

## Rule
Any Prisma model that lacks a `@id` or `@@id` field is marked `@@ignore` by Prisma introspection and is NOT available as `prisma.<model>`. TypeScript will report `Property '<model>' does not exist on type 'PrismaService'`.

**Why:** Prisma Client requires a unique identifier to support upsert/update operations; without one it excludes the model from the typed client entirely.

## How to apply
Use `$queryRaw` (or `$executeRaw`) for these tables:

```ts
// ❌ won't compile — dynime_employees has @@ignore
this.prisma.dynime_employees.findMany(...)

// ✅ use raw SQL instead
this.prisma.$queryRaw<any[]>`SELECT ... FROM dynime_employees`
```

## Known @@ignore tables in Dynime schema (public)
- `dynime_employees` — no primary key
- `dynime_kpi_monthly` — no primary key
- `dynime_leave_records` — no primary key (also has RLS)

Check for others with: `grep "@@ignore" backend/prisma/schema.prisma`
