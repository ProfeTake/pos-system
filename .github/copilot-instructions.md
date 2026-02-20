# POS System - AI Agent Instructions

## Project Overview
Full-stack multi-tenant SaaS Point-of-Sale system for retail (botillería). React + TypeScript frontend with Express backend, SQLite (Drizzle ORM), deployed to Railway. Features real-time inventory sync, cash register sessions, subscription tiers, and AI-powered product cataloging.

## Architecture

### Monorepo Structure
- **Root (`/`)**: Frontend React app (Vite, TypeScript)
- **`/server`**: Backend Express API with SQLite database

### Multi-Tenant Design
- **Current**: Single-tenant SQLite with `tenantId` column prepared in schema
- **Planned**: Database-per-tenant isolation (see `ARQUITECTURA_SAAS.md`)
- Middleware: `server/src/middlewares/tenant.middleware.ts` extracts tenant from subdomain/header

### Database (Drizzle ORM)
- **Schema**: `server/drizzle/schema.ts` - SQLite tables with integer timestamps (Unix epoch)
- **Migrations**: `server/drizzle/NNNN_*.sql` - Applied via `npm run db:push` in server/
- **Key Tables**: `products`, `sales`, `users`, `cash_sessions`, `subscription_plans`, `audit_log`
- All foreign keys use `onDelete: "cascade"` for referential integrity

### Permission System
Granular permission checks via `server/src/middlewares/permissions.middleware.ts`:
- **Roles**: `superadmin`, `admin`, `manager`, `cashier`, `vendedor` (legacy)
- **Check Pattern**: `requirePermission(PERMISSIONS.PRODUCTS_CREATE)` in route middlewares
- **Permissions Cache**: 5-minute TTL to reduce DB queries
- Predefined roles in `server/db/schema-multitenant.ts`

### Subscription Tiers
Four plans enforced server-side (see `SISTEMA_SAAS_IMPLEMENTADO.md`):
- **Gratis**: 50 products, 2 users, 100 sales/month
- **Básico**: 500/5/1,000 - $19,990/month
- **Profesional**: 5,000/15/10,000 - $49,990/month  
- **Empresarial**: Unlimited - $99,990/month

Middlewares: `checkProductLimit`, `checkUserLimit`, `checkSaleLimit`, `requireFeature`
Returns 403 with `upgradeRequired: true` when limits hit.

## Development Workflows

### Running Locally
```powershell
# Frontend (port 5173)
npm run dev

# Backend (port 3002)
cd server
npm run dev

# Both concurrently
npm run dev:all
```

### Testing
```powershell
# Frontend tests (Vitest + React Testing Library)
npm run test           # Run once
npm run test:watch     # Watch mode
npm run test:coverage  # Coverage report

# Test config: vitest.config.ts, setup: src/tests/setup.ts
```

### Database Operations
```powershell
cd server

# Apply schema changes (push to SQLite)
npm run db:push

# Seed admin user (username: admin, generates temp password)
npm run db:seed:admin

# Seed sample data (products, sales)
npm run db:seed:sample

# Reset database (requires --force flag)
npm run db:reset -- --force

# Open Drizzle Studio
npm run db:studio
```

### Building
```powershell
# Frontend build (outputs to dist/)
npm run build

# Backend build (TypeScript -> dist/)
cd server && npm run build && npm start
```

## Key Patterns & Conventions

### API Client (`src/lib/api.ts`)
Centralized fetch wrapper with auto-auth token injection:
```typescript
import { apiFetchJSON } from '@/lib/api';

// Automatically adds Bearer token, handles errors
const products = await apiFetchJSON<Product[]>('/api/products');
```
- Production: Uses `/system-v2-internal` path obfuscation + `X-API-Key` header
- Dev: `http://localhost:3002/api/*`
- Environment: `VITE_API_BASE` for custom backend URL

### Real-Time Updates (SSE)
Server-Sent Events for live sync across browser tabs:
- **Endpoint**: `GET /api/events` (no auth required, streams JSON events)
- **Frontend Hook**: `useInitialData()` subscribes to `productUpdate`, `saleCreated`, etc.
- **Usage**: Sidebar cart indicators, inventory auto-refresh, cash session sync

### Custom Hooks Convention
All hooks in `src/hooks/` with clear JSDoc:
- **`useCart()`**: Shopping cart state (add/remove/update, stock validation)
- **`useAuth()`**: Auth context (login/logout, user state, token storage)
- **`useInitialData()`**: Data fetching with SSE subscriptions
- **`useMandatoryCashSession()`**: Enforces open cash register for sales

### Component Organization
```
src/components/
├── common/       # Reusable: BarcodeScanner, SearchBox
├── features/     # Business domains: auth/, cart/, inventory/, sales/
├── layout/       # AppLayout, Sidebar
└── ui/           # Shadcn/Radix primitives: Button, Input, Dialog
```

**Feature Component Pattern**: Self-contained modules (e.g., `features/inventory/InventoryTable.tsx` handles own state, API calls, virtualization)

### Virtualization for Large Lists
Use `react-window` for >100 items (see `src/components/features/inventory/InventoryTable.tsx`):
```tsx
import { FixedSizeList } from 'react-window';
// Renders only visible rows, critical for 10K+ products
```

### State Management
Context API + custom hooks (no Redux):
- **Global**: `AuthContext` (`auth-context.tsx`), `CashStatusContext`
- **Local**: useState/useReducer in components
- **Server State**: Direct fetch in hooks, invalidated via SSE events

### Error Handling
- Backend returns `{ error: string, code?: string }` on failures
- Frontend uses `toast.error()` (Sonner) for user feedback
- Validation: Zod schemas in `src/lib/schemas.ts` (sync with backend types)

## Critical Features

### Cash Register Sessions
Required for all sales:
1. Open session: `POST /api/cash-session/open` (initial cash amount)
2. Record movements: `POST /api/cash-movements` (type: entrada/salida/venta)
3. Close session: `POST /api/cash-session/close` (declared vs. system calculated difference)

Frontend enforces via `useMandatoryCashSession()` hook.

### Product Cataloging (Collaborative + AI)
Multi-tier barcode lookup system with collaborative catalog:

**Architecture:**
1. **Collaborative Catalog** (`product_catalog` table): Shared database of products across all tenants
   - First tenant to add a product → Searches OpenFoodFacts or uses Claude Haiku AI
   - Subsequent tenants → Get instant results from catalog (free, <0.1s)
   - Grows organically with each business using the system

2. **Data Sources (in order):**
   - Collaborative catalog (instant, free, grows over time)
   - OpenFoodFacts API (1-2s, free, international products)
   - Claude Haiku 3.5 + Eltit scraping (3-5s, ~$0.009/product, Chilean products)
   - Manual entry (fallback if not found)

**When AI is Used:**
- Only triggered when adding new products (`POST /api/products`)
- Not used during sales/checkout (reads from local inventory)
- Results cached permanently for all tenants

**Future Monetization:**
- Public API endpoint for product data
- Can be sold to other retail systems, delivery apps, e-commerce platforms
- Revenue model: Tiered pricing based on API calls/month

**Current Endpoints:**
- `POST /api/products/catalog/lookup` - Smart lookup with AI fallback
- `GET /api/products/lookup/:barcode` - OpenFoodFacts only (legacy)

### Audit Logging
Auto-tracked actions in `audit_log` table:
- Middleware: `server/src/middlewares/audit.middleware.ts`
- Captures: user, action, entity type, old/new values (JSON), IP, timestamp
- UI: Admin panel shows filterable log

### Analytics (Partially Disabled)
`Dashboard.tsx` shows "Analytics deshabilitado" - backend endpoint removed.
**To Re-enable**: Implement `GET /api/analytics` returning sales KPIs.

## Production Deployment

### Railway (Current)
1. Push to GitHub main branch (auto-deploys)
2. Environment variables in Railway dashboard:
   - `NODE_ENV=production`
   - `JWT_SECRET=<generate-strong-secret>`
   - `VITE_API_KEY=<custom-header-secret>`
3. Separate services: frontend (`npm run build` -> static) + backend (`cd server && npm start`)

**Docs**: `DEPLOY-FACIL.md`, `RAILWAY-DEPLOYMENT.md`

### Security Measures
- **Rate Limiting**: `rateLimiting.middleware.ts` (10 req/min for sensitive endpoints)
- **Helmet**: HTTP headers hardening
- **Password Hashing**: bcrypt (10 rounds)
- **API Key**: Production-only `X-API-Key` header validation
- **CORS**: Whitelist localhost + production domain

## Common Tasks

### Adding a New Route
1. Controller: `server/src/controllers/<feature>.controller.ts`
2. Route: `server/src/routes/<feature>.routes.ts` with middleware chain
3. Register in `server/src/index-simple.ts`: `app.use('/api/<feature>', <feature>Routes)`
4. Add permission checks: `requirePermission(PERMISSIONS.<ACTION>)`

### Adding a Subscription Feature
1. Add feature flag in `server/db/schema-multitenant.ts` plan features
2. Gate endpoint with `requireFeature('advanced_analytics')`
3. Update frontend `SubscriptionManagement.tsx` feature list

### Database Schema Changes
1. Edit `server/drizzle/schema.ts`
2. Generate migration: `cd server && npm run db:push` (creates SQL in drizzle/)
3. Commit both schema.ts and generated SQL
4. Production: Run `db:push` on Railway via shell or CI

## Gotchas & Known Issues

- **No WebSockets**: Real-time uses SSE (one-way), sufficient for current needs.
- **Barcode Collision**: System assumes unique barcodes; manual verification needed for duplicates.
- **Tenant Isolation**: `tenantId` columns exist but multi-tenant routing not active (see roadmap).
- **Date Handling**: All timestamps are Unix epoch integers; use `new Date(timestamp * 1000)` in frontend.
- **AI Cataloging**: Currently only OpenFoodFacts is implemented; Chilean retailers scraping and Claude AI validation are planned for future releases.

## Key Files to Reference

- **API Types**: `src/types/index.ts` (shared interfaces: Product, Sale, User)
- **Permissions**: `server/db/schema-multitenant.ts` (PERMISSIONS const, role definitions)
- **Product Catalog**: `product_catalog` table (collaborative, shared across tenants)
- **Local Inventory**: `products` table (tenant-specific, includes stock/prices)
- **Migration History**: `server/drizzle/meta/_journal.json` (applied migrations log)
- **Vite Config**: `vite.config.ts` (chunk splitting, Radix UI aliases)
- **Test Setup**: `src/tests/setup.ts` (jsdom globals, mock localStorage)

## Documentation

- `ARQUITECTURA_SAAS.md` - Full SaaS architecture plan, migration roadmap
- `SISTEMA_SAAS_IMPLEMENTADO.md` - Subscription system implementation details
- `MAPA_CONFIGURACION.md` - All configuration settings reference
- `DEPLOY-FACIL.md` - Railway deployment quick guide

## Tips for AI Agents

1. **Always check subscription limits** when adding create/update endpoints (use `check*Limit` middlewares).
2. **Preserve permission checks** - every protected route needs `authenticateToken` + `requirePermission`.
3. **Use SSE for real-time**, not polling - follow `events.controller.ts` pattern.
4. **Validate with Zod schemas** - reuse from `src/lib/schemas.ts`, keep sync with backend.
5. **Test with seed data** - `npm run db:seed:sample` creates realistic test data.
6. **Frontend hot-reload requires backend running** - API calls fail silently without `npm run dev:all`.
7. **Barcode format** - Standard EAN-8/EAN-13 format for OpenFoodFacts lookup.
8. **Catalog vs Inventory** - `product_catalog` is shared (read-only for lookups), `products` is tenant-specific (full CRUD).
9. **AI costs** - Claude Haiku calls cost ~$0.009 per product; only use when adding new products, never in sales flow.
