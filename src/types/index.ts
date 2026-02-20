export type EstadoProducto = "BAJO" | "NORMAL" | "AGOTADO" | "DESHABILITADO";

export type ConfidenceLevel = "alta" | "media" | "baja";

export interface Product {
  id: number;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  cost: number;
  marginPct: number;
  barCode: string | null;
  ml: number;
  measureUnit: "ml" | "g" | "none";
  estado: EstadoProducto;
  supplier?: string | null;
  // Optional fields
  alcoholContent?: number;
  volume?: number;
  barcodes?: Barcode[];
}

export interface ImportDraft {
  localId: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  cost: number;
  marginPct: number;
  BarCode: string;
  ml: number;
  measureUnit: "ml" | "g" | "none";
  estado: EstadoProducto;
  supplier?: string; // Proveedor del producto
  loading?: boolean;
  error?: string | null;
  fetchedFromWeb?: boolean;
  // Claude AI specific fields
  aiGenerated?: boolean;
  confidence?: ConfidenceLevel;
  aiSource?: string; // Fuente de la IA (ej: "jumbo.cl", "lider.cl")
  marca?: string; // Marca del producto
  descripcion?: string; // Descripción del producto
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type SaleStatus = "completed" | "voided" | "refunded";

export interface Sale {
  id: number;
  items: SaleItem[];
  total: number;
  date: Date; // Converted from createdAt
  customerName?: string;
  paymentMethod: string;
  status?: SaleStatus;
  voidedAt?: string;
  voidedBy?: number;
  voidReason?: string;
  originalSaleId?: number;
}

export interface SaleItem {
  id: number;
  saleId: number;
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
  product?: {
    id: number;
    name: string;
    price: number;
    cost?: number;
    category?: string;
    barCode?: string | null;
    ml?: number;
    volume?: number;
  };
}

export type ViewType =
  | "dashboard"
  | "catalog"
  | "cart"
  | "inventory"
  | "sales"
  | "admin"
  | "superadmin";

export type PaymentMethod =
  | "efectivo"
  | "tarjeta"
  | "transferencia"
  | "cash"
  | "debit"
  | "credit"
  | "transfer";

export interface CashMovement {
  id: number;
  sessionId: number;
  type: "INGRESO" | "EGRESO" | "deposit" | "withdrawal" | "adjustment" | "sale";
  amount: number;
  reason?: string;
  description?: string;
  createdAt?: string;
  date?: string | Date;
  paymentMethod?: string;
}

export interface CashSession {
  id: number;
  userId?: number;
  openTime: string;
  closeTime?: string;
  initialCash: number;
  finalCash?: number;
  declaredCash?: number;
  difference?: number;
  notes?: string;
  windowClose?: string;
}

export interface Barcode {
  id?: string | number;
  productId: string | number;
  code: string;
  format: "EAN-13" | "UPC-A" | "EAN-8" | "ITF-14" | "UNKNOWN";
  source: "manufacturer" | "internal";
  isPrimary?: boolean;
  internalSeq?: number | null;
}

export interface User {
  id: number;
  username: string;
  role: "superadmin" | "admin" | "vendedor";
  fullName: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ============== PROMOCIONES ==============
export type PromotionType = "percentage" | "fixed" | "bundle" | "2x1" | "3x2";
export type PromotionScope = "product" | "category" | "all";
export type PromotionStatus = "active" | "paused" | "expired" | "soldout";

export interface Promotion {
  id: number;
  name: string;
  description?: string;
  type: PromotionType;
  value?: number; // Porcentaje o monto fijo
  active: boolean;
  scope: PromotionScope;
  productIds?: number[];
  categoryName?: string;
  startDate?: string;
  endDate?: string;
  maxUses?: number;
  usedCount: number;
  minPurchase?: number;
  bundleQty?: number;
  bundlePrice?: number;
  barcode?: string;
  createdAt?: string;
  updatedAt?: string;
  // Campos calculados (del backend)
  status?: PromotionStatus;
  isActive?: boolean;
}

export interface PromotionCreate {
  name: string;
  description?: string;
  type: PromotionType;
  value?: number;
  active?: boolean;
  scope?: PromotionScope;
  productIds?: number[];
  categoryName?: string;
  startDate?: string;
  endDate?: string;
  maxUses?: number;
  minPurchase?: number;
  bundleQty?: number;
  bundlePrice?: number;
  barcode?: string;
}

// ============== CLIENTES ==============
export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  rut?: string;
  address?: string;
  creditLimit: number;
  creditUsed: number;
  loyaltyPoints: number;
  totalPurchases: number;
  totalSales: number;
  lastPurchase?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerDebt {
  id: string;
  customerId: string;
  saleId?: number;
  amount: number;
  amountPaid: number;
  dueDate?: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerWithDetails extends Customer {
  debts?: CustomerDebt[];
  recentPurchases?: Sale[];
}

export interface CustomerCreate {
  name: string;
  email?: string;
  phone?: string;
  rut?: string;
  address?: string;
  creditLimit?: number;
  notes?: string;
}

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  credit: {
    totalLimit: number;
    totalUsed: number;
    available: number;
  };
  debts: {
    count: number;
    total: number;
    paid: number;
    remaining: number;
  };
  topCustomers: Array<{
    id: string;
    name: string;
    totalPurchases: number;
    totalSales: number;
  }>;
}

// ============== DEVOLUCIONES ==============
export interface Return {
  id: string;
  saleId: number;
  reason: string;
  totalRefund: number;
  method: 'cash' | 'credit_note' | 'card';
  status: 'completed' | 'pending' | 'cancelled';
  processedBy: number;
  notes?: string;
  createdAt: string;
}

export interface ReturnItem {
  id: number;
  returnId: string;
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface ReturnWithItems extends Return {
  items: ReturnItem[];
  originalSale?: Sale;
}

export interface ReturnCreate {
  saleId: number;
  reason: string;
  items: Array<{
    productId: number;
    quantity: number;
  }>;
  method?: 'cash' | 'credit_note' | 'card';
  notes?: string;
}

export interface ReturnStats {
  period: string;
  summary: {
    totalReturns: number;
    totalRefunded: number;
    averageRefund: number;
  };
  byReason: Array<{ reason: string; count: number }>;
  byMethod: Array<{ method: string; count: number; total: number }>;
  topReturnedProducts: Array<{
    productId: number;
    productName: string;
    totalQuantity: number;
    returnCount: number;
  }>;
}

// ============== FACTURAS DE PROVEEDORES ==============
export type InvoicePaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';
export type InvoiceCurrency = 'CLP' | 'USD' | 'EUR';
export type ExpenseCategory = 
  | 'inventory'        // Compra de mercadería para reventa
  | 'services'         // Servicios profesionales (contador, abogado, etc.)
  | 'utilities'        // Servicios básicos (luz, agua, internet)
  | 'rent'             // Arriendo de local
  | 'equipment'        // Equipamiento y maquinaria
  | 'maintenance'      // Mantención y reparaciones
  | 'marketing'        // Publicidad y marketing
  | 'transportation'   // Transporte y combustible
  | 'supplies'         // Insumos y materiales
  | 'other';           // Otros gastos

export interface SupplierInvoice {
  id: number;
  invoiceNumber: string;
  supplierName: string;
  invoiceDate: Date;
  dueDate?: Date;
  subtotal: number;
  taxAmount: number;
  total: number;
  paymentStatus: InvoicePaymentStatus;
  amountPaid: number;
  amountPending: number;
  currency: InvoiceCurrency;
  expenseCategory: ExpenseCategory;
  accountingCode?: string;
  description?: string;
  notes?: string;
  registeredBy: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface SupplierInvoiceItem {
  id: number;
  invoiceId: number;
  productId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  taxRate: number;
}

export interface SupplierInvoicePayment {
  id: number;
  invoiceId: number;
  paymentDate: Date;
  amount: number;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  registeredBy: number;
  createdAt: Date;
}

export interface SupplierInvoiceWithDetails extends SupplierInvoice {
  items: SupplierInvoiceItem[];
  payments: SupplierInvoicePayment[];
}

export interface SupplierInvoiceCreate {
  invoiceNumber: string;
  supplierName: string;
  invoiceDate: Date | string;
  dueDate?: Date | string;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency?: InvoiceCurrency;
  expenseCategory: ExpenseCategory;
  accountingCode?: string;
  description?: string;
  notes?: string;
  items?: Array<{
    productId?: number;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
  }>;
}

export interface InvoicePaymentCreate {
  amount: number;
  paymentDate: Date | string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
}

export interface InvoiceStats {
  totalPending: number;
  totalPaid: number;
  totalOverdue: number;
  countPending: number;
  countPaid: number;
  countOverdue: number;
  upcomingDue7Days: number;
  upcomingDueAmount: number;
  byCategory: Array<{
    category: ExpenseCategory;
    count: number;
    total: number;
  }>;
  bySupplier: Array<{
    supplier: string;
    count: number;
    total: number;
  }>;
  monthlyTotals: Array<{
    month: string;
    total: number;
    count: number;
  }>;
}

