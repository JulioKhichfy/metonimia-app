#!/usr/bin/env sh
# Backup do banco e das mídias em ./backups (rode via cron, ex.: todo dia às 3h).
set -e
cd "$(dirname "$0")/.."
mkdir -p backups
DATA=$(date +%Y-%m-%d)
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" metonimia' | gzip > "backups/banco-$DATA.sql.gz"
docker run --rm -v metonimia-app_uploads:/u:ro -v "$PWD/backups":/b alpine tar czf "/b/uploads-$DATA.tar.gz" -C /u .
find backups -type f -mtime +14 -delete
echo "Backup salvo em backups/ ($DATA)"
