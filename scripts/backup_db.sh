#!/bin/bash
set -eo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/db"
LOG_TAG="[tec360-backup]"
ENV_FILE="/opt/tec360-seguridad/.env.production"
REMOTE_HOST="10.0.1.56"
REMOTE_USER="ubuntu"
REMOTE_DIR="/opt/backups/rose_diamond"
SSH_KEY="/home/ubuntu/.ssh/id_rsa_perla"

echo "$(date) $LOG_TAG Starting PostgreSQL backup..."

mkdir -p "$BACKUP_DIR"

if [ -f "$ENV_FILE" ]; then
    DB_USER=$(grep -E '^DB_USER=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"\r')
    DB_PASSWORD=$(grep -E '^DB_PASSWORD=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"\r')
    DB_NAME=$(grep -E '^DB_NAME=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"\r')
fi

DB_USER=${DB_USER:-tec360}
DB_NAME=${DB_NAME:-tec360}

if [ -z "$DB_PASSWORD" ]; then
    echo "$(date) $LOG_TAG ERROR: DB_PASSWORD could not be found in $ENV_FILE" >&2
    exit 1
fi

DUMP_FILE="$BACKUP_DIR/tec360_db_${TIMESTAMP}.sql.gz"

# Dump and compress PostgreSQL DB
docker exec -e PGPASSWORD="$DB_PASSWORD" tec360_db pg_dump -h localhost -U "$DB_USER" "$DB_NAME" | gzip -9 > "$DUMP_FILE"

FILE_SIZE=$(stat -c%s "$DUMP_FILE" 2>/dev/null || stat -f%z "$DUMP_FILE" 2>/dev/null)
if [ "$FILE_SIZE" -lt 5120 ]; then
    echo "$(date) $LOG_TAG ERROR: Dump file $DUMP_FILE is too small (${FILE_SIZE} bytes), backup may have failed!" >&2
    exit 1
fi

echo "$(date) $LOG_TAG Backup successful: $DUMP_FILE (${FILE_SIZE} bytes)"

# Retain last 7 days locally
find "$BACKUP_DIR" -name "tec360_db_*.sql.gz" -type f -mtime +7 -delete
echo "$(date) $LOG_TAG Local retention applied (kept last 7 days)"

# Replicate to Perla over private VCN (0 cost)
if [ -f "$SSH_KEY" ]; then
    echo "$(date) $LOG_TAG Replicating to Perla ($REMOTE_HOST)..."
    scp -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$DUMP_FILE" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/" || {
        echo "$(date) $LOG_TAG WARNING: Failed to replicate to Perla, local backup preserved." >&2
    }
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=10 "${REMOTE_USER}@${REMOTE_HOST}" \
        "find $REMOTE_DIR -name 'tec360_db_*.sql.gz' -type f -mtime +14 -delete" 2>/dev/null || true
    echo "$(date) $LOG_TAG Remote replication completed"
fi

echo "$(date) $LOG_TAG Backup process finished successfully."
