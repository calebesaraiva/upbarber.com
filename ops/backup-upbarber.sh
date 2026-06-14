#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/upbarber/upbarber-backend}"
BACKUP_DIR="${BACKUP_DIR:-/opt/upbarber/backups}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
DB_USER="${DB_USER:-upbarber}"
DB_NAME="${DB_NAME:-upbarber}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

timestamp="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

cd "$APP_DIR"

docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$DB_USER" -d "$DB_NAME" \
  > "$BACKUP_DIR/db-$timestamp.sql"

tar -czf "$BACKUP_DIR/uploads-$timestamp.tar.gz" -C "$APP_DIR" uploads

find "$BACKUP_DIR" -type f -mtime +"$RETENTION_DAYS" \( -name 'db-*.sql' -o -name 'uploads-*.tar.gz' \) -delete

echo "Backup concluido em $BACKUP_DIR (db-$timestamp.sql, uploads-$timestamp.tar.gz)"
