import { sqliteTable, AnySQLiteColumn, index, foreignKey, integer, text, real, uniqueIndex } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const cashMovements = sqliteTable("cash_movements", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	sessionId: integer("session_id").notNull().references(() => cashSessions.id, { onDelete: "cascade" } ),
	type: text().notNull(),
	amount: integer().notNull(),
	reason: text().notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
},
(table) => [
	index("cash_movements_created_idx").on(table.createdAt),
	index("cash_movements_session_id_idx").on(table.sessionId),
]);

export const cashSessions = sqliteTable("cash_sessions", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	userId: integer("user_id").references(() => users.id),
	openTime: integer("open_time").notNull(),
	closeTime: integer("close_time"),
	initialCash: integer("initial_cash").notNull(),
	finalCash: integer("final_cash"),
	declaredCash: integer("declared_cash"),
	difference: integer(),
	notes: text(),
	windowClose: integer("window_close"),
},
(table) => [
	index("cash_sessions_open_time_idx").on(table.openTime),
	index("cash_sessions_user_id_idx").on(table.userId),
]);

export const products = sqliteTable("products", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	name: text().notNull(),
	category: text().notNull(),
	stock: integer().default(0).notNull(),
	minStock: integer("min_stock").default(0).notNull(),
	price: integer().default(0).notNull(),
	cost: integer().default(0).notNull(),
	marginPct: real("margin_pct").default(30).notNull(),
	barCode: text("bar_code"),
	ml: integer().default(0),
	measureUnit: text("measure_unit").default("ml"),
	estado: text().default("NORMAL"),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
	supplier: text(),
},
(table) => [
	index("products_supplier_idx").on(table.supplier),
	index("products_barcode_idx").on(table.barCode),
	index("products_created_idx").on(table.createdAt),
	index("products_estado_idx").on(table.estado),
	index("products_category_idx").on(table.category),
]);

export const saleItems = sqliteTable("sale_items", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	saleId: integer("sale_id").notNull().references(() => sales.id, { onDelete: "cascade" } ),
	productId: integer("product_id").notNull().references(() => products.id),
	productName: text("product_name").notNull(),
	quantity: integer().notNull(),
	price: integer().notNull(),
	subtotal: integer().notNull(),
},
(table) => [
	index("sale_items_sale_product_idx").on(table.saleId, table.productId),
	index("sale_items_product_id_idx").on(table.productId),
	index("sale_items_sale_id_idx").on(table.saleId),
]);

export const settings = sqliteTable("settings", {
	key: text().primaryKey().notNull(),
	value: text().notNull(),
	updatedAt: integer("updated_at").default(sql`(unixepoch())`),
});

export const users = sqliteTable("users", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	username: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	role: text().default("vendedor").notNull(),
	fullName: text("full_name").notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
	email: text(),
	active: integer().default(true).notNull(),
	cashRegisterId: text("cash_register_id"),
	createdBy: integer("created_by"),
},
(table) => [
	index("users_created_by_idx").on(table.createdBy),
	index("users_active_idx").on(table.active),
	index("users_created_idx").on(table.createdAt),
	index("users_role_idx").on(table.role),
	uniqueIndex("users_username_unique").on(table.username),
]);

export const auditLog = sqliteTable("audit_log", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	userId: integer("user_id").references(() => users.id),
	username: text(),
	action: text().notNull(),
	entity: text(),
	entityId: integer("entity_id"),
	details: text(),
	ipAddress: text("ip_address"),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
},
(table) => [
	index("audit_log_entity_idx").on(table.entity, table.entityId),
	index("audit_log_created_idx").on(table.createdAt),
	index("audit_log_action_idx").on(table.action),
	index("audit_log_user_id_idx").on(table.userId),
]);

export const promotions = sqliteTable("promotions", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	name: text().notNull(),
	description: text(),
	type: text().notNull(),
	value: real(),
	active: integer().default(true).notNull(),
	scope: text().default("product").notNull(),
	productIds: text("product_ids"),
	categoryName: text("category_name"),
	startDate: integer("start_date"),
	endDate: integer("end_date"),
	maxUses: integer("max_uses"),
	usedCount: integer("used_count").default(0).notNull(),
	minPurchase: integer("min_purchase"),
	bundleQty: integer("bundle_qty"),
	bundlePrice: integer("bundle_price"),
	barcode: text(),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
	updatedAt: integer("updated_at"),
},
(table) => [
	index("promotions_dates_idx").on(table.startDate, table.endDate),
	index("promotions_barcode_idx").on(table.barcode),
	index("promotions_active_idx").on(table.active),
]);

export const categoryStockThresholds = sqliteTable("category_stock_thresholds", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	category: text().notNull(),
	minStock: integer("min_stock").default(0).notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
	updatedAt: integer("updated_at"),
},
(table) => [
	index("category_thresholds_category_idx").on(table.category),
	uniqueIndex("category_stock_thresholds_category_unique").on(table.category),
]);

export const sales = sqliteTable("sales", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	total: integer().notNull(),
	paymentMethod: text("payment_method").notNull(),
	customerName: text("customer_name"),
	customerId: text("customer_id"),
	status: text().default("completed").notNull(),
	voidedAt: integer("voided_at"),
	voidedBy: integer("voided_by").references(() => users.id),
	voidReason: text("void_reason"),
	originalSaleId: integer("original_sale_id"),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
},
(table) => [
	index("sales_customer_id_idx").on(table.customerId),
	index("sales_status_idx").on(table.status),
	index("sales_payment_method_idx").on(table.paymentMethod),
	index("sales_created_idx").on(table.createdAt),
]);

export const customers = sqliteTable("customers", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text(),
	phone: text(),
	rut: text(),
	address: text(),
	creditLimit: real("credit_limit").default(0).notNull(),
	creditUsed: real("credit_used").default(0).notNull(),
	loyaltyPoints: integer("loyalty_points").default(0).notNull(),
	totalPurchases: real("total_purchases").default(0).notNull(),
	totalSales: integer("total_sales").default(0).notNull(),
	lastPurchase: integer("last_purchase"),
	notes: text(),
	active: integer().default(true).notNull(),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
	updatedAt: integer("updated_at"),
},
(table) => [
	index("customers_phone_idx").on(table.phone),
	index("customers_rut_idx").on(table.rut),
	index("customers_active_idx").on(table.active),
	uniqueIndex("customers_rut_unique").on(table.rut),
]);

export const customerDebts = sqliteTable("customer_debts", {
	id: text().primaryKey().notNull(),
	customerId: text("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
	saleId: integer("sale_id").references(() => sales.id, { onDelete: "set null" }),
	amount: real().notNull(),
	amountPaid: real("amount_paid").default(0).notNull(),
	dueDate: integer("due_date"),
	status: text().default("pending").notNull(),
	notes: text(),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
	updatedAt: integer("updated_at"),
},
(table) => [
	index("customer_debts_customer_idx").on(table.customerId),
	index("customer_debts_status_idx").on(table.status),
	index("customer_debts_due_date_idx").on(table.dueDate),
]);

export const returns = sqliteTable("returns", {
	id: text().primaryKey().notNull(),
	saleId: integer("sale_id").notNull().references(() => sales.id),
	reason: text().notNull(),
	totalRefund: real("total_refund").notNull(),
	method: text().default("cash").notNull(),
	status: text().default("completed").notNull(),
	processedBy: integer("processed_by").notNull().references(() => users.id),
	notes: text(),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
},
(table) => [
	index("returns_sale_idx").on(table.saleId),
	index("returns_processed_by_idx").on(table.processedBy),
	index("returns_created_idx").on(table.createdAt),
]);

export const returnItems = sqliteTable("return_items", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	returnId: text("return_id").notNull().references(() => returns.id, { onDelete: "cascade" }),
	productId: integer("product_id").notNull().references(() => products.id),
	productName: text("product_name").notNull(),
	quantity: integer().notNull(),
	price: integer().notNull(),
	subtotal: integer().notNull(),
},
(table) => [
	index("return_items_return_idx").on(table.returnId),
	index("return_items_product_idx").on(table.productId),
]);

export const supplierInvoices = sqliteTable("supplier_invoices", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	invoiceNumber: text("invoice_number").notNull(),
	supplierName: text("supplier_name").notNull(),
	invoiceDate: integer("invoice_date").notNull(),
	dueDate: integer("due_date"),
	subtotal: integer().notNull(),
	taxAmount: integer("tax_amount").notNull(),
	total: integer().notNull(),
	paymentStatus: text("payment_status").default("pending").notNull(),
	amountPaid: integer("amount_paid").default(0).notNull(),
	amountPending: integer("amount_pending").notNull(),
	currency: text().default("CLP").notNull(),
	expenseCategory: text("expense_category").notNull(),
	accountingCode: text("accounting_code"),
	description: text(),
	notes: text(),
	registeredBy: integer("registered_by").notNull().references(() => users.id),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
	updatedAt: integer("updated_at"),
},
(table) => [
	index("supplier_invoices_supplier_idx").on(table.supplierName),
	index("supplier_invoices_status_idx").on(table.paymentStatus),
	index("supplier_invoices_date_idx").on(table.invoiceDate),
	index("supplier_invoices_due_date_idx").on(table.dueDate),
	index("supplier_invoices_category_idx").on(table.expenseCategory),
	uniqueIndex("supplier_invoices_number_supplier_idx").on(table.invoiceNumber, table.supplierName),
]);

export const supplierInvoiceItems = sqliteTable("supplier_invoice_items", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	invoiceId: integer("invoice_id").notNull().references(() => supplierInvoices.id, { onDelete: "cascade" }),
	productId: integer("product_id").references(() => products.id),
	description: text().notNull(),
	quantity: integer().notNull(),
	unitPrice: integer("unit_price").notNull(),
	subtotal: integer().notNull(),
	taxRate: integer("tax_rate").default(19).notNull(),
},
(table) => [
	index("supplier_invoice_items_invoice_idx").on(table.invoiceId),
	index("supplier_invoice_items_product_idx").on(table.productId),
]);

export const supplierInvoicePayments = sqliteTable("supplier_invoice_payments", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	invoiceId: integer("invoice_id").notNull().references(() => supplierInvoices.id, { onDelete: "cascade" }),
	paymentDate: integer("payment_date").notNull(),
	amount: integer().notNull(),
	paymentMethod: text("payment_method").notNull(),
	reference: text(),
	notes: text(),
	registeredBy: integer("registered_by").notNull().references(() => users.id),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
},
(table) => [
	index("supplier_invoice_payments_invoice_idx").on(table.invoiceId),
	index("supplier_invoice_payments_date_idx").on(table.paymentDate),
]);

