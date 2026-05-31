---
name: Supabase → NestJS migration (Dynime)
description: Environment quirks and decisions for migrating this repo off Supabase to self-hosted NestJS/Prisma/MinIO/Redis.
---

# Dynime Supabase → self-hosted migration

## Context / decisions
- Replit is DEV ONLY. Production target is self-hosted Docker (Postgres, Redis, MinIO, NestJS, Nginx). Do NOT introduce Replit-specific services into the backend code.
- Strategy: strangler-fig. NestJS (`/backend`) runs ALONGSIDE Supabase; during parallel run the backend talks to the SAME Supabase Postgres (via pooler) so there's one source of truth. Frontend `src/` is untouched until each domain's seam is flipped behind an env feature-flag. Supabase removed last.
- Per the user: show exact files/tables/components before each module and WAIT for approval. No data/table deletion.
- New code lives in `/backend` (NestJS+Prisma), `/deploy` (Docker/compose/nginx), `/migration` (backup/restore/verify/rollback + storage export), `/docs`.

## Environment quirks (non-obvious, cost time)
- **Supabase direct DB host is IPv6-only** (`db.<ref>.supabase.co:5432`) → unreachable from Replit (IPv4 only). MUST use the **session pooler** (`aws-*.pooler.supabase.com:5432`, user `postgres.<ref>`), found via the **Connect** button at top of the Supabase dashboard.
- **DB password contains special chars** (`@`, `!`) → breaks URL parsing. `backend/scripts/db-url.mjs` parses `SUPABASE_DB_URL` and URL-encodes the password; psql via keyword form also works. Never store the encoded URL in a file.
- **Prisma engines may not download** on `npm install` here → `Cannot find module '@prisma/engines'`. Fix: `npm install @prisma/engines` explicitly.
- Introspection needs **multiSchema** + `schemas = ["public","auth","storage"]` (cross-schema FK `public.* -> auth.users`). Result: 123 public + 32 auth + 9 storage = 153 models.

## Prisma migration boundary (important)
- The introspected schema is a READ-ONLY BASELINE. Do NOT run `prisma migrate` against legacy Supabase tables (RLS/expression indexes/check constraints/triggers not represented → destructive). Use Prisma as a typed query client; new schema changes go through reviewed SQL in `/migration`.

## Auth note
- Preserve `auth.users` bcrypt hashes on import so existing logins keep working (use bcryptjs to verify). Don't force resets.

## Module order (each = own approval checkpoint)
Users → Auth → Storage → KYC → KYB → AML → Orders → Transactions → Notifications → Admin → (Payments, FlexPay, CRM, HR/ATS, SEO, Email).
