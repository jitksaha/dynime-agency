# Dynime Data Migration Scripts

Tooling to move data + files from **Supabase** to **self-hosted Postgres + MinIO**.
All scripts are **non-destructive to the Supabase source** — they only read from it.

## Prerequisites
- `SUPABASE_DB_URL` — Supabase session-pooler connection string (source, read-only use).
- `SUPABASE_SERVICE_ROLE_KEY` + `SUPABASE_URL` — for Storage export.
- `TARGET_DATABASE_URL` — your self-hosted Postgres (destination).
- `postgresql-client` (pg_dump/psql) v16 installed.

## Order of operations
1. `./backup.sh`   — dump the entire Supabase database (schema + data) to `./dumps/`.
2. `./restore.sh`  — restore the dump into `TARGET_DATABASE_URL`.
3. `node export-storage.mjs` — download all Storage buckets, upload into MinIO.
4. `./verify.sh`   — compare per-table row counts between source and target.
5. `./rollback.sh` — drop/restore target to a previous dump if a step fails.

> The source database is never written to. "Rollback" operates on the TARGET only.
