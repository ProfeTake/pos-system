/**
 * Demo Mode Router
 * Mapea cada ruta de la API a fixtures JavaScript ficticios.
 * No realiza ninguna llamada de red para endpoints de negocio.
 */
import { toast } from "sonner";
import { demoProducts } from "./fixtures/products";
import { demoSales } from "./fixtures/sales";
import {
  demoSettings,
  demoCashSession,
  demoCashBalance,
  demoCashMovements,
  demoCustomers,
  demoCustomersStats,
  demoPromotions,
  demoSubscription,
  demoSubscriptionPlans,
  demoStoreUsers,
  demoConfigurations,
  demoAuditLog,
  demoAuditStats,
  demoReturns,
  demoReturnsStats,
  demoSupplierInvoices,
  demoSupplierInvoicesStats,
  demoCategoryThresholds,
  demoAnalyticsMetrics,
  demoSalesTrend,
  demoSalesByHour,
  demoPeriodComparison,
  demoRestockPredictions,
} from "./fixtures/index";

// ─── Tipos internos ───────────────────────────────────────────────────────

interface MockResult {
  data: unknown;
  status: number;
  isMutation: boolean;
}

// ─── Rutas que SIEMPRE pasan al backend real ──────────────────────────────

const PASSTHROUGH_PATTERNS = [
  /^\/api\/auth/,      // login, logout, me
  /^\/api\/health/,    // health check
];

function isPassthrough(path: string): boolean {
  return PASSTHROUGH_PATTERNS.some((re) => re.test(path));
}

// ─── Normaliza la ruta para matching ─────────────────────────────────────

function normalizePath(path: string): string {
  // Quita query string
  return path.split("?")[0].toLowerCase();
}

// ─── Detectar si es mutación ──────────────────────────────────────────────

function isMutation(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

// ─── Resolver respuesta para GETs ─────────────────────────────────────────

function resolveGet(path: string): unknown {

  // Products
  if (path === "/api/products") return demoProducts;
  if (path.startsWith("/api/products/by-barcode/")) {
    const code = path.split("/").pop();
    const found = demoProducts.find((p) => p.barCode === code);
    return found ?? { notFound: true };
  }
  if (path.match(/^\/api\/products\/\d+$/)) {
    const id = parseInt(path.split("/").pop()!);
    return demoProducts.find((p) => p.id === id) ?? { notFound: true };
  }

  // Sales
  if (path === "/api/sales/full" || path === "/api/sales") return demoSales;
  if (path.match(/^\/api\/sales\/\d+$/)) {
    const id = parseInt(path.split("/").pop()!);
    return demoSales.find((s) => s.id === id) ?? { notFound: true };
  }

  // Cash session
  if (path === "/api/cash-session/summary") return demoCashSession;
  if (path === "/api/cash-session/balance") return demoCashBalance;
  if (path === "/api/cash-session") return demoCashSession;

  // Cash movements
  if (path === "/api/cash-movements") return demoCashMovements;

  // Settings
  if (path === "/api/settings") return demoSettings;

  // Promotions
  if (path === "/api/promotions/active") return demoPromotions.filter((p) => p.isActive);
  if (path === "/api/promotions") return demoPromotions;
  if (path.match(/^\/api\/promotions\/\d+$/)) {
    const id = parseInt(path.split("/").pop()!);
    return demoPromotions.find((p) => p.id === id) ?? { notFound: true };
  }

  // Customers
  if (path === "/api/customers") return demoCustomers;
  if (path === "/api/customers/stats") return demoCustomersStats;
  if (path === "/api/customers/debts") return demoCustomers.filter((c) => c.creditUsed > 0);
  if (path.match(/^\/api\/customers\/\d+$/)) {
    const id = parseInt(path.split("/").pop()!);
    return demoCustomers.find((c) => c.id === id) ?? { notFound: true };
  }

  // Subscription
  if (path === "/api/subscription/current") return demoSubscription;
  if (path === "/api/subscription/plans") return demoSubscriptionPlans;

  // Store users
  if (path === "/api/store-users") return demoStoreUsers;

  // Configurations
  if (path === "/api/configurations") return demoConfigurations;
  if (path.startsWith("/api/configurations/")) {
    const ns = path.split("/api/configurations/")[1];
    return (demoConfigurations as Record<string, unknown>)[ns] ?? {};
  }

  // Audit
  if (path === "/api/audit") return { items: demoAuditLog, total: demoAuditLog.length };
  if (path === "/api/audit/stats") return demoAuditStats;

  // Returns
  if (path === "/api/returns") return demoReturns;
  if (path === "/api/returns/stats") return demoReturnsStats;
  if (path.match(/^\/api\/returns\/sale\/\d+$/)) return [];

  // Supplier invoices
  if (path === "/api/supplier-invoices") return demoSupplierInvoices;
  if (path === "/api/supplier-invoices/stats") return demoSupplierInvoicesStats;
  if (path === "/api/supplier-invoices/payments") return [];
  if (path.match(/^\/api\/supplier-invoices\/\d+$/)) {
    const id = parseInt(path.split("/").pop()!);
    return demoSupplierInvoices.find((i) => i.id === id) ?? { notFound: true };
  }

  // Category thresholds
  if (path === "/api/category-thresholds") return demoCategoryThresholds;

  // Analytics
  if (path === "/api/analytics/metrics") return demoAnalyticsMetrics;
  if (path === "/api/analytics/sales-trend") return demoSalesTrend;
  if (path === "/api/analytics/sales-by-hour") return demoSalesByHour;
  if (path === "/api/analytics/period-comparison") return demoPeriodComparison;
  if (path === "/api/analytics/restock-predictions") return demoRestockPredictions;
  if (path.startsWith("/api/analytics")) return {};

  // Fiscal
  if (path.startsWith("/api/fiscal")) return { enabled: false, message: "No disponible en modo demo" };

  // Catch-all
  return {};
}

// ─── Respuesta para mutaciones ────────────────────────────────────────────

function mutationResponse(path: string, method: string, body: string | null | undefined): unknown {
  const p = normalizePath(path);

  // Abrir sesión de caja → devolver sesión ficticia
  if (p === "/api/cash-session/open") return demoCashSession;

  // Cerrar sesión
  if (p === "/api/cash-session/close") return { ...demoCashSession, closeTime: new Date().toISOString() };

  // Crear venta → devolver venta genérica
  if (p === "/api/sales" && method === "POST") {
    let parsedBody: Record<string, unknown> = {};
    try { parsedBody = body ? JSON.parse(body) : {}; } catch {}
    return {
      id: Math.floor(Math.random() * 90000) + 10000,
      ...parsedBody,
      date: new Date().toISOString(),
      status: "completed",
    };
  }

  // Anular venta
  if (p.match(/^\/api\/sales\/\d+\/void/)) return { success: true };

  // Movimientos de caja
  if (p === "/api/cash-movements") {
    let parsedBody: Record<string, unknown> = {};
    try { parsedBody = body ? JSON.parse(body) : {}; } catch {}
    return { id: Date.now(), sessionId: 42, ...parsedBody, createdAt: new Date().toISOString() };
  }

  // Default: éxito genérico
  return { success: true, id: Date.now() };
}

// ─── Función principal exportada ──────────────────────────────────────────

/**
 * Dado una ruta y método HTTP, retorna una respuesta mock o `null` si debe
 * pasar al backend real.
 */
export function getDemoResponse(
  rawPath: string,
  method: string,
  body?: BodyInit | null
): MockResult | null {
  if (isPassthrough(rawPath)) return null;

  const path = normalizePath(rawPath);
  const mutation = isMutation(method);

  if (mutation) {
    // Mostrar aviso al usuario
    toast.info("Modo Demo – los cambios no se guardan", {
      id: "demo-mutation",   // evita spam de toasts duplicados
      duration: 2500,
    });
    return {
      data: mutationResponse(rawPath, method, body as string | null),
      status: 200,
      isMutation: true,
    };
  }

  return {
    data: resolveGet(path),
    status: 200,
    isMutation: false,
  };
}
