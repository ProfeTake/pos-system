#!/bin/sh
set -e

echo "🔧 Running database migrations..."
cd /app/server

# Fresh DB each deploy (SQLite in container is ephemeral anyway)
# Remove stale DB to avoid partial migration conflicts
if [ -f db.sqlite ]; then
  echo "🗑️  Removing stale database for clean migration..."
  rm -f db.sqlite db.sqlite-wal db.sqlite-shm
fi

# Run migrations
node dist/db/migrate.js

echo "🌱 Seeding admin user..."
node dist/db/seed.js

echo "🚀 Starting server..."
exec node dist/index-simple.js
