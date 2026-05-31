#!/usr/bin/env bash
# Dump the entire Supabase database (schema + data) — READ ONLY on the source.
set -euo pipefail

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"

DUMP_DIR="${DUMP_DIR:-./dumps}"
STAMP="$(date +%Y%m%d_%H%M%S)"
mkdir -p "$DUMP_DIR"

# Build a URL-safe connection string (handles special chars in the password).
CONN="$(SUPABASE_DB_URL="$SUPABASE_DB_URL" node "$(dirname "$0")/../backend/scripts/db-url.mjs")"

echo "[backup] dumping roles-free schema+data to $DUMP_DIR/dynime_${STAMP}.dump"
pg_dump "$CONN" \
  --no-owner --no-privileges \
  --schema=public --schema=auth --schema=storage \
  --format=custom \
  --file="$DUMP_DIR/dynime_${STAMP}.dump"

# Also keep a plain-SQL copy for inspection / partial restores.
pg_dump "$CONN" \
  --no-owner --no-privileges \
  --schema=public --schema=auth --schema=storage \
  --format=plain \
  --file="$DUMP_DIR/dynime_${STAMP}.sql"

echo "[backup] done -> $DUMP_DIR/dynime_${STAMP}.dump"
echo "$DUMP_DIR/dynime_${STAMP}.dump" > "$DUMP_DIR/latest.txt"
