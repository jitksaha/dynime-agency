#!/bin/bash
# ==============================================================================
# Dynime Automated Restore Script
# ==============================================================================
# This script:
# 1. Lists available backups from Google Drive (via rclone) or local storage.
# 2. Prompts the user to select a backup to restore.
# 3. Downloads and extracts the backup.
# 4. Restores the database (PostgreSQL or MySQL) after parsing DATABASE_URL.
# 5. Restores the website files to the active project root.
# ==============================================================================

set -e

BACKUP_DIR="/tmp/dynime-backups"
RESTORE_TEMP="/tmp/dynime-restore-extract"

echo "=== Starting Dynime Restore System ==="

# 1. Resolve Project Root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Verify rclone is available
RCLONE_AVAILABLE=false
if command -v rclone >/dev/null 2>&1 && rclone listremotes | grep -q "^gdrive:"; then
  RCLONE_AVAILABLE=true
fi

# 2. List Available Backups
echo ">>> Scanning for backups..."
declare -a BACKUPS
index=1

if [ "$RCLONE_AVAILABLE" = true ]; then
  echo ">>> Fetching backups from Google Drive (gdrive:Dynime-Backups/daily/)..."
  # Read list into array
  while IFS= read -r line; do
    if [ -n "$line" ]; then
      BACKUPS[index]="$line"
      echo "  [$index] REMOTE: $line"
      index=$((index + 1))
    fi
  done < <(rclone lsf gdrive:Dynime-Backups/daily/ | grep "dynime-backup-")
else
  echo "⚠️ Google Drive (rclone) not configured. Checking local backups in $BACKUP_DIR..."
fi

# Add local backups to the list
if [ -d "$BACKUP_DIR" ]; then
  while IFS= read -r line; do
    if [ -n "$line" ]; then
      # Check if already added
      duplicate=false
      for b in "${BACKUPS[@]}"; do
        if [ "$b" = "$line" ]; then
          duplicate=true
          break
        fi
      done
      if [ "$duplicate" = false ]; then
        BACKUPS[index]="$line"
        echo "  [$index] LOCAL:  $line"
        index=$((index + 1))
      fi
    fi
  done < <(ls "$BACKUP_DIR" | grep "dynime-backup-.*\.tar\.gz")
fi

TOTAL_BACKUPS=$((index - 1))

if [ "$TOTAL_BACKUPS" -eq 0 ]; then
  echo "❌ No backups found. Please run backup.sh first."
  exit 1
fi

# 3. User Selection
if [ -n "$1" ]; then
  SELECTED_FILE="$1"
  echo ">>> Using backup file specified in argument: $SELECTED_FILE"
else
  echo ""
  read -p "Select backup number to restore (1-$TOTAL_BACKUPS): " selection
  
  if ! [[ "$selection" =~ ^[0-9]+$ ]] || [ "$selection" -lt 1 ] || [ "$selection" -gt "$TOTAL_BACKUPS" ]; then
    echo "❌ Invalid selection."
    exit 1
  fi
  
  SELECTED_FILE="${BACKUPS[$selection]}"
fi

# 4. Download and Extract Backup
mkdir -p "$BACKUP_DIR"
LOCAL_ARCHIVE_PATH="$BACKUP_DIR/$SELECTED_FILE"

# If file is not local, download it from Google Drive
if [ ! -f "$LOCAL_ARCHIVE_PATH" ] && [ "$RCLONE_AVAILABLE" = true ]; then
  echo ">>> Downloading $SELECTED_FILE from Google Drive..."
  rclone copy gdrive:Dynime-Backups/daily/"$SELECTED_FILE" "$BACKUP_DIR"
  echo "✔ Download complete."
fi

if [ ! -f "$LOCAL_ARCHIVE_PATH" ]; then
  echo "❌ Error: Backup file $SELECTED_FILE not found locally and could not be downloaded."
  exit 1
fi

echo ">>> Extracting backup files..."
rm -rf "$RESTORE_TEMP"
mkdir -p "$RESTORE_TEMP"
tar -xzf "$LOCAL_ARCHIVE_PATH" -C "$RESTORE_TEMP"
echo "✔ Files extracted to temporary directory."

# 5. Restore Database
DB_DUMP_FILE=$(find "$RESTORE_TEMP" -maxdepth 1 -name "database-*.sql" | head -n 1)

if [ -n "$DB_DUMP_FILE" ] && [ -f "$DB_DUMP_FILE" ]; then
  echo ""
  echo "⚠️ WARNING: A database dump is included in this backup."
  echo "   Restoring the database will overwrite all current tables and data!"
  read -p "Do you want to restore the database? (y/n): " confirm_db
  
  if [ "$confirm_db" = "y" ] || [ "$confirm_db" = "Y" ]; then
    # Load env from extracted backup or active project
    if [ -f "$RESTORE_TEMP/.env" ]; then
      source "$RESTORE_TEMP/.env"
    elif [ -f "$PROJECT_ROOT/.env" ]; then
      source "$PROJECT_ROOT/.env"
    fi
    
    if [ -n "$DATABASE_URL" ]; then
      # Parse DATABASE_URL
      PROTOCOL=$(echo "$DATABASE_URL" | grep -oE "^[a-zA-Z0-9]+")
      STRIPPED="${DATABASE_URL#*://}"
      USER_PASS="${STRIPPED%%@*}"
      HOST_PORT_DB="${STRIPPED#*@}"
      DB_USER="${USER_PASS%%:*}"
      DB_PASS="${USER_PASS#*:}"
      HOST_PORT="${HOST_PORT_DB%%/*}"
      DB_NAME="${HOST_PORT_DB#*/}"
      DB_NAME="${DB_NAME%%\\?*}"
      DB_HOST="${HOST_PORT%%:*}"
      DB_PORT="${HOST_PORT#*:}"
      if [ "$DB_PORT" = "$DB_HOST" ]; then
        if [ "$PROTOCOL" = "postgresql" ] || [ "$PROTOCOL" = "postgres" ]; then
          DB_PORT=5432
        else
          DB_PORT=3306
        fi
      fi

      # PostgreSQL Restore
      if [ "$PROTOCOL" = "postgresql" ] || [ "$PROTOCOL" = "postgres" ]; then
        echo ">>> Restoring PostgreSQL Database..."
        export PGPASSWORD="$DB_PASS"
        if command -v psql >/dev/null 2>&1; then
          psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$DB_DUMP_FILE"
          echo "✔ Database restored successfully."
        else
          echo "❌ Error: psql utility not found. Please install postgresql-client."
        fi
        unset PGPASSWORD

      # MySQL Restore
      elif [ "$PROTOCOL" = "mysql" ]; then
        echo ">>> Restoring MySQL Database..."
        if command -v mysql >/dev/null 2>&1; then
          mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$DB_DUMP_FILE"
          echo "✔ Database restored successfully."
        else
          echo "❌ Error: mysql utility not found."
        fi
      else
        echo "⚠️ Database protocol $PROTOCOL is not supported for automatic restore."
      fi
    else
      echo "❌ Error: DATABASE_URL is not set in env variables. Database restore skipped."
    fi
  else
    echo ">>> Database restore skipped by user."
  fi
else
  echo ">>> No database dump found in backup archive."
fi

# 6. Restore Project Files
echo ""
echo "⚠️ WARNING: Restoring website files will replace your current files."
read -p "Do you want to restore active website files? (y/n): " confirm_files

if [ "$confirm_files" = "y" ] || [ "$confirm_files" = "Y" ]; then
  echo ">>> Copying files to project root..."
  
  # Copy files while preserving local git state and build modules
  rsync -av --exclude=".git" --exclude="node_modules" --exclude="backend/node_modules" "$RESTORE_TEMP/" "$PROJECT_ROOT/"
  
  echo "✔ Files copied successfully."
else
  echo ">>> File restore skipped by user."
fi

# 7. Cleanup
echo ">>> Cleaning up temporary restore files..."
rm -rf "$RESTORE_TEMP"
echo "✔ Cleanup completed."

echo "=== Restore Process Completed Successfully! ==="
