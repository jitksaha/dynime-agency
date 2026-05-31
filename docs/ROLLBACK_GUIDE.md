# Dynime — Rollback Guide

Every migration phase is reversible. Supabase stays the source of truth until the
final cutover, so rollback is always possible.

## Principles
- **Source is never written to.** All migration scripts only read from Supabase.
- **Frontend cutover is flag-gated.** Each domain points at NestJS via an env
  feature-flag; reverting the flag restores Supabase behavior instantly.
- **Target DB is restorable** from any dump produced by `migration/backup.sh`.

## A. Roll back a frontend module cutover
1. Set the module's feature flag back to `supabase` (e.g. `VITE_USE_API_USERS=false`).
2. Rebuild/redeploy the frontend. The app resumes using Supabase for that domain.
3. No data changes required — both backends share the same data during parallel run.

## B. Roll back a data load into the target Postgres
```bash
cd migration
TARGET_DATABASE_URL=postgresql://... ./rollback.sh   # drops & recreates schemas (TARGET only)
TARGET_DATABASE_URL=postgresql://... ./restore.sh dumps/<known-good>.dump
```

## C. Roll back the whole backend
Because the backend is additive (`/backend`, `/deploy`, `/migration`), you can
stop the Docker stack and the original Supabase-backed frontend continues to work
unchanged. Removing those directories fully reverts to the pre-migration state.

## D. Verify after any rollback
```bash
cd migration && ./verify.sh        # row-count parity (source vs target)
curl -s https://yourdomain.com/api/v1/health
```

## Phase-by-phase reversal summary
| Phase | Rollback action |
|---|---|
| 0 Foundations | delete `/backend`, `/deploy`, `/migration` |
| Data load | `rollback.sh` then `restore.sh <good dump>` |
| Module cutover | flip feature flag to `supabase`, redeploy frontend |
| Supabase removal (final) | restore previous frontend build + re-enable Supabase keys |
