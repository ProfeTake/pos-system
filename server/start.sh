#!/bin/sh
set -e

echo "🔧 Running database migrations..."
cd /app/server

# If DATABASE_URL is set (Railway Volume), ensure the directory exists
if [ -n "$DATABASE_URL" ]; then
  DB_DIR=$(dirname "$DATABASE_URL")
  mkdir -p "$DB_DIR"
  echo "📂 Using persistent volume: $DATABASE_URL"
fi

# Run migrations (idempotent - safe to run on existing DB)
node dist/db/migrate.js

echo "🌱 Seeding admin user..."
node dist/db/seed.js

echo "🚀 Starting server..."
exec node dist/index-simple.js
