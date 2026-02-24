#!/bin/sh
set -e

# Timezone Chile
export TZ=America/Santiago

echo "🔧 Running database migrations..."
cd /app/server

# Run Drizzle migrations (non-fatal if tables already exist)
node dist/db/migrate.js || echo "⚠️  Migrations skipped (tables may already exist)"

echo "🌱 Seeding admin user..."
node dist/db/seed.js || echo "⚠️  Seed skipped (user may already exist)"

echo "🚀 Starting server..."
exec node dist/index-simple.js
