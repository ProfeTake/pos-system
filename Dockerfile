# Stage 1: Build
FROM node:18-alpine AS builder

# Install build tools needed for better-sqlite3 (native C++ addon)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy server package files and install dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install

# Copy server source code and compile TypeScript
COPY server/ ./
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

# Install runtime dependency for better-sqlite3
RUN apk add --no-cache libstdc++

WORKDIR /app/server

# Copy built files and production dependencies from builder
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/server/package.json ./package.json

# Copy drizzle schema/migrations (needed for db:push at runtime)
COPY --from=builder /app/server/drizzle ./drizzle
COPY --from=builder /app/server/drizzle.config.ts ./drizzle.config.ts

EXPOSE 3002

CMD ["node", "dist/index-simple.js"]
