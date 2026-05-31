#!/usr/bin/env bash
# Roll the TARGET database back to a clean state and re-restore a chosen dump.
# Never touches the Supabase source.
set -euo pipefail

: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL is required}"

echo "[rollback] This will DROP and recreate public/auth/storage schemas on the TARGET."
read -r -p "Type the target DB name to confirm: " CONFIRM
TARGET_DB="$(psql "$TARGET_DATABASE_URL" -At -c "SELECT current_database();")"
if [[ "$CONFIRM" != "$TARGET_DB" ]]; then
  echo "[rollback] confirmation mismatch ($CONFIRM != $TARGET_DB). Aborting." >&2
  exit 1
fi

psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
DROP SCHEMA IF EXISTS auth CASCADE;
DROP SCHEMA IF EXISTS storage CASCADE;
CREATE SCHEMA public;
CREATE SCHEMA auth;
CREATE SCHEMA storage;
SQL

echo "[rollback] target schemas reset. Re-run ./restore.sh <dump> to restore a known-good dump."
