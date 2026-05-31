#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."

cleanup() { [ -n "${SRV:-}" ] && kill "$SRV" 2>/dev/null; [ -n "${MIN:-}" ] && kill "$MIN" 2>/dev/null; }
trap cleanup EXIT

echo "[1/3] Starting MinIO..."
MINIO_ROOT_USER=minioadmin MINIO_ROOT_PASSWORD=minioadmin \
  .minio-bin/minio server .minio-data --address ":9000" --console-address ":9001" > /tmp/minio.log 2>&1 &
MIN=$!; sleep 5
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/minio/health/live)
echo "MinIO health: $STATUS"; [ "$STATUS" != "200" ] && echo "MinIO failed" && exit 1

echo "[2/3] Starting backend (bucket bootstrap)..."
export DATABASE_URL="$(node scripts/db-url.mjs)" \
  JWT_ACCESS_SECRET=devsecret JWT_REFRESH_SECRET=devrefresh PORT=3001 NODE_ENV=development \
  MINIO_ENDPOINT=localhost MINIO_PORT=9000 MINIO_USE_SSL=false \
  MINIO_ACCESS_KEY=minioadmin MINIO_SECRET_KEY=minioadmin MINIO_REGION=us-east-1 \
  MINIO_PUBLIC_URL=http://localhost:9000
node dist/main.js > /tmp/nest-mig.log 2>&1 &
SRV=$!; sleep 8
echo "Bucket bootstrap:"; grep -i 'created bucket\|already exists' /tmp/nest-mig.log | head -15

echo "[3/3] Running --execute migration..."
SUPABASE_DB_URL="$SUPABASE_DB_URL" \
  MINIO_ENDPOINT=localhost MINIO_PORT=9000 MINIO_USE_SSL=false \
  MINIO_ACCESS_KEY=minioadmin MINIO_SECRET_KEY=minioadmin MINIO_REGION=us-east-1 \
  node scripts/migrate-storage.mjs --execute 2>&1

echo "=== DONE ==="
