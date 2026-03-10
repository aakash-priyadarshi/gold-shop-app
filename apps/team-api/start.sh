#!/bin/sh
set -e

echo "=== Team API Startup ==="
echo "Checking TEAM_DATABASE_URL..."
if [ -z "$TEAM_DATABASE_URL" ]; then
  echo "ERROR: TEAM_DATABASE_URL is not set!"
  exit 1
fi

echo "TEAM_DATABASE_URL is set (length: ${#TEAM_DATABASE_URL})"

echo "Running prisma db push..."
npx prisma db push --schema ./prisma/schema.prisma --skip-generate 2>&1
DB_PUSH_EXIT=$?

if [ $DB_PUSH_EXIT -ne 0 ]; then
  echo "ERROR: prisma db push failed with exit code $DB_PUSH_EXIT"
  echo "Retrying in 5 seconds..."
  sleep 5
  npx prisma db push --schema ./prisma/schema.prisma --skip-generate 2>&1
  DB_PUSH_EXIT=$?
  if [ $DB_PUSH_EXIT -ne 0 ]; then
    echo "ERROR: prisma db push failed again. Starting app anyway..."
  fi
fi

echo "prisma db push completed. Starting server..."
exec node dist/main.js
