# Single-stage build — optimizado para Railway (bajo RAM)
FROM node:18-alpine

# tzdata para TZ=America/Santiago
RUN apk add --no-cache tzdata
ENV TZ=America/Santiago

WORKDIR /app

# ── 1. Build frontend ──────────────────────────────────────────────────────
COPY package*.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund && npm cache clean --force

COPY index.html vite.config.ts tsconfig.json ./
COPY src/ ./src/
RUN NODE_OPTIONS="--max-old-space-size=384" npm run build

# Limpiar fuentes y dependencias del frontend (libera RAM/disco)
RUN rm -rf node_modules src index.html vite.config.ts tsconfig.json package*.json

# ── 2. Build backend ───────────────────────────────────────────────────────
COPY server/ ./server/
WORKDIR /app/server
RUN npm ci --ignore-scripts --no-audit --no-fund && npm cache clean --force
RUN NODE_OPTIONS="--max-old-space-size=384" npm run build

# Limpiar fuentes TypeScript del backend (solo dejamos dist/)
RUN rm -rf src/ tsconfig.json drizzle.config.ts

# ── 3. Runtime ─────────────────────────────────────────────────────────────
WORKDIR /app/server

# Copiar drizzle config de vuelta (necesario en runtime para migraciones)
COPY server/drizzle.config.ts ./drizzle.config.ts

COPY server/start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 3002

CMD ["./start.sh"]
