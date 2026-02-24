#!/bin/sh
set -e

echo "🔧 Running database migrations..."
cd /app/server

# Run Drizzle migrations against MySQL
node dist/db/migrate.js

echo "🌱 Seeding admin user..."
node dist/db/seed.js

echo "🚀 Starting server..."
exec node dist/index-simple.js
