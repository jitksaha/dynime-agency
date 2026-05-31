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

## Storage module (Module 3) — durable decisions
- Self-hosted MinIO (S3-compatible) replaces Supabase Storage; 11 buckets mirrored 1:1 by name. Only `portfolio` + `site-assets` are public (anonymous GET via bucket policy); other 9 are private (presigned GET only, default TTL 300s).
- Authz is a small rule engine (primitives: public / authenticated / roles / owner). **owner = first path segment of object key === user.id.** Fine-grained per-domain authz is intentionally deferred to each domain module's cutover; storage is just the foundation. Bucket policies live in `storage.constants.ts` (visibility, allowedMime, maxBytes, signedUrlTtlSec, read/write rules).
- **Upload DoS guard:** Multer `FileInterceptor` MUST set `limits.fileSize` (= GLOBAL_MAX_UPLOAD_BYTES = max of all bucket caps, 25MB) BEFORE buffering; per-bucket size check still runs in the service. MulterError is mapped in AllExceptionsFilter (`name==='MulterError'`): LIMIT_FILE_SIZE→413, else→400 (otherwise it's a plain Error → 500). **Why:** without an interceptor limit, the whole multipart body buffers into memory before the service's size check, so a huge payload exhausts memory.
- Key validation rejects empty / absolute (`/`) / traversal (`..`) / backslash / >1024 chars. Validation failures on upload/signed_url/stat/download are audited as `validation_failed` via `validateKeyAudited()` before rethrow.
- Audit (`app_storage_audit_log`) must cover: upload, download, signed_url, public_url, list, stat, access_denied, validation_failed. Audit writes are best-effort (try/catch + warn) so storage ops never fail on audit errors; FK user_id → auth.users is ON DELETE SET NULL.
- MinioService bootstraps buckets + public policies on init **best-effort** (app still boots if MinIO is down).
- Migration script `backend/scripts/migrate-storage.mjs` is **report-only by default** (READ-ONLY enumerate of `storage.objects`); `--execute` copies to MinIO + records in `app_storage_migration_map` (idempotent). NEVER modifies/deletes Supabase. Frontend storage seam flip is a separate later cutover.
- File inventory (as of migration): only 2 of 11 buckets hold data — job-applications (246 obj, ~57MB, private) + site-assets (9 obj, ~8MB, public) = 255 obj / ~65MB.
- Local live-test harness: download MinIO binary to `backend/.minio-bin/` (gitignored); start MinIO + boot backend + run curl tests ALL IN ONE shell (backgrounded procs die between separate bash tool calls). Mint test JWTs with the dev secret via `jsonwebtoken`; register a REAL throwaway user first so audit FK resolves, then clean up (delete audit rows + auth.users row).
