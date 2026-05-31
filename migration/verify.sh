#!/usr/bin/env bash
# Compare per-table row counts between Supabase (source) and target Postgres.
set -euo pipefail

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"
: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL is required}"

SRC="$(SUPABASE_DB_URL="$SUPABASE_DB_URL" node "$(dirname "$0")/../backend/scripts/db-url.mjs")"

COUNT_SQL="SELECT schemaname||'.'||relname AS tbl, n_live_tup AS rows
           FROM pg_stat_user_tables
           WHERE schemaname IN ('public','auth','storage')
           ORDER BY 1;"

echo "[verify] collecting source counts..."
psql "$SRC" -At -F',' -c "$COUNT_SQL" | sort > /tmp/src_counts.csv
echo "[verify] collecting target counts..."
psql "$TARGET_DATABASE_URL" -At -F',' -c "$COUNT_SQL" | sort > /tmp/tgt_counts.csv

echo "[verify] diff (source vs target) — empty output means identical:"
if diff /tmp/src_counts.csv /tmp/tgt_counts.csv; then
  echo "[verify] ✅ row counts match across all tables"
else
  echo "[verify] ⚠️  differences found above (left=source, right=target)" >&2
  exit 1
fi
