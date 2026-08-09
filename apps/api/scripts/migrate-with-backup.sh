#!/usr/bin/env bash
# Strict local/ops wrapper: backup → migrate deploy. Aborts if backup fails.
set -euo pipefail
cd "$(dirname "$0")/.."
chmod +x scripts/pre-migrate-backup.sh
./scripts/pre-migrate-backup.sh
echo "::notice::Running prisma migrate deploy..."
npx prisma migrate deploy
echo "::notice::Migration complete."
