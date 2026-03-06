import {
  mysqlTable,
  varchar,
  int,
  text,
  boolean,
  timestamp,
  decimal,
  double,
  json,
  mysqlEnum,
  index,
  type AnyMySqlColumn,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const users = mysqlTable(
  "users",
  {
    id: int("id").primaryKey().autoincrement(),
    tenantId: varchar("tenant_id", { length: 64 }),
    username: varchar("username", { length: 255 }).notNull().unique(),
    email: varchar("email", { length: 255 }),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: mysqlEnum("role", ["superadmin", "admin", "manager", "vendedor"])
      .notNull()
      .default("vendedor"),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    active: boolean("active").notNull().default(true),
    cashRegisterId: varchar("cash_register_id", { length: 64 }),
    createdBy: int("created_by").references((): AnyMySqlColumn => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    usersTenantIdx: index("users_tenant_idx").on(t.tenantId),
    usersRoleIdx: index("users_role_idx").on(t.role),
    usersCreatedIdx: index("users_created_idx").on(t.createdAt),
    usersActiveIdx: index("users_active_idx").on(t.active),
    usersCreatedByIdx: index("users_created_by_idx").on(t.createdBy),
  })
);

// ============== UMBRALES DE STOCK POR CATEGORÍA ==============
export const categoryStockThresholds = mysqlTable(
  "category_stock_thresholds",
  {
    id: int("id").primaryKey().autoincrement(),
    tenantId: varchar("tenant_id", { length: 64 }),
    category: varchar("category", { length: 255 }).notNull().unique(),
    minStock: int("min_stock").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => ({
    categoryThresholdsTenantIdx: index("category_thresholds_tenant_idx").on(t.tenantId),
    categoryThresholdsCategoryIdx: index("category_thresholds_category_idx").on(
      t.category
    ),
  })
);

export const products = mysqlTable(
  "products",
  {
    id: int("id").primaryKey().autoincrement(),
    tenantId: varchar("tenant_id", { length: 64 }),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 255 }).notNull(),
    stock: int("stock").notNull().default(0),
    minStock: int("min_stock").notNull().default(0),
    price: int("price").notNull().default(0),
    cost: int("cost").notNull().default(0),
    marginPct: double("margin_pct").notNull().default(30),
    barCode: varchar("bar_code", { length: 128 }),
    ml: int("ml").default(0),
    measureUnit: varchar("measure_unit", { length: 32 }).default("ml"),
    estado: mysqlEnum("estado", ["NORMAL", "BAJO", "AGOTADO", "DESHABILITADO"]).default("NORMAL"),
    supplier: varchar("supplier", { length: 255 }),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => ({
    productsTenantIdx: index("products_tenant_idx").on(t.tenantId),
    productsCategoryIdx: index("products_category_idx").on(t.category),
    productsSupplierIdx: index("products_supplier_idx").on(t.supplier),
    productsEstadoIdx: index("products_estado_idx").on(t.estado),
    productsCreatedIdx: index("products_created_idx").on(t.createdAt),
    productsBarcodeIdx: index("products_barcode_idx").on(t.barCode),
    productsNameIdx: index("products_name_idx").on(t.name),
  })
);

export const sales = mysqlTable(
  "sales",
  {
    id: int("id").primaryKey().autoincrement(),
    tenantId: varchar("tenant_id", { length: 64 }),
    total: int("total").notNull(),
    paymentMethod: varchar("payment_method", { length: 64 }).notNull(),
    customerName: varchar("customer_name", { length: 255 }),
    customerId: varchar("customer_id", { length: 36 }),
    cashSessionId: int("cash_session_id").references(() => cashSessions.id),
    status: mysqlEnum("status", ["completed", "voided", "refunded"])
      .notNull()
      .default("completed"),
    voidedAt: timestamp("voided_at"),
    voidedBy: int("voided_by").references(() => users.id),
    voidReason: text("void_reason"),
    originalSaleId: int("original_sale_id"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    salesTenantIdx: index("sales_tenant_idx").on(t.tenantId),
    salesCreatedIdx: index("sales_created_idx").on(t.createdAt),
    salesPaymentIdx: index("sales_payment_method_idx").on(t.paymentMethod),
    salesStatusIdx: index("sales_status_idx").on(t.status),
    salesCustomerIdx: index("sales_customer_id_idx").on(t.customerId),
    salesSessionIdx: index("sales_session_idx").on(t.cashSessionId),
  })
);

export const saleItems = mysqlTable(
  "sale_items",
  {
    id: int("id").primaryKey().autoincrement(),
    saleId: int("sale_id")
      .references(() => sales.id, { onDelete: "cascade" })
      .notNull(),
    productId: int("product_id")
      .references(() => products.id)
      .notNull(),
    productName: varchar("product_name", { length: 255 }).notNull(),
    quantity: int("quantity").notNull(),
    price: int("price").notNull(),
    subtotal: int("subtotal").notNull(),
  },
  (t) => ({
    saleItemsSaleIdx: index("sale_items_sale_id_idx").on(t.saleId),
    saleItemsProductIdx: index("sale_items_product_id_idx").on(t.productId),
    saleItemsSaleProductIdx: index("sale_items_sale_product_idx").on(
      t.saleId,
      t.productId
    ),
  })
);

export const settings = mysqlTable(
  "settings",
  {
    key: varchar("key", { length: 255 }).primaryKey(),
    tenantId: varchar("tenant_id", { length: 64 }),
    value: json("value").notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    settingsTenantIdx: index("settings_tenant_idx").on(t.tenantId),
  })
);

export const cashSessions = mysqlTable(
  "cash_sessions",
  {
    id: int("id").primaryKey().autoincrement(),
    tenantId: varchar("tenant_id", { length: 64 }),
    userId: int("user_id").references(() => users.id),
    openTime: timestamp("open_time").notNull(),
    closeTime: timestamp("close_time"),
    initialCash: int("initial_cash").notNull(),
    finalCash: int("final_cash"),
    declaredCash: int("declared_cash"),
    difference: int("difference"),
    notes: text("notes"),
    windowOpen: timestamp("window_open"),
    windowClose: timestamp("window_close"),
  },
  (t) => ({
    cashSessionsTenantIdx: index("cash_sessions_tenant_idx").on(t.tenantId),
    cashSessionsUserIdx: index("cash_sessions_user_id_idx").on(t.userId),
    cashSessionsOpenIdx: index("cash_sessions_open_time_idx").on(t.openTime),
  })
);

export const cashMovements = mysqlTable(
  "cash_movements",
  {
    id: int("id").primaryKey().autoincrement(),
    sessionId: int("session_id")
      .references(() => cashSessions.id, { onDelete: "cascade" })
      .notNull(),
    type: mysqlEnum("type", ["INGRESO", "EGRESO"]).notNull(),
    amount: int("amount").notNull(),
    reason: varchar("reason", { length: 500 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    cashMovementsSessionIdx: index("cash_movements_session_id_idx").on(
      t.sessionId
    ),
    cashMovementsCreatedIdx: index("cash_movements_created_idx").on(
      t.createdAt
    ),
  })
);

// ============== PROMOCIONES ==============
export const promotions = mysqlTable(
  "promotions",
  {
    id: int("id").primaryKey().autoincrement(),
    tenantId: varchar("tenant_id", { length: 64 }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    type: mysqlEnum("type", ["percentage", "fixed", "bundle", "2x1", "3x2"]).notNull(),
    value: double("value"),
    active: boolean("active").notNull().default(true),
    scope: mysqlEnum("scope", ["product", "category", "all"])
      .notNull()
      .default("product"),
    productIds: json("product_ids").$type<number[]>(),
    categoryName: varchar("category_name", { length: 255 }),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    maxUses: int("max_uses"),
    usedCount: int("used_count").notNull().default(0),
    minPurchase: int("min_purchase"),
    bundleQty: int("bundle_qty"),
    bundlePrice: int("bundle_price"),
    barcode: varchar("barcode", { length: 128 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => ({
    promotionsTenantIdx: index("promotions_tenant_idx").on(t.tenantId),
    promotionsActiveIdx: index("promotions_active_idx").on(t.active),
    promotionsBarcodeIdx: index("promotions_barcode_idx").on(t.barcode),
    promotionsDateIdx: index("promotions_dates_idx").on(t.startDate, t.endDate),
  })
);

// ============== DOCUMENTOS FISCALES (SII / BOLETAS) ==============
export const fiscalDocuments = mysqlTable(
  "fiscal_documents",
  {
    id: int("id").primaryKey().autoincrement(),
    tenantId: varchar("tenant_id", { length: 64 }),
    saleId: int("sale_id")
      .references(() => sales.id, { onDelete: "cascade" })
      .notNull(),
    documentType: mysqlEnum("document_type", ["boleta"])
      .notNull()
      .default("boleta"),
    provider: varchar("provider", { length: 64 }).notNull().default("none"),
    status: mysqlEnum("status", ["pending", "issued", "failed"])
      .notNull()
      .default("pending"),
    folio: int("folio"),
    trackId: varchar("track_id", { length: 255 }),
    siiEnv: varchar("sii_env", { length: 64 }),
    xml: text("xml"),
    lastError: text("last_error"),
    response: json("response"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => ({
    fiscalDocsTenantIdx: index("fiscal_documents_tenant_idx").on(t.tenantId),
    fiscalDocsSaleIdx: index("fiscal_documents_sale_id_idx").on(t.saleId),
    fiscalDocsStatusIdx: index("fiscal_documents_status_idx").on(t.status),
    fiscalDocsCreatedIdx: index("fiscal_documents_created_idx").on(t.createdAt),
  })
);

// ============== CLIENTES ==============
export const customers = mysqlTable(
  "customers",
  {
    id: varchar("id", { length: 36 }).primaryKey().notNull(),
    tenantId: varchar("tenant_id", { length: 64 }),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 32 }),
    rut: varchar("rut", { length: 20 }),
    address: text("address"),
    creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }).notNull().default("0"),
    creditUsed: decimal("credit_used", { precision: 12, scale: 2 }).notNull().default("0"),
    loyaltyPoints: int("loyalty_points").notNull().default(0),
    totalPurchases: decimal("total_purchases", { precision: 12, scale: 2 }).notNull().default("0"),
    totalSales: int("total_sales").notNull().default(0),
    lastPurchase: timestamp("last_purchase"),
    notes: text("notes"),
    active: int("active").notNull().default(1),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => ({
    customersTenantIdx: index("customers_tenant_idx").on(t.tenantId),
    customersPhoneIdx: index("customers_phone_idx").on(t.phone),
    customersRutIdx: index("customers_rut_idx").on(t.rut),
    customersActiveIdx: index("customers_active_idx").on(t.active),
  })
);

// ============== DEUDAS DE CLIENTES ==============
export const customerDebts = mysqlTable(
  "customer_debts",
  {
    id: varchar("id", { length: 36 }).primaryKey().notNull(),
    customerId: varchar("customer_id", { length: 36 })
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    saleId: int("sale_id").references(() => sales.id, {
      onDelete: "set null",
    }),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    amountPaid: decimal("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
    dueDate: timestamp("due_date"),
    status: varchar("status", { length: 32 }).notNull().default("pending"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => ({
    customerDebtsCustomerIdx: index("customer_debts_customer_idx").on(
      t.customerId
    ),
    customerDebtsStatusIdx: index("customer_debts_status_idx").on(t.status),
    customerDebtsDueDateIdx: index("customer_debts_due_date_idx").on(t.dueDate),
  })
);

// ============== DEVOLUCIONES ==============
export const returns = mysqlTable(
  "returns",
  {
    id: varchar("id", { length: 36 }).primaryKey().notNull(),
    tenantId: varchar("tenant_id", { length: 64 }),
    saleId: int("sale_id")
      .notNull()
      .references(() => sales.id),
    reason: text("reason").notNull(),
    totalRefund: decimal("total_refund", { precision: 12, scale: 2 }).notNull(),
    method: varchar("method", { length: 32 }).notNull().default("cash"),
    status: varchar("status", { length: 32 }).notNull().default("completed"),
    processedBy: int("processed_by")
      .notNull()
      .references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    returnsTenantIdx: index("returns_tenant_idx").on(t.tenantId),
    returnsSaleIdx: index("returns_sale_idx").on(t.saleId),
    returnsProcessedByIdx: index("returns_processed_by_idx").on(t.processedBy),
    returnsCreatedIdx: index("returns_created_idx").on(t.createdAt),
  })
);

// ============== ITEMS DE DEVOLUCIÓN ==============
export const returnItems = mysqlTable(
  "return_items",
  {
    id: int("id").primaryKey().autoincrement(),
    returnId: varchar("return_id", { length: 36 })
      .notNull()
      .references(() => returns.id, { onDelete: "cascade" }),
    productId: int("product_id")
      .notNull()
      .references(() => products.id),
    productName: varchar("product_name", { length: 255 }).notNull(),
    quantity: int("quantity").notNull(),
    price: int("price").notNull(),
    subtotal: int("subtotal").notNull(),
  },
  (t) => ({
    returnItemsReturnIdx: index("return_items_return_idx").on(t.returnId),
    returnItemsProductIdx: index("return_items_product_idx").on(t.productId),
  })
);

// ============== AUDIT LOG ==============
export const auditLog = mysqlTable(
  "audit_log",
  {
    id: int("id").primaryKey().autoincrement(),
    tenantId: varchar("tenant_id", { length: 64 }),
    userId: int("user_id").references(() => users.id),
    username: varchar("username", { length: 255 }),
    action: varchar("action", { length: 255 }).notNull(),
    entity: varchar("entity", { length: 128 }),
    entityId: int("entity_id"),
    details: json("details"),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    auditLogTenantIdx: index("audit_log_tenant_idx").on(t.tenantId),
    auditLogUserIdx: index("audit_log_user_id_idx").on(t.userId),
    auditLogActionIdx: index("audit_log_action_idx").on(t.action),
    auditLogCreatedIdx: index("audit_log_created_idx").on(t.createdAt),
    auditLogEntityIdx: index("audit_log_entity_idx").on(t.entity, t.entityId),
  })
);

// ============== FACTURAS DE PROVEEDORES ==============
export const supplierInvoices = mysqlTable(
  "supplier_invoices",
  {
    id: int("id").primaryKey().autoincrement(),
    tenantId: varchar("tenant_id", { length: 64 }),
    invoiceNumber: varchar("invoice_number", { length: 128 }).notNull(),
    supplierName: varchar("supplier_name", { length: 255 }).notNull(),
    invoiceDate: timestamp("invoice_date").notNull(),
    dueDate: timestamp("due_date"),
    subtotal: int("subtotal").notNull(),
    taxAmount: int("tax_amount").notNull(),
    total: int("total").notNull(),
    paymentStatus: mysqlEnum("payment_status", ["pending", "partial", "paid", "overdue"])
      .notNull()
      .default("pending"),
    amountPaid: int("amount_paid").notNull().default(0),
    amountPending: int("amount_pending").notNull(),
    currency: varchar("currency", { length: 8 }).notNull().default("CLP"),
    expenseCategory: mysqlEnum("expense_category", [
      "inventory",
      "services",
      "utilities",
      "rent",
      "equipment",
      "maintenance",
      "marketing",
      "transportation",
      "supplies",
      "other",
    ]).notNull(),
    accountingCode: varchar("accounting_code", { length: 64 }),
    description: text("description"),
    notes: text("notes"),
    registeredBy: int("registered_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => ({
    supplierInvoicesTenantIdx: index("supplier_invoices_tenant_idx").on(t.tenantId),
    supplierInvoicesSupplierIdx: index("supplier_invoices_supplier_idx").on(
      t.supplierName
    ),
    supplierInvoicesStatusIdx: index("supplier_invoices_status_idx").on(
      t.paymentStatus
    ),
    supplierInvoicesDateIdx: index("supplier_invoices_date_idx").on(
      t.invoiceDate
    ),
    supplierInvoicesDueDateIdx: index("supplier_invoices_due_date_idx").on(
      t.dueDate
    ),
    supplierInvoicesCategoryIdx: index("supplier_invoices_category_idx").on(
      t.expenseCategory
    ),
  })
);

export const supplierInvoiceItems = mysqlTable(
  "supplier_invoice_items",
  {
    id: int("id").primaryKey().autoincrement(),
    invoiceId: int("invoice_id")
      .notNull()
      .references(() => supplierInvoices.id, { onDelete: "cascade" }),
    productId: int("product_id").references(() => products.id),
    description: text("description").notNull(),
    quantity: int("quantity").notNull(),
    unitPrice: int("unit_price").notNull(),
    subtotal: int("subtotal").notNull(),
    taxRate: int("tax_rate").notNull().default(19),
  },
  (t) => ({
    supplierInvoiceItemsInvoiceIdx: index(
      "supplier_invoice_items_invoice_idx"
    ).on(t.invoiceId),
    supplierInvoiceItemsProductIdx: index(
      "supplier_invoice_items_product_idx"
    ).on(t.productId),
  })
);

export const supplierInvoicePayments = mysqlTable(
  "supplier_invoice_payments",
  {
    id: int("id").primaryKey().autoincrement(),
    invoiceId: int("invoice_id")
      .notNull()
      .references(() => supplierInvoices.id, { onDelete: "cascade" }),
    paymentDate: timestamp("payment_date").notNull(),
    amount: int("amount").notNull(),
    paymentMethod: varchar("payment_method", { length: 64 }).notNull(),
    reference: varchar("reference", { length: 255 }),
    notes: text("notes"),
    registeredBy: int("registered_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    supplierInvoicePaymentsInvoiceIdx: index(
      "supplier_invoice_payments_invoice_idx"
    ).on(t.invoiceId),
    supplierInvoicePaymentsDateIdx: index(
      "supplier_invoice_payments_date_idx"
    ).on(t.paymentDate),
  })
);

