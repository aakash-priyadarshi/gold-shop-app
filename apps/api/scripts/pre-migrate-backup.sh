#!/usr/bin/env bash
# Strict pre-migration backup: dump production DB → R2, then allow migrate.
# Fails hard if backup cannot be created. Keeps last 7 backups (shared with BackupService).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "::error::DATABASE_URL is required for pre-migration backup"
  exit 1
fi

if [[ -z "${R2_ACCOUNT_ID:-}" || -z "${R2_ACCESS_KEY_ID:-}" || -z "${R2_SECRET_ACCESS_KEY:-}" ]]; then
  echo "::error::R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) are required"
  exit 1
fi

BUCKET="${R2_BUCKET_NAME:-backups}"
ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
DATE_STR="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
FILE_NAME="pre-migrate-db-backup-${DATE_STR}.sql"
TMP_DIR="$(mktemp -d)"
FILE_PATH="${TMP_DIR}/${FILE_NAME}"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "::notice::Creating pre-migration backup: ${FILE_NAME}"

# Neon production runs PostgreSQL 17 — ensure pg_dump major version matches.
sudo apt-get update -qq
sudo apt-get install -y -qq postgresql-client-17 2>/dev/null || \
  sudo apt-get install -y -qq postgresql-client-17 2>/dev/null || true
if [[ -x /usr/lib/postgresql/17/bin/pg_dump ]]; then
  export PATH="/usr/lib/postgresql/17/bin:${PATH}"
fi
if ! command -v pg_dump >/dev/null 2>&1; then
  echo "::error::pg_dump not found after installing postgresql-client-17"
  exit 1
fi
PG_DUMP_VERSION="$(pg_dump --version | grep -oE '[0-9]+' | head -1)"
if [[ "${PG_DUMP_VERSION}" -lt 17 ]]; then
  echo "::error::pg_dump version ${PG_DUMP_VERSION} is too old for PostgreSQL 17 server"
  exit 1
fi

pg_dump --clean --if-exists --no-owner --dbname="$DATABASE_URL" > "$FILE_PATH"
SIZE_BYTES="$(wc -c < "$FILE_PATH" | tr -d ' ')"
if [[ "$SIZE_BYTES" -lt 1000 ]]; then
  echo "::error::Backup file looks empty/corrupt (${SIZE_BYTES} bytes)"
  exit 1
fi
echo "::notice::pg_dump OK (${SIZE_BYTES} bytes). Uploading to R2..."

export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="auto"

aws s3 cp "$FILE_PATH" "s3://${BUCKET}/${FILE_NAME}" --endpoint-url "$ENDPOINT"

echo "::notice::Uploaded s3://${BUCKET}/${FILE_NAME}"

# Retention: keep newest 7 .sql backups (same policy as BackupService)
mapfile -t KEYS < <(aws s3api list-objects-v2 \
  --bucket "$BUCKET" \
  --endpoint-url "$ENDPOINT" \
  --query "reverse(sort_by(Contents[?ends_with(Key, '.sql')], &LastModified))[].Key" \
  --output text 2>/dev/null | tr '\t' '\n' | sed '/^$/d' || true)

if [[ "${#KEYS[@]}" -gt 7 ]]; then
  for key in "${KEYS[@]:7}"; do
    echo "::notice::Deleting stale backup: $key"
    aws s3 rm "s3://${BUCKET}/${key}" --endpoint-url "$ENDPOINT" || true
  done
fi

echo "::notice::Pre-migration backup complete. Safe to run prisma migrate deploy."
