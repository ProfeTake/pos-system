# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy frontend package files and install
COPY package*.json ./
RUN npm install

# Copy frontend source and build
COPY index.html vite.config.ts tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Stage 2: Build backend
FROM node:18-alpine AS backend-builder

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

# Stage 3: Production
FROM node:18-alpine

# Install runtime dependency for better-sqlite3
RUN apk add --no-cache libstdc++

WORKDIR /app/server

# Copy backend built files and dependencies
COPY --from=backend-builder /app/server/dist ./dist
COPY --from=backend-builder /app/server/node_modules ./node_modules
COPY --from=backend-builder /app/server/package.json ./package.json

# Copy drizzle schema/migrations
COPY --from=backend-builder /app/server/drizzle ./drizzle
COPY --from=backend-builder /app/server/drizzle.config.ts ./drizzle.config.ts

# Copy frontend build output (served by Express in production)
COPY --from=frontend-builder /app/dist ../frontend

EXPOSE 3002

CMD ["node", "dist/index-simple.js"]
