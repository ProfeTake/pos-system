# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy frontend package files and install (limit memory for Railway)
COPY package*.json ./
RUN NODE_OPTIONS="--max-old-space-size=512" npm install --prefer-offline --no-audit --no-fund

# Copy frontend source and build
COPY index.html vite.config.ts tsconfig.json ./
COPY src/ ./src/
RUN NODE_OPTIONS="--max-old-space-size=512" npm run build

# Stage 2: Build backend
FROM node:18-alpine AS backend-builder

WORKDIR /app

# Copy server package files and install dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --prefer-offline --no-audit --no-fund

# Copy server source code and compile TypeScript
COPY server/ ./
RUN npm run build

# Stage 3: Production
FROM node:18-alpine

# Instalar tzdata para que TZ=America/Santiago funcione en Alpine
RUN apk add --no-cache tzdata

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

# Copy startup script
COPY server/start.sh ./start.sh
RUN chmod +x ./start.sh

# Timezone Chile para que Date() use hora local correcta
ENV TZ=America/Santiago

EXPOSE 3002

CMD ["./start.sh"]
