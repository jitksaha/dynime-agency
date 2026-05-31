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

## Auth module (Module 2) — durable decisions
- Refresh tokens: server-side, opaque random, stored as SHA-256 hash; family-based rotation with reuse/theft detection (replaying a revoked token revokes whole family).
- **Rotation must be atomic**: claim the old row with a compare-and-set (`updateMany WHERE id=? AND revoked_at IS NULL`) BEFORE minting the successor. A zero-count claim means concurrent rotation → treat as reuse and revoke the family. **Why:** read-then-update let two concurrent refreshes both mint valid descendants, defeating single-use/theft detection.
- Auth error messages must be generic externally (banned users get "Invalid email or password", not "Account is suspended") to avoid account-status enumeration; record the real reason only in app_auth_audit_log.
- Password-reset token: stateless JWT signed with `accessSecret + ':' + encrypted_password` so it self-invalidates once the password changes; reset revokes all sessions. Raw token is logged ONLY when env !== 'production' (real delivery deferred to Email module). Never log it in prod.
- Audit coverage must include failures: token_refresh_failure (unknown/expired), token_reuse_detected, password_reset_request with {found:true|false}.
