import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: text("tenant_id"), // Multi-tenant support
    username: text("username").notNull().unique(),
    email: text("email"),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["superadmin", "admin", "manager", "vendedor"] })
      .notNull()
      .default("vendedor"),
    fullName: text("full_name").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    cashRegisterId: text("cash_register_id"), // Caja asignada
    createdBy: integer("created_by").references((): AnySQLiteColumn => users.id), // Quien creó al usuario
    createdAt: integer("created_at", { mode: "timestamp" }).default(
      sql`(unixepoch())`
    ),
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
export const categoryStockThresholds = sqliteTable(
  "category_stock_thresholds",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: text("tenant_id"), // Multi-tenant support
    category: text("category").notNull().unique(),
    minStock: integer("min_stock").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).default(
      sql`(unixepoch())`
    ),
    updatedAt: integer("updated_at", { mode: "timestamp" }),
  },
  (t) => ({
    categoryThresholdsTenantIdx: index("category_thresholds_tenant_idx").on(t.tenantId),
    categoryThresholdsCategoryIdx: index("category_thresholds_category_idx").on(
      t.category
    ),
  })
);

export const products = sqliteTable(
  "products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: text("tenant_id"), // Multi-tenant support
    name: text("name").notNull(),
    category: text("category").notNull(),
    stock: integer("stock").notNull().default(0),
    minStock: integer("min_stock").notNull().default(0),
    price: integer("price").notNull().default(0),
    cost: integer("cost").notNull().default(0),
    marginPct: real("margin_pct").notNull().default(30),
    barCode: text("bar_code"), // Can be null
    ml: integer("ml").default(0),
    measureUnit: text("measure_unit").default("ml"),
    estado: text("estado", {
      enum: ["NORMAL", "BAJO", "AGOTADO", "DESHABILITADO"],
    }).default("NORMAL"),
    supplier: text("supplier"), // Proveedor del producto
    deletedAt: integer("deleted_at", { mode: "timestamp" }), // Soft delete
    createdAt: integer("created_at", { mode: "timestamp" }).default(
      sql`(unixepoch())`
    ),
    updatedAt: integer("updated_at", { mode: "timestamp" }),
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

export const sales = sqliteTable(
  "sales",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: text("tenant_id"), // Multi-tenant support
    total: integer("total").notNull(),
    paymentMethod: text("payment_method").notNull(), // "efectivo", "tarjeta", "transferencia"
    customerName: text("customer_name"),
    customerId: text("customer_id"), // Referencia a cliente
    // Estado de la venta
    status: text("status", {
      enum: ["completed", "voided", "refunded"],
    })
      .notNull()
      .default("completed"),
    voidedAt: integer("voided_at", { mode: "timestamp" }),
    voidedBy: integer("voided_by").references(() => users.id),
    voidReason: text("void_reason"),
    // Referencia a venta original (para devoluciones)
    originalSaleId: integer("original_sale_id"),
    createdAt: integer("created_at", { mode: "timestamp" }).default(
      sql`(unixepoch())`
    ),
  },
  (t) => ({
    salesTenantIdx: index("sales_tenant_idx").on(t.tenantId),
    salesCreatedIdx: index("sales_created_idx").on(t.createdAt),
    salesPaymentIdx: index("sales_payment_method_idx").on(t.paymentMethod),
    salesStatusIdx: index("sales_status_idx").on(t.status),
    salesCustomerIdx: index("sales_customer_id_idx").on(t.customerId),
  })
);

export const saleItems = sqliteTable(
  "sale_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    saleId: integer("sale_id")
      .references(() => sales.id, { onDelete: "cascade" })
      .notNull(),
    productId: integer("product_id")
      .references(() => products.id)
      .notNull(),
    productName: text("product_name").notNull(), // Snapshot of name at time of sale
    quantity: integer("quantity").notNull(),
    price: integer("price").notNull(), // Snapshot of price at time of sale
    subtotal: integer("subtotal").notNull(),
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

export const settings = sqliteTable(
  "settings",
  {
    key: text("key").primaryKey(),
    tenantId: text("tenant_id"), // Multi-tenant support
    value: text("value", { mode: "json" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(
      sql`(unixepoch())`
    ),
  },
  (t) => ({
    settingsTenantIdx: index("settings_tenant_idx").on(t.tenantId),
  })
);

export const cashSessions = sqliteTable(
  "cash_sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: text("tenant_id"), // Multi-tenant support
    userId: integer("user_id").references(() => users.id),
    openTime: integer("open_time", { mode: "timestamp" }).notNull(),
    closeTime: integer("close_time", { mode: "timestamp" }),
    initialCash: integer("initial_cash").notNull(),
    finalCash: integer("final_cash"),
    declaredCash: integer("declared_cash"),
    difference: integer("difference"),
    notes: text("notes"),
    windowOpen: integer("window_open", { mode: "timestamp" }), // Operational window start time
    windowClose: integer("window_close", { mode: "timestamp" }), // Expected close time
  },
  (t) => ({
    cashSessionsTenantIdx: index("cash_sessions_tenant_idx").on(t.tenantId),
    cashSessionsUserIdx: index("cash_sessions_user_id_idx").on(t.userId),
    cashSessionsOpenIdx: index("cash_sessions_open_time_idx").on(t.openTime),
  })
);

export const cashMovements = sqliteTable(
  "cash_movements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sessionId: integer("session_id")
      .references(() => cashSessions.id, { onDelete: "cascade" })
      .notNull(),
    type: text("type", { enum: ["INGRESO", "EGRESO"] }).notNull(),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).default(
      sql`(unixepoch())`
    ),
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
export const promotions = sqliteTable(
  "promotions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: text("tenant_id"), // Multi-tenant support
    name: text("name").notNull(),
    description: text("description"),
    type: text("type", {
      enum: ["percentage", "fixed", "bundle", "2x1", "3x2"],
    }).notNull(),
    value: real("value"), // Porcentaje o monto fijo de descuento
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    // Alcance: productos específicos, categoría, o todos
    scope: text("scope", {
      enum: ["product", "category", "all"],
    })
      .notNull()
      .default("product"),
    productIds: text("product_ids", { mode: "json" }).$type<number[]>(), // IDs de productos si scope=product
    categoryName: text("category_name"), // Nombre de categoría si scope=category
    // Límites
    startDate: integer("start_date", { mode: "timestamp" }),
    endDate: integer("end_date", { mode: "timestamp" }),
    maxUses: integer("max_uses"), // Límite total de usos
    usedCount: integer("used_count").notNull().default(0),
    minPurchase: integer("min_purchase"), // Compra mínima para aplicar
    // Bundle specific
    bundleQty: integer("bundle_qty"), // Cantidad para bundle (ej: 2 en 2x1)
    bundlePrice: integer("bundle_price"), // Precio del bundle
    // Código de barras especial (para escanear promoción)
    barcode: text("barcode"),
    // Metadatos
    createdAt: integer("created_at", { mode: "timestamp" }).default(
      sql`(unixepoch())`
    ),
    updatedAt: integer("updated_at", { mode: "timestamp" }),
  },
  (t) => ({
    promotionsTenantIdx: index("promotions_tenant_idx").on(t.tenantId),
    promotionsActiveIdx: index("promotions_active_idx").on(t.active),
    promotionsBarcodeIdx: index("promotions_barcode_idx").on(t.barcode),
    promotionsDateIdx: index("promotions_dates_idx").on(t.startDate, t.endDate),
  })
);

// ============== DOCUMENTOS FISCALES (SII / BOLETAS) ==============
export const fiscalDocuments = sqliteTable(
  "fiscal_documents",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: text("tenant_id"),
    saleId: integer("sale_id")
      .references(() => sales.id, { onDelete: "cascade" })
      .notNull(),
    documentType: text("document_type", {
      enum: ["boleta"],
    })
      .notNull()
      .default("boleta"),
    provider: text("provider").notNull().default("none"),
    status: text("status", {
      enum: ["pending", "issued", "failed"],
    })
      .notNull()
      .default("pending"),
    folio: integer("folio"),
    trackId: text("track_id"),
    siiEnv: text("sii_env"),
    xml: text("xml"),
    lastError: text("last_error"),
    response: text("response", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp" }).default(
      sql`(unixepoch())`
    ),
    updatedAt: integer("updated_at", { mode: "timestamp" }),
  },
  (t) => ({
    fiscalDocsTenantIdx: index("fiscal_documents_tenant_idx").on(t.tenantId),
    fiscalDocsSaleIdx: index("fiscal_documents_sale_id_idx").on(t.saleId),
    fiscalDocsStatusIdx: index("fiscal_documents_status_idx").on(t.status),
    fiscalDocsCreatedIdx: index("fiscal_documents_created_idx").on(t.createdAt),
  })
);

// ============== CLIENTES ==============
export const customers = sqliteTable(
  "customers",
  {
    id: text("id").primaryKey().notNull(),
    tenantId: text("tenant_id"), // Multi-tenant support
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    rut: text("rut"),
    address: text("address"),
    creditLimit: real("credit_limit").notNull().default(0),
    creditUsed: real("credit_used").notNull().default(0),
    loyaltyPoints: integer("loyalty_points").notNull().default(0),
    totalPurchases: real("total_purchases").notNull().default(0),
    totalSales: integer("total_sales").notNull().default(0),
    lastPurchase: integer("last_purchase"),
    notes: text("notes"),
    active: integer("active").notNull().default(1),
    createdAt: integer("created_at").default(sql`(unixepoch())`),
    updatedAt: integer("updated_at"),
  },
  (t) => ({
    customersTenantIdx: index("customers_tenant_idx").on(t.tenantId),
    customersPhoneIdx: index("customers_phone_idx").on(t.phone),
    customersRutIdx: index("customers_rut_idx").on(t.rut),
    customersActiveIdx: index("customers_active_idx").on(t.active),
  })
);

// ============== DEUDAS DE CLIENTES ==============
export const customerDebts = sqliteTable(
  "customer_debts",
  {
    id: text("id").primaryKey().notNull(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    saleId: integer("sale_id").references(() => sales.id, {
      onDelete: "set null",
    }),
    amount: real("amount").notNull(),
    amountPaid: real("amount_paid").notNull().default(0),
    dueDate: integer("due_date"),
    status: text("status").notNull().default("pending"),
    notes: text("notes"),
    createdAt: integer("created_at").default(sql`(unixepoch())`),
    updatedAt: integer("updated_at"),
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
export const returns = sqliteTable(
  "returns",
  {
    id: text("id").primaryKey().notNull(),
    tenantId: text("tenant_id"), // Multi-tenant support
    saleId: integer("sale_id")
      .notNull()
      .references(() => sales.id),
    reason: text("reason").notNull(),
    totalRefund: real("total_refund").notNull(),
    method: text("method").notNull().default("cash"),
    status: text("status").notNull().default("completed"),
    processedBy: integer("processed_by")
      .notNull()
      .references(() => users.id),
    notes: text("notes"),
    createdAt: integer("created_at").default(sql`(unixepoch())`),
  },
  (t) => ({
    returnsTenantIdx: index("returns_tenant_idx").on(t.tenantId),
    returnsSaleIdx: index("returns_sale_idx").on(t.saleId),
    returnsProcessedByIdx: index("returns_processed_by_idx").on(t.processedBy),
    returnsCreatedIdx: index("returns_created_idx").on(t.createdAt),
  })
);

// ============== ITEMS DE DEVOLUCIÓN ==============
export const returnItems = sqliteTable(
  "return_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    returnId: text("return_id")
      .notNull()
      .references(() => returns.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    productName: text("product_name").notNull(),
    quantity: integer("quantity").notNull(),
    price: integer("price").notNull(),
    subtotal: integer("subtotal").notNull(),
  },
  (t) => ({
    returnItemsReturnIdx: index("return_items_return_idx").on(t.returnId),
    returnItemsProductIdx: index("return_items_product_idx").on(t.productId),
  })
);

// ============== AUDIT LOG ==============
export const auditLog = sqliteTable(
  "audit_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: text("tenant_id"), // Multi-tenant support
    userId: integer("user_id").references(() => users.id),
    username: text("username"),
    action: text("action").notNull(), // "sale.create", "product.update", "login", etc.
    entity: text("entity"), // "product", "sale", "user", "cash_session"
    entityId: integer("entity_id"),
    details: text("details", { mode: "json" }), // Datos adicionales
    ipAddress: text("ip_address"),
    createdAt: integer("created_at", { mode: "timestamp" }).default(
      sql`(unixepoch())`
    ),
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
export const supplierInvoices = sqliteTable(
  "supplier_invoices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tenantId: text("tenant_id"), // Multi-tenant support
    invoiceNumber: text("invoice_number").notNull(),
    supplierName: text("supplier_name").notNull(),
    invoiceDate: integer("invoice_date").notNull(),
    dueDate: integer("due_date"),
    subtotal: integer("subtotal").notNull(),
    taxAmount: integer("tax_amount").notNull(),
    total: integer("total").notNull(),
    paymentStatus: text("payment_status", {
      enum: ["pending", "partial", "paid", "overdue"],
    })
      .notNull()
      .default("pending"),
    amountPaid: integer("amount_paid").notNull().default(0),
    amountPending: integer("amount_pending").notNull(),
    currency: text("currency").notNull().default("CLP"),
    expenseCategory: text("expense_category", {
      enum: [
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
      ],
    }).notNull(),
    accountingCode: text("accounting_code"),
    description: text("description"),
    notes: text("notes"),
    registeredBy: integer("registered_by")
      .notNull()
      .references(() => users.id),
    createdAt: integer("created_at").default(sql`(unixepoch())`),
    updatedAt: integer("updated_at"),
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

export const supplierInvoiceItems = sqliteTable(
  "supplier_invoice_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    invoiceId: integer("invoice_id")
      .notNull()
      .references(() => supplierInvoices.id, { onDelete: "cascade" }),
    productId: integer("product_id").references(() => products.id),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    subtotal: integer("subtotal").notNull(),
    taxRate: integer("tax_rate").notNull().default(19),
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

export const supplierInvoicePayments = sqliteTable(
  "supplier_invoice_payments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    invoiceId: integer("invoice_id")
      .notNull()
      .references(() => supplierInvoices.id, { onDelete: "cascade" }),
    paymentDate: integer("payment_date").notNull(),
    amount: integer("amount").notNull(),
    paymentMethod: text("payment_method").notNull(),
    reference: text("reference"),
    notes: text("notes"),
    registeredBy: integer("registered_by")
      .notNull()
      .references(() => users.id),
    createdAt: integer("created_at").default(sql`(unixepoch())`),
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

