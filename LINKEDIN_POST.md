# Post LinkedIn — POS System SaaS

---

## 🚀 Construí un sistema POS completo desde cero — aquí el stack y las decisiones técnicas

Durante los últimos meses desarrollé un **sistema de punto de venta (POS) multi-tenant SaaS** orientado al retail chileno, desde el primer commit hasta producción en Railway.

---

### ¿Qué hace el sistema?

- **Gestión de inventario** con alertas de stock bajo y búsqueda por código de barras (EAN-8/EAN-13)
- **Registro de ventas** con carrito, múltiples métodos de pago y emisión de boletas
- **Sesiones de caja** con apertura/cierre, movimientos y cuadre de diferencias
- **Analíticas de ventas** con tendencias, comparativas por período y predicciones de reposición
- **Gestión de clientes** con historial de compras, puntos de fidelidad y crédito
- **Promociones** configurables: 2x1, descuento por categoría, bundles
- **Facturación de proveedores** con control de pagos parciales
- **Devoluciones** trazables con motivo y método de reembolso
- **Registro de auditoría** completo de todas las acciones del sistema
- **Suscripciones por tiers** (Gratis / Básico / Profesional / Empresarial) con límites aplicados en el servidor
- **Modo Demo público** — el visitante navega el sistema completo con datos ficticios sin tocar la base de datos

---

### Stack tecnológico

**Frontend**
- React 18 + TypeScript
- Vite (build tool, HMR, code splitting)
- Tailwind CSS + shadcn/ui + Radix UI
- React Window (virtualización para listas de 10.000+ productos)
- Sonner (toasts)
- Vitest + React Testing Library

**Backend**
- Node.js + Express 5
- TypeScript
- Drizzle ORM (query builder type-safe)
- MySQL (Railway managed)
- JWT para autenticación, bcrypt para contraseñas
- SSE (Server-Sent Events) para sincronización en tiempo real entre pestañas
- Helmet + Rate Limiting + CORS

**Infraestructura**
- Railway (frontend estático + backend + MySQL en el mismo proyecto)
- GitHub → deploy automático en cada push a `master`
- Docker para builds reproducibles

---

### Decisiones técnicas que me parecen interesantes

**1. Mock layer 100% frontend para el modo demo**
El usuario `demo` se autentica contra la BD real (JWT legítimo), pero desde ese momento todas las llamadas a la API son interceptadas en una sola función (`apiFetch`) y resueltas con fixtures JS estáticos. El backend nunca recibe tráfico de negocio del usuario demo. Sin MSW, sin dependencias extra.

**2. SSE en lugar de WebSockets**
Los cambios de inventario y estado de caja se propagan a todas las pestañas abiertas via Server-Sent Events. Unidireccional, suficiente para este caso de uso, sin overhead de WebSocket.

**3. Drizzle ORM sobre Prisma**
Queries type-safe sin magia — el SQL generado es predecible, los esquemas son TypeScript puro, y las migraciones son archivos `.sql` que puedo auditar manualmente.

**4. Context API sin Redux**
Estado global solo para auth y estado de caja. El resto se maneja localmente en los componentes o se refresca vía SSE. Sin boilerplate de reducers para un dominio bien acotado.

---

### Lo que viene

- Catálogo colaborativo de productos con IA (Claude Haiku + OpenFoodFacts)
- Aislamiento real de BD por tenant (database-per-tenant)
- App móvil para ventas rápidas en terreno

---

Si trabajas en retail, gastronómica o cualquier negocio que necesite un POS moderno y asequible, escríbeme.

Y si eres dev y quieres ver el código o el sistema en vivo, también conversamos 👇

#React #TypeScript #NodeJS #SaaS #POS #Railway #Drizzle #OpenSource #Chile #Desarrollo
