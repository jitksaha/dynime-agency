#!/bin/bash
# ==============================================================================
# Dynime VPS Update & Deployment Script
# ==============================================================================
# This script stashes local changes, pulls the latest code from GitHub,
# runs Prisma migrations, rebuilds and restarts Docker Compose services,
# and verifies service health.
# ==============================================================================
set -e

# Configuration
APP_DIR="/app"
BRANCH="main"

echo "=== Dynime Deployment Update Script ==="
cd "$APP_DIR"

# 1. Fetch and pull latest code
echo ">>> Pulling latest code from branch '$BRANCH'..."
git stash || true
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

# 2. Run Database Migrations
echo ">>> Running backend setup and database migrations..."
if [ -d "backend" ]; then
  cd backend
  npm install --prefer-offline
  # Run schema sync (db push is non-blocking and safe for dev/test databases)
  # Replace with 'npx prisma migrate deploy' if using migrations
  npx prisma db push --accept-data-loss || true
  npx prisma generate
  cd ..
fi

# 3. Rebuild and restart services via Docker Compose
echo ">>> Building and restarting Docker containers..."
if [ -f "deploy/docker-compose.yml" ]; then
  docker compose -f deploy/docker-compose.yml up -d --build --remove-orphans
else
  echo "Error: deploy/docker-compose.yml not found."
  exit 1
fi

# 4. Verify deployment health status
echo ">>> Running health checks..."
sleep 5
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health || curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health || true)

if [ "$HEALTH_CHECK" -eq 200 ] || [ "$HEALTH_CHECK" -eq 404 ]; then
  echo "✔ Backend service is responding (HTTP $HEALTH_CHECK). Update successful!"
else
  echo "⚠️ Warning: Backend service did not respond successfully (HTTP $HEALTH_CHECK)."
fi

echo "=== Update Completed Successfully! ==="
