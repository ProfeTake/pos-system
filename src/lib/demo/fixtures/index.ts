// ─── Todos los fixtures secundarios para el modo Demo ───────────────────────
// Botillería El Tonel — Santiago, Chile
import { demoSales } from "./sales";
import { demoProducts } from "./products";

// ── Configuración de la tienda ────────────────────────────────────────────

export const demoSettings = {
  storeName: "Botillería El Tonel",
  storeAddress: "Av. Irarrázaval 4521, Ñuñoa, Santiago",
  storePhone: "+56 2 2345 6789",
  storeEmail: "eltonel@ejemplo.cl",
  currency: "CLP",
  taxRate: 19,
  lowStockAlert: true,
  receiptFooter: "¡Gracias por su preferencia! Venta solo a mayores de 18 años.",
  timezone: "America/Santiago",
  language: "es-CL",
  openTime: "10:00",
  closeTime: "23:00",
  workDays: [1, 2, 3, 4, 5, 6], // lunes a sábado
};

// ── Sesión de caja activa ──────────────────────────────────────────────────

const today = new Date(2026, 1, 25, 9, 15, 0); // 25 Feb 2026, 09:15

export const demoCashSession = {
  id: 42,
  userId: 99,
  openTime: today.toISOString(),
  closeTime: null,
  initialCash: 50000,
  finalCash: null,
  declaredCash: null,
  difference: null,
  notes: "Apertura matinal",
  windowOpen: new Date(2026, 1, 25, 10, 0, 0).toISOString(),
  windowClose: new Date(2026, 1, 25, 23, 0, 0).toISOString(),
  isOpen: true,
  // Campos calculados del summary
  totalSales: demoSales
    .filter((s) => s.date.toDateString() === new Date(2026, 1, 25).toDateString())
    .reduce((sum, s) => sum + s.total, 0),
  cashBalance:
    50000 +
    demoSales
      .filter(
        (s) =>
          s.date.toDateString() === new Date(2026, 1, 25).toDateString() &&
          s.paymentMethod === "efectivo"
      )
      .reduce((sum, s) => sum + s.total, 0),
  salesCount: demoSales.filter(
    (s) => s.date.toDateString() === new Date(2026, 1, 25).toDateString()
  ).length,
};

export const demoCashBalance = {
  balance: demoCashSession.cashBalance,
  initialCash: 50000,
  movements: [],
};

// ── Movimientos de caja ───────────────────────────────────────────────────

export const demoCashMovements = [
  {
    id: 1,
    sessionId: 42,
    type: "entrada",
    amount: 50000,
    reason: "Apertura de caja",
    description: "Efectivo inicial para cambios",
    createdAt: today.toISOString(),
    paymentMethod: "efectivo",
  },
  {
    id: 2,
    sessionId: 42,
    type: "salida",
    amount: 5000,
    reason: "Compra de bolsas",
    description: "Bolsas plásticas para despacho",
    createdAt: new Date(2026, 1, 25, 11, 30).toISOString(),
    paymentMethod: "efectivo",
  },
];

// ── Clientes ──────────────────────────────────────────────────────────────

export const demoCustomers = [
  {
    id: 1,
    name: "Pedro Soto",
    email: "pedro.soto@correo.cl",
    phone: "+56 9 1234 5678",
    rut: "12.345.678-9",
    address: "Los Aromos 234, Santiago",
    creditLimit: 50000,
    creditUsed: 0,
    loyaltyPoints: 1240,
    totalPurchases: 42,
    totalSales: 185000,
    lastPurchase: new Date(2026, 1, 23).toISOString(),
    notes: "Cliente frecuente. Prefiere Escudo.",
    active: true,
    createdAt: new Date(2025, 6, 10).toISOString(),
  },
  {
    id: 2,
    name: "Carla Muñoz",
    email: "carla.munoz@correo.cl",
    phone: "+56 9 8765 4321",
    rut: "15.678.901-K",
    address: "Maipú 1890, Ñuñoa",
    creditLimit: 30000,
    creditUsed: 0,
    loyaltyPoints: 780,
    totalPurchases: 28,
    totalSales: 112000,
    lastPurchase: new Date(2026, 1, 24).toISOString(),
    notes: "",
    active: true,
    createdAt: new Date(2025, 8, 5).toISOString(),
  },
  {
    id: 3,
    name: "Rodrigo Fernández",
    email: "r.fernandez@correo.cl",
    phone: "+56 9 5555 6666",
    rut: "9.876.543-2",
    address: "O'Higgins 3200, Providencia",
    creditLimit: 80000,
    creditUsed: 15000,
    loyaltyPoints: 3400,
    totalPurchases: 95,
    totalSales: 430000,
    lastPurchase: new Date(2026, 1, 25).toISOString(),
    notes: "Cliente VIP. Gran fan del whisky.",
    active: true,
    createdAt: new Date(2024, 11, 20).toISOString(),
  },
  {
    id: 4,
    name: "Ana López",
    email: "ana.lopez@correo.cl",
    phone: "+56 9 3333 7777",
    rut: "18.111.222-3",
    address: "Las Palmeras 560, Macul",
    creditLimit: 20000,
    creditUsed: 20000,
    loyaltyPoints: 410,
    totalPurchases: 15,
    totalSales: 58000,
    lastPurchase: new Date(2026, 1, 15).toISOString(),
    notes: "Deuda pendiente.",
    active: true,
    createdAt: new Date(2026, 0, 3).toISOString(),
  },
  {
    id: 5,
    name: "Empresa Eventos Ltda.",
    email: "compras@eventoschile.cl",
    phone: "+56 2 2900 4567",
    rut: "76.543.210-5",
    address: "El Bosque Norte 500, Las Condes",
    creditLimit: 500000,
    creditUsed: 125000,
    loyaltyPoints: 12800,
    totalPurchases: 320,
    totalSales: 2800000,
    lastPurchase: new Date(2026, 1, 20).toISOString(),
    notes: "Compras en volumen para eventos. Requiere factura.",
    active: true,
    createdAt: new Date(2024, 3, 15).toISOString(),
  },
];

export const demoCustomersStats = {
  total: demoCustomers.length,
  active: demoCustomers.filter((c) => c.active).length,
  totalDebt: demoCustomers.reduce((sum, c) => sum + c.creditUsed, 0),
  totalLoyaltyPoints: demoCustomers.reduce((sum, c) => sum + c.loyaltyPoints, 0),
};

// ── Promociones ───────────────────────────────────────────────────────────

export const demoPromotions = [
  {
    id: 1,
    name: "2x1 Escudo Lata",
    description: "Lleva 2 Escudo 500ml al precio de 1",
    type: "2x1",
    value: null,
    active: true,
    scope: "product",
    productIds: [2],
    categoryName: null,
    startDate: new Date(2026, 1, 20).toISOString(),
    endDate: new Date(2026, 2, 5).toISOString(),
    maxUses: 100,
    usedCount: 23,
    minPurchase: null,
    bundleQty: 2,
    bundlePrice: 1290,
    barcode: null,
    status: "active",
    isActive: true,
  },
  {
    id: 2,
    name: "10% off Vinos",
    description: "Descuento de 10% en toda la categoría de Vinos",
    type: "percentaje",
    value: 10,
    active: true,
    scope: "category",
    productIds: [],
    categoryName: "Vinos",
    startDate: new Date(2026, 1, 10).toISOString(),
    endDate: new Date(2026, 2, 10).toISOString(),
    maxUses: null,
    usedCount: 87,
    minPurchase: null,
    bundleQty: null,
    bundlePrice: null,
    barcode: null,
    status: "active",
    isActive: true,
  },
  {
    id: 3,
    name: "Combo Asado",
    description: "6 Cristal 350ml + Coca-Cola 1.5L = $6.990",
    type: "bundle",
    value: null,
    active: false,
    scope: "product",
    productIds: [1, 22],
    categoryName: null,
    startDate: new Date(2026, 0, 1).toISOString(),
    endDate: new Date(2026, 1, 1).toISOString(),
    maxUses: 50,
    usedCount: 50,
    minPurchase: null,
    bundleQty: 7,
    bundlePrice: 6990,
    barcode: "COMBO001",
    status: "expired",
    isActive: false,
  },
];

// ── Suscripción ───────────────────────────────────────────────────────────

export const demoSubscription = {
  plan: {
    id: "basico",
    name: "Plan Básico",
    price: 19990,
    currency: "CLP",
    billingCycle: "monthly",
    features: {
      maxProducts: 500,
      maxUsers: 5,
      maxSalesPerMonth: 1000,
      advancedAnalytics: false,
      aiCatalog: false,
      multipleLocations: false,
      prioritySupport: false,
    },
  },
  status: "active",
  currentPeriodStart: new Date(2026, 1, 1).toISOString(),
  currentPeriodEnd: new Date(2026, 2, 1).toISOString(),
  usage: {
    products: demoProducts.length,
    users: 3,
    salesThisMonth: demoSales.filter(
      (s) => s.date.getMonth() === 1 && s.date.getFullYear() === 2026
    ).length,
  },
};

export const demoSubscriptionPlans = [
  {
    id: "gratis",
    name: "Gratis",
    price: 0,
    maxProducts: 50,
    maxUsers: 2,
    maxSalesPerMonth: 100,
  },
  {
    id: "basico",
    name: "Básico",
    price: 19990,
    maxProducts: 500,
    maxUsers: 5,
    maxSalesPerMonth: 1000,
  },
  {
    id: "profesional",
    name: "Profesional",
    price: 49990,
    maxProducts: 5000,
    maxUsers: 15,
    maxSalesPerMonth: 10000,
  },
  {
    id: "empresarial",
    name: "Empresarial",
    price: 99990,
    maxProducts: -1,
    maxUsers: -1,
    maxSalesPerMonth: -1,
  },
];

// ── Usuarios de tienda ────────────────────────────────────────────────────

export const demoStoreUsers = [
  {
    id: 1,
    username: "admin",
    fullName: "Administrador Principal",
    role: "admin",
    active: true,
    createdAt: new Date(2025, 0, 15).toISOString(),
  },
  {
    id: 2,
    username: "cajera1",
    fullName: "Carmen Silva",
    role: "vendedor",
    active: true,
    createdAt: new Date(2025, 3, 10).toISOString(),
  },
  {
    id: 3,
    username: "cajero2",
    fullName: "Miguel Torres",
    role: "vendedor",
    active: true,
    createdAt: new Date(2025, 6, 22).toISOString(),
  },
  {
    id: 99,
    username: "demo",
    fullName: "Usuario Demo",
    role: "vendedor",
    active: true,
    createdAt: new Date(2026, 0, 1).toISOString(),
  },
];

// ── Configuraciones del sistema ────────────────────────────────────────────

export const demoConfigurations = {
  general: {
    storeName: "Botillería El Tonel",
    currency: "CLP",
    timezone: "America/Santiago",
    language: "es-CL",
    logoUrl: null,
  },
  pos: {
    requireCashSession: true,
    allowNegativeStock: false,
    printReceiptByDefault: false,
    defaultPaymentMethod: "efectivo",
    quickSaleMode: false,
  },
  notifications: {
    lowStockAlert: true,
    lowStockThreshold: 10,
    expiryAlert: false,
  },
  fiscal: {
    rut: "12.345.678-9",
    businessName: "Botillería El Tonel EIRL",
    businessActivity: "Comercio al por menor de bebidas alcohólicas",
    address: "Av. Irarrázaval 4521, Ñuñoa, Santiago",
  },
};

// ── Log de auditoría ──────────────────────────────────────────────────────

export const demoAuditLog = [
  {
    id: 1,
    userId: 1,
    username: "admin",
    action: "CREATE",
    entityType: "product",
    entityId: 17,
    newValues: { name: "Whisky Johnnie Walker Red 750ml", price: 18990 },
    oldValues: null,
    ip: "192.168.1.10",
    createdAt: new Date(2026, 1, 20, 9, 30).toISOString(),
  },
  {
    id: 2,
    userId: 2,
    username: "cajera1",
    action: "CREATE",
    entityType: "sale",
    entityId: 142,
    newValues: { total: 5990, items: 2 },
    oldValues: null,
    ip: "192.168.1.11",
    createdAt: new Date(2026, 1, 24, 14, 22).toISOString(),
  },
  {
    id: 3,
    userId: 1,
    username: "admin",
    action: "UPDATE",
    entityType: "product",
    entityId: 8,
    newValues: { price: 5990 },
    oldValues: { price: 5490 },
    ip: "192.168.1.10",
    createdAt: new Date(2026, 1, 22, 11, 15).toISOString(),
  },
  {
    id: 4,
    userId: 3,
    username: "cajero2",
    action: "OPEN_SESSION",
    entityType: "cash_session",
    entityId: 41,
    newValues: { initialCash: 50000 },
    oldValues: null,
    ip: "192.168.1.12",
    createdAt: new Date(2026, 1, 24, 9, 0).toISOString(),
  },
  {
    id: 5,
    userId: 3,
    username: "cajero2",
    action: "CLOSE_SESSION",
    entityType: "cash_session",
    entityId: 41,
    newValues: { declaredCash: 98500, difference: 500 },
    oldValues: null,
    ip: "192.168.1.12",
    createdAt: new Date(2026, 1, 24, 22, 58).toISOString(),
  },
];

export const demoAuditStats = {
  total: demoAuditLog.length,
  byAction: {
    CREATE: 2,
    UPDATE: 1,
    DELETE: 0,
    OPEN_SESSION: 1,
    CLOSE_SESSION: 1,
  },
};

// ── Devoluciones ──────────────────────────────────────────────────────────

export const demoReturns = [
  {
    id: 1,
    saleId: 45,
    reason: "Producto en mal estado",
    totalRefund: 1290,
    method: "efectivo",
    status: "completed",
    processedBy: "cajera1",
    notes: "Lata abollada.",
    createdAt: new Date(2026, 1, 18, 16, 20).toISOString(),
  },
  {
    id: 2,
    saleId: 78,
    reason: "Producto incorrecto",
    totalRefund: 5990,
    method: "efectivo",
    status: "completed",
    processedBy: "cajera1",
    notes: "Cliente pidió Cabernet pero se despachó Merlot.",
    createdAt: new Date(2026, 1, 21, 10, 45).toISOString(),
  },
];

export const demoReturnsStats = {
  totalReturns: demoReturns.length,
  totalRefunded: demoReturns.reduce((sum, r) => sum + r.totalRefund, 0),
  byMethod: { efectivo: 2 },
  byReason: { "Producto en mal estado": 1, "Producto incorrecto": 1 },
};

// ── Facturas de proveedores ───────────────────────────────────────────────

export const demoSupplierInvoices = [
  {
    id: 1,
    invoiceNumber: "FAC-2026-0041",
    supplierName: "Distribuidora CCU",
    invoiceDate: new Date(2026, 1, 10).toISOString(),
    dueDate: new Date(2026, 2, 10).toISOString(),
    subtotal: 280000,
    taxAmount: 53200,
    total: 333200,
    paymentStatus: "pending",
    amountPaid: 0,
    amountPending: 333200,
    currency: "CLP",
    expenseCategory: "Mercadería",
    accountingCode: "4001",
    description: "Reposición cervezas - quincena",
    notes: null,
    registeredBy: "admin",
    createdAt: new Date(2026, 1, 10).toISOString(),
  },
  {
    id: 2,
    invoiceNumber: "FAC-2026-0038",
    supplierName: "Viña Concha y Toro",
    invoiceDate: new Date(2026, 1, 5).toISOString(),
    dueDate: new Date(2026, 2, 5).toISOString(),
    subtotal: 450000,
    taxAmount: 85500,
    total: 535500,
    paymentStatus: "paid",
    amountPaid: 535500,
    amountPending: 0,
    currency: "CLP",
    expenseCategory: "Mercadería",
    accountingCode: "4001",
    description: "Vinos surtidos - enero",
    notes: "Pagado mediante transferencia bancaria",
    registeredBy: "admin",
    createdAt: new Date(2026, 1, 5).toISOString(),
  },
  {
    id: 3,
    invoiceNumber: "FAC-2026-0052",
    supplierName: "Distribuidora Pisco Control",
    invoiceDate: new Date(2026, 1, 15).toISOString(),
    dueDate: new Date(2026, 2, 15).toISOString(),
    subtotal: 180000,
    taxAmount: 34200,
    total: 214200,
    paymentStatus: "partial",
    amountPaid: 100000,
    amountPending: 114200,
    currency: "CLP",
    expenseCategory: "Mercadería",
    accountingCode: "4001",
    description: "Piscos y destilados",
    notes: "Abono parcial realizado 20/Feb",
    registeredBy: "admin",
    createdAt: new Date(2026, 1, 15).toISOString(),
  },
];

export const demoSupplierInvoicesStats = {
  total: demoSupplierInvoices.length,
  totalAmount: demoSupplierInvoices.reduce((s, i) => s + i.total, 0),
  pendingAmount: demoSupplierInvoices.reduce((s, i) => s + i.amountPending, 0),
  byStatus: { pending: 1, paid: 1, partial: 1 },
};

// ── Umbrales de categoría ─────────────────────────────────────────────────

export const demoCategoryThresholds = [
  { id: 1, category: "Cervezas", minStock: 24 },
  { id: 2, category: "Vinos", minStock: 6 },
  { id: 3, category: "Pisco", minStock: 6 },
  { id: 4, category: "Whisky", minStock: 3 },
  { id: 5, category: "Sin Alcohol", minStock: 12 },
];

// ── Analíticas ────────────────────────────────────────────────────────────

const todaySales = demoSales.filter(
  (s) => s.date.toDateString() === new Date(2026, 1, 25).toDateString()
);
const monthSales = demoSales.filter(
  (s) => s.date.getMonth() === 1 && s.date.getFullYear() === 2026
);
const lastMonthSales = demoSales.filter(
  (s) => s.date.getMonth() === 0 && s.date.getFullYear() === 2026
);

// Agrupaciones para métricas
const itemsSold = monthSales.reduce((sum, s) => sum + s.items.reduce((acc, item) => acc + item.quantity, 0), 0);

const productStats = monthSales.reduce((acc, sale) => {
  sale.items.forEach(item => {
    if (!acc[item.productId]) {
      acc[item.productId] = { id: item.productId, name: item.productName, totalQuantity: 0, totalRevenue: 0 };
    }
    acc[item.productId].totalQuantity += item.quantity;
    acc[item.productId].totalRevenue += item.subtotal;
  });
  return acc;
}, {} as Record<number, any>);

const topProducts = Object.values(productStats)
  .sort((a, b) => b.totalQuantity - a.totalQuantity)
  .slice(0, 10);

const categoryStatsBase = monthSales.reduce((acc, sale) => {
  sale.items.forEach(item => {
    const prod = demoProducts.find(p => p.id === item.productId);
    const cat = prod?.category || "Otros";
    if (!acc[cat]) acc[cat] = { category: cat, totalQuantity: 0, totalRevenue: 0 };
    acc[cat].totalQuantity += item.quantity;
    acc[cat].totalRevenue += item.subtotal;
  });
  return acc;
}, {} as Record<string, any>);

const categoryStats = Object.values(categoryStatsBase)
  .sort((a, b) => b.totalRevenue - a.totalRevenue);

const paymentStatsBase = monthSales.reduce((acc, sale) => {
  const pm = sale.paymentMethod || "efectivo";
  if (!acc[pm]) acc[pm] = { paymentMethod: pm, count: 0, total: 0 };
  acc[pm].count += 1;
  acc[pm].total += sale.total;
  return acc;
}, {} as Record<string, any>);

const paymentMethods = Object.values(paymentStatsBase);

export const demoAnalyticsMetrics = {
  sales: {
    totalSales: monthSales.length,
    totalRevenue: monthSales.reduce((s, v) => s + v.total, 0),
    avgTicket: monthSales.length > 0 ? Math.round(monthSales.reduce((s, v) => s + v.total, 0) / monthSales.length) : 0,
    itemsSold
  },
  topProducts,
  topMargin: [],
  categoryStats,
  paymentMethods,
  stagnantProducts: []
};

// Tendencia de ventas (últimos 30 días)
export const demoSalesTrend = (() => {
  const days: any[] = [];
  const now = new Date(2026, 1, 25);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    // Local date string in YYYY-MM-DD
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    
    // Comparar contra YYYY-MM-DD local de las ventas
    const daySales = demoSales.filter(s => {
      const sd = `${s.date.getFullYear()}-${String(s.date.getMonth()+1).padStart(2,'0')}-${String(s.date.getDate()).padStart(2,'0')}`;
      return sd === dateStr;
    });

    const revenue = daySales.reduce((s, v) => s + v.total, 0);
    days.push({
      date: dateStr,
      revenue,
      salesCount: daySales.length,
      avgTicket: daySales.length > 0 ? Math.round(revenue / daySales.length) : 0
    });
  }
  return { trend: days };
})();

export const demoSalesByHour = (() => {
  const hours: any[] = [];
  for (let h = 0; h < 24; h++) {
    const hourSales = monthSales.filter((s) => s.date.getHours() === h);
    hours.push({
      hour: h,
      revenue: hourSales.reduce((s, v) => s + v.total, 0),
      salesCount: hourSales.length,
    });
  }
  return { hourlyStats: hours };
})();

export const demoPeriodComparison = (() => {
  const currentTotal = monthSales.reduce((s, v) => s + v.total, 0);
  const previousTotal = lastMonthSales.reduce((s, v) => s + v.total, 0);
  
  return {
    comparison: {
      current: {
        salesCount: monthSales.length,
        revenue: currentTotal,
        avgTicket: monthSales.length > 0 ? Math.round(currentTotal / monthSales.length) : 0,
      },
      previous: {
        salesCount: lastMonthSales.length,
        revenue: previousTotal,
        avgTicket: lastMonthSales.length > 0 ? Math.round(previousTotal / lastMonthSales.length) : 0,
      },
      changes: {
        salesCount: lastMonthSales.length > 0 ? ((monthSales.length - lastMonthSales.length) / lastMonthSales.length) * 100 : 100,
        revenue: previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 100,
        avgTicket: 0,
      }
    }
  };
})();

export const demoRestockPredictions = {
  predictions: [
    { productId: 25, productName: "Fanta Naranja 1.5L", currentStock: 5, predictedDaysLeft: 3, recommendedOrder: 36 },
    { productId: 19, productName: "Ron Flor de Caña 750ml", currentStock: 8, predictedDaysLeft: 12, recommendedOrder: 12 },
    { productId: 20, productName: "Gin Beefeater 750ml", currentStock: 6, predictedDaysLeft: 14, recommendedOrder: 12 },
  ]
};
