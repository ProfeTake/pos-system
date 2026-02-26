/**
 * Demo Mode Router
 * Mapea cada ruta de la API al DemoStore mutable en memoria.
 * Las mutaciones (POST/PUT/DELETE) modifican el store y se reflejan en los GETs.
 * Cero llamadas al backend real (excepto /api/health).
 */
import { toast } from "sonner";
import { demoStore } from "./store";
import {
  demoSettings,
  demoSubscription,
  demoSubscriptionPlans,
  demoStoreUsers,
  demoConfigurations,
  demoAuditLog,
  demoAuditStats,
  demoReturns,
  demoReturnsStats,
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
  /^\/api\/health/,
];

/** Verifica si una ruta debe pasar al backend real (true = NO interceptar). */
export function shouldPassThrough(path: string): boolean {
  const clean = path.split("?")[0].toLowerCase();
  return PASSTHROUGH_PATTERNS.some((re) => re.test(clean));
}

// ─── Usuario demo ficticio ───────────────────────────────────────────────

const demoAuthUser = {
  user: {
    id: 99,
    username: "demo",
    email: "demo@botilleria-eltonel.cl",
    role: "vendedor",
    fullName: "Usuario Demo",
    tenantId: "demo-tenant",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────

function normalizePath(path: string): string {
  return path.split("?")[0].toLowerCase();
}

function isMutationMethod(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

function parseBody(body: string | null | undefined): any {
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    return {};
  }
}

/** Asegura que el store esté inicializado */
function ensureStore() {
  if (!demoStore.ready) {
    demoStore.init();
  }
}

// ─── Resolver GETs (leen del store mutable) ───────────────────────────────

function resolveGet(path: string): unknown {
  ensureStore();

  // Auth
  if (path === "/api/auth/me") return demoAuthUser;
  if (path === "/api/auth/login") return demoAuthUser;
  if (path === "/api/auth/logout") return { success: true };

  // Products
  if (path === "/api/products") return demoStore.products;
  if (path.startsWith("/api/products/by-barcode/")) {
    const code = path.split("/").pop();
    const found = demoStore.getProductByBarcode(code || "");
    return found ?? { notFound: true };
  }
  if (path.startsWith("/api/products/google-search")) return { notFound: true };
  if (path.match(/^\/api\/products\/\d+$/)) {
    const id = parseInt(path.split("/").pop()!);
    return demoStore.getProduct(id) ?? { notFound: true };
  }
  if (path.startsWith("/api/products/")) return { notFound: true };

  // Sales
  if (path === "/api/sales/full" || path === "/api/sales") return demoStore.sales;
  if (path.match(/^\/api\/sales\/\d+$/)) {
    const id = parseInt(path.split("/").pop()!);
    return demoStore.sales.find((s) => s.id === id) ?? { notFound: true };
  }

  // Cash session
  if (path === "/api/cash-session/summary") {
    return demoStore.cashSession
      ? { ...demoStore.cashSession, open: demoStore.cashSession.isOpen }
      : { open: false };
  }
  if (path === "/api/cash-session/balance") return demoStore.cashBalance;
  if (path === "/api/cash-session") return demoStore.cashSession;

  // Cash movements
  if (path === "/api/cash-movements" || path === "/api/cash-movements/current")
    return demoStore.cashMovements;

  // Settings
  if (path === "/api/settings") return demoSettings;
  if (path === "/api/settings/cash-session/check-shift")
    return {
      isNewShift: false,
      hasActiveSession: !!demoStore.cashSession?.isOpen,
      reason: "Demo mode",
    };

  // Promotions
  if (path === "/api/promotions/active")
    return demoStore.promotions.filter((p: any) => p.isActive);
  if (path === "/api/promotions") return demoStore.promotions;
  if (path.match(/^\/api\/promotions\/\d+$/)) {
    const id = parseInt(path.split("/").pop()!);
    return demoStore.promotions.find((p: any) => p.id === id) ?? { notFound: true };
  }

  // Customers
  if (path === "/api/customers") return demoStore.customers;
  if (path === "/api/customers/stats") {
    return {
      total: demoStore.customers.length,
      active: demoStore.customers.filter((c: any) => c.active).length,
      totalDebt: demoStore.customers.reduce((s: number, c: any) => s + (c.creditUsed || 0), 0),
      totalLoyaltyPoints: demoStore.customers.reduce((s: number, c: any) => s + (c.loyaltyPoints || 0), 0),
    };
  }
  if (path === "/api/customers/debts")
    return demoStore.customers.filter((c: any) => c.creditUsed > 0);
  if (path.match(/^\/api\/customers\/\d+$/)) {
    const id = parseInt(path.split("/").pop()!);
    return demoStore.customers.find((c: any) => c.id === id) ?? { notFound: true };
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
  if (path === "/api/supplier-invoices") return demoStore.supplierInvoices;
  if (path === "/api/supplier-invoices/stats") return demoSupplierInvoicesStats;
  if (path === "/api/supplier-invoices/payments") return [];
  if (path.match(/^\/api\/supplier-invoices\/\d+$/)) {
    const id = parseInt(path.split("/").pop()!);
    return demoStore.supplierInvoices.find((i: any) => i.id === id) ?? { notFound: true };
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

  // Product catalog/lookup (no OpenFoodFacts en demo)
  if (path.startsWith("/api/products/catalog")) return { notFound: true };
  if (path.startsWith("/api/products/lookup")) return { notFound: true };

  // Fiscal
  if (path.startsWith("/api/fiscal"))
    return { enabled: false, message: "No disponible en modo demo" };

  // Events (SSE) - return empty
  if (path === "/api/events") return {};

  // Catch-all
  return {};
}

// ─── Resolver mutaciones (escriben en el store mutable) ───────────────────

function resolveMutation(path: string, method: string, body: string | null | undefined): unknown {
  ensureStore();
  const p = normalizePath(path);
  const data = parseBody(body);

  // ── Auth ───────────────────────────────────────────────────────────
  if (p === "/api/auth/login") return { token: "demo-fake-jwt-token", user: demoAuthUser.user };
  if (p === "/api/auth/logout") return { success: true };

  // ── Products ───────────────────────────────────────────────────────
  if (p === "/api/products" && method === "POST") {
    return demoStore.addProduct(data);
  }
  if (p.match(/^\/api\/products\/\d+$/) && method === "PUT") {
    const id = parseInt(p.split("/").pop()!);
    return demoStore.updateProduct(id, data) ?? { success: true };
  }
  if (p.match(/^\/api\/products\/\d+$/) && method === "DELETE") {
    const id = parseInt(p.split("/").pop()!);
    demoStore.deleteProduct(id);
    return { success: true };
  }
  if (p.match(/^\/api\/products\/\d+\/estado/)) {
    const id = parseInt(p.split("/")[3]);
    return demoStore.updateProduct(id, { estado: data.estado }) ?? { success: true };
  }

  // ── Sales ──────────────────────────────────────────────────────────
  if (p === "/api/sales" && method === "POST") {
    return demoStore.addSale(data);
  }
  if (p.match(/^\/api\/sales\/\d+\/void/)) {
    const id = parseInt(p.split("/")[3]);
    return demoStore.voidSale(id);
  }

  // ── Cash Session ───────────────────────────────────────────────────
  if (p === "/api/cash-session/open") {
    return demoStore.openCashSession(data);
  }
  if (p === "/api/cash-session/close") {
    return demoStore.closeCashSession(data);
  }

  // ── Cash Movements ─────────────────────────────────────────────────
  if (p === "/api/cash-movements") {
    return demoStore.addCashMovement(data);
  }

  // ── Customers ──────────────────────────────────────────────────────
  if (p === "/api/customers" && method === "POST") {
    return demoStore.addCustomer(data);
  }
  if (p.match(/^\/api\/customers\/\d+$/) && method === "PUT") {
    const id = parseInt(p.split("/").pop()!);
    return demoStore.updateCustomer(id, data) ?? { success: true };
  }
  if (p.match(/^\/api\/customers\/\d+$/) && method === "DELETE") {
    const id = parseInt(p.split("/").pop()!);
    demoStore.deleteCustomer(id);
    return { success: true };
  }

  // ── Promotions ─────────────────────────────────────────────────────
  if (p === "/api/promotions" && method === "POST") {
    return demoStore.addPromotion(data);
  }
  if (p.match(/^\/api\/promotions\/\d+$/) && method === "PUT") {
    const id = parseInt(p.split("/").pop()!);
    return demoStore.updatePromotion(id, data) ?? { success: true };
  }
  if (p.match(/^\/api\/promotions\/\d+$/) && method === "DELETE") {
    const id = parseInt(p.split("/").pop()!);
    demoStore.deletePromotion(id);
    return { success: true };
  }

  // ── Settings / Configurations ──────────────────────────────────────
  if (p.startsWith("/api/configurations") || p.startsWith("/api/settings")) {
    return { success: true };
  }

  // ── Supplier invoices ──────────────────────────────────────────────
  if (p === "/api/supplier-invoices" && method === "POST") {
    const invoice = { id: Date.now(), ...data, createdAt: new Date().toISOString() };
    demoStore.supplierInvoices.push(invoice);
    return invoice;
  }

  // ── Returns ────────────────────────────────────────────────────────
  if (p === "/api/returns" && method === "POST") {
    return { id: Date.now(), ...data, status: "completed", createdAt: new Date().toISOString() };
  }

  // ── Catch-all éxito ────────────────────────────────────────────────
  return { success: true, id: Date.now() };
}

// ─── Función principal exportada ──────────────────────────────────────────

export function getDemoResponse(
  rawPath: string,
  method: string,
  body?: BodyInit | null
): MockResult | null {
  if (shouldPassThrough(rawPath)) return null;

  const path = normalizePath(rawPath);
  const mutation = isMutationMethod(method);

  if (mutation) {
    const result = resolveMutation(path, method.toUpperCase(), body as string | null);
    toast.info("Modo Demo – cambios guardados solo en esta sesión", {
      id: "demo-mutation",
      duration: 2500,
    });
    return {
      data: result,
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
