#!/usr/bin/env bash
# Nightly PostgreSQL backup for the self-hosted stack. Writes a gzipped dump to
# ./backups and prunes anything older than 14 days.
#
# Schedule it with cron (run `crontab -e` and add):
#   0 2 * * * /path/to/repo/deploy/backup.sh >> /var/log/cober-backup.log 2>&1
#
# NOTE on data residency: keep these dumps inside Ethiopia. If you copy them
# off-box, use a location your compliance rules allow.
set -euo pipefail

cd "$(dirname "$0")/.."           # repo root (where .env and the compose file live)
set -a; . ./.env; set +a          # load POSTGRES_USER / POSTGRES_DB

mkdir -p backups
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="backups/db-${STAMP}.sql.gz"

docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$OUT"

find backups -name 'db-*.sql.gz' -mtime +14 -delete
echo "backup written: $OUT"
