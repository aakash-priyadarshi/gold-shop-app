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

# Prefer pg_dump from PATH; install PG 17 client if missing or too old for Neon (PG 17)
if ! command -v pg_dump >/dev/null 2>&1; then
  echo "::notice::Installing postgresql-client-17 for pg_dump..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq postgresql-client-17 || sudo apt-get install -y -qq postgresql-client
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
