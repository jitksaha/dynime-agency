#!/usr/bin/env bash
# Dynime Database Migration Script: Supabase -> Local PostgreSQL
set -euo pipefail

# Check if SUPABASE_DB_URL is set
if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "Error: SUPABASE_DB_URL environment variable is not set."
  echo "Please set it before running this script, e.g.:"
  echo "export SUPABASE_DB_URL=\"postgresql://postgres.isweduliawwjqwhyvwhp:[PASSWORD]@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres\""
  exit 1
fi

LOCAL_DB_URL="postgresql://jitkumarsaha@localhost:5432/dynime_db"
DUMP_FILE="/tmp/dynime_supabase_migration.dump"

echo "========================================================"
echo " Starting Database Data Migration from Supabase to Local"
echo "========================================================"

# 1. Generate URL-safe connection string for Supabase (handles special characters in password)
echo "[1/4] Safely generating connection URL for Supabase..."
cd "$(dirname "$0")/.."
SUPABASE_SAFE_URL=$(SUPABASE_DB_URL="$SUPABASE_DB_URL" node scripts/db-url.mjs)

# 2. Dump schemas from Supabase
echo "[2/4] Dumping data from Supabase (public, auth, storage schemas)..."
pg_dump "$SUPABASE_SAFE_URL" \
  --no-owner --no-privileges \
  --schema=public --schema=auth --schema=storage \
  --format=custom \
  --file="$DUMP_FILE"

echo "✔ Successfully dumped data to $DUMP_FILE."

# 3. Recreate target schemas on local database
echo "[3/4] Resetting schemas in local database..."
psql "$LOCAL_DB_URL" -c "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS auth CASCADE; DROP SCHEMA IF EXISTS storage CASCADE;"
psql "$LOCAL_DB_URL" -c "CREATE SCHEMA public; CREATE SCHEMA auth; CREATE SCHEMA storage;"

# 4. Restore dump into local database
echo "[4/4] Restoring Supabase dump into local database..."
pg_restore \
  --no-owner --no-privileges \
  --dbname="$LOCAL_DB_URL" \
  "$DUMP_FILE"

echo "========================================================"
echo "✔ Migration Complete! Parity Check Report:"
echo "========================================================"

# Print table counts from local database
psql "$LOCAL_DB_URL" -t -c "
SELECT schemaname||'.'||relname AS tbl, n_live_tup AS rows
FROM pg_stat_user_tables
WHERE schemaname IN ('public','auth','storage') AND n_live_tup > 0
ORDER BY 1;
"

# Clean up temp file
rm -f "$DUMP_FILE"
echo "========================================================"
