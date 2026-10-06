#!/usr/bin/env sh
# Atualiza o site no servidor com a última versão do GitHub.
set -e
cd "$(dirname "$0")/.."
git pull --ff-only
docker compose up -d --build
docker image prune -f
docker compose ps
