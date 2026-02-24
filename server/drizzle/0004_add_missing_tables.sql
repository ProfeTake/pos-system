-- Add customer_id column to sales
ALTER TABLE `sales` ADD COLUMN `customer_id` text;--> statement-breakpoint
CREATE INDEX `sales_customer_id_idx` ON `sales` (`customer_id`);--> statement-breakpoint

-- Create customers table
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`rut` text,
	`address` text,
	`credit_limit` real DEFAULT 0 NOT NULL,
	`credit_used` real DEFAULT 0 NOT NULL,
	`loyalty_points` integer DEFAULT 0 NOT NULL,
	`total_purchases` real DEFAULT 0 NOT NULL,
	`total_sales` integer DEFAULT 0 NOT NULL,
	`last_purchase` integer,
	`notes` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer
);--> statement-breakpoint
CREATE INDEX `customers_phone_idx` ON `customers` (`phone`);--> statement-breakpoint
CREATE INDEX `customers_rut_idx` ON `customers` (`rut`);--> statement-breakpoint
CREATE INDEX `customers_active_idx` ON `customers` (`active`);--> statement-breakpoint
CREATE UNIQUE INDEX `customers_rut_unique` ON `customers` (`rut`);--> statement-breakpoint

-- Create customer_debts table
CREATE TABLE `customer_debts` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`sale_id` integer,
	`amount` real NOT NULL,
	`amount_paid` real DEFAULT 0 NOT NULL,
	`due_date` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE INDEX `customer_debts_customer_idx` ON `customer_debts` (`customer_id`);--> statement-breakpoint
CREATE INDEX `customer_debts_status_idx` ON `customer_debts` (`status`);--> statement-breakpoint
CREATE INDEX `customer_debts_due_date_idx` ON `customer_debts` (`due_date`);--> statement-breakpoint

-- Create returns table
CREATE TABLE `returns` (
	`id` text PRIMARY KEY NOT NULL,
	`sale_id` integer NOT NULL,
	`reason` text NOT NULL,
	`total_refund` real NOT NULL,
	`method` text DEFAULT 'cash' NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`processed_by` integer NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`processed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE INDEX `returns_sale_idx` ON `returns` (`sale_id`);--> statement-breakpoint
CREATE INDEX `returns_processed_by_idx` ON `returns` (`processed_by`);--> statement-breakpoint
CREATE INDEX `returns_created_idx` ON `returns` (`created_at`);--> statement-breakpoint

-- Create return_items table
CREATE TABLE `return_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`return_id` text NOT NULL,
	`product_id` integer NOT NULL,
	`product_name` text NOT NULL,
	`quantity` integer NOT NULL,
	`price` integer NOT NULL,
	`subtotal` integer NOT NULL,
	FOREIGN KEY (`return_id`) REFERENCES `returns`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE INDEX `return_items_return_idx` ON `return_items` (`return_id`);--> statement-breakpoint
CREATE INDEX `return_items_product_idx` ON `return_items` (`product_id`);--> statement-breakpoint

-- Create supplier_invoices table
CREATE TABLE `supplier_invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_number` text NOT NULL,
	`supplier_name` text NOT NULL,
	`invoice_date` integer NOT NULL,
	`due_date` integer,
	`subtotal` integer NOT NULL,
	`tax_amount` integer NOT NULL,
	`total` integer NOT NULL,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`amount_paid` integer DEFAULT 0 NOT NULL,
	`amount_pending` integer NOT NULL,
	`currency` text DEFAULT 'CLP' NOT NULL,
	`expense_category` text NOT NULL,
	`accounting_code` text,
	`description` text,
	`notes` text,
	`registered_by` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer,
	FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE INDEX `supplier_invoices_supplier_idx` ON `supplier_invoices` (`supplier_name`);--> statement-breakpoint
CREATE INDEX `supplier_invoices_status_idx` ON `supplier_invoices` (`payment_status`);--> statement-breakpoint
CREATE INDEX `supplier_invoices_date_idx` ON `supplier_invoices` (`invoice_date`);--> statement-breakpoint
CREATE INDEX `supplier_invoices_due_date_idx` ON `supplier_invoices` (`due_date`);--> statement-breakpoint
CREATE INDEX `supplier_invoices_category_idx` ON `supplier_invoices` (`expense_category`);--> statement-breakpoint
CREATE UNIQUE INDEX `supplier_invoices_number_supplier_idx` ON `supplier_invoices` (`invoice_number`, `supplier_name`);--> statement-breakpoint

-- Create supplier_invoice_items table
CREATE TABLE `supplier_invoice_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`product_id` integer,
	`description` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`subtotal` integer NOT NULL,
	`tax_rate` integer DEFAULT 19 NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `supplier_invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE INDEX `supplier_invoice_items_invoice_idx` ON `supplier_invoice_items` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `supplier_invoice_items_product_idx` ON `supplier_invoice_items` (`product_id`);--> statement-breakpoint

-- Create supplier_invoice_payments table
CREATE TABLE `supplier_invoice_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`payment_date` integer NOT NULL,
	`amount` integer NOT NULL,
	`payment_method` text NOT NULL,
	`reference` text,
	`notes` text,
	`registered_by` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`invoice_id`) REFERENCES `supplier_invoices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE INDEX `supplier_invoice_payments_invoice_idx` ON `supplier_invoice_payments` (`invoice_id`);--> statement-breakpoint
CREATE INDEX `supplier_invoice_payments_date_idx` ON `supplier_invoice_payments` (`payment_date`);