#!/usr/bin/env bash
# Restore a Supabase dump into the self-hosted target Postgres.
set -euo pipefail

: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL is required}"

DUMP_DIR="${DUMP_DIR:-./dumps}"
DUMP_FILE="${1:-$(cat "$DUMP_DIR/latest.txt" 2>/dev/null || true)}"
if [[ -z "${DUMP_FILE:-}" || ! -f "$DUMP_FILE" ]]; then
  echo "[restore] dump file not found. Pass a path or run backup.sh first." >&2
  exit 1
fi

echo "[restore] ensuring auth/storage schemas exist on target"
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -c "CREATE SCHEMA IF NOT EXISTS auth; CREATE SCHEMA IF NOT EXISTS storage;"

echo "[restore] restoring $DUMP_FILE -> target"
pg_restore \
  --no-owner --no-privileges \
  --exit-on-error \
  --dbname="$TARGET_DATABASE_URL" \
  "$DUMP_FILE"

echo "[restore] done"
