#!/bin/bash
# ==============================================================================
# Dynime Automated Backup Script
# ==============================================================================
# This script:
# 1. Loads database and configuration settings from the .env file.
# 2. Automatically detects the database type (PostgreSQL or MySQL).
# 3. Creates a database dump (using pg_dump or mysqldump).
# 4. Compresses site files, configurations, and the database dump.
# 5. Uploads the compressed backup to Google Drive using rclone.
# 6. Cleans up local backups older than 7 days.
# ==============================================================================

set -e

# Configuration
BACKUP_DIR="/tmp/dynime-backups"
KEEP_DAYS=7
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_NAME="dynime-backup-$TIMESTAMP"
ARCHIVE_PATH="$BACKUP_DIR/$BACKUP_NAME.tar.gz"

echo "=== Starting Dynime Automated Backup ==="

# 1. Resolve Project Root and Load Environment Variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Try loading .env from project root or backend folder
if [ -f "$PROJECT_ROOT/.env" ]; then
  source "$PROJECT_ROOT/.env"
  ENV_PATH="$PROJECT_ROOT/.env"
elif [ -f "$PROJECT_ROOT/backend/.env" ]; then
  source "$PROJECT_ROOT/backend/.env"
  ENV_PATH="$PROJECT_ROOT/backend/.env"
else
  echo "⚠️ Warning: .env file not found. Database backup may be skipped."
fi

mkdir -p "$BACKUP_DIR"

# 2. Extract database connection parameters from DATABASE_URL
DB_DUMP_FILE="$BACKUP_DIR/database-$TIMESTAMP.sql"
DB_BACKED_UP=false

if [ -n "$DATABASE_URL" ]; then
  echo ">>> Parsing DATABASE_URL..."
  
  # Extract connection parameters using regex
  # Format: protocol://user:password@host:port/dbname
  PROTOCOL=$(echo "$DATABASE_URL" | grep -oE "^[a-zA-Z0-9]+")
  
  # Strip protocol
  STRIPPED="${DATABASE_URL#*://}"
  
  # Split user:password and host:port/dbname
  USER_PASS="${STRIPPED%%@*}"
  HOST_PORT_DB="${STRIPPED#*@}"
  
  # Split user and password
  DB_USER="${USER_PASS%%:*}"
  DB_PASS="${USER_PASS#*:}"
  
  # Split host:port and dbname
  HOST_PORT="${HOST_PORT_DB%%/*}"
  DB_NAME="${HOST_PORT_DB#*/}"
  
  # Strip query parameters if any (e.g. ?sslmode=require)
  DB_NAME="${DB_NAME%%\?*}"
  
  # Split host and port
  DB_HOST="${HOST_PORT%%:*}"
  DB_PORT="${HOST_PORT#*:}"
  if [ "$DB_PORT" = "$DB_HOST" ]; then
    # No port specified, use defaults
    if [ "$PROTOCOL" = "postgresql" ] || [ "$PROTOCOL" = "postgres" ]; then
      DB_PORT=5432
    else
      DB_PORT=3306
    fi
  fi

  # Perform PostgreSQL Backup
  if [ "$PROTOCOL" = "postgresql" ] || [ "$PROTOCOL" = "postgres" ]; then
    echo ">>> Detected PostgreSQL database. Running pg_dump..."
    export PGPASSWORD="$DB_PASS"
    if command -v pg_dump >/dev/null 2>&1; then
      pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F p -f "$DB_DUMP_FILE"
      DB_BACKED_UP=true
      echo "✔ PostgreSQL database backed up successfully."
    else
      echo "❌ Error: pg_dump utility not found. Please install postgresql-client."
    fi
    unset PGPASSWORD

  # Perform MySQL Backup
  elif [ "$PROTOCOL" = "mysql" ]; then
    echo ">>> Detected MySQL database. Running mysqldump..."
    if command -v mysqldump >/dev/null 2>&1; then
      mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" > "$DB_DUMP_FILE"
      DB_BACKED_UP=true
      echo "✔ MySQL database backed up successfully."
    else
      echo "❌ Error: mysqldump utility not found."
    fi
  else
    echo "⚠️ Unsupported database protocol: $PROTOCOL. Database backup skipped."
  fi
else
  echo "⚠️ DATABASE_URL not set in env. Database backup skipped."
fi

# 3. Create Compressed Archive
echo ">>> Archiving website files, database dump, and environment files..."
cd "$PROJECT_ROOT"

# Create backup archive excluding heavy build & cache files to save space
tar -czf "$ARCHIVE_PATH" \
  --exclude="node_modules" \
  --exclude=".git" \
  --exclude="dist" \
  --exclude="backend/node_modules" \
  --exclude="backend/dist" \
  --exclude=".replit" \
  --exclude=".agents" \
  --exclude=".config" \
  -C "$PROJECT_ROOT" . \
  -C "$BACKUP_DIR" "$(basename "$DB_DUMP_FILE")"

# Remove temporary raw sql file
if [ -f "$DB_DUMP_FILE" ]; then
  rm "$DB_DUMP_FILE"
fi

echo "✔ Archive created at $ARCHIVE_PATH ($(du -sh "$ARCHIVE_PATH" | cut -f1))"

# 4. Upload to Google Drive via Rclone
if command -v rclone >/dev/null 2>&1; then
  # Check if 'gdrive' remote is configured
  if rclone listremotes | grep -q "^gdrive:"; then
    echo ">>> Uploading backup to Google Drive (gdrive:Dynime-Backups/daily/)..."
    rclone copy "$ARCHIVE_PATH" gdrive:Dynime-Backups/daily/
    echo "✔ Backup uploaded to Google Drive successfully."
  else
    echo "⚠️ Warning: Rclone remote 'gdrive' is not configured. Google Drive upload skipped."
    echo "   Configure it using 'rclone config' or save backups locally."
  fi
else
  echo "⚠️ Warning: rclone is not installed. Google Drive upload skipped."
fi

# 5. Cleanup Local Backups older than KEEP_DAYS
echo ">>> Cleaning up local backups older than $KEEP_DAYS days..."
find "$BACKUP_DIR" -name "dynime-backup-*.tar.gz" -mtime +$KEEP_DAYS -exec rm {} \;
echo "✔ Cleanup completed."

echo "=== Backup Process Completed Successfully! ==="
